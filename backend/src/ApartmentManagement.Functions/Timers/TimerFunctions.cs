using ApartmentManagement.Application.Commands.Maintenance;
using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.Commands.Gamification;
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

}
