using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class CreateUserCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<ILogger<CreateUserCommandHandler>> _loggerMock = new();

    private CreateUserCommandHandler CreateHandler() =>
        new(_userRepoMock.Object, _apartmentRepoMock.Object, _notificationMock.Object, _eventPublisherMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithNewUser_CreatesUserAndSendsOtp()
    {
        // Arrange
        _userRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _userRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync("apt-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Apartment.Create("soc-001", "101", "A", 1, 2, ["P1"]));
        _apartmentRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment a, CancellationToken _) => a);

        var handler = CreateHandler();
        var command = new CreateUserCommand("soc-001", "Alice Smith", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner, "apt-001");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
        _notificationMock.Verify(n => n.SendSmsAsync("+91-9876543210", It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenEmailAlreadyExists_ReturnsFailure()
    {
        // Arrange
        var existingUser = User.Create("soc-001", "Bob", "alice@example.com", "+91-1111111111", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync([existingUser]);

        var handler = CreateHandler();
        var command = new CreateUserCommand("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner, null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserAlreadyExists);
        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

public class VerifyOtpCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IAuthService> _authServiceMock = new();
    private readonly Mock<ILogger<VerifyOtpCommandHandler>> _loggerMock = new();

    private VerifyOtpCommandHandler CreateHandler() => new(_userRepoMock.Object, _authServiceMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidOtp_VerifiesUserAndReturnsSuccess()
    {
        // Arrange
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        user.GenerateOtp();
        var validOtp = user.OtpCode!;

        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        _authServiceMock
            .Setup(a => a.GenerateJwtTokenAsync(user.Id, user.Email, user.Role.ToString(), user.SocietyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync("token");

        var handler = CreateHandler();
        var command = new VerifyOtpCommand("soc-001", user.Id, validOtp);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        user.IsVerified.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_WithInvalidOtp_ReturnsFailure()
    {
        // Arrange
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        user.GenerateOtp();

        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var handler = CreateHandler();
        var command = new VerifyOtpCommand("soc-001", user.Id, "000000");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.OtpInvalid);
    }

    [Fact]
    public async Task Handle_WhenUserNotFound_ReturnsFailure()
    {
        // Arrange
        _userRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var handler = CreateHandler();
        var command = new VerifyOtpCommand("soc-001", "unknown-user", "123456");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserNotFound);
    }
}

public class SendOtpCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<SendOtpCommandHandler>> _loggerMock = new();

    private SendOtpCommandHandler CreateHandler() =>
        new(_userRepoMock.Object, _notificationMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenUserExists_GeneratesOtpAndSendsSms()
    {
        // Arrange
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);

        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var handler = CreateHandler();
        var command = new SendOtpCommand("soc-001", user.Id);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _notificationMock.Verify(n => n.SendSmsAsync("+91-9876543210", It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenUserNotFound_ReturnsFailure()
    {
        // Arrange
        _userRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var handler = CreateHandler();
        var command = new SendOtpCommand("soc-001", "unknown-user");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserNotFound);
    }
}
