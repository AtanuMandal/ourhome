using ApartmentManagement.Application.Commands.Poll;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.Poll;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class CreateAgmSessionCommandHandlerTests
{
    private readonly Mock<IAgmSessionRepository> _agmSessionRepoMock = new();
    private readonly Mock<ILogger<CreateAgmSessionCommandHandler>> _loggerMock = new();

    private CreateAgmSessionCommandHandler CreateHandler() => new(_agmSessionRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidRequest_CreatesSessionWithZeroResolutions()
    {
        _agmSessionRepoMock.Setup(r => r.CreateAsync(It.IsAny<AgmSession>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AgmSession s, CancellationToken _) => s);

        var result = await CreateHandler().Handle(
            new CreateAgmSessionCommand("soc-001", "admin-001", "AGM 2026", "Yearly resolutions", DateTime.UtcNow.AddDays(30)),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Title.Should().Be("AGM 2026");
        result.Value.ResolutionCount.Should().Be(0);
    }
}

public class GetAgmSessionsQueryHandlerTests
{
    [Fact]
    public async Task Handle_ReturnsSessionsWithCorrectResolutionCounts()
    {
        var agmSessionRepoMock = new Mock<IAgmSessionRepository>();
        var pollRepoMock = new Mock<IPollRepository>();

        var session1 = AgmSession.Create("soc-001", "admin-001", "AGM 2025", "desc", DateTime.UtcNow.AddDays(-100));
        var session2 = AgmSession.Create("soc-001", "admin-001", "AGM 2026", "desc", DateTime.UtcNow.AddDays(30));

        var resolution1 = Poll.Create(
            "soc-001", "admin-001", "Resolution 1", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, true, true, session2.Id);
        var resolution2 = Poll.Create(
            "soc-001", "admin-001", "Resolution 2", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, true, true, session2.Id);

        agmSessionRepoMock.Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<AgmSession>)[session1, session2]);
        pollRepoMock.Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Poll>)[resolution1, resolution2]);

        var handler = new GetAgmSessionsQueryHandler(agmSessionRepoMock.Object, pollRepoMock.Object);
        var result = await handler.Handle(new GetAgmSessionsQuery("soc-001", new PaginationParams { Page = 1, PageSize = 20 }), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle(s => s.Id == session2.Id && s.ResolutionCount == 2);
        result.Value.Items.Should().ContainSingle(s => s.Id == session1.Id && s.ResolutionCount == 0);
    }
}

public class GetAgmSessionQueryHandlerTests
{
    private readonly Mock<IAgmSessionRepository> _agmSessionRepoMock = new();
    private readonly Mock<IPollRepository> _pollRepoMock = new();
    private readonly Mock<IPollVoteRepository> _pollVoteRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();

    private GetAgmSessionQueryHandler CreateHandler() =>
        new(_agmSessionRepoMock.Object, _pollRepoMock.Object, _pollVoteRepoMock.Object, _apartmentRepoMock.Object, _userRepoMock.Object);

    [Fact]
    public async Task Handle_ReturnsSessionWithOnlyItsLinkedResolutions()
    {
        var session = AgmSession.Create("soc-001", "admin-001", "AGM 2026", "desc", DateTime.UtcNow.AddDays(30));
        var linkedResolution = Poll.Create(
            "soc-001", "admin-001", "Linked Resolution", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, true, true, session.Id);
        var unrelatedPoll = Poll.Create(
            "soc-001", "admin-001", "Unrelated Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);

        _agmSessionRepoMock.Setup(r => r.GetByIdAsync(session.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(session);
        _pollRepoMock.Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Poll>)[linkedResolution, unrelatedPoll]);
        _pollVoteRepoMock.Setup(r => r.GetByPollAsync("soc-001", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<PollVote>)[]);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUUser, 1, 500, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Domain.Entities.User>)[]);
        _userRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<string>(), "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Domain.Entities.User?)null);

        var result = await CreateHandler().Handle(new GetAgmSessionQuery("soc-001", session.Id, "admin-001", "SUAdmin"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Resolutions.Should().ContainSingle(p => p.Id == linkedResolution.Id);
        result.Value.Resolutions.Should().NotContain(p => p.Id == unrelatedPoll.Id);
    }

    [Fact]
    public async Task Handle_MissingSession_ReturnsAgmSessionNotFound()
    {
        _agmSessionRepoMock.Setup(r => r.GetByIdAsync("missing", "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((AgmSession?)null);

        var result = await CreateHandler().Handle(new GetAgmSessionQuery("soc-001", "missing", "admin-001", "SUAdmin"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.AgmSessionNotFound);
    }

    [Fact]
    public async Task Handle_WithMultipleResolutions_FetchesRequestingUserOnceNotPerResolution()
    {
        var session = AgmSession.Create("soc-001", "admin-001", "AGM 2026", "desc", DateTime.UtcNow.AddDays(30));
        var resolution1 = Poll.Create(
            "soc-001", "admin-001", "Resolution 1", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, true, true, session.Id);
        var resolution2 = Poll.Create(
            "soc-001", "admin-001", "Resolution 2", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, true, true, session.Id);
        var resolution3 = Poll.Create(
            "soc-001", "admin-001", "Resolution 3", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, true, true, session.Id);

        _agmSessionRepoMock.Setup(r => r.GetByIdAsync(session.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(session);
        _pollRepoMock.Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Poll>)[resolution1, resolution2, resolution3]);
        _pollVoteRepoMock.Setup(r => r.GetByPollAsync("soc-001", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<PollVote>)[]);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUUser, 1, 500, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Domain.Entities.User>)[]);
        var requestingUser = Domain.Entities.User.Create("soc-001", "Admin User", "admin@test.com", "9876543210", UserRole.SUAdmin, ResidentType.SocietyAdmin);
        _userRepoMock.Setup(r => r.GetByIdAsync("admin-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(requestingUser);

        var result = await CreateHandler().Handle(new GetAgmSessionQuery("soc-001", session.Id, "admin-001", "SUAdmin"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Resolutions.Should().HaveCount(3);

        // The requesting user is the same for every resolution in the session — must be fetched
        // once and reused, not refetched on every iteration of the resolutions loop.
        _userRepoMock.Verify(r => r.GetByIdAsync("admin-001", "soc-001", It.IsAny<CancellationToken>()), Times.Once);
    }
}
