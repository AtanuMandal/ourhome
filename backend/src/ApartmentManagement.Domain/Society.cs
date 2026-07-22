using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.ValueObjects;

namespace ApartmentManagement.Domain.Entities;

/// <summary>Aggregate root representing a housing society (tenant root in the multi-tenant model).</summary>
public sealed class Society : BaseEntity
{
    public sealed record SocietyUserReference(string UserId, string FullName, string Email, string RoleTitle);
    public sealed record SocietyCommittee(string Name, IReadOnlyList<SocietyUserReference> Members);

    public const string DefaultThemeId = "ocean";

    /// <summary>
    /// The fixed catalog of theme ids HQAdmin can assign per society. An id outside this set
    /// (e.g. a stale value from a since-retired theme) is never rejected outright — it's silently
    /// normalized back to the default so a client is never hard-blocked by an unrecognized theme.
    /// </summary>
    private static readonly HashSet<string> ValidThemeIds = new(StringComparer.OrdinalIgnoreCase)
    {
        "ocean", "emerald", "sunset", "violet", "slate", "teal"
    };

    private static string NormalizeThemeId(string themeId)
    {
        var trimmed = themeId.Trim().ToLowerInvariant();
        return ValidThemeIds.Contains(trimmed) ? trimmed : DefaultThemeId;
    }

    public string Name { get; private set; } = string.Empty;
    public Address Address { get; private set; } = null!;
    public string ContactEmail { get; private set; } = string.Empty;
    public string ContactPhone { get; private set; } = string.Empty;
    public int TotalBlocks { get; private set; }
    public int TotalApartments { get; private set; }
    public MaintenanceFeeStructure? FeeStructure { get; private set; }
    public int MaintenanceOverdueThresholdDays { get; private set; } = 7;

    /// <summary>Maximum number of users that can be associated with a single apartment. HQAdmin-managed.</summary>
    public int MaxUsersPerApartment { get; private set; } = DefaultMaxUsersPerApartment;

    /// <summary>Hours a checked-in visitor may stay before being flagged as overstaying in the visitor list.</summary>
    public int VisitorOverstayThresholdHours { get; private set; } = DefaultVisitorOverstayThresholdHours;

    public const int DefaultMaxUsersPerApartment = 10;
    public const int DefaultVisitorOverstayThresholdHours = 5;
    public string ThemeId { get; private set; } = DefaultThemeId;

    /// <summary>App-relative file path (e.g. "files/society-logos/{societyId}/{blob}"), shown at
    /// the top of the sidenav/drawer. Null means "no logo uploaded — show the default branding".</summary>
    public string? LogoUrl { get; private set; }

    /// <summary>App-relative file path for the sidenav/drawer content-area background image,
    /// rendered at 70% opacity by clients. Null means "no image uploaded — show the default background".</summary>
    public string? SidenavBackgroundUrl { get; private set; }

    public SocietyStatus Status { get; private set; }
    public List<string> AdminUserIds { get; private set; } = [];
    public List<string> AmenityIds { get; private set; } = [];
    public IReadOnlyList<SocietyUserReference> SocietyUsers { get; private set; } = [];
    public IReadOnlyList<SocietyCommittee> Committees { get; private set; } = [];

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
            Status = SocietyStatus.Draft
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

    /// <summary>Sets or replaces the maintenance fee structure.</summary>
    public void ConfigureFeeStructure(MaintenanceFeeStructure feeStructure)
    {
        FeeStructure = feeStructure ?? throw new ArgumentNullException(nameof(feeStructure));
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

    /// <summary>Updates society name, address, contact details, and block/apartment counts.</summary>
    public void Update(
        string name,
        string contactEmail,
        string contactPhone,
        int totalBlocks,
        int totalApartments,
        int? maintenanceOverdueThresholdDays = null,
        Address? address = null,
        string? themeId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        Name = name.Trim();
        UpdateContact(contactEmail, contactPhone);
        if (totalBlocks > 0) TotalBlocks = totalBlocks;
        if (totalApartments > 0) TotalApartments = totalApartments;
        if (maintenanceOverdueThresholdDays.HasValue)
            SetMaintenanceOverdueThreshold(maintenanceOverdueThresholdDays.Value);
        if (address is not null)
        {
            address.Validate();
            Address = address;
        }
        if (!string.IsNullOrWhiteSpace(themeId))
            ThemeId = NormalizeThemeId(themeId);
        TouchUpdatedAt();
    }

    /// <summary>Sets the per-apartment user cap. Authorization (HQAdmin-only) is enforced by the caller.</summary>
    public void SetMaxUsersPerApartment(int maxUsers)
    {
        if (maxUsers < 1 || maxUsers > 100)
            throw new ArgumentOutOfRangeException(nameof(maxUsers), "Max users per apartment must be between 1 and 100.");

        MaxUsersPerApartment = maxUsers;
        TouchUpdatedAt();
    }

    public void SetVisitorOverstayThreshold(int thresholdHours)
    {
        if (thresholdHours < 1 || thresholdHours > 24)
            throw new ArgumentOutOfRangeException(nameof(thresholdHours), "Visitor overstay threshold must be between 1 and 24 hours.");

        VisitorOverstayThresholdHours = thresholdHours;
        TouchUpdatedAt();
    }

    public void SetMaintenanceOverdueThreshold(int thresholdDays)
    {
        if (thresholdDays < 1 || thresholdDays > 90)
            throw new ArgumentOutOfRangeException(nameof(thresholdDays), "Threshold must be between 1 and 90 days.");

        MaintenanceOverdueThresholdDays = thresholdDays;
        TouchUpdatedAt();
    }

    /// <summary>Sets or clears the sidenav/drawer logo. Pass null/blank to revert to the default branding.</summary>
    public void SetLogoUrl(string? logoUrl)
    {
        LogoUrl = string.IsNullOrWhiteSpace(logoUrl) ? null : logoUrl.Trim();
        TouchUpdatedAt();
    }

    /// <summary>Sets or clears the sidenav/drawer content-area background image. Pass null/blank to revert to the default background.</summary>
    public void SetSidenavBackgroundUrl(string? backgroundUrl)
    {
        SidenavBackgroundUrl = string.IsNullOrWhiteSpace(backgroundUrl) ? null : backgroundUrl.Trim();
        TouchUpdatedAt();
    }

    public void UpdateLeadership(
        IReadOnlyList<SocietyUserReference> societyUsers,
        IReadOnlyList<SocietyCommittee> committees)
    {
        SocietyUsers = NormalizeSocietyUsers(societyUsers);
        Committees = NormalizeCommittees(committees);
        TouchUpdatedAt();
    }

    private static IReadOnlyList<SocietyUserReference> NormalizeSocietyUsers(IReadOnlyList<SocietyUserReference> societyUsers)
    {
        if (societyUsers.Count == 0)
            return [];

        var normalized = new List<SocietyUserReference>(societyUsers.Count);
        var seenUserIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var user in societyUsers)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(user.UserId, nameof(societyUsers));
            ArgumentException.ThrowIfNullOrWhiteSpace(user.FullName, nameof(societyUsers));
            ArgumentException.ThrowIfNullOrWhiteSpace(user.Email, nameof(societyUsers));
            ArgumentException.ThrowIfNullOrWhiteSpace(user.RoleTitle, nameof(societyUsers));

            if (!seenUserIds.Add(user.UserId))
                throw new ArgumentException("Duplicate society users are not allowed.", nameof(societyUsers));

            normalized.Add(new SocietyUserReference(
                user.UserId.Trim(),
                user.FullName.Trim(),
                user.Email.Trim().ToLowerInvariant(),
                user.RoleTitle.Trim()));
        }

        return normalized;
    }

    private static IReadOnlyList<SocietyCommittee> NormalizeCommittees(IReadOnlyList<SocietyCommittee> committees)
    {
        if (committees.Count == 0)
            return [];

        var normalized = new List<SocietyCommittee>(committees.Count);
        var seenNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var committee in committees)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(committee.Name, nameof(committees));
            if (!seenNames.Add(committee.Name))
                throw new ArgumentException("Duplicate committees are not allowed.", nameof(committees));

            normalized.Add(new SocietyCommittee(
                committee.Name.Trim(),
                NormalizeSocietyUsers(committee.Members)));
        }

        return normalized;
    }
}
