using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Application.Queries.User;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Models;
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
    private readonly Mock<ICurrentUserService> _currentUserServiceMock = new();
    private readonly Mock<ILogger<CreateUserCommandHandler>> _loggerMock = new();

    private CreateUserCommandHandler CreateHandler() =>
        new(_userRepoMock.Object, _apartmentRepoMock.Object, _notificationMock.Object, _eventPublisherMock.Object, _currentUserServiceMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithNewUser_CreatesUserAndSendsOtp()
    {
        // Arrange
        _userRepoMock
            .Setup(r => r.GetByEmailAsync("soc-001", "alice@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _userRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync("apt-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Apartment.Create("soc-001", "101", "A", 1, 2, ["P1"], 500, 600, 700));
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
            .Setup(r => r.GetByEmailAsync("soc-001", "alice@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingUser);

        var handler = CreateHandler();
        var command = new CreateUserCommand("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner, null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserAlreadyExists);
        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_SUAdminCreatingSUSecurity_Succeeds()
    {
        // Arrange
        var admin = User.Create("soc-001", "Admin", "admin@soc.com", "+91-9000000001", UserRole.SUAdmin, ResidentType.SocietyAdmin);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(admin.Id);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(admin.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(admin);
        _userRepoMock
            .Setup(r => r.GetByEmailAsync("soc-001", "guard@soc.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _userRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var handler = CreateHandler();
        var command = new CreateUserCommand("soc-001", "Guard One", "guard@soc.com", "+91-9000000002",
            UserRole.SUSecurity, ResidentType.SocietyAdmin, null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Role.Should().Be("SUSecurity");
        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_SUUserCreatingSUSecurity_ReturnsForbidden()
    {
        // Arrange
        var resident = User.Create("soc-001", "Resident", "resident@soc.com", "+91-9000000003",
            UserRole.SUUser, ResidentType.Owner);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(resident.Id);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(resident.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(resident);
        _userRepoMock
            .Setup(r => r.GetByEmailAsync("soc-001", "guard@soc.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var handler = CreateHandler();
        var command = new CreateUserCommand("soc-001", "Guard", "guard@soc.com", "+91-9000000004",
            UserRole.SUSecurity, ResidentType.SocietyAdmin, null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Forbidden);
    }

    [Fact]
    public async Task Handle_SUSecurityCreated_HasNoApartmentId()
    {
        // Arrange
        var admin = User.Create("soc-001", "Admin", "admin@soc.com", "+91-9000000005", UserRole.SUAdmin, ResidentType.SocietyAdmin);
        _currentUserServiceMock.Setup(s => s.UserId).Returns(admin.Id);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(admin.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(admin);
        _userRepoMock
            .Setup(r => r.GetByEmailAsync("soc-001", "guard2@soc.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _userRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var handler = CreateHandler();
        var command = new CreateUserCommand("soc-001", "Guard Two", "guard2@soc.com", "+91-9000000006",
            UserRole.SUSecurity, ResidentType.SocietyAdmin, null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.ApartmentId.Should().BeNullOrEmpty();
    }
}

public class ChangePasswordCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IAuthService> _authServiceMock = new();
    private readonly Mock<ILogger<ChangePasswordCommandHandler>> _loggerMock = new();

    private ChangePasswordCommandHandler CreateHandler() =>
        new(_userRepoMock.Object, _authServiceMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidCurrentPassword_ChangesPassword()
    {
        var user = User.Create("soc-001", "Alice", "alice@soc.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        user.SetPasswordHash("hashed-old");

        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _authServiceMock
            .Setup(a => a.VerifyPassword("old-password", "hashed-old"))
            .Returns(true);
        _authServiceMock
            .Setup(a => a.HashPassword("new-password"))
            .Returns("hashed-new");

        var handler = CreateHandler();
        var result = await handler.Handle(
            new ChangePasswordCommand("soc-001", user.Id, "old-password", "new-password"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _userRepoMock.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithWrongCurrentPassword_ReturnsInvalidCredentials()
    {
        var user = User.Create("soc-001", "Alice", "alice@soc.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        user.SetPasswordHash("hashed-old");

        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _authServiceMock
            .Setup(a => a.VerifyPassword("wrong-password", "hashed-old"))
            .Returns(false);

        var handler = CreateHandler();
        var result = await handler.Handle(
            new ChangePasswordCommand("soc-001", user.Id, "wrong-password", "new-password"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.InvalidCredentials);
        _userRepoMock.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenUserHasNoPassword_ReturnsInvalidCredentials()
    {
        var user = User.Create("soc-001", "Alice", "alice@soc.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);

        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var handler = CreateHandler();
        var result = await handler.Handle(
            new ChangePasswordCommand("soc-001", user.Id, "any-password", "new-password"),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.InvalidCredentials);
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
            .Setup(a => a.GenerateJwtTokenAsync(user.Id, user.Email, user.Role.ToString(), user.SocietyId, It.IsAny<string?>(), It.IsAny<CancellationToken>()))
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

// ─── SelfRegisterCommandHandler Tests ─────────────────────────────────────────

public class SelfRegisterCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IAuthService> _authServiceMock = new();

    private SelfRegisterCommandHandler CreateHandler() =>
        new(_userRepoMock.Object, _authServiceMock.Object);

    [Fact]
    public async Task Handle_NewUser_CreatesVerifiedUserWithHashedPassword()
    {
        // Arrange
        User? captured = null;
        _userRepoMock
            .Setup(r => r.GetByEmailAsync("soc-001", "alice@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _userRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Callback<User, CancellationToken>((u, _) => captured = u)
            .ReturnsAsync((User u, CancellationToken _) => u);
        _authServiceMock
            .Setup(a => a.HashPassword("Password1!"))
            .Returns("hashed-password");

        var handler = CreateHandler();
        var command = new SelfRegisterCommand("soc-001", "Alice Smith", "alice@example.com", "+91-9876543210", "Password1!");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
        _userRepoMock.Verify(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        _authServiceMock.Verify(a => a.HashPassword("Password1!"), Times.Once);
        captured.Should().NotBeNull();
        captured!.IsVerified.Should().BeTrue();
        captured!.OtpCode.Should().BeNull();
    }

    [Fact]
    public async Task Handle_ExistingEmail_ReturnsUserAlreadyExists()
    {
        // Arrange
        var existing = User.Create("soc-001", "Bob", "alice@example.com", "+91-1111111111", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByEmailAsync("soc-001", "alice@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var handler = CreateHandler();
        var command = new SelfRegisterCommand("soc-001", "Alice", "alice@example.com", "+91-9876543210", "Password1!");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserAlreadyExists);
        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

// ─── RequestApartmentJoinCommandHandler Tests ─────────────────────────────────

public class RequestApartmentJoinCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();

    private RequestApartmentJoinCommandHandler CreateHandler() =>
        new(_userRepoMock.Object, _apartmentRepoMock.Object);

    [Fact]
    public async Task Handle_ValidRequest_SetsPendingFields()
    {
        // Arrange
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync("apt-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Apartment.Create("soc-001", "101", "A", 1, 2, ["P1"], 500, 600, 700));
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var handler = CreateHandler();
        var command = new RequestApartmentJoinCommand("soc-001", user.Id, "apt-001", ResidentType.Owner);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.PendingApartmentId.Should().Be("apt-001");
        result.Value.PendingResidentType.Should().Be("Owner");
    }

    [Fact]
    public async Task Handle_UserNotFound_ReturnsFailure()
    {
        // Arrange
        _userRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var handler = CreateHandler();
        var command = new RequestApartmentJoinCommand("soc-001", "unknown", "apt-001", ResidentType.Owner);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserNotFound);
    }

    [Fact]
    public async Task Handle_InvalidResidentType_ReturnsValidationFailed()
    {
        // Arrange
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync("apt-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Apartment.Create("soc-001", "101", "A", 1, 2, ["P1"], 500, 600, 700));

        var handler = CreateHandler();
        var command = new RequestApartmentJoinCommand("soc-001", user.Id, "apt-001", ResidentType.FamilyMember);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ValidationFailed);
    }
}

// ─── ApproveApartmentJoinCommandHandler Tests ─────────────────────────────────

public class ApproveApartmentJoinCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();

    private ApproveApartmentJoinCommandHandler CreateHandler() =>
        new(_userRepoMock.Object, _apartmentRepoMock.Object);

    [Fact]
    public async Task Handle_WithPendingRequest_LinksApartmentAndClearsPending()
    {
        // Arrange
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        user.RequestApartmentJoin("apt-001", ResidentType.Owner);

        var apartment = Apartment.Create("soc-001", "101", "A", 1, 2, ["P1"], 500, 600, 700);
        apartment.GetType().GetProperty("Id")?.SetValue(apartment, "apt-001");

        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync("apt-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);
        _apartmentRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment a, CancellationToken _) => a);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var handler = CreateHandler();
        var command = new ApproveApartmentJoinCommand("soc-001", user.Id);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.PendingApartmentId.Should().BeNull();
        result.Value.PendingResidentType.Should().BeNull();
    }

    [Fact]
    public async Task Handle_NoPendingRequest_ReturnsNoPendingApartmentRequest()
    {
        // Arrange
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var handler = CreateHandler();
        var command = new ApproveApartmentJoinCommand("soc-001", user.Id);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.NoPendingApartmentRequest);
    }
}

// ─── DenyApartmentJoinCommandHandler Tests ────────────────────────────────────

public class DenyApartmentJoinCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();

    private DenyApartmentJoinCommandHandler CreateHandler() =>
        new(_userRepoMock.Object);

    [Fact]
    public async Task Handle_WithPendingRequest_ClearsPendingFields()
    {
        // Arrange
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        user.RequestApartmentJoin("apt-001", ResidentType.Owner);

        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var handler = CreateHandler();
        var command = new DenyApartmentJoinCommand("soc-001", user.Id);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.PendingApartmentId.Should().BeNull();
    }

    [Fact]
    public async Task Handle_NoPendingRequest_ReturnsNoPendingApartmentRequest()
    {
        // Arrange
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var handler = CreateHandler();
        var command = new DenyApartmentJoinCommand("soc-001", user.Id);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.NoPendingApartmentRequest);
    }
}

// ─── RequestPhoneLoginOtpCommandHandler Tests ─────────────────────────────────

public class RequestPhoneLoginOtpCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<RequestPhoneLoginOtpCommandHandler>> _loggerMock = new();

    private RequestPhoneLoginOtpCommandHandler CreateHandler() =>
        new(_userRepoMock.Object, _societyRepoMock.Object, _apartmentRepoMock.Object, _notificationMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithUnknownPhone_ReturnsUserNotFound()
    {
        _userRepoMock
            .Setup(r => r.GetByPhoneAcrossSocietiesAsync("+91-9999999999", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[]);

        var handler = CreateHandler();
        var result = await handler.Handle(new RequestPhoneLoginOtpCommand("+91-9999999999"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserNotFound);
        _notificationMock.Verify(n => n.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WithSingleActiveAccount_SendsOtpAndReturnsUserId()
    {
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByPhoneAcrossSocietiesAsync("+91-9876543210", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[user]);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("soc-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Domain.Entities.Society?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new RequestPhoneLoginOtpCommand("+91-9876543210"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.RequiresSelection.Should().BeFalse();
        result.Value!.UserId.Should().Be(user.Id);
        result.Value!.Options.Should().HaveCount(1);
        _notificationMock.Verify(n => n.SendSmsAsync("+91-9876543210", It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithMultipleAccountsAndNoSelection_RequiresSelectionWithoutSendingOtp()
    {
        var user1 = User.Create("soc-001", "Alice", "alice1@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        var user2 = User.Create("soc-002", "Alice", "alice2@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByPhoneAcrossSocietiesAsync("+91-9876543210", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[user1, user2]);
        _societyRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Domain.Entities.Society?)null);

        var handler = CreateHandler();
        var result = await handler.Handle(new RequestPhoneLoginOtpCommand("+91-9876543210"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.RequiresSelection.Should().BeTrue();
        result.Value!.UserId.Should().BeNull();
        result.Value!.Options.Should().HaveCount(2);
        _notificationMock.Verify(n => n.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_InactiveUserPhone_ReturnsUserNotFound()
    {
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        user.Deactivate();
        _userRepoMock
            .Setup(r => r.GetByPhoneAcrossSocietiesAsync("+91-9876543210", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[user]);

        var handler = CreateHandler();
        var result = await handler.Handle(new RequestPhoneLoginOtpCommand("+91-9876543210"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserNotFound);
    }
}

// ─── GetUsersBySocietyQueryHandler search Tests ───────────────────────────────

public class GetUsersBySocietyQueryHandlerSearchTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserServiceMock = new();

    private GetUsersBySocietyQueryHandler CreateHandler()
    {
        _apartmentRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Apartment>)[]);
        return new(_userRepoMock.Object, _apartmentRepoMock.Object, _currentUserServiceMock.Object);
    }

    [Fact]
    public async Task Handle_WithSearchText_FiltersByNameEmailOrPhone()
    {
        var alice = User.Create("soc-001", "Alice Smith", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        var bob = User.Create("soc-001", "Bob Jones", "bob@example.com", "+91-1112223333", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[alice, bob]);

        var handler = CreateHandler();
        var result = await handler.Handle(
            new GetUsersBySocietyQuery("soc-001", new PaginationParams { Page = 1, PageSize = 20 }, null, "alice"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle(u => u.FullName == "Alice Smith");
    }

    [Fact]
    public async Task Handle_ExcludesDeletedUsers()
    {
        var alice = User.Create("soc-001", "Alice Smith", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        alice.MarkDeleted();
        var bob = User.Create("soc-001", "Bob Jones", "bob@example.com", "+91-1112223333", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[alice, bob]);

        var handler = CreateHandler();
        var result = await handler.Handle(
            new GetUsersBySocietyQuery("soc-001", new PaginationParams { Page = 1, PageSize = 20 }, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle();
        result.Value!.Items.Should().NotContain(u => u.FullName == "Alice Smith");
    }
}

// ─── GetUsersBySocietyQueryHandler apartment bulk-fetch Tests ─────────────────
// Locks in the fix: apartments are fetched once for the whole society and mapped to
// users in memory, instead of one (or more) repository round-trips per user.

public class GetUsersBySocietyQueryHandlerApartmentBulkFetchTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserServiceMock = new();

    private GetUsersBySocietyQueryHandler CreateHandler() =>
        new(_userRepoMock.Object, _apartmentRepoMock.Object, _currentUserServiceMock.Object);

    [Fact]
    public async Task Handle_WithMultipleUsers_FetchesApartmentsOnceAndResolvesEachUsersApartmentsFromMemory()
    {
        // userA has an explicit household link (the "linked apartments" path).
        var apt1 = Apartment.Create("soc-001", "101", "A", 1, 2, [], 500, 600, 700);
        var userA = User.Create("soc-001", "Alice Smith", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        userA.LinkApartment(apt1.Id, apt1.ToDisplayLabel(), ResidentType.Owner, makePrimary: true);

        // userB has no household links — resolved via the legacy owner/tenant fallback on the apartment itself.
        var apt2 = Apartment.Create("soc-001", "202", "B", 2, 3, [], 800, 900, 1000);
        var userB = User.Create("soc-001", "Bob Jones", "bob@example.com", "+91-1112223333", UserRole.SUUser, ResidentType.Owner);
        apt2.AssignOwner(userB.Id, userB.FullName);

        _userRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[userA, userB]);
        _apartmentRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Apartment>)[apt1, apt2]);

        var result = await CreateHandler().Handle(
            new GetUsersBySocietyQuery("soc-001", new PaginationParams { Page = 1, PageSize = 20 }, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().HaveCount(2);
        result.Value!.Items.Single(u => u.FullName == "Alice Smith").Apartments.Should().ContainSingle(a => a.ApartmentId == apt1.Id);
        result.Value!.Items.Single(u => u.FullName == "Bob Jones").Apartments.Should().ContainSingle(a => a.ApartmentId == apt2.Id);

        // The whole point of the fix: exactly one bulk fetch, zero per-user round-trips.
        _apartmentRepoMock.Verify(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()), Times.Once);
        _apartmentRepoMock.Verify(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _apartmentRepoMock.Verify(r => r.GetByOwnerAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _apartmentRepoMock.Verify(r => r.GetByTenantAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

// ─── GetUsersBySocietyQueryHandler / GetUserQueryHandler contact-masking Tests ─

public class GetUsersBySocietyQueryHandlerMaskingTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserServiceMock = new();

    private GetUsersBySocietyQueryHandler CreateHandler()
    {
        _apartmentRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Apartment>)[]);
        return new(_userRepoMock.Object, _apartmentRepoMock.Object, _currentUserServiceMock.Object);
    }

    [Fact]
    public async Task Handle_SUUserViewer_MasksOtherResidentsContactInfo()
    {
        var alice = User.Create("soc-001", "Alice Smith", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        var bob = User.Create("soc-001", "Bob Jones", "bob@example.com", "+91-1112223333", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[alice, bob]);
        _currentUserServiceMock.Setup(c => c.UserId).Returns(alice.Id);
        _currentUserServiceMock.Setup(c => c.Role).Returns("SUUser");

        var handler = CreateHandler();
        var result = await handler.Handle(
            new GetUsersBySocietyQuery("soc-001", new PaginationParams { Page = 1, PageSize = 20 }, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var bobResponse = result.Value!.Items.Single(u => u.FullName == "Bob Jones");
        bobResponse.Email.Should().NotBe("bob@example.com");
        bobResponse.Email.Should().Contain("***");
        bobResponse.Phone.Should().NotBe("+91-1112223333");
        bobResponse.Phone.Should().Contain("X");
    }

    [Fact]
    public async Task Handle_SUUserViewer_DoesNotMaskOwnRecord()
    {
        var alice = User.Create("soc-001", "Alice Smith", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[alice]);
        _currentUserServiceMock.Setup(c => c.UserId).Returns(alice.Id);
        _currentUserServiceMock.Setup(c => c.Role).Returns("SUUser");

        var handler = CreateHandler();
        var result = await handler.Handle(
            new GetUsersBySocietyQuery("soc-001", new PaginationParams { Page = 1, PageSize = 20 }, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var aliceResponse = result.Value!.Items.Single();
        aliceResponse.Email.Should().Be("alice@example.com");
        aliceResponse.Phone.Should().Be("+91-9876543210");
    }

    [Theory]
    [InlineData("SUAdmin")]
    [InlineData("SUSecurity")]
    public async Task Handle_AdminOrSecurityViewer_DoesNotMaskAnyResident(string viewerRole)
    {
        var alice = User.Create("soc-001", "Alice Smith", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        var bob = User.Create("soc-001", "Bob Jones", "bob@example.com", "+91-1112223333", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[alice, bob]);
        _currentUserServiceMock.Setup(c => c.UserId).Returns("some-admin-id");
        _currentUserServiceMock.Setup(c => c.Role).Returns(viewerRole);

        var handler = CreateHandler();
        var result = await handler.Handle(
            new GetUsersBySocietyQuery("soc-001", new PaginationParams { Page = 1, PageSize = 20 }, null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().Contain(u => u.Email == "alice@example.com" && u.Phone == "+91-9876543210");
        result.Value!.Items.Should().Contain(u => u.Email == "bob@example.com" && u.Phone == "+91-1112223333");
    }
}

public class GetUserQueryHandlerTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserServiceMock = new();

    private GetUserQueryHandler CreateHandler() =>
        new(_userRepoMock.Object, _apartmentRepoMock.Object, _currentUserServiceMock.Object);

    [Fact]
    public async Task Handle_SUUserViewingOtherResident_ReturnsMaskedContactInfo()
    {
        var bob = User.Create("soc-001", "Bob Jones", "bob@example.com", "+91-1112223333", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(bob.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bob);
        _currentUserServiceMock.Setup(c => c.UserId).Returns("viewer-alice-id");
        _currentUserServiceMock.Setup(c => c.Role).Returns("SUUser");

        var handler = CreateHandler();
        var result = await handler.Handle(new GetUserQuery("soc-001", bob.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Email.Should().Contain("***");
        result.Value!.Phone.Should().Contain("X");
    }

    [Fact]
    public async Task Handle_SUUserViewingOwnRecord_ReturnsUnmaskedContactInfo()
    {
        var alice = User.Create("soc-001", "Alice Smith", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(alice.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(alice);
        _currentUserServiceMock.Setup(c => c.UserId).Returns(alice.Id);
        _currentUserServiceMock.Setup(c => c.Role).Returns("SUUser");

        var handler = CreateHandler();
        var result = await handler.Handle(new GetUserQuery("soc-001", alice.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Email.Should().Be("alice@example.com");
        result.Value!.Phone.Should().Be("+91-9876543210");
    }

    [Fact]
    public async Task Handle_SUAdminViewingResident_ReturnsUnmaskedContactInfo()
    {
        var bob = User.Create("soc-001", "Bob Jones", "bob@example.com", "+91-1112223333", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(bob.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bob);
        _currentUserServiceMock.Setup(c => c.UserId).Returns("admin-id");
        _currentUserServiceMock.Setup(c => c.Role).Returns("SUAdmin");

        var handler = CreateHandler();
        var result = await handler.Handle(new GetUserQuery("soc-001", bob.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Email.Should().Be("bob@example.com");
        result.Value!.Phone.Should().Be("+91-1112223333");
    }
}

// ─── DeleteUserCommandHandler Tests ────────────────────────────────────────────

public class DeleteUserCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IMaintenanceChargeRepository> _chargeRepoMock = new();
    private readonly Mock<ILogger<DeleteUserCommandHandler>> _loggerMock = new();

    private DeleteUserCommandHandler CreateHandler() =>
        new(_userRepoMock.Object, _chargeRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_UserWithNoApartmentMapping_Succeeds()
    {
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteUserCommand("soc-001", user.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        user.IsDeleted.Should().BeTrue();
        _chargeRepoMock.Verify(r => r.GetByApartmentAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>(), null, null, It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_UserWithPendingDues_ReturnsUserHasPendingDues()
    {
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        user.LinkApartment("apt-001", "A-101", ResidentType.Owner, makePrimary: true);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var now = DateTime.UtcNow;
        var pendingCharge = MaintenanceCharge.Create("soc-001", "apt-001", "sched-1", "Monthly", 1000m, new DateTime(now.Year, now.Month, 5, 0, 0, 0, DateTimeKind.Utc));
        _chargeRepoMock
            .Setup(r => r.GetByApartmentAsync("soc-001", "apt-001", 1, int.MaxValue, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<MaintenanceCharge>)[pendingCharge]);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteUserCommand("soc-001", user.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserHasPendingDues);
        user.IsDeleted.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_UserWithApartmentButDuesCleared_ReturnsUserHasApartmentMapping()
    {
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        user.LinkApartment("apt-001", "A-101", ResidentType.Owner, makePrimary: true);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _chargeRepoMock
            .Setup(r => r.GetByApartmentAsync("soc-001", "apt-001", 1, int.MaxValue, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<MaintenanceCharge>)[]);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteUserCommand("soc-001", user.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserHasApartmentMapping);
        user.IsDeleted.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_AlreadyDeletedUser_ReturnsUserNotFound()
    {
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        user.MarkDeleted();
        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var handler = CreateHandler();
        var result = await handler.Handle(new DeleteUserCommand("soc-001", user.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserNotFound);
    }
}
