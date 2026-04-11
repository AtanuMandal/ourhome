using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Domain.Entities;

/// <summary>Represents a single apartment unit within a society.</summary>
public sealed class Apartment : BaseEntity
{
    public string ApartmentNumber { get; private set; } = string.Empty;
    public string BlockName { get; private set; } = string.Empty;
    public int FloorNumber { get; private set; }
    public int NumberOfRooms { get; private set; }
    public IReadOnlyList<string> ParkingSlots { get; private set; } = [];
    public ApartmentStatus Status { get; private set; }
    public string? OwnerId { get; private set; }
    public string? TenantId { get; private set; }

    private Apartment() { }

    /// <summary>Creates a new apartment in <see cref="ApartmentStatus.Available"/> status.</summary>
    public static Apartment Create(
        string societyId, string apartmentNumber, string blockName,
        int floorNumber, int numberOfRooms, IReadOnlyList<string>? parkingSlots)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(apartmentNumber, nameof(apartmentNumber));
        ArgumentException.ThrowIfNullOrWhiteSpace(blockName, nameof(blockName));
        if (numberOfRooms < 1) throw new ArgumentOutOfRangeException(nameof(numberOfRooms), "Must be at least 1.");

        var normalizedParkingSlots = NormalizeParkingSlots(parkingSlots);

        var apartment = new Apartment
        {
            SocietyId = societyId,
            ApartmentNumber = apartmentNumber.Trim().ToUpperInvariant(),
            BlockName = blockName.Trim().ToUpperInvariant(),
            FloorNumber = floorNumber,
            NumberOfRooms = numberOfRooms,
            ParkingSlots = normalizedParkingSlots,
            Status = ApartmentStatus.Available
        };
        apartment.AddDomainEvent(new ApartmentCreatedEvent(apartment.Id, societyId, apartment.ApartmentNumber));
        return apartment;
    }

    /// <summary>Assigns an owner. Sets status to <see cref="ApartmentStatus.Occupied"/>.</summary>
    public void AssignOwner(string ownerId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(ownerId, nameof(ownerId));
        OwnerId = ownerId;
        Status = ApartmentStatus.Occupied;
        TouchUpdatedAt();
    }

    /// <summary>Assigns a tenant. Sets status to <see cref="ApartmentStatus.Occupied"/>.</summary>
    public void AssignTenant(string tenantId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tenantId, nameof(tenantId));
        TenantId = tenantId;
        Status = ApartmentStatus.Occupied;
        TouchUpdatedAt();
    }

    /// <summary>Removes the current tenant. Reverts to Available if no owner.</summary>
    public void RemoveTenant()
    {
        TenantId = null;
        Status = OwnerId != null ? ApartmentStatus.Occupied : ApartmentStatus.Available;
        TouchUpdatedAt();
    }

    /// <summary>Removes the owner. Reverts to Available if no tenant.</summary>
    public void RemoveOwner()
    {
        OwnerId = null;
        Status = TenantId != null ? ApartmentStatus.Occupied : ApartmentStatus.Available;
        TouchUpdatedAt();
    }

    public void MarkUnderMaintenance() { Status = ApartmentStatus.UnderMaintenance; TouchUpdatedAt(); }

    /// <summary>Marks apartment available, clearing owner and tenant.</summary>
    public void MarkAvailable() { Status = ApartmentStatus.Available; OwnerId = null; TenantId = null; TouchUpdatedAt(); }

    /// <summary>Updates mutable apartment details.</summary>
    public void Update(string blockName, int floorNumber, int numberOfRooms, IReadOnlyList<string>? parkingSlots)
    {
        if (!string.IsNullOrWhiteSpace(blockName)) BlockName = blockName.Trim().ToUpperInvariant();
        FloorNumber = floorNumber;
        if (numberOfRooms > 0) NumberOfRooms = numberOfRooms;
        ParkingSlots = NormalizeParkingSlots(parkingSlots);
        TouchUpdatedAt();
    }

    private static IReadOnlyList<string> NormalizeParkingSlots(IReadOnlyList<string>? parkingSlots)
    {
        if (parkingSlots is null || parkingSlots.Count == 0)
            return [];

        var normalized = new List<string>(parkingSlots.Count);
        foreach (var slot in parkingSlots)
        {
            if (string.IsNullOrWhiteSpace(slot))
                throw new ArgumentException("Parking slot identifiers cannot be empty.", nameof(parkingSlots));

            normalized.Add(slot.Trim().ToUpperInvariant());
        }

        return normalized;
    }
}
