using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class FeeScheduleTests
{
    private const string SocietyId = "society-001";
    private const string ApartmentId = "apt-001";

    [Fact]
    public void Create_WithValidParameters_ReturnsActiveFeeSchedule()
    {
        // Arrange & Act
        var schedule = FeeSchedule.Create(SocietyId, ApartmentId, "Monthly Maintenance", 2500m, FeeFrequency.Monthly, 5);

        // Assert
        schedule.Id.Should().NotBeNullOrEmpty();
        schedule.IsActive.Should().BeTrue();
        schedule.Amount.Should().Be(2500m);
        schedule.DueDay.Should().Be(5);
        schedule.Frequency.Should().Be(FeeFrequency.Monthly);
    }

    [Fact]
    public void Create_WithNegativeAmount_ThrowsArgumentOutOfRangeException()
    {
        // Arrange & Act
        var act = () => FeeSchedule.Create(SocietyId, ApartmentId, "Maintenance", -100m, FeeFrequency.Monthly, 5);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(29)]
    [InlineData(-1)]
    public void Create_WithInvalidDueDay_ThrowsArgumentOutOfRangeException(int dueDay)
    {
        // Arrange & Act
        var act = () => FeeSchedule.Create(SocietyId, ApartmentId, "Maintenance", 1000m, FeeFrequency.Monthly, dueDay);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Deactivate_SetsIsActiveFalse()
    {
        // Arrange
        var schedule = FeeSchedule.Create(SocietyId, ApartmentId, "Maintenance", 1000m, FeeFrequency.Monthly, 5);

        // Act
        schedule.Deactivate();

        // Assert
        schedule.IsActive.Should().BeFalse();
    }

    [Fact]
    public void CalculateNextDueDate_ReturnsCorrectFutureDate()
    {
        // Arrange
        var schedule = FeeSchedule.Create(SocietyId, ApartmentId, "Maintenance", 1000m, FeeFrequency.Monthly, 15);
        var from = new DateTime(2024, 1, 20, 0, 0, 0, DateTimeKind.Utc);

        // Act
        var nextDate = schedule.CalculateNextDueDate(from);

        // Assert
        nextDate.Day.Should().Be(15);
        nextDate.Month.Should().Be(2);
        nextDate.Year.Should().Be(2024);
    }

    [Fact]
    public void UpdateAmount_WithValidAmount_UpdatesAmount()
    {
        // Arrange
        var schedule = FeeSchedule.Create(SocietyId, ApartmentId, "Maintenance", 1000m, FeeFrequency.Monthly, 5);

        // Act
        schedule.UpdateAmount(1500m);

        // Assert
        schedule.Amount.Should().Be(1500m);
    }
}

public class FeePaymentTests
{
    private const string SocietyId = "society-001";
    private const string ApartmentId = "apt-001";
    private const string ScheduleId = "schedule-001";

    [Fact]
    public void Create_WithValidParameters_ReturnsPendingPayment()
    {
        // Arrange
        var dueDate = DateTime.UtcNow.AddDays(5);

        // Act
        var payment = FeePayment.Create(SocietyId, ApartmentId, ScheduleId, "Monthly Maintenance", 2500m, dueDate);

        // Assert
        payment.Id.Should().NotBeNullOrEmpty();
        payment.Status.Should().Be(PaymentStatus.Pending);
        payment.Amount.Should().Be(2500m);
        payment.DueDate.Should().Be(dueDate);
    }

    [Fact]
    public void Create_RaisesFeePaymentDueEvent()
    {
        // Arrange & Act
        var payment = FeePayment.Create(SocietyId, ApartmentId, ScheduleId, "Maintenance", 1000m, DateTime.UtcNow.AddDays(5));

        // Assert
        payment.DomainEvents.Should().ContainSingle(e => e is FeePaymentDueEvent);
    }

    [Fact]
    public void Create_WithZeroAmount_ThrowsArgumentOutOfRangeException()
    {
        // Arrange & Act
        var act = () => FeePayment.Create(SocietyId, ApartmentId, ScheduleId, "Maintenance", 0m, DateTime.UtcNow.AddDays(5));

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void MarkPaid_SetsStatusPaidAndRecordsTransaction()
    {
        // Arrange
        var payment = FeePayment.Create(SocietyId, ApartmentId, ScheduleId, "Maintenance", 2500m, DateTime.UtcNow.AddDays(5));

        // Act
        payment.MarkPaid("UPI", "TXN123", "https://receipts.example.com/123");

        // Assert
        payment.Status.Should().Be(PaymentStatus.Paid);
        payment.PaidAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        payment.TransactionId.Should().Be("TXN123");
        payment.ReceiptUrl.Should().Be("https://receipts.example.com/123");
    }

    [Fact]
    public void MarkPaid_RaisesFeePaymentReceivedEvent()
    {
        // Arrange
        var payment = FeePayment.Create(SocietyId, ApartmentId, ScheduleId, "Maintenance", 2500m, DateTime.UtcNow.AddDays(5));

        // Act
        payment.MarkPaid("UPI", "TXN123");

        // Assert
        payment.DomainEvents.Should().Contain(e => e is FeePaymentReceivedEvent);
    }

    [Fact]
    public void MarkOverdue_SetsStatusOverdue()
    {
        // Arrange
        var payment = FeePayment.Create(SocietyId, ApartmentId, ScheduleId, "Maintenance", 2500m, DateTime.UtcNow.AddDays(-5));

        // Act
        payment.MarkOverdue();

        // Assert
        payment.Status.Should().Be(PaymentStatus.Overdue);
    }
}
