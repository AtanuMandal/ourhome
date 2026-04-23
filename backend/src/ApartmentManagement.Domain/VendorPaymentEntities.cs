using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.ValueObjects;

namespace ApartmentManagement.Domain.Entities;

public sealed class Vendor : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public Address Address { get; private set; } = new(string.Empty, string.Empty, string.Empty, string.Empty, string.Empty);
    public string? PictureUrl { get; private set; }
    public string ContactFirstName { get; private set; } = string.Empty;
    public string ContactLastName { get; private set; } = string.Empty;
    public string ContactPhone { get; private set; } = string.Empty;
    public string ContactEmail { get; private set; } = string.Empty;
    public string Overview { get; private set; } = string.Empty;
    public DateTime ValidUptoDate { get; private set; }
    public int PaymentDueDays { get; private set; }
    public string? GeographicServiceArea { get; private set; }
    public string? BusinessType { get; private set; }
    public string? ContractUrl { get; private set; }
    public bool IsActive { get; private set; }

    private Vendor() { }

    public static Vendor Create(
        string societyId,
        string name,
        Address address,
        string? pictureUrl,
        string contactFirstName,
        string contactLastName,
        string contactPhone,
        string contactEmail,
        string overview,
        DateTime validUptoDate,
        int paymentDueDays,
        string? geographicServiceArea,
        string? businessType,
        string? contractUrl)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        ArgumentException.ThrowIfNullOrWhiteSpace(contactFirstName, nameof(contactFirstName));
        ArgumentException.ThrowIfNullOrWhiteSpace(contactLastName, nameof(contactLastName));
        ArgumentException.ThrowIfNullOrWhiteSpace(contactPhone, nameof(contactPhone));
        ArgumentException.ThrowIfNullOrWhiteSpace(contactEmail, nameof(contactEmail));
        ArgumentException.ThrowIfNullOrWhiteSpace(overview, nameof(overview));

        address.Validate();
        ValidateContactEmail(contactEmail);
        ValidatePaymentDueDays(paymentDueDays);
        var normalizedValidUptoDate = NormalizeUtcDate(validUptoDate, nameof(validUptoDate));

        if (normalizedValidUptoDate < DateTime.UtcNow.Date)
            throw new ArgumentOutOfRangeException(nameof(validUptoDate), "Vendor validity must be today or later.");

        return new Vendor
        {
            SocietyId = societyId,
            Name = name.Trim(),
            Address = address,
            PictureUrl = NormalizeOptional(pictureUrl),
            ContactFirstName = contactFirstName.Trim(),
            ContactLastName = contactLastName.Trim(),
            ContactPhone = contactPhone.Trim(),
            ContactEmail = contactEmail.Trim(),
            Overview = overview.Trim(),
            ValidUptoDate = normalizedValidUptoDate,
            PaymentDueDays = paymentDueDays,
            GeographicServiceArea = NormalizeOptional(geographicServiceArea),
            BusinessType = NormalizeOptional(businessType),
            ContractUrl = NormalizeOptional(contractUrl),
            IsActive = true
        };
    }

    public void Update(
        string name,
        Address address,
        string? pictureUrl,
        string contactFirstName,
        string contactLastName,
        string contactPhone,
        string contactEmail,
        string overview,
        DateTime validUptoDate,
        int paymentDueDays,
        string? geographicServiceArea,
        string? businessType,
        string? contractUrl,
        bool isActive)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        ArgumentException.ThrowIfNullOrWhiteSpace(contactFirstName, nameof(contactFirstName));
        ArgumentException.ThrowIfNullOrWhiteSpace(contactLastName, nameof(contactLastName));
        ArgumentException.ThrowIfNullOrWhiteSpace(contactPhone, nameof(contactPhone));
        ArgumentException.ThrowIfNullOrWhiteSpace(contactEmail, nameof(contactEmail));
        ArgumentException.ThrowIfNullOrWhiteSpace(overview, nameof(overview));

        address.Validate();
        ValidateContactEmail(contactEmail);
        ValidatePaymentDueDays(paymentDueDays);
        var normalizedValidUptoDate = NormalizeUtcDate(validUptoDate, nameof(validUptoDate));

        Name = name.Trim();
        Address = address;
        PictureUrl = NormalizeOptional(pictureUrl);
        ContactFirstName = contactFirstName.Trim();
        ContactLastName = contactLastName.Trim();
        ContactPhone = contactPhone.Trim();
        ContactEmail = contactEmail.Trim();
        Overview = overview.Trim();
        ValidUptoDate = normalizedValidUptoDate;
        PaymentDueDays = paymentDueDays;
        GeographicServiceArea = NormalizeOptional(geographicServiceArea);
        BusinessType = NormalizeOptional(businessType);
        ContractUrl = NormalizeOptional(contractUrl);
        IsActive = isActive;
        TouchUpdatedAt();
    }

    private static void ValidatePaymentDueDays(int paymentDueDays)
    {
        if (paymentDueDays < 0 || paymentDueDays > 180)
            throw new ArgumentOutOfRangeException(nameof(paymentDueDays), "Payment due days must be between 0 and 180.");
    }

    private static void ValidateContactEmail(string contactEmail)
    {
        if (!contactEmail.Contains('@', StringComparison.Ordinal))
            throw new ArgumentException("Contact email is invalid.", nameof(contactEmail));
    }

    public static DateTime NormalizeUtcDate(DateTime value, string parameterName)
    {
        if (value == default)
            throw new ArgumentOutOfRangeException(parameterName, "Date is required.");

        return DateTime.SpecifyKind(value.Date, DateTimeKind.Utc);
    }

    public static DateTime NormalizeUtcMonthStart(DateTime value, string parameterName)
    {
        var normalizedDate = NormalizeUtcDate(value, parameterName);
        return new DateTime(normalizedDate.Year, normalizedDate.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    public static DateTime NormalizeUtcMonthEnd(DateTime value, string parameterName)
    {
        var normalizedMonthStart = NormalizeUtcMonthStart(value, parameterName);
        return normalizedMonthStart.AddMonths(1).AddDays(-1);
    }

    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class VendorRecurringSchedule : BaseEntity
{
    public string VendorId { get; private set; } = string.Empty;
    public VendorPaymentFrequency Frequency { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime? EndDate { get; private set; }
    public DateTime? InactiveFromDate { get; private set; }
    public DateTime NextChargeDate { get; private set; }
    public string? Label { get; private set; }
    public bool IsActive { get; private set; }

    private VendorRecurringSchedule() { }

    public static VendorRecurringSchedule Create(
        string societyId,
        string vendorId,
        VendorPaymentFrequency frequency,
        decimal amount,
        DateTime startDate,
        DateTime? endDate,
        string? label)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(vendorId, nameof(vendorId));
        ValidateAmount(amount);

        var normalizedStartDate = Vendor.NormalizeUtcMonthStart(startDate, nameof(startDate));
        DateTime? normalizedEndDate = endDate is null ? null : Vendor.NormalizeUtcMonthEnd(endDate.Value, nameof(endDate));

        if (normalizedEndDate.HasValue && normalizedEndDate.Value < normalizedStartDate)
            throw new ArgumentOutOfRangeException(nameof(endDate), "Schedule end date must be on or after the start date.");

        return new VendorRecurringSchedule
        {
            SocietyId = societyId,
            VendorId = vendorId.Trim(),
            Frequency = frequency,
            Amount = decimal.Round(amount, 2, MidpointRounding.AwayFromZero),
            StartDate = normalizedStartDate,
            EndDate = normalizedEndDate,
            NextChargeDate = normalizedStartDate,
            Label = string.IsNullOrWhiteSpace(label) ? null : label.Trim(),
            IsActive = true
        };
    }

    public void UpdateWindow(DateTime? endDate, DateTime? inactiveFromDate)
    {
        if (endDate is null && inactiveFromDate is null)
            throw new ArgumentException("Either end date or inactive-from date must be provided.");

        DateTime? normalizedEndDate = endDate is null ? EndDate : Vendor.NormalizeUtcMonthEnd(endDate.Value, nameof(endDate));
        DateTime? normalizedInactiveFromDate = inactiveFromDate is null ? InactiveFromDate : Vendor.NormalizeUtcMonthStart(inactiveFromDate.Value, nameof(inactiveFromDate));

        if (normalizedEndDate.HasValue && normalizedEndDate.Value < StartDate)
            throw new ArgumentOutOfRangeException(nameof(endDate), "Schedule end date must be on or after the start date.");

        if (normalizedInactiveFromDate.HasValue && normalizedInactiveFromDate.Value < StartDate)
            throw new ArgumentOutOfRangeException(nameof(inactiveFromDate), "Inactive-from date must be on or after the start date.");

        EndDate = normalizedEndDate;
        InactiveFromDate = normalizedInactiveFromDate;
        var today = DateTime.UtcNow.Date;
        IsActive = (!normalizedEndDate.HasValue || normalizedEndDate.Value.Date >= today)
            && (!normalizedInactiveFromDate.HasValue || normalizedInactiveFromDate.Value.Date > today);
        TouchUpdatedAt();
    }

    public bool AppliesTo(DateTime effectiveDateUtc)
    {
        var effectiveDate = effectiveDateUtc.Date;
        if (effectiveDate < StartDate.Date)
            return false;

        if (EndDate.HasValue && effectiveDate > EndDate.Value.Date)
            return false;

        if (InactiveFromDate.HasValue && effectiveDate >= InactiveFromDate.Value.Date)
            return false;

        return true;
    }

    public void AdvanceNextChargeDate()
    {
        NextChargeDate = AdvanceDate(NextChargeDate);
        TouchUpdatedAt();
    }

    public decimal MonthlyEquivalentAmount() =>
        decimal.Round(AnnualEquivalentAmount() / 12m, 2, MidpointRounding.AwayFromZero);

    public decimal AnnualEquivalentAmount() =>
        Frequency switch
        {
            VendorPaymentFrequency.Weekly => Amount * 52m,
            VendorPaymentFrequency.BiWeekly => Amount * 26m,
            VendorPaymentFrequency.Monthly => Amount * 12m,
            VendorPaymentFrequency.Quarterly => Amount * 4m,
            VendorPaymentFrequency.Yearly => Amount,
            _ => Amount
        };

    public DateTime AdvanceDate(DateTime currentDate) =>
        Frequency switch
        {
            VendorPaymentFrequency.Weekly => currentDate.AddDays(7),
            VendorPaymentFrequency.BiWeekly => currentDate.AddDays(14),
            VendorPaymentFrequency.Monthly => currentDate.AddMonths(1),
            VendorPaymentFrequency.Quarterly => currentDate.AddMonths(3),
            VendorPaymentFrequency.Yearly => currentDate.AddYears(1),
            _ => currentDate.AddMonths(1)
        };

    private static void ValidateAmount(decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than zero.");
    }
}

public sealed class VendorCharge : BaseEntity
{
    public string VendorId { get; private set; } = string.Empty;
    public string VendorName { get; private set; } = string.Empty;
    public string? ScheduleId { get; private set; }
    public VendorChargeType ChargeType { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public DateTime EffectiveDate { get; private set; }
    public int ChargeYear { get; private set; }
    public int ChargeMonth { get; private set; }
    public decimal Amount { get; private set; }
    public DateTime DueDate { get; private set; }
    public PaymentStatus Status { get; private set; }
    public DateTime? PaidAt { get; private set; }
    public string? PaymentMethod { get; private set; }
    public string? TransactionReference { get; private set; }
    public string? ReceiptUrl { get; private set; }
    public string? Notes { get; private set; }
    public DateTime? OverdueNotificationSentAt { get; private set; }
    public bool IsActive { get; private set; }
    public bool IsDeleted { get; private set; }

    private VendorCharge() { }

    public static VendorCharge CreateRecurring(
        string societyId,
        string vendorId,
        string vendorName,
        string scheduleId,
        decimal amount,
        DateTime effectiveDate,
        int paymentDueDays,
        string? description)
        => Create(
            societyId,
            vendorId,
            vendorName,
            scheduleId,
            VendorChargeType.Recurring,
            amount,
            effectiveDate,
            paymentDueDays,
            description);

    public static VendorCharge CreateAdHoc(
        string societyId,
        string vendorId,
        string vendorName,
        decimal amount,
        DateTime effectiveDate,
        int paymentDueDays,
        string? description)
        => Create(
            societyId,
            vendorId,
            vendorName,
            null,
            VendorChargeType.AdHoc,
            amount,
            Vendor.NormalizeUtcMonthStart(effectiveDate, nameof(effectiveDate)),
            paymentDueDays,
            description);

    public void RefreshRecurringCharge(string vendorName, decimal amount, DateTime effectiveDate, int paymentDueDays, string? description)
    {
        if (ChargeType != VendorChargeType.Recurring)
            throw new InvalidOperationException("Only recurring charges can be refreshed.");

        if (Status == PaymentStatus.Paid || IsDeleted)
            return;

        Amount = decimal.Round(amount, 2, MidpointRounding.AwayFromZero);
        EffectiveDate = Vendor.NormalizeUtcDate(effectiveDate, nameof(effectiveDate));
        DueDate = EffectiveDate.AddDays(paymentDueDays);
        ChargeYear = EffectiveDate.Year;
        ChargeMonth = EffectiveDate.Month;
        VendorName = vendorName.Trim();
        Description = BuildDescription(description, ChargeType);
        Status = PaymentStatus.Pending;
        IsActive = true;
        TouchUpdatedAt();
    }

    public void MarkPaid(DateTime paymentDate, string paymentMethod, string? transactionReference, string? receiptUrl, string? notes)
    {
        if (paymentDate == default)
            throw new ArgumentOutOfRangeException(nameof(paymentDate), "Payment date is required.");
        ArgumentException.ThrowIfNullOrWhiteSpace(paymentMethod, nameof(paymentMethod));
        ArgumentException.ThrowIfNullOrWhiteSpace(receiptUrl, nameof(receiptUrl));

        Status = PaymentStatus.Paid;
        PaidAt = Vendor.NormalizeUtcDate(paymentDate, nameof(paymentDate));
        PaymentMethod = paymentMethod.Trim();
        TransactionReference = string.IsNullOrWhiteSpace(transactionReference) ? null : transactionReference.Trim();
        ReceiptUrl = receiptUrl.Trim();
        Notes = string.IsNullOrWhiteSpace(notes) ? Notes : notes.Trim();
        TouchUpdatedAt();
    }

    public void Inactivate()
    {
        if (IsDeleted)
            return;

        IsActive = false;
        TouchUpdatedAt();
    }

    public void Activate()
    {
        if (IsDeleted)
            return;

        IsActive = true;
        TouchUpdatedAt();
    }

    public void SoftDelete()
    {
        IsDeleted = true;
        IsActive = false;
        TouchUpdatedAt();
    }

    public bool IsOverdue(DateTime asOfUtc) =>
        IsActive && !IsDeleted && Status != PaymentStatus.Paid && DueDate.Date < asOfUtc.Date;

    public void MarkOverdueNotificationSent()
    {
        OverdueNotificationSentAt = DateTime.UtcNow;
        TouchUpdatedAt();
    }

    private static VendorCharge Create(
        string societyId,
        string vendorId,
        string vendorName,
        string? scheduleId,
        VendorChargeType chargeType,
        decimal amount,
        DateTime effectiveDate,
        int paymentDueDays,
        string? description)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(vendorId, nameof(vendorId));
        ArgumentException.ThrowIfNullOrWhiteSpace(vendorName, nameof(vendorName));
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than zero.");
        if (paymentDueDays < 0 || paymentDueDays > 180)
            throw new ArgumentOutOfRangeException(nameof(paymentDueDays), "Payment due days must be between 0 and 180.");

        var normalizedEffectiveDate = Vendor.NormalizeUtcDate(effectiveDate, nameof(effectiveDate));

        return new VendorCharge
        {
            SocietyId = societyId,
            VendorId = vendorId.Trim(),
            VendorName = vendorName.Trim(),
            ScheduleId = string.IsNullOrWhiteSpace(scheduleId) ? null : scheduleId.Trim(),
            ChargeType = chargeType,
            Description = BuildDescription(description, chargeType),
            EffectiveDate = normalizedEffectiveDate,
            ChargeYear = normalizedEffectiveDate.Year,
            ChargeMonth = normalizedEffectiveDate.Month,
            Amount = decimal.Round(amount, 2, MidpointRounding.AwayFromZero),
            DueDate = normalizedEffectiveDate.AddDays(paymentDueDays),
            Status = PaymentStatus.Pending,
            IsActive = true,
            IsDeleted = false
        };
    }

    private static string BuildDescription(string? description, VendorChargeType chargeType)
    {
        if (!string.IsNullOrWhiteSpace(description))
            return description.Trim();

        return chargeType == VendorChargeType.Recurring ? "Recurring vendor cost" : "One-time vendor cost";
    }
}
