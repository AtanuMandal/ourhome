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
    string SocietyId, string FullName, string Email, string Phone, UserRole Role, string? ApartmentId)
    : IRequest<Result<UserResponse>>;

public sealed class CreateUserCommandHandler(
    IUserRepository userRepository,
    INotificationService notificationService,
    IEventPublisher eventPublisher,
    ILogger<CreateUserCommandHandler> logger)
    : IRequestHandler<CreateUserCommand, Result<UserResponse>>
{
    public async Task<Result<UserResponse>> Handle(CreateUserCommand request, CancellationToken ct)
    {
        try
        {
            var existing = await userRepository.GetByEmailAsync(request.SocietyId, request.Email, ct);
            if (existing is not null)
                return Result<UserResponse>.Failure(ErrorCodes.UserAlreadyExists,
                    $"A user with email {request.Email} already exists in this society.");

            var user = Domain.Entities.User.Create(
                request.SocietyId, request.FullName, request.Email, request.Phone,
                request.Role, request.ApartmentId);

            user.GenerateOtp();
            var created = await userRepository.CreateAsync(user, ct);

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
            var authUser = new AuthUserDto(user.Id, user.SocietyId, user.FullName, user.Email, user.Phone, user.Role.ToString(), user.ApartmentId, user.IsVerified);

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