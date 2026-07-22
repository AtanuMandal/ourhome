using ApartmentManagement.Application.Commands.Sos;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.Sos;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

// ─── TriggerSosAlertCommandHandler Tests ───────────────────────────────────────

public class TriggerSosAlertCommandHandlerTests
{
    private readonly Mock<ISosAlertRepository> _alertRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<TriggerSosAlertCommandHandler>> _loggerMock = new();

    private TriggerSosAlertCommandHandler CreateHandler() =>
        new(_alertRepoMock.Object, _apartmentRepoMock.Object, _userRepoMock.Object, _notificationMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithResidentLinkedToApartment_CreatesAlertAndNotifiesRespondersAndHousehold()
    {
        var apartment = Apartment.Create("soc-001", "A-101", "A", 1, 3, [], 500, 600, 700);
        var resident = User.Create("soc-001", "Jane Resident", "jane@test.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner, apartment.Id);
        var familyMember = User.Create("soc-001", "John Family", "john@test.com", "+91-1112223333", UserRole.SUUser, ResidentType.FamilyMember, apartment.Id);
        apartment.AssignOwner(resident.Id, resident.FullName);
        apartment.AddResident(familyMember.Id, familyMember.FullName, ResidentType.FamilyMember);

        var guard = User.Create("soc-001", "Security Guard", "guard@test.com", "+91-2223334444", UserRole.SUSecurity, ResidentType.SocietyAdmin);
        var admin = User.Create("soc-001", "Society Admin", "admin@test.com", "+91-3334445555", UserRole.SUAdmin, ResidentType.SocietyAdmin);

        _userRepoMock.Setup(r => r.GetByIdAsync(resident.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(resident);
        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(apartment);
        _alertRepoMock.Setup(r => r.CreateAsync(It.IsAny<SosAlert>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SosAlert a, CancellationToken _) => a);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUSecurity, 1, 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[guard]);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUAdmin, 1, 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[admin]);

        var result = await CreateHandler().Handle(
            new TriggerSosAlertCommand("soc-001", resident.Id, SosCategory.Fire, "Smoke in kitchen"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Category.Should().Be("Fire");
        result.Value.Status.Should().Be("Triggered");

        // Responders notified
        _notificationMock.Verify(n => n.SendPushNotificationAsync(guard.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Once);
        _notificationMock.Verify(n => n.SendPushNotificationAsync(admin.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Once);
        // Household member notified, triggering resident is not
        _notificationMock.Verify(n => n.SendPushNotificationAsync(familyMember.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Once);
        _notificationMock.Verify(n => n.SendPushNotificationAsync(resident.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WithResidentNotLinkedToApartment_ReturnsUserHasNoApartment()
    {
        var resident = User.Create("soc-001", "No Apartment User", "none@test.com", "+91-9999999999", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock.Setup(r => r.GetByIdAsync(resident.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(resident);

        var result = await CreateHandler().Handle(
            new TriggerSosAlertCommand("soc-001", resident.Id, SosCategory.Medical, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserHasNoApartment);
    }

    [Fact]
    public async Task Handle_WithMissingUser_ReturnsNotFound()
    {
        _userRepoMock.Setup(r => r.GetByIdAsync("missing", "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        var result = await CreateHandler().Handle(
            new TriggerSosAlertCommand("soc-001", "missing", SosCategory.Other, null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.NotFound);
    }
}

// ─── AcknowledgeSosAlertCommandHandler Tests ───────────────────────────────────

public class AcknowledgeSosAlertCommandHandlerTests
{
    private readonly Mock<ISosAlertRepository> _alertRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<ILogger<AcknowledgeSosAlertCommandHandler>> _loggerMock = new();

    private AcknowledgeSosAlertCommandHandler CreateHandler() =>
        new(_alertRepoMock.Object, _apartmentRepoMock.Object, _userRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithTriggeredAlert_AcknowledgesAndReturnsSuccess()
    {
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Fire, null);
        var guard = User.Create("soc-001", "Security Guard", "guard@test.com", "+91-2223334444", UserRole.SUSecurity, ResidentType.SocietyAdmin);

        _alertRepoMock.Setup(r => r.GetByIdAsync(alert.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(alert);
        _userRepoMock.Setup(r => r.GetByIdAsync(guard.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(guard);
        _alertRepoMock.Setup(r => r.UpdateAsync(It.IsAny<SosAlert>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SosAlert a, CancellationToken _) => a);

        var result = await CreateHandler().Handle(new AcknowledgeSosAlertCommand("soc-001", alert.Id, guard.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("Acknowledged");
        alert.AcknowledgedByUserName.Should().Be("Security Guard");
    }

    [Fact]
    public async Task Handle_WithAlreadyAcknowledgedAlert_ReturnsAlreadySettled()
    {
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Fire, null);
        alert.Acknowledge("guard-001", "First Guard");
        _alertRepoMock.Setup(r => r.GetByIdAsync(alert.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(alert);

        var result = await CreateHandler().Handle(new AcknowledgeSosAlertCommand("soc-001", alert.Id, "guard-002"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.SosAlertAlreadySettled);
    }

    [Fact]
    public async Task Handle_WithMissingAlert_ReturnsNotFound()
    {
        _alertRepoMock.Setup(r => r.GetByIdAsync("missing", "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((SosAlert?)null);

        var result = await CreateHandler().Handle(new AcknowledgeSosAlertCommand("soc-001", "missing", "guard-001"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.SosAlertNotFound);
    }
}

// ─── ResolveSosAlertCommandHandler Tests ───────────────────────────────────────

public class ResolveSosAlertCommandHandlerTests
{
    private readonly Mock<ISosAlertRepository> _alertRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<ILogger<ResolveSosAlertCommandHandler>> _loggerMock = new();

    private ResolveSosAlertCommandHandler CreateHandler() =>
        new(_alertRepoMock.Object, _apartmentRepoMock.Object, _userRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithAcknowledgedAlert_ResolvesAndReturnsSuccess()
    {
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Medical, null);
        alert.Acknowledge("guard-001", "Security Guard");
        var admin = User.Create("soc-001", "Society Admin", "admin@test.com", "+91-3334445555", UserRole.SUAdmin, ResidentType.SocietyAdmin);

        _alertRepoMock.Setup(r => r.GetByIdAsync(alert.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(alert);
        _userRepoMock.Setup(r => r.GetByIdAsync(admin.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(admin);
        _alertRepoMock.Setup(r => r.UpdateAsync(It.IsAny<SosAlert>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SosAlert a, CancellationToken _) => a);

        var result = await CreateHandler().Handle(new ResolveSosAlertCommand("soc-001", alert.Id, admin.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("Resolved");
    }

    [Fact]
    public async Task Handle_WithAlreadyResolvedAlert_ReturnsAlreadySettled()
    {
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Medical, null);
        alert.Resolve("admin-001", "Society Admin");
        _alertRepoMock.Setup(r => r.GetByIdAsync(alert.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(alert);

        var result = await CreateHandler().Handle(new ResolveSosAlertCommand("soc-001", alert.Id, "admin-001"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.SosAlertAlreadySettled);
    }
}

// ─── MarkSosAlertFalseAlarmCommandHandler Tests ────────────────────────────────

public class MarkSosAlertFalseAlarmCommandHandlerTests
{
    private readonly Mock<ISosAlertRepository> _alertRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ILogger<MarkSosAlertFalseAlarmCommandHandler>> _loggerMock = new();

    private MarkSosAlertFalseAlarmCommandHandler CreateHandler() =>
        new(_alertRepoMock.Object, _apartmentRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_ByTriggeringResident_MarksFalseAlarm()
    {
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Other, null);
        _alertRepoMock.Setup(r => r.GetByIdAsync(alert.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(alert);
        _alertRepoMock.Setup(r => r.UpdateAsync(It.IsAny<SosAlert>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SosAlert a, CancellationToken _) => a);

        var result = await CreateHandler().Handle(new MarkSosAlertFalseAlarmCommand("soc-001", alert.Id, "user-001"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("FalseAlarm");
    }

    [Fact]
    public async Task Handle_ByNonTriggeringUser_ReturnsForbidden()
    {
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Other, null);
        _alertRepoMock.Setup(r => r.GetByIdAsync(alert.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(alert);

        var result = await CreateHandler().Handle(new MarkSosAlertFalseAlarmCommand("soc-001", alert.Id, "some-other-user"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Forbidden);
    }

    [Fact]
    public async Task Handle_WhenAlreadyFalseAlarm_IsIdempotentSuccess()
    {
        // A repeat tap from a client showing a stale status must not error — the alert
        // is already in the requested state.
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Other, null);
        alert.MarkFalseAlarm();
        _alertRepoMock.Setup(r => r.GetByIdAsync(alert.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(alert);

        var result = await CreateHandler().Handle(new MarkSosAlertFalseAlarmCommand("soc-001", alert.Id, "user-001"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("FalseAlarm");
        _alertRepoMock.Verify(r => r.UpdateAsync(It.IsAny<SosAlert>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenAlreadyResolved_ReturnsAlreadySettled()
    {
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Other, null);
        alert.Resolve("admin-001", "Society Admin");
        _alertRepoMock.Setup(r => r.GetByIdAsync(alert.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(alert);

        var result = await CreateHandler().Handle(new MarkSosAlertFalseAlarmCommand("soc-001", alert.Id, "user-001"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.SosAlertAlreadySettled);
    }
}

// ─── GetSosAlertQueryHandler Tests ──────────────────────────────────────────────

public class GetSosAlertQueryHandlerTests
{
    private readonly Mock<ISosAlertRepository> _alertRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();

    private GetSosAlertQueryHandler CreateHandler() => new(_alertRepoMock.Object, _apartmentRepoMock.Object);

    [Fact]
    public async Task Handle_ByOwningResident_ReturnsAlert()
    {
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Fire, null);
        _alertRepoMock.Setup(r => r.GetByIdAsync(alert.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(alert);

        var result = await CreateHandler().Handle(new GetSosAlertQuery("soc-001", alert.Id, "user-001", "SUUser"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_ByAdmin_ReturnsAlert()
    {
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Fire, null);
        _alertRepoMock.Setup(r => r.GetByIdAsync(alert.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(alert);

        var result = await CreateHandler().Handle(new GetSosAlertQuery("soc-001", alert.Id, "admin-001", "SUAdmin"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_ByUnrelatedResident_StillReturnsAlert()
    {
        // Any authenticated society member can view an SOS alert — only acting on it
        // (acknowledge/resolve) is restricted to SUAdmin/SUSecurity.
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Fire, null);
        _alertRepoMock.Setup(r => r.GetByIdAsync(alert.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(alert);

        var result = await CreateHandler().Handle(new GetSosAlertQuery("soc-001", alert.Id, "other-user", "SUUser"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }
}

// ─── GetSosAlertsQueryHandler Tests ─────────────────────────────────────────────

public class GetSosAlertsQueryHandlerTests
{
    private readonly Mock<ISosAlertRepository> _alertRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();

    private GetSosAlertsQueryHandler CreateHandler() => new(_alertRepoMock.Object, _apartmentRepoMock.Object);

    [Fact]
    public async Task Handle_WithStatusFilter_ReturnsOnlyMatchingAlerts()
    {
        var triggered = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Fire, null);
        var resolved = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Medical, null);
        resolved.Resolve("admin-001", "Society Admin");

        _alertRepoMock.Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<SosAlert>)[triggered, resolved]);
        _apartmentRepoMock.Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Apartment>)[]);

        var result = await CreateHandler().Handle(
            new GetSosAlertsQuery("soc-001", SosAlertStatus.Triggered, null, null, null, new PaginationParams { Page = 1, PageSize = 20 }),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle(a => a.Id == triggered.Id);
    }
}

// ─── GetSosAlertReportQueryHandler Tests ────────────────────────────────────────

public class GetSosAlertReportQueryHandlerTests
{
    private readonly Mock<ISosAlertRepository> _alertRepoMock = new();

    private GetSosAlertReportQueryHandler CreateHandler() => new(_alertRepoMock.Object);

    [Fact]
    public async Task Handle_AggregatesFalseAlarmRateAndCategoryBreakdown()
    {
        var resolved = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Fire, null);
        resolved.Acknowledge("guard-001", "Guard");
        resolved.Resolve("guard-001", "Guard");

        var falseAlarm = SosAlert.Create("soc-001", "apt-002", "user-002", "Bob Resident", SosCategory.Fire, null);
        falseAlarm.MarkFalseAlarm();

        _alertRepoMock.Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<SosAlert>)[resolved, falseAlarm]);

        var result = await CreateHandler().Handle(
            new GetSosAlertReportQuery("soc-001", DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)), DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1))),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.TotalAlerts.Should().Be(2);
        result.Value.FalseAlarmRatePercent.Should().Be(50.0);
        result.Value.AverageAcknowledgeSeconds.Should().NotBeNull();
        result.Value.ByCategory.Should().ContainSingle(c => c.Category == "Fire" && c.Count == 2);
    }
}

// ─── EscalateSosAlertsCommandHandler Tests ─────────────────────────────────────

public class EscalateSosAlertsCommandHandlerTests
{
    private readonly Mock<ISosAlertRepository> _alertRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<EscalateSosAlertsCommandHandler>> _loggerMock = new();

    private EscalateSosAlertsCommandHandler CreateHandler() =>
        new(_alertRepoMock.Object, _userRepoMock.Object, _notificationMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithAlertPastEscalationWindow_EscalatesAndNotifiesResponders()
    {
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Fire, null);
        var guard = User.Create("soc-001", "Security Guard", "guard@test.com", "+91-2223334444", UserRole.SUSecurity, ResidentType.SocietyAdmin);

        _alertRepoMock.Setup(r => r.GetActiveAcrossSocietiesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<SosAlert>)[alert]);
        _alertRepoMock.Setup(r => r.UpdateAsync(It.IsAny<SosAlert>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SosAlert a, CancellationToken _) => a);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUSecurity, 1, 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[guard]);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUAdmin, 1, 200, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[]);

        // Simulate the sweep running 5 minutes after the alert was triggered — past the 2-minute window.
        var asOf = alert.CreatedAt.AddMinutes(5);
        var result = await CreateHandler().Handle(new EscalateSosAlertsCommand(asOf), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(1);
        alert.EscalationCount.Should().Be(1);
        _notificationMock.Verify(n => n.SendPushNotificationAsync(guard.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithAlertWithinEscalationWindow_DoesNotEscalate()
    {
        var alert = SosAlert.Create("soc-001", "apt-001", "user-001", "Jane Resident", SosCategory.Fire, null);

        _alertRepoMock.Setup(r => r.GetActiveAcrossSocietiesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<SosAlert>)[alert]);

        // Sweep running 1 minute after trigger — still within the 2-minute window.
        var asOf = alert.CreatedAt.AddMinutes(1);
        var result = await CreateHandler().Handle(new EscalateSosAlertsCommand(asOf), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(0);
        alert.EscalationCount.Should().Be(0);
        _alertRepoMock.Verify(r => r.UpdateAsync(It.IsAny<SosAlert>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
