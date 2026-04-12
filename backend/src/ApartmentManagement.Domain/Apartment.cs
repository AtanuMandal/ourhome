using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using System.Text.Json.Serialization;

namespace ApartmentManagement.Domain.Entities;

/// <summary>Represents a single apartment unit within a society.</summary>
public sealed class Apartment : BaseEntity
{
    public sealed record ResidentHistoryEntry(string UserId, string? FullName, DateTime FromUtc, DateTime? ToUtc);
    public sealed record ResidentSummary(string UserId, string UserName, ResidentType ResidentType);

    public string ApartmentNumber { get; private set; } = string.Empty;
    public string BlockName { get; private set; } = string.Empty;
    public int FloorNumber { get; private set; }
    public int NumberOfRooms { get; private set; }
    public IReadOnlyList<string> ParkingSlots { get; private set; } = [];
    public double CarpetArea { get; private set; }
    public double BuildUpArea { get; private set; }
    public double SuperBuildArea { get; private set; }
    public ApartmentStatus Status { get; private set; }
    public IReadOnlyList<ResidentSummary> Residents { get; private set; } = [];
    public IReadOnlyList<ResidentHistoryEntry> OwnershipHistory { get; private set; } = [];
    public IReadOnlyList<ResidentHistoryEntry> TenantHistory { get; private set; } = [];

    private string? _legacyOwnerId;
    private string? _legacyTenantId;

    [JsonPropertyName("ownerId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? LegacyOwnerId
    {
        get => null;
        private set => _legacyOwnerId = value;
    }

    [JsonPropertyName("tenantId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? LegacyTenantId
    {
        get => null;
        private set => _legacyTenantId = value;
    }

    [JsonIgnore]
    public string? OwnerId => GetResidentId(ResidentType.Owner);

    [JsonIgnore]
    public string? TenantId => GetResidentId(ResidentType.Tenant);

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
            Residents = [],
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
        EnsureLegacyResidentsHydrated();
        CloseOpenHistory(isOwnerHistory: true);
        UpsertResident(ownerId, ownerName ?? ownerId, ResidentType.Owner);
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
        EnsureLegacyResidentsHydrated();
        CloseOpenHistory(isOwnerHistory: false);
        UpsertResident(tenantId, tenantName ?? tenantId, ResidentType.Tenant);
        TenantHistory = TenantHistory
            .Append(new ResidentHistoryEntry(tenantId, tenantName, DateTime.UtcNow, null))
            .ToList();
        Status = ApartmentStatus.Occupied;
        TouchUpdatedAt();
    }

    /// <summary>Removes the current tenant. Reverts to Available if no owner.</summary>
    public void RemoveTenant()
    {
        EnsureLegacyResidentsHydrated();
        CloseOpenHistory(isOwnerHistory: false);
        var tenantId = TenantId;
        if (!string.IsNullOrWhiteSpace(tenantId))
            RemoveResident(tenantId, ResidentType.Tenant);

        Status = Residents.Count > 0 ? ApartmentStatus.Occupied : ApartmentStatus.Available;
        TouchUpdatedAt();
    }

    /// <summary>Removes the owner. Reverts to Available if no tenant.</summary>
    public void RemoveOwner()
    {
        EnsureLegacyResidentsHydrated();
        CloseOpenHistory(isOwnerHistory: true);
        var ownerId = OwnerId;
        if (!string.IsNullOrWhiteSpace(ownerId))
            RemoveResident(ownerId, ResidentType.Owner);

        Status = Residents.Count > 0 ? ApartmentStatus.Occupied : ApartmentStatus.Available;
        TouchUpdatedAt();
    }

    public void MarkUnderMaintenance() { Status = ApartmentStatus.UnderMaintenance; TouchUpdatedAt(); }

    /// <summary>Marks apartment available, clearing owner and tenant.</summary>
    public void MarkAvailable()
    {
        EnsureLegacyResidentsHydrated();
        CloseOpenHistory(isOwnerHistory: true);
        CloseOpenHistory(isOwnerHistory: false);
        Status = ApartmentStatus.Available;
        _legacyOwnerId = null;
        _legacyTenantId = null;
        Residents = [];
        TouchUpdatedAt();
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

    public void AddResident(string userId, string userName, ResidentType residentType)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId, nameof(userId));
        ArgumentException.ThrowIfNullOrWhiteSpace(userName, nameof(userName));
        EnsureLegacyResidentsHydrated();
        UpsertResident(userId, userName, residentType);
        Status = Residents.Count > 0 ? ApartmentStatus.Occupied : ApartmentStatus.Available;
        TouchUpdatedAt();
    }

    public void RemoveResident(string userId, ResidentType residentType)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId, nameof(userId));
        EnsureLegacyResidentsHydrated();
        Residents = Residents
            .Where(resident => !(string.Equals(resident.UserId, userId, StringComparison.OrdinalIgnoreCase) && resident.ResidentType == residentType))
            .ToList();
        Status = Residents.Count > 0
            ? ApartmentStatus.Occupied
            : ApartmentStatus.Available;
        TouchUpdatedAt();
    }

    public ResidentSummary? GetResident(ResidentType residentType) =>
        GetResidentsForRead().FirstOrDefault(resident => resident.ResidentType == residentType);

    public string? GetResidentId(ResidentType residentType) => GetResident(residentType)?.UserId;

    public IReadOnlyList<ResidentSummary> GetResidentsForRead()
    {
        if (Residents.Count > 0 || (string.IsNullOrWhiteSpace(_legacyOwnerId) && string.IsNullOrWhiteSpace(_legacyTenantId)))
            return Residents;

        var normalized = Residents.ToList();

        if (!string.IsNullOrWhiteSpace(_legacyOwnerId) &&
            normalized.All(resident => resident.ResidentType != ResidentType.Owner))
        {
            normalized.Add(new ResidentSummary(
                _legacyOwnerId,
                GetLatestResidentName(OwnershipHistory, _legacyOwnerId),
                ResidentType.Owner));
        }

        if (!string.IsNullOrWhiteSpace(_legacyTenantId) &&
            normalized.All(resident => resident.ResidentType != ResidentType.Tenant))
        {
            normalized.Add(new ResidentSummary(
                _legacyTenantId,
                GetLatestResidentName(TenantHistory, _legacyTenantId),
                ResidentType.Tenant));
        }

        return normalized;
    }

    private void UpsertResident(string userId, string userName, ResidentType residentType)
    {
        var updated = Residents.ToList();
        if (residentType == ResidentType.Owner)
            updated.RemoveAll(resident => resident.ResidentType == ResidentType.Owner && !string.Equals(resident.UserId, userId, StringComparison.OrdinalIgnoreCase));
        else if (residentType == ResidentType.Tenant)
            updated.RemoveAll(resident => resident.ResidentType == ResidentType.Tenant && !string.Equals(resident.UserId, userId, StringComparison.OrdinalIgnoreCase));

        var existingIndex = updated.FindIndex(resident =>
            string.Equals(resident.UserId, userId, StringComparison.OrdinalIgnoreCase) &&
            resident.ResidentType == residentType);

        var summary = new ResidentSummary(userId, userName.Trim(), residentType);
        if (existingIndex >= 0)
            updated[existingIndex] = summary;
        else
            updated.Add(summary);

        Residents = updated;
    }

    private void EnsureLegacyResidentsHydrated()
    {
        var normalized = GetResidentsForRead();
        if (ReferenceEquals(normalized, Residents))
            return;

        Residents = normalized.ToList();
        _legacyOwnerId = null;
        _legacyTenantId = null;

        if (Status == ApartmentStatus.Available && Residents.Count > 0)
            Status = ApartmentStatus.Occupied;
    }

    private static string GetLatestResidentName(IReadOnlyList<ResidentHistoryEntry> history, string residentId) =>
        history
            .OrderByDescending(entry => entry.FromUtc)
            .FirstOrDefault(entry => string.Equals(entry.UserId, residentId, StringComparison.OrdinalIgnoreCase))
            ?.FullName
        ?? residentId;
}
