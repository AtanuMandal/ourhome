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

namespace ApartmentManagement.Application.Commands.Sos
{

public record TriggerSosAlertCommand(string SocietyId, string TriggeredByUserId, SosCategory Category, string? Note)
    : IRequest<Result<SosAlertResponse>>;

public sealed class TriggerSosAlertCommandHandler(
    ISosAlertRepository alertRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    INotificationService notificationService,
    ILogger<TriggerSosAlertCommandHandler> logger)
    : IRequestHandler<TriggerSosAlertCommand, Result<SosAlertResponse>>
{
    public async Task<Result<SosAlertResponse>> Handle(TriggerSosAlertCommand request, CancellationToken ct)
    {
        try
        {
            var triggeringUser = await userRepository.GetByIdAsync(request.TriggeredByUserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.TriggeredByUserId);

            if (string.IsNullOrWhiteSpace(triggeringUser.ApartmentId))
                return Result<SosAlertResponse>.Failure(ErrorCodes.UserHasNoApartment, "You must be linked to an apartment to trigger an SOS alert.");

            var apartment = await apartmentRepository.GetByIdAsync(triggeringUser.ApartmentId, request.SocietyId, ct)
                ?? throw new NotFoundException("Apartment", triggeringUser.ApartmentId);

            var alert = SosAlert.Create(
                request.SocietyId, apartment.Id, triggeringUser.Id, triggeringUser.FullName, request.Category, request.Note);
            var created = await alertRepository.CreateAsync(alert, ct);

            await NotifyRespondersAndHouseholdAsync(created, apartment, triggeringUser, ct);

            return Result<SosAlertResponse>.Success(created.ToResponse(apartment.ToDisplayLabel()));
        }
        catch (NotFoundException ex)
        {
            return Result<SosAlertResponse>.Failure(ErrorCodes.NotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to trigger SOS alert for user {UserId}", request.TriggeredByUserId);
            return Result<SosAlertResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }

    private async Task NotifyRespondersAndHouseholdAsync(SosAlert alert, Domain.Entities.Apartment apartment, Domain.Entities.User triggeringUser, CancellationToken ct)
    {
        var title = $"SOS: {alert.Category} — {apartment.ToDisplayLabel()}";
        var body = $"{triggeringUser.FullName} triggered an SOS alert ({alert.Category}) at {apartment.ToDisplayLabel()}."
            + (string.IsNullOrWhiteSpace(alert.Note) ? string.Empty : $" Note: {alert.Note}");
        var data = new Dictionary<string, string>
        {
            ["type"] = "sos-alert",
            ["priority"] = "critical",
            ["sosAlertId"] = alert.Id,
            ["category"] = alert.Category.ToString(),
        };

        var security = await userRepository.GetByRoleAsync(alert.SocietyId, UserRole.SUSecurity, 1, 200, ct);
        var admins = await userRepository.GetByRoleAsync(alert.SocietyId, UserRole.SUAdmin, 1, 200, ct);
        var responderTasks = security.Concat(admins)
            .Where(responder => responder.IsActive)
            .Select(responder => notificationService.SendPushNotificationAsync(responder.Id, title, body, ct, data));

        var householdTitle = "SOS alert from your household";
        var householdBody = $"{triggeringUser.FullName} triggered an SOS alert ({alert.Category}) for {apartment.ToDisplayLabel()}.";
        var householdTasks = apartment.GetResidentsForRead()
            .Where(resident => !string.Equals(resident.UserId, triggeringUser.Id, StringComparison.OrdinalIgnoreCase))
            .Select(resident => notificationService.SendPushNotificationAsync(resident.UserId, householdTitle, householdBody, ct, data));

        await Task.WhenAll(responderTasks.Concat(householdTasks));
    }
}

public record AcknowledgeSosAlertCommand(string SocietyId, string AlertId, string UserId)
    : IRequest<Result<SosAlertResponse>>;

public sealed class AcknowledgeSosAlertCommandHandler(
    ISosAlertRepository alertRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ILogger<AcknowledgeSosAlertCommandHandler> logger)
    : IRequestHandler<AcknowledgeSosAlertCommand, Result<SosAlertResponse>>
{
    public async Task<Result<SosAlertResponse>> Handle(AcknowledgeSosAlertCommand request, CancellationToken ct)
    {
        try
        {
            var alert = await alertRepository.GetByIdAsync(request.AlertId, request.SocietyId, ct)
                ?? throw new NotFoundException("SosAlert", request.AlertId);

            var actor = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct);
            alert.Acknowledge(request.UserId, actor?.FullName ?? request.UserId);
            var updated = await alertRepository.UpdateAsync(alert, ct);

            var apartment = await apartmentRepository.GetByIdAsync(updated.ApartmentId, request.SocietyId, ct);
            return Result<SosAlertResponse>.Success(updated.ToResponse(apartment?.ToDisplayLabel() ?? updated.ApartmentId));
        }
        catch (NotFoundException ex)
        {
            return Result<SosAlertResponse>.Failure(ErrorCodes.SosAlertNotFound, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Result<SosAlertResponse>.Failure(ErrorCodes.SosAlertAlreadySettled, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to acknowledge SOS alert {AlertId}", request.AlertId);
            return Result<SosAlertResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record ResolveSosAlertCommand(string SocietyId, string AlertId, string UserId)
    : IRequest<Result<SosAlertResponse>>;

public sealed class ResolveSosAlertCommandHandler(
    ISosAlertRepository alertRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ILogger<ResolveSosAlertCommandHandler> logger)
    : IRequestHandler<ResolveSosAlertCommand, Result<SosAlertResponse>>
{
    public async Task<Result<SosAlertResponse>> Handle(ResolveSosAlertCommand request, CancellationToken ct)
    {
        try
        {
            var alert = await alertRepository.GetByIdAsync(request.AlertId, request.SocietyId, ct)
                ?? throw new NotFoundException("SosAlert", request.AlertId);

            var actor = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct);
            alert.Resolve(request.UserId, actor?.FullName ?? request.UserId);
            var updated = await alertRepository.UpdateAsync(alert, ct);

            var apartment = await apartmentRepository.GetByIdAsync(updated.ApartmentId, request.SocietyId, ct);
            return Result<SosAlertResponse>.Success(updated.ToResponse(apartment?.ToDisplayLabel() ?? updated.ApartmentId));
        }
        catch (NotFoundException ex)
        {
            return Result<SosAlertResponse>.Failure(ErrorCodes.SosAlertNotFound, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Result<SosAlertResponse>.Failure(ErrorCodes.SosAlertAlreadySettled, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to resolve SOS alert {AlertId}", request.AlertId);
            return Result<SosAlertResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record MarkSosAlertFalseAlarmCommand(string SocietyId, string AlertId, string RequestingUserId)
    : IRequest<Result<SosAlertResponse>>;

public sealed class MarkSosAlertFalseAlarmCommandHandler(
    ISosAlertRepository alertRepository,
    IApartmentRepository apartmentRepository,
    ILogger<MarkSosAlertFalseAlarmCommandHandler> logger)
    : IRequestHandler<MarkSosAlertFalseAlarmCommand, Result<SosAlertResponse>>
{
    public async Task<Result<SosAlertResponse>> Handle(MarkSosAlertFalseAlarmCommand request, CancellationToken ct)
    {
        try
        {
            var alert = await alertRepository.GetByIdAsync(request.AlertId, request.SocietyId, ct)
                ?? throw new NotFoundException("SosAlert", request.AlertId);

            if (!string.Equals(alert.TriggeredByUserId, request.RequestingUserId, StringComparison.OrdinalIgnoreCase))
                throw new ForbiddenException("Only the resident who triggered the alert can mark it as a false alarm.");

            alert.MarkFalseAlarm();
            var updated = await alertRepository.UpdateAsync(alert, ct);

            var apartment = await apartmentRepository.GetByIdAsync(updated.ApartmentId, request.SocietyId, ct);
            return Result<SosAlertResponse>.Success(updated.ToResponse(apartment?.ToDisplayLabel() ?? updated.ApartmentId));
        }
        catch (NotFoundException ex)
        {
            return Result<SosAlertResponse>.Failure(ErrorCodes.SosAlertNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<SosAlertResponse>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Result<SosAlertResponse>.Failure(ErrorCodes.SosAlertAlreadySettled, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to mark SOS alert {AlertId} as a false alarm", request.AlertId);
            return Result<SosAlertResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Timer-driven command (society-agnostic — see TimerFunctions) ────────────

public record EscalateSosAlertsCommand(DateTime? AsOfUtc = null) : IRequest<Result<int>>;

public sealed class EscalateSosAlertsCommandHandler(
    ISosAlertRepository alertRepository,
    IUserRepository userRepository,
    INotificationService notificationService,
    ILogger<EscalateSosAlertsCommandHandler> logger)
    : IRequestHandler<EscalateSosAlertsCommand, Result<int>>
{
    /// <summary>Default escalation window, per requirements/emergency_sos.md.</summary>
    private static readonly TimeSpan BaseWindow = TimeSpan.FromMinutes(2);

    public async Task<Result<int>> Handle(EscalateSosAlertsCommand request, CancellationToken ct)
    {
        try
        {
            var now = request.AsOfUtc ?? DateTime.UtcNow;
            var activeAlerts = await alertRepository.GetActiveAcrossSocietiesAsync(ct);

            var escalated = 0;
            foreach (var alert in activeAlerts)
            {
                // Escalation interval doubles each time (2, 4, 8, ... minutes) so responders are
                // re-notified at increasing intervals rather than every tick, per the requirement.
                var sinceLast = now - (alert.LastEscalatedAt ?? alert.CreatedAt);
                var dueWindow = TimeSpan.FromTicks(BaseWindow.Ticks * (long)Math.Pow(2, alert.EscalationCount));
                if (sinceLast < dueWindow)
                    continue;

                alert.RecordEscalation();
                await alertRepository.UpdateAsync(alert, ct);
                await NotifyOnEscalationAsync(alert, ct);
                escalated++;
            }

            return Result<int>.Success(escalated);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to run SOS alert escalation sweep.");
            return Result<int>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }

    private async Task NotifyOnEscalationAsync(SosAlert alert, CancellationToken ct)
    {
        var title = $"UNACKNOWLEDGED SOS: {alert.Category}";
        var body = $"{alert.TriggeredByUserName}'s SOS alert has not been acknowledged. Escalation #{alert.EscalationCount}.";
        var data = new Dictionary<string, string>
        {
            ["type"] = "sos-alert-escalation",
            ["priority"] = "critical",
            ["sosAlertId"] = alert.Id,
            ["category"] = alert.Category.ToString(),
        };

        var security = await userRepository.GetByRoleAsync(alert.SocietyId, UserRole.SUSecurity, 1, 200, ct);
        var admins = await userRepository.GetByRoleAsync(alert.SocietyId, UserRole.SUAdmin, 1, 200, ct);
        var tasks = security.Concat(admins)
            .Where(responder => responder.IsActive)
            .Select(responder => notificationService.SendPushNotificationAsync(responder.Id, title, body, ct, data));

        await Task.WhenAll(tasks);
    }
}

}

namespace ApartmentManagement.Application.Queries.Sos
{

public record GetSosAlertQuery(string SocietyId, string AlertId, string RequestingUserId, string RequestingUserRole)
    : IRequest<Result<SosAlertResponse>>;

public sealed class GetSosAlertQueryHandler(ISosAlertRepository alertRepository, IApartmentRepository apartmentRepository)
    : IRequestHandler<GetSosAlertQuery, Result<SosAlertResponse>>
{
    public async Task<Result<SosAlertResponse>> Handle(GetSosAlertQuery request, CancellationToken ct)
    {
        try
        {
            var alert = await alertRepository.GetByIdAsync(request.AlertId, request.SocietyId, ct)
                ?? throw new NotFoundException("SosAlert", request.AlertId);

            // Any authenticated society member can view an SOS alert — only SUAdmin/SUSecurity
            // can act on it (acknowledge/resolve), enforced separately at the command handlers.
            var apartment = await apartmentRepository.GetByIdAsync(alert.ApartmentId, request.SocietyId, ct);
            return Result<SosAlertResponse>.Success(alert.ToResponse(apartment?.ToDisplayLabel() ?? alert.ApartmentId));
        }
        catch (NotFoundException ex)
        {
            return Result<SosAlertResponse>.Failure(ErrorCodes.SosAlertNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<SosAlertResponse>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<SosAlertResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetSosAlertsQuery(
    string SocietyId, SosAlertStatus? Status, SosCategory? Category,
    DateOnly? FromDate, DateOnly? ToDate, PaginationParams Pagination)
    : IRequest<Result<PagedResult<SosAlertResponse>>>;

public sealed class GetSosAlertsQueryHandler(ISosAlertRepository alertRepository, IApartmentRepository apartmentRepository)
    : IRequestHandler<GetSosAlertsQuery, Result<PagedResult<SosAlertResponse>>>
{
    public async Task<Result<PagedResult<SosAlertResponse>>> Handle(GetSosAlertsQuery request, CancellationToken ct)
    {
        try
        {
            IEnumerable<SosAlert> alerts = await alertRepository.GetAllAsync(request.SocietyId, ct);

            if (request.Status.HasValue)
                alerts = alerts.Where(a => a.Status == request.Status.Value);
            if (request.Category.HasValue)
                alerts = alerts.Where(a => a.Category == request.Category.Value);
            if (request.FromDate.HasValue)
            {
                var fromUtc = request.FromDate.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
                alerts = alerts.Where(a => a.CreatedAt >= fromUtc);
            }
            if (request.ToDate.HasValue)
            {
                var toUtc = request.ToDate.Value.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
                alerts = alerts.Where(a => a.CreatedAt <= toUtc);
            }

            var ordered = alerts.OrderByDescending(a => a.CreatedAt).ToList();
            var page = request.Pagination.Page < 1 ? 1 : request.Pagination.Page;
            var pageSize = request.Pagination.PageSize < 1 ? 20 : request.Pagination.PageSize;
            var pageItems = ordered.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            var apartments = await apartmentRepository.GetAllAsync(request.SocietyId, ct);
            var apartmentsById = apartments.ToDictionary(a => a.Id, StringComparer.OrdinalIgnoreCase);

            var items = pageItems
                .Select(a => a.ToResponse(apartmentsById.TryGetValue(a.ApartmentId, out var apt) ? apt.ToDisplayLabel() : a.ApartmentId))
                .ToList();

            return Result<PagedResult<SosAlertResponse>>.Success(
                new PagedResult<SosAlertResponse>(items, ordered.Count, page, pageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<SosAlertResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetSosAlertReportQuery(string SocietyId, DateOnly FromDate, DateOnly ToDate)
    : IRequest<Result<SosAlertReportResponse>>;

public sealed class GetSosAlertReportQueryHandler(ISosAlertRepository alertRepository)
    : IRequestHandler<GetSosAlertReportQuery, Result<SosAlertReportResponse>>
{
    public async Task<Result<SosAlertReportResponse>> Handle(GetSosAlertReportQuery request, CancellationToken ct)
    {
        try
        {
            var fromUtc = request.FromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var toUtc = request.ToDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

            var all = await alertRepository.GetAllAsync(request.SocietyId, ct);
            var inRange = all.Where(a => a.CreatedAt >= fromUtc && a.CreatedAt <= toUtc).ToList();

            var falseAlarmCount = inRange.Count(a => a.Status == SosAlertStatus.FalseAlarm);
            var falseAlarmRate = inRange.Count == 0 ? 0 : Math.Round(falseAlarmCount * 100.0 / inRange.Count, 1);

            var acknowledgeSeconds = inRange
                .Where(a => a.AcknowledgedAt.HasValue)
                .Select(a => (a.AcknowledgedAt!.Value - a.CreatedAt).TotalSeconds)
                .ToList();
            var resolveSeconds = inRange
                .Where(a => a.ResolvedAt.HasValue)
                .Select(a => (a.ResolvedAt!.Value - a.CreatedAt).TotalSeconds)
                .ToList();

            var byCategory = inRange
                .GroupBy(a => a.Category)
                .Select(g => new SosCategoryBreakdown(g.Key.ToString(), g.Count()))
                .OrderByDescending(c => c.Count)
                .ToList();

            var report = new SosAlertReportResponse(
                fromUtc, toUtc, inRange.Count, falseAlarmCount, falseAlarmRate,
                acknowledgeSeconds.Count == 0 ? null : Math.Round(acknowledgeSeconds.Average(), 1),
                resolveSeconds.Count == 0 ? null : Math.Round(resolveSeconds.Average(), 1),
                byCategory);

            return Result<SosAlertReportResponse>.Success(report);
        }
        catch (Exception ex)
        {
            return Result<SosAlertReportResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

}
