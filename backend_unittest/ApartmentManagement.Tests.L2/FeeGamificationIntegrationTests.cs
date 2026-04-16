using ApartmentManagement.Application.Commands.Maintenance;
using ApartmentManagement.Application.Commands.Gamification;
using ApartmentManagement.Application.Queries.Maintenance;
using ApartmentManagement.Application.Queries.Gamification;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Shared.Models;
using ApartmentManagement.Tests.L2.TestInfrastructure;
using FluentAssertions;

namespace ApartmentManagement.Tests.L2;

public class FeeGamificationIntegrationTests : IntegrationTestBase
{
    private async Task<(Society Society, Apartment Apartment, User Admin, User Resident)> SeedMaintenanceContextAsync()
    {
        var society = Society.Create(
            "Maintenance Test Society",
            new Address("Street 1", "City", "State", "12345", "India"),
            "society@test.com",
            "9999999999",
            1,
            10);
        await SocietyRepo.CreateAsync(society);

        var apartment = Apartment.Create(society.Id, "A-101", "A", 1, 3, [], 500, 600, 700);
        await ApartmentRepo.CreateAsync(apartment);

        var admin = User.Create(society.Id, "Admin User", "admin@test.com", "8888888888", UserRole.SUAdmin, ResidentType.SocietyAdmin);
        await UserRepo.CreateAsync(admin);
        society.AssignAdmin(admin.Id);
        await SocietyRepo.UpdateAsync(society);

        var resident = User.Create(society.Id, "Resident User", "resident@test.com", "7777777777", UserRole.SUUser, ResidentType.Owner, apartment.Id);
        resident.AssignApartment(apartment.Id);
        await UserRepo.CreateAsync(resident);

        CurrentUserService.SocietyId = society.Id;
        CurrentUserService.UserId = admin.Id;
        CurrentUserService.Role = "SUAdmin";
        CurrentUserService.Email = admin.Email;

        return (society, apartment, admin, resident);
    }

    // ─── Maintenance: schedule and payment flow ───────────────────────────────

    [Fact]
    public async Task CreateMaintenanceSchedule_ThenListSchedules_ReturnsSchedule()
    {
        var context = await SeedMaintenanceContextAsync();

        var cmd = new CreateMaintenanceScheduleCommand(
            context.Society.Id,
            "Monthly Maintenance",
            "Society maintenance",
            context.Apartment.Id,
            1500m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5);

        var createResult = await Mediator.Send(cmd);

        createResult.IsSuccess.Should().BeTrue();
        var schedule = createResult.Value!;
        schedule.Name.Should().Be("Monthly Maintenance");
        schedule.Rate.Should().Be(1500m);
        schedule.IsActive.Should().BeTrue();

        var getResult = await Mediator.Send(new GetMaintenanceSchedulesQuery(context.Society.Id, context.Apartment.Id));

        getResult.IsSuccess.Should().BeTrue();
        getResult.Value!.Should().Contain(s => s.Id == schedule.Id);
    }

    [Fact]
    public async Task UpdateMaintenanceSchedule_StoresChangeHistory()
    {
        var context = await SeedMaintenanceContextAsync();
        var schedule = (await Mediator.Send(new CreateMaintenanceScheduleCommand(
            context.Society.Id,
            "Water Bill",
            null,
            context.Apartment.Id,
            300m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            10))).Value!;

        var updateResult = await Mediator.Send(new UpdateMaintenanceScheduleCommand(
            context.Society.Id,
            schedule.Id,
            "Water Bill",
            "Updated amount",
            context.Apartment.Id,
            350m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            10,
            true,
            "Yearly revision"));

        updateResult.IsSuccess.Should().BeTrue();
        updateResult.Value!.Rate.Should().Be(350m);
        updateResult.Value.ChangeHistory.Should().ContainSingle();
    }

    [Fact]
    public async Task SubmitMaintenancePaymentProof_ForMultipleCharges_UpdatesBothCharges()
    {
        var context = await SeedMaintenanceContextAsync();
        var first = MaintenanceCharge.Create(context.Society.Id, context.Apartment.Id, "schedule-001", "Maintenance", 600m, DateTime.UtcNow.AddDays(10));
        var second = MaintenanceCharge.Create(context.Society.Id, context.Apartment.Id, "schedule-002", "Maintenance", 650m, DateTime.UtcNow.AddDays(15));
        await MaintenanceChargeRepo.CreateAsync(first);
        await MaintenanceChargeRepo.CreateAsync(second);

        CurrentUserService.UserId = context.Resident.Id;
        CurrentUserService.Role = "SUUser";
        CurrentUserService.Email = context.Resident.Email;

        var result = await Mediator.Send(new SubmitMaintenancePaymentProofCommand(
            context.Society.Id,
            [first.Id, second.Id],
            "https://proofs.example.com/batch",
            "Combined transfer proof"));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Should().HaveCount(2);
        result.Value.Should().OnlyContain(charge => charge.Status == "ProofSubmitted");
        NotificationService.SentPushNotifications.Should().Contain(n => n.UserId == context.Admin.Id);
    }

    [Fact]
    public async Task MarkMaintenanceChargePaid_ChangesStatusToPaid()
    {
        var context = await SeedMaintenanceContextAsync();
        var charge = MaintenanceCharge.Create(context.Society.Id, context.Apartment.Id, "schedule-003", "Maintenance", 750m, DateTime.UtcNow.AddDays(2));
        await MaintenanceChargeRepo.CreateAsync(charge);

        var markPaid = await Mediator.Send(new MarkMaintenanceChargePaidCommand(
            context.Society.Id,
            charge.Id,
            "Cash",
            "TXN-003",
            null,
            null));

        markPaid.IsSuccess.Should().BeTrue();
        markPaid.Value!.Status.Should().Be("Paid");
        markPaid.Value.TransactionReference.Should().Be("TXN-003");
    }

    [Fact]
    public async Task GetApartmentMaintenanceHistory_ReturnsChargeRecords()
    {
        var context = await SeedMaintenanceContextAsync();
        var charge = MaintenanceCharge.Create(context.Society.Id, context.Apartment.Id, "schedule-004", "Maintenance", 900m, DateTime.UtcNow.AddDays(4));
        await MaintenanceChargeRepo.CreateAsync(charge);

        var historyResult = await Mediator.Send(new GetApartmentMaintenanceHistoryQuery(
            context.Society.Id,
            context.Apartment.Id,
            null,
            null,
            new PaginationParams { Page = 1, PageSize = 10 }));

        historyResult.IsSuccess.Should().BeTrue();
        historyResult.Value!.Items.Should().Contain(item => item.Id == charge.Id && item.ScheduleName == "Maintenance");
    }

    // ─── Gamification: Award Points → get user points ────────────────────────

    [Fact]
    public async Task AwardPoints_ThenGetUserPoints_TotalIsCorrect()
    {
        var context = await SeedMaintenanceContextAsync();
        await Mediator.Send(new AwardPointsCommand(context.Society.Id, context.Resident.Id, context.Apartment.Id, 50, "Timely payment"));
        await Mediator.Send(new AwardPointsCommand(context.Society.Id, context.Resident.Id, context.Apartment.Id, 30, "Community event"));

        var pointsResult = await Mediator.Send(new GetUserPointsQuery(context.Society.Id, context.Resident.Id));

        pointsResult.IsSuccess.Should().BeTrue();
        pointsResult.Value!.TotalPoints.Should().Be(80);
        pointsResult.Value.History.Should().HaveCount(2);
    }

    [Fact]
    public async Task AwardPoints_PushNotificationIsSent()
    {
        var context = await SeedMaintenanceContextAsync();
        await Mediator.Send(new AwardPointsCommand(context.Society.Id, context.Resident.Id, context.Apartment.Id, 100, "Winner"));

        NotificationService.SentPushNotifications.Should().Contain(n =>
            n.UserId == context.Resident.Id && n.Title.Contains("Points Awarded"));
    }

    [Fact]
    public async Task AwardPoints_DomainEventIsPublished()
    {
        var context = await SeedMaintenanceContextAsync();
        await Mediator.Send(new AwardPointsCommand(context.Society.Id, context.Resident.Id, context.Apartment.Id, 25, "Recycling"));

        EventPublisher.PublishedEvents.Should().Contain(e =>
            e.GetType().Name == "PointsAwardedEvent");
    }

    // ─── Gamification: Redeem Points ──────────────────────────────────────────

    [Fact]
    public async Task RedeemPoints_WhenSufficientBalance_Succeeds()
    {
        var context = await SeedMaintenanceContextAsync();
        await Mediator.Send(new AwardPointsCommand(context.Society.Id, context.Resident.Id, context.Apartment.Id, 200, "Earned"));

        var redeemResult = await Mediator.Send(new RedeemPointsCommand(context.Society.Id, context.Resident.Id, 100, "Redeem for gift"));

        redeemResult.IsSuccess.Should().BeTrue();

        // Net points should now be 100
        var pointsResult = await Mediator.Send(new GetUserPointsQuery(context.Society.Id, context.Resident.Id));
        pointsResult.Value!.TotalPoints.Should().Be(100);
    }

    [Fact]
    public async Task RedeemPoints_WhenInsufficientBalance_ReturnsFailure()
    {
        var context = await SeedMaintenanceContextAsync();
        await Mediator.Send(new AwardPointsCommand(context.Society.Id, context.Resident.Id, context.Apartment.Id, 50, "Small award"));

        var result = await Mediator.Send(new RedeemPointsCommand(context.Society.Id, context.Resident.Id, 200, "Too many"));

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.InsufficientPoints);
    }

    // ─── Gamification: Competition ────────────────────────────────────────────

    private async Task<string> CreateTestCompetitionAsync(string societyId, string userId, CompetitionStatus initialStatus = CompetitionStatus.Upcoming)
    {
        var cmd = new CreateCompetitionCommand(
            societyId, userId,
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
        var context = await SeedMaintenanceContextAsync();
        await CreateTestCompetitionAsync(context.Society.Id, context.Resident.Id);

        var result = await Mediator.Send(new GetCompetitionsQuery(
            context.Society.Id, null, new PaginationParams { Page = 1, PageSize = 10 }));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().NotBeEmpty();
        result.Value.Items.Should().OnlyContain(c => c.Status == "Upcoming");
    }

    [Fact]
    public async Task RegisterForCompetition_ThenGetLeaderboard_EntryAppears()
    {
        var context = await SeedMaintenanceContextAsync();
        var compId = await CreateTestCompetitionAsync(context.Society.Id, context.Resident.Id);

        // Manually start the competition so it accepts registrations (it's Upcoming = allowed)
        var registerResult = await Mediator.Send(new RegisterForCompetitionCommand(
            context.Society.Id, compId, context.Resident.Id, context.Apartment.Id));

        registerResult.IsSuccess.Should().BeTrue();
        registerResult.Value!.UserId.Should().Be(context.Resident.Id);

        // Get leaderboard
        var leaderboard = await Mediator.Send(new GetLeaderboardQuery(context.Society.Id, compId, 10));

        leaderboard.IsSuccess.Should().BeTrue();
        leaderboard.Value!.Should().ContainSingle(e => e.UserId == context.Resident.Id);
    }

    [Fact]
    public async Task RegisterForCompetition_DuplicateRegistration_ReturnsFailure()
    {
        var context = await SeedMaintenanceContextAsync();
        var compId = await CreateTestCompetitionAsync(context.Society.Id, context.Resident.Id);

        await Mediator.Send(new RegisterForCompetitionCommand(context.Society.Id, compId, context.Resident.Id, context.Apartment.Id));

        var duplicate = await Mediator.Send(new RegisterForCompetitionCommand(
            context.Society.Id, compId, context.Resident.Id, context.Apartment.Id));

        duplicate.IsFailure.Should().BeTrue();
        duplicate.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.AlreadyRegistered);
    }

    [Fact]
    public async Task UpdateScore_ThenLeaderboard_ScoreIsReflected()
    {
        var context = await SeedMaintenanceContextAsync();
        var compId = await CreateTestCompetitionAsync(context.Society.Id, context.Resident.Id);
        var user2 = "user-fee-002";

        await Mediator.Send(new RegisterForCompetitionCommand(context.Society.Id, compId, context.Resident.Id, context.Apartment.Id));
        await Mediator.Send(new RegisterForCompetitionCommand(context.Society.Id, compId, user2, "apt-002"));

        await Mediator.Send(new UpdateScoreCommand(context.Society.Id, compId, context.Resident.Id, 95m));
        await Mediator.Send(new UpdateScoreCommand(context.Society.Id, compId, user2, 87m));

        var leaderboard = await Mediator.Send(new GetLeaderboardQuery(context.Society.Id, compId, 10));

        leaderboard.IsSuccess.Should().BeTrue();
        var first = leaderboard.Value!.First();
        first.UserId.Should().Be(context.Resident.Id);
        first.Score.Should().Be(95m);
    }

    [Fact]
    public async Task GetCompetitions_WithStatusFilter_ReturnsOnlyMatchingCompetitions()
    {
        var context = await SeedMaintenanceContextAsync();
        await CreateTestCompetitionAsync(context.Society.Id, context.Resident.Id); // Upcoming

        var upcoming = await Mediator.Send(new GetCompetitionsQuery(
            context.Society.Id, CompetitionStatus.Upcoming, new PaginationParams { Page = 1, PageSize = 10 }));

        upcoming.IsSuccess.Should().BeTrue();
        upcoming.Value!.Items.Should().OnlyContain(c => c.Status == "Upcoming");

        var active = await Mediator.Send(new GetCompetitionsQuery(
            context.Society.Id, CompetitionStatus.Active, new PaginationParams { Page = 1, PageSize = 10 }));

        active.IsSuccess.Should().BeTrue();
        active.Value!.Items.Should().BeEmpty("no active competitions yet");
    }
}
