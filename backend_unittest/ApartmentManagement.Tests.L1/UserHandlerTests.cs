using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.User;
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
