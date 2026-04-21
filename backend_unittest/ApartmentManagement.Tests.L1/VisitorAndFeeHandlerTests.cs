using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Application.Commands.Maintenance;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class RegisterVisitorCommandHandlerTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<IQrCodeService> _qrCodeMock = new();
    private readonly Mock<ILogger<RegisterVisitorCommandHandler>> _loggerMock = new();

    private RegisterVisitorCommandHandler CreateHandler() =>
        new(_visitorRepoMock.Object, _notificationMock.Object, _qrCodeMock.Object,
            _eventPublisherMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidCommand_CreatesVisitorLogAndReturnsSuccess()
    {
        // Arrange
        _qrCodeMock
            .Setup(q => q.GenerateQrCodeBase64Async(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("base64qrdata");
        _visitorRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((VisitorLog l, CancellationToken _) => l);

        var handler = CreateHandler();
        var command = new RegisterVisitorCommand(
            "soc-001", "John Visitor", "+91-9876543210", null,
            "Personal visit", "apt-001", "user-001", null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value!.PassCode.Should().NotBeNullOrEmpty();
        _visitorRepoMock.Verify(r => r.CreateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>()), Times.Once);
        _notificationMock.Verify(n => n.SendPushNotificationAsync("user-001", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}

public class CheckInVisitorCommandHandlerTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<ILogger<CheckInVisitorCommandHandler>> _loggerMock = new();

    private CheckInVisitorCommandHandler CreateHandler() =>
        new(_visitorRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithApprovedVisitorPassCode_ChecksInAndReturnsSuccess()
    {
        // Arrange
        var log = VisitorLog.Create("soc-001", "John", "+91-9876543210", null, "Visit", "apt-001", "host-001", null);
        log.Approve();
        var passCode = log.PassCode;

        _visitorRepoMock
            .Setup(r => r.GetByIdAsync(log.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(log);
        _visitorRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((VisitorLog l, CancellationToken _) => l);

        var handler = CreateHandler();
        var command = new CheckInVisitorCommand("soc-001", log.Id, passCode);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        log.Status.Should().Be(VisitorStatus.CheckedIn);
    }

    [Fact]
    public async Task Handle_WithInvalidPassCode_ReturnsFailure()
    {
        // Arrange: log exists but command uses a wrong passCode
        var log = VisitorLog.Create("soc-001", "John", "+91-9876543210", null, "Visit", "apt-001", "host-001", null);
        log.Approve();

        _visitorRepoMock
            .Setup(r => r.GetByIdAsync(log.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(log);

        var handler = CreateHandler();
        var command = new CheckInVisitorCommand("soc-001", log.Id, "WRONG-PASS");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.InvalidPassCode);
    }

    [Fact]
    public async Task Handle_WithPendingVisitor_ReturnsFailure()
    {
        // Arrange: log exists with correct passCode but is NOT approved
        var log = VisitorLog.Create("soc-001", "John", "+91-9876543210", null, "Visit", "apt-001", "host-001", null);
        var passCode = log.PassCode;

        _visitorRepoMock
            .Setup(r => r.GetByIdAsync(log.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(log);

        var handler = CreateHandler();
        var command = new CheckInVisitorCommand("soc-001", log.Id, passCode);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.VisitorNotApproved);
    }
}

public class CreateMaintenanceScheduleCommandHandlerTests
{
    private readonly Mock<IMaintenanceScheduleRepository> _scheduleRepoMock = new();
    private readonly Mock<IMaintenanceChargeRepository> _chargeRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<CreateMaintenanceScheduleCommandHandler>> _loggerMock = new();

    private CreateMaintenanceScheduleCommandHandler CreateHandler() =>
        new(_scheduleRepoMock.Object, _chargeRepoMock.Object, _apartmentRepoMock.Object, _currentUserMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidCommand_CreatesMaintenanceScheduleAndUpcomingCharges()
    {
        // Arrange
        var apartment = Apartment.Create("soc-001", "A-101", "A", 1, 3, [], 500, 600, 700);

        _currentUserMock.Setup(x => x.IsInRoles(It.IsAny<string[]>())).Returns(true);
        _scheduleRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<MaintenanceSchedule>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceSchedule s, CancellationToken _) => s);
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);
        _chargeRepoMock
            .Setup(r => r.GetByScheduleAndPeriodAsync("soc-001", It.IsAny<string>(), apartment.Id, It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceCharge?)null);
        _chargeRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<MaintenanceCharge>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceCharge c, CancellationToken _) => c);
        _chargeRepoMock
            .Setup(r => r.GetByScheduleAsync("soc-001", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var handler = CreateHandler();
        var command = new CreateMaintenanceScheduleCommand(
            "soc-001",
            "Monthly Maintenance",
            "Monthly upkeep",
            apartment.Id,
            2500m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Name.Should().Be("Monthly Maintenance");
        _scheduleRepoMock.Verify(r => r.CreateAsync(It.IsAny<MaintenanceSchedule>(), It.IsAny<CancellationToken>()), Times.Once);
        _chargeRepoMock.Verify(r => r.CreateAsync(It.IsAny<MaintenanceCharge>(), It.IsAny<CancellationToken>()), Times.Exactly(6));
    }
}

public class SubmitMaintenancePaymentProofCommandHandlerTests
{
    private readonly Mock<IMaintenanceChargeRepository> _chargeRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<SubmitMaintenancePaymentProofCommandHandler>> _loggerMock = new();

    private SubmitMaintenancePaymentProofCommandHandler CreateHandler() =>
        new(_chargeRepoMock.Object, _apartmentRepoMock.Object, _societyRepoMock.Object, _userRepoMock.Object, _notificationMock.Object, _currentUserMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenResidentOwnsCharge_SubmitsProofAndNotifiesAdmins()
    {
        // Arrange
        var apartment = Apartment.Create("soc-001", "A-101", "A", 1, 3, [], 500, 600, 700);
        var payment = MaintenanceCharge.Create("soc-001", apartment.Id, "schedule-001", "Monthly Maintenance", 2500m, DateTime.UtcNow.AddDays(5));
        var resident = User.Create("soc-001", "Resident User", "resident@test.com", "9999999999", UserRole.SUUser, ResidentType.Owner, apartment.Id);
        var society = Society.Create("Our Home", new Domain.ValueObjects.Address("Street", "City", "State", "12345", "India"), "soc@test.com", "8888888888", 1, 10);
        society.AssignAdmin("admin-001");
        var paymentId = payment.Id;

        _currentUserMock.SetupGet(x => x.UserId).Returns(resident.Id);
        _currentUserMock.Setup(x => x.IsInRoles(It.IsAny<string[]>())).Returns(false);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(resident.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(resident);
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("soc-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _chargeRepoMock
            .Setup(r => r.GetByIdAsync(paymentId, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(payment);
        _chargeRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<MaintenanceCharge>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceCharge p, CancellationToken _) => p);
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);

        var handler = CreateHandler();
        var command = new SubmitMaintenancePaymentProofCommand("soc-001", [paymentId], "https://proofs.example.com/1", "UPI receipt");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        payment.Status.Should().Be(PaymentStatus.ProofSubmitted);
        payment.Proofs.Should().ContainSingle();
        _notificationMock.Verify(n => n.SendPushNotificationAsync("admin-001", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}

public class MarkMaintenanceChargePaidCommandHandlerTests
{
    private readonly Mock<IMaintenanceChargeRepository> _chargeRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<MarkMaintenanceChargePaidCommandHandler>> _loggerMock = new();

    private MarkMaintenanceChargePaidCommandHandler CreateHandler() =>
        new(_chargeRepoMock.Object, _apartmentRepoMock.Object, _societyRepoMock.Object, _eventPublisherMock.Object, _currentUserMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenChargeExists_MarksAsPaidAndPublishesEvent()
    {
        var apartment = Apartment.Create("soc-001", "A-101", "A", 1, 3, [], 500, 600, 700);
        var charge = MaintenanceCharge.Create("soc-001", apartment.Id, "schedule-001", "Monthly Maintenance", 2500m, DateTime.UtcNow.AddDays(5));
        var society = Society.Create("Our Home", new Domain.ValueObjects.Address("Street", "City", "State", "12345", "India"), "soc@test.com", "8888888888", 1, 10);

        _currentUserMock.Setup(x => x.IsInRoles(It.IsAny<string[]>())).Returns(true);
        _chargeRepoMock
            .Setup(r => r.GetByIdAsync(charge.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(charge);
        _chargeRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<MaintenanceCharge>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceCharge c, CancellationToken _) => c);
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("soc-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);

        var handler = CreateHandler();
        var command = new MarkMaintenanceChargePaidCommand("soc-001", charge.Id, "UPI", "TXN123", null, null);

        var result = await handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        charge.Status.Should().Be(PaymentStatus.Paid);
        charge.TransactionReference.Should().Be("TXN123");
        _eventPublisherMock.Verify(e => e.PublishAsync(It.IsAny<IDomainEvent>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }
}
