using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Domain.Entities;

/// <summary>Represents a single apartment unit within a society.</summary>
public sealed class Apartment : BaseEntity
{
    public sealed record ResidentHistoryEntry(string UserId, string? FullName, DateTime FromUtc, DateTime? ToUtc);

    public string ApartmentNumber { get; private set; } = string.Empty;
    public string BlockName { get; private set; } = string.Empty;
    public int FloorNumber { get; private set; }
    public int NumberOfRooms { get; private set; }
    public IReadOnlyList<string> ParkingSlots { get; private set; } = [];
    public double CarpetArea { get; private set; }
    public double BuildUpArea { get; private set; }
    public double SuperBuildArea { get; private set; }
    public ApartmentStatus Status { get; private set; }
    public string? OwnerId { get; private set; }
    public string? TenantId { get; private set; }
    public IReadOnlyList<ResidentHistoryEntry> OwnershipHistory { get; private set; } = [];
    public IReadOnlyList<ResidentHistoryEntry> TenantHistory { get; private set; } = [];

    private Apartment() { }

    /// <summary>Creates a new apartment in <see cref="ApartmentStatus.Available"/> status.</summary>
    public static Apartment Create(
        string societyId, string apartmentNumber, string blockName,
        int floorNumber, int numberOfRooms, IReadOnlyList<string>? parkingSlots,
        double carpetArea, double buildUpArea, double superBuildArea)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(apartmentNumber, nameof(apartmentNumber));
        ArgumentException.ThrowIfNullOrWhiteSpace(blockName, nameof(blockName));
        if (numberOfRooms < 1) throw new ArgumentOutOfRangeException(nameof(numberOfRooms), "Must be at least 1.");
        if (carpetArea <= 0) throw new ArgumentOutOfRangeException(nameof(carpetArea), "Must be greater than 0.");
        if (buildUpArea <= 0) throw new ArgumentOutOfRangeException(nameof(buildUpArea), "Must be greater than 0.");
        if (superBuildArea <= 0) throw new ArgumentOutOfRangeException(nameof(superBuildArea), "Must be greater than 0.");

        var normalizedParkingSlots = NormalizeParkingSlots(parkingSlots);

        var apartment = new Apartment
        {
            SocietyId = societyId,
            ApartmentNumber = apartmentNumber.Trim().ToUpperInvariant(),
            BlockName = blockName.Trim().ToUpperInvariant(),
            FloorNumber = floorNumber,
            NumberOfRooms = numberOfRooms,
            ParkingSlots = normalizedParkingSlots,
            CarpetArea = carpetArea,
            BuildUpArea = buildUpArea,
            SuperBuildArea = superBuildArea,
            Status = ApartmentStatus.Available
        };
        apartment.AddDomainEvent(new ApartmentCreatedEvent(apartment.Id, societyId, apartment.ApartmentNumber));
        return apartment;
    }

    /// <summary>Assigns an owner. Sets status to <see cref="ApartmentStatus.Occupied"/>.</summary>
    public void AssignOwner(string ownerId, string? ownerName = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(ownerId, nameof(ownerId));
        CloseOpenHistory(isOwnerHistory: true);
        OwnerId = ownerId;
        OwnershipHistory = OwnershipHistory
            .Append(new ResidentHistoryEntry(ownerId, ownerName, DateTime.UtcNow, null))
            .ToList();
        Status = ApartmentStatus.Occupied;
        TouchUpdatedAt();
    }

    /// <summary>Assigns a tenant. Sets status to <see cref="ApartmentStatus.Occupied"/>.</summary>
    public void AssignTenant(string tenantId, string? tenantName = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tenantId, nameof(tenantId));
        CloseOpenHistory(isOwnerHistory: false);
        TenantId = tenantId;
        TenantHistory = TenantHistory
            .Append(new ResidentHistoryEntry(tenantId, tenantName, DateTime.UtcNow, null))
            .ToList();
        Status = ApartmentStatus.Occupied;
        TouchUpdatedAt();
    }

    /// <summary>Removes the current tenant. Reverts to Available if no owner.</summary>
    public void RemoveTenant()
    {
        CloseOpenHistory(isOwnerHistory: false);
        TenantId = null;
        Status = OwnerId != null ? ApartmentStatus.Occupied : ApartmentStatus.Available;
        TouchUpdatedAt();
    }

    /// <summary>Removes the owner. Reverts to Available if no tenant.</summary>
    public void RemoveOwner()
    {
        CloseOpenHistory(isOwnerHistory: true);
        OwnerId = null;
        Status = TenantId != null ? ApartmentStatus.Occupied : ApartmentStatus.Available;
        TouchUpdatedAt();
    }

    public void MarkUnderMaintenance() { Status = ApartmentStatus.UnderMaintenance; TouchUpdatedAt(); }

    /// <summary>Marks apartment available, clearing owner and tenant.</summary>
    public void MarkAvailable()
    {
        CloseOpenHistory(isOwnerHistory: true);
        CloseOpenHistory(isOwnerHistory: false);
        Status = ApartmentStatus.Available;
       
    }
        
    /// <summary>Updates mutable apartment details.</summary>
    public void Update(string blockName, int floorNumber, int numberOfRooms, IReadOnlyList<string>? parkingSlots,
         double carpetArea, double buildUpArea, double superBuildArea)
    {
        if (!string.IsNullOrWhiteSpace(blockName)) BlockName = blockName.Trim().ToUpperInvariant();
        FloorNumber = floorNumber;
        if (numberOfRooms > 0) NumberOfRooms = numberOfRooms;
        ParkingSlots = NormalizeParkingSlots(parkingSlots);
        if (carpetArea > 0) CarpetArea = carpetArea;
        if (buildUpArea > 0) BuildUpArea = buildUpArea;
        if (superBuildArea > 0) SuperBuildArea = superBuildArea;
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

    private void CloseOpenHistory(bool isOwnerHistory)
    {
        var target = (isOwnerHistory ? OwnershipHistory : TenantHistory).ToList();
        if (target.Count == 0)
            return;

        var latest = target[^1];
        if (latest.ToUtc is not null)
            return;

        target[^1] = latest with { ToUtc = DateTime.UtcNow };
        if (isOwnerHistory)
            OwnershipHistory = target;
        else
            TenantHistory = target;
    }
}
