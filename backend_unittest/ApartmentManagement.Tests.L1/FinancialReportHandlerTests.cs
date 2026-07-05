using ApartmentManagement.Application.Queries.FinancialReport;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class GetSocietyLedgerQueryHandlerTests
{
    private readonly Mock<IMaintenanceChargeRepository> _maintenanceChargeRepoMock = new();
    private readonly Mock<IVendorChargeRepository> _vendorChargeRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<GetSocietyLedgerQueryHandler>> _loggerMock = new();

    private const string SocietyId = "society-001";

    private GetSocietyLedgerQueryHandler CreateHandler() =>
        new(_maintenanceChargeRepoMock.Object, _vendorChargeRepoMock.Object, _apartmentRepoMock.Object,
            _currentUserMock.Object, _loggerMock.Object);

    private void SetAdmin() =>
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(true);

    [Fact]
    public async Task Handle_AggregatesChargesAcrossMultipleApartmentsAndVendorCharges()
    {
        SetAdmin();

        var apt1 = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        var apt2 = Apartment.Create(SocietyId, "102", "A", 1, 2, [], 500, 600, 700);

        var dueDate = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc);

        // Apartment 1: fully paid charge (debit + credit -> nets to zero)
        var c1 = MaintenanceCharge.Create(SocietyId, apt1.Id, "sched-1", "Monthly Maintenance", 5000m, dueDate);
        c1.MarkPaid("UPI", null, null);

        // Apartment 2: pending charge (debit only -> stays outstanding)
        var c2 = MaintenanceCharge.Create(SocietyId, apt2.Id, "sched-1", "Monthly Maintenance", 3000m, dueDate.AddDays(2));

        _maintenanceChargeRepoMock
            .Setup(r => r.GetBySocietyAsync(SocietyId, 1, 10_000, null, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([c1, c2]);

        var vendor = VendorCharge.CreateAdHoc(SocietyId, "vendor-1", "CleanCo", 2000m, dueDate, 7, "Cleaning");
        vendor.MarkPaid(dueDate.AddDays(1), "Cash", null, "https://receipt.example.com", null);

        _vendorChargeRepoMock
            .Setup(r => r.GetBySocietyAsync(SocietyId, 1, 10_000, null, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([vendor]);

        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apt1.Id, SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync(apt1);
        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apt2.Id, SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync(apt2);

        var handler = CreateHandler();
        var result = await handler.Handle(new GetSocietyLedgerQuery(SocietyId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var ledger = result.Value!;

        // apt1: Charge + Payment; apt2: Charge only; vendor: VendorBill + VendorPayment => 5 entries total
        ledger.Entries.Should().HaveCount(5);
        ledger.Entries.Count(e => e.Type == "Charge").Should().Be(2);
        ledger.Entries.Count(e => e.Type == "Payment").Should().Be(1);
        ledger.Entries.Count(e => e.Type == "VendorBill").Should().Be(1);
        ledger.Entries.Count(e => e.Type == "VendorPayment").Should().Be(1);

        // Entries must be sorted chronologically by date.
        ledger.Entries.Select(e => e.Date).Should().BeInAscendingOrder();

        // Balance nets out: apt1 charge paid (0 net), vendor charge paid (0 net), apt2 pending remains (3000).
        ledger.CurrentBalance.Should().Be(3000m);
    }

    [Fact]
    public async Task Handle_WithNoChargesInSociety_ReturnsEmptyLedgerWithZeroBalance()
    {
        SetAdmin();

        _maintenanceChargeRepoMock
            .Setup(r => r.GetBySocietyAsync(SocietyId, 1, 10_000, null, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _vendorChargeRepoMock
            .Setup(r => r.GetBySocietyAsync(SocietyId, 1, 10_000, null, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var handler = CreateHandler();
        var result = await handler.Handle(new GetSocietyLedgerQuery(SocietyId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Entries.Should().BeEmpty();
        result.Value.CurrentBalance.Should().Be(0m);
    }

    [Fact]
    public async Task Handle_AsSUUser_ReturnsForbidden()
    {
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(false);

        var handler = CreateHandler();
        var result = await handler.Handle(new GetSocietyLedgerQuery(SocietyId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
    }
}

public class GetFinancialDashboardQueryHandlerUpcomingChargesTests
{
    private readonly Mock<IMaintenanceChargeRepository> _maintenanceChargeRepoMock = new();
    private readonly Mock<IVendorChargeRepository> _vendorChargeRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<GetFinancialDashboardQueryHandler>> _loggerMock = new();

    private const string SocietyId = "society-001";

    private GetFinancialDashboardQueryHandler CreateHandler() =>
        new(_maintenanceChargeRepoMock.Object, _vendorChargeRepoMock.Object, _apartmentRepoMock.Object,
            _currentUserMock.Object, _loggerMock.Object);

    private void SetupBaseline(IReadOnlyList<MaintenanceCharge> dueRangeCharges)
    {
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(true);

        _maintenanceChargeRepoMock
            .Setup(r => r.GetBySocietyAsync(SocietyId, 1, 10_000, null, null, It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _vendorChargeRepoMock
            .Setup(r => r.GetBySocietyAsync(SocietyId, 1, 10_000, null, null, It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        // Emulate the real repository contract: only charges whose DueDate falls within [from, to] are returned.
        _maintenanceChargeRepoMock
            .Setup(r => r.GetByDueDateRangeAsync(SocietyId, It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string _, DateTime from, DateTime to, CancellationToken _) =>
                dueRangeCharges.Where(c => c.DueDate.Date >= from.Date && c.DueDate.Date <= to.Date).ToList());
    }

    [Fact]
    public async Task Handle_ChargeDueWithinSevenDays_IsIncludedInUpcomingCharges()
    {
        var apt = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        var now = DateTime.UtcNow;

        var dueToday    = MaintenanceCharge.Create(SocietyId, apt.Id, "sched-1", "Monthly Maintenance", 1000m, now.Date);
        var dueTomorrow = MaintenanceCharge.Create(SocietyId, apt.Id, "sched-1", "Monthly Maintenance", 2000m, now.Date.AddDays(1));

        SetupBaseline([dueToday, dueTomorrow]);
        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apt.Id, SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync(apt);

        var handler = CreateHandler();
        var result = await handler.Handle(new GetFinancialDashboardQuery(SocietyId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.UpcomingCharges.Should().HaveCount(2);
        result.Value.UpcomingCharges.Should().Contain(c => c.DaysUntilDue == 0 && c.Amount == 1000m);
        result.Value.UpcomingCharges.Should().Contain(c => c.DaysUntilDue == 1 && c.Amount == 2000m);
        result.Value.UpcomingCashInflow.Should().Be(3000m);
    }

    [Fact]
    public async Task Handle_ChargeDueInEightDays_IsExcludedFromUpcomingCharges()
    {
        var apt = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        var now = DateTime.UtcNow;

        var dueInEightDays = MaintenanceCharge.Create(SocietyId, apt.Id, "sched-1", "Monthly Maintenance", 4000m, now.Date.AddDays(8));

        SetupBaseline([dueInEightDays]);
        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apt.Id, SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync(apt);

        var handler = CreateHandler();
        var result = await handler.Handle(new GetFinancialDashboardQuery(SocietyId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.UpcomingCharges.Should().BeEmpty();
        result.Value.UpcomingCashInflow.Should().Be(0m);
    }

    [Fact]
    public async Task Handle_ChargeExactlySevenDaysOut_IsIncluded()
    {
        var apt = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        var now = DateTime.UtcNow;

        var dueInSevenDays = MaintenanceCharge.Create(SocietyId, apt.Id, "sched-1", "Monthly Maintenance", 1500m, now.Date.AddDays(7));

        SetupBaseline([dueInSevenDays]);
        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apt.Id, SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync(apt);

        var handler = CreateHandler();
        var result = await handler.Handle(new GetFinancialDashboardQuery(SocietyId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.UpcomingCharges.Should().ContainSingle();
        result.Value.UpcomingCharges[0].DaysUntilDue.Should().Be(7);
    }
}
