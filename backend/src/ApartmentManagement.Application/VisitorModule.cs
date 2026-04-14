using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Application.Commands.Visitor
{

// ─── Register Visitor ─────────────────────────────────────────────────────────

public record RegisterVisitorCommand(
    string SocietyId, string VisitorName, string Phone, string? Email,
    string Purpose, string HostApartmentId, string HostUserId, string? VehicleNumber)
    : IRequest<Result<VisitorResponse>>;

public sealed class RegisterVisitorCommandHandler(
    IVisitorLogRepository visitorRepository,
    INotificationService notificationService,
    IQrCodeService qrCodeService,
    IEventPublisher eventPublisher,
    ILogger<RegisterVisitorCommandHandler> logger)
    : IRequestHandler<RegisterVisitorCommand, Result<VisitorResponse>>
{
    public async Task<Result<VisitorResponse>> Handle(RegisterVisitorCommand request, CancellationToken ct)
    {
        try
        {
            var log = VisitorLog.Create(
                request.SocietyId, request.VisitorName, request.Phone, request.Email,
                request.Purpose, request.HostApartmentId, request.HostUserId, request.VehicleNumber);

            var qrData = await qrCodeService.GenerateQrCodeBase64Async(log.PassCode, ct);
            log.UpdateQrCode(qrData);

            var created = await visitorRepository.CreateAsync(log, ct);

            foreach (var evt in created.DomainEvents)
                await eventPublisher.PublishAsync((dynamic)evt, ct);
            created.ClearDomainEvents();

            await notificationService.SendPushNotificationAsync(request.HostUserId,
                "Visitor Request",
                $"{request.VisitorName} is requesting entry. Pass code: {created.PassCode}", ct);

            return Result<VisitorResponse>.Success(created.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to register visitor {Name}", request.VisitorName);
            return Result<VisitorResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Approve Visitor ──────────────────────────────────────────────────────────

public record ApproveVisitorCommand(string SocietyId, string VisitorLogId, string UserId) : IRequest<Result<bool>>;

public sealed class ApproveVisitorCommandHandler(
    IVisitorLogRepository visitorRepository,
    ICurrentUserService currentUser,
    ILogger<ApproveVisitorCommandHandler> logger)
    : IRequestHandler<ApproveVisitorCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ApproveVisitorCommand request, CancellationToken ct)
    {
        try
        {
            var log = await visitorRepository.GetByIdAsync(request.VisitorLogId, request.SocietyId, ct)
                ?? throw new NotFoundException("VisitorLog", request.VisitorLogId);

            bool isHost = log.HostUserId == request.UserId;
            bool isAdmin = currentUser.IsInRoles("SUAdmin", "HQAdmin");
            if (!isHost && !isAdmin)
                throw new ForbiddenException("Only the host or an admin can approve a visitor.");

            log.Approve();
            await visitorRepository.UpdateAsync(log, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.VisitorNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<bool>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to approve visitor {VisitorLogId}", request.VisitorLogId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Deny Visitor ─────────────────────────────────────────────────────────────

public record DenyVisitorCommand(string SocietyId, string VisitorLogId, string UserId) : IRequest<Result<bool>>;

public sealed class DenyVisitorCommandHandler(
    IVisitorLogRepository visitorRepository,
    ICurrentUserService currentUser,
    ILogger<DenyVisitorCommandHandler> logger)
    : IRequestHandler<DenyVisitorCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DenyVisitorCommand request, CancellationToken ct)
    {
        try
        {
            var log = await visitorRepository.GetByIdAsync(request.VisitorLogId, request.SocietyId, ct)
                ?? throw new NotFoundException("VisitorLog", request.VisitorLogId);

            bool isHost = log.HostUserId == request.UserId;
            bool isAdmin = currentUser.IsInRoles("SUAdmin", "HQAdmin");
            if (!isHost && !isAdmin)
                throw new ForbiddenException("Only the host or an admin can deny a visitor.");

            log.Deny();
            await visitorRepository.UpdateAsync(log, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.VisitorNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<bool>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to deny visitor {VisitorLogId}", request.VisitorLogId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Check In Visitor ─────────────────────────────────────────────────────────

public record CheckInVisitorCommand(string SocietyId, string VisitorLogId, string PassCode) : IRequest<Result<bool>>;

public sealed class CheckInVisitorCommandHandler(
    IVisitorLogRepository visitorRepository,
    ILogger<CheckInVisitorCommandHandler> logger)
    : IRequestHandler<CheckInVisitorCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(CheckInVisitorCommand request, CancellationToken ct)
    {
        try
        {
            var log = await visitorRepository.GetByIdAsync(request.VisitorLogId, request.SocietyId, ct)
                ?? throw new NotFoundException("VisitorLog", request.VisitorLogId);

            if (log.PassCode != request.PassCode)
                return Result<bool>.Failure(ErrorCodes.InvalidPassCode, "Invalid pass code.");

            if (log.Status != Domain.Enums.VisitorStatus.Approved)
                return Result<bool>.Failure(ErrorCodes.VisitorNotApproved, "Visitor must be approved before check-in.");

            log.CheckIn();
            await visitorRepository.UpdateAsync(log, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.VisitorNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to check in visitor {VisitorLogId}", request.VisitorLogId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Check Out Visitor ────────────────────────────────────────────────────────

public record CheckOutVisitorCommand(string SocietyId, string VisitorLogId) : IRequest<Result<bool>>;

public sealed class CheckOutVisitorCommandHandler(
    IVisitorLogRepository visitorRepository,
    ILogger<CheckOutVisitorCommandHandler> logger)
    : IRequestHandler<CheckOutVisitorCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(CheckOutVisitorCommand request, CancellationToken ct)
    {
        try
        {
            var log = await visitorRepository.GetByIdAsync(request.VisitorLogId, request.SocietyId, ct)
                ?? throw new NotFoundException("VisitorLog", request.VisitorLogId);

            log.CheckOut();
            await visitorRepository.UpdateAsync(log, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.VisitorNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to check out visitor {VisitorLogId}", request.VisitorLogId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

}

namespace ApartmentManagement.Application.Queries.Visitor
{

public record GetVisitorLogQuery(string SocietyId, string VisitorLogId) : IRequest<Result<VisitorResponse>>;

public sealed class GetVisitorLogQueryHandler(IVisitorLogRepository visitorRepository)
    : IRequestHandler<GetVisitorLogQuery, Result<VisitorResponse>>
{
    public async Task<Result<VisitorResponse>> Handle(GetVisitorLogQuery request, CancellationToken ct)
    {
        try
        {
            var log = await visitorRepository.GetByIdAsync(request.VisitorLogId, request.SocietyId, ct)
                ?? throw new NotFoundException("VisitorLog", request.VisitorLogId);
            return Result<VisitorResponse>.Success(log.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.VisitorNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetVisitorsBySocietyQuery(string SocietyId, DateOnly? Date, PaginationParams Pagination)
    : IRequest<Result<PagedResult<VisitorResponse>>>;

public sealed class GetVisitorsBySocietyQueryHandler(IVisitorLogRepository visitorRepository)
    : IRequestHandler<GetVisitorsBySocietyQuery, Result<PagedResult<VisitorResponse>>>
{
    public async Task<Result<PagedResult<VisitorResponse>>> Handle(GetVisitorsBySocietyQuery request, CancellationToken ct)
    {
        try
        {
            var all = await visitorRepository.GetAllAsync(request.SocietyId, ct);
            var filtered = request.Date.HasValue
                ? all.Where(v => DateOnly.FromDateTime(v.CreatedAt) == request.Date.Value).ToList()
                : all.ToList();
            var items = filtered.Select(v => v.ToResponse()).ToList();
            return Result<PagedResult<VisitorResponse>>.Success(
                new PagedResult<VisitorResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<VisitorResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetVisitorsByApartmentQuery(string SocietyId, string ApartmentId, PaginationParams Pagination)
    : IRequest<Result<PagedResult<VisitorResponse>>>;

public sealed class GetVisitorsByApartmentQueryHandler(IVisitorLogRepository visitorRepository)
    : IRequestHandler<GetVisitorsByApartmentQuery, Result<PagedResult<VisitorResponse>>>
{
    public async Task<Result<PagedResult<VisitorResponse>>> Handle(GetVisitorsByApartmentQuery request, CancellationToken ct)
    {
        try
        {
            var logs = await visitorRepository.GetByApartmentAsync(
                request.SocietyId, request.ApartmentId,
                request.Pagination.Page, request.Pagination.PageSize, ct);
            var items = logs.Select(v => v.ToResponse()).ToList();
            return Result<PagedResult<VisitorResponse>>.Success(
                new PagedResult<VisitorResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<VisitorResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetActiveVisitorsQuery(string SocietyId) : IRequest<Result<IReadOnlyList<VisitorResponse>>>;

public sealed class GetActiveVisitorsQueryHandler(IVisitorLogRepository visitorRepository)
    : IRequestHandler<GetActiveVisitorsQuery, Result<IReadOnlyList<VisitorResponse>>>
{
    public async Task<Result<IReadOnlyList<VisitorResponse>>> Handle(GetActiveVisitorsQuery request, CancellationToken ct)
    {
        try
        {
            var active = await visitorRepository.GetActiveVisitorsAsync(request.SocietyId, ct);
            var items = active.Select(v => v.ToResponse()).ToList();
            return Result<IReadOnlyList<VisitorResponse>>.Success(items);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<VisitorResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
}