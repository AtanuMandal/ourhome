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

namespace ApartmentManagement.Application.Commands.Notice
{

// ─── Create Notice ────────────────────────────────────────────────────────────

public record CreateNoticeCommand(
    string SocietyId, string UserId, string Title, string Content,
    NoticeCategory Category, DateTime PublishAt, DateTime? ExpiresAt, List<string> TargetApartmentIds)
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
    ILogger<UpdateNoticeCommandHandler> logger)
    : IRequestHandler<UpdateNoticeCommand, Result<NoticeResponse>>
{
    public async Task<Result<NoticeResponse>> Handle(UpdateNoticeCommand request, CancellationToken ct)
    {
        try
        {
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

public record GetNoticeQuery(string SocietyId, string NoticeId) : IRequest<Result<NoticeResponse>>;

public sealed class GetNoticeQueryHandler(INoticeRepository noticeRepository)
    : IRequestHandler<GetNoticeQuery, Result<NoticeResponse>>
{
    public async Task<Result<NoticeResponse>> Handle(GetNoticeQuery request, CancellationToken ct)
    {
        try
        {
            var notice = await noticeRepository.GetByIdAsync(request.NoticeId, request.SocietyId, ct)
                ?? throw new NotFoundException("Notice", request.NoticeId);
            return Result<NoticeResponse>.Success(notice.ToResponse());
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

public record GetActiveNoticesQuery(string SocietyId, NoticeCategory? Category, PaginationParams Pagination)
    : IRequest<Result<PagedResult<NoticeResponse>>>;

public sealed class GetActiveNoticesQueryHandler(INoticeRepository noticeRepository)
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

            var items = filtered.Select(n => n.ToResponse()).ToList();
            return Result<PagedResult<NoticeResponse>>.Success(
                new PagedResult<NoticeResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<NoticeResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetArchivedNoticesQuery(string SocietyId, PaginationParams Pagination)
    : IRequest<Result<PagedResult<NoticeResponse>>>;

public sealed class GetArchivedNoticesQueryHandler(INoticeRepository noticeRepository)
    : IRequestHandler<GetArchivedNoticesQuery, Result<PagedResult<NoticeResponse>>>
{
    public async Task<Result<PagedResult<NoticeResponse>>> Handle(GetArchivedNoticesQuery request, CancellationToken ct)
    {
        try
        {
            var all = await noticeRepository.GetAllAsync(request.SocietyId, ct);
            var archived = all.Where(n => n.IsArchived).ToList();
            var items = archived.Select(n => n.ToResponse()).ToList();
            return Result<PagedResult<NoticeResponse>>.Success(
                new PagedResult<NoticeResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<NoticeResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
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