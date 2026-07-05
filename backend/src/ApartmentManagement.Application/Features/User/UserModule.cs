using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Application.Commands.User
{

// ─── Create User ──────────────────────────────────────────────────────────────

public record CreateUserCommand(
    string SocietyId, string FullName, string Email, string Phone, UserRole Role, ResidentType ResidentType, string? ApartmentId, string? InvitedByUserId = null)
    : IRequest<Result<UserResponse>>;

public sealed class CreateUserCommandHandler(
    IUserRepository userRepository,
    IApartmentRepository apartmentRepository,
    INotificationService notificationService,
    IEventPublisher eventPublisher,
    ICurrentUserService currentUserService,
    ILogger<CreateUserCommandHandler> logger)
    : IRequestHandler<CreateUserCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(CreateUserCommand request, CancellationToken ct)
    {
        try
        {
            var actor = await userRepository.GetByIdAsync(currentUserService.UserId, request.SocietyId, ct);
            if (actor is not null)
            {
                var canCreate = actor.Role == UserRole.SUAdmin
                    ? request.ResidentType == ResidentType.Owner || request.Role == UserRole.SUSecurity
                    : actor.ResidentType switch
                    {
                        ResidentType.Owner => request.ResidentType is ResidentType.Tenant or ResidentType.FamilyMember,
                        ResidentType.Tenant => request.ResidentType == ResidentType.CoOccupant,
                        _ => false
                    };

                if (!canCreate)
                    return Result<UserResponse>.Failure(ErrorCodes.Forbidden, "You are not allowed to add this resident type.");
            }

            var existing = await userRepository.GetByEmailAsync(request.SocietyId, request.Email.Trim().ToLowerInvariant(), ct);
            if (existing is not null)
                return Result<UserResponse>.Failure(ErrorCodes.UserAlreadyExists,
                    $"A resident with email {request.Email} already exists in this society. Open that resident and add another apartment there.");

            var user = Domain.Entities.User.Create(
                request.SocietyId, request.FullName, request.Email, request.Phone,
                request.Role, request.ResidentType, request.ApartmentId, request.InvitedByUserId);

            user.GenerateOtp();
            var created = await userRepository.CreateAsync(user, ct);
            var userNeedsUpdate = false;

            if (!string.IsNullOrWhiteSpace(created.ApartmentId))
            {
                var apartment = await apartmentRepository.GetByIdAsync(created.ApartmentId, created.SocietyId, ct)
                    ?? throw new NotFoundException("Apartment", created.ApartmentId);

                if (created.ResidentType == ResidentType.Owner)
                {
                    if (!string.IsNullOrWhiteSpace(apartment.OwnerId) && apartment.OwnerId != created.Id)
                        return Result<UserResponse>.Failure(ErrorCodes.Conflict, "This apartment already has an owner. Use ownership transfer instead.");

                    apartment.AssignOwner(created.Id, created.FullName);
                }
                else if (created.ResidentType == ResidentType.Tenant)
                {
                    if (!string.IsNullOrWhiteSpace(apartment.TenantId) && apartment.TenantId != created.Id)
                        return Result<UserResponse>.Failure(ErrorCodes.Conflict, "This apartment already has a tenant. Use tenancy transfer instead.");

                    apartment.AssignTenant(created.Id, created.FullName);
                }
                else
                {
                    apartment.AddResident(created.Id, created.FullName, created.ResidentType);
                }

                await apartmentRepository.UpdateAsync(apartment, ct);
                created.LinkApartment(apartment.Id, apartment.ToDisplayLabel(), created.ResidentType, makePrimary: true);
                userNeedsUpdate = true;
            }

            if (!string.IsNullOrWhiteSpace(created.Phone))
                await notificationService.SendSmsAsync(created.Phone,
                    $"Your OTP for apartment management system is: {created.OtpCode}", ct);

            var persistedUser = userNeedsUpdate
                ? await userRepository.UpdateAsync(created, ct)
                : created;

            foreach (var evt in persistedUser.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            persistedUser.ClearDomainEvents();

            var apartments = await ApartmentManagement.Application.Queries.User.UserQueryMapping.GetResidentApartmentsAsync(persistedUser, apartmentRepository, ct);
            return Result<UserResponse>.Success(persistedUser.ToResponse(apartments));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create user {Email}", request.Email);
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Update User ──────────────────────────────────────────────────────────────

public record UpdateUserCommand(string SocietyId, string UserId, string FullName, string Phone)
    : IRequest<Result<UserResponse>>;

public sealed class UpdateUserCommandHandler(
    IUserRepository userRepository,
    IApartmentRepository apartmentRepository,
    ILogger<UpdateUserCommandHandler> logger)
    : IRequestHandler<UpdateUserCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(UpdateUserCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.UserId);

            user.UpdateProfile(request.FullName, request.Phone);
            var updated = await userRepository.UpdateAsync(user, ct);
            var apartments = await ApartmentManagement.Application.Queries.User.UserQueryMapping.GetResidentApartmentsAsync(updated, apartmentRepository, ct);
            return Result<UserResponse>.Success(updated.ToResponse(apartments));
        }
        catch (NotFoundException ex)
        {
            return Result<UserResponse>.Failure(ErrorCodes.UserNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update user {UserId}", request.UserId);
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Attach Existing Resident To Another Apartment ────────────────────────────

public record AssignUserApartmentCommand(string SocietyId, string UserId, string ApartmentId, ResidentType ResidentType)
    : IRequest<Result<UserResponse>>;

public sealed class AssignUserApartmentCommandHandler(
    IUserRepository userRepository,
    IApartmentRepository apartmentRepository,
    ILogger<AssignUserApartmentCommandHandler> logger)
    : IRequestHandler<AssignUserApartmentCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(AssignUserApartmentCommand request, CancellationToken ct)
    {
        try
        {
            if (request.ResidentType is not (ResidentType.Owner or ResidentType.Tenant))
                return Result<UserResponse>.Failure(ErrorCodes.ValidationFailed, "Additional apartments can only be linked for owner or tenant residents.");

            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct);
            if (user is null)
                return Result<UserResponse>.Failure(ErrorCodes.UserNotFound, $"User with id '{request.UserId}' was not found.");

            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct);
            if (apartment is null)
                return Result<UserResponse>.Failure(ErrorCodes.ApartmentNotFound, $"Apartment with id '{request.ApartmentId}' was not found.");

            if (user.Role != UserRole.SUUser)
                return Result<UserResponse>.Failure(ErrorCodes.Conflict, "Only resident users can be linked to apartments.");

            if (request.ResidentType == ResidentType.Owner)
            {
                if (string.Equals(apartment.TenantId, user.Id, StringComparison.OrdinalIgnoreCase))
                    return Result<UserResponse>.Failure(ErrorCodes.Conflict, "A resident cannot be both owner and tenant for the same apartment.");

                if (!string.IsNullOrWhiteSpace(apartment.OwnerId) && apartment.OwnerId != user.Id)
                    return Result<UserResponse>.Failure(ErrorCodes.Conflict, "This apartment already has an owner. Use ownership transfer instead.");

                if (apartment.OwnerId != user.Id)
                {
                    apartment.AssignOwner(user.Id, user.FullName);
                    await apartmentRepository.UpdateAsync(apartment, ct);
                }
            }
            else
            {
                if (string.Equals(apartment.OwnerId, user.Id, StringComparison.OrdinalIgnoreCase))
                    return Result<UserResponse>.Failure(ErrorCodes.Conflict, "A resident cannot be both owner and tenant for the same apartment.");

                if (!string.IsNullOrWhiteSpace(apartment.TenantId) && apartment.TenantId != user.Id)
                    return Result<UserResponse>.Failure(ErrorCodes.Conflict, "This apartment already has a tenant. Use tenancy transfer instead.");

                if (apartment.TenantId != user.Id)
                {
                    apartment.AssignTenant(user.Id, user.FullName);
                    await apartmentRepository.UpdateAsync(apartment, ct);
                }
            }

            user.LinkApartment(apartment.Id, apartment.ToDisplayLabel(), request.ResidentType);
            var persistedUser = await userRepository.UpdateAsync(user, ct);

            var apartments = await ApartmentManagement.Application.Queries.User.UserQueryMapping.GetResidentApartmentsAsync(persistedUser, apartmentRepository, ct);
            return Result<UserResponse>.Success(persistedUser.ToResponse(apartments));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to attach apartment {ApartmentId} to user {UserId}", request.ApartmentId, request.UserId);
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record RemoveUserApartmentCommand(string SocietyId, string UserId, string ApartmentId)
    : IRequest<Result<UserResponse>>;

public sealed class RemoveUserApartmentCommandHandler(
    IUserRepository userRepository,
    IApartmentRepository apartmentRepository,
    ICurrentUserService currentUserService,
    ILogger<RemoveUserApartmentCommandHandler> logger)
    : IRequestHandler<RemoveUserApartmentCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(RemoveUserApartmentCommand request, CancellationToken ct)
    {
        try
        {
            var actor = await userRepository.GetByIdAsync(currentUserService.UserId, request.SocietyId, ct);
            if (actor is null || actor.Role != UserRole.SUAdmin)
                return Result<UserResponse>.Failure(ErrorCodes.Forbidden, "Only society admins can remove linked apartments from a resident.");

            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct);
            if (user is null)
                return Result<UserResponse>.Failure(ErrorCodes.UserNotFound, $"User with id '{request.UserId}' was not found.");

            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct);
            if (apartment is null)
                return Result<UserResponse>.Failure(ErrorCodes.ApartmentNotFound, $"Apartment with id '{request.ApartmentId}' was not found.");

            var membership = ResolveMembership(user, apartment);
            if (membership is null)
                return Result<UserResponse>.Failure(ErrorCodes.NotFound, "This resident is not linked to the selected apartment.");

            switch (membership.ResidentType)
            {
                case ResidentType.Owner:
                    if (string.Equals(apartment.OwnerId, user.Id, StringComparison.OrdinalIgnoreCase))
                        apartment.RemoveOwner();
                    else
                        apartment.RemoveResident(user.Id, ResidentType.Owner);
                    break;
                case ResidentType.Tenant:
                    if (string.Equals(apartment.TenantId, user.Id, StringComparison.OrdinalIgnoreCase))
                        apartment.RemoveTenant();
                    else
                        apartment.RemoveResident(user.Id, ResidentType.Tenant);
                    break;
                default:
                    apartment.RemoveResident(user.Id, membership.ResidentType);
                    break;
            }

            await apartmentRepository.UpdateAsync(apartment, ct);
            user.UnlinkApartment(apartment.Id);
            var updatedUser = await userRepository.UpdateAsync(user, ct);
            var apartments = await ApartmentManagement.Application.Queries.User.UserQueryMapping.GetResidentApartmentsAsync(updatedUser, apartmentRepository, ct);
            return Result<UserResponse>.Success(updatedUser.ToResponse(apartments));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to remove apartment {ApartmentId} from user {UserId}", request.ApartmentId, request.UserId);
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }

    private static Domain.Entities.User.ApartmentMembership? ResolveMembership(Domain.Entities.User user, Domain.Entities.Apartment apartment)
    {
        var membership = user.Apartments.FirstOrDefault(link =>
            string.Equals(link.ApartmentId, apartment.Id, StringComparison.OrdinalIgnoreCase));

        if (membership is not null)
            return membership;

        var resident = apartment.GetResidentsForRead().FirstOrDefault(existing =>
            string.Equals(existing.UserId, user.Id, StringComparison.OrdinalIgnoreCase));

        if (resident is not null)
            return new Domain.Entities.User.ApartmentMembership(apartment.Id, apartment.ApartmentNumber, resident.ResidentType);

        if (string.Equals(user.ApartmentId, apartment.Id, StringComparison.OrdinalIgnoreCase))
            return new Domain.Entities.User.ApartmentMembership(apartment.Id, apartment.ApartmentNumber, user.ResidentType);

        return null;
    }
}

// ─── Deactivate User ──────────────────────────────────────────────────────────

public record DeactivateUserCommand(string SocietyId, string UserId) : IRequest<Result<bool>>;

public sealed class DeactivateUserCommandHandler(
    IUserRepository userRepository,
    ILogger<DeactivateUserCommandHandler> logger)
    : IRequestHandler<DeactivateUserCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DeactivateUserCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.UserId);

            user.Deactivate();
            await userRepository.UpdateAsync(user, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.UserNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to deactivate user {UserId}", request.UserId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Activate User ─────────────────────────────────────────────────────────────

public record ActivateUserCommand(string SocietyId, string UserId) : IRequest<Result<bool>>;

public sealed class ActivateUserCommandHandler(
    IUserRepository userRepository,
    ILogger<ActivateUserCommandHandler> logger)
    : IRequestHandler<ActivateUserCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ActivateUserCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.UserId);

            user.Activate();
            await userRepository.UpdateAsync(user, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.UserNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to activate user {UserId}", request.UserId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Delete User ────────────────────────────────────────────────────────────────

public record DeleteUserCommand(string SocietyId, string UserId) : IRequest<Result<bool>>;

public sealed class DeleteUserCommandHandler(
    IUserRepository userRepository,
    IMaintenanceChargeRepository maintenanceChargeRepository,
    ILogger<DeleteUserCommandHandler> logger)
    : IRequestHandler<DeleteUserCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DeleteUserCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.UserId);

            if (user.IsDeleted)
                return Result<bool>.Failure(ErrorCodes.UserNotFound, "This user has already been deleted.");

            var apartmentIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(user.ApartmentId)) apartmentIds.Add(user.ApartmentId);
            foreach (var membership in user.Apartments) apartmentIds.Add(membership.ApartmentId);

            var now = DateTime.UtcNow;
            var currentPeriod = new DateTime(now.Year, now.Month, 1);
            foreach (var apartmentId in apartmentIds)
            {
                var charges = await maintenanceChargeRepository.GetByApartmentAsync(
                    request.SocietyId, apartmentId, 1, int.MaxValue, null, null, ct);

                var hasPendingDues = charges.Any(c =>
                    c.Status is not (PaymentStatus.Paid or PaymentStatus.Cancelled) &&
                    new DateTime(c.ChargeYear, c.ChargeMonth, 1) <= currentPeriod);

                if (hasPendingDues)
                    return Result<bool>.Failure(ErrorCodes.UserHasPendingDues,
                        "This user's apartment has maintenance dues outstanding through the current month. Clear all dues before deleting.");
            }

            if (apartmentIds.Count > 0)
                return Result<bool>.Failure(ErrorCodes.UserHasApartmentMapping,
                    "This user is still mapped to an apartment. Remove the apartment mapping before deleting the user.");

            user.MarkDeleted();
            await userRepository.UpdateAsync(user, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.UserNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete user {UserId}", request.UserId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Change Password (self-service) ────────────────────────────────────────────

public record ChangePasswordCommand(string SocietyId, string UserId, string CurrentPassword, string NewPassword)
    : IRequest<Result<bool>>;

public sealed class ChangePasswordCommandHandler(
    IUserRepository userRepository,
    IAuthService authService,
    ILogger<ChangePasswordCommandHandler> logger)
    : IRequestHandler<ChangePasswordCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ChangePasswordCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.UserId);

            if (!user.HasPassword || !authService.VerifyPassword(request.CurrentPassword, user.PasswordHash!))
                return Result<bool>.Failure(ErrorCodes.InvalidCredentials, "Current password is incorrect.");

            user.SetPasswordHash(authService.HashPassword(request.NewPassword));
            await userRepository.UpdateAsync(user, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.UserNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to change password for user {UserId}", request.UserId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Send OTP ─────────────────────────────────────────────────────────────────

public record SendOtpCommand(string SocietyId, string UserId) : IRequest<Result<bool>>;

public sealed class SendOtpCommandHandler(
    IUserRepository userRepository,
    INotificationService notificationService,
    ILogger<SendOtpCommandHandler> logger)
    : IRequestHandler<SendOtpCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(SendOtpCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.UserId);

            user.GenerateOtp();
            await userRepository.UpdateAsync(user, ct);

            await notificationService.SendSmsAsync(user.Phone,
                $"Your OTP is: {user.OtpCode}. Valid for 10 minutes.", ct);

            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.UserNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send OTP to user {UserId}", request.UserId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────

public record VerifyOtpCommand(string SocietyId, string UserId, string OtpCode) : IRequest<Result<VerifyOtpResponse>>;

public sealed class VerifyOtpCommandHandler(
    IUserRepository userRepository,
    IAuthService authService,
    ILogger<VerifyOtpCommandHandler> logger)
    : IRequestHandler<VerifyOtpCommand, Result<VerifyOtpResponse>>
{
    public async Task<Result<VerifyOtpResponse>> Handle(VerifyOtpCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.UserId);

            if (!user.ValidateOtp(request.OtpCode))
                return Result<VerifyOtpResponse>.Failure(ErrorCodes.OtpInvalid, "OTP is invalid or has expired.");

            user.Verify();
            await userRepository.UpdateAsync(user, ct);

            var token    = await authService.GenerateJwtTokenAsync(user.Id, user.Email, user.Role.ToString(), user.SocietyId, user.ApartmentId, ct);
            var authUser = user.ToAuthUser();

            return Result<VerifyOtpResponse>.Success(new VerifyOtpResponse(token, authUser));
        }
        catch (NotFoundException ex)
        {
            return Result<VerifyOtpResponse>.Failure(ErrorCodes.UserNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to verify OTP for user {UserId}", request.UserId);
            return Result<VerifyOtpResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Request OTP by Email (Login entry point) ─────────────────────────────────

public record RequestOtpByEmailCommand(string SocietyId, string Email)
    : IRequest<Result<RequestOtpByEmailResponse>>;

public sealed class RequestOtpByEmailCommandHandler(
    IUserRepository userRepository,
    INotificationService notificationService,
    ILogger<RequestOtpByEmailCommandHandler> logger)
    : IRequestHandler<RequestOtpByEmailCommand, Result<RequestOtpByEmailResponse>>
{
    public async Task<Result<RequestOtpByEmailResponse>> Handle(
        RequestOtpByEmailCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByEmailAsync(request.SocietyId, request.Email, ct);
            if (user is null)
                return Result<RequestOtpByEmailResponse>.Failure(
                    ErrorCodes.UserNotFound, $"No account found for {request.Email} in this society.");

            user.GenerateOtp();
            await userRepository.UpdateAsync(user, ct);

            await notificationService.SendSmsAsync(user.Phone,
                $"Your OTP is: {user.OtpCode}. Valid for 10 minutes.", ct);

            return Result<RequestOtpByEmailResponse>.Success(new RequestOtpByEmailResponse(user.Id));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send OTP to {Email}", request.Email);
            return Result<RequestOtpByEmailResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Password Login ─────────────────────────────────────────────────────────────

public record LoginCommand(string Email, string Password, string? SelectedUserId = null)
    : IRequest<Result<LoginResponse>>;

public sealed class LoginCommandHandler(
    IUserRepository userRepository,
    ISocietyRepository societyRepository,
    IApartmentRepository apartmentRepository,
    IAuthService authService,
    ILogger<LoginCommandHandler> logger)
    : IRequestHandler<LoginCommand, Result<LoginResponse>>
{
    public async Task<Result<LoginResponse>> Handle(LoginCommand request, CancellationToken ct)
    {
        try
        {
            var candidates = (await userRepository.GetByEmailAcrossSocietiesAsync(request.Email, ct))
                .Where(u => u.IsActive && u.HasPassword && authService.VerifyPassword(request.Password, u.PasswordHash!))
                .OrderBy(u => u.SocietyId)
                .ThenBy(u => u.ApartmentId)
                .ToList();

            if (candidates.Count == 0)
                return Result<LoginResponse>.Failure(ErrorCodes.InvalidCredentials, "Invalid email or password.");

            if (string.IsNullOrWhiteSpace(request.SelectedUserId) && candidates.Count > 1)
            {
                var options = await UserLoginOptionMapper.BuildLoginOptionsAsync(candidates, societyRepository, apartmentRepository, ct);
                return Result<LoginResponse>.Success(new LoginResponse(true, null, null, options));
            }

            var selected = string.IsNullOrWhiteSpace(request.SelectedUserId)
                ? candidates[0]
                : candidates.FirstOrDefault(c => c.Id == request.SelectedUserId);

            if (selected is null)
                return Result<LoginResponse>.Failure(ErrorCodes.InvalidCredentials, "The selected login option is not available.");

            var token = await authService.GenerateJwtTokenAsync(selected.Id, selected.Email, selected.Role.ToString(), selected.SocietyId, selected.ApartmentId, ct);
            return Result<LoginResponse>.Success(new LoginResponse(false, token, selected.ToAuthUser(), []));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed password login for {Email}", request.Email);
            return Result<LoginResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Phone + OTP Login (request step) ───────────────────────────────────────────

public record RequestPhoneLoginOtpCommand(string Phone, string? SelectedUserId = null)
    : IRequest<Result<PhoneLoginOtpResponse>>;

public sealed class RequestPhoneLoginOtpCommandHandler(
    IUserRepository userRepository,
    ISocietyRepository societyRepository,
    IApartmentRepository apartmentRepository,
    INotificationService notificationService,
    ILogger<RequestPhoneLoginOtpCommandHandler> logger)
    : IRequestHandler<RequestPhoneLoginOtpCommand, Result<PhoneLoginOtpResponse>>
{
    public async Task<Result<PhoneLoginOtpResponse>> Handle(RequestPhoneLoginOtpCommand request, CancellationToken ct)
    {
        try
        {
            var candidates = (await userRepository.GetByPhoneAcrossSocietiesAsync(request.Phone, ct))
                .Where(u => u.IsActive)
                .OrderBy(u => u.SocietyId)
                .ThenBy(u => u.ApartmentId)
                .ToList();

            if (candidates.Count == 0)
                return Result<PhoneLoginOtpResponse>.Failure(ErrorCodes.UserNotFound, $"No account found for {request.Phone}.");

            if (string.IsNullOrWhiteSpace(request.SelectedUserId) && candidates.Count > 1)
            {
                var options = await UserLoginOptionMapper.BuildLoginOptionsAsync(candidates, societyRepository, apartmentRepository, ct);
                return Result<PhoneLoginOtpResponse>.Success(new PhoneLoginOtpResponse(true, null, options));
            }

            var selected = string.IsNullOrWhiteSpace(request.SelectedUserId)
                ? candidates[0]
                : candidates.FirstOrDefault(c => c.Id == request.SelectedUserId);

            if (selected is null)
                return Result<PhoneLoginOtpResponse>.Failure(ErrorCodes.UserNotFound, "The selected account could not be found.");

            var selectedOption = await UserLoginOptionMapper.BuildLoginOptionsAsync([selected], societyRepository, apartmentRepository, ct);

            selected.GenerateOtp();
            await userRepository.UpdateAsync(selected, ct);
            await notificationService.SendSmsAsync(selected.Phone,
                $"Your OTP is: {selected.OtpCode}. Valid for 10 minutes.", ct);

            return Result<PhoneLoginOtpResponse>.Success(new PhoneLoginOtpResponse(false, selected.Id, selectedOption));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to start phone OTP login for {Phone}", request.Phone);
            return Result<PhoneLoginOtpResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Password Reset ─────────────────────────────────────────────────────────────

public record RequestPasswordResetCommand(string Email, string? SelectedUserId = null)
    : IRequest<Result<PasswordResetRequestResponse>>;

public sealed class RequestPasswordResetCommandHandler(
    IUserRepository userRepository,
    ISocietyRepository societyRepository,
    IApartmentRepository apartmentRepository,
    INotificationService notificationService,
    ILogger<RequestPasswordResetCommandHandler> logger)
    : IRequestHandler<RequestPasswordResetCommand, Result<PasswordResetRequestResponse>>
{
    public async Task<Result<PasswordResetRequestResponse>> Handle(RequestPasswordResetCommand request, CancellationToken ct)
    {
        try
        {
            var candidates = (await userRepository.GetByEmailAcrossSocietiesAsync(request.Email, ct))
                .Where(u => u.IsActive)
                .OrderBy(u => u.SocietyId)
                .ThenBy(u => u.ApartmentId)
                .ToList();

            if (candidates.Count == 0)
                return Result<PasswordResetRequestResponse>.Failure(ErrorCodes.UserNotFound, $"No account found for {request.Email}.");

            if (string.IsNullOrWhiteSpace(request.SelectedUserId) && candidates.Count > 1)
            {
                var options = await UserLoginOptionMapper.BuildLoginOptionsAsync(candidates, societyRepository, apartmentRepository, ct);
                return Result<PasswordResetRequestResponse>.Success(new PasswordResetRequestResponse(true, null, options));
            }

            var selected = string.IsNullOrWhiteSpace(request.SelectedUserId)
                ? candidates[0]
                : candidates.FirstOrDefault(c => c.Id == request.SelectedUserId);

            if (selected is null)
                return Result<PasswordResetRequestResponse>.Failure(ErrorCodes.UserNotFound, "The selected account could not be found.");

            var selectedOption = await UserLoginOptionMapper.BuildLoginOptionsAsync([selected], societyRepository, apartmentRepository, ct);

            selected.GenerateOtp();
            await userRepository.UpdateAsync(selected, ct);
            await notificationService.SendEmailAsync(
                selected.Email,
                "Apartment management password reset",
                $"Your password reset OTP is {selected.OtpCode}. It is valid for 10 minutes.",
                ct);

            return Result<PasswordResetRequestResponse>.Success(new PasswordResetRequestResponse(false, selected.Id, selectedOption));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to start password reset for {Email}", request.Email);
            return Result<PasswordResetRequestResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record ConfirmPasswordResetCommand(string SocietyId, string UserId, string OtpCode, string NewPassword)
    : IRequest<Result<bool>>;

public sealed class ConfirmPasswordResetCommandHandler(
    IUserRepository userRepository,
    IAuthService authService,
    ILogger<ConfirmPasswordResetCommandHandler> logger)
    : IRequestHandler<ConfirmPasswordResetCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ConfirmPasswordResetCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.UserId);

            if (!user.ValidateOtp(request.OtpCode))
                return Result<bool>.Failure(ErrorCodes.OtpInvalid, "OTP is invalid or has expired.");

            user.SetPasswordHash(authService.HashPassword(request.NewPassword));
            user.Verify();
            await userRepository.UpdateAsync(user, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.UserNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to confirm password reset for user {UserId}", request.UserId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Resident management ────────────────────────────────────────────────────────

public record TransferApartmentOwnershipCommand(
    string SocietyId, string ApartmentId, string FullName, string Email, string Phone)
    : IRequest<Result<UserResponse>>;

public sealed class TransferApartmentOwnershipCommandHandler(
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUserService,
    ILogger<TransferApartmentOwnershipCommandHandler> logger)
    : IRequestHandler<TransferApartmentOwnershipCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(TransferApartmentOwnershipCommand request, CancellationToken ct)
    {
        try
        {
            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct)
                ?? throw new NotFoundException("Apartment", request.ApartmentId);
            var actor = await userRepository.GetByIdAsync(currentUserService.UserId, request.SocietyId, ct);
            if (actor is not null &&
                actor.Role != UserRole.SUAdmin &&
                apartment.OwnerId != actor.Id)
            {
                return Result<UserResponse>.Failure(ErrorCodes.Forbidden, "Only the current owner or society admin can transfer ownership.");
            }

            if (!string.IsNullOrWhiteSpace(apartment.OwnerId))
            {
                var previousOwner = await userRepository.GetByIdAsync(apartment.OwnerId, request.SocietyId, ct);
                if (previousOwner is not null)
                {
                    previousOwner.UnlinkApartment(apartment.Id);
                    await userRepository.UpdateAsync(previousOwner, ct);
                }
            }

            var existing = await userRepository.GetByEmailAsync(request.SocietyId, request.Email.Trim().ToLowerInvariant(), ct);
            if (existing is not null)
                return Result<UserResponse>.Failure(ErrorCodes.UserAlreadyExists,
                    $"A resident with email {request.Email} already exists in this society.");

            var existingFamilyMembers = apartment.Residents
                .Where(r => r.ResidentType == ResidentType.FamilyMember)
                .Select(r => r.UserId)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            foreach (var familyMemberId in existingFamilyMembers)
            {
                apartment.RemoveResident(familyMemberId, ResidentType.FamilyMember);
                var familyMember = await userRepository.GetByIdAsync(familyMemberId, request.SocietyId, ct);
                if (familyMember is not null)
                {
                    familyMember.UnlinkApartment(apartment.Id);
                    await userRepository.UpdateAsync(familyMember, ct);
                }
            }

            var created = await userRepository.CreateAsync(
                Domain.Entities.User.Create(
                    request.SocietyId, request.FullName, request.Email, request.Phone,
                    UserRole.SUUser, ResidentType.Owner, request.ApartmentId, currentUserService.UserId), ct);

            apartment.AssignOwner(created.Id, created.FullName);
            await apartmentRepository.UpdateAsync(apartment, ct);
            created.LinkApartment(apartment.Id, apartment.ToDisplayLabel(), ResidentType.Owner, makePrimary: true);
            var updatedUser = await userRepository.UpdateAsync(created, ct);
            return Result<UserResponse>.Success(updatedUser.ToResponse(await ApartmentManagement.Application.Queries.User.UserQueryMapping.GetResidentApartmentsAsync(updatedUser, apartmentRepository, ct)));
        }
        catch (NotFoundException ex)
        {
            return Result<UserResponse>.Failure(ErrorCodes.NotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to transfer ownership for apartment {ApartmentId}", request.ApartmentId);
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record TransferApartmentTenancyCommand(
    string SocietyId, string ApartmentId, string FullName, string Email, string Phone)
    : IRequest<Result<UserResponse>>;

public sealed class TransferApartmentTenancyCommandHandler(
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUserService,
    ILogger<TransferApartmentTenancyCommandHandler> logger)
    : IRequestHandler<TransferApartmentTenancyCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(TransferApartmentTenancyCommand request, CancellationToken ct)
    {
        try
        {
            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct)
                ?? throw new NotFoundException("Apartment", request.ApartmentId);
            var actor = await userRepository.GetByIdAsync(currentUserService.UserId, request.SocietyId, ct);
            if (actor is not null &&
                actor.Role != UserRole.SUAdmin &&
                apartment.TenantId != actor.Id)
            {
                return Result<UserResponse>.Failure(ErrorCodes.Forbidden, "Only the current tenant or society admin can transfer tenancy.");
            }

            if (!string.IsNullOrWhiteSpace(apartment.TenantId))
            {
                var previousTenant = await userRepository.GetByIdAsync(apartment.TenantId, request.SocietyId, ct);
                if (previousTenant is not null)
                {
                    previousTenant.UnlinkApartment(apartment.Id);
                    await userRepository.UpdateAsync(previousTenant, ct);
                }
            }

            var existing = await userRepository.GetByEmailAsync(request.SocietyId, request.Email.Trim().ToLowerInvariant(), ct);
            if (existing is not null)
                return Result<UserResponse>.Failure(ErrorCodes.UserAlreadyExists,
                    $"A resident with email {request.Email} already exists in this society.");

            var created = await userRepository.CreateAsync(
                Domain.Entities.User.Create(
                    request.SocietyId, request.FullName, request.Email, request.Phone,
                    UserRole.SUUser, ResidentType.Tenant, request.ApartmentId, currentUserService.UserId), ct);

            apartment.AssignTenant(created.Id, created.FullName);
            await apartmentRepository.UpdateAsync(apartment, ct);
            created.LinkApartment(apartment.Id, apartment.ToDisplayLabel(), ResidentType.Tenant, makePrimary: true);
            var updatedUser = await userRepository.UpdateAsync(created, ct);
            return Result<UserResponse>.Success(updatedUser.ToResponse(await ApartmentManagement.Application.Queries.User.UserQueryMapping.GetResidentApartmentsAsync(updatedUser, apartmentRepository, ct)));
        }
        catch (NotFoundException ex)
        {
            return Result<UserResponse>.Failure(ErrorCodes.NotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to transfer tenancy for apartment {ApartmentId}", request.ApartmentId);
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record AddHouseholdMemberCommand(
    string SocietyId, string ApartmentId, string FullName, string Email, string Phone, ResidentType ResidentType)
    : IRequest<Result<UserResponse>>;

public sealed class AddHouseholdMemberCommandHandler(
    IUserRepository userRepository,
    IApartmentRepository apartmentRepository,
    ICurrentUserService currentUserService,
    ILogger<AddHouseholdMemberCommandHandler> logger)
    : IRequestHandler<AddHouseholdMemberCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(AddHouseholdMemberCommand request, CancellationToken ct)
    {
        try
        {
            if (request.ResidentType is not (ResidentType.FamilyMember or ResidentType.CoOccupant))
                return Result<UserResponse>.Failure(ErrorCodes.ValidationFailed, "Only family members or co-occupants can be added with this action.");

            var actor = await userRepository.GetByIdAsync(currentUserService.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", currentUserService.UserId);
            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct)
                ?? throw new NotFoundException("Apartment", request.ApartmentId);
            var canAddFamily = request.ResidentType == ResidentType.FamilyMember &&
                actor.ResidentType == ResidentType.Owner &&
                string.Equals(apartment.OwnerId, actor.Id, StringComparison.OrdinalIgnoreCase);
            var canAddCoOccupant = request.ResidentType == ResidentType.CoOccupant &&
                actor.ResidentType == ResidentType.Tenant &&
                string.Equals(apartment.TenantId, actor.Id, StringComparison.OrdinalIgnoreCase);

            if (!canAddFamily && !canAddCoOccupant)
                return Result<UserResponse>.Failure(ErrorCodes.Forbidden, "You are not allowed to add this household member type.");

            var existing = await userRepository.GetByEmailAsync(request.SocietyId, request.Email.Trim().ToLowerInvariant(), ct);
            if (existing is not null)
                return Result<UserResponse>.Failure(ErrorCodes.UserAlreadyExists,
                    $"A resident with email {request.Email} already exists in this society.");

            var created = await userRepository.CreateAsync(
                Domain.Entities.User.Create(
                    request.SocietyId, request.FullName, request.Email, request.Phone,
                    UserRole.SUUser, request.ResidentType, request.ApartmentId, actor.Id), ct);

            apartment.AddResident(created.Id, created.FullName, request.ResidentType);
            await apartmentRepository.UpdateAsync(apartment, ct);
            created.LinkApartment(apartment.Id, apartment.ToDisplayLabel(), request.ResidentType, makePrimary: true);
            var updatedUser = await userRepository.UpdateAsync(created, ct);
            return Result<UserResponse>.Success(updatedUser.ToResponse(await ApartmentManagement.Application.Queries.User.UserQueryMapping.GetResidentApartmentsAsync(updatedUser, apartmentRepository, ct)));
        }
        catch (NotFoundException ex)
        {
            return Result<UserResponse>.Failure(ErrorCodes.UserNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to add household member to apartment {ApartmentId}", request.ApartmentId);
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

internal static class UserLoginOptionMapper
{
    public static async Task<List<LoginOptionDto>> BuildLoginOptionsAsync(
        IReadOnlyList<Domain.Entities.User> users,
        ISocietyRepository societyRepository,
        IApartmentRepository apartmentRepository,
        CancellationToken ct)
    {
        var options = new List<LoginOptionDto>(users.Count);
        foreach (var user in users)
        {
            var society = await societyRepository.GetByIdAsync(user.SocietyId, user.SocietyId, ct);
            var apartment = string.IsNullOrWhiteSpace(user.ApartmentId)
                ? null
                : await apartmentRepository.GetByIdAsync(user.ApartmentId, user.SocietyId, ct);

            options.Add(new LoginOptionDto(
                user.Id,
                user.SocietyId,
                society?.Name ?? user.SocietyId,
                user.ApartmentId,
                apartment?.ToDisplayLabel(),
                user.Role.ToString(),
                user.ResidentType.ToString()));
        }

        return options;
    }
}

// ─── Assign Role ──────────────────────────────────────────────────────────────

public record AssignRoleCommand(string SocietyId, string UserId, UserRole Role) : IRequest<Result<bool>>;

public sealed class AssignRoleCommandHandler(
    IUserRepository userRepository,
    ILogger<AssignRoleCommandHandler> logger)
    : IRequestHandler<AssignRoleCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(AssignRoleCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.UserId);

            user.AssignRole(request.Role);
            await userRepository.UpdateAsync(user, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.UserNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to assign role for user {UserId}", request.UserId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

}

namespace ApartmentManagement.Application.Queries.User
{

internal static class UserQueryMapping
{
    internal static async Task<IReadOnlyList<ResidentApartmentDto>> GetResidentApartmentsAsync(
        Domain.Entities.User user,
        IApartmentRepository apartmentRepository,
        CancellationToken ct)
    {
        if (user.Apartments.Count > 0)
        {
            var linkedApartments = new List<ResidentApartmentDto>(user.Apartments.Count);
            foreach (var link in user.Apartments)
            {
                var apartment = await apartmentRepository.GetByIdAsync(link.ApartmentId, user.SocietyId, ct);
                linkedApartments.Add(new ResidentApartmentDto(
                    link.ApartmentId,
                    apartment?.ToDisplayLabel() ?? link.Name,
                    link.ResidentType.ToString()));
            }

            return linkedApartments
                .OrderBy(link => link.Name, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        var residentApartments = new List<ResidentApartmentDto>();
        var seenApartmentIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var ownedTask  = apartmentRepository.GetByOwnerAsync(user.SocietyId, user.Id, ct);
        var tenantTask = apartmentRepository.GetByTenantAsync(user.SocietyId, user.Id, ct);
        await Task.WhenAll(ownedTask, tenantTask);
        var ownedApartments  = ownedTask.Result  ?? [];
        var tenantApartments = tenantTask.Result ?? [];
        foreach (var apartment in ownedApartments.OrderBy(a => a.ApartmentNumber, StringComparer.OrdinalIgnoreCase))
        {
            if (seenApartmentIds.Add(apartment.Id))
                residentApartments.Add(apartment.ToResidentApartmentResponse(ResidentType.Owner));
        }
        foreach (var apartment in tenantApartments.OrderBy(a => a.ApartmentNumber, StringComparer.OrdinalIgnoreCase))
        {
            if (seenApartmentIds.Add(apartment.Id))
                residentApartments.Add(apartment.ToResidentApartmentResponse(ResidentType.Tenant));
        }

        if (!string.IsNullOrWhiteSpace(user.ApartmentId) && seenApartmentIds.Add(user.ApartmentId))
        {
            var primaryApartment = await apartmentRepository.GetByIdAsync(user.ApartmentId, user.SocietyId, ct);
            if (primaryApartment is not null)
                residentApartments.Add(primaryApartment.ToResidentApartmentResponse(user.ResidentType));
        }

        return residentApartments
            .OrderBy(apartment => apartment.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}

public record GetUserQuery(string SocietyId, string UserId) : IRequest<Result<UserResponse>>;

public sealed class GetUserQueryHandler(IUserRepository userRepository, IApartmentRepository apartmentRepository)
    : IRequestHandler<GetUserQuery, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(GetUserQuery request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.UserId);
            var apartments = await UserQueryMapping.GetResidentApartmentsAsync(user, apartmentRepository, ct);
            return Result<UserResponse>.Success(user.ToResponse(apartments));
        }
        catch (NotFoundException ex)
        {
            return Result<UserResponse>.Failure(ErrorCodes.UserNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record FindUserByEmailQuery(string SocietyId, string Email) : IRequest<Result<UserResponse>>;

public sealed class FindUserByEmailQueryHandler(IUserRepository userRepository, IApartmentRepository apartmentRepository)
    : IRequestHandler<FindUserByEmailQuery, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(FindUserByEmailQuery request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByEmailAsync(request.SocietyId, request.Email.Trim().ToLowerInvariant(), ct)
                ?? throw new NotFoundException("User", request.Email);
            var apartments = await UserQueryMapping.GetResidentApartmentsAsync(user, apartmentRepository, ct);
            return Result<UserResponse>.Success(user.ToResponse(apartments));
        }
        catch (NotFoundException ex)
        {
            return Result<UserResponse>.Failure(ErrorCodes.UserNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetUsersBySocietyQuery(string SocietyId, PaginationParams Pagination, UserRole? RoleFilter, string? SearchText = null)
    : IRequest<Result<PagedResult<UserResponse>>>;

public sealed class GetUsersBySocietyQueryHandler(IUserRepository userRepository, IApartmentRepository apartmentRepository)
    : IRequestHandler<GetUsersBySocietyQuery, Result<PagedResult<UserResponse>>>
{
    public async Task<Result<PagedResult<UserResponse>>> Handle(GetUsersBySocietyQuery request, CancellationToken ct)
    {
        try
        {
            IReadOnlyList<Domain.Entities.User> users;
            if (request.RoleFilter.HasValue)
            {
                users = await userRepository.GetByRoleAsync(
                    request.SocietyId, request.RoleFilter.Value,
                    request.Pagination.Page, request.Pagination.PageSize, ct);
            }
            else
            {
                users = await userRepository.GetAllAsync(request.SocietyId, ct);
            }

            var items = new List<UserResponse>(users.Count);
            foreach (var user in users.Where(u => !u.IsDeleted))
            {
                var apartments = await UserQueryMapping.GetResidentApartmentsAsync(user, apartmentRepository, ct);
                items.Add(user.ToResponse(apartments));
            }

            if (!string.IsNullOrWhiteSpace(request.SearchText))
            {
                var term = request.SearchText.Trim();
                items = items.Where(i =>
                    i.FullName.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    i.Email.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    i.Phone.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                    i.Apartments.Any(a => a.Name.Contains(term, StringComparison.OrdinalIgnoreCase))
                ).ToList();
            }

            return Result<PagedResult<UserResponse>>.Success(
                new PagedResult<UserResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<UserResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetUsersByApartmentQuery(string SocietyId, string ApartmentId)
    : IRequest<Result<IReadOnlyList<UserResponse>>>;

public sealed class GetUsersByApartmentQueryHandler(IUserRepository userRepository, IApartmentRepository apartmentRepository)
    : IRequestHandler<GetUsersByApartmentQuery, Result<IReadOnlyList<UserResponse>>>
{
    public async Task<Result<IReadOnlyList<UserResponse>>> Handle(GetUsersByApartmentQuery request, CancellationToken ct)
    {
        try
        {
            var all = await userRepository.GetAllAsync(request.SocietyId, ct);
            var filteredUsers = all
                .Where(u => u.Apartments.Any(a => a.ApartmentId == request.ApartmentId) || u.ApartmentId == request.ApartmentId)
                .ToList();

            var items = new List<UserResponse>(filteredUsers.Count);
            foreach (var user in filteredUsers)
            {
                var apartments = await UserQueryMapping.GetResidentApartmentsAsync(user, apartmentRepository, ct);
                items.Add(user.ToResponse(apartments));
            }
            return Result<IReadOnlyList<UserResponse>>.Success(items);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<UserResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Generate Invite Link ─────────────────────────────────────────────────────

public record GenerateInviteLinkCommand(string SocietyId, string? ApartmentId = null)
    : IRequest<Result<InviteLinkResponse>>;

public sealed class GenerateInviteLinkCommandHandler(IAuthService authService, ISocietyRepository societyRepository)
    : IRequestHandler<GenerateInviteLinkCommand, Result<InviteLinkResponse>>
{
    public async Task<Result<InviteLinkResponse>> Handle(GenerateInviteLinkCommand request, CancellationToken ct)
    {
        try
        {
            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct);
            if (society is null)
                return Result<InviteLinkResponse>.Failure(ErrorCodes.SocietyNotFound, "Society not found.");

            var token = await authService.GenerateInviteTokenAsync(request.SocietyId, request.ApartmentId, ct);
            return Result<InviteLinkResponse>.Success(new InviteLinkResponse(token, $"/auth/register?token={token}"));
        }
        catch (Exception ex)
        {
            return Result<InviteLinkResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Validate Invite Token ────────────────────────────────────────────────────

public record ValidateInviteTokenQuery(string Token)
    : IRequest<Result<ValidateInviteTokenResponse>>;

public sealed class ValidateInviteTokenQueryHandler(IAuthService authService)
    : IRequestHandler<ValidateInviteTokenQuery, Result<ValidateInviteTokenResponse>>
{
    public async Task<Result<ValidateInviteTokenResponse>> Handle(ValidateInviteTokenQuery request, CancellationToken ct)
    {
        var claims = await authService.ValidateInviteTokenAsync(request.Token, ct);
        if (claims is null)
            return Result<ValidateInviteTokenResponse>.Success(new ValidateInviteTokenResponse(false, null, null));

        return Result<ValidateInviteTokenResponse>.Success(new ValidateInviteTokenResponse(true, claims.SocietyId, claims.ApartmentId));
    }
}

// ─── Self Register ────────────────────────────────────────────────────────────

public record SelfRegisterCommand(string SocietyId, string FullName, string Email, string Phone, string Password)
    : IRequest<Result<UserResponse>>;

public sealed class SelfRegisterCommandHandler(
    IUserRepository userRepository,
    IAuthService authService)
    : IRequestHandler<SelfRegisterCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(SelfRegisterCommand request, CancellationToken ct)
    {
        try
        {
            var existing = await userRepository.GetByEmailAsync(request.SocietyId, request.Email.Trim().ToLowerInvariant(), ct);
            if (existing is not null)
                return Result<UserResponse>.Failure(ErrorCodes.UserAlreadyExists, $"An account with email {request.Email} already exists in this society.");

            var user = Domain.Entities.User.Create(
                request.SocietyId, request.FullName, request.Email, request.Phone,
                UserRole.SUUser, ResidentType.Owner);

            user.SetPasswordHash(authService.HashPassword(request.Password));
            user.Verify(); // invite token already proves identity — no OTP step needed

            await userRepository.CreateAsync(user, ct);
            return Result<UserResponse>.Success(user.ToResponse());
        }
        catch (Exception ex)
        {
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Request Apartment Join ───────────────────────────────────────────────────

public record RequestApartmentJoinCommand(string SocietyId, string UserId, string ApartmentId, ResidentType ResidentType)
    : IRequest<Result<UserResponse>>;

public sealed class RequestApartmentJoinCommandHandler(
    IUserRepository userRepository,
    IApartmentRepository apartmentRepository)
    : IRequestHandler<RequestApartmentJoinCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(RequestApartmentJoinCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct);
            if (user is null)
                return Result<UserResponse>.Failure(ErrorCodes.UserNotFound, $"User '{request.UserId}' not found.");

            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct);
            if (apartment is null)
                return Result<UserResponse>.Failure(ErrorCodes.ApartmentNotFound, $"Apartment '{request.ApartmentId}' not found.");

            if (request.ResidentType is not (ResidentType.Owner or ResidentType.Tenant))
                return Result<UserResponse>.Failure(ErrorCodes.ValidationFailed, "Apartment join requests are only supported for Owner or Tenant resident types.");

            user.RequestApartmentJoin(request.ApartmentId, request.ResidentType);
            await userRepository.UpdateAsync(user, ct);

            var apartments = user.Apartments
                .Select(a => new ResidentApartmentDto(a.ApartmentId, a.Name, a.ResidentType.ToString()))
                .ToList();
            return Result<UserResponse>.Success(user.ToResponse(apartments));
        }
        catch (Exception ex)
        {
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Approve Apartment Join ───────────────────────────────────────────────────

public record ApproveApartmentJoinCommand(string SocietyId, string UserId)
    : IRequest<Result<UserResponse>>;

public sealed class ApproveApartmentJoinCommandHandler(
    IUserRepository userRepository,
    IApartmentRepository apartmentRepository)
    : IRequestHandler<ApproveApartmentJoinCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(ApproveApartmentJoinCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct);
            if (user is null)
                return Result<UserResponse>.Failure(ErrorCodes.UserNotFound, $"User '{request.UserId}' not found.");

            if (string.IsNullOrWhiteSpace(user.PendingApartmentId) || string.IsNullOrWhiteSpace(user.PendingResidentType))
                return Result<UserResponse>.Failure(ErrorCodes.NoPendingApartmentRequest, "User has no pending apartment join request.");

            if (!Enum.TryParse<ResidentType>(user.PendingResidentType, out var residentType))
                return Result<UserResponse>.Failure(ErrorCodes.ValidationFailed, "Invalid pending resident type.");

            var apartment = await apartmentRepository.GetByIdAsync(user.PendingApartmentId, request.SocietyId, ct);
            if (apartment is null)
            {
                user.ClearPendingApartmentRequest();
                await userRepository.UpdateAsync(user, ct);
                return Result<UserResponse>.Failure(ErrorCodes.ApartmentNotFound, "The requested apartment no longer exists.");
            }

            user.LinkApartment(apartment.Id, apartment.ToDisplayLabel(), residentType, makePrimary: !user.Apartments.Any());
            apartment.AddResident(user.Id, user.FullName, residentType);
            user.ClearPendingApartmentRequest();

            await apartmentRepository.UpdateAsync(apartment, ct);
            await userRepository.UpdateAsync(user, ct);

            var apartments = user.Apartments
                .Select(a => new ResidentApartmentDto(a.ApartmentId, a.Name, a.ResidentType.ToString()))
                .ToList();
            return Result<UserResponse>.Success(user.ToResponse(apartments));
        }
        catch (Exception ex)
        {
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Deny Apartment Join ──────────────────────────────────────────────────────

public record DenyApartmentJoinCommand(string SocietyId, string UserId)
    : IRequest<Result<UserResponse>>;

public sealed class DenyApartmentJoinCommandHandler(IUserRepository userRepository)
    : IRequestHandler<DenyApartmentJoinCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(DenyApartmentJoinCommand request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct);
            if (user is null)
                return Result<UserResponse>.Failure(ErrorCodes.UserNotFound, $"User '{request.UserId}' not found.");

            if (string.IsNullOrWhiteSpace(user.PendingApartmentId))
                return Result<UserResponse>.Failure(ErrorCodes.NoPendingApartmentRequest, "User has no pending apartment join request.");

            user.ClearPendingApartmentRequest();
            await userRepository.UpdateAsync(user, ct);

            var apartments = user.Apartments
                .Select(a => new ResidentApartmentDto(a.ApartmentId, a.Name, a.ResidentType.ToString()))
                .ToList();
            return Result<UserResponse>.Success(user.ToResponse(apartments));
        }
        catch (Exception ex)
        {
            return Result<UserResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Get Users With Pending Apartment Requests ────────────────────────────────

public record GetUsersWithPendingJoinRequestsQuery(string SocietyId)
    : IRequest<Result<IReadOnlyList<UserResponse>>>;

public sealed class GetUsersWithPendingJoinRequestsQueryHandler(
    IUserRepository userRepository,
    IApartmentRepository apartmentRepository)
    : IRequestHandler<GetUsersWithPendingJoinRequestsQuery, Result<IReadOnlyList<UserResponse>>>
{
    public async Task<Result<IReadOnlyList<UserResponse>>> Handle(GetUsersWithPendingJoinRequestsQuery request, CancellationToken ct)
    {
        try
        {
            var all = await userRepository.GetAllAsync(request.SocietyId, ct);
            var pending = all.Where(u => !string.IsNullOrWhiteSpace(u.PendingApartmentId)).ToList();

            var items = new List<UserResponse>(pending.Count);
            foreach (var user in pending)
            {
                var apartments = await UserQueryMapping.GetResidentApartmentsAsync(user, apartmentRepository, ct);
                items.Add(user.ToResponse(apartments));
            }
            return Result<IReadOnlyList<UserResponse>>.Success(items);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<UserResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
}
