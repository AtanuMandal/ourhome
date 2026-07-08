using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class ShiftTests
{
    private const string SocietyId = "society-001";

    [Fact]
    public void Create_WithValidParameters_ReturnsShift()
    {
        var shift = Shift.Create(SocietyId, "Morning Security", TimeSpan.FromHours(8), TimeSpan.FromHours(16), 30);

        shift.Id.Should().NotBeNullOrEmpty();
        shift.Name.Should().Be("Morning Security");
        shift.StartTime.Should().Be(TimeSpan.FromHours(8));
        shift.EndTime.Should().Be(TimeSpan.FromHours(16));
        shift.GraceMinutes.Should().Be(30);
    }

    [Fact]
    public void Create_WithEmptyName_ThrowsArgumentException()
    {
        var act = () => Shift.Create(SocietyId, "", TimeSpan.FromHours(8), TimeSpan.FromHours(16));
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Update_ChangesNameTimesAndGrace()
    {
        var shift = Shift.Create(SocietyId, "Morning Security", TimeSpan.FromHours(8), TimeSpan.FromHours(16), 30);

        shift.Update("Day Security", TimeSpan.FromHours(9), TimeSpan.FromHours(17), 15);

        shift.Name.Should().Be("Day Security");
        shift.StartTime.Should().Be(TimeSpan.FromHours(9));
        shift.EndTime.Should().Be(TimeSpan.FromHours(17));
        shift.GraceMinutes.Should().Be(15);
    }
}

public class StaffTests
{
    private const string SocietyId = "society-001";

    private static Staff CreateStaff() =>
        Staff.Create(SocietyId, "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll);

    [Fact]
    public void Create_WithValidParameters_ReturnsActiveStaff()
    {
        var staff = CreateStaff();

        staff.Id.Should().NotBeNullOrEmpty();
        staff.FullName.Should().Be("John Guard");
        staff.Category.Should().Be(StaffCategory.Security);
        staff.EmploymentType.Should().Be(StaffEmploymentType.OnPayroll);
        staff.IsActive.Should().BeTrue();
        staff.ShiftHistory.Should().BeEmpty();
    }

    [Fact]
    public void Create_WithShiftId_SeedsShiftHistory()
    {
        var staff = Staff.Create(
            SocietyId, "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll,
            shiftId: "shift-001", shiftName: "Morning Security");

        staff.ShiftId.Should().Be("shift-001");
        staff.ShiftName.Should().Be("Morning Security");
        staff.ShiftHistory.Should().ContainSingle(a => a.ShiftId == "shift-001");
    }

    [Fact]
    public void Create_WithEmptyPhone_ThrowsArgumentException()
    {
        var act = () => Staff.Create(SocietyId, "John Guard", "", StaffCategory.Security, StaffEmploymentType.OnPayroll);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void UpdateDetails_ChangesNamePhoneAndPhoto()
    {
        var staff = CreateStaff();

        staff.UpdateDetails("John Updated", "+91-1112223333", "photo.jpg");

        staff.FullName.Should().Be("John Updated");
        staff.Phone.Should().Be("+91-1112223333");
        staff.PhotoUrl.Should().Be("photo.jpg");
    }

    [Fact]
    public void AssignShift_UpdatesCurrentShiftAndAppendsHistory()
    {
        var staff = CreateStaff();
        var effectiveFrom = DateTime.UtcNow;

        staff.AssignShift("shift-001", "Morning Security", effectiveFrom);

        staff.ShiftId.Should().Be("shift-001");
        staff.ShiftName.Should().Be("Morning Security");
        staff.ShiftHistory.Should().ContainSingle();

        staff.AssignShift("shift-002", "Night Security", effectiveFrom.AddDays(1));

        staff.ShiftId.Should().Be("shift-002");
        staff.ShiftHistory.Should().HaveCount(2);
    }

    [Fact]
    public void Deactivate_SetsIsActiveFalse()
    {
        var staff = CreateStaff();
        staff.Deactivate();
        staff.IsActive.Should().BeFalse();
    }
}

public class StaffAttendanceTests
{
    private const string SocietyId = "society-001";
    private const string StaffId = "staff-001";

    [Fact]
    public void CheckIn_SetsStatusCheckedInAndCheckInTime()
    {
        var now = DateTime.UtcNow;
        var attendance = StaffAttendance.CheckIn(SocietyId, StaffId, "John Guard", "shift-001", now, isLate: false);

        attendance.Status.Should().Be(StaffAttendanceStatus.CheckedIn);
        attendance.CheckInTime.Should().Be(now);
        attendance.AttendanceDate.Should().Be(now.Date);
        attendance.IsLate.Should().BeFalse();
    }

    [Fact]
    public void CheckIn_AfterGraceDeadline_MarksLate()
    {
        var attendance = StaffAttendance.CheckIn(SocietyId, StaffId, "John Guard", "shift-001", DateTime.UtcNow, isLate: true);
        attendance.IsLate.Should().BeTrue();
    }

    [Fact]
    public void CheckOut_AfterCheckIn_SetsStatusCheckedOut()
    {
        var attendance = StaffAttendance.CheckIn(SocietyId, StaffId, "John Guard", "shift-001", DateTime.UtcNow, isLate: false);
        var checkOutTime = DateTime.UtcNow.AddHours(8);

        attendance.CheckOut(checkOutTime);

        attendance.Status.Should().Be(StaffAttendanceStatus.CheckedOut);
        attendance.CheckOutTime.Should().Be(checkOutTime);
    }

    [Fact]
    public void CheckOut_WithoutCheckIn_ThrowsInvalidOperationException()
    {
        var absence = StaffAttendance.CreateAbsent(SocietyId, StaffId, "John Guard", "shift-001", DateTime.UtcNow.Date);

        var act = () => absence.CheckOut(DateTime.UtcNow);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void CreateAbsent_SetsStatusAbsentWithNoTimes()
    {
        var date = DateTime.UtcNow.Date;
        var absence = StaffAttendance.CreateAbsent(SocietyId, StaffId, "John Guard", "shift-001", date);

        absence.Status.Should().Be(StaffAttendanceStatus.Absent);
        absence.AttendanceDate.Should().Be(date);
        absence.CheckInTime.Should().BeNull();
        absence.CheckOutTime.Should().BeNull();
    }
}
