using ApartmentManagement.Application.Commands.VendorPayments;
using MediatR;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Functions.Timers;

public class VendorPaymentTimerFunctions(
    ISender mediator,
    ILogger<VendorPaymentTimerFunctions> logger)
{
    [Function("GenerateVendorCharges")]
    public async Task GenerateVendorCharges(
        [TimerTrigger("0 30 1 * * *")] TimerInfo timer,
        CancellationToken ct)
    {
        logger.LogInformation("GenerateVendorCharges timer triggered");
        try
        {
            await mediator.Send(new GenerateDueVendorChargesCommand(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in GenerateVendorCharges timer");
        }
    }

    [Function("NotifyOverdueVendorCharges")]
    public async Task NotifyOverdueVendorCharges(
        [TimerTrigger("0 0 3 * * *")] TimerInfo timer,
        CancellationToken ct)
    {
        logger.LogInformation("NotifyOverdueVendorCharges timer triggered");
        try
        {
            await mediator.Send(new NotifyOverdueVendorChargesCommand(), ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error in NotifyOverdueVendorCharges timer");
        }
    }
}
