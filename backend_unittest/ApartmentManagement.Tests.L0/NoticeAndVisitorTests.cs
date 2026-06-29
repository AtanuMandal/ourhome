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

public class NoticeReadStatusTests
{
    private const string SocietyId = "society-001";
    private const string UserId = "user-001";
    private const string AnotherUserId = "user-002";

    private static Notice CreateNotice() =>
        Notice.Create(SocietyId, UserId, "Test Notice", "Content",
            NoticeCategory.General, DateTime.UtcNow.AddMinutes(-1));

    [Fact]
    public void IsReadByUser_BeforeMarkingRead_ReturnsFalse()
    {
        var notice = CreateNotice();

        notice.IsReadByUser(UserId).Should().BeFalse();
    }

    [Fact]
    public void MarkAsRead_SetsReadStatus()
    {
        var notice = CreateNotice();

        notice.MarkAsRead(UserId);

        notice.IsReadByUser(UserId).Should().BeTrue();
    }

    [Fact]
    public void MarkAsRead_IsIdempotent()
    {
        var notice = CreateNotice();

        notice.MarkAsRead(UserId);
        notice.MarkAsRead(UserId);

        notice.ReadByUserIds.Count(id => id.Equals(UserId, StringComparison.OrdinalIgnoreCase))
            .Should().Be(1);
    }

    [Fact]
    public void MarkAsUnread_ClearsReadStatus()
    {
        var notice = CreateNotice();
        notice.MarkAsRead(UserId);

        notice.MarkAsUnread(UserId);

        notice.IsReadByUser(UserId).Should().BeFalse();
    }

    [Fact]
    public void MarkAsUnread_WhenNotRead_DoesNotThrow()
    {
        var notice = CreateNotice();

        var act = () => notice.MarkAsUnread(UserId);

        act.Should().NotThrow();
    }

    [Fact]
    public void MarkAsRead_TracksEachUserIndependently()
    {
        var notice = CreateNotice();

        notice.MarkAsRead(UserId);

        notice.IsReadByUser(UserId).Should().BeTrue();
        notice.IsReadByUser(AnotherUserId).Should().BeFalse();
    }

    [Fact]
    public void MarkAsRead_WithEmptyUserId_ThrowsArgumentException()
    {
        var notice = CreateNotice();

        var act = () => notice.MarkAsRead(string.Empty);

        act.Should().Throw<ArgumentException>();
    }
}

public class VisitorLogTests
{
    private const string SocietyId = "society-001";
    private const string HostApartmentId = "apt-001";
    private const string HostUserId = "user-001";

    private static VisitorLog CreateVisitorLog() =>
        VisitorLog.Create(SocietyId, "John Visitor", "+91-9876543210",
            "john@example.com", "Amazon", "Personal visit", HostApartmentId, HostUserId,
            "Resident User", "A", 1, "A-101", false);

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
    public void Create_WithPreApproval_StartsApprovedAndCapturesHostDetails()
    {
        var log = VisitorLog.Create(
            SocietyId,
            "Delivery Partner",
            "+91-9000000000",
            null,
            "Swiggy",
            "Food delivery",
            HostApartmentId,
            HostUserId,
            "Resident User",
            "B",
            8,
            "B-804",
            true,
            "WB01AA1111");

        log.Status.Should().Be(VisitorStatus.Approved);
        log.IsPreApproved.Should().BeTrue();
        log.ApprovedAt.Should().NotBeNull();
        log.HostResidentName.Should().Be("Resident User");
        log.HostFlatNumber.Should().Be("B-804");
        log.CompanyName.Should().Be("Swiggy");
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

    [Fact]
    public void CheckIn_WhenDenied_ThrowsInvalidOperationException()
    {
        var log = CreateVisitorLog();
        log.Deny();

        var act = () => log.CheckIn();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void CheckOut_WhenNotCheckedIn_ThrowsInvalidOperationException()
    {
        var log = CreateVisitorLog();
        log.Approve();

        var act = () => log.CheckOut();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Approve_WhenAlreadyApproved_RemainsApproved()
    {
        var log = CreateVisitorLog();
        log.Approve();
        var firstApprovedAt = log.ApprovedAt;

        log.Approve(); // idempotent call

        log.Status.Should().Be(VisitorStatus.Approved);
        log.ApprovedAt.Should().Be(firstApprovedAt);
    }

    [Fact]
    public void Duration_BeforeCheckOut_ReturnsNull()
    {
        var log = CreateVisitorLog();
        log.Approve();
        log.CheckIn();

        log.Duration.Should().BeNull();
    }

    [Fact]
    public void Create_WithEmptyVisitorName_ThrowsArgumentException()
    {
        var act = () => VisitorLog.Create(SocietyId, "", "+91-9876543210",
            null, null, "Visit", HostApartmentId, HostUserId, "Resident", "A", 1, "A-101", false);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithValidUntil_SetsExpiryCorrectly()
    {
        var validUntil = DateTime.UtcNow.AddHours(4);
        var log = VisitorLog.Create(SocietyId, "Visitor", "+91-9876543210",
            null, null, "Visit", HostApartmentId, HostUserId, "Resident", "A", 1, "A-101",
            true, null, validUntil);

        log.ValidUntil.Should().BeCloseTo(validUntil, TimeSpan.FromSeconds(1));
        log.IsPassExpired.Should().BeFalse();
    }

    [Fact]
    public void IsPassExpired_WhenValidUntilInPast_ReturnsTrue()
    {
        var log = VisitorLog.Create(SocietyId, "Visitor", "+91-9876543210",
            null, null, "Visit", HostApartmentId, HostUserId, "Resident", "A", 1, "A-101",
            true, null, DateTime.UtcNow.AddHours(-1));

        log.IsPassExpired.Should().BeTrue();
    }

    [Fact]
    public void CheckIn_WhenPassExpired_ThrowsInvalidOperationException()
    {
        var log = VisitorLog.Create(SocietyId, "Visitor", "+91-9876543210",
            null, null, "Visit", HostApartmentId, HostUserId, "Resident", "A", 1, "A-101",
            true, null, DateTime.UtcNow.AddHours(-1));

        var act = () => log.CheckIn();

        act.Should().Throw<InvalidOperationException>().WithMessage("*expired*");
    }

    [Fact]
    public void CheckIn_WhenValidUntilNull_SucceedsWithoutExpiry()
    {
        var log = VisitorLog.Create(SocietyId, "Visitor", "+91-9876543210",
            null, null, "Visit", HostApartmentId, HostUserId, "Resident", "A", 1, "A-101",
            true, null, validUntil: null);

        var act = () => log.CheckIn();

        act.Should().NotThrow();
        log.Status.Should().Be(VisitorStatus.CheckedIn);
    }

    [Fact]
    public void Create_WithImageUrl_StoresImageUrl()
    {
        const string imageUrl = "https://storage.example.com/visitor-images/test.jpg";
        var log = VisitorLog.Create(SocietyId, "Visitor", "+91-9876543210",
            null, null, "Visit", HostApartmentId, HostUserId, "Resident", "A", 1, "A-101",
            false, null, null, imageUrl);

        log.VisitorImageUrl.Should().Be(imageUrl);
    }

    [Fact]
    public void UpdateVisitorImageUrl_SetsImageUrl()
    {
        var log = CreateVisitorLog();
        const string imageUrl = "https://storage.example.com/visitor-images/new.jpg";

        log.UpdateVisitorImageUrl(imageUrl);

        log.VisitorImageUrl.Should().Be(imageUrl);
    }

    [Fact]
    public void UpdateVisitorImageUrl_WithEmptyString_ThrowsArgumentException()
    {
        var log = CreateVisitorLog();

        var act = () => log.UpdateVisitorImageUrl(string.Empty);

        act.Should().Throw<ArgumentException>();
    }
}
