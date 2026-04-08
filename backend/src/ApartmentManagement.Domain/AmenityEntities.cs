using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Domain.Entities;

/// <summary>A bookable amenity (gym, pool, clubhouse, etc.) within a society.</summary>
public sealed class Amenity : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public int Capacity { get; private set; }
    public string Rules { get; private set; } = string.Empty;
    public bool IsActive { get; private set; }
    public int BookingSlotMinutes { get; private set; }
    public TimeOnly OperatingStart { get; private set; }
    public TimeOnly OperatingEnd { get; private set; }
    public int AdvanceBookingDays { get; private set; }

    private Amenity() { }

    public static Amenity Create(string societyId, string name, string description, int capacity,
        string rules, int bookingSlotMinutes, TimeOnly operatingStart, TimeOnly operatingEnd, int advanceBookingDays)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        if (capacity < 1) throw new ArgumentOutOfRangeException(nameof(capacity), "Capacity must be at least 1.");
        if (bookingSlotMinutes < 15) throw new ArgumentOutOfRangeException(nameof(bookingSlotMinutes), "Slot must be at least 15 minutes.");
        if (advanceBookingDays < 1) throw new ArgumentOutOfRangeException(nameof(advanceBookingDays), "Must allow at least 1 day in advance.");

        return new Amenity
        {
            SocietyId = societyId,
            Name = name.Trim(),
            Description = description,
            Capacity = capacity,
            Rules = rules,
            IsActive = true,
            BookingSlotMinutes = bookingSlotMinutes,
            OperatingStart = operatingStart,
            OperatingEnd = operatingEnd,
            AdvanceBookingDays = advanceBookingDays
        };
    }

    public void Activate() { IsActive = true; TouchUpdatedAt(); }
    public void Deactivate() { IsActive = false; TouchUpdatedAt(); }

    public void Update(string name, string description, int capacity, string rules,
        int bookingSlotMinutes, TimeOnly operatingStart, TimeOnly operatingEnd, int advanceBookingDays)
    {
        if (!string.IsNullOrWhiteSpace(name)) Name = name.Trim();
        Description = description;
        if (capacity > 0) Capacity = capacity;
        Rules = rules;
        if (bookingSlotMinutes >= 15) BookingSlotMinutes = bookingSlotMinutes;
        OperatingStart = operatingStart;
        OperatingEnd = operatingEnd;
        if (advanceBookingDays > 0) AdvanceBookingDays = advanceBookingDays;
        TouchUpdatedAt();
    }

    /// <summary>Checks whether <paramref name="time"/> falls within operating hours.</summary>
    public bool IsWithinOperatingHours(TimeOnly time) =>
        time >= OperatingStart && time <= OperatingEnd;
}

/// <summary>A booking of an amenity for a specific time slot.</summary>
public sealed class AmenityBooking : BaseEntity
{
    public string AmenityId { get; private set; } = string.Empty;
    public string AmenityName { get; private set; } = string.Empty;
    public string BookedByUserId { get; private set; } = string.Empty;
    public string BookedByApartmentId { get; private set; } = string.Empty;
    public DateTime StartTime { get; private set; }
    public DateTime EndTime { get; private set; }
    public BookingStatus Status { get; private set; }
    public string? AdminNotes { get; private set; }

    /// <summary>Duration of the booked slot.</summary>
    public TimeSpan Duration => EndTime - StartTime;

    private AmenityBooking() { }

    /// <summary>Creates a booking with <see cref="BookingStatus.Pending"/> status.</summary>
    public static AmenityBooking Create(string societyId, string amenityId, string amenityName,
        string userId, string apartmentId, DateTime startTime, DateTime endTime)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(amenityId, nameof(amenityId));
        if (endTime <= startTime) throw new ArgumentException("End time must be after start time.");

        var booking = new AmenityBooking
        {
            SocietyId = societyId,
            AmenityId = amenityId,
            AmenityName = amenityName,
            BookedByUserId = userId,
            BookedByApartmentId = apartmentId,
            StartTime = startTime,
            EndTime = endTime,
            Status = BookingStatus.Pending
        };
        booking.AddDomainEvent(new BookingCreatedEvent(booking.Id, societyId, amenityId, userId, startTime, endTime));
        return booking;
    }

    public void Approve(string? notes = null)
    {
        Status = BookingStatus.Approved;
        AdminNotes = notes;
        TouchUpdatedAt();
        AddDomainEvent(new BookingStatusChangedEvent(Id, SocietyId, BookingStatus.Approved.ToString()));
    }

    public void Reject(string? notes = null)
    {
        Status = BookingStatus.Rejected;
        AdminNotes = notes;
        TouchUpdatedAt();
        AddDomainEvent(new BookingStatusChangedEvent(Id, SocietyId, BookingStatus.Rejected.ToString()));
    }

    public void Cancel()
    {
        Status = BookingStatus.Cancelled;
        TouchUpdatedAt();
        AddDomainEvent(new BookingStatusChangedEvent(Id, SocietyId, BookingStatus.Cancelled.ToString()));
    }

    public void Complete() { Status = BookingStatus.Completed; TouchUpdatedAt(); }

    /// <summary>Returns true if this booking overlaps with the given time range.</summary>
    public bool IsOverlapping(DateTime start, DateTime end) =>
        Status is not (BookingStatus.Rejected or BookingStatus.Cancelled) &&
        StartTime < end && EndTime > start;

    /// <summary>Returns true if this booking overlaps with <paramref name="other"/>.</summary>
    public bool IsOverlapping(AmenityBooking other) => IsOverlapping(other.StartTime, other.EndTime);
}
