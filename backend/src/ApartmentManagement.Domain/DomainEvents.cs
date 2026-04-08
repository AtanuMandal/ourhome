namespace ApartmentManagement.Domain.Events;

/// <summary>Marker interface for all domain events.</summary>
public interface IDomainEvent
{
    Guid EventId { get; }
    DateTime OccurredAt { get; }
    string SocietyId { get; }
}

/// <summary>Abstract base for domain events.</summary>
public abstract record DomainEvent(string SocietyId) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

// ── Society ──────────────────────────────────────────────────────────────────
public record SocietyCreatedEvent(string SocietyId, string SocietyName) : DomainEvent(SocietyId);

// ── Apartment ─────────────────────────────────────────────────────────────────
public record ApartmentCreatedEvent(string ApartmentId, string SocietyId, string ApartmentNumber)
    : DomainEvent(SocietyId);

// ── User ──────────────────────────────────────────────────────────────────────
public record ResidentOnboardedEvent(string UserId, string SocietyId, string? ApartmentId, string UserRole)
    : DomainEvent(SocietyId);

// ── Amenity Booking ───────────────────────────────────────────────────────────
public record BookingCreatedEvent(string BookingId, string SocietyId, string AmenityId, string UserId,
    DateTime StartTime, DateTime EndTime) : DomainEvent(SocietyId);

public record BookingStatusChangedEvent(string BookingId, string SocietyId, string NewStatus)
    : DomainEvent(SocietyId);

// ── Complaint ─────────────────────────────────────────────────────────────────
public record ComplaintCreatedEvent(string ComplaintId, string SocietyId, string ApartmentId, string Category)
    : DomainEvent(SocietyId);

public record ComplaintStatusChangedEvent(string ComplaintId, string SocietyId, string NewStatus,
    string? AssignedToUserId) : DomainEvent(SocietyId);

// ── Notice ────────────────────────────────────────────────────────────────────
public record NoticePostedEvent(string NoticeId, string SocietyId, string Category, string Title)
    : DomainEvent(SocietyId);

// ── Visitor ───────────────────────────────────────────────────────────────────
public record VisitorArrivedEvent(string VisitorLogId, string SocietyId, string HostApartmentId,
    string VisitorName) : DomainEvent(SocietyId);

// ── Fee ───────────────────────────────────────────────────────────────────────
public record FeePaymentDueEvent(string FeeScheduleId, string SocietyId, string ApartmentId,
    decimal Amount, DateTime DueDate) : DomainEvent(SocietyId);

public record FeePaymentReceivedEvent(string PaymentId, string SocietyId, string ApartmentId,
    decimal Amount) : DomainEvent(SocietyId);

// ── Gamification ─────────────────────────────────────────────────────────────
public record PointsAwardedEvent(string UserId, string SocietyId, int Points, string Reason)
    : DomainEvent(SocietyId);
