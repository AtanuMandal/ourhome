using ApartmentManagement.Application.Commands.Apartment;
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

public class CreateApartmentCommandHandlerTests
{
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<ILogger<CreateApartmentCommandHandler>> _loggerMock = new();

    private CreateApartmentCommandHandler CreateHandler() =>
        new(_apartmentRepoMock.Object, _eventPublisherMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidCommand_CreatesApartmentAndReturnsSuccess()
    {
        // Arrange
        var societyId = "society-001";
        _apartmentRepoMock
            .Setup(r => r.GetByUnitNumberAsync(societyId, "A", "A101", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment?)null);
        _apartmentRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment a, CancellationToken _) => a);

        var handler = CreateHandler();
        var command = new CreateApartmentCommand(societyId, "A101", "A", 1, 3, 1, null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        _apartmentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenApartmentNumberDuplicate_ReturnsFailure()
    {
        // Arrange
        var societyId = "society-001";
        var existingApt = Apartment.Create(societyId, "A101", "A", 1, 3, 0);

        _apartmentRepoMock
            .Setup(r => r.GetByUnitNumberAsync(societyId, "A", "A101", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingApt);

        var handler = CreateHandler();
        var command = new CreateApartmentCommand(societyId, "A101", "A", 1, 3, 1, null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ApartmentNumberDuplicate);
        _apartmentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenRepositoryThrows_ReturnsInternalError()
    {
        // Arrange
        _apartmentRepoMock
            .Setup(r => r.GetByUnitNumberAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("DB error"));

        var handler = CreateHandler();
        var command = new CreateApartmentCommand("soc-001", "A101", "A", 1, 3, 1, null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.InternalError);
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
        // Arrange
        var apartment = Apartment.Create("society-001", "A101", "A", 1, 3, 0);
        var aptId = apartment.Id;

        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(aptId, "society-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(new DeleteApartmentCommand("society-001", aptId), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _apartmentRepoMock.Verify(r => r.DeleteAsync(aptId, "society-001", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenApartmentOccupied_ReturnsFailure()
    {
        // Arrange
        var apartment = Apartment.Create("society-001", "A101", "A", 1, 3, 0);
        apartment.AssignOwner("user-001");
        var aptId = apartment.Id;

        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(aptId, "society-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(new DeleteApartmentCommand("society-001", aptId), CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ApartmentOccupied);
    }

    [Fact]
    public async Task Handle_WhenApartmentNotFound_ReturnsFailure()
    {
        // Arrange
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment?)null);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(new DeleteApartmentCommand("society-001", "invalid-apt"), CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ApartmentNotFound);
    }
}

public class BulkImportApartmentsCommandHandlerTests
{
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ILogger<BulkImportApartmentsCommandHandler>> _loggerMock = new();

    private BulkImportApartmentsCommandHandler CreateHandler() =>
        new(_apartmentRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithAllNewApartments_SucceedsForAll()
    {
        // Arrange
        var societyId = "soc-001";

        _apartmentRepoMock
            .Setup(r => r.GetByUnitNumberAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment?)null);
        _apartmentRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment a, CancellationToken _) => a);

        var handler = CreateHandler();
        var apartments = new List<CreateApartmentRequest>
        {
            new("A101", "A", 1, 3, 0, null),
            new("A102", "A", 1, 3, 0, null)
        };
        var command = new BulkImportApartmentsCommand(societyId, apartments);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Succeeded.Should().Be(2);
        result.Value!.Failed.Should().Be(0);
    }

    [Fact]
    public async Task Handle_WithDuplicateApartment_ReturnsPartialSuccess()
    {
        // Arrange
        var societyId = "soc-001";
        var existing = Apartment.Create(societyId, "A101", "A", 1, 3, 0);

        _apartmentRepoMock
            .Setup(r => r.GetByUnitNumberAsync(societyId, "A", "A101", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _apartmentRepoMock
            .Setup(r => r.GetByUnitNumberAsync(societyId, "A", "A102", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment?)null);
        _apartmentRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment a, CancellationToken _) => a);

        var handler = CreateHandler();
        var apartments = new List<CreateApartmentRequest>
        {
            new("A101", "A", 1, 3, 0, null), // duplicate
            new("A102", "A", 1, 3, 0, null)  // new
        };
        var command = new BulkImportApartmentsCommand(societyId, apartments);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Succeeded.Should().Be(1);
        result.Value!.Failed.Should().Be(1);
        result.Value!.Errors.Should().HaveCount(1);
    }

    [Fact]
    public async Task Handle_WhenAllDuplicates_ReturnsAllFailed()
    {
        // Arrange
        var societyId = "soc-001";
        var existing = Apartment.Create(societyId, "A101", "A", 1, 3, 0);

        _apartmentRepoMock
            .Setup(r => r.GetByUnitNumberAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var handler = CreateHandler();
        var apartments = new List<CreateApartmentRequest>
        {
            new("A101", "A", 1, 3, 0, null),
            new("A102", "A", 1, 3, 0, null)
        };
        var command = new BulkImportApartmentsCommand(societyId, apartments);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Succeeded.Should().Be(0);
        result.Value!.Failed.Should().Be(2);
    }
}
