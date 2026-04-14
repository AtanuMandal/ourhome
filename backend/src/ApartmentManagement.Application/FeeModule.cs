using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;
using Microsoft.Extensions.Logging;
using ApartmentManagement.Application.Interfaces;

namespace ApartmentManagement.Application.Commands.Fee;

public record ProcessOverdueFeesCommand(string SocietyId) : IRequest<Result>;

public class ProcessOverdueFeesCommandHandler : IRequestHandler<ProcessOverdueFeesCommand, Result>
{
    private readonly IFeePaymentRepository _payments;
    private readonly ISocietyRepository _societies;
    private readonly IEventPublisher _events;
    private readonly ILogger<ProcessOverdueFeesCommandHandler> _logger;

    public ProcessOverdueFeesCommandHandler(
        IFeePaymentRepository payments,
        ISocietyRepository societies,
        IEventPublisher events,
        ILogger<ProcessOverdueFeesCommandHandler> logger)
    {
        _payments = payments;
        _societies = societies;
        _events = events;
        _logger = logger;
    }

    public async Task<Result> Handle(ProcessOverdueFeesCommand cmd, CancellationToken ct)
    {
        var society = await _societies.GetByIdAsync(cmd.SocietyId, cmd.SocietyId, ct);
        if (society is null)
        {
            _logger.LogWarning("Society {SocietyId} not found when processing overdue fees", cmd.SocietyId);
            return Result.Failure("SOCIETY_NOT_FOUND", "Society not found.");
        }

        var threshold = society.OverdueThresholdDays;

        // fetch pending payments (reasonable page size)
        var payments = await _payments.GetByStatusAsync(cmd.SocietyId, PaymentStatus.Pending, 1, 1000, ct);
        var now = DateTime.UtcNow;

        foreach (var p in payments)
        {
            try
            {
                if (p.DueDate.AddDays(threshold) < now)
                {
                    p.MarkOverdue();
                    await _payments.UpdateAsync(p, ct);

                    // publish any domain events attached to the payment (e.g., FeePaymentDueEvent added on creation)
                    foreach (var evt in p.DomainEvents)
                    {
                        // Use dynamic to call the generic PublishAsync<T> with the concrete event type so mocks in tests see PublishAsync called.
                        await _events.PublishAsync((dynamic)evt, ct);
                    }

                    p.ClearDomainEvents();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payment {PaymentId}", p.Id);
            }
        }

        return Result.Success();
    }
}
