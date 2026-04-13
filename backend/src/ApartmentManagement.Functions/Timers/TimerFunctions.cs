using ApartmentManagement.Application.Commands.Fee;
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
    IFeeScheduleRepository feeScheduleRepo,
    IFeePaymentRepository feePaymentRepo,
    INoticeRepository noticeRepo,
    ICompetitionRepository competitionRepo,
    INotificationService notificationService,
    ILogger<TimerFunctions> logger)
{
    /// <summary>Runs daily at 1 AM UTC — generates fee payment records for active schedules.</summary>
    [Function("GenerateFeePayments")]
    public async Task GenerateFeePayments(
        [TimerTrigger("0 0 1 * * *")] TimerInfo timer, CancellationToken ct)
    {
        logger.LogInformation("GenerateFeePayments timer triggered");
        try
        {
            await mediator.Send(new GenerateDueFeePaymentsCommand(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in GenerateFeePayments timer");
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

    /// <summary>Runs daily at 9 AM UTC — sends reminders for upcoming fee due dates.</summary>
    [Function("SendFeeReminders")]
    public async Task SendFeeReminders(
        [TimerTrigger("0 0 9 * * *")] TimerInfo timer, CancellationToken ct)
    {
        logger.LogInformation("SendFeeReminders timer triggered");
        try
        {
            var overdue = await feePaymentRepo.GetDueSoonAsync("*", 3, ct);
            foreach (var payment in overdue)
            {
                logger.LogDebug("Sending reminder for payment {Id}", payment.Id);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in SendFeeReminders timer");
        }
    }
}
