using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Domain.Entities;

/// <summary>Defines a recurring fee obligation for an apartment (e.g. monthly maintenance).</summary>
public sealed class FeeSchedule : BaseEntity
{
    public string ApartmentId { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public FeeFrequency Frequency { get; private set; }
    /// <summary>Day of the month (1–28) on which the fee falls due.</summary>
    public int DueDay { get; private set; }
    public DateTime NextDueDate { get; private set; }
    public bool IsActive { get; private set; }

    private FeeSchedule() { }

    public static FeeSchedule Create(string societyId, string apartmentId, string description,
        decimal amount, FeeFrequency frequency, int dueDay)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(apartmentId, nameof(apartmentId));
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than zero.");
        if (dueDay < 1 || dueDay > 28) throw new ArgumentOutOfRangeException(nameof(dueDay), "Due day must be between 1 and 28.");

        var schedule = new FeeSchedule
        {
            SocietyId = societyId,
            ApartmentId = apartmentId,
            Description = description,
            Amount = amount,
            Frequency = frequency,
            DueDay = dueDay,
            IsActive = true
        };
        schedule.NextDueDate = schedule.CalculateNextDueDate(DateTime.UtcNow);
        return schedule;
    }

    public void Deactivate() { IsActive = false; TouchUpdatedAt(); }
    public void Activate() { IsActive = true; TouchUpdatedAt(); }

    public void UpdateAmount(decimal amount)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        Amount = amount;
        TouchUpdatedAt();
    }

    /// <summary>Calculates the next due date after <paramref name="from"/>.</summary>
    public DateTime CalculateNextDueDate(DateTime from)
    {
        var next = new DateTime(from.Year, from.Month, Math.Min(DueDay, DateTime.DaysInMonth(from.Year, from.Month)), 0, 0, 0, DateTimeKind.Utc);
        if (next <= from)
        {
            next = Frequency switch
            {
                FeeFrequency.Monthly => next.AddMonths(1),
                FeeFrequency.Quarterly => next.AddMonths(3),
                FeeFrequency.Annual => next.AddYears(1),
                _ => next
            };
        }
        return next;
    }

    public void AdvanceNextDueDate()
    {
        NextDueDate = CalculateNextDueDate(NextDueDate);
        TouchUpdatedAt();
    }
}

/// <summary>A single fee payment record for an apartment.</summary>
public sealed class FeePayment : BaseEntity
{
    public string ApartmentId { get; private set; } = string.Empty;
    public string FeeScheduleId { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public PaymentStatus Status { get; private set; }
    public DateTime DueDate { get; private set; }
    public DateTime? PaidAt { get; private set; }
    public string? PaymentMethod { get; private set; }
    public string? TransactionId { get; private set; }
    public string? ReceiptUrl { get; private set; }

    private FeePayment() { }

    public static FeePayment Create(string societyId, string apartmentId, string feeScheduleId,
        string description, decimal amount, DateTime dueDate)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));

        var payment = new FeePayment
        {
            SocietyId = societyId,
            ApartmentId = apartmentId,
            FeeScheduleId = feeScheduleId,
            Description = description,
            Amount = amount,
            DueDate = dueDate,
            Status = PaymentStatus.Pending
        };
        payment.AddDomainEvent(new FeePaymentDueEvent(feeScheduleId, societyId, apartmentId, amount, dueDate));
        return payment;
    }

    public void MarkPaid(string paymentMethod, string transactionId, string? receiptUrl = null)
    {
        Status = PaymentStatus.Paid;
        PaidAt = DateTime.UtcNow;
        PaymentMethod = paymentMethod;
        TransactionId = transactionId;
        ReceiptUrl = receiptUrl;
        TouchUpdatedAt();
        AddDomainEvent(new FeePaymentReceivedEvent(Id, SocietyId, ApartmentId, Amount));
    }

    public void MarkFailed() { Status = PaymentStatus.Failed; TouchUpdatedAt(); }
    public void MarkOverdue() { Status = PaymentStatus.Overdue; TouchUpdatedAt(); }
    public void Cancel() { Status = PaymentStatus.Cancelled; TouchUpdatedAt(); }
}
