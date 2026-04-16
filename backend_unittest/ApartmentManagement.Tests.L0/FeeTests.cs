using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class MaintenanceScheduleTests
{
    private const string SocietyId = "society-001";
    private const string ApartmentId = "apt-001";

    [Fact]
    public void Create_WithValidParameters_ReturnsActiveMaintenanceSchedule()
    {
        // Arrange & Act
        var schedule = MaintenanceSchedule.Create(
            SocietyId,
            ApartmentId,
            "Monthly Maintenance",
            "Monthly common area upkeep",
            2.5m,
            MaintenancePricingType.PerSquareFoot,
            MaintenanceAreaBasis.SuperBuildUpArea,
            FeeFrequency.Monthly,
            5);

        // Assert
        schedule.Id.Should().NotBeNullOrEmpty();
        schedule.IsActive.Should().BeTrue();
        schedule.Rate.Should().Be(2.5m);
        schedule.DueDay.Should().Be(5);
        schedule.Frequency.Should().Be(FeeFrequency.Monthly);
        schedule.AreaBasis.Should().Be(MaintenanceAreaBasis.SuperBuildUpArea);
    }

    [Fact]
    public void Create_WithNegativeRate_ThrowsArgumentOutOfRangeException()
    {
        // Arrange & Act
        var act = () => MaintenanceSchedule.Create(
            SocietyId,
            ApartmentId,
            "Maintenance",
            null,
            -100m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_PerSquareFootWithoutAreaBasis_ThrowsArgumentException()
    {
        var act = () => MaintenanceSchedule.Create(
            SocietyId,
            ApartmentId,
            "Maintenance",
            null,
            3m,
            MaintenancePricingType.PerSquareFoot,
            null,
            FeeFrequency.Monthly,
            5);

        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(29)]
    [InlineData(-1)]
    public void Create_WithInvalidDueDay_ThrowsArgumentOutOfRangeException(int dueDay)
    {
        // Arrange & Act
        var act = () => MaintenanceSchedule.Create(
            SocietyId,
            ApartmentId,
            "Maintenance",
            null,
            1000m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            dueDay);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Update_RecordsChangeHistory()
    {
        // Arrange
        var schedule = MaintenanceSchedule.Create(
            SocietyId,
            ApartmentId,
            "Maintenance",
            null,
            1000m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5);

        // Act
        schedule.Update(
            ApartmentId,
            "Updated Maintenance",
            "Revised amount",
            1250m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            7,
            true,
            "admin-001",
            "Admin User",
            "Annual revision");

        // Assert
        schedule.Rate.Should().Be(1250m);
        schedule.ChangeHistory.Should().ContainSingle();
        schedule.ChangeHistory[0].PreviousRate.Should().Be(1000m);
        schedule.ChangeHistory[0].NewRate.Should().Be(1250m);
    }

    [Fact]
    public void CalculateNextDueDate_ReturnsCorrectFutureDate()
    {
        // Arrange
        var schedule = MaintenanceSchedule.Create(
            SocietyId,
            ApartmentId,
            "Maintenance",
            null,
            1000m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            15);
        var from = new DateTime(2024, 1, 20, 0, 0, 0, DateTimeKind.Utc);

        // Act
        var nextDate = schedule.CalculateNextDueDate(from);

        // Assert
        nextDate.Day.Should().Be(15);
        nextDate.Month.Should().Be(2);
        nextDate.Year.Should().Be(2024);
    }

    [Fact]
    public void AdvanceNextDueDate_MovesToNextCycle()
    {
        // Arrange
        var schedule = MaintenanceSchedule.Create(
            SocietyId,
            ApartmentId,
            "Maintenance",
            null,
            1000m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5);
        var original = schedule.NextDueDate;

        // Act
        schedule.AdvanceNextDueDate();

        // Assert
        schedule.NextDueDate.Should().BeAfter(original);
    }
}

public class MaintenanceChargeTests
{
    private const string SocietyId = "society-001";
    private const string ApartmentId = "apt-001";
    private const string ScheduleId = "schedule-001";

    [Fact]
    public void Create_WithValidParameters_ReturnsPendingCharge()
    {
        // Arrange
        var dueDate = DateTime.UtcNow.AddDays(5);

        // Act
        var payment = MaintenanceCharge.Create(SocietyId, ApartmentId, ScheduleId, "Monthly Maintenance", 2500m, dueDate);

        // Assert
        payment.Id.Should().NotBeNullOrEmpty();
        payment.Status.Should().Be(PaymentStatus.Pending);
        payment.Amount.Should().Be(2500m);
        payment.DueDate.Should().Be(dueDate);
    }

    [Fact]
    public void Create_RaisesMaintenanceChargeDueEvent()
    {
        // Arrange & Act
        var payment = MaintenanceCharge.Create(SocietyId, ApartmentId, ScheduleId, "Maintenance", 1000m, DateTime.UtcNow.AddDays(5));

        // Assert
        payment.DomainEvents.Should().ContainSingle(e => e is MaintenanceChargeDueEvent);
    }

    [Fact]
    public void Create_WithZeroAmount_ThrowsArgumentOutOfRangeException()
    {
        // Arrange & Act
        var act = () => MaintenanceCharge.Create(SocietyId, ApartmentId, ScheduleId, "Maintenance", 0m, DateTime.UtcNow.AddDays(5));

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void MarkPaid_SetsStatusPaidAndRecordsTransaction()
    {
        // Arrange
        var payment = MaintenanceCharge.Create(SocietyId, ApartmentId, ScheduleId, "Maintenance", 2500m, DateTime.UtcNow.AddDays(5));

        // Act
        payment.MarkPaid("UPI", "TXN123", "https://receipts.example.com/123");

        // Assert
        payment.Status.Should().Be(PaymentStatus.Paid);
        payment.PaidAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        payment.TransactionReference.Should().Be("TXN123");
        payment.ReceiptUrl.Should().Be("https://receipts.example.com/123");
    }

    [Fact]
    public void SubmitProof_SetsStatusToProofSubmitted()
    {
        // Arrange
        var payment = MaintenanceCharge.Create(SocietyId, ApartmentId, ScheduleId, "Maintenance", 2500m, DateTime.UtcNow.AddDays(5));

        // Act
        payment.SubmitProof("https://proofs.example.com/123", "UPI screenshot", "user-001");

        // Assert
        payment.Status.Should().Be(PaymentStatus.ProofSubmitted);
        payment.Proofs.Should().ContainSingle();
    }

    [Fact]
    public void ApprovePayment_RaisesFeePaymentReceivedEvent()
    {
        // Arrange
        var payment = MaintenanceCharge.Create(SocietyId, ApartmentId, ScheduleId, "Maintenance", 2500m, DateTime.UtcNow.AddDays(5));
        payment.SubmitProof("https://proofs.example.com/123", "UPI screenshot", "user-001");

        // Act
        payment.ApprovePayment("UPI", "TXN123", null);

        // Assert
        payment.Status.Should().Be(PaymentStatus.Paid);
        payment.DomainEvents.Should().Contain(e => e is FeePaymentReceivedEvent);
    }
}
