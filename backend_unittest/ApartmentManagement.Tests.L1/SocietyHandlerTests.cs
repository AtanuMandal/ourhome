using ApartmentManagement.Application.Commands.Society;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
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
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<ILogger<CreateSocietyCommandHandler>> _loggerMock = new();

    private CreateSocietyCommandHandler CreateHandler() =>
        new(_societyRepoMock.Object, _eventPublisherMock.Object, _loggerMock.Object);

    private static CreateSocietyCommand ValidCommand() => new(
        "Green Valley", "123 Main St", "Mumbai", "Maharashtra", "400001", "India",
        "admin@gv.com", "+91-9876543210", 3, 60);

    [Fact]
    public async Task Handle_WithValidCommand_CreatesSocietyAndReturnsSuccess()
    {
        // Arrange
        _societyRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society s, CancellationToken _) => s);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(ValidCommand(), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value!.Id.Should().NotBeNullOrEmpty();
        _societyRepoMock.Verify(r => r.CreateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()), Times.Once);
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
