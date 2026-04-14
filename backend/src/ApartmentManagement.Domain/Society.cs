using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.ValueObjects;

namespace ApartmentManagement.Domain.Entities;

/// <summary>Aggregate root representing a housing society (tenant root in the multi-tenant model).</summary>
public sealed class Society : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public Address Address { get; private set; } = null!;
    public string ContactEmail { get; private set; } = string.Empty;
    public string ContactPhone { get; private set; } = string.Empty;
    public int TotalBlocks { get; private set; }
    public int TotalApartments { get; private set; }
    public int OverdueThresholdDays { get; private set; } = 30;
    public SocietyStatus Status { get; private set; }
    public List<string> AdminUserIds { get; private set; } = [];
    public List<string> AmenityIds { get; private set; } = [];

    private Society() { }

    /// <summary>Creates a new society in <see cref="SocietyStatus.Draft"/> status.</summary>
    public static Society Create(
        string name, Address address, string contactEmail, string contactPhone,
        int totalBlocks, int totalApartments)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        ArgumentException.ThrowIfNullOrWhiteSpace(contactEmail, nameof(contactEmail));
        ArgumentException.ThrowIfNullOrWhiteSpace(contactPhone, nameof(contactPhone));

        if (!contactEmail.Contains('@'))
            throw new ArgumentException("Contact email is invalid.", nameof(contactEmail));
        if (totalBlocks < 1) throw new ArgumentOutOfRangeException(nameof(totalBlocks), "Must be at least 1.");
        if (totalApartments < 1) throw new ArgumentOutOfRangeException(nameof(totalApartments), "Must be at least 1.");

        address.Validate();

        var society = new Society
        {
            Id = Guid.NewGuid().ToString(),
            Name = name.Trim(),
            Address = address,
            ContactEmail = contactEmail.Trim().ToLowerInvariant(),
            ContactPhone = contactPhone.Trim(),
            TotalBlocks = totalBlocks,
            TotalApartments = totalApartments,
            Status = SocietyStatus.Draft,
            OverdueThresholdDays = 30
        };
        society.SocietyId = society.Id; // Society is its own partition root
        society.AddDomainEvent(new SocietyCreatedEvent(society.Id, society.Name));
        return society;
    }

    /// <summary>Activates the society making it visible to residents.</summary>
    public void Activate()
    {
        Status = SocietyStatus.Active;
        TouchUpdatedAt();
    }

    /// <summary>Deactivates the society.</summary>
    public void Deactivate()
    {
        Status = SocietyStatus.Inactive;
        TouchUpdatedAt();
    }

    /// <summary>Adds a user as a society admin (idempotent).</summary>
    public void AssignAdmin(string userId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId, nameof(userId));
        if (!AdminUserIds.Contains(userId))
            AdminUserIds.Add(userId);
        TouchUpdatedAt();
    }

    /// <summary>Removes a user from the admin list.</summary>
    public void RemoveAdmin(string userId) { AdminUserIds.Remove(userId); TouchUpdatedAt(); }


    public void SetOverdueThreshold(int days)
    {
        if (days < 0) throw new ArgumentOutOfRangeException(nameof(days));
        OverdueThresholdDays = days;
        TouchUpdatedAt();
    }

    /// <summary>Registers an amenity as belonging to this society (idempotent).</summary>
    public void AddAmenity(string amenityId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(amenityId, nameof(amenityId));
        if (!AmenityIds.Contains(amenityId))
            AmenityIds.Add(amenityId);
        TouchUpdatedAt();
    }

    /// <summary>Updates contact details.</summary>
    public void UpdateContact(string email, string phone)
    {
        if (!string.IsNullOrWhiteSpace(email))
        {
            if (!email.Contains('@')) throw new ArgumentException("Email is invalid.", nameof(email));
            ContactEmail = email.Trim().ToLowerInvariant();
        }
        if (!string.IsNullOrWhiteSpace(phone)) ContactPhone = phone.Trim();
        TouchUpdatedAt();
    }

    /// <summary>Updates society name and block/apartment counts.</summary>
    public void Update(string name, string contactEmail, string contactPhone, int totalBlocks, int totalApartments)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        Name = name.Trim();
        UpdateContact(contactEmail, contactPhone);
        if (totalBlocks > 0) TotalBlocks = totalBlocks;
        if (totalApartments > 0) TotalApartments = totalApartments;
        TouchUpdatedAt();
    }
}
