# ApartmentManagement.Application - REMAINING FILES (Part 3)

Continue from Part 2 (ALL_FILES_GUIDE_PART2.md)

---

# NOTICES\COMMANDS

## CreateNoticeCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.Services;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Notices.Commands;

public record CreateNoticeCommand(
    string SocietyId, string Title, string Content, string Category,
    string PostedByUserId, DateTime? ExpiresAt) : IRequest<Result<Notice>>;

public class CreateNoticeCommandHandler : IRequestHandler<CreateNoticeCommand, Result<Notice>>
{
    private readonly INoticeRepository _repo;
    private readonly IEventPublisher _events;

    public CreateNoticeCommandHandler(INoticeRepository repo, IEventPublisher events)
    {
        _repo = repo;
        _events = events;
    }

    public async Task<Result<Notice>> Handle(CreateNoticeCommand cmd, CancellationToken ct)
    {
        var notice = new Notice
        {
            SocietyId = cmd.SocietyId,
            Title = cmd.Title,
            Content = cmd.Content,
            Category = cmd.Category,
            PostedByUserId = cmd.PostedByUserId,
            ExpiresAt = cmd.ExpiresAt
        };
        await _repo.AddAsync(notice, ct);
        await _events.PublishAsync(new NoticePostedEvent(cmd.SocietyId, notice.Id, notice.Title, notice.Category), ct);
        return Result<Notice>.Success(notice);
    }
}
```

## UpdateNoticeCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Notices.Commands;

public record UpdateNoticeCommand(
    string SocietyId, string NoticeId, string Title,
    string Content, string Category, DateTime? ExpiresAt) : IRequest<Result<Notice>>;

public class UpdateNoticeCommandHandler : IRequestHandler<UpdateNoticeCommand, Result<Notice>>
{
    private readonly INoticeRepository _repo;

    public UpdateNoticeCommandHandler(INoticeRepository repo) => _repo = repo;

    public async Task<Result<Notice>> Handle(UpdateNoticeCommand cmd, CancellationToken ct)
    {
        var notice = await _repo.GetByIdAsync(cmd.NoticeId, cmd.SocietyId, ct);
        if (notice is null)
            return Result<Notice>.Failure("NOTICE_NOT_FOUND", "Notice not found.");

        notice.Title = cmd.Title;
        notice.Content = cmd.Content;
        notice.Category = cmd.Category;
        notice.ExpiresAt = cmd.ExpiresAt;
        notice.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(notice, notice.ETag, ct);
        return Result<Notice>.Success(notice);
    }
}
```

## DeleteNoticeCommand.cs
```csharp
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Notices.Commands;

public record DeleteNoticeCommand(string SocietyId, string NoticeId) : IRequest<Result<bool>>;

public class DeleteNoticeCommandHandler : IRequestHandler<DeleteNoticeCommand, Result<bool>>
{
    private readonly INoticeRepository _repo;

    public DeleteNoticeCommandHandler(INoticeRepository repo) => _repo = repo;

    public async Task<Result<bool>> Handle(DeleteNoticeCommand cmd, CancellationToken ct)
    {
        var exists = await _repo.ExistsAsync(cmd.NoticeId, cmd.SocietyId, ct);
        if (!exists) return Result<bool>.Failure("NOTICE_NOT_FOUND", "Notice not found.");
        await _repo.DeleteAsync(cmd.NoticeId, cmd.SocietyId, ct);
        return Result<bool>.Success(true);
    }
}
```

## ArchiveNoticeCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Notices.Commands;

public record ArchiveNoticeCommand(string SocietyId, string NoticeId) : IRequest<Result<Notice>>;

public class ArchiveNoticeCommandHandler : IRequestHandler<ArchiveNoticeCommand, Result<Notice>>
{
    private readonly INoticeRepository _repo;

    public ArchiveNoticeCommandHandler(INoticeRepository repo) => _repo = repo;

    public async Task<Result<Notice>> Handle(ArchiveNoticeCommand cmd, CancellationToken ct)
    {
        var notice = await _repo.GetByIdAsync(cmd.NoticeId, cmd.SocietyId, ct);
        if (notice is null)
            return Result<Notice>.Failure("NOTICE_NOT_FOUND", "Notice not found.");

        notice.IsArchived = true;
        notice.ArchivedAt = DateTime.UtcNow;
        notice.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(notice, notice.ETag, ct);
        return Result<Notice>.Success(notice);
    }
}
```

---

# NOTICES\QUERIES

## GetNoticesQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Notices.Queries;

public record GetNoticesQuery(string SocietyId, int Page = 1, int PageSize = 20) : IRequest<Result<PagedResult<Notice>>>;

public class GetNoticesQueryHandler : IRequestHandler<GetNoticesQuery, Result<PagedResult<Notice>>>
{
    private readonly INoticeRepository _repo;

    public GetNoticesQueryHandler(INoticeRepository repo) => _repo = repo;

    public async Task<Result<PagedResult<Notice>>> Handle(GetNoticesQuery query, CancellationToken ct)
    {
        var result = await _repo.GetPagedAsync(
            $"SELECT * FROM c WHERE c.societyId = '{query.SocietyId}' AND c.isArchived = false ORDER BY c.createdAt DESC",
            null, query.Page, query.PageSize, ct);
        return Result<PagedResult<Notice>>.Success(result);
    }
}
```

## GetNoticeQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Notices.Queries;

public record GetNoticeQuery(string SocietyId, string NoticeId) : IRequest<Result<Notice>>;

public class GetNoticeQueryHandler : IRequestHandler<GetNoticeQuery, Result<Notice>>
{
    private readonly INoticeRepository _repo;

    public GetNoticeQueryHandler(INoticeRepository repo) => _repo = repo;

    public async Task<Result<Notice>> Handle(GetNoticeQuery query, CancellationToken ct)
    {
        var notice = await _repo.GetByIdAsync(query.NoticeId, query.SocietyId, ct);
        return notice is null
            ? Result<Notice>.Failure("NOTICE_NOT_FOUND", "Notice not found.")
            : Result<Notice>.Success(notice);
    }
}
```

## GetArchivedNoticesQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Notices.Queries;

public record GetArchivedNoticesQuery(string SocietyId, int Page = 1, int PageSize = 20) : IRequest<Result<PagedResult<Notice>>>;

public class GetArchivedNoticesQueryHandler : IRequestHandler<GetArchivedNoticesQuery, Result<PagedResult<Notice>>>
{
    private readonly INoticeRepository _repo;

    public GetArchivedNoticesQueryHandler(INoticeRepository repo) => _repo = repo;

    public async Task<Result<PagedResult<Notice>>> Handle(GetArchivedNoticesQuery query, CancellationToken ct)
    {
        var result = await _repo.GetPagedAsync(
            $"SELECT * FROM c WHERE c.societyId = '{query.SocietyId}' AND c.isArchived = true",
            null, query.Page, query.PageSize, ct);
        return Result<PagedResult<Notice>>.Success(result);
    }
}
```

---

# VISITORS\COMMANDS

## CreateVisitorLogCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.Services;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Visitors.Commands;

public record CreateVisitorLogCommand(
    string SocietyId, string VisitorName, string VisitorPhone, string Purpose,
    string HostUserId, string HostApartmentId, string? VehicleNumber) : IRequest<Result<VisitorLog>>;

public class CreateVisitorLogCommandHandler : IRequestHandler<CreateVisitorLogCommand, Result<VisitorLog>>
{
    private readonly IVisitorLogRepository _repo;
    private readonly IQrCodeService _qrCode;

    public CreateVisitorLogCommandHandler(IVisitorLogRepository repo, IQrCodeService qrCode)
    {
        _repo = repo;
        _qrCode = qrCode;
    }

    public async Task<Result<VisitorLog>> Handle(CreateVisitorLogCommand cmd, CancellationToken ct)
    {
        var passCode = Guid.NewGuid().ToString("N")[..8].ToUpper();
        var log = new VisitorLog
        {
            SocietyId = cmd.SocietyId,
            VisitorName = cmd.VisitorName,
            VisitorPhone = cmd.VisitorPhone,
            Purpose = cmd.Purpose,
            HostUserId = cmd.HostUserId,
            HostApartmentId = cmd.HostApartmentId,
            VehicleNumber = cmd.VehicleNumber,
            PassCode = passCode
        };
        await _repo.AddAsync(log, ct);
        return Result<VisitorLog>.Success(log);
    }
}
```

## ApproveVisitorCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.Services;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Visitors.Commands;

public record ApproveVisitorCommand(string SocietyId, string VisitorId) : IRequest<Result<VisitorLog>>;

public class ApproveVisitorCommandHandler : IRequestHandler<ApproveVisitorCommand, Result<VisitorLog>>
{
    private readonly IVisitorLogRepository _repo;
    private readonly IEventPublisher _events;

    public ApproveVisitorCommandHandler(IVisitorLogRepository repo, IEventPublisher events)
    {
        _repo = repo;
        _events = events;
    }

    public async Task<Result<VisitorLog>> Handle(ApproveVisitorCommand cmd, CancellationToken ct)
    {
        var log = await _repo.GetByIdAsync(cmd.VisitorId, cmd.SocietyId, ct);
        if (log is null) return Result<VisitorLog>.Failure("VISITOR_NOT_FOUND", "Visitor log not found.");

        log.Status = "Approved";
        log.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(log, log.ETag, ct);
        await _events.PublishAsync(new VisitorArrivedEvent(cmd.SocietyId, log.Id, log.HostUserId, log.VisitorName), ct);
        return Result<VisitorLog>.Success(log);
    }
}
```

## DenyVisitorCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Visitors.Commands;

public record DenyVisitorCommand(string SocietyId, string VisitorId) : IRequest<Result<VisitorLog>>;

public class DenyVisitorCommandHandler : IRequestHandler<DenyVisitorCommand, Result<VisitorLog>>
{
    private readonly IVisitorLogRepository _repo;

    public DenyVisitorCommandHandler(IVisitorLogRepository repo) => _repo = repo;

    public async Task<Result<VisitorLog>> Handle(DenyVisitorCommand cmd, CancellationToken ct)
    {
        var log = await _repo.GetByIdAsync(cmd.VisitorId, cmd.SocietyId, ct);
        if (log is null) return Result<VisitorLog>.Failure("VISITOR_NOT_FOUND", "Visitor log not found.");

        log.Status = "Denied";
        log.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(log, log.ETag, ct);
        return Result<VisitorLog>.Success(log);
    }
}
```

## CheckInVisitorCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Visitors.Commands;

public record CheckInVisitorCommand(string SocietyId, string VisitorId) : IRequest<Result<VisitorLog>>;

public class CheckInVisitorCommandHandler : IRequestHandler<CheckInVisitorCommand, Result<VisitorLog>>
{
    private readonly IVisitorLogRepository _repo;

    public CheckInVisitorCommandHandler(IVisitorLogRepository repo) => _repo = repo;

    public async Task<Result<VisitorLog>> Handle(CheckInVisitorCommand cmd, CancellationToken ct)
    {
        var log = await _repo.GetByIdAsync(cmd.VisitorId, cmd.SocietyId, ct);
        if (log is null) return Result<VisitorLog>.Failure("VISITOR_NOT_FOUND", "Visitor log not found.");
        if (log.Status != "Approved") return Result<VisitorLog>.Failure("VISITOR_NOT_APPROVED", "Visitor must be approved before check-in.");

        log.Status = "CheckedIn";
        log.CheckInTime = DateTime.UtcNow;
        log.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(log, log.ETag, ct);
        return Result<VisitorLog>.Success(log);
    }
}
```

## CheckOutVisitorCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Visitors.Commands;

public record CheckOutVisitorCommand(string SocietyId, string VisitorId) : IRequest<Result<VisitorLog>>;

public class CheckOutVisitorCommandHandler : IRequestHandler<CheckOutVisitorCommand, Result<VisitorLog>>
{
    private readonly IVisitorLogRepository _repo;

    public CheckOutVisitorCommandHandler(IVisitorLogRepository repo) => _repo = repo;

    public async Task<Result<VisitorLog>> Handle(CheckOutVisitorCommand cmd, CancellationToken ct)
    {
        var log = await _repo.GetByIdAsync(cmd.VisitorId, cmd.SocietyId, ct);
        if (log is null) return Result<VisitorLog>.Failure("VISITOR_NOT_FOUND", "Visitor log not found.");

        log.Status = "CheckedOut";
        log.CheckOutTime = DateTime.UtcNow;
        log.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(log, log.ETag, ct);
        return Result<VisitorLog>.Success(log);
    }
}
```

---

# VISITORS\QUERIES

## GetVisitorLogsQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Visitors.Queries;

public record GetVisitorLogsQuery(string SocietyId, int Page = 1, int PageSize = 20) : IRequest<Result<PagedResult<VisitorLog>>>;

public class GetVisitorLogsQueryHandler : IRequestHandler<GetVisitorLogsQuery, Result<PagedResult<VisitorLog>>>
{
    private readonly IVisitorLogRepository _repo;

    public GetVisitorLogsQueryHandler(IVisitorLogRepository repo) => _repo = repo;

    public async Task<Result<PagedResult<VisitorLog>>> Handle(GetVisitorLogsQuery query, CancellationToken ct)
    {
        var result = await _repo.GetPagedAsync(
            $"SELECT * FROM c WHERE c.societyId = '{query.SocietyId}' ORDER BY c.createdAt DESC",
            null, query.Page, query.PageSize, ct);
        return Result<PagedResult<VisitorLog>>.Success(result);
    }
}
```

## GetVisitorLogQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Visitors.Queries;

public record GetVisitorLogQuery(string SocietyId, string VisitorId) : IRequest<Result<VisitorLog>>;

public class GetVisitorLogQueryHandler : IRequestHandler<GetVisitorLogQuery, Result<VisitorLog>>
{
    private readonly IVisitorLogRepository _repo;

    public GetVisitorLogQueryHandler(IVisitorLogRepository repo) => _repo = repo;

    public async Task<Result<VisitorLog>> Handle(GetVisitorLogQuery query, CancellationToken ct)
    {
        var log = await _repo.GetByIdAsync(query.VisitorId, query.SocietyId, ct);
        return log is null
            ? Result<VisitorLog>.Failure("VISITOR_NOT_FOUND", "Visitor log not found.")
            : Result<VisitorLog>.Success(log);
    }
}
```

## GetActiveVisitorsQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Visitors.Queries;

public record GetActiveVisitorsQuery(string SocietyId) : IRequest<Result<IReadOnlyList<VisitorLog>>>;

public class GetActiveVisitorsQueryHandler : IRequestHandler<GetActiveVisitorsQuery, Result<IReadOnlyList<VisitorLog>>>
{
    private readonly IVisitorLogRepository _repo;

    public GetActiveVisitorsQueryHandler(IVisitorLogRepository repo) => _repo = repo;

    public async Task<Result<IReadOnlyList<VisitorLog>>> Handle(GetActiveVisitorsQuery query, CancellationToken ct)
    {
        var logs = await _repo.GetActiveVisitorsAsync(query.SocietyId, ct);
        return Result<IReadOnlyList<VisitorLog>>.Success(logs);
    }
}
```

---

See Part 4 for Fees, Gamification, ServiceProviders, and DependencyInjection...
