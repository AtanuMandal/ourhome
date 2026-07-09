using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class SosAlertTests
{
    private const string SocietyId = "society-001";
    private const string ApartmentId = "apt-001";
    private const string UserId = "user-001";

    private static SosAlert CreateAlert() =>
        SosAlert.Create(SocietyId, ApartmentId, UserId, "Jane Resident", SosCategory.Fire, "Smoke in the kitchen");

    [Fact]
    public void Create_WithValidParameters_ReturnsTriggeredAlert()
    {
        var alert = CreateAlert();

        alert.Id.Should().NotBeNullOrEmpty();
        alert.Status.Should().Be(SosAlertStatus.Triggered);
        alert.Category.Should().Be(SosCategory.Fire);
        alert.Note.Should().Be("Smoke in the kitchen");
        alert.TriggeredByUserId.Should().Be(UserId);
        alert.EscalationCount.Should().Be(0);
    }

    [Fact]
    public void Create_WithEmptyApartmentId_ThrowsArgumentException()
    {
        var act = () => SosAlert.Create(SocietyId, "", UserId, "Jane Resident", SosCategory.Fire, null);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithNoNote_LeavesNoteNull()
    {
        var alert = SosAlert.Create(SocietyId, ApartmentId, UserId, "Jane Resident", SosCategory.Medical, null);
        alert.Note.Should().BeNull();
    }

    [Fact]
    public void Acknowledge_FromTriggered_SetsStatusAcknowledgedAndRecordsResponder()
    {
        var alert = CreateAlert();

        alert.Acknowledge("guard-001", "Security Guard");

        alert.Status.Should().Be(SosAlertStatus.Acknowledged);
        alert.AcknowledgedByUserId.Should().Be("guard-001");
        alert.AcknowledgedByUserName.Should().Be("Security Guard");
        alert.AcknowledgedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void Acknowledge_WhenAlreadyAcknowledged_ThrowsInvalidOperationException()
    {
        var alert = CreateAlert();
        alert.Acknowledge("guard-001", "Security Guard");

        var act = () => alert.Acknowledge("guard-002", "Another Guard");

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Resolve_FromTriggered_SetsStatusResolved()
    {
        var alert = CreateAlert();

        alert.Resolve("admin-001", "Society Admin");

        alert.Status.Should().Be(SosAlertStatus.Resolved);
        alert.ResolvedByUserId.Should().Be("admin-001");
        alert.ResolvedAt.Should().NotBeNull();
    }

    [Fact]
    public void Resolve_FromAcknowledged_SetsStatusResolved()
    {
        var alert = CreateAlert();
        alert.Acknowledge("guard-001", "Security Guard");

        alert.Resolve("guard-001", "Security Guard");

        alert.Status.Should().Be(SosAlertStatus.Resolved);
    }

    [Fact]
    public void Resolve_WhenAlreadyResolved_ThrowsInvalidOperationException()
    {
        var alert = CreateAlert();
        alert.Resolve("admin-001", "Society Admin");

        var act = () => alert.Resolve("admin-001", "Society Admin");

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void MarkFalseAlarm_FromTriggered_SetsStatusFalseAlarmAndResolvedAt()
    {
        var alert = CreateAlert();

        alert.MarkFalseAlarm();

        alert.Status.Should().Be(SosAlertStatus.FalseAlarm);
        alert.ResolvedAt.Should().NotBeNull();
    }

    [Fact]
    public void MarkFalseAlarm_WhenAlreadyResolved_ThrowsInvalidOperationException()
    {
        var alert = CreateAlert();
        alert.Resolve("admin-001", "Society Admin");

        var act = () => alert.MarkFalseAlarm();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void RecordEscalation_FromTriggered_IncrementsCountAndSetsLastEscalatedAt()
    {
        var alert = CreateAlert();

        alert.RecordEscalation();

        alert.EscalationCount.Should().Be(1);
        alert.LastEscalatedAt.Should().NotBeNull();

        alert.RecordEscalation();
        alert.EscalationCount.Should().Be(2);
    }

    [Fact]
    public void RecordEscalation_WhenAcknowledged_ThrowsInvalidOperationException()
    {
        var alert = CreateAlert();
        alert.Acknowledge("guard-001", "Security Guard");

        var act = () => alert.RecordEscalation();

        act.Should().Throw<InvalidOperationException>();
    }
}
