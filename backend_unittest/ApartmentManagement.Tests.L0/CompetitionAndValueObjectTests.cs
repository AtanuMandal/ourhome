using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.ValueObjects;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class CompetitionTests
{
    private const string SocietyId = "society-001";
    private const string CreatedByUserId = "user-001";

    [Fact]
    public void Create_WithValidParameters_ReturnsUpcomingCompetition()
    {
        // Arrange
        var start = DateTime.UtcNow.AddDays(7);
        var end = DateTime.UtcNow.AddDays(14);

        // Act
        var competition = Competition.Create(SocietyId, CreatedByUserId, "Art Competition", "Paint your best", start, end, "Trophy");

        // Assert
        competition.Id.Should().NotBeNullOrEmpty();
        competition.Status.Should().Be(CompetitionStatus.Upcoming);
        competition.Title.Should().Be("Art Competition");
        competition.MaxParticipants.Should().BeNull();
    }

    [Fact]
    public void Create_WithEndBeforeStart_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => Competition.Create(SocietyId, CreatedByUserId, "Art", "desc",
            DateTime.UtcNow.AddDays(5), DateTime.UtcNow.AddDays(1), "Prize");

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithMaxParticipantsLessThan2_ThrowsArgumentOutOfRangeException()
    {
        // Arrange & Act
        var act = () => Competition.Create(SocietyId, CreatedByUserId, "Art", "desc",
            DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(7), "Prize", 1);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Start_FromUpcomingStatus_ChangesToActive()
    {
        // Arrange
        var competition = Competition.Create(SocietyId, CreatedByUserId, "Art", "desc",
            DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(7), "Prize");

        // Act
        competition.Start();

        // Assert
        competition.Status.Should().Be(CompetitionStatus.Active);
    }

    [Fact]
    public void Start_WhenAlreadyActive_ThrowsInvalidOperationException()
    {
        // Arrange
        var competition = Competition.Create(SocietyId, CreatedByUserId, "Art", "desc",
            DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(7), "Prize");
        competition.Start();

        // Act
        var act = () => competition.Start();

        // Assert
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Complete_SetsStatusCompleted()
    {
        // Arrange
        var competition = Competition.Create(SocietyId, CreatedByUserId, "Art", "desc",
            DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(7), "Prize");
        competition.Start();

        // Act
        competition.Complete();

        // Assert
        competition.Status.Should().Be(CompetitionStatus.Completed);
    }

    [Fact]
    public void Cancel_SetsStatusCancelled()
    {
        // Arrange
        var competition = Competition.Create(SocietyId, CreatedByUserId, "Art", "desc",
            DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(7), "Prize");

        // Act
        competition.Cancel();

        // Assert
        competition.Status.Should().Be(CompetitionStatus.Cancelled);
    }
}

public class RewardPointsTests
{
    private const string SocietyId = "society-001";
    private const string UserId = "user-001";
    private const string ApartmentId = "apt-001";

    [Fact]
    public void Create_WithPositivePoints_CreatesAndRaisesEvent()
    {
        // Arrange & Act
        var rp = RewardPoints.Create(SocietyId, UserId, ApartmentId, 100, "Early payment bonus");

        // Assert
        rp.Id.Should().NotBeNullOrEmpty();
        rp.Points.Should().Be(100);
        rp.Reason.Should().Be("Early payment bonus");
        rp.DomainEvents.Should().ContainSingle(e => e is PointsAwardedEvent);
    }

    [Fact]
    public void Create_WithNegativePoints_DoesNotRaiseEvent()
    {
        // Arrange & Act
        var rp = RewardPoints.Create(SocietyId, UserId, ApartmentId, -50, "Redemption");

        // Assert
        rp.DomainEvents.Should().BeEmpty();
    }

    [Fact]
    public void Create_WithEmptyReason_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => RewardPoints.Create(SocietyId, UserId, ApartmentId, 50, "");

        // Assert
        act.Should().Throw<ArgumentException>();
    }
}

public class ServiceProviderTests
{
    [Fact]
    public void Create_WithValidParameters_ReturnsPendingProvider()
    {
        // Arrange & Act
        var provider = ServiceProvider.Create(
            "QuickFix", "John Fix", "+91-9876543210", "john@quickfix.com",
            new[] { "Plumbing", "Electrical" }, "Fast reliable service");

        // Assert
        provider.Id.Should().NotBeNullOrEmpty();
        provider.Status.Should().Be(ServiceProviderStatus.Pending);
        provider.ProviderName.Should().Be("QuickFix");
        provider.ServiceTypes.Should().HaveCount(2);
    }

    [Fact]
    public void Create_WithNoServiceTypes_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => ServiceProvider.Create(
            "QuickFix", "John", "+91-9876543210", "john@qf.com",
            Array.Empty<string>(), "desc");

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Approve_SetsStatusApproved()
    {
        // Arrange
        var provider = ServiceProvider.Create(
            "QuickFix", "John", "+91-9876543210", "john@qf.com",
            new[] { "Plumbing" }, "desc");

        // Act
        provider.Approve();

        // Assert
        provider.Status.Should().Be(ServiceProviderStatus.Approved);
    }

    [Fact]
    public void UpdateRating_CalculatesRunningAverage()
    {
        // Arrange
        var provider = ServiceProvider.Create(
            "QuickFix", "John", "+91-9876543210", "john@qf.com",
            new[] { "Plumbing" }, "desc");

        // Act
        provider.UpdateRating(4m);
        provider.UpdateRating(5m);

        // Assert
        provider.ReviewCount.Should().Be(2);
        provider.Rating.Should().BeApproximately(4.5m, 0.01m);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void UpdateRating_WithOutOfRangeValue_ThrowsArgumentOutOfRangeException(int rating)
    {
        // Arrange
        var provider = ServiceProvider.Create(
            "QuickFix", "John", "+91-9876543210", "john@qf.com",
            new[] { "Plumbing" }, "desc");

        // Act
        var act = () => provider.UpdateRating(rating);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}

public class CompetitionEntryTests
{
    private const string SocietyId = "society-001";

    [Fact]
    public void Create_WithValidParameters_HasZeroScore()
    {
        // Arrange & Act
        var entry = CompetitionEntry.Create(SocietyId, "comp-001", "apt-001", "user-001");

        // Assert
        entry.Id.Should().NotBeNullOrEmpty();
        entry.Score.Should().Be(0m);
        entry.Rank.Should().BeNull();
    }

    [Fact]
    public void Create_SetsRegisteredAtToNow()
    {
        // Arrange & Act
        var entry = CompetitionEntry.Create(SocietyId, "comp-001", "apt-001", "user-001");

        // Assert
        entry.RegisteredAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void UpdateScore_ChangesScoreToNewValue()
    {
        // Arrange
        var entry = CompetitionEntry.Create(SocietyId, "comp-001", "apt-001", "user-001");

        // Act
        entry.UpdateScore(85.5m);

        // Assert
        entry.Score.Should().Be(85.5m);
    }

    [Fact]
    public void SetRank_SetsRankValue()
    {
        // Arrange
        var entry = CompetitionEntry.Create(SocietyId, "comp-001", "apt-001", "user-001");

        // Act
        entry.SetRank(1);

        // Assert
        entry.Rank.Should().Be(1);
    }
}

public class ServiceProviderRequestTests
{
    private const string SocietyId = "society-001";

    private static ServiceProviderRequest CreateRequest() =>
        ServiceProviderRequest.Create(SocietyId, "apt-001", "user-001",
            "Plumbing", "Fix leaking pipe", DateTime.UtcNow.AddDays(1));

    [Fact]
    public void Create_WithValidParameters_HasOpenStatus()
    {
        // Arrange & Act
        var request = CreateRequest();

        // Assert
        request.Id.Should().NotBeNullOrEmpty();
        request.Status.Should().Be(ServiceRequestStatus.Open);
        request.ServiceType.Should().Be("Plumbing");
        request.AcceptedByProviderId.Should().BeNull();
    }

    [Fact]
    public void Accept_SetsAcceptedStatusAndProviderId()
    {
        // Arrange
        var request = CreateRequest();
        var providerId = "provider-001";

        // Act
        request.Accept(providerId);

        // Assert
        request.Status.Should().Be(ServiceRequestStatus.Accepted);
        request.AcceptedByProviderId.Should().Be(providerId);
    }

    [Fact]
    public void Complete_SetsCompletedStatus()
    {
        // Arrange
        var request = CreateRequest();
        request.Accept("provider-001");
        request.StartWork();

        // Act
        request.Complete();

        // Assert
        request.Status.Should().Be(ServiceRequestStatus.Completed);
    }

    [Fact]
    public void AddReview_WithValidRating_SetsRatingAndComment()
    {
        // Arrange
        var request = CreateRequest();

        // Act
        request.AddReview(4, "Good service");

        // Assert
        request.Rating.Should().Be(4);
        request.ReviewComment.Should().Be("Good service");
    }

    [Fact]
    public void AddReview_WithRatingAbove5_ThrowsArgumentOutOfRangeException()
    {
        // Arrange
        var request = CreateRequest();

        // Act
        var act = () => request.AddReview(6, "Too good");

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void AddReview_WithRatingBelow1_ThrowsArgumentOutOfRangeException()
    {
        // Arrange
        var request = CreateRequest();

        // Act
        var act = () => request.AddReview(0, "Zero");

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

public class AddressTests
{
}


    [Fact]
    public void Address_WithValidData_CreatesSuccessfully()
    {
        // Arrange & Act
        var address = new Address("123 Main St", "Mumbai", "Maharashtra", "400001", "India");

        // Assert
        address.Street.Should().Be("123 Main St");
        address.City.Should().Be("Mumbai");
        address.PostalCode.Should().Be("400001");
    }

    [Fact]
    public void Address_Validate_WithEmptyStreet_ThrowsArgumentException()
    {
        // Arrange
        var address = new Address("", "Mumbai", "Maharashtra", "400001", "India");

        // Act
        var act = () => address.Validate();

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*Street*");
    }

    [Fact]
    public void Address_Equality_TwoSameAddressesAreEqual()
    {
        // Arrange
        var a1 = new Address("123 Main St", "Mumbai", "Maharashtra", "400001", "India");
        var a2 = new Address("123 Main St", "Mumbai", "Maharashtra", "400001", "India");

        // Assert
        a1.Should().Be(a2);
    }

    [Fact]
    public void MaintenanceFeeStructure_CalculateTotal_ReturnsCorrectAmount()
    {
        // Arrange
        var fee = new MaintenanceFeeStructure(1000m, 200m, 500m);

        // Act
        var total = fee.CalculateTotal(3, 1);

        // Assert
        total.Should().Be(2100m); // 1000 + (200*3) + (500*1)
    }

    [Fact]
    public void MaintenanceFeeStructure_Equality_TwoSameStructuresAreEqual()
    {
        // Arrange
        var f1 = new MaintenanceFeeStructure(1000m, 200m, 500m);
        var f2 = new MaintenanceFeeStructure(1000m, 200m, 500m);

        // Assert
        f1.Should().Be(f2);
    }
}