using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Domain.Entities;

public sealed class MaintenanceSchedule : BaseEntity
{
    public sealed record ScheduleChange(
        decimal PreviousRate,
        decimal NewRate,
        MaintenanceAreaBasis? AreaBasis,
        string ChangedByUserId,
        string ChangedByUserName,
        string Reason,
        DateTime ChangedAt);

    public string? ApartmentId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public decimal Rate { get; private set; }
    public MaintenancePricingType PricingType { get; private set; }
    public MaintenanceAreaBasis? AreaBasis { get; private set; }
    public FeeFrequency Frequency { get; private set; }
    public int DueDay { get; private set; }
    public DateTime NextDueDate { get; private set; }
    public bool IsActive { get; private set; }
    public IReadOnlyList<ScheduleChange> ChangeHistory { get; private set; } = [];

    private MaintenanceSchedule() { }

    public static MaintenanceSchedule Create(
        string societyId,
        string? apartmentId,
        string name,
        string? description,
        decimal rate,
        MaintenancePricingType pricingType,
        MaintenanceAreaBasis? areaBasis,
        FeeFrequency frequency,
        int dueDay)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        ValidatePricing(rate, pricingType, areaBasis);
        ValidateDueDay(dueDay);

        var schedule = new MaintenanceSchedule
        {
            SocietyId = societyId,
            ApartmentId = string.IsNullOrWhiteSpace(apartmentId) ? null : apartmentId.Trim(),
            Name = name.Trim(),
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            Rate = rate,
            PricingType = pricingType,
            AreaBasis = areaBasis,
            Frequency = frequency,
            DueDay = dueDay,
            IsActive = true
        };
        schedule.NextDueDate = schedule.CalculateNextDueDate(DateTime.UtcNow);
        return schedule;
    }

    public void Update(
        string? apartmentId,
        string name,
        string? description,
        decimal rate,
        MaintenancePricingType pricingType,
        MaintenanceAreaBasis? areaBasis,
        FeeFrequency frequency,
        int dueDay,
        bool isActive,
        string changedByUserId,
        string changedByUserName,
        string reason)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        ArgumentException.ThrowIfNullOrWhiteSpace(changedByUserId, nameof(changedByUserId));
        ArgumentException.ThrowIfNullOrWhiteSpace(changedByUserName, nameof(changedByUserName));
        ArgumentException.ThrowIfNullOrWhiteSpace(reason, nameof(reason));
        ValidatePricing(rate, pricingType, areaBasis);
        ValidateDueDay(dueDay);

        var history = ChangeHistory.ToList();
        history.Add(new ScheduleChange(
            Rate,
            rate,
            areaBasis,
            changedByUserId.Trim(),
            changedByUserName.Trim(),
            reason.Trim(),
            DateTime.UtcNow));

        ApartmentId = string.IsNullOrWhiteSpace(apartmentId) ? null : apartmentId.Trim();
        Name = name.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        Rate = rate;
        PricingType = pricingType;
        AreaBasis = areaBasis;
        Frequency = frequency;
        DueDay = dueDay;
        IsActive = isActive;
        ChangeHistory = history;
        RecalculateNextDueDate(DateTime.UtcNow);
        TouchUpdatedAt();
    }

    public DateTime CalculateNextDueDate(DateTime from)
    {
        var next = new DateTime(from.Year, from.Month, Math.Min(DueDay, DateTime.DaysInMonth(from.Year, from.Month)), 0, 0, 0, DateTimeKind.Utc);
        if (next <= from)
            next = AdvanceDate(next);

        return next;
    }

    public void AdvanceNextDueDate()
    {
        NextDueDate = AdvanceDate(NextDueDate);
        TouchUpdatedAt();
    }

    public void RecalculateNextDueDate(DateTime from)
    {
        NextDueDate = CalculateNextDueDate(from);
        TouchUpdatedAt();
    }

    private DateTime AdvanceDate(DateTime current) =>
        Frequency switch
        {
            FeeFrequency.Monthly => current.AddMonths(1),
            FeeFrequency.Quarterly => current.AddMonths(3),
            FeeFrequency.Annual => current.AddYears(1),
            _ => current.AddMonths(1)
        };

    private static void ValidatePricing(decimal rate, MaintenancePricingType pricingType, MaintenanceAreaBasis? areaBasis)
    {
        if (rate <= 0)
            throw new ArgumentOutOfRangeException(nameof(rate), "Rate must be greater than zero.");

        if (pricingType == MaintenancePricingType.PerSquareFoot && areaBasis is null)
            throw new ArgumentException("Area basis is required for per-square-foot pricing.", nameof(areaBasis));

        if (pricingType == MaintenancePricingType.FixedAmount && areaBasis is not null)
            throw new ArgumentException("Area basis is only valid for per-square-foot pricing.", nameof(areaBasis));
    }

    private static void ValidateDueDay(int dueDay)
    {
        if (dueDay < 1 || dueDay > 28)
            throw new ArgumentOutOfRangeException(nameof(dueDay), "Due day must be between 1 and 28.");
    }
}

public sealed class MaintenanceCharge : BaseEntity
{
    public sealed record PaymentProof(string ProofUrl, string? Notes, string SubmittedByUserId, DateTime SubmittedAt);

    public string ApartmentId { get; private set; } = string.Empty;
    public string ScheduleId { get; private set; } = string.Empty;
    public string ScheduleName { get; private set; } = string.Empty;
    public int ChargeYear { get; private set; }
    public int ChargeMonth { get; private set; }
    public decimal Amount { get; private set; }
    public PaymentStatus Status { get; private set; }
    public DateTime DueDate { get; private set; }
    public DateTime? PaidAt { get; private set; }
    public string? PaymentMethod { get; private set; }
    public string? TransactionReference { get; private set; }
    public string? ReceiptUrl { get; private set; }
    public string? Notes { get; private set; }
    public IReadOnlyList<PaymentProof> Proofs { get; private set; } = [];

    private MaintenanceCharge() { }

    public static MaintenanceCharge Create(
        string societyId,
        string apartmentId,
        string scheduleId,
        string scheduleName,
        decimal amount,
        DateTime dueDate,
        string? notes = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(apartmentId, nameof(apartmentId));
        ArgumentException.ThrowIfNullOrWhiteSpace(scheduleId, nameof(scheduleId));
        ArgumentException.ThrowIfNullOrWhiteSpace(scheduleName, nameof(scheduleName));
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than zero.");

        var charge = new MaintenanceCharge
        {
            SocietyId = societyId,
            ApartmentId = apartmentId.Trim(),
            ScheduleId = scheduleId.Trim(),
            ScheduleName = scheduleName.Trim(),
            ChargeYear = dueDate.Year,
            ChargeMonth = dueDate.Month,
            Amount = amount,
            DueDate = dueDate,
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
            Status = PaymentStatus.Pending
        };
        charge.AddDomainEvent(new MaintenanceChargeDueEvent(scheduleId, societyId, apartmentId, amount, dueDate));
        return charge;
    }

    public void RefreshAmount(decimal amount, string scheduleName, DateTime dueDate)
    {
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount));

        Amount = amount;
        ScheduleName = scheduleName.Trim();
        DueDate = dueDate;
        ChargeYear = dueDate.Year;
        ChargeMonth = dueDate.Month;
        if (Status == PaymentStatus.Cancelled)
        {
            Status = PaymentStatus.Pending;
            PaidAt = null;
            PaymentMethod = null;
            TransactionReference = null;
            ReceiptUrl = null;
            Proofs = [];
        }
        TouchUpdatedAt();
    }

    public void Cancel(string? notes = null)
    {
        if (Status == PaymentStatus.Paid)
            throw new InvalidOperationException("Paid charges cannot be cancelled.");

        if (Status == PaymentStatus.Cancelled)
            return;

        Status = PaymentStatus.Cancelled;
        Notes = string.IsNullOrWhiteSpace(notes) ? Notes : notes.Trim();
        TouchUpdatedAt();
    }

    public void SubmitProof(string proofUrl, string? notes, string submittedByUserId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(proofUrl, nameof(proofUrl));
        ArgumentException.ThrowIfNullOrWhiteSpace(submittedByUserId, nameof(submittedByUserId));

        if (Status == PaymentStatus.Paid || Status == PaymentStatus.Cancelled)
            throw new InvalidOperationException("Payment proof cannot be submitted for settled charges.");

        var proofs = Proofs.ToList();
        proofs.Add(new PaymentProof(proofUrl.Trim(), string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(), submittedByUserId.Trim(), DateTime.UtcNow));
        Proofs = proofs;
        Notes = string.IsNullOrWhiteSpace(notes) ? Notes : notes.Trim();
        Status = PaymentStatus.ProofSubmitted;
        TouchUpdatedAt();
    }

    public void ApprovePayment(string paymentMethod, string? transactionReference, string? receiptUrl, string? notes = null)
    {
        MarkPaid(paymentMethod, transactionReference, receiptUrl, notes);
    }

    public void MarkPaid(string paymentMethod, string? transactionReference, string? receiptUrl, string? notes = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(paymentMethod, nameof(paymentMethod));

        Status = PaymentStatus.Paid;
        PaidAt = DateTime.UtcNow;
        PaymentMethod = paymentMethod.Trim();
        TransactionReference = string.IsNullOrWhiteSpace(transactionReference) ? null : transactionReference.Trim();
        ReceiptUrl = string.IsNullOrWhiteSpace(receiptUrl) ? ReceiptUrl : receiptUrl.Trim();
        Notes = string.IsNullOrWhiteSpace(notes) ? Notes : notes.Trim();
        TouchUpdatedAt();
        AddDomainEvent(new FeePaymentReceivedEvent(Id, SocietyId, ApartmentId, Amount));
    }
}
