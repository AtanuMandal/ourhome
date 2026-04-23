using ApartmentManagement.Application.Commands.VendorPayments;
using ApartmentManagement.Application.Queries.VendorPayments;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using ApartmentManagement.Tests.L2.TestInfrastructure;
using FluentAssertions;

namespace ApartmentManagement.Tests.L2;

public class VendorPaymentIntegrationTests : IntegrationTestBase
{
    private async Task<(Society Society, User Admin)> SeedVendorContextAsync()
    {
        var society = Society.Create(
            "Vendor Test Society",
            new Address("Vendor Street", "City", "State", "12345", "India"),
            "vendors@test.com",
            "9999999999",
            1,
            20);
        await SocietyRepo.CreateAsync(society);

        var admin = User.Create(society.Id, "Vendor Admin", "admin@vendors.com", "8888888888", UserRole.SUAdmin, ResidentType.SocietyAdmin);
        await UserRepo.CreateAsync(admin);
        society.AssignAdmin(admin.Id);
        await SocietyRepo.UpdateAsync(society);

        CurrentUserService.SocietyId = society.Id;
        CurrentUserService.UserId = admin.Id;
        CurrentUserService.Role = "SUAdmin";
        CurrentUserService.Email = admin.Email;

        return (society, admin);
    }

    [Fact]
    public async Task CreateVendor_ThenListVendors_ReturnsCreatedVendor()
    {
        var context = await SeedVendorContextAsync();

        var createResult = await Mediator.Send(new CreateVendorCommand(
            context.Society.Id,
            "ABC Facility Services",
            "12 Main Road",
            "Kolkata",
            "West Bengal",
            "700001",
            "India",
            "https://cdn.example.com/vendor-picture.png",
            "Rita",
            "Sen",
            "9876543210",
            "rita@abc.com",
            "General building maintenance vendor",
            DateTime.UtcNow.Date.AddMonths(6),
            15,
            "South Kolkata",
            "Maintenance",
            "https://cdn.example.com/vendor-contract.pdf"));

        createResult.IsSuccess.Should().BeTrue();
        createResult.Value!.Name.Should().Be("ABC Facility Services");

        var listResult = await Mediator.Send(new GetVendorsQuery(context.Society.Id, "facility"));

        listResult.IsSuccess.Should().BeTrue();
        listResult.Value!.Should().ContainSingle(vendor => vendor.Id == createResult.Value.Id);
    }

    [Fact]
    public async Task CreateVendorRecurringSchedule_SeedsRecurringCharges()
    {
        var context = await SeedVendorContextAsync();
        var vendor = (await Mediator.Send(new CreateVendorCommand(
            context.Society.Id,
            "Weekly Cleaner",
            "Street 1",
            "City",
            "State",
            "12345",
            "India",
            null,
            "Mina",
            "Das",
            "9000000000",
            "mina@cleaner.com",
            "Weekly cleaning",
            DateTime.UtcNow.Date.AddMonths(4),
            7,
            null,
            "Cleaning",
            null))).Value!;

        var startDate = DateTime.UtcNow.Date;
        var scheduleResult = await Mediator.Send(new CreateVendorRecurringScheduleCommand(
            context.Society.Id,
            vendor.Id,
            VendorPaymentFrequency.Weekly,
            500m,
            startDate,
            startDate.AddMonths(2),
            "Weekly cleaning"));

        scheduleResult.IsSuccess.Should().BeTrue();
        scheduleResult.Value!.AnnualEquivalentAmount.Should().Be(26000m);
        VendorChargeRepo.Store.Values
            .Where(charge => charge.ScheduleId == scheduleResult.Value.Id)
            .Should()
            .NotBeEmpty();
    }

    [Fact]
    public async Task CreateVendorRecurringSchedule_NormalizesMonthOnlyInputs()
    {
        var context = await SeedVendorContextAsync();
        var vendor = (await Mediator.Send(new CreateVendorCommand(
            context.Society.Id,
            "Month Normalized Vendor",
            "Street 1",
            "City",
            "State",
            "12345",
            "India",
            null,
            "Mina",
            "Das",
            "9000000000",
            "mina@normalized.com",
            "Monthly cleaning",
            new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            7,
            null,
            "Cleaning",
            null))).Value!;

        var scheduleResult = await Mediator.Send(new CreateVendorRecurringScheduleCommand(
            context.Society.Id,
            vendor.Id,
            VendorPaymentFrequency.Monthly,
            500m,
            new DateTime(2026, 1, 18, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc),
            "Monthly cleaning"));

        scheduleResult.IsSuccess.Should().BeTrue();
        scheduleResult.Value!.StartDate.Should().Be(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        scheduleResult.Value.EndDate.Should().Be(new DateTime(2026, 3, 31, 0, 0, 0, DateTimeKind.Utc));
        VendorChargeRepo.Store.Values
            .Where(charge => charge.ScheduleId == scheduleResult.Value.Id)
            .OrderBy(charge => charge.EffectiveDate)
            .Select(charge => charge.EffectiveDate)
            .Should()
            .Equal(
                new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc),
                new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task UpdateVendorRecurringSchedule_InactivatesFutureCharges()
    {
        var context = await SeedVendorContextAsync();
        var vendor = (await Mediator.Send(new CreateVendorCommand(
            context.Society.Id,
            "Monthly Security",
            "Street 2",
            "City",
            "State",
            "12345",
            "India",
            null,
            "Rahul",
            "Nandi",
            "9000000001",
            "rahul@security.com",
            "Security services",
            new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            10,
            null,
            "Security",
            null))).Value!;

        var schedule = (await Mediator.Send(new CreateVendorRecurringScheduleCommand(
            context.Society.Id,
            vendor.Id,
            VendorPaymentFrequency.Monthly,
            1500m,
            new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            "Guard services"))).Value!;

        var updateResult = await Mediator.Send(new UpdateVendorRecurringScheduleCommand(
            context.Society.Id,
            schedule.Id,
            new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
            null));

        updateResult.IsSuccess.Should().BeTrue();
        VendorChargeRepo.Store.Values
            .Where(charge => charge.ScheduleId == schedule.Id)
            .Should()
            .OnlyContain(charge =>
                charge.EffectiveDate <= new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc)
                || !charge.IsActive);
        VendorChargeRepo.Store.Values
            .Where(charge => charge.ScheduleId == schedule.Id && charge.EffectiveDate > new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc))
            .Should()
            .OnlyContain(charge => !charge.IsActive);
    }

    [Fact]
    public async Task UpdateVendorRecurringSchedule_WithInactiveFromDate_InactivatesFutureCharges()
    {
        var context = await SeedVendorContextAsync();
        var vendor = (await Mediator.Send(new CreateVendorCommand(
            context.Society.Id,
            "Inactive Window Vendor",
            "Street 2",
            "City",
            "State",
            "12345",
            "India",
            null,
            "Rahul",
            "Nandi",
            "9000000001",
            "rahul@inactive.com",
            "Security services",
            new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            10,
            null,
            "Security",
            null))).Value!;

        var schedule = (await Mediator.Send(new CreateVendorRecurringScheduleCommand(
            context.Society.Id,
            vendor.Id,
            VendorPaymentFrequency.Monthly,
            1500m,
            new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            "Guard services"))).Value!;

        var updateResult = await Mediator.Send(new UpdateVendorRecurringScheduleCommand(
            context.Society.Id,
            schedule.Id,
            null,
            new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc)));

        updateResult.IsSuccess.Should().BeTrue();
        VendorChargeRepo.Store.Values
            .Where(charge => charge.ScheduleId == schedule.Id && charge.EffectiveDate >= new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc))
            .Should()
            .OnlyContain(charge => !charge.IsActive);
    }

    [Fact]
    public async Task CreateOneTimeCharge_ThenMarkPaid_PersistsPaymentDetails()
    {
        var context = await SeedVendorContextAsync();
        var vendor = (await Mediator.Send(new CreateVendorCommand(
            context.Society.Id,
            "Lift Repair Vendor",
            "Street 3",
            "City",
            "State",
            "12345",
            "India",
            null,
            "Asha",
            "Roy",
            "9000000002",
            "asha@repair.com",
            "Lift repair vendor",
            DateTime.UtcNow.Date.AddMonths(6),
            5,
            null,
            "Repairs",
            null))).Value!;

        var charge = (await Mediator.Send(new CreateVendorOneTimeChargeCommand(
            context.Society.Id,
            vendor.Id,
            12500m,
            DateTime.UtcNow.Date.AddDays(1),
            "Emergency lift repair"))).Value!;

        var paid = await Mediator.Send(new MarkVendorChargePaidCommand(
            context.Society.Id,
            charge.Id,
            DateTime.UtcNow.Date.AddDays(2),
            "Bank Transfer",
            "VND-001",
            "https://files.example.com/receipt.pdf",
            "Paid after approval"));

        paid.IsSuccess.Should().BeTrue();
        paid.Value!.Status.Should().Be("Paid");
        paid.Value.PaidAt.Should().Be(DateTime.UtcNow.Date.AddDays(2));
        paid.Value.TransactionReference.Should().Be("VND-001");
    }

    [Fact]
    public async Task MarkVendorChargePaid_WithoutReceipt_ThrowsValidationException()
    {
        var context = await SeedVendorContextAsync();
        var vendor = (await Mediator.Send(new CreateVendorCommand(
            context.Society.Id,
            "Receipt Vendor",
            "Street 3",
            "City",
            "State",
            "12345",
            "India",
            null,
            "Asha",
            "Roy",
            "9000000002",
            "asha@receipt.com",
            "Lift repair vendor",
            DateTime.UtcNow.Date.AddMonths(6),
            5,
            null,
            "Repairs",
            null))).Value!;

        var charge = (await Mediator.Send(new CreateVendorOneTimeChargeCommand(
            context.Society.Id,
            vendor.Id,
            12500m,
            DateTime.UtcNow.Date.AddDays(1),
            "Emergency lift repair"))).Value!;

        await FluentActions.Invoking(() => Mediator.Send(new MarkVendorChargePaidCommand(
                context.Society.Id,
                charge.Id,
                DateTime.UtcNow.Date.AddDays(2),
                "Bank Transfer",
                "VND-001",
                null,
                "Paid after approval")))
            .Should()
            .ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task GetVendorChargeGrid_ReturnsRowsAndMonthlyTotals()
    {
        var context = await SeedVendorContextAsync();
        var vendor = (await Mediator.Send(new CreateVendorCommand(
            context.Society.Id,
            "Grid Vendor",
            "Street 4",
            "City",
            "State",
            "12345",
            "India",
            null,
            "Ira",
            "Paul",
            "9000000003",
            "ira@grid.com",
            "Grid vendor",
            new DateTime(DateTime.UtcNow.Year, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            5,
            null,
            "Operations",
            null))).Value!;

        await VendorChargeRepo.CreateAsync(VendorCharge.CreateAdHoc(
            context.Society.Id,
            vendor.Id,
            vendor.Name,
            2000m,
            new DateTime(DateTime.UtcNow.Year, 1, 10, 0, 0, 0, DateTimeKind.Utc),
            vendor.PaymentDueDays,
            "January servicing"));

        var paidCharge = VendorCharge.CreateAdHoc(
            context.Society.Id,
            vendor.Id,
            vendor.Name,
            3000m,
            new DateTime(DateTime.UtcNow.Year, 2, 10, 0, 0, 0, DateTimeKind.Utc),
            vendor.PaymentDueDays,
            "February servicing");
        paidCharge.MarkPaid(new DateTime(DateTime.UtcNow.Year, 2, 12, 0, 0, 0, DateTimeKind.Utc), "Cash", null, "https://files.example.com/paid-grid-receipt.pdf", null);
        await VendorChargeRepo.CreateAsync(paidCharge);

        var grid = await Mediator.Send(new GetVendorChargeGridQuery(context.Society.Id, DateTime.UtcNow.Year));

        grid.IsSuccess.Should().BeTrue();
        grid.Value!.Rows.Should().ContainSingle(row => row.VendorId == vendor.Id);
        grid.Value.Totals.Single(total => total.Month == 1).DueAmount.Should().Be(2000m);
        grid.Value.Totals.Single(total => total.Month == 2).PaidAmount.Should().Be(3000m);
    }

    [Fact]
    public async Task InactivateVendorCharge_RemovesItFromGridTotalsButKeepsItInCell()
    {
        var context = await SeedVendorContextAsync();
        var vendor = (await Mediator.Send(new CreateVendorCommand(
            context.Society.Id,
            "Inactive Charge Vendor",
            "Street 4",
            "City",
            "State",
            "12345",
            "India",
            null,
            "Ira",
            "Paul",
            "9000000003",
            "ira@inactive-grid.com",
            "Grid vendor",
            new DateTime(DateTime.UtcNow.Year, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            5,
            null,
            "Operations",
            null))).Value!;

        var charge = await VendorChargeRepo.CreateAsync(VendorCharge.CreateAdHoc(
            context.Society.Id,
            vendor.Id,
            vendor.Name,
            2000m,
            new DateTime(DateTime.UtcNow.Year, 1, 10, 0, 0, 0, DateTimeKind.Utc),
            vendor.PaymentDueDays,
            "January servicing"));

        var inactivateResult = await Mediator.Send(new InactivateVendorChargeCommand(context.Society.Id, charge.Id));
        inactivateResult.IsSuccess.Should().BeTrue();

        var grid = await Mediator.Send(new GetVendorChargeGridQuery(context.Society.Id, DateTime.UtcNow.Year));

        grid.IsSuccess.Should().BeTrue();
        var januaryCell = grid.Value!.Rows.Single(row => row.VendorId == vendor.Id).Months.Single(month => month.Month == 1);
        januaryCell.Charges.Should().ContainSingle(item => item.Id == charge.Id && !item.IsActive);
        januaryCell.TotalAmount.Should().Be(0m);
        grid.Value.Totals.Single(total => total.Month == 1).TotalAmount.Should().Be(0m);
    }

    [Fact]
    public async Task DeleteVendorCharge_SoftDeletesRecurringOccurrenceAndPreventsRegeneration()
    {
        var context = await SeedVendorContextAsync();
        var vendor = (await Mediator.Send(new CreateVendorCommand(
            context.Society.Id,
            "Soft Delete Vendor",
            "Street 2",
            "City",
            "State",
            "12345",
            "India",
            null,
            "Rahul",
            "Nandi",
            "9000000001",
            "rahul@softdelete.com",
            "Security services",
            new DateTime(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            10,
            null,
            "Security",
            null))).Value!;

        var schedule = (await Mediator.Send(new CreateVendorRecurringScheduleCommand(
            context.Society.Id,
            vendor.Id,
            VendorPaymentFrequency.Monthly,
            1500m,
            new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
            "Guard services"))).Value!;

        var deletedCharge = VendorChargeRepo.Store.Values
            .Where(charge => charge.ScheduleId == schedule.Id)
            .OrderBy(charge => charge.EffectiveDate)
            .First();

        var deleteResult = await Mediator.Send(new DeleteVendorChargeCommand(context.Society.Id, deletedCharge.Id));
        deleteResult.IsSuccess.Should().BeTrue();

        await Mediator.Send(new UpdateVendorRecurringScheduleCommand(
            context.Society.Id,
            schedule.Id,
            new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
            null));

        VendorChargeRepo.Store[deletedCharge.Id].IsDeleted.Should().BeTrue();
        var visibleCharges = await Mediator.Send(new GetVendorChargesQuery(
            context.Society.Id,
            vendor.Id,
            2026,
            null,
            null,
            new PaginationParams { Page = 1, PageSize = 20 }));
        visibleCharges.Value!.Items.Should().NotContain(item => item.Id == deletedCharge.Id);
    }

    [Fact]
    public async Task NotifyOverdueVendorCharges_SendsPushNotificationOnce()
    {
        var context = await SeedVendorContextAsync();
        var vendor = (await Mediator.Send(new CreateVendorCommand(
            context.Society.Id,
            "Overdue Vendor",
            "Street 5",
            "City",
            "State",
            "12345",
            "India",
            null,
            "Nina",
            "Ghosh",
            "9000000004",
            "nina@overdue.com",
            "Overdue vendor",
            DateTime.UtcNow.Date.AddMonths(3),
            3,
            null,
            "Electrical",
            null))).Value!;

        await VendorChargeRepo.CreateAsync(VendorCharge.CreateAdHoc(
            context.Society.Id,
            vendor.Id,
            vendor.Name,
            4500m,
            DateTime.UtcNow.Date.AddDays(-10),
            vendor.PaymentDueDays,
            "Overdue payment"));

        var result = await Mediator.Send(new NotifyOverdueVendorChargesCommand(DateTime.UtcNow.Date));

        result.IsSuccess.Should().BeTrue();
        NotificationService.SentPushNotifications.Should().ContainSingle(notification => notification.UserId == context.Admin.Id);
        VendorChargeRepo.Store.Values.Should().OnlyContain(charge => charge.OverdueNotificationSentAt.HasValue);
    }

    [Fact]
    public async Task UploadVendorDocument_ReturnsStoredFileUrl()
    {
        var context = await SeedVendorContextAsync();

        var result = await Mediator.Send(new UploadVendorDocumentCommand(
            context.Society.Id,
            "contract",
            "vendor-contract.pdf",
            "application/pdf",
            [1, 2, 3, 4]));

        result.IsSuccess.Should().BeTrue();
        result.Value!.FileName.Should().Be("vendor-contract.pdf");
        result.Value.FileUrl.Should().Contain("/vendor-payments/");
    }
}
