using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
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

