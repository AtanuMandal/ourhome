using ApartmentManagement.Application.Queries.FinancialReport;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Tests.L2.TestInfrastructure;
using FluentAssertions;

namespace ApartmentManagement.Tests.L2;

public class FinancialReportIntegrationTests : IntegrationTestBase
{
    private async Task<(Society Society, User Admin, Apartment Apartment)> SeedBaseAsync()
    {
        var society = Society.Create(
            "Test Society",
            new Address("123 Main St", "Mumbai", "MH", "400001", "India"),
            "admin@test.com", "9876543210", 1, 10);
        await SocietyRepo.CreateAsync(society);

        var admin = User.Create(
            society.Id, "Admin User", "admin@test.com", "9876543210",
            UserRole.SUAdmin, ResidentType.SocietyAdmin);
        await UserRepo.CreateAsync(admin);

        society.AssignAdmin(admin.Id);
        await SocietyRepo.UpdateAsync(society);

        var apt = Apartment.Create(society.Id, "101", "A", 1, 2, [], 500, 600, 700);
        await ApartmentRepo.CreateAsync(apt);

        CurrentUserService.SocietyId = society.Id;
        CurrentUserService.UserId    = admin.Id;
        CurrentUserService.Role      = "SUAdmin";

        return (society, admin, apt);
    }

    private static MaintenanceSchedule CreateSchedule(string societyId)
    {
        var now = DateTime.UtcNow;
        return MaintenanceSchedule.Create(
            societyId, null, "Monthly Maintenance", null,
            5000m, MaintenancePricingType.FixedAmount, null,
            FeeFrequency.Monthly, 10,
            now.Month, now.Year,
            now.Month, now.Year);
    }

    // ── Dashboard ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetDashboard_WithPaidAndPendingCharges_ReturnsCorrectTotals()
    {
        var (society, _, apt) = await SeedBaseAsync();
        var schedule = CreateSchedule(society.Id);
        await MaintenanceScheduleRepo.CreateAsync(schedule);

        var now = DateTime.UtcNow;
        var dueDate = new DateTime(now.Year, now.Month, 10, 0, 0, 0, DateTimeKind.Utc);

        // Paid charge
        var paid = MaintenanceCharge.Create(society.Id, apt.Id, schedule.Id, "Monthly Maintenance", 5000m, dueDate);
        paid.MarkPaid("Cash", null, null);
        await MaintenanceChargeRepo.CreateAsync(paid);

        // Pending charge (different apartment)
        var apt2 = Apartment.Create(society.Id, "102", "A", 1, 2, [], 500, 600, 700);
        await ApartmentRepo.CreateAsync(apt2);
        var pending = MaintenanceCharge.Create(society.Id, apt2.Id, schedule.Id, "Monthly Maintenance", 5000m, dueDate);
        await MaintenanceChargeRepo.CreateAsync(pending);

        var result = await Mediator.Send(new GetFinancialDashboardQuery(society.Id));

        result.IsSuccess.Should().BeTrue();
        result.Value!.MaintenanceBilled.Should().Be(10_000m);
        result.Value.MaintenanceCollected.Should().Be(5_000m);
        result.Value.MaintenancePending.Should().Be(5_000m);
        result.Value.CollectionEfficiencyPercent.Should().Be(50);
        result.Value.NetPosition.Should().Be(5_000m);
    }

    [Fact]
    public async Task GetDashboard_WithNoCharges_ReturnsZeroTotals()
    {
        var (society, _, _) = await SeedBaseAsync();

        var result = await Mediator.Send(new GetFinancialDashboardQuery(society.Id));

        result.IsSuccess.Should().BeTrue();
        result.Value!.MaintenanceBilled.Should().Be(0m);
        result.Value.VendorBilled.Should().Be(0m);
        result.Value.NetPosition.Should().Be(0m);
        result.Value.CollectionEfficiencyPercent.Should().Be(0);
    }

    [Fact]
    public async Task GetDashboard_AsSUUser_ReturnsForbidden()
    {
        var (society, _, _) = await SeedBaseAsync();
        CurrentUserService.Role = "SUUser";

        var result = await Mediator.Send(new GetFinancialDashboardQuery(society.Id));

        result.IsSuccess.Should().BeFalse();
    }

    // ── Cash Flow ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetCashFlow_WithPaidMaintenanceAndVendorCharges_ReturnsMonthlyBreakdown()
    {
        var (society, _, apt) = await SeedBaseAsync();
        var schedule = CreateSchedule(society.Id);
        await MaintenanceScheduleRepo.CreateAsync(schedule);

        var now = DateTime.UtcNow;
        var dueDate = new DateTime(now.Year, now.Month, 10, 0, 0, 0, DateTimeKind.Utc);

        var charge = MaintenanceCharge.Create(society.Id, apt.Id, schedule.Id, "Monthly Maintenance", 8000m, dueDate);
        charge.MarkPaid("NEFT", "TXN001", null);
        await MaintenanceChargeRepo.CreateAsync(charge);

        var vendor = Vendor.Create(
            society.Id, "CleanCo",
            new Address("1 Clean St", "Mumbai", "MH", "400001", "India"),
            null, "John", "Doe", "9999999999", "j@clean.com",
            "Cleaning services", DateTime.UtcNow.AddYears(1), 7,
            null, "Cleaning", null);
        await VendorRepo.CreateAsync(vendor);

        var vendorCharge = VendorCharge.CreateAdHoc(
            society.Id, vendor.Id, vendor.Name, 2000m, dueDate, 7, "Monthly cleaning");
        vendorCharge.MarkPaid(now.AddDays(-1), "Cash", null, "https://receipt.example.com", null);
        await VendorChargeRepo.CreateAsync(vendorCharge);

        var result = await Mediator.Send(
            new GetCashFlowQuery(society.Id, now.Month, now.Year, now.Month, now.Year));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Months.Should().HaveCount(1);
        var m = result.Value.Months[0];
        m.MaintenanceCollected.Should().Be(8000m);
        m.VendorPaid.Should().Be(2000m);
        m.NetCash.Should().Be(6000m);
        result.Value.TotalCashIn.Should().Be(8000m);
        result.Value.TotalCashOut.Should().Be(2000m);
        result.Value.NetPosition.Should().Be(6000m);
    }

    [Fact]
    public async Task GetCashFlow_ExcludesDeletedVendorCharges()
    {
        var (society, _, _) = await SeedBaseAsync();

        var now = DateTime.UtcNow;
        var vendor = Vendor.Create(
            society.Id, "VendorX",
            new Address("1 St", "Mumbai", "MH", "400001", "India"),
            null, "A", "B", "8888888888", "x@vendor.com",
            "Overview", DateTime.UtcNow.AddYears(1), 7, null, null, null);
        await VendorRepo.CreateAsync(vendor);

        var vc = VendorCharge.CreateAdHoc(
            society.Id, vendor.Id, vendor.Name, 3000m,
            new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc), 7, null);
        vc.MarkPaid(now.AddDays(-1), "Cash", null, "https://receipt.example.com", null);
        vc.SoftDelete();
        await VendorChargeRepo.CreateAsync(vc);

        var result = await Mediator.Send(
            new GetCashFlowQuery(society.Id, now.Month, now.Year, now.Month, now.Year));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Months[0].VendorPaid.Should().Be(0m);
    }

    // ── Apartment Ledger ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetApartmentLedger_WithChargesAndPayments_ReturnsCorrectBalance()
    {
        var (society, _, apt) = await SeedBaseAsync();
        var schedule = CreateSchedule(society.Id);
        await MaintenanceScheduleRepo.CreateAsync(schedule);

        var now = DateTime.UtcNow;

        // Charge 1: paid
        var due1 = new DateTime(now.Year, now.Month, 10, 0, 0, 0, DateTimeKind.Utc);
        var c1 = MaintenanceCharge.Create(society.Id, apt.Id, schedule.Id, "Monthly Maintenance", 5000m, due1);
        c1.MarkPaid("UPI", null, null);
        await MaintenanceChargeRepo.CreateAsync(c1);

        // Charge 2: pending
        var due2 = due1.AddMonths(1);
        var c2 = MaintenanceCharge.Create(society.Id, apt.Id, schedule.Id, "Monthly Maintenance", 5000m, due2);
        await MaintenanceChargeRepo.CreateAsync(c2);

        var result = await Mediator.Send(
            new GetApartmentLedgerQuery(society.Id, apt.Id, null, null));

        result.IsSuccess.Should().BeTrue();
        var ledger = result.Value!;
        ledger.CurrentOutstanding.Should().Be(5000m);
        // Two debit entries, one credit entry
        ledger.Entries.Should().HaveCount(3);
        ledger.Entries.Where(e => e.Type == "Charge").Should().HaveCount(2);
        ledger.Entries.Where(e => e.Type == "Payment").Should().HaveCount(1);
    }

    [Fact]
    public async Task GetApartmentLedger_WithNoPaidCharges_BalanceEqualsAllCharges()
    {
        var (society, _, apt) = await SeedBaseAsync();
        var schedule = CreateSchedule(society.Id);
        await MaintenanceScheduleRepo.CreateAsync(schedule);

        var dueDate = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 10, 0, 0, 0, DateTimeKind.Utc);
        await MaintenanceChargeRepo.CreateAsync(
            MaintenanceCharge.Create(society.Id, apt.Id, schedule.Id, "Monthly Maintenance", 7500m, dueDate));

        var result = await Mediator.Send(
            new GetApartmentLedgerQuery(society.Id, apt.Id, null, null));

        result.IsSuccess.Should().BeTrue();
        result.Value!.CurrentOutstanding.Should().Be(7500m);
        result.Value.Entries.Should().HaveCount(1);
    }

    // ── Society Ledger ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetSocietyLedger_WithMultipleApartmentsAndVendorCharges_AggregatesAcrossSociety()
    {
        var (society, _, apt) = await SeedBaseAsync();
        var schedule = CreateSchedule(society.Id);
        await MaintenanceScheduleRepo.CreateAsync(schedule);

        var apt2 = Apartment.Create(society.Id, "102", "A", 1, 2, [], 500, 600, 700);
        await ApartmentRepo.CreateAsync(apt2);

        var now = DateTime.UtcNow;
        var dueDate = new DateTime(now.Year, now.Month, 10, 0, 0, 0, DateTimeKind.Utc);

        var c1 = MaintenanceCharge.Create(society.Id, apt.Id, schedule.Id, "Monthly Maintenance", 5000m, dueDate);
        c1.MarkPaid("UPI", null, null);
        await MaintenanceChargeRepo.CreateAsync(c1);

        var c2 = MaintenanceCharge.Create(society.Id, apt2.Id, schedule.Id, "Monthly Maintenance", 3000m, dueDate.AddDays(2));
        await MaintenanceChargeRepo.CreateAsync(c2);

        var vendor = Vendor.Create(
            society.Id, "CleanCo",
            new Address("1 Clean St", "Mumbai", "MH", "400001", "India"),
            null, "John", "Doe", "9999999999", "j@clean.com",
            "Cleaning services", DateTime.UtcNow.AddYears(1), 7,
            null, "Cleaning", null);
        await VendorRepo.CreateAsync(vendor);

        var vendorCharge = VendorCharge.CreateAdHoc(
            society.Id, vendor.Id, vendor.Name, 2000m, dueDate, 7, "Monthly cleaning");
        vendorCharge.MarkPaid(dueDate.AddDays(1), "Cash", null, "https://receipt.example.com", null);
        await VendorChargeRepo.CreateAsync(vendorCharge);

        var result = await Mediator.Send(new GetSocietyLedgerQuery(society.Id));

        result.IsSuccess.Should().BeTrue();
        var ledger = result.Value!;

        ledger.Entries.Should().HaveCount(5);
        ledger.Entries.Where(e => e.Type == "Charge").Should().HaveCount(2);
        ledger.Entries.Where(e => e.Type == "Payment").Should().HaveCount(1);
        ledger.Entries.Where(e => e.Type == "VendorBill").Should().HaveCount(1);
        ledger.Entries.Where(e => e.Type == "VendorPayment").Should().HaveCount(1);
        ledger.CurrentBalance.Should().Be(3000m); // apt2's pending charge is the only unmatched debit
    }

    [Fact]
    public async Task GetSocietyLedger_WithNoCharges_ReturnsEmptyLedger()
    {
        var (society, _, _) = await SeedBaseAsync();

        var result = await Mediator.Send(new GetSocietyLedgerQuery(society.Id));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Entries.Should().BeEmpty();
        result.Value.CurrentBalance.Should().Be(0m);
    }

    [Fact]
    public async Task GetSocietyLedger_AsSUUser_ReturnsForbidden()
    {
        var (society, _, _) = await SeedBaseAsync();
        CurrentUserService.Role = "SUUser";

        var result = await Mediator.Send(new GetSocietyLedgerQuery(society.Id));

        result.IsSuccess.Should().BeFalse();
    }

    // ── Personal Statement ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetPersonalStatement_ForOwnApartment_ReturnsSummary()
    {
        var (society, _, apt) = await SeedBaseAsync();
        var schedule = CreateSchedule(society.Id);
        await MaintenanceScheduleRepo.CreateAsync(schedule);

        var now = DateTime.UtcNow;
        var dueDate = new DateTime(now.Year, now.Month, 10, 0, 0, 0, DateTimeKind.Utc);

        var c1 = MaintenanceCharge.Create(society.Id, apt.Id, schedule.Id, "Monthly Maintenance", 6000m, dueDate);
        c1.MarkPaid("Cash", null, null);
        await MaintenanceChargeRepo.CreateAsync(c1);

        var c2 = MaintenanceCharge.Create(society.Id, apt.Id, schedule.Id, "Monthly Maintenance", 6000m, dueDate.AddMonths(1));
        await MaintenanceChargeRepo.CreateAsync(c2);

        var result = await Mediator.Send(
            new GetPersonalStatementQuery(society.Id, apt.Id, now.Year));

        result.IsSuccess.Should().BeTrue();
        result.Value!.TotalCharged.Should().Be(12_000m);
        result.Value.TotalPaid.Should().Be(6_000m);
        result.Value.TotalOutstanding.Should().Be(6_000m);
        result.Value.Charges.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetPersonalStatement_AsSUUserForOwnApartment_Succeeds()
    {
        var (society, _, apt) = await SeedBaseAsync();

        CurrentUserService.Role        = "SUUser";
        CurrentUserService.ApartmentId = apt.Id;

        var result = await Mediator.Send(
            new GetPersonalStatementQuery(society.Id, apt.Id, DateTime.UtcNow.Year));

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task GetPersonalStatement_AsSUUserForOtherApartment_ReturnsForbidden()
    {
        var (society, _, apt) = await SeedBaseAsync();

        CurrentUserService.Role        = "SUUser";
        CurrentUserService.ApartmentId = "different-apartment-id";

        var result = await Mediator.Send(
            new GetPersonalStatementQuery(society.Id, apt.Id, DateTime.UtcNow.Year));

        result.IsSuccess.Should().BeFalse();
    }

    // ── Society Summary ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetSocietySummary_AnyAuthenticatedUser_ReturnsData()
    {
        var (society, _, apt) = await SeedBaseAsync();
        var schedule = CreateSchedule(society.Id);
        await MaintenanceScheduleRepo.CreateAsync(schedule);

        var now = DateTime.UtcNow;
        var due = new DateTime(now.Year, now.Month, 10, 0, 0, 0, DateTimeKind.Utc);
        var charge = MaintenanceCharge.Create(society.Id, apt.Id, schedule.Id, "Monthly Maintenance", 5000m, due);
        charge.MarkPaid("Cash", null, null);
        await MaintenanceChargeRepo.CreateAsync(charge);

        CurrentUserService.Role = "SUUser";

        var result = await Mediator.Send(new GetSocietySummaryQuery(society.Id));

        result.IsSuccess.Should().BeTrue();
        result.Value!.TotalCollectedCurrentMonth.Should().Be(5000m);
        result.Value.CollectionPercentageCurrentMonth.Should().Be(100);
    }
}
