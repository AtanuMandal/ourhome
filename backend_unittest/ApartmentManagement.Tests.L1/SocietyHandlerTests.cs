using ApartmentManagement.Application.Commands.Society;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Shared.Constants;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class CreateSocietyCommandHandlerTests
{
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<ILogger<CreateSocietyCommandHandler>> _loggerMock = new();

    private CreateSocietyCommandHandler CreateHandler() =>
        new(_societyRepoMock.Object, _userRepoMock.Object, _eventPublisherMock.Object, _loggerMock.Object);

    private static CreateSocietyCommand ValidCommand() => new(
        "Green Valley", "123 Main St", "Mumbai", "Maharashtra", "400001", "India",
        "admin@gv.com", "+91-9876543210", 3, 60,
        "Raj Kumar", "raj@gv.com", "+91-9000000001");

    [Fact]
    public async Task Handle_WithValidCommand_CreatesSocietyAndReturnsSuccess()
    {
        // Arrange
        _societyRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society s, CancellationToken _) => s);
        _userRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _societyRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society s, CancellationToken _) => s);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(ValidCommand(), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value!.Society.Id.Should().NotBeNullOrEmpty();
        result.Value!.Admin.Id.Should().NotBeNullOrEmpty();
        _societyRepoMock.Verify(r => r.CreateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()), Times.Once);
        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenRepositoryThrows_ReturnsFailureResult()
    {
        // Arrange
        _societyRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(ValidCommand(), CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.InternalError);
    }
}

public class PublishSocietyCommandHandlerTests
{
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<ILogger<PublishSocietyCommandHandler>> _loggerMock = new();

    private PublishSocietyCommandHandler CreateHandler() =>
        new(_societyRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenSocietyExists_ActivatesAndReturnsSuccess()
    {
        // Arrange
        var address = new Address("123 Main St", "Mumbai", "Maharashtra", "400001", "India");
        var society = Society.Create("GV", address, "admin@gv.com", "+91-9876543210", 2, 40);
        var societyId = society.Id;

        _societyRepoMock
            .Setup(r => r.GetByIdAsync(societyId, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _societyRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society s, CancellationToken _) => s);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(new PublishSocietyCommand(societyId), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _societyRepoMock.Verify(r => r.UpdateAsync(It.Is<Society>(s => s.Id == societyId), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenSocietyNotFound_ReturnsFailure()
    {
        // Arrange
        _societyRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society?)null);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(new PublishSocietyCommand("non-existent"), CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.SocietyNotFound);
    }
}

// ─── UpdateSocietyCommandHandler committee validation Tests ────────────────────

public class UpdateSocietyCommandHandlerCommitteeTests
{
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserServiceMock = new();
    private readonly Mock<ILogger<UpdateSocietyCommandHandler>> _loggerMock = new();

    private UpdateSocietyCommandHandler CreateHandler() =>
        new(_societyRepoMock.Object, _userRepoMock.Object, _currentUserServiceMock.Object, _loggerMock.Object);

    private (Society society, User admin) SeedSociety()
    {
        var address = new Address("123 Main St", "Mumbai", "Maharashtra", "400001", "India");
        var society = Society.Create("GV", address, "admin@gv.com", "+91-9876543210", 2, 40);
        var admin = User.Create(society.Id, "Admin", "admin@gv.com", "+91-9000000000", UserRole.SUAdmin, ResidentType.SocietyAdmin);

        _currentUserServiceMock.Setup(s => s.UserId).Returns(admin.Id);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(admin.Id, society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(admin);
        _societyRepoMock
            .Setup(r => r.GetByIdAsync(society.Id, society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _societyRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society s, CancellationToken _) => s);

        return (society, admin);
    }

    private static UpdateSocietyCommand CommandWithCommittees(string societyId, IReadOnlyList<SocietyCommitteeRequest> committees) => new(
        societyId, "GV", "admin@gv.com", "+91-9876543210", 2, 40, 5, [], committees);

    [Fact]
    public async Task Handle_SameUserAcrossTwoCommittees_ReturnsUserAlreadyOnCommittee()
    {
        // Arrange
        var (society, _) = SeedSociety();
        var bob = User.Create(society.Id, "Bob Jones", "bob@gv.com", "+91-9111111111", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByEmailAsync(society.Id, "bob@gv.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bob);

        var command = CommandWithCommittees(society.Id, [
            new SocietyCommitteeRequest("Managing Committee", [new SocietyUserAssignmentRequest("bob@gv.com", "Chairman")]),
            new SocietyCommitteeRequest("Cultural Committee", [new SocietyUserAssignmentRequest("bob@gv.com", "Coordinator")]),
        ]);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.UserAlreadyOnCommittee);
        _societyRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_DistinctUsersAcrossCommittees_Succeeds()
    {
        // Arrange
        var (society, _) = SeedSociety();
        var bob = User.Create(society.Id, "Bob Jones", "bob@gv.com", "+91-9111111111", UserRole.SUUser, ResidentType.Owner);
        var carol = User.Create(society.Id, "Carol White", "carol@gv.com", "+91-9222222222", UserRole.SUUser, ResidentType.Owner);
        _userRepoMock
            .Setup(r => r.GetByEmailAsync(society.Id, "bob@gv.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bob);
        _userRepoMock
            .Setup(r => r.GetByEmailAsync(society.Id, "carol@gv.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(carol);

        var command = CommandWithCommittees(society.Id, [
            new SocietyCommitteeRequest("Managing Committee", [new SocietyUserAssignmentRequest("bob@gv.com", "Chairman")]),
            new SocietyCommitteeRequest("Cultural Committee", [new SocietyUserAssignmentRequest("carol@gv.com", "Coordinator")]),
        ]);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Committees.Should().HaveCount(2);
    }
}
