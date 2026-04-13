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
    ILogger<CreateUserCommandHandler> logger)
    : IRequestHandler<CreateUserCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(CreateUserCommand request, CancellationToken ct)
    {
        try
        {
            var existing = (await userRepository.GetAllAsync(request.SocietyId, ct)).FirstOrDefault(u =>
                u.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase) &&
                u.Role == request.Role &&
                u.ResidentType == request.ResidentType &&
                string.Equals(u.ApartmentId, request.ApartmentId, StringComparison.OrdinalIgnoreCase));
            if (existing is not null)
                return Result<UserResponse>.Failure(ErrorCodes.UserAlreadyExists,
                    $"A user with email {request.Email} already exists for the same apartment and resident type.");

            var user = Domain.Entities.User.Create(
                request.SocietyId, request.FullName, request.Email, request.Phone,
                request.Role, request.ResidentType, request.ApartmentId, request.InvitedByUserId);

            user.GenerateOtp();
            var created = await userRepository.CreateAsync(user, ct);

            if (!string.IsNullOrWhiteSpace(created.ApartmentId))
            {
                var apartment = await apartmentRepository.GetByIdAsync(created.ApartmentId, created.SocietyId, ct)
                    ?? throw new NotFoundException("Apartment", created.ApartmentId);

                if (created.ResidentType == ResidentType.Owner)
                {
                    if (!string.IsNullOrWhiteSpace(apartment.OwnerId) && apartment.OwnerId != created.Id)
                        return Result<UserResponse>.Failure(ErrorCodes.Conflict, "This apartment already has an owner. Use ownership transfer instead.");

                    apartment.AssignOwner(created.Id, created.FullName);
                    await apartmentRepository.UpdateAsync(apartment, ct);
                }
                else if (created.ResidentType == ResidentType.Tenant)
                {
                    if (!string.IsNullOrWhiteSpace(apartment.TenantId) && apartment.TenantId != created.Id)
                        return Result<UserResponse>.Failure(ErrorCodes.Conflict, "This apartment already has a tenant. Use tenancy transfer instead.");

                    apartment.AssignTenant(created.Id, created.FullName);
                    await apartmentRepository.UpdateAsync(apartment, ct);
                }
            }

            if (!string.IsNullOrWhiteSpace(created.Phone))
                await notificationService.SendSmsAsync(created.Phone,
                    $"Your OTP for apartment management system is: {created.OtpCode}", ct);

            foreach (var evt in created.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            created.ClearDomainEvents();

            return Result<UserResponse>.Success(created.ToResponse());
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
            return Result<UserResponse>.Success(updated.ToResponse());
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

            var token    = await authService.GenerateJwtTokenAsync(user.Id, user.Email, user.Role.ToString(), user.SocietyId, ct);
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

            var token = await authService.GenerateJwtTokenAsync(selected.Id, selected.Email, selected.Role.ToString(), selected.SocietyId, ct);
            return Result<LoginResponse>.Success(new LoginResponse(false, token, selected.ToAuthUser(), []));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed password login for {Email}", request.Email);
            return Result<LoginResponse>.Failure(ErrorCodes.InternalError, ex.Message);
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

            var created = await userRepository.CreateAsync(
                Domain.Entities.User.Create(
                    request.SocietyId, request.FullName, request.Email, request.Phone,
                    UserRole.SUUser, ResidentType.Owner, request.ApartmentId, currentUserService.UserId), ct);

            apartment.AssignOwner(created.Id, created.FullName);
            await apartmentRepository.UpdateAsync(apartment, ct);
            return Result<UserResponse>.Success(created.ToResponse());
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

            var created = await userRepository.CreateAsync(
                Domain.Entities.User.Create(
                    request.SocietyId, request.FullName, request.Email, request.Phone,
                    UserRole.SUUser, ResidentType.Tenant, request.ApartmentId, currentUserService.UserId), ct);

            apartment.AssignTenant(created.Id, created.FullName);
            await apartmentRepository.UpdateAsync(apartment, ct);
            return Result<UserResponse>.Success(created.ToResponse());
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
            var canAddFamily = request.ResidentType == ResidentType.FamilyMember &&
                (actor.Role == UserRole.SUAdmin || actor.ResidentType == ResidentType.Owner);
            var canAddCoOccupant = request.ResidentType == ResidentType.CoOccupant &&
                (actor.Role == UserRole.SUAdmin || actor.ResidentType == ResidentType.Tenant);

            if (!canAddFamily && !canAddCoOccupant)
                return Result<UserResponse>.Failure(ErrorCodes.Forbidden, "You are not allowed to add this household member type.");

            var created = await userRepository.CreateAsync(
                Domain.Entities.User.Create(
                    request.SocietyId, request.FullName, request.Email, request.Phone,
                    UserRole.SUUser, request.ResidentType, request.ApartmentId, actor.Id), ct);

            return Result<UserResponse>.Success(created.ToResponse());
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
                apartment?.ApartmentNumber,
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

public record GetUserQuery(string SocietyId, string UserId) : IRequest<Result<UserResponse>>;

public sealed class GetUserQueryHandler(IUserRepository userRepository)
    : IRequestHandler<GetUserQuery, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(GetUserQuery request, CancellationToken ct)
    {
        try
        {
            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.UserId);
            return Result<UserResponse>.Success(user.ToResponse());
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

public record GetUsersBySocietyQuery(string SocietyId, PaginationParams Pagination, UserRole? RoleFilter)
    : IRequest<Result<PagedResult<UserResponse>>>;

public sealed class GetUsersBySocietyQueryHandler(IUserRepository userRepository)
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

            var items = users.Select(u => u.ToResponse()).ToList();
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

public sealed class GetUsersByApartmentQueryHandler(IUserRepository userRepository)
    : IRequestHandler<GetUsersByApartmentQuery, Result<IReadOnlyList<UserResponse>>>
{
    public async Task<Result<IReadOnlyList<UserResponse>>> Handle(GetUsersByApartmentQuery request, CancellationToken ct)
    {
        try
        {
            var all = await userRepository.GetAllAsync(request.SocietyId, ct);
            var items = all
                .Where(u => u.ApartmentId == request.ApartmentId)
                .Select(u => u.ToResponse())
                .ToList();
            return Result<IReadOnlyList<UserResponse>>.Success(items);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<UserResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
}
