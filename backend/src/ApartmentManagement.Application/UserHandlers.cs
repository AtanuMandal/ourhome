// Superseded by UserModule.cs — do not compile
#if false
using ApartmentManagement.Application.DTOs;

public sealed record SendOtpCommand(string SocietyId, SendOtpRequest Request)
    : IRequest<Result<OtpResponse>>;

public sealed record VerifyOtpCommand(string SocietyId, VerifyOtpRequest Request)
    : IRequest<Result<AuthResponse>>;

public sealed record UpdateUserProfileCommand(string SocietyId, string UserId, UpdateUserProfileRequest Request)
    : IRequest<Result<UserDto>>;

public sealed record DeactivateUserCommand(string SocietyId, string UserId)
    : IRequest<Result<bool>>;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

public sealed record GetUserQuery(string SocietyId, string UserId)
    : IRequest<Result<UserDto>>;

public sealed record ListUsersQuery(string SocietyId, UserRole? Role, int Page, int PageSize)
    : IRequest<Result<PagedResult<UserDto>>>;

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

public sealed class RegisterUserCommandHandler(IUserRepository userRepository)
    : IRequestHandler<RegisterUserCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(
        RegisterUserCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var req = command.Request;

            var existing = await userRepository
                .GetByEmailAsync(command.SocietyId, req.Email, cancellationToken);
            if (existing is not null)
                return Result<UserDto>.Failure(
                    ErrorCodes.UserAlreadyExists,
                    $"A user with email '{req.Email}' already exists in this society.");

            var fullName = $"{req.FirstName} {req.LastName}".Trim();
            var user = User.Create(command.SocietyId, fullName, req.Email, req.Phone, req.Role, req.ApartmentId);

            var saved = await userRepository.CreateAsync(user, cancellationToken);
            return Result<UserDto>.Success(UserMapper.ToDto(saved));
        }
        catch (ArgumentException ex)
        {
            return Result<UserDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return Result<UserDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
    }
}

public sealed class SendOtpCommandHandler(
    IUserRepository userRepository,
    INotificationService notificationService)
    : IRequestHandler<SendOtpCommand, Result<OtpResponse>>
{
    public async Task<Result<OtpResponse>> Handle(
        SendOtpCommand command, CancellationToken cancellationToken)
    {
        var user = await userRepository
            .GetByPhoneAsync(command.SocietyId, command.Request.Phone, cancellationToken);
        if (user is null)
            return Result<OtpResponse>.Failure(ErrorCodes.UserNotFound, "No user found with that phone number.");

        user.GenerateOtp();
        await userRepository.UpdateAsync(user, cancellationToken);
        await notificationService.SendSmsAsync(
            user.Phone,
            $"Your OTP is: {user.OtpCode}. Valid for 10 minutes.",
            cancellationToken);

        return Result<OtpResponse>.Success(new OtpResponse("OTP sent successfully.", user.OtpExpiry!.Value));
    }
}

public sealed class VerifyOtpCommandHandler(
    IUserRepository userRepository,
    IAuthService authService)
    : IRequestHandler<VerifyOtpCommand, Result<AuthResponse>>
{
    public async Task<Result<AuthResponse>> Handle(
        VerifyOtpCommand command, CancellationToken cancellationToken)
    {
        var user = await userRepository
            .GetByPhoneAsync(command.SocietyId, command.Request.Phone, cancellationToken);
        if (user is null)
            return Result<AuthResponse>.Failure(ErrorCodes.UserNotFound, "No user found with that phone number.");

        if (!user.ValidateOtp(command.Request.Otp))
            return Result<AuthResponse>.Failure(ErrorCodes.OtpInvalid, "Invalid or expired OTP.");

        user.Verify();
        await userRepository.UpdateAsync(user, cancellationToken);

        var roles = new List<string> { user.Role.ToString() };
        var token = await authService.GenerateTokenAsync(
            user.Id, user.Email, roles, command.SocietyId, cancellationToken);
        var expiresAt = DateTime.UtcNow.AddHours(8);

        return Result<AuthResponse>.Success(new AuthResponse(token, user.Id, user.Email, roles, expiresAt));
    }
}

public sealed class UpdateUserProfileCommandHandler(IUserRepository userRepository)
    : IRequestHandler<UpdateUserProfileCommand, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(
        UpdateUserProfileCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var user = await userRepository
                .GetByIdAsync(command.UserId, command.SocietyId, cancellationToken);
            if (user is null)
                return Result<UserDto>.Failure(ErrorCodes.UserNotFound, "User not found.");

            var req = command.Request;
            var spaceIdx      = user.FullName.IndexOf(' ');
            var existingFirst = spaceIdx >= 0 ? user.FullName[..spaceIdx]       : user.FullName;
            var existingLast  = spaceIdx >= 0 ? user.FullName[(spaceIdx + 1)..] : string.Empty;

            var newFullName = $"{req.FirstName ?? existingFirst} {req.LastName ?? existingLast}".Trim();
            var newPhone    = req.Phone ?? user.Phone;

            user.UpdateProfile(newFullName, newPhone);
            var saved = await userRepository.UpdateAsync(user, cancellationToken);
            return Result<UserDto>.Success(UserMapper.ToDto(saved));
        }
        catch (ArgumentException ex)
        {
            return Result<UserDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return Result<UserDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
    }
}

public sealed class DeactivateUserCommandHandler(IUserRepository userRepository)
    : IRequestHandler<DeactivateUserCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(
        DeactivateUserCommand command, CancellationToken cancellationToken)
    {
        var user = await userRepository
            .GetByIdAsync(command.UserId, command.SocietyId, cancellationToken);
        if (user is null)
            return Result<bool>.Failure(ErrorCodes.UserNotFound, "User not found.");

        user.Deactivate();
        await userRepository.UpdateAsync(user, cancellationToken);
        return Result<bool>.Success(true);
    }
}

public sealed class GetUserQueryHandler(IUserRepository userRepository)
    : IRequestHandler<GetUserQuery, Result<UserDto>>
{
    public async Task<Result<UserDto>> Handle(
        GetUserQuery query, CancellationToken cancellationToken)
    {
        var user = await userRepository
            .GetByIdAsync(query.UserId, query.SocietyId, cancellationToken);
        if (user is null)
            return Result<UserDto>.Failure(ErrorCodes.UserNotFound, "User not found.");

        return Result<UserDto>.Success(UserMapper.ToDto(user));
    }
}

public sealed class ListUsersQueryHandler(IUserRepository userRepository)
    : IRequestHandler<ListUsersQuery, Result<PagedResult<UserDto>>>
{
    public async Task<Result<PagedResult<UserDto>>> Handle(
        ListUsersQuery query, CancellationToken cancellationToken)
    {
        var page     = query.Page     < 1 ? 1  : query.Page;
        var pageSize = query.PageSize < 1 ? 20 : query.PageSize;

        if (query.Role.HasValue)
        {
            var paged = await userRepository
                .GetByRoleAsync(query.SocietyId, query.Role.Value, page, pageSize, cancellationToken);
            var dtos = paged.Select(UserMapper.ToDto).ToList();
            return Result<PagedResult<UserDto>>.Success(
                new PagedResult<UserDto>(dtos, dtos.Count, page, pageSize));
        }
        else
        {
            var all  = await userRepository.GetAllAsync(query.SocietyId, cancellationToken);
            var dtos = all
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(UserMapper.ToDto)
                .ToList();
            return Result<PagedResult<UserDto>>.Success(
                new PagedResult<UserDto>(dtos, all.Count, page, pageSize));
        }
    }
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

internal static class UserMapper
{
    internal static UserDto ToDto(User u)
    {
        var spaceIdx = u.FullName.IndexOf(' ');
        var first    = spaceIdx >= 0 ? u.FullName[..spaceIdx]       : u.FullName;
        var last     = spaceIdx >= 0 ? u.FullName[(spaceIdx + 1)..] : string.Empty;

        return new UserDto(
            Id:          u.Id,
            SocietyId:   u.SocietyId,
            FirstName:   first,
            LastName:    last,
            Email:       u.Email,
            Phone:       u.Phone,
            Role:        u.Role,
            IsVerified:  u.IsVerified,
            IsActive:    u.IsActive,
            ApartmentId: u.ApartmentId,
            CreatedAt:   u.CreatedAt);
    }
}
#endif
