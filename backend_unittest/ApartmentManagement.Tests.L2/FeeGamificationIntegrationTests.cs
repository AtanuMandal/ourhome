using ApartmentManagement.Application.Commands.Fee;
using ApartmentManagement.Application.Commands.Gamification;
using ApartmentManagement.Application.Queries.Fee;
using ApartmentManagement.Application.Queries.Gamification;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Shared.Models;
using ApartmentManagement.Tests.L2.TestInfrastructure;
using FluentAssertions;

namespace ApartmentManagement.Tests.L2;

public class FeeGamificationIntegrationTests : IntegrationTestBase
{
    private const string SocietyId = "society-fee-001";
    private const string ApartmentId = "apt-fee-001";
    private const string UserId = "user-fee-001";

    // ─── Fee Schedule: create → retrieve ─────────────────────────────────────

    [Fact]
    public async Task CreateFeeSchedule_ThenGetById_ReturnsSchedule()
    {
        var cmd = new CreateFeeScheduleCommand(
            SocietyId, ApartmentId, "Monthly Maintenance",
            1500m, FeeFrequency.Monthly, 5);

        var createResult = await Mediator.Send(cmd);

        createResult.IsSuccess.Should().BeTrue();
        var schedule = createResult.Value!;
        schedule.Description.Should().Be("Monthly Maintenance");
        schedule.Amount.Should().Be(1500m);
        schedule.IsActive.Should().BeTrue();

        var getResult = await Mediator.Send(new GetFeeScheduleQuery(SocietyId, schedule.Id));
        getResult.IsSuccess.Should().BeTrue();
        getResult.Value!.Id.Should().Be(schedule.Id);
    }

    [Fact]
    public async Task GetFeeSchedulesByApartment_ReturnsBothSchedules()
    {
        await Mediator.Send(new CreateFeeScheduleCommand(
            SocietyId, ApartmentId, "Maintenance", 1500m, FeeFrequency.Monthly, 5));
        await Mediator.Send(new CreateFeeScheduleCommand(
            SocietyId, ApartmentId, "Parking", 500m, FeeFrequency.Monthly, 5));

        var result = await Mediator.Send(new GetFeeSchedulesByApartmentQuery(SocietyId, ApartmentId));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Should().HaveCountGreaterThanOrEqualTo(2);
    }

    // ─── Fee Schedule: update ─────────────────────────────────────────────────

    [Fact]
    public async Task UpdateFeeSchedule_NewAmountIsPersisted()
    {
        var schedule = (await Mediator.Send(new CreateFeeScheduleCommand(
            SocietyId, ApartmentId, "Water Bill", 300m, FeeFrequency.Monthly, 10))).Value!;

        var updateResult = await Mediator.Send(new UpdateFeeScheduleCommand(
            SocietyId, schedule.Id, 350m, "Water Bill Updated"));

        updateResult.IsSuccess.Should().BeTrue();
        updateResult.Value!.Amount.Should().Be(350m);
    }

    // ─── Fee Schedule: deactivate ─────────────────────────────────────────────

    [Fact]
    public async Task DeactivateFeeSchedule_IsActiveBecomesFalse()
    {
        var schedule = (await Mediator.Send(new CreateFeeScheduleCommand(
            SocietyId, ApartmentId, "Old Charge", 200m, FeeFrequency.Annual, 15))).Value!;

        var deactivateResult = await Mediator.Send(new DeactivateFeeScheduleCommand(SocietyId, schedule.Id));

        deactivateResult.IsSuccess.Should().BeTrue();
        FeeScheduleRepo.Store[schedule.Id].IsActive.Should().BeFalse();
    }

    // ─── Fee Payment: create a pending payment then record it ────────────────

    [Fact]
    public async Task RecordFeePayment_ChangesStatusToPaid()
    {
        // Seed a pending FeePayment directly into the fake repository
        var payment = FeePayment.Create(SocietyId, ApartmentId, "schedule-001",
            "Monthly Maintenance", 1500m, DateTime.UtcNow.AddDays(5));
        await FeePaymentRepo.CreateAsync(payment);

        // Record the payment
        var recordResult = await Mediator.Send(new RecordFeePaymentCommand(
            SocietyId, payment.Id, "UPI", "TXN-001", "https://receipts/001"));

        recordResult.IsSuccess.Should().BeTrue();
        recordResult.Value!.Status.Should().Be("Paid");
        recordResult.Value.TransactionId.Should().Be("TXN-001");
    }

    [Fact]
    public async Task RecordFeePayment_PublishesFeePaymentReceivedEvent()
    {
        var payment = FeePayment.Create(SocietyId, ApartmentId, "schedule-002",
            "Parking Fee", 500m, DateTime.UtcNow.AddDays(3));
        await FeePaymentRepo.CreateAsync(payment);

        await Mediator.Send(new RecordFeePaymentCommand(
            SocietyId, payment.Id, "NetBanking", "TXN-002", null));

        EventPublisher.PublishedEvents.Should().Contain(e =>
            e.GetType().Name == "FeePaymentReceivedEvent");
    }

    // ─── GetFeeHistory ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetFeeHistory_AfterRecordingPayment_ReturnsPaidRecord()
    {
        var payment = FeePayment.Create(SocietyId, ApartmentId, "schedule-003",
            "Club Fee", 750m, DateTime.UtcNow.AddDays(2));
        await FeePaymentRepo.CreateAsync(payment);

        await Mediator.Send(new RecordFeePaymentCommand(
            SocietyId, payment.Id, "Cash", "TXN-003", null));

        var historyResult = await Mediator.Send(new GetFeeHistoryQuery(
            SocietyId, ApartmentId, new PaginationParams { Page = 1, PageSize = 10 }));

        historyResult.IsSuccess.Should().BeTrue();
        historyResult.Value!.Items.Should().Contain(p => p.Id == payment.Id && p.Status == "Paid");
    }

    // ─── GetPendingFees ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetPendingFees_ReturnsOnlyPendingPayments()
    {
        var pending = FeePayment.Create(SocietyId, ApartmentId, "schedule-004",
            "Pending Fee", 600m, DateTime.UtcNow.AddDays(10));
        await FeePaymentRepo.CreateAsync(pending);

        var paidPayment = FeePayment.Create(SocietyId, ApartmentId, "schedule-005",
            "Paid Fee", 600m, DateTime.UtcNow.AddDays(1));
        await FeePaymentRepo.CreateAsync(paidPayment);
        await Mediator.Send(new RecordFeePaymentCommand(
            SocietyId, paidPayment.Id, "Cash", "TXN-004", null));

        var result = await Mediator.Send(new GetPendingFeesQuery(SocietyId, ApartmentId));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Should().Contain(p => p.Id == pending.Id);
        result.Value.Should().NotContain(p => p.Id == paidPayment.Id);
    }

    // ─── Gamification: Award Points → get user points ────────────────────────

    [Fact]
    public async Task AwardPoints_ThenGetUserPoints_TotalIsCorrect()
    {
        await Mediator.Send(new AwardPointsCommand(SocietyId, UserId, ApartmentId, 50, "Timely payment"));
        await Mediator.Send(new AwardPointsCommand(SocietyId, UserId, ApartmentId, 30, "Community event"));

        var pointsResult = await Mediator.Send(new GetUserPointsQuery(SocietyId, UserId));

        pointsResult.IsSuccess.Should().BeTrue();
        pointsResult.Value!.TotalPoints.Should().Be(80);
        pointsResult.Value.History.Should().HaveCount(2);
    }

    [Fact]
    public async Task AwardPoints_PushNotificationIsSent()
    {
        await Mediator.Send(new AwardPointsCommand(SocietyId, UserId, ApartmentId, 100, "Winner"));

        NotificationService.SentPushNotifications.Should().Contain(n =>
            n.UserId == UserId && n.Title.Contains("Points Awarded"));
    }

    [Fact]
    public async Task AwardPoints_DomainEventIsPublished()
    {
        await Mediator.Send(new AwardPointsCommand(SocietyId, UserId, ApartmentId, 25, "Recycling"));

        EventPublisher.PublishedEvents.Should().Contain(e =>
            e.GetType().Name == "PointsAwardedEvent");
    }

    // ─── Gamification: Redeem Points ──────────────────────────────────────────

    [Fact]
    public async Task RedeemPoints_WhenSufficientBalance_Succeeds()
    {
        await Mediator.Send(new AwardPointsCommand(SocietyId, UserId, ApartmentId, 200, "Earned"));

        var redeemResult = await Mediator.Send(new RedeemPointsCommand(SocietyId, UserId, 100, "Redeem for gift"));

        redeemResult.IsSuccess.Should().BeTrue();

        // Net points should now be 100
        var pointsResult = await Mediator.Send(new GetUserPointsQuery(SocietyId, UserId));
        pointsResult.Value!.TotalPoints.Should().Be(100);
    }

    [Fact]
    public async Task RedeemPoints_WhenInsufficientBalance_ReturnsFailure()
    {
        await Mediator.Send(new AwardPointsCommand(SocietyId, UserId, ApartmentId, 50, "Small award"));

        var result = await Mediator.Send(new RedeemPointsCommand(SocietyId, UserId, 200, "Too many"));

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.InsufficientPoints);
    }

    // ─── Gamification: Competition ────────────────────────────────────────────

    private async Task<string> CreateTestCompetitionAsync(CompetitionStatus initialStatus = CompetitionStatus.Upcoming)
    {
        var cmd = new CreateCompetitionCommand(
            SocietyId, UserId,
            "Best Decorated Apartment",
            "Decorate your apartment and win prizes!",
            DateTime.UtcNow.AddDays(7),
            DateTime.UtcNow.AddDays(14),
            "₹5000 Cash Prize",
            50);

        var result = await Mediator.Send(cmd);
        result.IsSuccess.Should().BeTrue();
        return result.Value!.Id;
    }

    [Fact]
    public async Task CreateCompetition_ThenGetCompetitions_ReturnedInList()
    {
        await CreateTestCompetitionAsync();

        var result = await Mediator.Send(new GetCompetitionsQuery(
            SocietyId, null, new PaginationParams { Page = 1, PageSize = 10 }));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().NotBeEmpty();
        result.Value.Items.Should().OnlyContain(c => c.Status == "Upcoming");
    }

    [Fact]
    public async Task RegisterForCompetition_ThenGetLeaderboard_EntryAppears()
    {
        var compId = await CreateTestCompetitionAsync();

        // Manually start the competition so it accepts registrations (it's Upcoming = allowed)
        var registerResult = await Mediator.Send(new RegisterForCompetitionCommand(
            SocietyId, compId, UserId, ApartmentId));

        registerResult.IsSuccess.Should().BeTrue();
        registerResult.Value!.UserId.Should().Be(UserId);

        // Get leaderboard
        var leaderboard = await Mediator.Send(new GetLeaderboardQuery(SocietyId, compId, 10));

        leaderboard.IsSuccess.Should().BeTrue();
        leaderboard.Value!.Should().ContainSingle(e => e.UserId == UserId);
    }

    [Fact]
    public async Task RegisterForCompetition_DuplicateRegistration_ReturnsFailure()
    {
        var compId = await CreateTestCompetitionAsync();

        await Mediator.Send(new RegisterForCompetitionCommand(SocietyId, compId, UserId, ApartmentId));

        var duplicate = await Mediator.Send(new RegisterForCompetitionCommand(
            SocietyId, compId, UserId, ApartmentId));

        duplicate.IsFailure.Should().BeTrue();
        duplicate.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.AlreadyRegistered);
    }

    [Fact]
    public async Task UpdateScore_ThenLeaderboard_ScoreIsReflected()
    {
        var compId = await CreateTestCompetitionAsync();
        var user2 = "user-fee-002";

        await Mediator.Send(new RegisterForCompetitionCommand(SocietyId, compId, UserId, ApartmentId));
        await Mediator.Send(new RegisterForCompetitionCommand(SocietyId, compId, user2, "apt-002"));

        await Mediator.Send(new UpdateScoreCommand(SocietyId, compId, UserId, 95m));
        await Mediator.Send(new UpdateScoreCommand(SocietyId, compId, user2, 87m));

        var leaderboard = await Mediator.Send(new GetLeaderboardQuery(SocietyId, compId, 10));

        leaderboard.IsSuccess.Should().BeTrue();
        var first = leaderboard.Value!.First();
        first.UserId.Should().Be(UserId);
        first.Score.Should().Be(95m);
    }

    [Fact]
    public async Task GetCompetitions_WithStatusFilter_ReturnsOnlyMatchingCompetitions()
    {
        await CreateTestCompetitionAsync(); // Upcoming

        var upcoming = await Mediator.Send(new GetCompetitionsQuery(
            SocietyId, CompetitionStatus.Upcoming, new PaginationParams { Page = 1, PageSize = 10 }));

        upcoming.IsSuccess.Should().BeTrue();
        upcoming.Value!.Items.Should().OnlyContain(c => c.Status == "Upcoming");

        var active = await Mediator.Send(new GetCompetitionsQuery(
            SocietyId, CompetitionStatus.Active, new PaginationParams { Page = 1, PageSize = 10 }));

        active.IsSuccess.Should().BeTrue();
        active.Value!.Items.Should().BeEmpty("no active competitions yet");
    }
}
