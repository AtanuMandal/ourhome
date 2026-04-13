using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Domain.Entities;

/// <summary>Represents a user/resident within a society.</summary>
public sealed class User : BaseEntity
{
    public sealed record ApartmentMembership(string ApartmentId, string Name, ResidentType ResidentType);

    public string FullName { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public UserRole Role { get; private set; }
    public ResidentType ResidentType { get; private set; }
    public string? ApartmentId { get; private set; }
    public IReadOnlyList<ApartmentMembership> Apartments { get; private set; } = [];
    public string? InvitedByUserId { get; private set; }
    public bool IsActive { get; private set; }
    public bool IsVerified { get; private set; }
    public string? OtpCode { get; private set; }
    public DateTime? OtpExpiry { get; private set; }
    public string? ExternalAuthId { get; private set; }
    public string? PasswordHash { get; private set; }
    public bool HasPassword => !string.IsNullOrWhiteSpace(PasswordHash);

    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(10);
    private static readonly Random _rng = new();

    private User() { }

    /// <summary>Creates a new unverified user.</summary>
    public static User Create(string societyId, string fullName, string email, string phone,
        UserRole role, ResidentType residentType, string? apartmentId = null, string? invitedByUserId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(fullName, nameof(fullName));
        ArgumentException.ThrowIfNullOrWhiteSpace(email, nameof(email));
        ArgumentException.ThrowIfNullOrWhiteSpace(phone, nameof(phone));

        if (!email.Contains('@'))
            throw new ArgumentException("Email address is invalid.", nameof(email));

        var user = new User
        {
            SocietyId = societyId,
            FullName = fullName.Trim(),
            Email = email.Trim().ToLowerInvariant(),
            Phone = phone.Trim(),
            Role = role,
            ResidentType = residentType,
            ApartmentId = apartmentId,
            Apartments = [],
            InvitedByUserId = invitedByUserId,
            IsActive = true,
            IsVerified = false
        };
        user.AddDomainEvent(new ResidentOnboardedEvent(user.Id, societyId, apartmentId, role.ToString()));
        return user;
    }

    /// <summary>Generates a 6-digit OTP and sets its expiry to 10 minutes from now.</summary>
    public void GenerateOtp()
    {
        OtpCode = _rng.Next(100_000, 999_999).ToString();
        OtpExpiry = DateTime.UtcNow.Add(OtpLifetime);
        TouchUpdatedAt();
    }

    /// <summary>Returns true if the provided code matches and has not expired.</summary>
    public bool ValidateOtp(string code)
    {
        if (string.IsNullOrWhiteSpace(OtpCode) || OtpExpiry is null) return false;
        if (DateTime.UtcNow > OtpExpiry) return false;
        return OtpCode == code;
    }

    /// <summary>Marks the user as verified and clears the OTP.</summary>
    public void Verify()
    {
        IsVerified = true;
        OtpCode = null;
        OtpExpiry = null;
        TouchUpdatedAt();
    }

    public void Deactivate() { IsActive = false; TouchUpdatedAt(); }
    public void Activate() { IsActive = true; TouchUpdatedAt(); }

    /// <summary>Updates mutable profile fields.</summary>
    public void UpdateProfile(string fullName, string phone)
    {
        if (!string.IsNullOrWhiteSpace(fullName)) FullName = fullName.Trim();
        if (!string.IsNullOrWhiteSpace(phone)) Phone = phone.Trim();
        TouchUpdatedAt();
    }

    /// <summary>Links this user to an Azure AD B2C external identity.</summary>
    public void SetExternalAuthId(string externalId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(externalId, nameof(externalId));
        ExternalAuthId = externalId;
        TouchUpdatedAt();
    }

    public void AssignRole(UserRole role) { Role = role; TouchUpdatedAt(); }
    public void AssignResidentType(ResidentType residentType) { ResidentType = residentType; TouchUpdatedAt(); }
    public void SetPasswordHash(string passwordHash)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash, nameof(passwordHash));
        PasswordHash = passwordHash;
        TouchUpdatedAt();
    }

    public void AssignApartment(string apartmentId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(apartmentId, nameof(apartmentId));
        ApartmentId = apartmentId;
        TouchUpdatedAt();
    }

    public void LinkApartment(string apartmentId, string apartmentName, ResidentType residentType, bool makePrimary = false)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(apartmentId, nameof(apartmentId));
        ArgumentException.ThrowIfNullOrWhiteSpace(apartmentName, nameof(apartmentName));

        var updated = Apartments.ToList();
        var existingIndex = updated.FindIndex(link => string.Equals(link.ApartmentId, apartmentId, StringComparison.OrdinalIgnoreCase));
        var membership = new ApartmentMembership(apartmentId, apartmentName.Trim(), residentType);

        if (existingIndex >= 0)
            updated[existingIndex] = membership;
        else
            updated.Add(membership);

        Apartments = updated;

        if (makePrimary || string.IsNullOrWhiteSpace(ApartmentId))
            ApartmentId = apartmentId;

        if ((makePrimary || Apartments.Count == 1) &&
            residentType is ResidentType.Owner or ResidentType.Tenant or ResidentType.FamilyMember or ResidentType.CoOccupant)
            ResidentType = residentType;

        TouchUpdatedAt();
    }

    public void UnlinkApartment(string apartmentId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(apartmentId, nameof(apartmentId));

        var updated = Apartments
            .Where(link => !string.Equals(link.ApartmentId, apartmentId, StringComparison.OrdinalIgnoreCase))
            .ToList();

        Apartments = updated;
        if (string.Equals(ApartmentId, apartmentId, StringComparison.OrdinalIgnoreCase))
            ApartmentId = updated.FirstOrDefault()?.ApartmentId;

        if (updated.Count > 0)
        {
            var primary = updated.First();
            if (primary.ResidentType is ResidentType.Owner or ResidentType.Tenant or ResidentType.FamilyMember or ResidentType.CoOccupant)
                ResidentType = primary.ResidentType;
        }

        TouchUpdatedAt();
    }

    public void AssignInvitedBy(string invitedByUserId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(invitedByUserId, nameof(invitedByUserId));
        InvitedByUserId = invitedByUserId;
        TouchUpdatedAt();
    }
}
