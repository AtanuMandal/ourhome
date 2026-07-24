using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Domain.Entities;

/// <summary>Society staff roster entry (security guard, housekeeping, gardener, etc.) — distinct from a resident/visitor.</summary>
public sealed class Staff : BaseEntity
{
    /// <summary>A shift reassignment, kept for history with the date it took effect.</summary>
    public sealed record ShiftAssignment(string ShiftId, string ShiftName, DateTime EffectiveFrom);

    public string FullName { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string? PhotoUrl { get; private set; }
    public StaffCategory Category { get; private set; }
    public StaffEmploymentType EmploymentType { get; private set; }
    public string? VendorId { get; private set; }
    public string? ShiftId { get; private set; }
    public string? ShiftName { get; private set; }
    public bool IsActive { get; private set; } = true;

    private readonly List<ShiftAssignment> _shiftHistory = [];
    public IReadOnlyList<ShiftAssignment> ShiftHistory => _shiftHistory.AsReadOnly();

    private Staff() { }

    public static Staff Create(
        string societyId, string fullName, string phone, StaffCategory category, StaffEmploymentType employmentType,
        string? photoUrl = null, string? vendorId = null, string? shiftId = null, string? shiftName = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(fullName, nameof(fullName));
        ArgumentException.ThrowIfNullOrWhiteSpace(phone, nameof(phone));

        var staff = new Staff
        {
            SocietyId = societyId,
            FullName = fullName.Trim(),
            Phone = phone.Trim(),
            PhotoUrl = string.IsNullOrWhiteSpace(photoUrl) ? null : photoUrl.Trim(),
            Category = category,
            EmploymentType = employmentType,
            VendorId = string.IsNullOrWhiteSpace(vendorId) ? null : vendorId,
        };

        if (!string.IsNullOrWhiteSpace(shiftId))
            staff.AssignShift(shiftId, shiftName ?? string.Empty, DateTime.UtcNow);

        return staff;
    }

    public void UpdateDetails(string fullName, string phone, string? photoUrl)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fullName, nameof(fullName));
        ArgumentException.ThrowIfNullOrWhiteSpace(phone, nameof(phone));

        FullName = fullName.Trim();
        Phone = phone.Trim();
        PhotoUrl = string.IsNullOrWhiteSpace(photoUrl) ? null : photoUrl.Trim();
        TouchUpdatedAt();
    }

    /// <summary>Assigns (or reassigns) the staff member's shift, logging the change with an effective date.</summary>
    public void AssignShift(string shiftId, string shiftName, DateTime effectiveFrom)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(shiftId, nameof(shiftId));

        ShiftId = shiftId;
        ShiftName = shiftName;
        _shiftHistory.Add(new ShiftAssignment(shiftId, shiftName, effectiveFrom));
        TouchUpdatedAt();
    }

    public void Deactivate()
    {
        IsActive = false;
        TouchUpdatedAt();
    }

    public void Reactivate()
    {
        IsActive = true;
        TouchUpdatedAt();
    }
}
