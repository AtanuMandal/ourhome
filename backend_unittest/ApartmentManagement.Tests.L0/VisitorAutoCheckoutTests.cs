using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class VisitorAutoCheckoutTests
{
    private static VisitorLog CreateCheckedInVisitor()
    {
        var log = VisitorLog.Create("society-001", "John Visitor", "+91-9876543210",
            "john@example.com", "Amazon", "Personal visit", "apt-001", "user-001",
            "Resident User", "A", 1, "A-101", false);
        log.Approve();
        log.CheckIn();
        return log;
    }

    [Fact]
    public void AutoCheckOut_WhenCheckedIn_SetsCheckedOutAndFlagsAuto()
    {
        var log = CreateCheckedInVisitor();

        log.AutoCheckOut();

        log.Status.Should().Be(VisitorStatus.CheckedOut);
        log.CheckOutTime.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        log.IsAutoCheckedOut.Should().BeTrue();
    }

    [Fact]
    public void AutoCheckOut_WhenNotCheckedIn_Throws()
    {
        var log = VisitorLog.Create("society-001", "John Visitor", "+91-9876543210",
            null, null, "Personal visit", "apt-001", "user-001",
            "Resident User", "A", 1, "A-101", false);

        var act = () => log.AutoCheckOut();

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void CheckOut_BySecurity_DoesNotFlagAuto()
    {
        var log = CreateCheckedInVisitor();

        log.CheckOut();

        log.IsAutoCheckedOut.Should().BeFalse();
    }

    [Fact]
    public void IsOverstaying_CheckedInLongerThanThreshold_ReturnsTrue()
    {
        var log = CreateCheckedInVisitor();

        // Checked in "now" — evaluate against a clock 6 hours in the future with a 5-hour threshold.
        var futureNow = DateTime.UtcNow.AddHours(6);

        log.IsOverstaying(5, futureNow).Should().BeTrue();
    }

    [Fact]
    public void IsOverstaying_WithinThreshold_ReturnsFalse()
    {
        var log = CreateCheckedInVisitor();

        log.IsOverstaying(5).Should().BeFalse();
    }

    [Fact]
    public void IsOverstaying_AfterCheckOut_ReturnsFalse()
    {
        var log = CreateCheckedInVisitor();
        log.CheckOut();

        log.IsOverstaying(5, DateTime.UtcNow.AddHours(10)).Should().BeFalse();
    }

    private static VisitorLog CreatePreApprovedCheckedInVisitor(DateTime validUntil)
    {
        var log = VisitorLog.Create("society-001", "Long Stay Visitor", "+91-9876543211",
            null, null, "Family stay", "apt-001", "user-001",
            "Resident User", "A", 1, "A-101", isPreApproved: true, validUntil: validUntil);
        log.CheckIn();
        return log;
    }

    [Fact]
    public void HasValidPass_PreApprovedWithFutureValidity_ReturnsTrue()
    {
        var log = CreatePreApprovedCheckedInVisitor(DateTime.UtcNow.AddHours(48));

        log.HasValidPass().Should().BeTrue();
    }

    [Fact]
    public void HasValidPass_PreApprovedWithExpiredValidity_ReturnsFalse()
    {
        var log = CreatePreApprovedCheckedInVisitor(DateTime.UtcNow.AddHours(48));

        log.HasValidPass(DateTime.UtcNow.AddHours(49)).Should().BeFalse();
    }

    [Fact]
    public void HasValidPass_NotPreApproved_ReturnsFalse()
    {
        var log = CreateCheckedInVisitor();

        log.HasValidPass().Should().BeFalse();
    }

    [Fact]
    public void IsOverstaying_PreApprovedWithValidPass_NotFlaggedPastThreshold()
    {
        // The pass explicitly authorizes a 48-hour stay — crossing the society's 5-hour
        // threshold must not flag the visitor while the pass is still valid.
        var log = CreatePreApprovedCheckedInVisitor(DateTime.UtcNow.AddHours(48));

        log.IsOverstaying(5, DateTime.UtcNow.AddHours(10)).Should().BeFalse();
    }

    [Fact]
    public void IsOverstaying_PreApprovedAfterPassExpires_IsFlagged()
    {
        var log = CreatePreApprovedCheckedInVisitor(DateTime.UtcNow.AddHours(2));

        log.IsOverstaying(5, DateTime.UtcNow.AddHours(6)).Should().BeTrue();
    }
}
