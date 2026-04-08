using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Domain.Entities;

/// <summary>Visitor log entry representing a single visit to the society.</summary>
public sealed class VisitorLog : BaseEntity
{
    public string VisitorName { get; private set; } = string.Empty;
    public string VisitorPhone { get; private set; } = string.Empty;
    public string? VisitorEmail { get; private set; }
    public string Purpose { get; private set; } = string.Empty;
    public string HostApartmentId { get; private set; } = string.Empty;
    public string HostUserId { get; private set; } = string.Empty;
    public DateTime? CheckInTime { get; private set; }
    public DateTime? CheckOutTime { get; private set; }
    public VisitorStatus Status { get; private set; }
    public string QrCode { get; private set; } = string.Empty;
    public string PassCode { get; private set; } = string.Empty;
    public string? VehicleNumber { get; private set; }

    /// <summary>Duration of the visit, available after checkout.</summary>
    public TimeSpan? Duration => CheckOutTime.HasValue && CheckInTime.HasValue
        ? CheckOutTime.Value - CheckInTime.Value
        : null;

    private static readonly Random _rng = new();

    private VisitorLog() { }

    /// <summary>Registers a new visitor with a generated pass code.</summary>
    public static VisitorLog Create(string societyId, string visitorName, string visitorPhone,
        string? visitorEmail, string purpose, string hostApartmentId, string hostUserId,
        string? vehicleNumber = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(visitorName, nameof(visitorName));
        ArgumentException.ThrowIfNullOrWhiteSpace(visitorPhone, nameof(visitorPhone));
        ArgumentException.ThrowIfNullOrWhiteSpace(purpose, nameof(purpose));
        ArgumentException.ThrowIfNullOrWhiteSpace(hostApartmentId, nameof(hostApartmentId));

        var log = new VisitorLog
        {
            SocietyId = societyId,
            VisitorName = visitorName.Trim(),
            VisitorPhone = visitorPhone.Trim(),
            VisitorEmail = visitorEmail?.Trim(),
            Purpose = purpose.Trim(),
            HostApartmentId = hostApartmentId,
            HostUserId = hostUserId,
            VehicleNumber = vehicleNumber?.Trim().ToUpperInvariant(),
            Status = VisitorStatus.Pending,
            PassCode = GeneratePassCode(),
            QrCode = $"VIS-{Guid.NewGuid():N}" // Will be replaced by QR code service
        };
        log.AddDomainEvent(new VisitorArrivedEvent(log.Id, societyId, hostApartmentId, visitorName));
        return log;
    }

    private static string GeneratePassCode() =>
        _rng.Next(100_000, 999_999).ToString();

    public void Approve() { Status = VisitorStatus.Approved; TouchUpdatedAt(); }
    public void Deny() { Status = VisitorStatus.Denied; TouchUpdatedAt(); }

    public void CheckIn()
    {
        if (Status != VisitorStatus.Approved)
            throw new InvalidOperationException("Visitor must be approved before check-in.");
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

    public void UpdateQrCode(string qrCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(qrCode, nameof(qrCode));
        QrCode = qrCode;
        TouchUpdatedAt();
    }
}
