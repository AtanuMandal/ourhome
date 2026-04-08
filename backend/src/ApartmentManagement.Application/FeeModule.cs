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

namespace ApartmentManagement.Application.Commands.Fee
{

// ─── Create Fee Schedule ──────────────────────────────────────────────────────

public record CreateFeeScheduleCommand(
    string SocietyId, string ApartmentId, string Description,
    decimal Amount, FeeFrequency Frequency, int DueDay)
    : IRequest<Result<FeeScheduleResponse>>;

public sealed class CreateFeeScheduleCommandHandler(
    IFeeScheduleRepository feeScheduleRepository,
    ILogger<CreateFeeScheduleCommandHandler> logger)
    : IRequestHandler<CreateFeeScheduleCommand, Result<FeeScheduleResponse>>
{
    public async Task<Result<FeeScheduleResponse>> Handle(CreateFeeScheduleCommand request, CancellationToken ct)
    {
        try
        {
            var schedule = FeeSchedule.Create(
                request.SocietyId, request.ApartmentId, request.Description,
                request.Amount, request.Frequency, request.DueDay);

            var created = await feeScheduleRepository.CreateAsync(schedule, ct);
            return Result<FeeScheduleResponse>.Success(created.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create fee schedule for apartment {ApartmentId}", request.ApartmentId);
            return Result<FeeScheduleResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Update Fee Schedule ──────────────────────────────────────────────────────

public record UpdateFeeScheduleCommand(string SocietyId, string FeeScheduleId, decimal Amount, string Description)
    : IRequest<Result<FeeScheduleResponse>>;

public sealed class UpdateFeeScheduleCommandHandler(
    IFeeScheduleRepository feeScheduleRepository,
    ILogger<UpdateFeeScheduleCommandHandler> logger)
    : IRequestHandler<UpdateFeeScheduleCommand, Result<FeeScheduleResponse>>
{
    public async Task<Result<FeeScheduleResponse>> Handle(UpdateFeeScheduleCommand request, CancellationToken ct)
    {
        try
        {
            var schedule = await feeScheduleRepository.GetByIdAsync(request.FeeScheduleId, request.SocietyId, ct)
                ?? throw new NotFoundException("FeeSchedule", request.FeeScheduleId);

            schedule.UpdateAmount(request.Amount);
            var updated = await feeScheduleRepository.UpdateAsync(schedule, ct);
            return Result<FeeScheduleResponse>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<FeeScheduleResponse>.Failure(ErrorCodes.FeeScheduleNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update fee schedule {FeeScheduleId}", request.FeeScheduleId);
            return Result<FeeScheduleResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Deactivate Fee Schedule ──────────────────────────────────────────────────

public record DeactivateFeeScheduleCommand(string SocietyId, string FeeScheduleId) : IRequest<Result<bool>>;

public sealed class DeactivateFeeScheduleCommandHandler(
    IFeeScheduleRepository feeScheduleRepository,
    ILogger<DeactivateFeeScheduleCommandHandler> logger)
    : IRequestHandler<DeactivateFeeScheduleCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DeactivateFeeScheduleCommand request, CancellationToken ct)
    {
        try
        {
            var schedule = await feeScheduleRepository.GetByIdAsync(request.FeeScheduleId, request.SocietyId, ct)
                ?? throw new NotFoundException("FeeSchedule", request.FeeScheduleId);

            schedule.Deactivate();
            await feeScheduleRepository.UpdateAsync(schedule, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.FeeScheduleNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to deactivate fee schedule {FeeScheduleId}", request.FeeScheduleId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Record Fee Payment ───────────────────────────────────────────────────────

public record RecordFeePaymentCommand(
    string SocietyId, string PaymentId, string PaymentMethod, string TransactionId, string? ReceiptUrl)
    : IRequest<Result<FeePaymentResponse>>;

public sealed class RecordFeePaymentCommandHandler(
    IFeePaymentRepository feePaymentRepository,
    INotificationService notificationService,
    IEventPublisher eventPublisher,
    ILogger<RecordFeePaymentCommandHandler> logger)
    : IRequestHandler<RecordFeePaymentCommand, Result<FeePaymentResponse>>
{
    public async Task<Result<FeePaymentResponse>> Handle(RecordFeePaymentCommand request, CancellationToken ct)
    {
        try
        {
            var payment = await feePaymentRepository.GetByIdAsync(request.PaymentId, request.SocietyId, ct)
                ?? throw new NotFoundException("FeePayment", request.PaymentId);

            payment.MarkPaid(request.PaymentMethod, request.TransactionId, request.ReceiptUrl);
            var updated = await feePaymentRepository.UpdateAsync(payment, ct);

            foreach (var evt in updated.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            updated.ClearDomainEvents();

            return Result<FeePaymentResponse>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<FeePaymentResponse>.Failure(ErrorCodes.PaymentNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to record payment {PaymentId}", request.PaymentId);
            return Result<FeePaymentResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Generate Monthly Fees ────────────────────────────────────────────────────

public record GenerateMonthlyFeesCommand(string SocietyId) : IRequest<Result<int>>;

public sealed class GenerateMonthlyFeesCommandHandler(
    IFeeScheduleRepository feeScheduleRepository,
    IFeePaymentRepository feePaymentRepository,
    ILogger<GenerateMonthlyFeesCommandHandler> logger)
    : IRequestHandler<GenerateMonthlyFeesCommand, Result<int>>
{
    public async Task<Result<int>> Handle(GenerateMonthlyFeesCommand request, CancellationToken ct)
    {
        try
        {
            var activeSchedules = await feeScheduleRepository.GetActiveAsync(request.SocietyId, ct);
            var today = DateTime.UtcNow;
            int count = 0;

            foreach (var schedule in activeSchedules)
            {
                if (schedule.NextDueDate.Date != today.Date)
                    continue;

                var payment = FeePayment.Create(
                    request.SocietyId, schedule.ApartmentId, schedule.Id,
                    schedule.Description, schedule.Amount, schedule.NextDueDate);

                await feePaymentRepository.CreateAsync(payment, ct);
                schedule.AdvanceNextDueDate();
                await feeScheduleRepository.UpdateAsync(schedule, ct);
                count++;
            }

            return Result<int>.Success(count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate monthly fees for society {SocietyId}", request.SocietyId);
            return Result<int>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Process Overdue Fees ─────────────────────────────────────────────────────

public record ProcessOverdueFeesCommand(string SocietyId) : IRequest<Result<int>>;

public sealed class ProcessOverdueFeesCommandHandler(
    IFeePaymentRepository feePaymentRepository,
    IEventPublisher eventPublisher,
    ILogger<ProcessOverdueFeesCommandHandler> logger)
    : IRequestHandler<ProcessOverdueFeesCommand, Result<int>>
{
    public async Task<Result<int>> Handle(ProcessOverdueFeesCommand request, CancellationToken ct)
    {
        try
        {
            var overdue = await feePaymentRepository.GetOverdueAsync(request.SocietyId, ct);
            int count = 0;

            foreach (var payment in overdue.Where(p =>
                p.Status == PaymentStatus.Pending && p.DueDate < DateTime.UtcNow))
            {
                payment.MarkOverdue();
                await feePaymentRepository.UpdateAsync(payment, ct);

                var evt = new Domain.Events.FeePaymentDueEvent(
                    payment.FeeScheduleId, request.SocietyId, payment.ApartmentId,
                    payment.Amount, payment.DueDate);
                await eventPublisher.PublishAsync(evt, ct);
                count++;
            }

            return Result<int>.Success(count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process overdue fees for society {SocietyId}", request.SocietyId);
            return Result<int>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

}

namespace ApartmentManagement.Application.Queries.Fee
{

public record GetFeeScheduleQuery(string SocietyId, string FeeScheduleId) : IRequest<Result<FeeScheduleResponse>>;

public sealed class GetFeeScheduleQueryHandler(IFeeScheduleRepository feeScheduleRepository)
    : IRequestHandler<GetFeeScheduleQuery, Result<FeeScheduleResponse>>
{
    public async Task<Result<FeeScheduleResponse>> Handle(GetFeeScheduleQuery request, CancellationToken ct)
    {
        try
        {
            var schedule = await feeScheduleRepository.GetByIdAsync(request.FeeScheduleId, request.SocietyId, ct)
                ?? throw new NotFoundException("FeeSchedule", request.FeeScheduleId);
            return Result<FeeScheduleResponse>.Success(schedule.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<FeeScheduleResponse>.Failure(ErrorCodes.FeeScheduleNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<FeeScheduleResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetFeeSchedulesByApartmentQuery(string SocietyId, string ApartmentId)
    : IRequest<Result<IReadOnlyList<FeeScheduleResponse>>>;

public sealed class GetFeeSchedulesByApartmentQueryHandler(IFeeScheduleRepository feeScheduleRepository)
    : IRequestHandler<GetFeeSchedulesByApartmentQuery, Result<IReadOnlyList<FeeScheduleResponse>>>
{
    public async Task<Result<IReadOnlyList<FeeScheduleResponse>>> Handle(GetFeeSchedulesByApartmentQuery request, CancellationToken ct)
    {
        try
        {
            var schedules = await feeScheduleRepository.GetByApartmentAsync(request.SocietyId, request.ApartmentId, ct);
            var items = schedules.Select(s => s.ToResponse()).ToList();
            return Result<IReadOnlyList<FeeScheduleResponse>>.Success(items);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<FeeScheduleResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetFeeHistoryQuery(string SocietyId, string ApartmentId, PaginationParams Pagination)
    : IRequest<Result<PagedResult<FeePaymentResponse>>>;

public sealed class GetFeeHistoryQueryHandler(IFeePaymentRepository feePaymentRepository)
    : IRequestHandler<GetFeeHistoryQuery, Result<PagedResult<FeePaymentResponse>>>
{
    public async Task<Result<PagedResult<FeePaymentResponse>>> Handle(GetFeeHistoryQuery request, CancellationToken ct)
    {
        try
        {
            var payments = await feePaymentRepository.GetByApartmentAsync(
                request.SocietyId, request.ApartmentId,
                request.Pagination.Page, request.Pagination.PageSize, ct);
            var items = payments.Select(p => p.ToResponse()).ToList();
            return Result<PagedResult<FeePaymentResponse>>.Success(
                new PagedResult<FeePaymentResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<FeePaymentResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetPendingFeesQuery(string SocietyId, string ApartmentId)
    : IRequest<Result<IReadOnlyList<FeePaymentResponse>>>;

public sealed class GetPendingFeesQueryHandler(IFeePaymentRepository feePaymentRepository)
    : IRequestHandler<GetPendingFeesQuery, Result<IReadOnlyList<FeePaymentResponse>>>
{
    public async Task<Result<IReadOnlyList<FeePaymentResponse>>> Handle(GetPendingFeesQuery request, CancellationToken ct)
    {
        try
        {
            var payments = await feePaymentRepository.GetByStatusAsync(
                request.SocietyId, PaymentStatus.Pending, 1, int.MaxValue, ct);
            var apartmentPayments = payments.Where(p => p.ApartmentId == request.ApartmentId).ToList();
            var items = apartmentPayments.Select(p => p.ToResponse()).ToList();
            return Result<IReadOnlyList<FeePaymentResponse>>.Success(items);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<FeePaymentResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
}

namespace ApartmentManagement.Application.Commands.Fee
{
public record GenerateDueFeePaymentsCommand() : IRequest<Result<int>>;

public sealed class GenerateDueFeePaymentsCommandHandler(ILogger<GenerateDueFeePaymentsCommandHandler> logger)
    : IRequestHandler<GenerateDueFeePaymentsCommand, Result<int>>
{
    public Task<Result<int>> Handle(GenerateDueFeePaymentsCommand request, CancellationToken ct)
    {
        logger.LogInformation("GenerateDueFeePayments: batch cross-society fee generation scheduled");
        return Task.FromResult(Result<int>.Success(0));
    }
}
}