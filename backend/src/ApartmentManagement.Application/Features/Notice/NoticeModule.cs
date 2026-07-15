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
using System.Text.Json.Serialization;

namespace ApartmentManagement.Application.Commands.Notice
{

// ─── Create Notice ────────────────────────────────────────────────────────────

public record CreateNoticeCommand(
    string SocietyId, string UserId, string Title, string Content,
    [property: JsonConverter(typeof(JsonStringEnumConverter))]
    NoticeCategory Category, 
    DateTime PublishAt, DateTime? ExpiresAt, List<string> TargetApartmentIds)
    : IRequest<Result<NoticeResponse>>;

public sealed class CreateNoticeCommandHandler(
    INoticeRepository noticeRepository,
    INotificationService notificationService,
    IEventPublisher eventPublisher,
    ILogger<CreateNoticeCommandHandler> logger)
    : IRequestHandler<CreateNoticeCommand, Result<NoticeResponse>>
{
    public async Task<Result<NoticeResponse>> Handle(CreateNoticeCommand request, CancellationToken ct)
    {
        try
        {
            var notice = Domain.Entities.Notice.Create(
                request.SocietyId, request.UserId, request.Title, request.Content,
                request.Category, request.PublishAt, request.ExpiresAt, request.TargetApartmentIds);

            var created = await noticeRepository.CreateAsync(notice, ct);

            foreach (var evt in created.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            created.ClearDomainEvents();

            return Result<NoticeResponse>.Success(created.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create notice for society {SocietyId}", request.SocietyId);
            return Result<NoticeResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Update Notice ────────────────────────────────────────────────────────────

public record UpdateNoticeCommand(string SocietyId, string NoticeId, string Title, string Content, DateTime? ExpiresAt)
    : IRequest<Result<NoticeResponse>>;

public sealed class UpdateNoticeCommandHandler(
    INoticeRepository noticeRepository,
    ICurrentUserService currentUser,
    ILogger<UpdateNoticeCommandHandler> logger)
    : IRequestHandler<UpdateNoticeCommand, Result<NoticeResponse>>
{
    public async Task<Result<NoticeResponse>> Handle(UpdateNoticeCommand request, CancellationToken ct)
    {
        try
        {
            if (!currentUser.IsInRoles("SUAdmin", "HQAdmin"))
                return Result<NoticeResponse>.Failure(ErrorCodes.Forbidden, "Only society admins can edit notices.");

            var notice = await noticeRepository.GetByIdAsync(request.NoticeId, request.SocietyId, ct)
                ?? throw new NotFoundException("Notice", request.NoticeId);

            notice.UpdateContent(request.Title, request.Content, request.ExpiresAt);
            var updated = await noticeRepository.UpdateAsync(notice, ct);
            return Result<NoticeResponse>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<NoticeResponse>.Failure(ErrorCodes.NoticeNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update notice {NoticeId}", request.NoticeId);
            return Result<NoticeResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Archive Notice ───────────────────────────────────────────────────────────

public record ArchiveNoticeCommand(string SocietyId, string NoticeId) : IRequest<Result<bool>>;

public sealed class ArchiveNoticeCommandHandler(
    INoticeRepository noticeRepository,
    ILogger<ArchiveNoticeCommandHandler> logger)
    : IRequestHandler<ArchiveNoticeCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ArchiveNoticeCommand request, CancellationToken ct)
    {
        try
        {
            var notice = await noticeRepository.GetByIdAsync(request.NoticeId, request.SocietyId, ct)
                ?? throw new NotFoundException("Notice", request.NoticeId);

            notice.Archive();
            await noticeRepository.UpdateAsync(notice, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.NoticeNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to archive notice {NoticeId}", request.NoticeId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Mark Notice Read ─────────────────────────────────────────────────────────
// One-way: once a notice is marked read, it cannot be marked unread again.

public record MarkNoticeReadCommand(string SocietyId, string NoticeId, string UserId) : IRequest<Result<bool>>;

public sealed class MarkNoticeReadCommandHandler(
    INoticeRepository noticeRepository,
    ILogger<MarkNoticeReadCommandHandler> logger)
    : IRequestHandler<MarkNoticeReadCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(MarkNoticeReadCommand request, CancellationToken ct)
    {
        try
        {
            var notice = await noticeRepository.GetByIdAsync(request.NoticeId, request.SocietyId, ct)
                ?? throw new NotFoundException("Notice", request.NoticeId);

            notice.MarkAsRead(request.UserId);

            await noticeRepository.UpdateAsync(notice, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.NoticeNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to mark notice {NoticeId} read status for user {UserId}", request.NoticeId, request.UserId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Delete Notice ────────────────────────────────────────────────────────────

public record DeleteNoticeCommand(string SocietyId, string NoticeId) : IRequest<Result<bool>>;

public sealed class DeleteNoticeCommandHandler(
    INoticeRepository noticeRepository,
    ILogger<DeleteNoticeCommandHandler> logger)
    : IRequestHandler<DeleteNoticeCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DeleteNoticeCommand request, CancellationToken ct)
    {
        try
        {
            var exists = await noticeRepository.ExistsAsync(request.NoticeId, request.SocietyId, ct);
            if (!exists)
                throw new NotFoundException("Notice", request.NoticeId);

            await noticeRepository.DeleteAsync(request.NoticeId, request.SocietyId, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.NoticeNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete notice {NoticeId}", request.NoticeId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

}

namespace ApartmentManagement.Application.Queries.Notice
{

/// <summary>
/// Resolves poster user ids to full names so clients never have to display a raw user id.
/// Unresolvable ids (deleted users, seeded data) fall back to null and clients show "Unknown".
/// </summary>
internal static class NoticePosterNameResolver
{
    public static async Task<string?> ResolveAsync(
        string societyId, string postedByUserId, IUserRepository userRepository, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(postedByUserId))
            return null;
        var user = await userRepository.GetByIdAsync(postedByUserId, societyId, ct);
        return user?.FullName;
    }

    public static async Task<IReadOnlyDictionary<string, string>> ResolveManyAsync(
        string societyId, IEnumerable<string> postedByUserIds, IUserRepository userRepository, CancellationToken ct)
    {
        var names = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var userId in postedByUserIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var user = await userRepository.GetByIdAsync(userId, societyId, ct);
            if (user is not null)
                names[userId] = user.FullName;
        }
        return names;
    }
}

public record GetNoticeQuery(string SocietyId, string NoticeId, string? CurrentUserId = null) : IRequest<Result<NoticeResponse>>;

public sealed class GetNoticeQueryHandler(INoticeRepository noticeRepository, IUserRepository userRepository)
    : IRequestHandler<GetNoticeQuery, Result<NoticeResponse>>
{
    public async Task<Result<NoticeResponse>> Handle(GetNoticeQuery request, CancellationToken ct)
    {
        try
        {
            var notice = await noticeRepository.GetByIdAsync(request.NoticeId, request.SocietyId, ct)
                ?? throw new NotFoundException("Notice", request.NoticeId);
            var postedByName = await NoticePosterNameResolver.ResolveAsync(request.SocietyId, notice.PostedByUserId, userRepository, ct);
            return Result<NoticeResponse>.Success(notice.ToResponse(request.CurrentUserId, postedByName));
        }
        catch (NotFoundException ex)
        {
            return Result<NoticeResponse>.Failure(ErrorCodes.NoticeNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<NoticeResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetActiveNoticesQuery(string SocietyId, NoticeCategory? Category, PaginationParams Pagination, string? CurrentUserId = null)
    : IRequest<Result<PagedResult<NoticeResponse>>>;

public sealed class GetActiveNoticesQueryHandler(INoticeRepository noticeRepository, IUserRepository userRepository)
    : IRequestHandler<GetActiveNoticesQuery, Result<PagedResult<NoticeResponse>>>
{
    public async Task<Result<PagedResult<NoticeResponse>>> Handle(GetActiveNoticesQuery request, CancellationToken ct)
    {
        try
        {
            var active = await noticeRepository.GetActiveAsync(
                request.SocietyId, request.Pagination.Page, request.Pagination.PageSize, ct);

            var filtered = request.Category.HasValue
                ? active.Where(n => n.Category == request.Category.Value).ToList()
                : active.ToList();

            var posterNames = await NoticePosterNameResolver.ResolveManyAsync(
                request.SocietyId, filtered.Select(n => n.PostedByUserId), userRepository, ct);
            var items = filtered
                .Select(n => n.ToResponse(request.CurrentUserId, posterNames.GetValueOrDefault(n.PostedByUserId)))
                .ToList();
            return Result<PagedResult<NoticeResponse>>.Success(
                new PagedResult<NoticeResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<NoticeResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetArchivedNoticesQuery(string SocietyId, PaginationParams Pagination, string? CurrentUserId = null)
    : IRequest<Result<PagedResult<NoticeResponse>>>;

public sealed class GetArchivedNoticesQueryHandler(INoticeRepository noticeRepository, IUserRepository userRepository)
    : IRequestHandler<GetArchivedNoticesQuery, Result<PagedResult<NoticeResponse>>>
{
    public async Task<Result<PagedResult<NoticeResponse>>> Handle(GetArchivedNoticesQuery request, CancellationToken ct)
    {
        try
        {
            var all = await noticeRepository.GetAllAsync(request.SocietyId, ct);
            var archived = all.Where(n => n.IsArchived).ToList();
            var posterNames = await NoticePosterNameResolver.ResolveManyAsync(
                request.SocietyId, archived.Select(n => n.PostedByUserId), userRepository, ct);
            var items = archived
                .Select(n => n.ToResponse(request.CurrentUserId, posterNames.GetValueOrDefault(n.PostedByUserId)))
                .ToList();
            return Result<PagedResult<NoticeResponse>>.Success(
                new PagedResult<NoticeResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<NoticeResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetNoticeReadReceiptsQuery(string SocietyId, string NoticeId) : IRequest<Result<NoticeReadReceiptsResponse>>;

public sealed class GetNoticeReadReceiptsQueryHandler(
    INoticeRepository noticeRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUser)
    : IRequestHandler<GetNoticeReadReceiptsQuery, Result<NoticeReadReceiptsResponse>>
{
    public async Task<Result<NoticeReadReceiptsResponse>> Handle(GetNoticeReadReceiptsQuery request, CancellationToken ct)
    {
        try
        {
            if (!currentUser.IsInRoles("SUAdmin", "HQAdmin"))
                return Result<NoticeReadReceiptsResponse>.Failure(ErrorCodes.Forbidden, "Only society admins can view notice read receipts.");

            var notice = await noticeRepository.GetByIdAsync(request.NoticeId, request.SocietyId, ct)
                ?? throw new NotFoundException("Notice", request.NoticeId);

            var allUsers = await userRepository.GetAllAsync(request.SocietyId, ct);
            var residents = allUsers.Where(u => u.Role == UserRole.SUUser).ToList();

            // A notice targeting specific apartments only concerns residents of those apartments;
            // an untargeted (society-wide) notice concerns every resident.
            var targeted = notice.TargetApartmentIds.Count == 0
                ? residents
                : residents.Where(u =>
                    (u.ApartmentId is not null && notice.TargetApartmentIds.Contains(u.ApartmentId, StringComparer.OrdinalIgnoreCase)) ||
                    u.Apartments.Any(a => notice.TargetApartmentIds.Contains(a.ApartmentId, StringComparer.OrdinalIgnoreCase)))
                    .ToList();

            var read = targeted.Where(u => notice.IsReadByUser(u.Id))
                .Select(u => new NoticeReadReceiptEntry(u.Id, u.FullName)).ToList();
            var unread = targeted.Where(u => !notice.IsReadByUser(u.Id))
                .Select(u => new NoticeReadReceiptEntry(u.Id, u.FullName)).ToList();

            return Result<NoticeReadReceiptsResponse>.Success(new NoticeReadReceiptsResponse(read, unread));
        }
        catch (NotFoundException ex)
        {
            return Result<NoticeReadReceiptsResponse>.Failure(ErrorCodes.NoticeNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<NoticeReadReceiptsResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
}

namespace ApartmentManagement.Application.Commands.Notice
{
public record ArchiveExpiredNoticesCommand() : IRequest<Result<int>>;

public sealed class ArchiveExpiredNoticesCommandHandler(ILogger<ArchiveExpiredNoticesCommandHandler> logger)
    : IRequestHandler<ArchiveExpiredNoticesCommand, Result<int>>
{
    public Task<Result<int>> Handle(ArchiveExpiredNoticesCommand request, CancellationToken ct)
    {
        logger.LogInformation("ArchiveExpiredNotices: batch notice archival scheduled");
        return Task.FromResult(Result<int>.Success(0));
    }
}
}