using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Domain.Entities;

/// <summary>Visitor log entry representing a single visit to the society.</summary>
public sealed class VisitorLog : BaseEntity
{
    public string VisitorName { get; private set; } = string.Empty;
    public string VisitorPhone { get; private set; } = string.Empty;
    public string? VisitorEmail { get; private set; }
    public string? CompanyName { get; private set; }
    public string Purpose { get; private set; } = string.Empty;
    public string HostApartmentId { get; private set; } = string.Empty;
    public string HostUserId { get; private set; } = string.Empty;
    public string HostResidentName { get; private set; } = string.Empty;
    public string HostBlockName { get; private set; } = string.Empty;
    public int HostFloorNumber { get; private set; }
    public string HostFlatNumber { get; private set; } = string.Empty;
    public bool IsPreApproved { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public DateTime? CheckInTime { get; private set; }
    public DateTime? CheckOutTime { get; private set; }
    public VisitorStatus Status { get; private set; }
    public string QrCode { get; private set; } = string.Empty;
    public string PassCode { get; private set; } = string.Empty;
    public string? VehicleNumber { get; private set; }
    public DateTime? ValidUntil { get; private set; }
    public string? VisitorImageUrl { get; private set; }

    /// <summary>Duration of the visit, available after checkout.</summary>
    public TimeSpan? Duration => CheckOutTime.HasValue && CheckInTime.HasValue
        ? CheckOutTime.Value - CheckInTime.Value
        : null;

    public bool IsPassExpired => ValidUntil.HasValue && DateTime.UtcNow > ValidUntil.Value;

    private static readonly Random _rng = new();

    private VisitorLog() { }

    /// <summary>Registers a new visitor with a generated pass code.</summary>
    public static VisitorLog Create(
        string societyId,
        string visitorName,
        string visitorPhone,
        string? visitorEmail,
        string? companyName,
        string purpose,
        string hostApartmentId,
        string hostUserId,
        string hostResidentName,
        string hostBlockName,
        int hostFloorNumber,
        string hostFlatNumber,
        bool isPreApproved,
        string? vehicleNumber = null,
        DateTime? validUntil = null,
        string? visitorImageUrl = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(visitorName, nameof(visitorName));
        ArgumentException.ThrowIfNullOrWhiteSpace(visitorPhone, nameof(visitorPhone));
        ArgumentException.ThrowIfNullOrWhiteSpace(purpose, nameof(purpose));
        ArgumentException.ThrowIfNullOrWhiteSpace(hostApartmentId, nameof(hostApartmentId));
        ArgumentException.ThrowIfNullOrWhiteSpace(hostResidentName, nameof(hostResidentName));
        ArgumentException.ThrowIfNullOrWhiteSpace(hostBlockName, nameof(hostBlockName));
        ArgumentException.ThrowIfNullOrWhiteSpace(hostFlatNumber, nameof(hostFlatNumber));

        var log = new VisitorLog
        {
            SocietyId = societyId,
            VisitorName = visitorName.Trim(),
            VisitorPhone = visitorPhone.Trim(),
            VisitorEmail = visitorEmail?.Trim(),
            CompanyName = string.IsNullOrWhiteSpace(companyName) ? null : companyName.Trim(),
            Purpose = purpose.Trim(),
            HostApartmentId = hostApartmentId,
            HostUserId = hostUserId,
            HostResidentName = hostResidentName.Trim(),
            HostBlockName = hostBlockName.Trim().ToUpperInvariant(),
            HostFloorNumber = hostFloorNumber,
            HostFlatNumber = hostFlatNumber.Trim().ToUpperInvariant(),
            IsPreApproved = isPreApproved,
            ApprovedAt = isPreApproved ? DateTime.UtcNow : null,
            VehicleNumber = vehicleNumber?.Trim().ToUpperInvariant(),
            Status = isPreApproved ? VisitorStatus.Approved : VisitorStatus.Pending,
            PassCode = GeneratePassCode(),
            QrCode = $"VIS-{Guid.NewGuid():N}", // Will be replaced by QR code service
            ValidUntil = validUntil,
            VisitorImageUrl = string.IsNullOrWhiteSpace(visitorImageUrl) ? null : visitorImageUrl.Trim()
        };
        log.AddDomainEvent(new VisitorArrivedEvent(log.Id, societyId, hostApartmentId, visitorName));
        return log;
    }

    private static string GeneratePassCode() =>
        _rng.Next(100_000, 999_999).ToString();

    public void Approve()
    {
        Status = VisitorStatus.Approved;
        ApprovedAt ??= DateTime.UtcNow;
        TouchUpdatedAt();
    }
    public void Deny() { Status = VisitorStatus.Denied; TouchUpdatedAt(); }

    public void CheckIn()
    {
        if (Status != VisitorStatus.Approved)
            throw new InvalidOperationException("Visitor must be approved before check-in.");
        if (IsPassExpired)
            throw new InvalidOperationException("Visitor pass has expired and can no longer be used for check-in.");
        Status = VisitorStatus.CheckedIn;
        CheckInTime = DateTime.UtcNow;
        TouchUpdatedAt();
    }

    public void CheckOut()
    {
        if (Status != VisitorStatus.CheckedIn)
            throw new InvalidOperationException("Visitor must be checked in before check-out.");
        Status = VisitorStatus.CheckedOut;
        CheckOutTime = DateTime.UtcNow;
        TouchUpdatedAt();
    }

    /// <summary>
    /// True while a pre-approved visitor's pass is still valid. A valid pass overrides the
    /// society's overstay threshold — the visitor was explicitly authorized for that duration.
    /// </summary>
    public bool HasValidPass(DateTime? nowUtc = null) =>
        IsPreApproved && ValidUntil.HasValue && (nowUtc ?? DateTime.UtcNow) <= ValidUntil.Value;

    /// <summary>True when the visitor is still checked in past the society's overstay threshold.</summary>
    public bool IsOverstaying(int thresholdHours, DateTime? nowUtc = null) =>
        Status == VisitorStatus.CheckedIn &&
        CheckInTime.HasValue &&
        !HasValidPass(nowUtc) &&
        (nowUtc ?? DateTime.UtcNow) - CheckInTime.Value > TimeSpan.FromHours(thresholdHours);

    public void UpdateQrCode(string qrCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(qrCode, nameof(qrCode));
        QrCode = qrCode;
        TouchUpdatedAt();
    }

    public void UpdateVisitorImageUrl(string imageUrl)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(imageUrl, nameof(imageUrl));
        VisitorImageUrl = imageUrl.Trim();
        TouchUpdatedAt();
    }
}
