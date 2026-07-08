using ApartmentManagement.Application.Commands.Staff;
using ApartmentManagement.Application.Queries.Staff;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

// ─── CreateStaffCommandHandler Tests ───────────────────────────────────────────

public class CreateStaffCommandHandlerTests
{
    private readonly Mock<IStaffRepository> _staffRepoMock = new();
    private readonly Mock<IShiftRepository> _shiftRepoMock = new();
    private readonly Mock<ILogger<CreateStaffCommandHandler>> _loggerMock = new();

    private CreateStaffCommandHandler CreateHandler() => new(_staffRepoMock.Object, _shiftRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithNoShift_CreatesStaff()
    {
        _staffRepoMock.Setup(r => r.CreateAsync(It.IsAny<Staff>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Staff s, CancellationToken _) => s);

        var result = await CreateHandler().Handle(
            new CreateStaffCommand("soc-001", "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll, null, null, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.FullName.Should().Be("John Guard");
        _staffRepoMock.Verify(r => r.CreateAsync(It.IsAny<Staff>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithUnknownShiftId_ReturnsShiftNotFound()
    {
        _shiftRepoMock.Setup(r => r.GetByIdAsync("shift-999", "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((Shift?)null);

        var result = await CreateHandler().Handle(
            new CreateStaffCommand("soc-001", "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll, null, null, "shift-999"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ShiftNotFound);
    }

    [Fact]
    public async Task Handle_WithValidShiftId_AssignsShiftNameToStaff()
    {
        var shift = Shift.Create("soc-001", "Morning Security", TimeSpan.FromHours(8), TimeSpan.FromHours(16));
        _shiftRepoMock.Setup(r => r.GetByIdAsync("shift-001", "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(shift);
        _staffRepoMock.Setup(r => r.CreateAsync(It.IsAny<Staff>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Staff s, CancellationToken _) => s);

        var result = await CreateHandler().Handle(
            new CreateStaffCommand("soc-001", "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll, null, null, "shift-001"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ShiftName.Should().Be("Morning Security");
    }
}

// ─── UpdateStaffCommandHandler / DeactivateStaffCommandHandler Tests ──────────

public class UpdateStaffCommandHandlerTests
{
    private readonly Mock<IStaffRepository> _staffRepoMock = new();
    private readonly Mock<IShiftRepository> _shiftRepoMock = new();
    private readonly Mock<ILogger<UpdateStaffCommandHandler>> _loggerMock = new();

    private UpdateStaffCommandHandler CreateHandler() => new(_staffRepoMock.Object, _shiftRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithExistingStaff_UpdatesDetails()
    {
        var staff = Staff.Create("soc-001", "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll);
        _staffRepoMock.Setup(r => r.GetByIdAsync(staff.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(staff);
        _staffRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Staff>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Staff s, CancellationToken _) => s);

        var result = await CreateHandler().Handle(
            new UpdateStaffCommand("soc-001", staff.Id, "John Updated", "+91-1112223333", null, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.FullName.Should().Be("John Updated");
    }

    [Fact]
    public async Task Handle_WithMissingStaff_ReturnsStaffNotFound()
    {
        _staffRepoMock.Setup(r => r.GetByIdAsync("missing", "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((Staff?)null);

        var result = await CreateHandler().Handle(
            new UpdateStaffCommand("soc-001", "missing", "John Updated", "+91-1112223333", null, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.StaffNotFound);
    }

    [Fact]
    public async Task Handle_WithNewShiftId_ReassignsShift()
    {
        var staff = Staff.Create("soc-001", "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll);
        var shift = Shift.Create("soc-001", "Night Security", TimeSpan.FromHours(20), TimeSpan.FromHours(4));
        _staffRepoMock.Setup(r => r.GetByIdAsync(staff.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(staff);
        _shiftRepoMock.Setup(r => r.GetByIdAsync(shift.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(shift);
        _staffRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Staff>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Staff s, CancellationToken _) => s);

        var result = await CreateHandler().Handle(
            new UpdateStaffCommand("soc-001", staff.Id, "John Guard", "+91-9876543210", null, shift.Id),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ShiftId.Should().Be(shift.Id);
        result.Value!.ShiftName.Should().Be("Night Security");
    }
}

public class DeactivateStaffCommandHandlerTests
{
    private readonly Mock<IStaffRepository> _staffRepoMock = new();
    private readonly Mock<ILogger<DeactivateStaffCommandHandler>> _loggerMock = new();

    private DeactivateStaffCommandHandler CreateHandler() => new(_staffRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithExistingStaff_DeactivatesAndReturnsTrue()
    {
        var staff = Staff.Create("soc-001", "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll);
        _staffRepoMock.Setup(r => r.GetByIdAsync(staff.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(staff);

        var result = await CreateHandler().Handle(new DeactivateStaffCommand("soc-001", staff.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        staff.IsActive.Should().BeFalse();
    }
}

// ─── CheckInStaffCommandHandler / CheckOutStaffCommandHandler Tests ───────────

public class CheckInStaffCommandHandlerTests
{
    private readonly Mock<IStaffRepository> _staffRepoMock = new();
    private readonly Mock<IShiftRepository> _shiftRepoMock = new();
    private readonly Mock<IStaffAttendanceRepository> _attendanceRepoMock = new();
    private readonly Mock<ILogger<CheckInStaffCommandHandler>> _loggerMock = new();

    private CheckInStaffCommandHandler CreateHandler() =>
        new(_staffRepoMock.Object, _shiftRepoMock.Object, _attendanceRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithActiveStaffAndNoOpenAttendance_ChecksIn()
    {
        var staff = Staff.Create("soc-001", "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll);
        _staffRepoMock.Setup(r => r.GetByIdAsync(staff.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(staff);
        _attendanceRepoMock.Setup(r => r.GetOpenAttendanceAsync("soc-001", staff.Id, It.IsAny<CancellationToken>())).ReturnsAsync((StaffAttendance?)null);
        _attendanceRepoMock.Setup(r => r.CreateAsync(It.IsAny<StaffAttendance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StaffAttendance a, CancellationToken _) => a);

        var result = await CreateHandler().Handle(new CheckInStaffCommand("soc-001", staff.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("CheckedIn");
    }

    [Fact]
    public async Task Handle_WithInactiveStaff_ReturnsStaffInactive()
    {
        var staff = Staff.Create("soc-001", "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll);
        staff.Deactivate();
        _staffRepoMock.Setup(r => r.GetByIdAsync(staff.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(staff);

        var result = await CreateHandler().Handle(new CheckInStaffCommand("soc-001", staff.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.StaffInactive);
    }

    [Fact]
    public async Task Handle_WithAlreadyOpenAttendance_ReturnsStaffAlreadyCheckedIn()
    {
        var staff = Staff.Create("soc-001", "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll);
        var openAttendance = StaffAttendance.CheckIn("soc-001", staff.Id, staff.FullName, null, DateTime.UtcNow, false);
        _staffRepoMock.Setup(r => r.GetByIdAsync(staff.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(staff);
        _attendanceRepoMock.Setup(r => r.GetOpenAttendanceAsync("soc-001", staff.Id, It.IsAny<CancellationToken>())).ReturnsAsync(openAttendance);

        var result = await CreateHandler().Handle(new CheckInStaffCommand("soc-001", staff.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.StaffAlreadyCheckedIn);
    }

    [Fact]
    public async Task Handle_WithMissingStaff_ReturnsStaffNotFound()
    {
        _staffRepoMock.Setup(r => r.GetByIdAsync("missing", "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((Staff?)null);

        var result = await CreateHandler().Handle(new CheckInStaffCommand("soc-001", "missing"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.StaffNotFound);
    }
}

public class CheckOutStaffCommandHandlerTests
{
    private readonly Mock<IStaffAttendanceRepository> _attendanceRepoMock = new();
    private readonly Mock<ILogger<CheckOutStaffCommandHandler>> _loggerMock = new();

    private CheckOutStaffCommandHandler CreateHandler() => new(_attendanceRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithOpenAttendance_ChecksOut()
    {
        var openAttendance = StaffAttendance.CheckIn("soc-001", "staff-001", "John Guard", null, DateTime.UtcNow, false);
        _attendanceRepoMock.Setup(r => r.GetOpenAttendanceAsync("soc-001", "staff-001", It.IsAny<CancellationToken>())).ReturnsAsync(openAttendance);
        _attendanceRepoMock.Setup(r => r.UpdateAsync(It.IsAny<StaffAttendance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((StaffAttendance a, CancellationToken _) => a);

        var result = await CreateHandler().Handle(new CheckOutStaffCommand("soc-001", "staff-001"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("CheckedOut");
    }

    [Fact]
    public async Task Handle_WithNoOpenAttendance_ReturnsStaffNotCheckedIn()
    {
        _attendanceRepoMock.Setup(r => r.GetOpenAttendanceAsync("soc-001", "staff-001", It.IsAny<CancellationToken>())).ReturnsAsync((StaffAttendance?)null);

        var result = await CreateHandler().Handle(new CheckOutStaffCommand("soc-001", "staff-001"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.StaffNotCheckedIn);
    }
}

// ─── GetOnDutyStaffQueryHandler Tests ──────────────────────────────────────────

public class GetOnDutyStaffQueryHandlerTests
{
    private readonly Mock<IStaffAttendanceRepository> _attendanceRepoMock = new();

    private GetOnDutyStaffQueryHandler CreateHandler() => new(_attendanceRepoMock.Object);

    [Fact]
    public async Task Handle_ReturnsOnlyOnDutyStaff()
    {
        var onDuty = StaffAttendance.CheckIn("soc-001", "staff-001", "Alice Guard", null, DateTime.UtcNow, false);
        _attendanceRepoMock.Setup(r => r.GetOnDutyAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<StaffAttendance>)[onDuty]);

        var result = await CreateHandler().Handle(new GetOnDutyStaffQuery("soc-001"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().ContainSingle(a => a.StaffName == "Alice Guard");
    }
}

// ─── GetStaffAttendanceReportQueryHandler Tests ────────────────────────────────

public class GetStaffAttendanceReportQueryHandlerTests
{
    private readonly Mock<IStaffRepository> _staffRepoMock = new();
    private readonly Mock<IStaffAttendanceRepository> _attendanceRepoMock = new();

    private GetStaffAttendanceReportQueryHandler CreateHandler() => new(_staffRepoMock.Object, _attendanceRepoMock.Object);

    [Fact]
    public async Task Handle_AggregatesPresentAbsentAndLateCounts()
    {
        var staff = Staff.Create("soc-001", "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll);
        var day1 = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc);
        var day2 = day1.AddDays(1);
        var day3 = day1.AddDays(2);

        var presentOnTime = StaffAttendance.CheckIn("soc-001", staff.Id, staff.FullName, null, day1, isLate: false);
        var presentLate = StaffAttendance.CheckIn("soc-001", staff.Id, staff.FullName, null, day2, isLate: true);
        var absent = StaffAttendance.CreateAbsent("soc-001", staff.Id, staff.FullName, null, day3);

        _staffRepoMock.Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Staff>)[staff]);
        _attendanceRepoMock.Setup(r => r.GetBySocietyAndDateRangeAsync("soc-001", It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<StaffAttendance>)[presentOnTime, presentLate, absent]);

        var result = await CreateHandler().Handle(
            new GetStaffAttendanceReportQuery("soc-001", null, DateOnly.FromDateTime(day1), DateOnly.FromDateTime(day3)),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var entry = result.Value!.Entries.Should().ContainSingle().Subject;
        entry.PresentDays.Should().Be(2);
        entry.LateDays.Should().Be(1);
        entry.AbsentDays.Should().Be(1);
    }

    [Fact]
    public async Task Handle_FiltersByCategory()
    {
        var guard = Staff.Create("soc-001", "John Guard", "+91-9876543210", StaffCategory.Security, StaffEmploymentType.OnPayroll);
        var gardener = Staff.Create("soc-001", "Sam Gardener", "+91-1112223333", StaffCategory.Gardener, StaffEmploymentType.Contractor);

        _staffRepoMock.Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Staff>)[guard, gardener]);
        _attendanceRepoMock.Setup(r => r.GetBySocietyAndDateRangeAsync("soc-001", It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<StaffAttendance>)[]);

        var result = await CreateHandler().Handle(
            new GetStaffAttendanceReportQuery("soc-001", "Gardener", DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow)),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Entries.Should().ContainSingle(e => e.StaffId == gardener.Id);
    }
}
