# Complete ApartmentManagement.Application File Contents

## STEP 1: Create Directory Structure

Execute this in Command Prompt:
```batch
cd /d "C:\01. Atanu\Code\apartment_management\backend\src\ApartmentManagement.Application"
mkdir Common\Behaviors
mkdir Societies\Commands Societies\Queries
mkdir Apartments\Commands Apartments\Queries
mkdir Users\Commands Users\Queries
mkdir Amenities\Commands Amenities\Queries
mkdir Complaints\Commands Complaints\Queries
mkdir Notices\Commands Notices\Queries
mkdir Visitors\Commands Visitors\Queries
mkdir Fees\Commands Fees\Queries
mkdir Gamification\Commands Gamification\Queries
mkdir ServiceProviders\Commands ServiceProviders\Queries
```

## STEP 2: Copy-Paste Files in Visual Studio

For each file below:
1. Right-click the appropriate folder
2. Select "Add → Class"
3. Name it (filename shown before content)
4. Replace entire file content with code shown

---

# COMMON\BEHAVIORS

## LoggingBehavior.cs
```csharp
using MediatR;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Application.Common.Behaviors;

public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogInformation("Handling {RequestName}: {@Request}", requestName, request);

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var response = await next();
            stopwatch.Stop();
            _logger.LogInformation("Handled {RequestName} in {ElapsedMs}ms", requestName, stopwatch.ElapsedMilliseconds);
            return response;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Error handling {RequestName} after {ElapsedMs}ms", requestName, stopwatch.ElapsedMilliseconds);
            throw;
        }
    }
}
```

## ValidationBehavior.cs
```csharp
using FluentValidation;
using MediatR;

namespace ApartmentManagement.Application.Common.Behaviors;

public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (!_validators.Any())
            return await next();

        var context = new ValidationContext<TRequest>(request);
        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        var failures = validationResults
            .Where(r => r.Errors.Count != 0)
            .SelectMany(r => r.Errors)
            .ToList();

        if (failures.Count != 0)
            throw new ApartmentManagement.Shared.Exceptions.AppValidationException(
                failures.Select(f => f.ErrorMessage));

        return await next();
    }
}
```

## AuthorizationBehavior.cs
```csharp
using ApartmentManagement.Domain.Services;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Application.Common.Behaviors;

/// <summary>Marks a request as requiring authentication.</summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]
public class AuthorizeAttribute : Attribute
{
    public string? Roles { get; set; }
}

public class AuthorizationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ICurrentUserService _currentUser;
    private readonly ILogger<AuthorizationBehavior<TRequest, TResponse>> _logger;

    public AuthorizationBehavior(ICurrentUserService currentUser, ILogger<AuthorizationBehavior<TRequest, TResponse>> logger)
    {
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var authorizeAttr = typeof(TRequest)
            .GetCustomAttributes(typeof(AuthorizeAttribute), true)
            .FirstOrDefault() as AuthorizeAttribute;

        if (authorizeAttr is null)
            return await next();

        if (!_currentUser.IsAuthenticated)
            throw new ApartmentManagement.Shared.Exceptions.UnauthorizedException();

        if (!string.IsNullOrWhiteSpace(authorizeAttr.Roles))
        {
            var requiredRoles = authorizeAttr.Roles.Split(',', StringSplitOptions.RemoveEmptyEntries);
            if (!requiredRoles.Any(r => _currentUser.IsInRole(r.Trim())))
                throw new ApartmentManagement.Shared.Exceptions.ForbiddenException();
        }

        return await next();
    }
}
```

---

# SOCIETIES\COMMANDS

## CreateSocietyCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.Services;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Shared.Result;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Application.Societies.Commands;

public record CreateSocietyCommand(
    string Name,
    string Address,
    string RegistrationNumber,
    string AdminUserId,
    int TotalApartments,
    int TotalBlocks) : IRequest<Result<Society>>;

public class CreateSocietyCommandHandler : IRequestHandler<CreateSocietyCommand, Result<Society>>
{
    private readonly ISocietyRepository _repo;
    private readonly IEventPublisher _events;
    private readonly ILogger<CreateSocietyCommandHandler> _logger;

    public CreateSocietyCommandHandler(ISocietyRepository repo, IEventPublisher events, ILogger<CreateSocietyCommandHandler> logger)
    {
        _repo = repo;
        _events = events;
        _logger = logger;
    }

    public async Task<Result<Society>> Handle(CreateSocietyCommand cmd, CancellationToken ct)
    {
        var existing = await _repo.GetByNameAsync(cmd.Name, ct);
        if (existing is not null)
            return Result<Society>.Failure("SOCIETY_DUPLICATE", $"A society with name '{cmd.Name}' already exists.");

        var society = new Society
        {
            Name = cmd.Name,
            Address = cmd.Address,
            RegistrationNumber = cmd.RegistrationNumber,
            AdminUserId = cmd.AdminUserId,
            TotalApartments = cmd.TotalApartments,
            TotalBlocks = cmd.TotalBlocks
        };

        await _repo.AddAsync(society, ct);
        await _events.PublishAsync(new SocietyCreatedEvent(society.Id, society.Name, society.AdminUserId), ct);

        return Result<Society>.Success(society);
    }
}
```

## UpdateSocietyCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Societies.Commands;

public record UpdateSocietyCommand(
    string SocietyId,
    string Name,
    string Address,
    int TotalApartments,
    int TotalBlocks) : IRequest<Result<Society>>;

public class UpdateSocietyCommandHandler : IRequestHandler<UpdateSocietyCommand, Result<Society>>
{
    private readonly ISocietyRepository _repo;

    public UpdateSocietyCommandHandler(ISocietyRepository repo) => _repo = repo;

    public async Task<Result<Society>> Handle(UpdateSocietyCommand cmd, CancellationToken ct)
    {
        var society = await _repo.GetByIdAsync(cmd.SocietyId, cmd.SocietyId, ct);
        if (society is null)
            return Result<Society>.Failure("SOCIETY_NOT_FOUND", "Society not found.");

        society.Name = cmd.Name;
        society.Address = cmd.Address;
        society.TotalApartments = cmd.TotalApartments;
        society.TotalBlocks = cmd.TotalBlocks;
        society.UpdatedAt = DateTime.UtcNow;

        await _repo.UpdateAsync(society, society.ETag, ct);
        return Result<Society>.Success(society);
    }
}
```

## PublishSocietyCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Societies.Commands;

public record PublishSocietyCommand(string SocietyId) : IRequest<Result<Society>>;

public class PublishSocietyCommandHandler : IRequestHandler<PublishSocietyCommand, Result<Society>>
{
    private readonly ISocietyRepository _repo;

    public PublishSocietyCommandHandler(ISocietyRepository repo) => _repo = repo;

    public async Task<Result<Society>> Handle(PublishSocietyCommand cmd, CancellationToken ct)
    {
        var society = await _repo.GetByIdAsync(cmd.SocietyId, cmd.SocietyId, ct);
        if (society is null)
            return Result<Society>.Failure("SOCIETY_NOT_FOUND", "Society not found.");

        if (society.Status == "Active")
            return Result<Society>.Failure("SOCIETY_ALREADY_ACTIVE", "Society is already published.");

        society.Status = "Active";
        society.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(society, society.ETag, ct);
        return Result<Society>.Success(society);
    }
}
```

## AssignAdminCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Societies.Commands;

public record AssignAdminCommand(string SocietyId, string UserId) : IRequest<Result<Society>>;

public class AssignAdminCommandHandler : IRequestHandler<AssignAdminCommand, Result<Society>>
{
    private readonly ISocietyRepository _repo;
    private readonly IUserRepository _userRepo;

    public AssignAdminCommandHandler(ISocietyRepository repo, IUserRepository userRepo)
    {
        _repo = repo;
        _userRepo = userRepo;
    }

    public async Task<Result<Society>> Handle(AssignAdminCommand cmd, CancellationToken ct)
    {
        var society = await _repo.GetByIdAsync(cmd.SocietyId, cmd.SocietyId, ct);
        if (society is null)
            return Result<Society>.Failure("SOCIETY_NOT_FOUND", "Society not found.");

        society.AdminUserId = cmd.UserId;
        society.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(society, society.ETag, ct);
        return Result<Society>.Success(society);
    }
}
```

## ConfigureFeeStructureCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Societies.Commands;

public record ConfigureFeeStructureCommand(
    string SocietyId,
    decimal MaintenanceFeeBase,
    string BillingCycle) : IRequest<Result<Society>>;

public class ConfigureFeeStructureCommandHandler : IRequestHandler<ConfigureFeeStructureCommand, Result<Society>>
{
    private readonly ISocietyRepository _repo;

    public ConfigureFeeStructureCommandHandler(ISocietyRepository repo) => _repo = repo;

    public async Task<Result<Society>> Handle(ConfigureFeeStructureCommand cmd, CancellationToken ct)
    {
        var society = await _repo.GetByIdAsync(cmd.SocietyId, cmd.SocietyId, ct);
        if (society is null)
            return Result<Society>.Failure("SOCIETY_NOT_FOUND", "Society not found.");

        society.MaintenanceFeeBase = cmd.MaintenanceFeeBase;
        society.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(society, society.ETag, ct);
        return Result<Society>.Success(society);
    }
}
```

---

# SOCIETIES\QUERIES

## GetSocietyQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Societies.Queries;

public record GetSocietyQuery(string SocietyId) : IRequest<Result<Society>>;

public class GetSocietyQueryHandler : IRequestHandler<GetSocietyQuery, Result<Society>>
{
    private readonly ISocietyRepository _repo;

    public GetSocietyQueryHandler(ISocietyRepository repo) => _repo = repo;

    public async Task<Result<Society>> Handle(GetSocietyQuery query, CancellationToken ct)
    {
        var society = await _repo.GetByIdAsync(query.SocietyId, query.SocietyId, ct);
        return society is null
            ? Result<Society>.Failure("SOCIETY_NOT_FOUND", "Society not found.")
            : Result<Society>.Success(society);
    }
}
```

---

# APARTMENTS\COMMANDS

## CreateApartmentCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Apartments.Commands;

public record CreateApartmentCommand(
    string SocietyId,
    string ApartmentNumber,
    string BlockName,
    int Floor,
    string Type,
    decimal SquareFootage,
    decimal MonthlyMaintenanceFee) : IRequest<Result<Apartment>>;

public class CreateApartmentCommandHandler : IRequestHandler<CreateApartmentCommand, Result<Apartment>>
{
    private readonly IApartmentRepository _repo;

    public CreateApartmentCommandHandler(IApartmentRepository repo) => _repo = repo;

    public async Task<Result<Apartment>> Handle(CreateApartmentCommand cmd, CancellationToken ct)
    {
        var existing = await _repo.GetByNumberAsync(cmd.ApartmentNumber, cmd.SocietyId, ct);
        if (existing is not null)
            return Result<Apartment>.Failure("APARTMENT_DUPLICATE", $"Apartment {cmd.ApartmentNumber} already exists in this society.");

        var apartment = new Apartment
        {
            SocietyId = cmd.SocietyId,
            ApartmentNumber = cmd.ApartmentNumber,
            BlockName = cmd.BlockName,
            Floor = cmd.Floor,
            Type = cmd.Type,
            SquareFootage = cmd.SquareFootage,
            MonthlyMaintenanceFee = cmd.MonthlyMaintenanceFee
        };

        await _repo.AddAsync(apartment, ct);
        return Result<Apartment>.Success(apartment);
    }
}
```

## UpdateApartmentCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Apartments.Commands;

public record UpdateApartmentCommand(
    string SocietyId,
    string ApartmentId,
    string ApartmentNumber,
    string BlockName,
    int Floor,
    string Type,
    decimal SquareFootage,
    decimal MonthlyMaintenanceFee,
    string? OwnerId,
    string? CurrentResidentId) : IRequest<Result<Apartment>>;

public class UpdateApartmentCommandHandler : IRequestHandler<UpdateApartmentCommand, Result<Apartment>>
{
    private readonly IApartmentRepository _repo;

    public UpdateApartmentCommandHandler(IApartmentRepository repo) => _repo = repo;

    public async Task<Result<Apartment>> Handle(UpdateApartmentCommand cmd, CancellationToken ct)
    {
        var apt = await _repo.GetByIdAsync(cmd.ApartmentId, cmd.SocietyId, ct);
        if (apt is null)
            return Result<Apartment>.Failure("APARTMENT_NOT_FOUND", "Apartment not found.");

        apt.ApartmentNumber = cmd.ApartmentNumber;
        apt.BlockName = cmd.BlockName;
        apt.Floor = cmd.Floor;
        apt.Type = cmd.Type;
        apt.SquareFootage = cmd.SquareFootage;
        apt.MonthlyMaintenanceFee = cmd.MonthlyMaintenanceFee;
        apt.OwnerId = cmd.OwnerId;
        apt.CurrentResidentId = cmd.CurrentResidentId;
        apt.UpdatedAt = DateTime.UtcNow;

        await _repo.UpdateAsync(apt, apt.ETag, ct);
        return Result<Apartment>.Success(apt);
    }
}
```

## DeleteApartmentCommand.cs
```csharp
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Apartments.Commands;

public record DeleteApartmentCommand(string SocietyId, string ApartmentId) : IRequest<Result<bool>>;

public class DeleteApartmentCommandHandler : IRequestHandler<DeleteApartmentCommand, Result<bool>>
{
    private readonly IApartmentRepository _repo;

    public DeleteApartmentCommandHandler(IApartmentRepository repo) => _repo = repo;

    public async Task<Result<bool>> Handle(DeleteApartmentCommand cmd, CancellationToken ct)
    {
        var exists = await _repo.ExistsAsync(cmd.ApartmentId, cmd.SocietyId, ct);
        if (!exists)
            return Result<bool>.Failure("APARTMENT_NOT_FOUND", "Apartment not found.");

        await _repo.DeleteAsync(cmd.ApartmentId, cmd.SocietyId, ct);
        return Result<bool>.Success(true);
    }
}
```

## BulkImportApartmentsCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Apartments.Commands;

public record ApartmentImportItem(
    string ApartmentNumber, string BlockName, int Floor,
    string Type, decimal SquareFootage, decimal MonthlyMaintenanceFee);

public record BulkImportApartmentsCommand(string SocietyId, IReadOnlyList<ApartmentImportItem> Apartments) : IRequest<Result<int>>;

public class BulkImportApartmentsCommandHandler : IRequestHandler<BulkImportApartmentsCommand, Result<int>>
{
    private readonly IApartmentRepository _repo;

    public BulkImportApartmentsCommandHandler(IApartmentRepository repo) => _repo = repo;

    public async Task<Result<int>> Handle(BulkImportApartmentsCommand cmd, CancellationToken ct)
    {
        int imported = 0;
        foreach (var item in cmd.Apartments)
        {
            var existing = await _repo.GetByNumberAsync(item.ApartmentNumber, cmd.SocietyId, ct);
            if (existing is not null) continue;

            var apt = new Apartment
            {
                SocietyId = cmd.SocietyId,
                ApartmentNumber = item.ApartmentNumber,
                BlockName = item.BlockName,
                Floor = item.Floor,
                Type = item.Type,
                SquareFootage = item.SquareFootage,
                MonthlyMaintenanceFee = item.MonthlyMaintenanceFee
            };
            await _repo.AddAsync(apt, ct);
            imported++;
        }
        return Result<int>.Success(imported);
    }
}
```

## UpdateApartmentStatusCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Apartments.Commands;

public record UpdateApartmentStatusCommand(string SocietyId, string ApartmentId, string Status) : IRequest<Result<Apartment>>;

public class UpdateApartmentStatusCommandHandler : IRequestHandler<UpdateApartmentStatusCommand, Result<Apartment>>
{
    private readonly IApartmentRepository _repo;

    public UpdateApartmentStatusCommandHandler(IApartmentRepository repo) => _repo = repo;

    public async Task<Result<Apartment>> Handle(UpdateApartmentStatusCommand cmd, CancellationToken ct)
    {
        var apt = await _repo.GetByIdAsync(cmd.ApartmentId, cmd.SocietyId, ct);
        if (apt is null)
            return Result<Apartment>.Failure("APARTMENT_NOT_FOUND", "Apartment not found.");

        apt.Status = cmd.Status;
        apt.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(apt, apt.ETag, ct);
        return Result<Apartment>.Success(apt);
    }
}
```

---

# APARTMENTS\QUERIES

## GetApartmentsQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Apartments.Queries;

public record GetApartmentsQuery(string SocietyId, int Page = 1, int PageSize = 20) : IRequest<Result<PagedResult<Apartment>>>;

public class GetApartmentsQueryHandler : IRequestHandler<GetApartmentsQuery, Result<PagedResult<Apartment>>>
{
    private readonly IApartmentRepository _repo;

    public GetApartmentsQueryHandler(IApartmentRepository repo) => _repo = repo;

    public async Task<Result<PagedResult<Apartment>>> Handle(GetApartmentsQuery query, CancellationToken ct)
    {
        var result = await _repo.GetPagedAsync(
            $"SELECT * FROM c WHERE c.societyId = '{query.SocietyId}'",
            null, query.Page, query.PageSize, ct);
        return Result<PagedResult<Apartment>>.Success(result);
    }
}
```

## GetApartmentQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Apartments.Queries;

public record GetApartmentQuery(string SocietyId, string ApartmentId) : IRequest<Result<Apartment>>;

public class GetApartmentQueryHandler : IRequestHandler<GetApartmentQuery, Result<Apartment>>
{
    private readonly IApartmentRepository _repo;

    public GetApartmentQueryHandler(IApartmentRepository repo) => _repo = repo;

    public async Task<Result<Apartment>> Handle(GetApartmentQuery query, CancellationToken ct)
    {
        var apt = await _repo.GetByIdAsync(query.ApartmentId, query.SocietyId, ct);
        return apt is null
            ? Result<Apartment>.Failure("APARTMENT_NOT_FOUND", "Apartment not found.")
            : Result<Apartment>.Success(apt);
    }
}
```

---

# USERS\COMMANDS

## CreateUserCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Users.Commands;

public record CreateUserCommand(
    string SocietyId,
    string Name,
    string Email,
    string PhoneNumber,
    string Role,
    string? ApartmentId,
    string? ExternalAuthId) : IRequest<Result<User>>;

public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, Result<User>>
{
    private readonly IUserRepository _repo;

    public CreateUserCommandHandler(IUserRepository repo) => _repo = repo;

    public async Task<Result<User>> Handle(CreateUserCommand cmd, CancellationToken ct)
    {
        var existing = await _repo.GetByEmailAsync(cmd.Email, ct);
        if (existing is not null)
            return Result<User>.Failure("USER_DUPLICATE", $"A user with email '{cmd.Email}' already exists.");

        var user = new User
        {
            SocietyId = cmd.SocietyId,
            Name = cmd.Name,
            Email = cmd.Email,
            PhoneNumber = cmd.PhoneNumber,
            Role = cmd.Role,
            ApartmentId = cmd.ApartmentId,
            ExternalAuthId = cmd.ExternalAuthId
        };

        await _repo.AddAsync(user, ct);
        return Result<User>.Success(user);
    }
}
```

## UpdateUserCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Users.Commands;

public record UpdateUserCommand(
    string SocietyId, string UserId, string Name,
    string PhoneNumber, string? ApartmentId) : IRequest<Result<User>>;

public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, Result<User>>
{
    private readonly IUserRepository _repo;

    public UpdateUserCommandHandler(IUserRepository repo) => _repo = repo;

    public async Task<Result<User>> Handle(UpdateUserCommand cmd, CancellationToken ct)
    {
        var user = await _repo.GetByIdAsync(cmd.UserId, cmd.SocietyId, ct);
        if (user is null)
            return Result<User>.Failure("USER_NOT_FOUND", "User not found.");

        user.Name = cmd.Name;
        user.PhoneNumber = cmd.PhoneNumber;
        user.ApartmentId = cmd.ApartmentId;
        user.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(user, user.ETag, ct);
        return Result<User>.Success(user);
    }
}
```

## DeactivateUserCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Users.Commands;

public record DeactivateUserCommand(string SocietyId, string UserId) : IRequest<Result<User>>;

public class DeactivateUserCommandHandler : IRequestHandler<DeactivateUserCommand, Result<User>>
{
    private readonly IUserRepository _repo;

    public DeactivateUserCommandHandler(IUserRepository repo) => _repo = repo;

    public async Task<Result<User>> Handle(DeactivateUserCommand cmd, CancellationToken ct)
    {
        var user = await _repo.GetByIdAsync(cmd.UserId, cmd.SocietyId, ct);
        if (user is null)
            return Result<User>.Failure("USER_NOT_FOUND", "User not found.");

        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(user, user.ETag, ct);
        return Result<User>.Success(user);
    }
}
```

## SendOtpCommand.cs
```csharp
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.Services;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Users.Commands;

public record SendOtpCommand(string SocietyId, string UserId) : IRequest<Result<bool>>;

public class SendOtpCommandHandler : IRequestHandler<SendOtpCommand, Result<bool>>
{
    private readonly IUserRepository _repo;
    private readonly INotificationService _notifications;

    public SendOtpCommandHandler(IUserRepository repo, INotificationService notifications)
    {
        _repo = repo;
        _notifications = notifications;
    }

    public async Task<Result<bool>> Handle(SendOtpCommand cmd, CancellationToken ct)
    {
        var user = await _repo.GetByIdAsync(cmd.UserId, cmd.SocietyId, ct);
        if (user is null)
            return Result<bool>.Failure("USER_NOT_FOUND", "User not found.");

        var otp = Random.Shared.Next(100000, 999999).ToString();
        user.OtpCode = otp;
        user.OtpExpiresAt = DateTime.UtcNow.AddMinutes(10);
        user.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(user, user.ETag, ct);
        await _notifications.SendSmsAsync(user.PhoneNumber, $"Your OTP is {otp}. Valid for 10 minutes.", ct);
        return Result<bool>.Success(true);
    }
}
```

## VerifyOtpCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Users.Commands;

public record VerifyOtpCommand(string SocietyId, string UserId, string Otp) : IRequest<Result<User>>;

public class VerifyOtpCommandHandler : IRequestHandler<VerifyOtpCommand, Result<User>>
{
    private readonly IUserRepository _repo;

    public VerifyOtpCommandHandler(IUserRepository repo) => _repo = repo;

    public async Task<Result<User>> Handle(VerifyOtpCommand cmd, CancellationToken ct)
    {
        var user = await _repo.GetByIdAsync(cmd.UserId, cmd.SocietyId, ct);
        if (user is null)
            return Result<User>.Failure("USER_NOT_FOUND", "User not found.");

        if (user.OtpCode != cmd.Otp || user.OtpExpiresAt < DateTime.UtcNow)
            return Result<User>.Failure("OTP_INVALID", "Invalid or expired OTP.");

        user.OtpCode = null;
        user.OtpExpiresAt = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(user, user.ETag, ct);
        return Result<User>.Success(user);
    }
}
```

## UpdateUserRoleCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Users.Commands;

public record UpdateUserRoleCommand(string SocietyId, string UserId, string Role) : IRequest<Result<User>>;

public class UpdateUserRoleCommandHandler : IRequestHandler<UpdateUserRoleCommand, Result<User>>
{
    private readonly IUserRepository _repo;

    public UpdateUserRoleCommandHandler(IUserRepository repo) => _repo = repo;

    public async Task<Result<User>> Handle(UpdateUserRoleCommand cmd, CancellationToken ct)
    {
        var user = await _repo.GetByIdAsync(cmd.UserId, cmd.SocietyId, ct);
        if (user is null)
            return Result<User>.Failure("USER_NOT_FOUND", "User not found.");

        user.Role = cmd.Role;
        user.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(user, user.ETag, ct);
        return Result<User>.Success(user);
    }
}
```

---

# USERS\QUERIES

## GetUsersQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Users.Queries;

public record GetUsersQuery(string SocietyId, int Page = 1, int PageSize = 20) : IRequest<Result<PagedResult<User>>>;

public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, Result<PagedResult<User>>>
{
    private readonly IUserRepository _repo;

    public GetUsersQueryHandler(IUserRepository repo) => _repo = repo;

    public async Task<Result<PagedResult<User>>> Handle(GetUsersQuery query, CancellationToken ct)
    {
        var result = await _repo.GetPagedAsync(
            $"SELECT * FROM c WHERE c.societyId = '{query.SocietyId}'",
            null, query.Page, query.PageSize, ct);
        return Result<PagedResult<User>>.Success(result);
    }
}
```

## GetUserQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Users.Queries;

public record GetUserQuery(string SocietyId, string UserId) : IRequest<Result<User>>;

public class GetUserQueryHandler : IRequestHandler<GetUserQuery, Result<User>>
{
    private readonly IUserRepository _repo;

    public GetUserQueryHandler(IUserRepository repo) => _repo = repo;

    public async Task<Result<User>> Handle(GetUserQuery query, CancellationToken ct)
    {
        var user = await _repo.GetByIdAsync(query.UserId, query.SocietyId, ct);
        return user is null
            ? Result<User>.Failure("USER_NOT_FOUND", "User not found.")
            : Result<User>.Success(user);
    }
}
```

---

More files in the next document (due to size limits)
