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
    public int StartMonth => ActiveFromDate.Month;
    public int StartYear => ActiveFromDate.Year;
    public int EndMonth => ActiveUntilDate.Month;
    public int EndYear => ActiveUntilDate.Year;
    public DateTime ActiveFromDate { get; private set; }
    public DateTime ActiveUntilDate { get; private set; }
    public DateTime? InactiveFromDate { get; private set; }
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
        int dueDay,
        int startMonth,
        int startYear,
        int endMonth,
        int endYear)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        ValidatePricing(rate, pricingType, areaBasis);
        ValidateDueDay(dueDay);
        ValidateScheduleMonth(startMonth, nameof(startMonth));
        ValidateScheduleYear(startYear, nameof(startYear));
        ValidateScheduleMonth(endMonth, nameof(endMonth));
        ValidateScheduleYear(endYear, nameof(endYear));

        var activeFromDate = BuildDueDate(startYear, startMonth, dueDay);
        var activeUntilDate = BuildDueDate(endYear, endMonth, dueDay);
        if (activeUntilDate < activeFromDate)
            throw new ArgumentOutOfRangeException(nameof(endYear), "End month and year must be on or after the start month and year.");

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
            ActiveFromDate = activeFromDate,
            ActiveUntilDate = activeUntilDate,
            IsActive = true
        };
        schedule.NextDueDate = activeFromDate;
        return schedule;
    }

    public void UpdateStatus(
        bool isActive,
        int effectiveMonth,
        int effectiveYear,
        string changedByUserId,
        string changedByUserName,
        string reason)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(changedByUserId, nameof(changedByUserId));
        ArgumentException.ThrowIfNullOrWhiteSpace(changedByUserName, nameof(changedByUserName));
        ArgumentException.ThrowIfNullOrWhiteSpace(reason, nameof(reason));
        ValidateScheduleMonth(effectiveMonth, nameof(effectiveMonth));
        ValidateScheduleYear(effectiveYear, nameof(effectiveYear));

        var effectiveDueDate = BuildDueDate(effectiveYear, effectiveMonth, DueDay);
        if (effectiveDueDate < ActiveFromDate)
            throw new ArgumentOutOfRangeException(nameof(effectiveYear), "Effective month and year must be on or after the schedule start month and year.");
        if (effectiveDueDate > NextCycleAfterEndDate())
            throw new ArgumentOutOfRangeException(nameof(effectiveYear), "Effective month and year must be within the schedule window.");

        var history = ChangeHistory.ToList();
        history.Add(new ScheduleChange(
            Rate,
            Rate,
            AreaBasis,
            changedByUserId.Trim(),
            changedByUserName.Trim(),
            reason.Trim(),
            DateTime.UtcNow));

        IsActive = isActive;
        if (isActive)
        {
            ActiveFromDate = effectiveDueDate;
            InactiveFromDate = null;
            NextDueDate = effectiveDueDate;
        }
        else
        {
            InactiveFromDate = effectiveDueDate;
            if (NextDueDate.Date >= effectiveDueDate.Date)
                NextDueDate = effectiveDueDate;
        }
        ChangeHistory = history;
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

    public bool AppliesToDueDate(DateTime dueDateUtc)
    {
        if (dueDateUtc.Date < ActiveFromDate.Date)
            return false;
        if (dueDateUtc.Date > ActiveUntilDate.Date)
            return false;

        return InactiveFromDate is null || dueDateUtc.Date < InactiveFromDate.Value.Date;
    }

    public bool IsEffectiveOn(DateTime asOfUtc) => AppliesToDueDate(asOfUtc.Date);

    public DateTime ScheduleWindowEndDate()
    {
        var inactiveEnd = InactiveFromDate?.Date.AddDays(-1);
        return inactiveEnd.HasValue && inactiveEnd.Value < ActiveUntilDate.Date
            ? inactiveEnd.Value
            : ActiveUntilDate.Date;
    }

    private DateTime AdvanceDate(DateTime current) =>
        Frequency switch
        {
            FeeFrequency.Monthly => current.AddMonths(1),
            FeeFrequency.Quarterly => current.AddMonths(3),
            FeeFrequency.Annual => current.AddYears(1),
            _ => current.AddMonths(1)
        };

    public DateTime NextCycleAfterEndDate() => AdvanceDate(ActiveUntilDate);

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

    private static void ValidateScheduleMonth(int month, string paramName)
    {
        if (month < 1 || month > 12)
            throw new ArgumentOutOfRangeException(paramName, "Month must be between 1 and 12.");
    }

    private static void ValidateScheduleYear(int year, string paramName)
    {
        if (year < 2000 || year > 2100)
            throw new ArgumentOutOfRangeException(paramName, "Year must be between 2000 and 2100.");
    }

    private static DateTime BuildDueDate(int year, int month, int dueDay)
        => new(year, month, dueDay, 0, 0, 0, DateTimeKind.Utc);
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

public sealed class MaintenanceChargeGridView : BaseEntity
{
    public sealed record GridProof(string ProofUrl, string? Notes, string SubmittedByUserId, DateTime SubmittedAt);
    public sealed record GridCharge(
        string ChargeId,
        string ScheduleId,
        string ScheduleName,
        decimal Amount,
        string Status,
        DateTime DueDate,
        DateTime? PaidAt,
        string? PaymentMethod,
        string? TransactionReference,
        string? ReceiptUrl,
        string? Notes,
        IReadOnlyList<GridProof> Proofs);
    public sealed record GridCell(int Month, int Year, IReadOnlyList<GridCharge> Charges);
    public sealed record GridRow(
        string ApartmentId,
        string ApartmentNumber,
        string BlockName,
        int FloorNumber,
        string? ResidentName,
        IReadOnlyList<GridCell> Cells);

    public int FinancialYearStart { get; private set; }
    public DateTime PeriodStartUtc { get; private set; }
    public DateTime PeriodEndUtc { get; private set; }
    public IReadOnlyList<int> Months { get; private set; } = [];
    public IReadOnlyList<GridRow> Rows { get; private set; } = [];

    private MaintenanceChargeGridView() { }

    public static MaintenanceChargeGridView Create(
        string societyId,
        int financialYearStart,
        DateTime periodStartUtc,
        DateTime periodEndUtc,
        IReadOnlyList<int> months,
        IReadOnlyList<GridRow> rows)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));

        return new MaintenanceChargeGridView
        {
            Id = BuildId(financialYearStart),
            SocietyId = societyId,
            FinancialYearStart = financialYearStart,
            PeriodStartUtc = periodStartUtc,
            PeriodEndUtc = periodEndUtc,
            Months = months.ToList(),
            Rows = rows.ToList()
        };
    }

    public void Refresh(DateTime periodStartUtc, DateTime periodEndUtc, IReadOnlyList<int> months, IReadOnlyList<GridRow> rows)
    {
        PeriodStartUtc = periodStartUtc;
        PeriodEndUtc = periodEndUtc;
        Months = months.ToList();
        Rows = rows.ToList();
        TouchUpdatedAt();
    }

    public static string BuildId(int financialYearStart) => $"maintenance-grid-{financialYearStart}";
}
