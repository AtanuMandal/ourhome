using System.Text;
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
using IO = System.IO;

namespace ApartmentManagement.Application.Commands.Visitor
{

public record RegisterVisitorCommand(
    string SocietyId,
    string VisitorName,
    string Phone,
    string? Email,
    string Purpose,
    string ApartmentId,
    string? CompanyName,
    string? VehicleNumber,
    bool IsPreApproved,
    int? ValidityHours = null,
    string? VisitorImageUrl = null) : IRequest<Result<VisitorResponse>>;

public sealed class RegisterVisitorCommandHandler(
    IVisitorLogRepository visitorRepository,
    IApartmentRepository apartmentRepository,
    INotificationService notificationService,
    ICurrentUserService currentUser,
    IQrCodeService qrCodeService,
    IEventPublisher eventPublisher,
    ILogger<RegisterVisitorCommandHandler> logger)
    : IRequestHandler<RegisterVisitorCommand, Result<VisitorResponse>>
{
    public async Task<Result<VisitorResponse>> Handle(RegisterVisitorCommand request, CancellationToken ct)
    {
        try
        {
            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct);
            if (apartment is null)
                return Result<VisitorResponse>.Failure(ErrorCodes.ApartmentNotFound, "Apartment not found.");

            var residents = apartment.GetResidentsForRead();
            if (residents.Count == 0)
                return Result<VisitorResponse>.Failure(ErrorCodes.ValidationFailed, "The selected apartment has no resident assigned.");

            var isResidentHost = residents.Any(resident =>
                string.Equals(resident.UserId, currentUser.UserId, StringComparison.OrdinalIgnoreCase));
            if (request.IsPreApproved && !isResidentHost)
                return Result<VisitorResponse>.Failure(ErrorCodes.Forbidden, "Only a resident of the apartment can pre-approve a visitor.");

            var hostResident = ResolveHostResident(residents, isResidentHost ? currentUser.UserId : null);
            DateTime? validUntil = (request.IsPreApproved && request.ValidityHours.HasValue && request.ValidityHours.Value > 0)
                ? DateTime.UtcNow.AddHours(request.ValidityHours.Value)
                : null;

            var log = VisitorLog.Create(
                request.SocietyId,
                request.VisitorName,
                request.Phone,
                request.Email,
                request.CompanyName,
                request.Purpose,
                apartment.Id,
                hostResident.UserId,
                hostResident.UserName,
                apartment.BlockName,
                apartment.FloorNumber,
                apartment.ApartmentNumber,
                request.IsPreApproved,
                request.VehicleNumber,
                validUntil,
                request.VisitorImageUrl);

            var qrData = await qrCodeService.GenerateQrCodeBase64Async(log.PassCode, ct);
            log.UpdateQrCode(qrData);

            var created = await visitorRepository.CreateAsync(log, ct);

            foreach (var evt in created.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            created.ClearDomainEvents();

            if (!request.IsPreApproved)
            {
                var notificationBody = string.IsNullOrWhiteSpace(request.Phone)
                    ? $"{request.VisitorName} is at flat {apartment.BlockName} {apartment.ApartmentNumber} and awaiting your approval."
                    : $"{request.VisitorName} ({request.Phone}) is at flat {apartment.BlockName} {apartment.ApartmentNumber} and awaiting your approval.";

                var notificationData = new Dictionary<string, string>
                {
                    ["societyId"]      = request.SocietyId,
                    ["visitorId"]      = created.Id,
                    ["action"]         = "visitor-approval",
                    ["approveUrl"]     = $"/visitors?action=approve&id={created.Id}",
                    ["denyUrl"]        = $"/visitors?action=deny&id={created.Id}",
                    ["visitorPhone"]   = request.Phone ?? string.Empty,
                    ["visitorImageUrl"]= request.VisitorImageUrl ?? string.Empty
                };

                foreach (var resident in residents)
                {
                    await notificationService.SendPushNotificationAsync(
                        resident.UserId,
                        "Visitor Request",
                        notificationBody,
                        ct,
                        notificationData);
                }
            }

            return Result<VisitorResponse>.Success(created.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to register visitor {Name}", request.VisitorName);
            return Result<VisitorResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }

    private static global::ApartmentManagement.Domain.Entities.Apartment.ResidentSummary ResolveHostResident(
        IReadOnlyList<global::ApartmentManagement.Domain.Entities.Apartment.ResidentSummary> residents,
        string? preferredUserId)
    {
        if (!string.IsNullOrWhiteSpace(preferredUserId))
        {
            var exactResident = residents.FirstOrDefault(resident =>
                string.Equals(resident.UserId, preferredUserId, StringComparison.OrdinalIgnoreCase));
            if (exactResident is not null)
                return exactResident;
        }

        return residents.FirstOrDefault(resident => resident.ResidentType == ResidentType.Owner)
            ?? residents.FirstOrDefault(resident => resident.ResidentType == ResidentType.Tenant)
            ?? residents[0];
    }
}

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

public record CheckInVisitorCommand(string SocietyId, string PassCode) : IRequest<Result<VisitorResponse>>;

public sealed class CheckInVisitorCommandHandler(
    IVisitorLogRepository visitorRepository,
    ILogger<CheckInVisitorCommandHandler> logger)
    : IRequestHandler<CheckInVisitorCommand, Result<VisitorResponse>>
{
    public async Task<Result<VisitorResponse>> Handle(CheckInVisitorCommand request, CancellationToken ct)
    {
        try
        {
            var normalizedPassCode = request.PassCode.Trim();
            var log = await visitorRepository.GetByPassCodeAsync(normalizedPassCode, ct);
            if (log is null || !string.Equals(log.SocietyId, request.SocietyId, StringComparison.OrdinalIgnoreCase))
                return Result<VisitorResponse>.Failure(ErrorCodes.InvalidPassCode, "Invalid pass code.");

            if (log.Status != VisitorStatus.Approved)
                return Result<VisitorResponse>.Failure(ErrorCodes.VisitorNotApproved, "Visitor must be approved before check-in.");

            log.CheckIn();
            await visitorRepository.UpdateAsync(log, ct);
            return Result<VisitorResponse>.Success(log.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to check in visitor using pass code.");
            return Result<VisitorResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record CheckOutVisitorCommand(string SocietyId, string VisitorLogId) : IRequest<Result<bool>>;

public record UploadVisitorImageCommand(
    string SocietyId,
    string FileName,
    string ContentType,
    byte[] Content) : IRequest<Result<VisitorImageUploadResponse>>;

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

public sealed class UploadVisitorImageCommandHandler(
    IFileStorageService fileStorageService,
    ILogger<UploadVisitorImageCommandHandler> logger)
    : IRequestHandler<UploadVisitorImageCommand, Result<VisitorImageUploadResponse>>
{
    private const string ContainerName = "visitor-images";

    public async Task<Result<VisitorImageUploadResponse>> Handle(UploadVisitorImageCommand request, CancellationToken ct)
    {
        try
        {
            var extension = IO.Path.GetExtension(request.FileName);
            var blobName = $"{request.SocietyId}/{Guid.NewGuid():N}{extension}";

            await using var stream = new IO.MemoryStream(request.Content, writable: false);
            var fileUrl = await fileStorageService.UploadAsync(stream, blobName, request.ContentType, ContainerName, ct);

            return Result<VisitorImageUploadResponse>.Success(new VisitorImageUploadResponse(request.FileName, fileUrl));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upload visitor image {FileName}", request.FileName);
            return Result<VisitorImageUploadResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

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

public record GetVisitorByPassCodeQuery(string SocietyId, string PassCode) : IRequest<Result<VisitorResponse>>;

public sealed class GetVisitorByPassCodeQueryHandler(IVisitorLogRepository visitorRepository)
    : IRequestHandler<GetVisitorByPassCodeQuery, Result<VisitorResponse>>
{
    public async Task<Result<VisitorResponse>> Handle(GetVisitorByPassCodeQuery request, CancellationToken ct)
    {
        try
        {
            var log = await visitorRepository.GetByPassCodeAsync(request.PassCode.Trim(), ct);
            if (log is null || !string.Equals(log.SocietyId, request.SocietyId, StringComparison.OrdinalIgnoreCase))
                return Result<VisitorResponse>.Failure(ErrorCodes.InvalidPassCode, "Invalid pass code.");

            return Result<VisitorResponse>.Success(log.ToResponse());
        }
        catch (Exception ex)
        {
            return Result<VisitorResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetVisitorsBySocietyQuery(
    string SocietyId,
    string? ApartmentId,
    string? Search,
    string? ResidentName,
    string? Status,
    DateOnly? FromDate,
    DateOnly? ToDate,
    PaginationParams Pagination)
    : IRequest<Result<PagedResult<VisitorResponse>>>;

public sealed class GetVisitorsBySocietyQueryHandler(IVisitorLogRepository visitorRepository)
    : IRequestHandler<GetVisitorsBySocietyQuery, Result<PagedResult<VisitorResponse>>>
{
    public async Task<Result<PagedResult<VisitorResponse>>> Handle(GetVisitorsBySocietyQuery request, CancellationToken ct)
    {
        try
        {
            var filtered = VisitorQueryFiltering.FilterVisitors(await visitorRepository.GetAllAsync(request.SocietyId, ct), request)
                .OrderByDescending(visitor => visitor.CreatedAt)
                .ToList();

            var page = request.Pagination.Page < 1 ? 1 : request.Pagination.Page;
            var pageSize = request.Pagination.PageSize < 1 ? 20 : request.Pagination.PageSize;
            var pagedItems = filtered
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(visitor => visitor.ToResponse())
                .ToList();

            return Result<PagedResult<VisitorResponse>>.Success(
                new PagedResult<VisitorResponse>(pagedItems, filtered.Count, page, pageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<VisitorResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetVisitorsByApartmentQuery(
    string SocietyId,
    string ApartmentId,
    string? Search,
    string? ResidentName,
    string? Status,
    DateOnly? FromDate,
    DateOnly? ToDate,
    PaginationParams Pagination)
    : IRequest<Result<PagedResult<VisitorResponse>>>;

public sealed class GetVisitorsByApartmentQueryHandler(IVisitorLogRepository visitorRepository)
    : IRequestHandler<GetVisitorsByApartmentQuery, Result<PagedResult<VisitorResponse>>>
{
    public async Task<Result<PagedResult<VisitorResponse>>> Handle(GetVisitorsByApartmentQuery request, CancellationToken ct)
    {
        return await new GetVisitorsBySocietyQueryHandler(visitorRepository).Handle(
            new GetVisitorsBySocietyQuery(
                request.SocietyId,
                request.ApartmentId,
                request.Search,
                request.ResidentName,
                request.Status,
                request.FromDate,
                request.ToDate,
                request.Pagination),
            ct);
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
            var items = active
                .OrderByDescending(visitor => visitor.CheckInTime ?? visitor.CreatedAt)
                .Select(visitor => visitor.ToResponse())
                .ToList();
            return Result<IReadOnlyList<VisitorResponse>>.Success(items);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<VisitorResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record ExportVisitorsQuery(
    string SocietyId,
    string? ApartmentId,
    string? Search,
    string? ResidentName,
    string? Status,
    DateOnly? FromDate,
    DateOnly? ToDate) : IRequest<Result<VisitorExportResponse>>;

public sealed class ExportVisitorsQueryHandler(IVisitorLogRepository visitorRepository)
    : IRequestHandler<ExportVisitorsQuery, Result<VisitorExportResponse>>
{
    public async Task<Result<VisitorExportResponse>> Handle(ExportVisitorsQuery request, CancellationToken ct)
    {
        try
        {
            var rows = VisitorQueryFiltering.FilterVisitors(
                    await visitorRepository.GetAllAsync(request.SocietyId, ct),
                    new GetVisitorsBySocietyQuery(
                        request.SocietyId,
                        request.ApartmentId,
                        request.Search,
                        request.ResidentName,
                        request.Status,
                        request.FromDate,
                        request.ToDate,
                        new PaginationParams { Page = 1, PageSize = int.MaxValue }))
                .OrderByDescending(visitor => visitor.CreatedAt)
                .ToList();

            var csv = new StringBuilder();
            csv.AppendLine("VisitorName,Phone,Email,CompanyName,Purpose,ResidentName,Block,Floor,Flat,PreApproved,Status,VehicleNumber,PassCode,CreatedAt,ApprovedAt,CheckInTime,CheckOutTime");
            foreach (var visitor in rows)
            {
                csv.AppendLine(string.Join(",",
                    EscapeCsv(visitor.VisitorName),
                    EscapeCsv(visitor.VisitorPhone),
                    EscapeCsv(visitor.VisitorEmail),
                    EscapeCsv(visitor.CompanyName),
                    EscapeCsv(visitor.Purpose),
                    EscapeCsv(visitor.HostResidentName),
                    EscapeCsv(visitor.HostBlockName),
                    visitor.HostFloorNumber.ToString(),
                    EscapeCsv(visitor.HostFlatNumber),
                    visitor.IsPreApproved ? "Yes" : "No",
                    visitor.Status.ToString(),
                    EscapeCsv(visitor.VehicleNumber),
                    EscapeCsv(visitor.PassCode),
                    visitor.CreatedAt.ToString("O"),
                    visitor.ApprovedAt?.ToString("O") ?? string.Empty,
                    visitor.CheckInTime?.ToString("O") ?? string.Empty,
                    visitor.CheckOutTime?.ToString("O") ?? string.Empty));
            }

            var fileName = $"visitor-log-{request.SocietyId}-{DateTime.UtcNow:yyyyMMddHHmmss}.csv";
            return Result<VisitorExportResponse>.Success(
                new VisitorExportResponse(fileName, "text/csv", Encoding.UTF8.GetBytes(csv.ToString())));
        }
        catch (Exception ex)
        {
            return Result<VisitorExportResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;

        var escaped = value.Replace("\"", "\"\"");
        return $"\"{escaped}\"";
    }
}

internal static class VisitorQueryFiltering
{
    public static IEnumerable<VisitorLog> FilterVisitors(
        IReadOnlyList<VisitorLog> visitors,
        GetVisitorsBySocietyQuery query)
    {
        IEnumerable<VisitorLog> filtered = visitors;

        if (!string.IsNullOrWhiteSpace(query.ApartmentId))
        {
            filtered = filtered.Where(visitor =>
                string.Equals(visitor.HostApartmentId, query.ApartmentId, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(query.Status) &&
            Enum.TryParse<VisitorStatus>(query.Status, true, out var visitorStatus))
        {
            filtered = filtered.Where(visitor => visitor.Status == visitorStatus);
        }

        if (query.FromDate.HasValue)
        {
            var fromUtc = query.FromDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            filtered = filtered.Where(visitor => visitor.CreatedAt >= fromUtc);
        }

        if (query.ToDate.HasValue)
        {
            var toUtc = query.ToDate.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
            filtered = filtered.Where(visitor => visitor.CreatedAt <= toUtc);
        }

        if (!string.IsNullOrWhiteSpace(query.ResidentName))
        {
            filtered = filtered.Where(visitor =>
                visitor.HostResidentName.Contains(query.ResidentName.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            filtered = filtered.Where(visitor =>
                visitor.VisitorName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                visitor.VisitorPhone.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrWhiteSpace(visitor.CompanyName) && visitor.CompanyName.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                visitor.Purpose.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                visitor.HostResidentName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                visitor.HostFlatNumber.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrWhiteSpace(visitor.VehicleNumber) && visitor.VehicleNumber.Contains(search, StringComparison.OrdinalIgnoreCase)));
        }

        return filtered;
    }
}

}
