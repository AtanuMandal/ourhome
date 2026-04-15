using ApartmentManagement.Application.DTOs.Visitor;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;
using DomainApartment = ApartmentManagement.Domain.Entities.Apartment;
using DomainUser = ApartmentManagement.Domain.Entities.User;

namespace ApartmentManagement.Application.Commands.Visitor
{

public record RegisterVisitorCommand(
    string SocietyId,
    string VisitorName,
    string Phone,
    string? Email,
    string Purpose,
    string? HostApartmentId,
    string? HostUserId,
    string? VehicleNumber)
    : IRequest<Result<VisitorResponse>>;

public sealed class RegisterVisitorCommandHandler(
    IVisitorLogRepository visitorRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    INotificationService notificationService,
    IQrCodeService qrCodeService,
    IEventPublisher eventPublisher,
    ICurrentUserService currentUser,
    ILogger<RegisterVisitorCommandHandler> logger)
    : IRequestHandler<RegisterVisitorCommand, Result<VisitorResponse>>
{
    public async Task<Result<VisitorResponse>> Handle(RegisterVisitorCommand request, CancellationToken ct)
    {
        try
        {
            var apartment = await ResolveApartmentAsync(apartmentRepository, request.SocietyId, request.HostApartmentId, ct);
            var hostUser = await ResolveHostUserAsync(userRepository, request.SocietyId, request.HostUserId, apartment, ct);

            var requiresApproval = !string.IsNullOrWhiteSpace(hostUser?.Id)
                && !string.Equals(hostUser.Id, currentUser.UserId, StringComparison.OrdinalIgnoreCase);

            var log = VisitorLog.Create(
                request.SocietyId,
                request.VisitorName,
                request.Phone,
                request.Email,
                request.Purpose,
                apartment?.Id,
                hostUser?.Id,
                currentUser.UserId,
                requiresApproval,
                request.VehicleNumber);

            var qrData = await qrCodeService.GenerateQrCodeBase64Async(log.PassCode, ct);
            log.UpdateQrCode(qrData);

            var created = await visitorRepository.CreateAsync(log, ct);

            foreach (var evt in created.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            created.ClearDomainEvents();

            if (requiresApproval && hostUser is not null)
            {
                await notificationService.SendPushNotificationAsync(
                    hostUser.Id,
                    "Visitor approval required",
                    $"{request.VisitorName} is waiting for approval for apartment {apartment?.ApartmentNumber ?? "General visit"}.",
                    ct);
            }

            return Result<VisitorResponse>.Success(ApartmentManagement.Application.Queries.Visitor.VisitorResponseFactory.Create(created, apartment, hostUser, currentUser));
        }
        catch (NotFoundException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.NotFound, ex.Message);
        }
        catch (ValidationException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to register visitor {Name}", request.VisitorName);
            return Result<VisitorResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }

    private static async Task<DomainApartment?> ResolveApartmentAsync(
        IApartmentRepository apartmentRepository,
        string societyId,
        string? apartmentId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(apartmentId))
            return null;

        return await apartmentRepository.GetByIdAsync(apartmentId, societyId, ct)
            ?? throw new NotFoundException("Apartment", apartmentId);
    }

    private static async Task<DomainUser?> ResolveHostUserAsync(
        IUserRepository userRepository,
        string societyId,
        string? hostUserId,
        DomainApartment? apartment,
        CancellationToken ct)
    {
        var resolvedUserId = string.IsNullOrWhiteSpace(hostUserId)
            ? apartment?.GetResident(ResidentType.Tenant)?.UserId
                ?? apartment?.GetResident(ResidentType.Owner)?.UserId
                ?? apartment?.GetResidentsForRead().FirstOrDefault()?.UserId
            : hostUserId;

        if (string.IsNullOrWhiteSpace(resolvedUserId))
            return null;

        return await userRepository.GetByIdAsync(resolvedUserId, societyId, ct)
            ?? throw new NotFoundException("User", resolvedUserId);
    }
}

public record ApproveVisitorCommand(string SocietyId, string VisitorLogId) : IRequest<Result<VisitorResponse>>;

public sealed class ApproveVisitorCommandHandler(
    IVisitorLogRepository visitorRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUser,
    ILogger<ApproveVisitorCommandHandler> logger)
    : IRequestHandler<ApproveVisitorCommand, Result<VisitorResponse>>
{
    public async Task<Result<VisitorResponse>> Handle(ApproveVisitorCommand request, CancellationToken ct)
    {
        try
        {
            var log = await visitorRepository.GetByIdAsync(request.VisitorLogId, request.SocietyId, ct)
                ?? throw new NotFoundException("VisitorLog", request.VisitorLogId);

            VisitorCommandAccess.EnsureHostOrAdmin(log, currentUser);

            log.Approve();
            var updated = await visitorRepository.UpdateAsync(log, ct);
            var apartment = await VisitorCommandAccess.LoadApartmentAsync(apartmentRepository, updated, ct);
            var hostUser = await VisitorCommandAccess.LoadHostUserAsync(userRepository, updated, ct);
            return Result<VisitorResponse>.Success(ApartmentManagement.Application.Queries.Visitor.VisitorResponseFactory.Create(updated, apartment, hostUser, currentUser));
        }
        catch (NotFoundException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.VisitorNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to approve visitor {VisitorLogId}", request.VisitorLogId);
            return Result<VisitorResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record DenyVisitorCommand(string SocietyId, string VisitorLogId) : IRequest<Result<VisitorResponse>>;

public sealed class DenyVisitorCommandHandler(
    IVisitorLogRepository visitorRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUser,
    ILogger<DenyVisitorCommandHandler> logger)
    : IRequestHandler<DenyVisitorCommand, Result<VisitorResponse>>
{
    public async Task<Result<VisitorResponse>> Handle(DenyVisitorCommand request, CancellationToken ct)
    {
        try
        {
            var log = await visitorRepository.GetByIdAsync(request.VisitorLogId, request.SocietyId, ct)
                ?? throw new NotFoundException("VisitorLog", request.VisitorLogId);

            VisitorCommandAccess.EnsureHostOrAdmin(log, currentUser);

            log.Deny();
            var updated = await visitorRepository.UpdateAsync(log, ct);
            var apartment = await VisitorCommandAccess.LoadApartmentAsync(apartmentRepository, updated, ct);
            var hostUser = await VisitorCommandAccess.LoadHostUserAsync(userRepository, updated, ct);
            return Result<VisitorResponse>.Success(ApartmentManagement.Application.Queries.Visitor.VisitorResponseFactory.Create(updated, apartment, hostUser, currentUser));
        }
        catch (NotFoundException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.VisitorNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to deny visitor {VisitorLogId}", request.VisitorLogId);
            return Result<VisitorResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record CheckInVisitorCommand(string SocietyId, string VisitorLogId, string? PassCode = null) : IRequest<Result<VisitorResponse>>;

public sealed class CheckInVisitorCommandHandler(
    IVisitorLogRepository visitorRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUser,
    ILogger<CheckInVisitorCommandHandler> logger)
    : IRequestHandler<CheckInVisitorCommand, Result<VisitorResponse>>
{
    public async Task<Result<VisitorResponse>> Handle(CheckInVisitorCommand request, CancellationToken ct)
    {
        try
        {
            var log = await visitorRepository.GetByIdAsync(request.VisitorLogId, request.SocietyId, ct)
                ?? throw new NotFoundException("VisitorLog", request.VisitorLogId);

            if (!VisitorCommandAccess.HasHostOrAdminAccess(log, currentUser))
            {
                if (string.IsNullOrWhiteSpace(request.PassCode) || !string.Equals(log.PassCode, request.PassCode, StringComparison.Ordinal))
                    return Result<VisitorResponse>.Failure(ErrorCodes.InvalidPassCode, "Invalid pass code.");
            }

            if (log.Status != VisitorStatus.Approved)
                return Result<VisitorResponse>.Failure(ErrorCodes.VisitorNotApproved, "Visitor must be approved before check-in.");

            log.CheckIn();
            var updated = await visitorRepository.UpdateAsync(log, ct);
            var apartment = await VisitorCommandAccess.LoadApartmentAsync(apartmentRepository, updated, ct);
            var hostUser = await VisitorCommandAccess.LoadHostUserAsync(userRepository, updated, ct);
            return Result<VisitorResponse>.Success(ApartmentManagement.Application.Queries.Visitor.VisitorResponseFactory.Create(updated, apartment, hostUser, currentUser));
        }
        catch (NotFoundException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.VisitorNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to check in visitor {VisitorLogId}", request.VisitorLogId);
            return Result<VisitorResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record CheckOutVisitorCommand(string SocietyId, string VisitorLogId) : IRequest<Result<VisitorResponse>>;

public sealed class CheckOutVisitorCommandHandler(
    IVisitorLogRepository visitorRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUser,
    ILogger<CheckOutVisitorCommandHandler> logger)
    : IRequestHandler<CheckOutVisitorCommand, Result<VisitorResponse>>
{
    public async Task<Result<VisitorResponse>> Handle(CheckOutVisitorCommand request, CancellationToken ct)
    {
        try
        {
            var log = await visitorRepository.GetByIdAsync(request.VisitorLogId, request.SocietyId, ct)
                ?? throw new NotFoundException("VisitorLog", request.VisitorLogId);

            VisitorCommandAccess.EnsureHostOrAdmin(log, currentUser);

            log.CheckOut();
            var updated = await visitorRepository.UpdateAsync(log, ct);
            var apartment = await VisitorCommandAccess.LoadApartmentAsync(apartmentRepository, updated, ct);
            var hostUser = await VisitorCommandAccess.LoadHostUserAsync(userRepository, updated, ct);
            return Result<VisitorResponse>.Success(ApartmentManagement.Application.Queries.Visitor.VisitorResponseFactory.Create(updated, apartment, hostUser, currentUser));
        }
        catch (NotFoundException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.VisitorNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to check out visitor {VisitorLogId}", request.VisitorLogId);
            return Result<VisitorResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

internal static class VisitorCommandAccess
{
    public static void EnsureHostOrAdmin(VisitorLog log, ICurrentUserService currentUser)
    {
        if (!HasHostOrAdminAccess(log, currentUser))
            throw new ForbiddenException("Only the host resident or an admin can perform this action.");
    }

    public static bool HasHostOrAdminAccess(VisitorLog log, ICurrentUserService currentUser)
    {
        var isHost = !string.IsNullOrWhiteSpace(log.HostUserId)
            && string.Equals(log.HostUserId, currentUser.UserId, StringComparison.OrdinalIgnoreCase);
        var isAdmin = currentUser.IsInRoles(UserRole.SUAdmin.ToString(), UserRole.HQAdmin.ToString());
        return isHost || isAdmin;
    }

    public static async Task<DomainApartment?> LoadApartmentAsync(IApartmentRepository apartmentRepository, VisitorLog log, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(log.HostApartmentId))
            return null;

        return await apartmentRepository.GetByIdAsync(log.HostApartmentId, log.SocietyId, ct);
    }

    public static async Task<DomainUser?> LoadHostUserAsync(IUserRepository userRepository, VisitorLog log, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(log.HostUserId))
            return null;

        return await userRepository.GetByIdAsync(log.HostUserId, log.SocietyId, ct);
    }
}
}

namespace ApartmentManagement.Application.Queries.Visitor
{
using static ApartmentManagement.Application.Commands.Visitor.VisitorCommandAccess;

public record GetVisitorLogQuery(string SocietyId, string VisitorLogId) : IRequest<Result<VisitorResponse>>;

public sealed class GetVisitorLogQueryHandler(
    IVisitorLogRepository visitorRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUser)
    : IRequestHandler<GetVisitorLogQuery, Result<VisitorResponse>>
{
    public async Task<Result<VisitorResponse>> Handle(GetVisitorLogQuery request, CancellationToken ct)
    {
        try
        {
            var log = await visitorRepository.GetByIdAsync(request.VisitorLogId, request.SocietyId, ct)
                ?? throw new NotFoundException("VisitorLog", request.VisitorLogId);
            var apartment = await LoadApartmentAsync(apartmentRepository, log, ct);
            var hostUser = await LoadHostUserAsync(userRepository, log, ct);
            return Result<VisitorResponse>.Success(VisitorResponseFactory.Create(log, apartment, hostUser, currentUser));
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

public record GetVisitorsBySocietyQuery(
    string SocietyId,
    DateOnly? FromDate,
    DateOnly? ToDate,
    string? ApartmentId,
    string? VisitorName,
    string? Status,
    PaginationParams Pagination)
    : IRequest<Result<PagedResult<VisitorResponse>>>;

public sealed class GetVisitorsBySocietyQueryHandler(
    IVisitorLogRepository visitorRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUser)
    : IRequestHandler<GetVisitorsBySocietyQuery, Result<PagedResult<VisitorResponse>>>
{
    public async Task<Result<PagedResult<VisitorResponse>>> Handle(GetVisitorsBySocietyQuery request, CancellationToken ct)
    {
        return await VisitorQueryHelpers.SearchAsync(
            visitorRepository,
            apartmentRepository,
            userRepository,
            currentUser,
            request.SocietyId,
            request.FromDate,
            request.ToDate,
            request.ApartmentId,
            request.VisitorName,
            request.Status,
            null,
            request.Pagination,
            ct);
    }
}

public record GetMyVisitorsQuery(
    string SocietyId,
    DateOnly? FromDate,
    DateOnly? ToDate,
    string? ApartmentId,
    string? VisitorName,
    string? Status,
    PaginationParams Pagination)
    : IRequest<Result<PagedResult<VisitorResponse>>>;

public sealed class GetMyVisitorsQueryHandler(
    IVisitorLogRepository visitorRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUser)
    : IRequestHandler<GetMyVisitorsQuery, Result<PagedResult<VisitorResponse>>>
{
    public async Task<Result<PagedResult<VisitorResponse>>> Handle(GetMyVisitorsQuery request, CancellationToken ct)
    {
        return await VisitorQueryHelpers.SearchAsync(
            visitorRepository,
            apartmentRepository,
            userRepository,
            currentUser,
            request.SocietyId,
            request.FromDate,
            request.ToDate,
            request.ApartmentId,
            request.VisitorName,
            request.Status,
            log => string.Equals(log.HostUserId, currentUser.UserId, StringComparison.OrdinalIgnoreCase)
                || string.Equals(log.RegisteredByUserId, currentUser.UserId, StringComparison.OrdinalIgnoreCase),
            request.Pagination,
            ct);
    }
}

public record GetPendingVisitorApprovalsQuery(string SocietyId, PaginationParams Pagination)
    : IRequest<Result<PagedResult<VisitorResponse>>>;

public sealed class GetPendingVisitorApprovalsQueryHandler(
    IVisitorLogRepository visitorRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUser)
    : IRequestHandler<GetPendingVisitorApprovalsQuery, Result<PagedResult<VisitorResponse>>>
{
    public async Task<Result<PagedResult<VisitorResponse>>> Handle(GetPendingVisitorApprovalsQuery request, CancellationToken ct)
    {
        return await VisitorQueryHelpers.SearchAsync(
            visitorRepository,
            apartmentRepository,
            userRepository,
            currentUser,
            request.SocietyId,
            null,
            null,
            null,
            null,
            VisitorStatus.Pending.ToString(),
            log => string.Equals(log.HostUserId, currentUser.UserId, StringComparison.OrdinalIgnoreCase),
            request.Pagination,
            ct);
    }
}

internal static class VisitorQueryHelpers
{
    public static async Task<Result<PagedResult<VisitorResponse>>> SearchAsync(
        IVisitorLogRepository visitorRepository,
        IApartmentRepository apartmentRepository,
        IUserRepository userRepository,
        ICurrentUserService currentUser,
        string societyId,
        DateOnly? fromDate,
        DateOnly? toDate,
        string? apartmentId,
        string? visitorName,
        string? status,
        Func<VisitorLog, bool>? extraFilter,
        PaginationParams pagination,
        CancellationToken ct)
    {
        try
        {
            var logs = (await visitorRepository.GetAllAsync(societyId, ct)).AsEnumerable();

            if (fromDate.HasValue)
                logs = logs.Where(log => DateOnly.FromDateTime(log.CheckInTime ?? log.CreatedAt) >= fromDate.Value);
            if (toDate.HasValue)
                logs = logs.Where(log => DateOnly.FromDateTime(log.CheckInTime ?? log.CreatedAt) <= toDate.Value);
            if (!string.IsNullOrWhiteSpace(apartmentId))
                logs = logs.Where(log => string.Equals(log.HostApartmentId, apartmentId, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(visitorName))
                logs = logs.Where(log => log.VisitorName.Contains(visitorName, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<VisitorStatus>(status, true, out var parsedStatus))
                logs = logs.Where(log => log.Status == parsedStatus);
            if (extraFilter is not null)
                logs = logs.Where(extraFilter);

            var ordered = logs
                .OrderByDescending(log => log.CheckInTime ?? log.CreatedAt)
                .ThenByDescending(log => log.CreatedAt)
                .ToList();

            var paged = ordered
                .Skip((pagination.Page - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToList();

            var apartments = (await apartmentRepository.GetAllAsync(societyId, ct)).ToDictionary(apartment => apartment.Id);
            var users = (await userRepository.GetAllAsync(societyId, ct)).ToDictionary(user => user.Id);

            var items = paged
                .Select(log =>
                {
                    apartments.TryGetValue(log.HostApartmentId ?? string.Empty, out var apartment);
                    users.TryGetValue(log.HostUserId ?? string.Empty, out var hostUser);
                    return VisitorResponseFactory.Create(log, apartment, hostUser, currentUser);
                })
                .ToList();

            return Result<PagedResult<VisitorResponse>>.Success(
                new PagedResult<VisitorResponse>(items, ordered.Count, pagination.Page, pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<VisitorResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

internal static class VisitorResponseFactory
{
    public static VisitorResponse Create(
        VisitorLog log,
        DomainApartment? apartment,
        DomainUser? hostUser,
        ICurrentUserService currentUser)
    {
        var isHost = !string.IsNullOrWhiteSpace(log.HostUserId)
            && string.Equals(log.HostUserId, currentUser.UserId, StringComparison.OrdinalIgnoreCase);
        var isAdmin = currentUser.IsInRoles(UserRole.SUAdmin.ToString(), UserRole.HQAdmin.ToString());

        return new VisitorResponse(
            log.Id,
            log.SocietyId,
            log.VisitorName,
            log.VisitorPhone,
            log.VisitorEmail,
            log.Purpose,
            log.HostApartmentId,
            apartment?.ApartmentNumber,
            log.HostUserId,
            hostUser?.FullName,
            log.Status.ToString(),
            log.QrCode,
            log.PassCode,
            log.VehicleNumber,
            log.RegisteredByUserId,
            log.RequiresApproval,
            log.Status == VisitorStatus.Pending && (isHost || isAdmin),
            log.Status == VisitorStatus.Approved && (isHost || isAdmin),
            log.Status == VisitorStatus.CheckedIn && (isHost || isAdmin),
            log.CheckInTime,
            log.CheckOutTime,
            log.Duration?.TotalMinutes,
            log.CreatedAt);
    }
}
}
