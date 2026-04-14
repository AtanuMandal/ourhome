using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.Commands.Gamification;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Application.Interfaces;
using MediatR;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Functions.Timers;

public class TimerFunctions(
    ISender mediator,
    INoticeRepository noticeRepo,
    ICompetitionRepository competitionRepo,
    INotificationService notificationService,
    ILogger<TimerFunctions> logger)
{
    /// <summary>Runs daily at 1 AM UTC — generates fee payment records for active schedules.</summary>
    

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

    /// <summary>Runs daily at 9 AM UTC — sends reminders for upcoming fee due dates.</summary>
   
}
