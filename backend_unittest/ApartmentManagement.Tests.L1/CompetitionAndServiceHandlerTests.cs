using ApartmentManagement.Application.Commands.Gamification;
using ApartmentManagement.Application.Commands.ServiceProvider;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class RegisterForCompetitionCommandHandlerTests
{
    private readonly Mock<ICompetitionRepository> _competitionRepoMock = new();
    private readonly Mock<ICompetitionEntryRepository> _entryRepoMock = new();
    private readonly Mock<ILogger<RegisterForCompetitionCommandHandler>> _loggerMock = new();

    private RegisterForCompetitionCommandHandler CreateHandler() =>
        new(_competitionRepoMock.Object, _entryRepoMock.Object, _loggerMock.Object);

    private static Competition CreateActiveCompetition(string societyId, int? maxParticipants = null)
    {
        var comp = Competition.Create(societyId, "admin-001", "Art Competition", "Paint your best",
            DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(7), "Trophy", maxParticipants);
        comp.Start();
        return comp;
    }

    [Fact]
    public async Task Handle_WithValidRegistration_RegistersAndReturnsSuccess()
    {
        // Arrange
        var societyId = "soc-001";
        var competition = CreateActiveCompetition(societyId);
        var compId = competition.Id;

        _competitionRepoMock
            .Setup(r => r.GetByIdAsync(compId, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(competition);
        _entryRepoMock
            .Setup(r => r.GetUserEntryAsync(societyId, compId, "user-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((CompetitionEntry?)null);
        _entryRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<CompetitionEntry>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CompetitionEntry e, CancellationToken _) => e);

        var handler = CreateHandler();
        var command = new RegisterForCompetitionCommand(societyId, compId, "user-001", "apt-001");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _entryRepoMock.Verify(r => r.CreateAsync(It.IsAny<CompetitionEntry>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenCompetitionNotFound_ReturnsFailure()
    {
        // Arrange
        _competitionRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Competition?)null);

        var handler = CreateHandler();
        var command = new RegisterForCompetitionCommand("soc-001", "invalid-id", "user-001", "apt-001");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.CompetitionNotFound);
    }

    [Fact]
    public async Task Handle_WhenCompetitionNotActive_ReturnsFailure()
    {
        // Arrange
        var societyId = "soc-001";
        var competition = Competition.Create(societyId, "admin-001", "Art", "desc",
            DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(7), "Prize");
        // NOT started - still Upcoming

        _competitionRepoMock
            .Setup(r => r.GetByIdAsync(competition.Id, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(competition);

        var handler = CreateHandler();
        var command = new RegisterForCompetitionCommand(societyId, competition.Id, "user-001", "apt-001");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.CompetitionNotActive);
    }

    [Fact]
    public async Task Handle_WhenAlreadyRegistered_ReturnsFailure()
    {
        // Arrange
        var societyId = "soc-001";
        var competition = CreateActiveCompetition(societyId);
        var compId = competition.Id;
        var existingEntry = CompetitionEntry.Create(societyId, compId, "apt-001", "user-001");

        _competitionRepoMock
            .Setup(r => r.GetByIdAsync(compId, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(competition);
        _entryRepoMock
            .Setup(r => r.GetUserEntryAsync(societyId, compId, "user-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingEntry);

        var handler = CreateHandler();
        var command = new RegisterForCompetitionCommand(societyId, compId, "user-001", "apt-001");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.AlreadyRegistered);
    }

    [Fact]
    public async Task Handle_WhenCompetitionFull_ReturnsFailure()
    {
        // Arrange
        var societyId = "soc-001";
        var competition = CreateActiveCompetition(societyId, 2);
        var compId = competition.Id;

        var entries = new List<CompetitionEntry>
        {
            CompetitionEntry.Create(societyId, compId, "apt-001", "user-001"),
            CompetitionEntry.Create(societyId, compId, "apt-002", "user-002")
        };

        _competitionRepoMock
            .Setup(r => r.GetByIdAsync(compId, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(competition);
        _entryRepoMock
            .Setup(r => r.GetUserEntryAsync(societyId, compId, "user-003", It.IsAny<CancellationToken>()))
            .ReturnsAsync((CompetitionEntry?)null);
        _entryRepoMock
            .Setup(r => r.GetByCompetitionAsync(societyId, compId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(entries);

        var handler = CreateHandler();
        var command = new RegisterForCompetitionCommand(societyId, compId, "user-003", "apt-003");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.CompetitionFull);
    }
}

public class AcceptServiceRequestCommandHandlerTests
{
    private readonly Mock<IServiceProviderRequestRepository> _requestRepoMock = new();
    private readonly Mock<IServiceProviderRepository> _providerRepoMock = new();
    private readonly Mock<ILogger<AcceptServiceRequestCommandHandler>> _loggerMock = new();

    private AcceptServiceRequestCommandHandler CreateHandler() =>
        new(_requestRepoMock.Object, _providerRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithApprovedProvider_AcceptsRequestAndReturnsSuccess()
    {
        // Arrange
        var societyId = "soc-001";
        var provider = ServiceProvider.Create("QuickFix", "John", "+91-9876543210", "john@qf.com",
            new[] { "Plumbing" }, "desc", societyId);
        provider.Approve();
        var providerId = provider.Id;

        var request = ServiceProviderRequest.Create(societyId, "apt-001", "user-001",
            "Plumbing", "Fix the pipe", DateTime.UtcNow.AddDays(1));
        var requestId = request.Id;

        _providerRepoMock
            .Setup(r => r.GetByIdAsync(providerId, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(provider);
        _requestRepoMock
            .Setup(r => r.GetByIdAsync(requestId, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(request);
        _requestRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<ServiceProviderRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ServiceProviderRequest sr, CancellationToken _) => sr);

        var handler = CreateHandler();
        var command = new AcceptServiceRequestCommand(societyId, requestId, providerId);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        request.Status.Should().Be(ServiceRequestStatus.Accepted);
        request.AcceptedByProviderId.Should().Be(providerId);
    }

    [Fact]
    public async Task Handle_WithUnapprovedProvider_ReturnsFailure()
    {
        // Arrange
        var societyId = "soc-001";
        var provider = ServiceProvider.Create("QuickFix", "John", "+91-9876543210", "john@qf.com",
            new[] { "Plumbing" }, "desc", societyId);
        // Not approved - still Pending
        var providerId = provider.Id;

        _providerRepoMock
            .Setup(r => r.GetByIdAsync(providerId, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(provider);

        var handler = CreateHandler();
        var command = new AcceptServiceRequestCommand(societyId, "request-001", providerId);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ServiceProviderNotApproved);
    }

    [Fact]
    public async Task Handle_WhenRequestNotFound_ReturnsFailure()
    {
        // Arrange
        var societyId = "soc-001";
        var provider = ServiceProvider.Create("QuickFix", "John", "+91-9876543210", "john@qf.com",
            new[] { "Plumbing" }, "desc", societyId);
        provider.Approve();
        var providerId = provider.Id;

        _providerRepoMock
            .Setup(r => r.GetByIdAsync(providerId, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(provider);
        _requestRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((ServiceProviderRequest?)null);

        var handler = CreateHandler();
        var command = new AcceptServiceRequestCommand(societyId, "invalid-request", providerId);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ServiceRequestNotFound);
    }
}
