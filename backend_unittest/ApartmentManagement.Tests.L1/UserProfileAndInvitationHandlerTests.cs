using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.User;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Shared.Constants;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

// ─── UploadUserProfilePictureCommandHandler Tests ──────────────────────────────

public class UploadUserProfilePictureCommandHandlerTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IFileStorageService> _fileStorageMock = new();
    private readonly Mock<ILogger<UploadUserProfilePictureCommandHandler>> _loggerMock = new();

    private UploadUserProfilePictureCommandHandler CreateHandler() =>
        new(_userRepoMock.Object, _fileStorageMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_ValidUpload_StoresBlobAndSetsProfilePictureUrl()
    {
        // Arrange
        var user = User.Create("soc-001", "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(user.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _fileStorageMock
            .Setup(f => f.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(), "image/jpeg", "profile-pictures", It.IsAny<CancellationToken>()))
            .ReturnsAsync("ignored");

        var handler = CreateHandler();
        var command = new UploadUserProfilePictureCommand("soc-001", user.Id, "me.jpg", "image/jpeg", [1, 2, 3]);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.ProfilePictureUrl.Should().StartWith("files/profile-pictures/soc-001/");
        user.ProfilePictureUrl.Should().Be(result.Value.ProfilePictureUrl);
        _fileStorageMock.Verify(f => f.UploadAsync(It.IsAny<Stream>(), It.IsAny<string>(), "image/jpeg", "profile-pictures", It.IsAny<CancellationToken>()), Times.Once);
        _userRepoMock.Verify(r => r.UpdateAsync(user, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_UnknownUser_ReturnsUserNotFound()
    {
        // Arrange
        _userRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var handler = CreateHandler();
        var command = new UploadUserProfilePictureCommand("soc-001", "missing", "me.jpg", "image/jpeg", [1]);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserNotFound);
    }
}

// ─── ShareInviteLink to an existing account → dashboard invitation ─────────────

public class ShareInviteLinkExistingUserTests
{
    private readonly Mock<IAuthService> _authServiceMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<ShareInviteLinkCommandHandler>> _loggerMock = new();

    private ShareInviteLinkCommandHandler CreateHandler() =>
        new(_authServiceMock.Object, _societyRepoMock.Object, _userRepoMock.Object,
            _apartmentRepoMock.Object, _notificationMock.Object, _loggerMock.Object);

    private static Society CreateSociety() =>
        Society.Create("Green Valley", new Address("1 Main St", "Mumbai", "MH", "400001", "India"),
            "admin@gv.com", "+91-9876543210", 1, 10);

    [Fact]
    public async Task Handle_ExistingUserWithApartmentLink_SetsPendingInvitationAndEmailsLoginLink()
    {
        // Arrange
        var society = CreateSociety();
        var invited = User.Create(society.Id, "Bob Jones", "bob@example.com", "+91-9111111111", UserRole.SUUser, ResidentType.Owner);
        var apartment = Apartment.Create(society.Id, "101", "A", 1, 2, ["P1"], 500, 600, 700);
        apartment.GetType().GetProperty("Id")?.SetValue(apartment, "apt-001");
        apartment.AssignOwner("owner-1", "Existing Owner");

        _societyRepoMock
            .Setup(r => r.GetByIdAsync(society.Id, society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _userRepoMock
            .Setup(r => r.GetByEmailAsync(society.Id, "bob@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(invited);
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync("apt-001", society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        string? sentTo = null, sentBody = null;
        _notificationMock
            .Setup(n => n.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<string, string, string, CancellationToken>((to, _, body, _) => { sentTo = to; sentBody = body; })
            .Returns(Task.CompletedTask);

        var handler = CreateHandler();
        var command = new ShareInviteLinkCommand(society.Id, "apt-001", "bob@example.com", "https://app.example.com");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert — the invited existing user gets a dashboard invitation, and the email links
        // straight to login with the address prepopulated (not to registration).
        result.IsSuccess.Should().BeTrue();
        invited.PendingApartmentId.Should().Be("apt-001");
        invited.PendingResidentType.Should().Be(ResidentType.FamilyMember.ToString());
        sentTo.Should().Be("bob@example.com");
        sentBody.Should().Contain("https://app.example.com/auth/login?email=bob%40example.com");
        _authServiceMock.Verify(a => a.GenerateInviteTokenAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_ExistingUserAlreadyOnApartment_ReturnsConflict()
    {
        // Arrange
        var society = CreateSociety();
        var invited = User.Create(society.Id, "Bob Jones", "bob@example.com", "+91-9111111111", UserRole.SUUser, ResidentType.Owner);
        var apartment = Apartment.Create(society.Id, "101", "A", 1, 2, ["P1"], 500, 600, 700);
        apartment.GetType().GetProperty("Id")?.SetValue(apartment, "apt-001");
        apartment.AssignOwner(invited.Id, invited.FullName);

        _societyRepoMock
            .Setup(r => r.GetByIdAsync(society.Id, society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _userRepoMock
            .Setup(r => r.GetByEmailAsync(society.Id, "bob@example.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(invited);
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync("apt-001", society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);

        var handler = CreateHandler();
        var command = new ShareInviteLinkCommand(society.Id, "apt-001", "bob@example.com", "https://app.example.com");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Conflict);
    }
}

// ─── Per-apartment user cap enforcement ────────────────────────────────────────

public class ApartmentUserCapEnforcementTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserServiceMock = new();
    private readonly Mock<ILogger<AddHouseholdMemberCommandHandler>> _loggerMock = new();

    private AddHouseholdMemberCommandHandler CreateHandler() =>
        new(_userRepoMock.Object, _apartmentRepoMock.Object, _societyRepoMock.Object,
            _currentUserServiceMock.Object, _loggerMock.Object);

    private (Society society, User owner, Apartment apartment) Seed(int? cap = null)
    {
        var society = Society.Create("GV", new Address("1 Main St", "Mumbai", "MH", "400001", "India"),
            "admin@gv.com", "+91-9876543210", 1, 10);
        if (cap.HasValue) society.SetMaxUsersPerApartment(cap.Value);

        var owner = User.Create(society.Id, "Owner", "owner@gv.com", "+91-9000000000", UserRole.SUUser, ResidentType.Owner);
        var apartment = Apartment.Create(society.Id, "101", "A", 1, 2, ["P1"], 500, 600, 700);
        apartment.GetType().GetProperty("Id")?.SetValue(apartment, "apt-001");
        apartment.AssignOwner(owner.Id, owner.FullName);

        _currentUserServiceMock.Setup(s => s.UserId).Returns(owner.Id);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(owner.Id, society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(owner);
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync("apt-001", society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);
        _societyRepoMock
            .Setup(r => r.GetByIdAsync(society.Id, society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);

        return (society, owner, apartment);
    }

    [Fact]
    public async Task Handle_ApartmentAtSocietyUserCap_ReturnsApartmentUserCapReached()
    {
        // Arrange — society caps each apartment at 1 user; the apartment already has its owner.
        var (society, _, _) = Seed(cap: 1);

        var handler = CreateHandler();
        var command = new AddHouseholdMemberCommand(society.Id, "apt-001", "Kid", "kid@gv.com", "+91-9222222222", ResidentType.FamilyMember);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ApartmentUserCapReached);
        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_ApartmentBelowCap_AddsHouseholdMember()
    {
        // Arrange — default cap (10) with a single existing resident.
        var (society, _, _) = Seed();

        _userRepoMock
            .Setup(r => r.GetByEmailAsync(society.Id, "kid@gv.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _userRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _apartmentRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment a, CancellationToken _) => a);

        var handler = CreateHandler();
        var command = new AddHouseholdMemberCommand(society.Id, "apt-001", "Kid", "kid@gv.com", "+91-9222222222", ResidentType.FamilyMember);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
