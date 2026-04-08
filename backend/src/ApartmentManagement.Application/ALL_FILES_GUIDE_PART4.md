# ApartmentManagement.Application - FINAL FILES (Part 4)

---

# FEES\COMMANDS

## CreateFeeScheduleCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Fees.Commands;

public record CreateFeeScheduleCommand(
    string SocietyId, string Name, string Description,
    string FeeType, decimal Amount, string BillingCycle, DateTime NextDueDate) : IRequest<Result<FeeSchedule>>;

public class CreateFeeScheduleCommandHandler : IRequestHandler<CreateFeeScheduleCommand, Result<FeeSchedule>>
{
    private readonly IFeeScheduleRepository _repo;

    public CreateFeeScheduleCommandHandler(IFeeScheduleRepository repo) => _repo = repo;

    public async Task<Result<FeeSchedule>> Handle(CreateFeeScheduleCommand cmd, CancellationToken ct)
    {
        var schedule = new FeeSchedule
        {
            SocietyId = cmd.SocietyId,
            Name = cmd.Name,
            Description = cmd.Description,
            FeeType = cmd.FeeType,
            Amount = cmd.Amount,
            BillingCycle = cmd.BillingCycle,
            NextDueDate = cmd.NextDueDate
        };
        await _repo.AddAsync(schedule, ct);
        return Result<FeeSchedule>.Success(schedule);
    }
}
```

## RecordFeePaymentCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Fees.Commands;

public record RecordFeePaymentCommand(
    string SocietyId, string PaymentId,
    string PaymentMethod, string TransactionId, string? Notes) : IRequest<Result<FeePayment>>;

public class RecordFeePaymentCommandHandler : IRequestHandler<RecordFeePaymentCommand, Result<FeePayment>>
{
    private readonly IFeePaymentRepository _repo;

    public RecordFeePaymentCommandHandler(IFeePaymentRepository repo) => _repo = repo;

    public async Task<Result<FeePayment>> Handle(RecordFeePaymentCommand cmd, CancellationToken ct)
    {
        var payment = await _repo.GetByIdAsync(cmd.PaymentId, cmd.SocietyId, ct);
        if (payment is null)
            return Result<FeePayment>.Failure("PAYMENT_NOT_FOUND", "Fee payment not found.");

        payment.Status = "Paid";
        payment.PaidAt = DateTime.UtcNow;
        payment.PaymentMethod = cmd.PaymentMethod;
        payment.TransactionId = cmd.TransactionId;
        payment.Notes = cmd.Notes;
        payment.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(payment, payment.ETag, ct);
        return Result<FeePayment>.Success(payment);
    }
}
```

---

# FEES\QUERIES

## GetFeeSchedulesQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Fees.Queries;

public record GetFeeSchedulesQuery(string SocietyId, int Page = 1, int PageSize = 20) : IRequest<Result<PagedResult<FeeSchedule>>>;

public class GetFeeSchedulesQueryHandler : IRequestHandler<GetFeeSchedulesQuery, Result<PagedResult<FeeSchedule>>>
{
    private readonly IFeeScheduleRepository _repo;

    public GetFeeSchedulesQueryHandler(IFeeScheduleRepository repo) => _repo = repo;

    public async Task<Result<PagedResult<FeeSchedule>>> Handle(GetFeeSchedulesQuery query, CancellationToken ct)
    {
        var result = await _repo.GetPagedAsync(
            $"SELECT * FROM c WHERE c.societyId = '{query.SocietyId}'",
            null, query.Page, query.PageSize, ct);
        return Result<PagedResult<FeeSchedule>>.Success(result);
    }
}
```

## GetApartmentFeesQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Fees.Queries;

public record GetApartmentFeesQuery(string SocietyId, string ApartmentId) : IRequest<Result<IReadOnlyList<FeePayment>>>;

public class GetApartmentFeesQueryHandler : IRequestHandler<GetApartmentFeesQuery, Result<IReadOnlyList<FeePayment>>>
{
    private readonly IFeePaymentRepository _repo;

    public GetApartmentFeesQueryHandler(IFeePaymentRepository repo) => _repo = repo;

    public async Task<Result<IReadOnlyList<FeePayment>>> Handle(GetApartmentFeesQuery query, CancellationToken ct)
    {
        var payments = await _repo.GetByApartmentIdAsync(query.ApartmentId, query.SocietyId, ct);
        return Result<IReadOnlyList<FeePayment>>.Success(payments);
    }
}
```

## GetFeeHistoryQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Fees.Queries;

public record GetFeeHistoryQuery(string SocietyId, string ApartmentId, int Page = 1, int PageSize = 20) : IRequest<Result<PagedResult<FeePayment>>>;

public class GetFeeHistoryQueryHandler : IRequestHandler<GetFeeHistoryQuery, Result<PagedResult<FeePayment>>>
{
    private readonly IFeePaymentRepository _repo;

    public GetFeeHistoryQueryHandler(IFeePaymentRepository repo) => _repo = repo;

    public async Task<Result<PagedResult<FeePayment>>> Handle(GetFeeHistoryQuery query, CancellationToken ct)
    {
        var result = await _repo.GetPagedAsync(
            $"SELECT * FROM c WHERE c.societyId = '{query.SocietyId}' AND c.apartmentId = '{query.ApartmentId}' ORDER BY c.dueDate DESC",
            null, query.Page, query.PageSize, ct);
        return Result<PagedResult<FeePayment>>.Success(result);
    }
}
```

---

# GAMIFICATION\COMMANDS

## CreateCompetitionCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Gamification.Commands;

public record CreateCompetitionCommand(
    string SocietyId, string Title, string Description, string Category,
    DateTime StartDate, DateTime EndDate, int RewardPoints,
    int? MaxParticipants, string CreatedBy) : IRequest<Result<Competition>>;

public class CreateCompetitionCommandHandler : IRequestHandler<CreateCompetitionCommand, Result<Competition>>
{
    private readonly ICompetitionRepository _repo;

    public CreateCompetitionCommandHandler(ICompetitionRepository repo) => _repo = repo;

    public async Task<Result<Competition>> Handle(CreateCompetitionCommand cmd, CancellationToken ct)
    {
        var competition = new Competition
        {
            SocietyId = cmd.SocietyId,
            Title = cmd.Title,
            Description = cmd.Description,
            Category = cmd.Category,
            StartDate = cmd.StartDate,
            EndDate = cmd.EndDate,
            RewardPoints = cmd.RewardPoints,
            MaxParticipants = cmd.MaxParticipants,
            CreatedBy = cmd.CreatedBy
        };
        await _repo.AddAsync(competition, ct);
        return Result<Competition>.Success(competition);
    }
}
```

## RegisterForCompetitionCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Gamification.Commands;

public record RegisterForCompetitionCommand(
    string SocietyId, string CompetitionId, string UserId, string ApartmentId) : IRequest<Result<CompetitionEntry>>;

public class RegisterForCompetitionCommandHandler : IRequestHandler<RegisterForCompetitionCommand, Result<CompetitionEntry>>
{
    private readonly ICompetitionRepository _competitionRepo;
    private readonly ICompetitionEntryRepository _entryRepo;

    public RegisterForCompetitionCommandHandler(ICompetitionRepository competitionRepo, ICompetitionEntryRepository entryRepo)
    {
        _competitionRepo = competitionRepo;
        _entryRepo = entryRepo;
    }

    public async Task<Result<CompetitionEntry>> Handle(RegisterForCompetitionCommand cmd, CancellationToken ct)
    {
        var competition = await _competitionRepo.GetByIdAsync(cmd.CompetitionId, cmd.SocietyId, ct);
        if (competition is null)
            return Result<CompetitionEntry>.Failure("COMPETITION_NOT_FOUND", "Competition not found.");

        var existing = await _entryRepo.GetByUserAndCompetitionAsync(cmd.UserId, cmd.CompetitionId, ct);
        if (existing is not null)
            return Result<CompetitionEntry>.Failure("ALREADY_REGISTERED", "User is already registered for this competition.");

        var entry = new CompetitionEntry
        {
            SocietyId = cmd.SocietyId,
            CompetitionId = cmd.CompetitionId,
            UserId = cmd.UserId,
            ApartmentId = cmd.ApartmentId
        };
        await _entryRepo.AddAsync(entry, ct);
        return Result<CompetitionEntry>.Success(entry);
    }
}
```

## UpdateCompetitionScoreCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Gamification.Commands;

public record UpdateCompetitionScoreCommand(
    string SocietyId, string CompetitionId, string UserId, int Score) : IRequest<Result<CompetitionEntry>>;

public class UpdateCompetitionScoreCommandHandler : IRequestHandler<UpdateCompetitionScoreCommand, Result<CompetitionEntry>>
{
    private readonly ICompetitionEntryRepository _repo;

    public UpdateCompetitionScoreCommandHandler(ICompetitionEntryRepository repo) => _repo = repo;

    public async Task<Result<CompetitionEntry>> Handle(UpdateCompetitionScoreCommand cmd, CancellationToken ct)
    {
        var entry = await _repo.GetByUserAndCompetitionAsync(cmd.UserId, cmd.CompetitionId, ct);
        if (entry is null)
            return Result<CompetitionEntry>.Failure("ENTRY_NOT_FOUND", "Competition entry not found.");

        entry.Score = cmd.Score;
        entry.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(entry, entry.ETag, ct);
        return Result<CompetitionEntry>.Success(entry);
    }
}
```

## AwardPointsCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Gamification.Commands;

public record AwardPointsCommand(
    string SocietyId, string UserId, int Points,
    string Reason, string? ReferenceId, string? ReferenceType) : IRequest<Result<RewardPoints>>;

public class AwardPointsCommandHandler : IRequestHandler<AwardPointsCommand, Result<RewardPoints>>
{
    private readonly IRewardPointsRepository _repo;

    public AwardPointsCommandHandler(IRewardPointsRepository repo) => _repo = repo;

    public async Task<Result<RewardPoints>> Handle(AwardPointsCommand cmd, CancellationToken ct)
    {
        var rewardPoints = new RewardPoints
        {
            SocietyId = cmd.SocietyId,
            UserId = cmd.UserId,
            Points = cmd.Points,
            Reason = cmd.Reason,
            ReferenceId = cmd.ReferenceId,
            ReferenceType = cmd.ReferenceType
        };
        await _repo.AddAsync(rewardPoints, ct);
        return Result<RewardPoints>.Success(rewardPoints);
    }
}
```

---

# GAMIFICATION\QUERIES

## GetCompetitionsQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Gamification.Queries;

public record GetCompetitionsQuery(string SocietyId, int Page = 1, int PageSize = 20) : IRequest<Result<PagedResult<Competition>>>;

public class GetCompetitionsQueryHandler : IRequestHandler<GetCompetitionsQuery, Result<PagedResult<Competition>>>
{
    private readonly ICompetitionRepository _repo;

    public GetCompetitionsQueryHandler(ICompetitionRepository repo) => _repo = repo;

    public async Task<Result<PagedResult<Competition>>> Handle(GetCompetitionsQuery query, CancellationToken ct)
    {
        var result = await _repo.GetPagedAsync(
            $"SELECT * FROM c WHERE c.societyId = '{query.SocietyId}' ORDER BY c.startDate DESC",
            null, query.Page, query.PageSize, ct);
        return Result<PagedResult<Competition>>.Success(result);
    }
}
```

## GetLeaderboardQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Gamification.Queries;

public record GetLeaderboardQuery(string SocietyId, string CompetitionId, int Top = 10) : IRequest<Result<IReadOnlyList<CompetitionEntry>>>;

public class GetLeaderboardQueryHandler : IRequestHandler<GetLeaderboardQuery, Result<IReadOnlyList<CompetitionEntry>>>
{
    private readonly ICompetitionEntryRepository _repo;

    public GetLeaderboardQueryHandler(ICompetitionEntryRepository repo) => _repo = repo;

    public async Task<Result<IReadOnlyList<CompetitionEntry>>> Handle(GetLeaderboardQuery query, CancellationToken ct)
    {
        var entries = await _repo.GetLeaderboardAsync(query.CompetitionId, query.SocietyId, query.Top, ct);
        return Result<IReadOnlyList<CompetitionEntry>>.Success(entries);
    }
}
```

## GetUserPointsQuery.cs
```csharp
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Gamification.Queries;

public record GetUserPointsQuery(string SocietyId, string UserId) : IRequest<Result<int>>;

public class GetUserPointsQueryHandler : IRequestHandler<GetUserPointsQuery, Result<int>>
{
    private readonly IRewardPointsRepository _repo;

    public GetUserPointsQueryHandler(IRewardPointsRepository repo) => _repo = repo;

    public async Task<Result<int>> Handle(GetUserPointsQuery query, CancellationToken ct)
    {
        var total = await _repo.GetTotalPointsAsync(query.UserId, query.SocietyId, ct);
        return Result<int>.Success(total);
    }
}
```

---

# SERVICEPROVIDERS\COMMANDS

## CreateServiceProviderCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.ServiceProviders.Commands;

public record CreateServiceProviderCommand(
    string Name, string Email, string Phone, string CompanyName,
    IReadOnlyList<string> ServiceTypes, string Description,
    string? SocietyId) : IRequest<Result<ServiceProvider>>;

public class CreateServiceProviderCommandHandler : IRequestHandler<CreateServiceProviderCommand, Result<ServiceProvider>>
{
    private readonly IServiceProviderRepository _repo;

    public CreateServiceProviderCommandHandler(IServiceProviderRepository repo) => _repo = repo;

    public async Task<Result<ServiceProvider>> Handle(CreateServiceProviderCommand cmd, CancellationToken ct)
    {
        var provider = new ServiceProvider
        {
            SocietyId = cmd.SocietyId,
            Name = cmd.Name,
            Email = cmd.Email,
            Phone = cmd.Phone,
            CompanyName = cmd.CompanyName,
            ServiceTypes = cmd.ServiceTypes.ToList(),
            Description = cmd.Description
        };
        await _repo.AddAsync(provider, ct);
        return Result<ServiceProvider>.Success(provider);
    }
}
```

## ApproveServiceProviderCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.ServiceProviders.Commands;

public record ApproveServiceProviderCommand(string ProviderId) : IRequest<Result<ServiceProvider>>;

public class ApproveServiceProviderCommandHandler : IRequestHandler<ApproveServiceProviderCommand, Result<ServiceProvider>>
{
    private readonly IServiceProviderRepository _repo;

    public ApproveServiceProviderCommandHandler(IServiceProviderRepository repo) => _repo = repo;

    public async Task<Result<ServiceProvider>> Handle(ApproveServiceProviderCommand cmd, CancellationToken ct)
    {
        var provider = await _repo.GetByIdAsync(cmd.ProviderId, cmd.ProviderId, ct);
        if (provider is null) return Result<ServiceProvider>.Failure("PROVIDER_NOT_FOUND", "Service provider not found.");

        provider.IsApproved = true;
        provider.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(provider, provider.ETag, ct);
        return Result<ServiceProvider>.Success(provider);
    }
}
```

## RejectServiceProviderCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.ServiceProviders.Commands;

public record RejectServiceProviderCommand(string ProviderId) : IRequest<Result<ServiceProvider>>;

public class RejectServiceProviderCommandHandler : IRequestHandler<RejectServiceProviderCommand, Result<ServiceProvider>>
{
    private readonly IServiceProviderRepository _repo;

    public RejectServiceProviderCommandHandler(IServiceProviderRepository repo) => _repo = repo;

    public async Task<Result<ServiceProvider>> Handle(RejectServiceProviderCommand cmd, CancellationToken ct)
    {
        var provider = await _repo.GetByIdAsync(cmd.ProviderId, cmd.ProviderId, ct);
        if (provider is null) return Result<ServiceProvider>.Failure("PROVIDER_NOT_FOUND", "Service provider not found.");

        provider.IsApproved = false;
        provider.IsActive = false;
        provider.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(provider, provider.ETag, ct);
        return Result<ServiceProvider>.Success(provider);
    }
}
```

## CreateServiceRequestCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.ServiceProviders.Commands;

public record CreateServiceRequestCommand(
    string SocietyId, string ApartmentId, string UserId,
    string Category, string Description, DateTime? ScheduledAt) : IRequest<Result<ServiceRequest>>;

public class CreateServiceRequestCommandHandler : IRequestHandler<CreateServiceRequestCommand, Result<ServiceRequest>>
{
    private readonly IServiceRequestRepository _repo;

    public CreateServiceRequestCommandHandler(IServiceRequestRepository repo) => _repo = repo;

    public async Task<Result<ServiceRequest>> Handle(CreateServiceRequestCommand cmd, CancellationToken ct)
    {
        var request = new ServiceRequest
        {
            SocietyId = cmd.SocietyId,
            ApartmentId = cmd.ApartmentId,
            UserId = cmd.UserId,
            Category = cmd.Category,
            Description = cmd.Description,
            ScheduledAt = cmd.ScheduledAt
        };
        await _repo.AddAsync(request, ct);
        return Result<ServiceRequest>.Success(request);
    }
}
```

## AcceptServiceRequestCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.ServiceProviders.Commands;

public record AcceptServiceRequestCommand(string SocietyId, string RequestId, string ProviderId) : IRequest<Result<ServiceRequest>>;

public class AcceptServiceRequestCommandHandler : IRequestHandler<AcceptServiceRequestCommand, Result<ServiceRequest>>
{
    private readonly IServiceRequestRepository _repo;

    public AcceptServiceRequestCommandHandler(IServiceRequestRepository repo) => _repo = repo;

    public async Task<Result<ServiceRequest>> Handle(AcceptServiceRequestCommand cmd, CancellationToken ct)
    {
        var req = await _repo.GetByIdAsync(cmd.RequestId, cmd.SocietyId, ct);
        if (req is null) return Result<ServiceRequest>.Failure("REQUEST_NOT_FOUND", "Service request not found.");

        req.ServiceProviderId = cmd.ProviderId;
        req.Status = "Accepted";
        req.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(req, req.ETag, ct);
        return Result<ServiceRequest>.Success(req);
    }
}
```

## CompleteServiceRequestCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.ServiceProviders.Commands;

public record CompleteServiceRequestCommand(string SocietyId, string RequestId, decimal? Amount) : IRequest<Result<ServiceRequest>>;

public class CompleteServiceRequestCommandHandler : IRequestHandler<CompleteServiceRequestCommand, Result<ServiceRequest>>
{
    private readonly IServiceRequestRepository _repo;

    public CompleteServiceRequestCommandHandler(IServiceRequestRepository repo) => _repo = repo;

    public async Task<Result<ServiceRequest>> Handle(CompleteServiceRequestCommand cmd, CancellationToken ct)
    {
        var req = await _repo.GetByIdAsync(cmd.RequestId, cmd.SocietyId, ct);
        if (req is null) return Result<ServiceRequest>.Failure("REQUEST_NOT_FOUND", "Service request not found.");

        req.Status = "Completed";
        req.CompletedAt = DateTime.UtcNow;
        req.Amount = cmd.Amount;
        req.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(req, req.ETag, ct);
        return Result<ServiceRequest>.Success(req);
    }
}
```

## ReviewServiceRequestCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.ServiceProviders.Commands;

public record ReviewServiceRequestCommand(
    string SocietyId, string RequestId, int Rating, string? Review) : IRequest<Result<ServiceRequest>>;

public class ReviewServiceRequestCommandHandler : IRequestHandler<ReviewServiceRequestCommand, Result<ServiceRequest>>
{
    private readonly IServiceRequestRepository _repo;

    public ReviewServiceRequestCommandHandler(IServiceRequestRepository repo) => _repo = repo;

    public async Task<Result<ServiceRequest>> Handle(ReviewServiceRequestCommand cmd, CancellationToken ct)
    {
        var req = await _repo.GetByIdAsync(cmd.RequestId, cmd.SocietyId, ct);
        if (req is null) return Result<ServiceRequest>.Failure("REQUEST_NOT_FOUND", "Service request not found.");

        req.Rating = cmd.Rating;
        req.Review = cmd.Review;
        req.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(req, req.ETag, ct);
        return Result<ServiceRequest>.Success(req);
    }
}
```

---

# SERVICEPROVIDERS\QUERIES

## GetServiceProvidersQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.ServiceProviders.Queries;

public record GetServiceProvidersQuery(string? SocietyId, int Page = 1, int PageSize = 20) : IRequest<Result<PagedResult<ServiceProvider>>>;

public class GetServiceProvidersQueryHandler : IRequestHandler<GetServiceProvidersQuery, Result<PagedResult<ServiceProvider>>>
{
    private readonly IServiceProviderRepository _repo;

    public GetServiceProvidersQueryHandler(IServiceProviderRepository repo) => _repo = repo;

    public async Task<Result<PagedResult<ServiceProvider>>> Handle(GetServiceProvidersQuery query, CancellationToken ct)
    {
        var result = await _repo.GetPagedAsync(
            "SELECT * FROM c WHERE c.isApproved = true AND c.isActive = true",
            null, query.Page, query.PageSize, ct);
        return Result<PagedResult<ServiceProvider>>.Success(result);
    }
}
```

## GetServiceRequestsQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.ServiceProviders.Queries;

public record GetServiceRequestsQuery(string SocietyId, int Page = 1, int PageSize = 20) : IRequest<Result<PagedResult<ServiceRequest>>>;

public class GetServiceRequestsQueryHandler : IRequestHandler<GetServiceRequestsQuery, Result<PagedResult<ServiceRequest>>>
{
    private readonly IServiceRequestRepository _repo;

    public GetServiceRequestsQueryHandler(IServiceRequestRepository repo) => _repo = repo;

    public async Task<Result<PagedResult<ServiceRequest>>> Handle(GetServiceRequestsQuery query, CancellationToken ct)
    {
        var result = await _repo.GetPagedAsync(
            $"SELECT * FROM c WHERE c.societyId = '{query.SocietyId}' ORDER BY c.createdAt DESC",
            null, query.Page, query.PageSize, ct);
        return Result<PagedResult<ServiceRequest>>.Success(result);
    }
}
```

---

# DependencyInjection.cs (ROOT OF APPLICATION FOLDER)

```csharp
using ApartmentManagement.Application.Common.Behaviors;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace ApartmentManagement.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly);
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
            cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(AuthorizationBehavior<,>));
        });
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        return services;
    }
}
```

---

## SUMMARY

You now have complete file contents for all 68 C# classes organized in 4 markdown files:
- ALL_FILES_GUIDE.md (Parts: Common, Societies, Apartments, Users)
- ALL_FILES_GUIDE_PART2.md (Parts: Amenities, Complaints)
- ALL_FILES_GUIDE_PART3.md (Parts: Notices, Visitors)
- ALL_FILES_GUIDE_PART4.md (Parts: Fees, Gamification, ServiceProviders, + DependencyInjection)

All files are ready to copy-paste into Visual Studio.
