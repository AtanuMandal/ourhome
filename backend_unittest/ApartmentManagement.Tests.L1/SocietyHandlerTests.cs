using ApartmentManagement.Application.Commands.Society;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.Society;
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

public class DeactivateSocietyCommandHandlerTests
{
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<ILogger<DeactivateSocietyCommandHandler>> _loggerMock = new();

    private DeactivateSocietyCommandHandler CreateHandler() =>
        new(_societyRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenSocietyExists_DeactivatesAndReturnsSuccess()
    {
        // Arrange
        var address = new Address("123 Main St", "Mumbai", "Maharashtra", "400001", "India");
        var society = Society.Create("GV", address, "admin@gv.com", "+91-9876543210", 2, 40);
        society.Activate();
        var societyId = society.Id;

        _societyRepoMock
            .Setup(r => r.GetByIdAsync(societyId, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _societyRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society s, CancellationToken _) => s);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(new DeactivateSocietyCommand(societyId), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _societyRepoMock.Verify(r => r.UpdateAsync(
            It.Is<Society>(s => s.Id == societyId && s.Status == SocietyStatus.Inactive), It.IsAny<CancellationToken>()), Times.Once);
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
        var result = await handler.Handle(new DeactivateSocietyCommand("non-existent"), CancellationToken.None);

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

    [Fact]
    public async Task Handle_HQAdminWithNoRecordInSociety_Succeeds()
    {
        // Arrange — HQAdmin's own user record lives in the "hq" partition, not this society, so the
        // actor lookup in this society's partition will find nothing; the JWT role must still let them through.
        var address = new Address("123 Main St", "Mumbai", "Maharashtra", "400001", "India");
        var society = Society.Create("GV", address, "admin@gv.com", "+91-9876543210", 2, 40);
        _currentUserServiceMock.Setup(s => s.UserId).Returns("hq-admin-id");
        _currentUserServiceMock.Setup(s => s.Role).Returns("HQAdmin");
        _userRepoMock
            .Setup(r => r.GetByIdAsync("hq-admin-id", society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _societyRepoMock
            .Setup(r => r.GetByIdAsync(society.Id, society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _societyRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society s, CancellationToken _) => s);

        var handler = CreateHandler();
        var command = CommandWithCommittees(society.Id, []);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_NoRecognizedActorInSociety_ReturnsForbidden()
    {
        // Arrange
        var address = new Address("123 Main St", "Mumbai", "Maharashtra", "400001", "India");
        var society = Society.Create("GV", address, "admin@gv.com", "+91-9876543210", 2, 40);
        _currentUserServiceMock.Setup(s => s.UserId).Returns("unknown-id");
        _userRepoMock
            .Setup(r => r.GetByIdAsync("unknown-id", society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var handler = CreateHandler();
        var command = CommandWithCommittees(society.Id, []);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Forbidden);
    }

    [Fact]
    public async Task Handle_HQAdminUpdatingAddressOnly_UpdatesAddressAndPreservesExistingCommittees()
    {
        // Arrange — HQAdmin manages name/address/contact only, never the society's admin user or
        // committee governance; omitting SocietyUsers/Committees on the request must not wipe them out.
        var address = new Address("123 Main St", "Mumbai", "Maharashtra", "400001", "India");
        var society = Society.Create("GV", address, "admin@gv.com", "+91-9876543210", 2, 40);
        var existingMember = new Society.SocietyUserReference("u1", "Bob Jones", "bob@gv.com", "Chairman");
        society.UpdateLeadership([existingMember], [new Society.SocietyCommittee("Managing Committee", [existingMember])]);

        _currentUserServiceMock.Setup(s => s.UserId).Returns("hq-admin-id");
        _currentUserServiceMock.Setup(s => s.Role).Returns("HQAdmin");
        _societyRepoMock
            .Setup(r => r.GetByIdAsync(society.Id, society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _societyRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society s, CancellationToken _) => s);

        var handler = CreateHandler();
        var command = new UpdateSocietyCommand(
            society.Id, "GV", "admin@gv.com", "+91-9876543210", 2, 40, 7,
            SocietyUsers: null, Committees: null,
            Street: "99 New Street", City: "Pune", State: "Maharashtra", PostalCode: "411001", Country: "India");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Address.City.Should().Be("Pune");
        result.Value.Committees.Should().ContainSingle(c => c.Name == "Managing Committee");
        result.Value.SocietyUsers.Should().ContainSingle(u => u.Email == "bob@gv.com");
        _userRepoMock.Verify(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

public class GetSocietySummaryReportQueryHandlerTests
{
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();

    private GetSocietySummaryReportQueryHandler CreateHandler() =>
        new(_societyRepoMock.Object, _apartmentRepoMock.Object, _userRepoMock.Object);

    [Fact]
    public async Task Handle_ReturnsApartmentAndResidentCountsWithNoFinancialData()
    {
        // Arrange
        var address = new Address("123 Main St", "Mumbai", "Maharashtra", "400001", "India");
        var society = Society.Create("GV", address, "admin@gv.com", "+91-9876543210", 2, 40);
        society.Activate();

        var apt1 = Apartment.Create(society.Id, "101", "A", 1, 2, [], 500, 600, 700);
        var apt2 = Apartment.Create(society.Id, "102", "A", 1, 2, [], 500, 600, 700);
        var apt3 = Apartment.Create(society.Id, "103", "A", 1, 2, [], 500, 600, 700);
        apt3.MarkUnderMaintenance();

        var owner = User.Create(society.Id, "Owner", "owner@gv.com", "+91-9000000001", UserRole.SUUser, ResidentType.Owner);
        var tenant = User.Create(society.Id, "Tenant", "tenant@gv.com", "+91-9000000002", UserRole.SUUser, ResidentType.Tenant);
        var security = User.Create(society.Id, "Guard", "guard@gv.com", "+91-9000000003", UserRole.SUSecurity, ResidentType.SocietyAdmin);

        _societyRepoMock
            .Setup(r => r.GetByIdAsync(society.Id, society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _apartmentRepoMock
            .Setup(r => r.GetAllAsync(society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Apartment>)[apt1, apt2, apt3]);
        _userRepoMock
            .Setup(r => r.GetAllAsync(society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[owner, tenant, security]);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(new GetSocietySummaryReportQuery(society.Id), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.TotalApartments.Should().Be(3);
        result.Value!.UnderMaintenanceApartments.Should().Be(1);
        result.Value!.OwnerCount.Should().Be(1);
        result.Value!.TenantCount.Should().Be(1);
        result.Value!.TotalResidents.Should().Be(2);
    }

    [Fact]
    public async Task Handle_WhenSocietyNotFound_ReturnsFailure()
    {
        _societyRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society?)null);

        var handler = CreateHandler();

        var result = await handler.Handle(new GetSocietySummaryReportQuery("missing"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.SocietyNotFound);
    }
}
