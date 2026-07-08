using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Domain.Entities;

/// <summary>
/// One attendance record. A check-in/check-out cycle is recorded as a single row (so a staff
/// member can have more than one cycle per day); an <see cref="StaffAttendanceStatus.Absent"/> or
/// <see cref="StaffAttendanceStatus.OnLeave"/> row is a day-level marker with no check-in/out times.
/// </summary>
public sealed class StaffAttendance : BaseEntity
{
    public string StaffId { get; private set; } = string.Empty;
    public string StaffName { get; private set; } = string.Empty;
    public string? ShiftId { get; private set; }

    /// <summary>UTC midnight of the calendar day this record belongs to.</summary>
    public DateTime AttendanceDate { get; private set; }

    public DateTime? CheckInTime { get; private set; }
    public DateTime? CheckOutTime { get; private set; }
    public bool IsLate { get; private set; }
    public StaffAttendanceStatus Status { get; private set; }
    public string? Note { get; private set; }

    private StaffAttendance() { }

    /// <summary>Records a check-in, starting a new open attendance cycle.</summary>
    public static StaffAttendance CheckIn(
        string societyId, string staffId, string staffName, string? shiftId, DateTime checkInTimeUtc, bool isLate)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(staffId, nameof(staffId));
        ArgumentException.ThrowIfNullOrWhiteSpace(staffName, nameof(staffName));

        return new StaffAttendance
        {
            SocietyId = societyId,
            StaffId = staffId,
            StaffName = staffName,
            ShiftId = shiftId,
            AttendanceDate = checkInTimeUtc.Date,
            CheckInTime = checkInTimeUtc,
            CheckOutTime =null,
            IsLate = isLate,
            Status = StaffAttendanceStatus.CheckedIn,
        };
    }

    /// <summary>Creates a day-level marker for a staff member who never checked in.</summary>
    public static StaffAttendance CreateAbsent(string societyId, string staffId, string staffName, string? shiftId, DateTime attendanceDate)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(staffId, nameof(staffId));
        ArgumentException.ThrowIfNullOrWhiteSpace(staffName, nameof(staffName));

        return new StaffAttendance
        {
            SocietyId = societyId,
            StaffId = staffId,
            StaffName = staffName,
            ShiftId = shiftId,
            AttendanceDate = attendanceDate.Date,
            Status = StaffAttendanceStatus.Absent,
        };
    }

    public void CheckOut(DateTime checkOutTimeUtc)
    {
        if (Status != StaffAttendanceStatus.CheckedIn)
            throw new InvalidOperationException("Staff member must be checked in before check-out.");

        CheckOutTime = checkOutTimeUtc;
        Status = StaffAttendanceStatus.CheckedOut;
        TouchUpdatedAt();
    }
}
