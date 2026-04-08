using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class ComplaintTests
{
    private const string SocietyId = "society-001";
    private const string ApartmentId = "apt-001";
    private const string UserId = "user-001";

    private static Complaint CreateComplaint() =>
        Complaint.Create(SocietyId, ApartmentId, UserId,
            "Leaking Pipe", "Water leaking in bathroom", ComplaintCategory.Maintenance, ComplaintPriority.High);

    [Fact]
    public void Create_WithValidParameters_ReturnsComplaintInOpenStatus()
    {
        // Arrange & Act
        var complaint = CreateComplaint();

        // Assert
        complaint.Id.Should().NotBeNullOrEmpty();
        complaint.Status.Should().Be(ComplaintStatus.Open);
        complaint.Title.Should().Be("Leaking Pipe");
        complaint.Category.Should().Be(ComplaintCategory.Maintenance);
        complaint.Priority.Should().Be(ComplaintPriority.High);
    }

    [Fact]
    public void Create_RaisesComplaintCreatedEvent()
    {
        // Arrange & Act
        var complaint = CreateComplaint();

        // Assert
        complaint.DomainEvents.Should().ContainSingle(e => e is ComplaintCreatedEvent);
    }

    [Fact]
    public void Create_WithEmptyTitle_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => Complaint.Create(SocietyId, ApartmentId, UserId, "", "desc", ComplaintCategory.Maintenance, ComplaintPriority.Low);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Assign_SetsAssigneeAndChangesStatusToInProgress()
    {
        // Arrange
        var complaint = CreateComplaint();
        var staffId = "staff-001";

        // Act
        complaint.Assign(staffId);

        // Assert
        complaint.AssignedToUserId.Should().Be(staffId);
        complaint.Status.Should().Be(ComplaintStatus.InProgress);
    }

    [Fact]
    public void Resolve_SetsStatusResolvedAndSetsResolvedAt()
    {
        // Arrange
        var complaint = CreateComplaint();
        complaint.Assign("staff-001");

        // Act
        complaint.Resolve();

        // Assert
        complaint.Status.Should().Be(ComplaintStatus.Resolved);
        complaint.ResolvedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void Close_SetsStatusClosed()
    {
        // Arrange
        var complaint = CreateComplaint();
        complaint.Resolve();

        // Act
        complaint.Close();

        // Assert
        complaint.Status.Should().Be(ComplaintStatus.Closed);
    }

    [Fact]
    public void Reject_SetsStatusRejected()
    {
        // Arrange
        var complaint = CreateComplaint();

        // Act
        complaint.Reject("Not a valid complaint");

        // Assert
        complaint.Status.Should().Be(ComplaintStatus.Rejected);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(3)]
    [InlineData(5)]
    public void AddFeedback_WithValidRating_SetsFeedback(int rating)
    {
        // Arrange
        var complaint = CreateComplaint();
        complaint.Resolve();

        // Act
        complaint.AddFeedback(rating, "Good job!");

        // Assert
        complaint.FeedbackRating.Should().Be(rating);
        complaint.FeedbackComment.Should().Be("Good job!");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void AddFeedback_WithInvalidRating_ThrowsArgumentOutOfRangeException(int rating)
    {
        // Arrange
        var complaint = CreateComplaint();

        // Act
        var act = () => complaint.AddFeedback(rating, null);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void AddAttachment_AppendsUrl()
    {
        // Arrange
        var complaint = CreateComplaint();
        var url = "https://storage.example.com/photo.jpg";

        // Act
        complaint.AddAttachment(url);

        // Assert
        complaint.AttachmentUrls.Should().Contain(url);
    }

    [Fact]
    public void Create_WithAttachments_SetsAttachmentUrls()
    {
        // Arrange
        var urls = new[] { "https://example.com/img1.jpg", "https://example.com/img2.jpg" };

        // Act
        var complaint = Complaint.Create(SocietyId, ApartmentId, UserId,
            "Noisy Neighbor", "Loud music at night", ComplaintCategory.Noise, ComplaintPriority.Medium, urls);

        // Assert
        complaint.AttachmentUrls.Should().HaveCount(2);
    }
}
