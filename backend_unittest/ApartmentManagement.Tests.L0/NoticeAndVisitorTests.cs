using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class NoticeTests
{
    private const string SocietyId = "society-001";
    private const string AuthorId = "user-001";

    private static Notice CreateNotice(DateTime? publishAt = null, DateTime? expiresAt = null) =>
        Notice.Create(SocietyId, AuthorId, "Water Shutdown",
            "Water supply will be off tomorrow 9-11 AM",
            NoticeCategory.Maintenance, publishAt ?? DateTime.UtcNow.AddMinutes(-1), expiresAt);

    [Fact]
    public void Create_WithValidParameters_ReturnsActiveNotice()
    {
        // Arrange & Act
        var notice = CreateNotice();

        // Assert
        notice.Id.Should().NotBeNullOrEmpty();
        notice.Title.Should().Be("Water Shutdown");
        notice.IsArchived.Should().BeFalse();
        notice.Category.Should().Be(NoticeCategory.Maintenance);
    }

    [Fact]
    public void Create_RaisesNoticePostedEvent()
    {
        // Arrange & Act
        var notice = CreateNotice();

        // Assert
        notice.DomainEvents.Should().ContainSingle(e => e is NoticePostedEvent);
    }

    [Fact]
    public void Create_WithEmptyTitle_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => Notice.Create(SocietyId, AuthorId, "", "Content", NoticeCategory.General, DateTime.UtcNow);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void IsActive_PublishedNoticeInDateRange_ReturnsTrue()
    {
        // Arrange
        var notice = CreateNotice(
            publishAt: DateTime.UtcNow.AddMinutes(-5),
            expiresAt: DateTime.UtcNow.AddDays(7));

        // Assert
        notice.IsActive.Should().BeTrue();
    }

    [Fact]
    public void IsActive_ExpiredNotice_ReturnsFalse()
    {
        // Arrange
        var notice = CreateNotice(
            publishAt: DateTime.UtcNow.AddDays(-10),
            expiresAt: DateTime.UtcNow.AddDays(-1));

        // Assert
        notice.IsActive.Should().BeFalse();
    }

    [Fact]
    public void IsActive_FuturePublishAt_ReturnsFalse()
    {
        // Arrange
        var notice = CreateNotice(publishAt: DateTime.UtcNow.AddHours(2));

        // Assert
        notice.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Archive_SetsArchivedAndArchivedAt()
    {
        // Arrange
        var notice = CreateNotice();

        // Act
        notice.Archive();

        // Assert
        notice.IsArchived.Should().BeTrue();
        notice.ArchivedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void IsActive_ArchivedNotice_ReturnsFalse()
    {
        // Arrange
        var notice = CreateNotice(publishAt: DateTime.UtcNow.AddMinutes(-5));
        notice.Archive();

        // Assert
        notice.IsActive.Should().BeFalse();
    }

    [Fact]
    public void UpdateContent_UpdatesTitleAndContent()
    {
        // Arrange
        var notice = CreateNotice();

        // Act
        notice.UpdateContent("Updated Title", "Updated Content", null);

        // Assert
        notice.Title.Should().Be("Updated Title");
        notice.Content.Should().Be("Updated Content");
    }

    [Fact]
    public void Create_WithTargetApartments_SetsTargetList()
    {
        // Arrange
        var targets = new[] { "apt-001", "apt-002" };

        // Act
        var notice = Notice.Create(SocietyId, AuthorId, "Title", "Content",
            NoticeCategory.General, DateTime.UtcNow, null, targets);

        // Assert
        notice.TargetApartmentIds.Should().HaveCount(2);
        notice.TargetApartmentIds.Should().Contain("apt-001");
    }
}

public class VisitorLogTests
{
    private const string SocietyId = "society-001";
    private const string HostApartmentId = "apt-001";
    private const string HostUserId = "user-001";
    private const string RegisteredByUserId = "security-001";

    private static VisitorLog CreateVisitorLog() =>
        VisitorLog.Create(SocietyId, "John Visitor", "+91-9876543210",
            "john@example.com", "Personal visit", HostApartmentId, HostUserId, RegisteredByUserId, true);

    [Fact]
    public void Create_WithValidParameters_ReturnsPendingVisitorLog()
    {
        // Arrange & Act
        var log = CreateVisitorLog();

        // Assert
        log.Id.Should().NotBeNullOrEmpty();
        log.Status.Should().Be(VisitorStatus.Pending);
        log.VisitorName.Should().Be("John Visitor");
        log.PassCode.Should().NotBeNullOrEmpty();
        log.QrCode.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void Create_RaisesVisitorArrivedEvent()
    {
        // Arrange & Act
        var log = CreateVisitorLog();

        // Assert
        log.DomainEvents.Should().ContainSingle(e => e is VisitorArrivedEvent);
    }

    [Fact]
    public void Approve_SetsStatusApproved()
    {
        // Arrange
        var log = CreateVisitorLog();

        // Act
        log.Approve();

        // Assert
        log.Status.Should().Be(VisitorStatus.Approved);
    }

    [Fact]
    public void CheckIn_AfterApproval_SetsStatusCheckedIn()
    {
        // Arrange
        var log = CreateVisitorLog();
        log.Approve();

        // Act
        log.CheckIn();

        // Assert
        log.Status.Should().Be(VisitorStatus.CheckedIn);
        log.CheckInTime.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void CheckIn_WithoutApproval_ThrowsInvalidOperationException()
    {
        // Arrange
        var log = CreateVisitorLog();

        // Act
        var act = () => log.CheckIn();

        // Assert
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void CheckOut_AfterCheckIn_SetsStatusCheckedOut()
    {
        // Arrange
        var log = CreateVisitorLog();
        log.Approve();
        log.CheckIn();

        // Act
        log.CheckOut();

        // Assert
        log.Status.Should().Be(VisitorStatus.CheckedOut);
        log.CheckOutTime.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void Duration_AfterCheckOut_ReturnsVisitDuration()
    {
        // Arrange
        var log = CreateVisitorLog();
        log.Approve();
        log.CheckIn();
        System.Threading.Thread.Sleep(100);
        log.CheckOut();

        // Assert
        log.Duration.Should().NotBeNull();
        log.Duration!.Value.TotalMilliseconds.Should().BeGreaterThan(0);
    }

    [Fact]
    public void Deny_SetsStatusDenied()
    {
        // Arrange
        var log = CreateVisitorLog();

        // Act
        log.Deny();

        // Assert
        log.Status.Should().Be(VisitorStatus.Denied);
    }
}
