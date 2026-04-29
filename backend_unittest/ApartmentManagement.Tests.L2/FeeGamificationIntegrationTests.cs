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
            5,
            4,
            2026,
            3,
            2027);

        var createResult = await Mediator.Send(cmd);

        createResult.IsSuccess.Should().BeTrue();
        var schedule = createResult.Value!;
        schedule.Name.Should().Be("Monthly Maintenance");
        schedule.Rate.Should().Be(1500m);
        schedule.IsActive.Should().BeTrue();
        schedule.ActiveFromDate.Should().Be(new DateTime(2026, 4, 5, 0, 0, 0, DateTimeKind.Utc));

        var getResult = await Mediator.Send(new GetMaintenanceSchedulesQuery(context.Society.Id, context.Apartment.Id));

        getResult.IsSuccess.Should().BeTrue();
        getResult.Value!.Should().Contain(s => s.Id == schedule.Id);
    }

    [Fact]
    public async Task CreateMaintenanceSchedule_SeedsChargesForEntireScheduleWindow()
    {
        var context = await SeedMaintenanceContextAsync();

        var createResult = await Mediator.Send(new CreateMaintenanceScheduleCommand(
            context.Society.Id,
            "Monthly Maintenance",
            "Society maintenance",
            context.Apartment.Id,
            1500m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5,
            4,
            2026,
            3,
            2027));

        createResult.IsSuccess.Should().BeTrue();
        MaintenanceChargeRepo.Store.Values
            .Where(charge => charge.ScheduleId == createResult.Value!.Id && charge.Status == PaymentStatus.Pending)
            .Should()
            .HaveCount(12);
    }

    [Fact]
    public async Task UpdateMaintenanceSchedule_InactivatesFromSelectedMonthAndStoresHistory()
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
            10,
            4,
            2026,
            3,
            2027))).Value!;

        var updateResult = await Mediator.Send(new UpdateMaintenanceScheduleCommand(
            context.Society.Id,
            schedule.Id,
            false,
            7,
            2026,
            "Replaced by revised schedule"));

        updateResult.IsSuccess.Should().BeTrue();
        updateResult.Value!.IsActive.Should().BeFalse();
        updateResult.Value.InactiveFromDate.Should().Be(new DateTime(2026, 7, 10, 0, 0, 0, DateTimeKind.Utc));
        updateResult.Value.ChangeHistory.Should().ContainSingle();
    }

    [Fact]
    public async Task UpdateMaintenanceSchedule_DeletesFutureChargesFromSelectedInactiveMonth()
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
            5,
            4,
            2026,
            3,
            2027))).Value!;

        var updateResult = await Mediator.Send(new UpdateMaintenanceScheduleCommand(
            context.Society.Id,
            schedule.Id,
            false,
            6,
            2026,
            "Stop after May 2026"));

        updateResult.IsSuccess.Should().BeTrue();

        var scheduleCharges = MaintenanceChargeRepo.Store.Values
            .Where(charge => charge.ScheduleId == schedule.Id)
            .ToList();

        scheduleCharges.Should().HaveCount(2);
        scheduleCharges
            .Select(charge => charge.DueDate)
            .Should()
            .OnlyContain(dueDate => dueDate < new DateTime(2026, 6, 5, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task CreateMaintenanceSchedule_WhenAnotherActiveScheduleExists_ReturnsConflict()
    {
        var context = await SeedMaintenanceContextAsync();

        var firstResult = await Mediator.Send(new CreateMaintenanceScheduleCommand(
            context.Society.Id,
            "Primary schedule",
            null,
            null,
            1200m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5,
            4,
            2026,
            12,
            2026));

        var secondResult = await Mediator.Send(new CreateMaintenanceScheduleCommand(
            context.Society.Id,
            "Second schedule",
            null,
            context.Apartment.Id,
            900m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5,
            5,
            2026,
            3,
            2027));

        firstResult.IsSuccess.Should().BeTrue();
        secondResult.IsFailure.Should().BeTrue();
        secondResult.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.Conflict);
    }

    [Fact]
    public async Task DeleteMaintenanceSchedule_WhenFutureInactive_RemovesSchedule()
    {
        var context = await SeedMaintenanceContextAsync();
        var currentYear = DateTime.UtcNow.Year;
        var currentMonth = DateTime.UtcNow.Month;
        var futureYear = DateTime.UtcNow.Year + 1;
        var activeSchedule = await Mediator.Send(new CreateMaintenanceScheduleCommand(
            context.Society.Id,
            "Current active schedule",
            null,
            null,
            350m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5,
            currentMonth,
            currentYear,
            12,
            currentYear));
        activeSchedule.IsSuccess.Should().BeTrue();

        var originalSchedule = (await Mediator.Send(new CreateMaintenanceScheduleCommand(
            context.Society.Id,
            "Original schedule",
            null,
            context.Apartment.Id,
            300m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5,
            4,
            futureYear,
            12,
            futureYear))).Value!;

        var deactivateResult = await Mediator.Send(new UpdateMaintenanceScheduleCommand(
            context.Society.Id,
            originalSchedule.Id,
            false,
            6,
            futureYear,
            "Cancelled before activation"));
        deactivateResult.IsSuccess.Should().BeTrue();

        var deleteResult = await Mediator.Send(new DeleteMaintenanceScheduleCommand(
            context.Society.Id,
            originalSchedule.Id,
            "Removing inactive schedule"));

        deleteResult.IsSuccess.Should().BeTrue();
        (await MaintenanceScheduleRepo.GetByIdAsync(originalSchedule.Id, context.Society.Id)).Should().BeNull();
        MaintenanceChargeRepo.Store.Values
            .Where(charge => charge.ScheduleId == originalSchedule.Id && charge.DueDate.Date >= DateTime.UtcNow.Date)
            .Should()
            .BeEmpty();
    }

    [Fact]
    public async Task GenerateDueMaintenanceCharges_WhenScheduleIsInactiveOnlyInFuture_StillPostsDueCharges()
    {
        var context = await SeedMaintenanceContextAsync();
        var currentYear = DateTime.UtcNow.Year;
        var schedule = (await Mediator.Send(new CreateMaintenanceScheduleCommand(
            context.Society.Id,
            "Long-running schedule",
            null,
            context.Apartment.Id,
            300m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5,
            1,
            currentYear,
            12,
            currentYear))).Value!;

        var deactivateResult = await Mediator.Send(new UpdateMaintenanceScheduleCommand(
            context.Society.Id,
            schedule.Id,
            false,
            12,
            currentYear,
            "Stop at year end"));
        deactivateResult.IsSuccess.Should().BeTrue();

        var generationResult = await Mediator.Send(new GenerateDueMaintenanceChargesCommand(
            new DateTime(currentYear, 8, 5, 0, 0, 0, DateTimeKind.Utc)));

        generationResult.IsSuccess.Should().BeTrue();
        MaintenanceChargeRepo.Store.Values
            .Where(charge => charge.ScheduleId == schedule.Id)
            .Select(charge => charge.DueDate)
            .Should()
            .Contain(dueDate => dueDate == new DateTime(currentYear, 7, 5, 0, 0, 0, DateTimeKind.Utc))
            .And.Contain(dueDate => dueDate == new DateTime(currentYear, 8, 5, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task CreateMaintenanceSchedule_WhenExistingScheduleRemainsEffectiveUntilFutureDate_RejectsOverlap()
    {
        var context = await SeedMaintenanceContextAsync();
        var originalSchedule = (await Mediator.Send(new CreateMaintenanceScheduleCommand(
            context.Society.Id,
            "Original schedule",
            null,
            null,
            1200m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5,
            4,
            2026,
            12,
            2026))).Value!;

        var deactivateResult = await Mediator.Send(new UpdateMaintenanceScheduleCommand(
            context.Society.Id,
            originalSchedule.Id,
            false,
            7,
            2026,
            "Replace later"));
        deactivateResult.IsSuccess.Should().BeTrue();

        var overlappingResult = await Mediator.Send(new CreateMaintenanceScheduleCommand(
            context.Society.Id,
            "Overlapping replacement",
            null,
            null,
            1300m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5,
            6,
            2026,
            3,
            2027));

        overlappingResult.IsFailure.Should().BeTrue();
        overlappingResult.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.Conflict);
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
        historyResult.Value!.Items.Should().Contain(item =>
            item.Id == charge.Id &&
            item.ScheduleName == "Maintenance" &&
            item.ApartmentNumber == "A 1-A-101");
    }

    [Fact]
    public async Task GetMaintenanceChargeGrid_ReturnsApartmentRowsAndMonthCells()
    {
        var context = await SeedMaintenanceContextAsync();
        context.Society.SetMaintenanceOverdueThreshold(5);
        await SocietyRepo.UpdateAsync(context.Society);

        context.Apartment.AssignOwner(context.Resident.Id, context.Resident.FullName ?? "Resident User");
        await ApartmentRepo.UpdateAsync(context.Apartment);

        var secondApartment = Apartment.Create(context.Society.Id, "B-202", "B", 2, 4, [], 900, 1000, 1100);
        secondApartment.AssignOwner("owner-002", "Owner Two");
        await ApartmentRepo.CreateAsync(secondApartment);

        var financialYearStart = DateTime.UtcNow.Month >= 4 ? DateTime.UtcNow.Year : DateTime.UtcNow.Year - 1;
        var firstDueDate = new DateTime(financialYearStart, 4, 5, 0, 0, 0, DateTimeKind.Utc);
        var secondDueDate = new DateTime(financialYearStart, 5, 10, 0, 0, 0, DateTimeKind.Utc);

        var firstCharge = MaintenanceCharge.Create(
            context.Society.Id,
            context.Apartment.Id,
            "schedule-jan",
            "General Maintenance",
            1000m,
            firstDueDate);
        var secondCharge = MaintenanceCharge.Create(
            context.Society.Id,
            secondApartment.Id,
            "schedule-feb",
            "General Maintenance",
            1500m,
            secondDueDate);

        await MaintenanceChargeRepo.CreateAsync(firstCharge);
        await MaintenanceChargeRepo.CreateAsync(secondCharge);
        await MaintenanceChargeGridViewRepo.CreateAsync(MaintenanceChargeGridView.Create(
            context.Society.Id,
            financialYearStart,
            new DateTime(financialYearStart, 4, 1, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(financialYearStart + 1, 3, 31, 0, 0, 0, DateTimeKind.Utc),
            [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3],
            [
                new MaintenanceChargeGridView.GridRow(
                    context.Apartment.Id,
                    "A 1-A-101",
                    context.Apartment.BlockName,
                    context.Apartment.FloorNumber,
                    context.Resident.FullName,
                    (new[]
                    {
                        new MaintenanceChargeGridView.GridCell(4, financialYearStart, [
                            new MaintenanceChargeGridView.GridCharge(
                                firstCharge.Id,
                                firstCharge.ScheduleId,
                                firstCharge.ScheduleName,
                                firstCharge.Amount,
                                firstCharge.Status.ToString(),
                                firstCharge.DueDate,
                                firstCharge.PaidAt,
                                firstCharge.PaymentMethod,
                                firstCharge.TransactionReference,
                                firstCharge.ReceiptUrl,
                                firstCharge.Notes,
                                [])
                        ])
                    }).Concat(Enumerable.Range(1, 11).Select(offset =>
                    {
                        var date = new DateTime(financialYearStart, 4, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(offset);
                        return new MaintenanceChargeGridView.GridCell(date.Month, date.Year, []);
                    })).ToList()),
                new MaintenanceChargeGridView.GridRow(
                    secondApartment.Id,
                    "B 2-B-202",
                    secondApartment.BlockName,
                    secondApartment.FloorNumber,
                    "Owner Two",
                    Enumerable.Range(0, 12).Select(offset =>
                    {
                        var date = new DateTime(financialYearStart, 4, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(offset);
                        var charges = offset == 1
                            ? new[]
                            {
                                new MaintenanceChargeGridView.GridCharge(
                                    secondCharge.Id,
                                    secondCharge.ScheduleId,
                                    secondCharge.ScheduleName,
                                    secondCharge.Amount,
                                    secondCharge.Status.ToString(),
                                    secondCharge.DueDate,
                                    secondCharge.PaidAt,
                                    secondCharge.PaymentMethod,
                                    secondCharge.TransactionReference,
                                    secondCharge.ReceiptUrl,
                                    secondCharge.Notes,
                                    [])
                            }
                            : [];
                        return new MaintenanceChargeGridView.GridCell(date.Month, date.Year, charges);
                    }).ToList())
            ]));

        var gridResult = await Mediator.Send(new GetMaintenanceChargeGridQuery(
            context.Society.Id,
            financialYearStart,
            null,
            null,
            null,
            null,
            null,
            null));

        gridResult.IsSuccess.Should().BeTrue();
        gridResult.Value!.Rows.Should().HaveCount(2);
        gridResult.Value.Summary.PendingAmount.Should().Be(2500m);
        var firstRow = gridResult.Value.Rows.Single(row => row.ApartmentId == context.Apartment.Id);
        firstRow.ApartmentNumber.Should().Be("A 1-A-101");
        firstRow.ResidentName.Should().Be(context.Resident.FullName);
        firstRow.Months.Should().HaveCount(12);
        firstRow.Months.Single(month => month.Month == 4).Charges.Should().ContainSingle(charge => charge.Id == firstCharge.Id);

        var secondRow = gridResult.Value.Rows.Single(row => row.ApartmentId == secondApartment.Id);
        secondRow.ResidentName.Should().Be("Owner Two");
        secondRow.Months.Single(month => month.Month == 5).Charges.Should().ContainSingle(charge => charge.Id == secondCharge.Id);
    }

    [Fact]
    public async Task CreateMaintenancePenaltyCharge_AddsApartmentSpecificCharge()
    {
        var context = await SeedMaintenanceContextAsync();

        var penaltyResult = await Mediator.Send(new CreateMaintenancePenaltyChargeCommand(
            context.Society.Id,
            context.Apartment.Id,
            250m,
            DateTime.UtcNow.Date.AddDays(1),
            "Late payment for April dues"));

        penaltyResult.IsSuccess.Should().BeTrue();
        penaltyResult.Value!.ScheduleName.Should().Be("Late payment penalty");
        penaltyResult.Value.Notes.Should().Be("Late payment for April dues");
        penaltyResult.Value.Amount.Should().Be(250m);
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
