using ApartmentManagement.Application.Commands.Maintenance;
using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.Commands.Gamification;
using ApartmentManagement.Application.Commands.Staff;
using ApartmentManagement.Application.Commands.Sos;
using ApartmentManagement.Application.Commands.Poll;
using MediatR;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Functions.Timers;

public class TimerFunctions(
    ISender mediator,
    ILogger<TimerFunctions> logger)
{
    /// <summary>Runs daily at 1 AM UTC — generates maintenance charges for due schedules.</summary>
    [Function("GenerateMaintenanceCharges")]
    public async Task GenerateMaintenanceCharges(
        [TimerTrigger("0 0 1 * * *")] TimerInfo timer, CancellationToken ct)
    {
        logger.LogInformation("GenerateMaintenanceCharges timer triggered");
        try
        {
            await mediator.Send(new GenerateDueMaintenanceChargesCommand(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in GenerateMaintenanceCharges timer");
        }
    }

    /// <summary>Runs daily at 2 AM UTC — archives expired notices.</summary>
    [Function("ArchiveExpiredNotices")]
    public async Task ArchiveExpiredNotices(
        [TimerTrigger("0 0 2 * * *")] TimerInfo timer, CancellationToken ct)
    {
        logger.LogInformation("ArchiveExpiredNotices timer triggered");
        try
        {
            await mediator.Send(new ArchiveExpiredNoticesCommand(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in ArchiveExpiredNotices timer");
        }
    }

    /// <summary>Runs every 30 minutes — updates competition statuses based on dates.</summary>
    [Function("UpdateCompetitionStatuses")]
    public async Task UpdateCompetitionStatuses(
        [TimerTrigger("0 */30 * * * *")] TimerInfo timer, CancellationToken ct)
    {
        logger.LogInformation("UpdateCompetitionStatuses timer triggered");
        try
        {
            await mediator.Send(new UpdateCompetitionStatusesCommand(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in UpdateCompetitionStatuses timer");
        }
    }

    /// <summary>Runs every 15 minutes — notifies SUAdmin when a staff member hasn't checked in shortly after their shift's grace period.</summary>
    [Function("NotifyMissingStaffCheckIns")]
    public async Task NotifyMissingStaffCheckIns(
        [TimerTrigger("0 */15 * * * *")] TimerInfo timer, CancellationToken ct)
    {
        logger.LogInformation("NotifyMissingStaffCheckIns timer triggered");
        try
        {
            await mediator.Send(new NotifyMissingStaffCheckInsCommand(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in NotifyMissingStaffCheckIns timer");
        }
    }

    /// <summary>Runs daily at 11:45 PM UTC — marks staff with no check-in that day as Absent.</summary>
    [Function("MarkAbsentStaff")]
    public async Task MarkAbsentStaff(
        [TimerTrigger("0 45 23 * * *")] TimerInfo timer, CancellationToken ct)
    {
        logger.LogInformation("MarkAbsentStaff timer triggered");
        try
        {
            await mediator.Send(new MarkAbsentStaffCommand(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in MarkAbsentStaff timer");
        }
    }

    /// <summary>Runs every minute — re-notifies responders for SOS alerts that have gone unacknowledged past their escalation window.</summary>
    [Function("EscalateSosAlerts")]
    public async Task EscalateSosAlerts(
        [TimerTrigger("0 * * * * *")] TimerInfo timer, CancellationToken ct)
    {
        logger.LogInformation("EscalateSosAlerts timer triggered");
        try
        {
            await mediator.Send(new EscalateSosAlertsCommand(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in EscalateSosAlerts timer");
        }
    }

    /// <summary>Runs every minute — activates scheduled polls whose opensAt has arrived and closes open polls past closesAt.</summary>
    [Function("UpdatePollStatuses")]
    public async Task UpdatePollStatuses(
        [TimerTrigger("0 * * * * *")] TimerInfo timer, CancellationToken ct)
    {
        logger.LogInformation("UpdatePollStatuses timer triggered");
        try
        {
            await mediator.Send(new UpdatePollStatusesCommand(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in UpdatePollStatuses timer");
        }
    }

    /// <summary>Runs every 30 minutes — reminds residents who haven't voted as a poll's closesAt approaches.</summary>
    [Function("SendPollVotingReminders")]
    public async Task SendPollVotingReminders(
        [TimerTrigger("0 */30 * * * *")] TimerInfo timer, CancellationToken ct)
    {
        logger.LogInformation("SendPollVotingReminders timer triggered");
        try
        {
            await mediator.Send(new SendPollVotingRemindersCommand(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in SendPollVotingReminders timer");
        }
    }

}
