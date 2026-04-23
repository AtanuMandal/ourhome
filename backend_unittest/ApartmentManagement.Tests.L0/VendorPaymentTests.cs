using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class VendorRecurringScheduleTests
{
    [Fact]
    public void Create_NormalizesMonthOnlyWindow()
    {
        var schedule = VendorRecurringSchedule.Create(
            "society-001",
            "vendor-001",
            VendorPaymentFrequency.Monthly,
            1500m,
            new DateTime(2026, 1, 18, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 3, 2, 0, 0, 0, DateTimeKind.Utc),
            "Guard services");

        schedule.StartDate.Should().Be(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        schedule.EndDate.Should().Be(new DateTime(2026, 3, 31, 0, 0, 0, DateTimeKind.Utc));
        schedule.NextChargeDate.Should().Be(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void UpdateWindow_SetsInactiveFromAndMarksScheduleInactiveWhenReached()
    {
        var schedule = VendorRecurringSchedule.Create(
            "society-001",
            "vendor-001",
            VendorPaymentFrequency.Monthly,
            1500m,
            new DateTime(2025, 1, 18, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 12, 2, 0, 0, 0, DateTimeKind.Utc),
            "Guard services");

        schedule.UpdateWindow(null, new DateTime(2025, 2, 20, 0, 0, 0, DateTimeKind.Utc));

        schedule.InactiveFromDate.Should().Be(new DateTime(2025, 2, 1, 0, 0, 0, DateTimeKind.Utc));
        schedule.IsActive.Should().BeFalse();
        schedule.AppliesTo(new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)).Should().BeTrue();
        schedule.AppliesTo(new DateTime(2025, 2, 1, 0, 0, 0, DateTimeKind.Utc)).Should().BeFalse();
    }
}

public class VendorChargeTests
{
    [Fact]
    public void CreateAdHoc_NormalizesToMonthStart()
    {
        var charge = VendorCharge.CreateAdHoc(
            "society-001",
            "vendor-001",
            "Lift Repair Vendor",
            12500m,
            new DateTime(2026, 4, 18, 0, 0, 0, DateTimeKind.Utc),
            5,
            "Emergency lift repair");

        charge.EffectiveDate.Should().Be(new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc));
        charge.ChargeMonth.Should().Be(4);
        charge.ChargeYear.Should().Be(2026);
    }

    [Fact]
    public void MarkPaid_WithoutReceipt_ThrowsArgumentException()
    {
        var charge = VendorCharge.CreateAdHoc(
            "society-001",
            "vendor-001",
            "Lift Repair Vendor",
            12500m,
            new DateTime(2026, 4, 18, 0, 0, 0, DateTimeKind.Utc),
            5,
            "Emergency lift repair");

        var act = () => charge.MarkPaid(
            new DateTime(2026, 4, 3, 0, 0, 0, DateTimeKind.Utc),
            "Bank Transfer",
            "VND-001",
            null,
            "Paid after approval");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Inactivate_AndActivate_TogglesChargeVisibility()
    {
        var charge = VendorCharge.CreateAdHoc(
            "society-001",
            "vendor-001",
            "Lift Repair Vendor",
            12500m,
            new DateTime(2026, 4, 18, 0, 0, 0, DateTimeKind.Utc),
            5,
            "Emergency lift repair");

        charge.Inactivate();
        charge.IsActive.Should().BeFalse();

        charge.Activate();
        charge.IsActive.Should().BeTrue();
    }

    [Fact]
    public void SoftDelete_MarksChargeDeletedAndInactive()
    {
        var charge = VendorCharge.CreateAdHoc(
            "society-001",
            "vendor-001",
            "Lift Repair Vendor",
            12500m,
            new DateTime(2026, 4, 18, 0, 0, 0, DateTimeKind.Utc),
            5,
            "Emergency lift repair");

        charge.SoftDelete();

        charge.IsDeleted.Should().BeTrue();
        charge.IsActive.Should().BeFalse();
    }
}
