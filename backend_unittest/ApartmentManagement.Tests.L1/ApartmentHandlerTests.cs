using ApartmentManagement.Application.Commands.Apartment;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.Apartment;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class CreateApartmentCommandHandlerTests
{
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserServiceMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<ILogger<CreateApartmentCommandHandler>> _loggerMock = new();

    private CreateApartmentCommandHandler CreateHandler() =>
        new(
            _apartmentRepoMock.Object,
            _userRepoMock.Object,
            _societyRepoMock.Object,
            _currentUserServiceMock.Object,
            _eventPublisherMock.Object,
            _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidCommand_CreatesApartmentAndReturnsSuccess()
    {
        var societyId = "society-001";

        _apartmentRepoMock
            .Setup(r => r.GetByLocationAsync(societyId, "A", "A101", 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment?)null);
        _apartmentRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment apartment, CancellationToken _) => apartment);
        _apartmentRepoMock
            .Setup(r => r.CountBySocietyAsync(societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        var handler = CreateHandler();
        var command = new CreateApartmentCommand(societyId, "A101", "A", 1, 3, ["P1"], null, 500, 600, 700);

        var result = await handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value!.Status.Should().Be("Available");
        _apartmentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenApartmentLocationExists_ReturnsFailure()
    {
        var societyId = "society-001";
        var existingApartment = Apartment.Create(societyId, "A101", "B", 2, 3, [], 500, 600, 700);

        _apartmentRepoMock
            .Setup(r => r.GetByLocationAsync(societyId, "B", "A101", 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingApartment);

        var handler = CreateHandler();
        var command = new CreateApartmentCommand(societyId, "A101", "B", 2, 4, ["P2"], null, 500, 600, 700);

        var result = await handler.Handle(command, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ApartmentNumberDuplicate);
        _apartmentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WithInitialTenantDetails_CreatesResidentAndReturnsOccupiedApartment()
    {
        var societyId = "society-001";
        _currentUserServiceMock.SetupGet(s => s.UserId).Returns("admin-001");

        _apartmentRepoMock
            .Setup(r => r.GetByLocationAsync(societyId, "A", "A102", 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment?)null);
        _apartmentRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment apartment, CancellationToken _) => apartment);
        _apartmentRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment apartment, CancellationToken _) => apartment);
        _apartmentRepoMock
            .Setup(r => r.CountBySocietyAsync(societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);
        _userRepoMock
            .Setup(r => r.GetByEmailAsync(societyId, "tenant@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);
        _userRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User user, CancellationToken _) => user);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User user, CancellationToken _) => user);

        var handler = CreateHandler();
        var command = new CreateApartmentCommand(
            societyId,
            "A102",
            "A",
            1,
            3,
            ["P2"],
            null,
            500,
            600,
            700,
            new CreateApartmentResidentRequest("Tina Tenant", "tenant@test.com", "+91-9999999999", ResidentType.Tenant));

        var result = await handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("Occupied");
        result.Value.Residents.Should().ContainSingle(r => r.ResidentType == "Tenant" && r.UserName == "Tina Tenant");
        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenApartmentCountExceedsSocietyTotal_UpdatesSocietyCapacity()
    {
        var societyId = "society-001";
        var society = Society.Create(
            "Green Valley",
            new Address("123 Main St", "Mumbai", "Maharashtra", "400001", "India"),
            "admin@gv.com",
            "+91-9876543210",
            2,
            1);

        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(society, societyId);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.SocietyId))!.SetValue(society, societyId);

        _apartmentRepoMock
            .Setup(r => r.GetByLocationAsync(societyId, "A", "A103", 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment?)null);
        _apartmentRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment apartment, CancellationToken _) => apartment);
        _apartmentRepoMock
            .Setup(r => r.CountBySocietyAsync(societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);
        _societyRepoMock
            .Setup(r => r.GetByIdAsync(societyId, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _societyRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society updated, CancellationToken _) => updated);

        var handler = CreateHandler();
        var command = new CreateApartmentCommand(societyId, "A103", "A", 1, 3, ["P3"], null, 500, 600, 700);

        var result = await handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _societyRepoMock.Verify(
            r => r.UpdateAsync(It.Is<Society>(updated => updated.TotalApartments == 3), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_WhenOwnerAndInitialResidentBothProvided_ReturnsValidationFailure()
    {
        var societyId = "society-001";
        var command = new CreateApartmentCommand(
            societyId,
            "A104",
            "A",
            1,
            3,
            ["P4"],
            "owner-001",
            500,
            600,
            700,
            new CreateApartmentResidentRequest("Owner Resident", "owner@test.com", "+91-9000000000", ResidentType.Owner));

        var result = await CreateHandler().Handle(command, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ValidationFailed);
        _apartmentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WithExistingOwnerId_AssignsOwnerAndReturnsOccupiedApartment()
    {
        var societyId = "society-001";
        var owner = User.Create(
            societyId,
            "Owner Resident",
            "owner@test.com",
            "+91-9111111111",
            UserRole.SUUser,
            ResidentType.Owner);

        _apartmentRepoMock
            .Setup(r => r.GetByLocationAsync(societyId, "A", "A105", 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment?)null);
        _apartmentRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment apartment, CancellationToken _) => apartment);
        _apartmentRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment apartment, CancellationToken _) => apartment);
        _apartmentRepoMock
            .Setup(r => r.CountBySocietyAsync(societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(owner.Id, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(owner);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User user, CancellationToken _) => user);

        var command = new CreateApartmentCommand(societyId, "A105", "A", 1, 3, ["P5"], owner.Id, 500, 600, 700);

        var result = await CreateHandler().Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("Occupied");
        result.Value.Residents.Should().ContainSingle(r => r.ResidentType == "Owner" && r.UserId == owner.Id);
    }
}

public class UpdateApartmentCommandHandlerTests
{
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ILogger<UpdateApartmentCommandHandler>> _loggerMock = new();

    private UpdateApartmentCommandHandler CreateHandler() =>
        new(_apartmentRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenAnotherApartmentAlreadyUsesSameLocation_ReturnsFailure()
    {
        var societyId = "society-001";
        var apartment = Apartment.Create(societyId, "A101", "A", 1, 3, [], 500, 600, 700);
        var conflictingApartment = Apartment.Create(societyId, "A101", "B", 2, 3, [], 500, 600, 700);

        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(apartment.Id, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);
        _apartmentRepoMock
            .Setup(r => r.GetByLocationAsync(societyId, "B", "A101", 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(conflictingApartment);

        var result = await CreateHandler().Handle(
            new UpdateApartmentCommand(societyId, apartment.Id, "B", 2, 4, ["P2"], 500, 600, 700),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ApartmentNumberDuplicate);
        _apartmentRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

public class DeleteApartmentCommandHandlerTests
{
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ILogger<DeleteApartmentCommandHandler>> _loggerMock = new();

    private DeleteApartmentCommandHandler CreateHandler() =>
        new(_apartmentRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenApartmentExistsAndVacant_DeletesAndReturnsSuccess()
    {
        var apartment = Apartment.Create("society-001", "A101", "A", 1, 3, [], 500, 600, 700);
        var apartmentId = apartment.Id;

        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(apartmentId, "society-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);

        var result = await CreateHandler().Handle(new DeleteApartmentCommand("society-001", apartmentId), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _apartmentRepoMock.Verify(r => r.DeleteAsync(apartmentId, "society-001", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenApartmentOccupied_ReturnsFailure()
    {
        var apartment = Apartment.Create("society-001", "A101", "A", 1, 3, [], 500, 600, 700);
        apartment.AssignOwner("user-001");

        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(apartment.Id, "society-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);

        var result = await CreateHandler().Handle(new DeleteApartmentCommand("society-001", apartment.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ApartmentOccupied);
    }
}

public class BulkImportApartmentsCommandHandlerTests
{
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<ILogger<BulkImportApartmentsCommandHandler>> _loggerMock = new();

    private BulkImportApartmentsCommandHandler CreateHandler() =>
        new(
            _apartmentRepoMock.Object,
            _userRepoMock.Object,
            _societyRepoMock.Object,
            _eventPublisherMock.Object,
            _loggerMock.Object);

    [Fact]
    public async Task Handle_WithAllNewApartments_SucceedsForAll()
    {
        // Arrange
        var societyId = "soc-001";

        _apartmentRepoMock
            .Setup(r => r.GetByLocationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment?)null);
        _apartmentRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment a, CancellationToken _) => a);

        var handler = CreateHandler();
        var apartments = new List<CreateApartmentRequest>
        {
            new("A101", "A", 1, 3,["P1"], null, 500, 600, 700),
            new("A102", "A", 1, 3,["P2"], null, 500, 600, 700)
        };
        var command = new BulkImportApartmentsCommand(societyId, apartments);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Succeeded.Should().Be(2);
        result.Value!.Failed.Should().Be(0);
        _eventPublisherMock.Verify(
            p => p.PublishAsync(It.IsAny<ApartmentManagement.Domain.Events.IDomainEvent>(), It.IsAny<CancellationToken>()),
            Times.Exactly(2));
    }
        

    [Fact]
    public async Task Handle_WithDuplicateApartmentLocations_ReturnsFailures()
    {
        var societyId = "soc-001";
        var existing = Apartment.Create(societyId, "A101", "A", 1, 3, [], 500, 600, 700);

        _apartmentRepoMock
            .Setup(r => r.GetByLocationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var apartments = new List<CreateApartmentRequest>
        {
            new("A101", "A", 1, 3, ["P1"], null, 500, 600, 700),
            new("A101", "A", 1, 4, ["P2"], null, 500, 600, 700),
        };

        var result = await CreateHandler().Handle(new BulkImportApartmentsCommand(societyId, apartments), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Succeeded.Should().Be(0);
        result.Value.Failed.Should().Be(2);
        result.Value.Errors.Should().OnlyContain(error => error.Contains("already exists in this society"));
    }
}

public class GetApartmentsBySocietyQueryHandlerTests
{
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();

    private GetApartmentsBySocietyQueryHandler CreateHandler() =>
        new(_apartmentRepoMock.Object);

    [Fact]
    public async Task Handle_WithoutFilters_ReturnsAllApartments()
    {
        var societyId = "society-001";
        var apartments = new List<Apartment>
        {
            Apartment.Create(societyId, "A101", "A", 1, 3, ["P1"], 500, 600, 700),
            Apartment.Create(societyId, "A102", "A", 1, 2, ["P2"], 400, 500, 600)
        };

        _apartmentRepoMock
            .Setup(r => r.GetAllAsync(societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartments);

        var query = new GetApartmentsBySocietyQuery(societyId, new PaginationParams { Page = 1, PageSize = 20 }, null, null);

        var result = await CreateHandler().Handle(query, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().HaveCount(2);
        result.Value.Items.Select(a => a.ApartmentNumber).Should().Contain(new[] { "A101", "A102" });
        result.Value.Items.SelectMany(a => a.ParkingSlots).Should().Contain(new[] { "P1", "P2" });
    }

    [Fact]
    public async Task Handle_WithBlockFilter_ReturnsOnlyMatchingApartments()
    {
        var societyId = "society-001";
        var apartments = new List<Apartment>
        {
            Apartment.Create(societyId, "A101", "A", 1, 3, [], 500, 600, 700),
            Apartment.Create(societyId, "B101", "B", 1, 3, [], 500, 600, 700)
        };

        _apartmentRepoMock
            .Setup(r => r.GetAllAsync(societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartments);

        var query = new GetApartmentsBySocietyQuery(societyId, new PaginationParams { Page = 1, PageSize = 20 }, null, "b");

        var result = await CreateHandler().Handle(query, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle();
        result.Value.Items[0].ApartmentNumber.Should().Be("B101");
    }

    [Fact]
    public async Task Handle_WithStatusFilter_UsesStatusRepositoryAndReturnsFilteredApartments()
    {
        var societyId = "society-001";
        var apartment = Apartment.Create(societyId, "M101", "M", 1, 3, ["PM1"], 500, 600, 700);
        apartment.MarkUnderMaintenance();

        _apartmentRepoMock
            .Setup(r => r.GetByStatusAsync(societyId, ApartmentStatus.UnderMaintenance, 1, 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Apartment> { apartment });

        var query = new GetApartmentsBySocietyQuery(
            societyId,
            new PaginationParams { Page = 1, PageSize = 20 },
            ApartmentStatus.UnderMaintenance,
            null);

        var result = await CreateHandler().Handle(query, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle();
        result.Value.Items[0].Status.Should().Be("UnderMaintenance");
        _apartmentRepoMock.Verify(r => r.GetAllAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
