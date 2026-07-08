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

// ─── CreatePollCommandHandler Tests ─────────────────────────────────────────────

public class CreatePollCommandHandlerTests
{
    private readonly Mock<IPollRepository> _pollRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IAgmSessionRepository> _agmSessionRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<CreatePollCommandHandler>> _loggerMock = new();

    private CreatePollCommandHandler CreateHandler() =>
        new(_pollRepoMock.Object, _apartmentRepoMock.Object, _userRepoMock.Object, _agmSessionRepoMock.Object, _notificationMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithOpensAtInPast_CreatesOpenPollAndNotifiesEligibleResidents()
    {
        var resident = User.Create("soc-001", "Jane Resident", "jane@test.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner, "apt-1");
        _pollRepoMock.Setup(r => r.CreateAsync(It.IsAny<Poll>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Poll p, CancellationToken _) => p);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUUser, 1, 500, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[resident]);

        var result = await CreateHandler().Handle(new CreatePollCommand(
            "soc-001", "admin-001", "Repaint the gate?", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddMinutes(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("Open");
        _notificationMock.Verify(n => n.SendPushNotificationAsync(resident.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithOpensAtInFuture_CreatesScheduledPollWithoutNotifying()
    {
        _pollRepoMock.Setup(r => r.CreateAsync(It.IsAny<Poll>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Poll p, CancellationToken _) => p);

        var result = await CreateHandler().Handle(new CreatePollCommand(
            "soc-001", "admin-001", "AGM Resolution", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(2), PollEligibilityUnit.PerApartment,
            PollAnonymity.Identified, PollVisibility.AfterClose, null, 50, true, false), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("Scheduled");
        _notificationMock.Verify(n => n.SendPushNotificationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WithFewerThanTwoOptions_ReturnsValidationFailed()
    {
        var result = await CreateHandler().Handle(new CreatePollCommand(
            "soc-001", "admin-001", "Bad poll", "desc", PollType.SingleChoice, ["Only one"],
            DateTime.UtcNow, DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ValidationFailed);
    }

    [Fact]
    public async Task Handle_WithValidAgmSessionId_LinksPollToSession()
    {
        var session = AgmSession.Create("soc-001", "admin-001", "AGM 2026", "desc", DateTime.UtcNow.AddDays(30));
        _agmSessionRepoMock.Setup(r => r.GetByIdAsync(session.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(session);
        _pollRepoMock.Setup(r => r.CreateAsync(It.IsAny<Poll>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Poll p, CancellationToken _) => p);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUUser, 1, 500, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)[]);

        var result = await CreateHandler().Handle(new CreatePollCommand(
            "soc-001", "admin-001", "Resolution", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddMinutes(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Identified, PollVisibility.AfterClose, null, 50, true, true, session.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.AgmSessionId.Should().Be(session.Id);
    }

    [Fact]
    public async Task Handle_WithMissingAgmSessionId_ReturnsNotFound()
    {
        _agmSessionRepoMock.Setup(r => r.GetByIdAsync("missing-session", "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((AgmSession?)null);

        var result = await CreateHandler().Handle(new CreatePollCommand(
            "soc-001", "admin-001", "Resolution", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddMinutes(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Identified, PollVisibility.AfterClose, null, 50, true, true, "missing-session"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.NotFound);
    }
}

// ─── CastVoteCommandHandler Tests ───────────────────────────────────────────────

public class CastVoteCommandHandlerTests
{
    private readonly Mock<IPollRepository> _pollRepoMock = new();
    private readonly Mock<IPollVoteRepository> _voteRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<ILogger<CastVoteCommandHandler>> _loggerMock = new();

    private CastVoteCommandHandler CreateHandler() =>
        new(_pollRepoMock.Object, _voteRepoMock.Object, _userRepoMock.Object, _loggerMock.Object);

    private static Poll OpenPerResidentPoll(bool allowVoteChange = true) =>
        Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, allowVoteChange);

    [Fact]
    public async Task Handle_FirstVoteOnPerResidentPoll_CreatesVote()
    {
        var poll = OpenPerResidentPoll();
        var voter = User.Create("soc-001", "Jane Resident", "jane@test.com", "+91-9876543210", UserRole.SUUser, ResidentType.Tenant);
        var optionId = poll.Options[0].Id;

        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);
        _userRepoMock.Setup(r => r.GetByIdAsync(voter.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(voter);
        _voteRepoMock.Setup(r => r.GetByPollAndEligibleUnitAsync("soc-001", poll.Id, voter.Id, It.IsAny<CancellationToken>())).ReturnsAsync((PollVote?)null);
        _voteRepoMock.Setup(r => r.CreateAsync(It.IsAny<PollVote>(), It.IsAny<CancellationToken>())).ReturnsAsync((PollVote v, CancellationToken _) => v);

        var result = await CreateHandler().Handle(new CastVoteCommand("soc-001", poll.Id, voter.Id, [optionId]), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.SelectedOptionIds.Should().ContainSingle().Which.Should().Be(optionId);
        _voteRepoMock.Verify(r => r.CreateAsync(It.Is<PollVote>(v => v.EligibleUnitId == voter.Id), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_SecondVoteWithAllowVoteChange_OverwritesExistingVote()
    {
        var poll = OpenPerResidentPoll(allowVoteChange: true);
        var voter = User.Create("soc-001", "Jane Resident", "jane@test.com", "+91-9876543210", UserRole.SUUser, ResidentType.Tenant);
        var existingVote = PollVote.Create("soc-001", poll.Id, voter.Id, voter.Id, [poll.Options[0].Id]);
        var newOptionId = poll.Options[1].Id;

        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);
        _userRepoMock.Setup(r => r.GetByIdAsync(voter.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(voter);
        _voteRepoMock.Setup(r => r.GetByPollAndEligibleUnitAsync("soc-001", poll.Id, voter.Id, It.IsAny<CancellationToken>())).ReturnsAsync(existingVote);
        _voteRepoMock.Setup(r => r.UpdateAsync(It.IsAny<PollVote>(), It.IsAny<CancellationToken>())).ReturnsAsync((PollVote v, CancellationToken _) => v);

        var result = await CreateHandler().Handle(new CastVoteCommand("soc-001", poll.Id, voter.Id, [newOptionId]), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.SelectedOptionIds.Should().ContainSingle().Which.Should().Be(newOptionId);
        _voteRepoMock.Verify(r => r.CreateAsync(It.IsAny<PollVote>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_SecondVoteWithoutAllowVoteChange_ReturnsAlreadyVoted()
    {
        var poll = OpenPerResidentPoll(allowVoteChange: false);
        var voter = User.Create("soc-001", "Jane Resident", "jane@test.com", "+91-9876543210", UserRole.SUUser, ResidentType.Tenant);
        var existingVote = PollVote.Create("soc-001", poll.Id, voter.Id, voter.Id, [poll.Options[0].Id]);

        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);
        _userRepoMock.Setup(r => r.GetByIdAsync(voter.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(voter);
        _voteRepoMock.Setup(r => r.GetByPollAndEligibleUnitAsync("soc-001", poll.Id, voter.Id, It.IsAny<CancellationToken>())).ReturnsAsync(existingVote);

        var result = await CreateHandler().Handle(new CastVoteCommand("soc-001", poll.Id, voter.Id, [poll.Options[1].Id]), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.AlreadyVoted);
    }

    [Fact]
    public async Task Handle_PerApartmentPollByNonOwner_ReturnsNotEligibleToVote()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerApartment,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);
        var tenant = User.Create("soc-001", "Tenant User", "tenant@test.com", "+91-1112223333", UserRole.SUUser, ResidentType.Tenant, "apt-1");

        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);
        _userRepoMock.Setup(r => r.GetByIdAsync(tenant.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(tenant);

        var result = await CreateHandler().Handle(new CastVoteCommand("soc-001", poll.Id, tenant.Id, [poll.Options[0].Id]), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.NotEligibleToVote);
    }

    [Fact]
    public async Task Handle_PerApartmentPollByOwner_UsesApartmentIdAsEligibleUnit()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerApartment,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);
        var owner = User.Create("soc-001", "Owner User", "owner@test.com", "+91-2223334444", UserRole.SUUser, ResidentType.Owner, "apt-1");

        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);
        _userRepoMock.Setup(r => r.GetByIdAsync(owner.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(owner);
        _voteRepoMock.Setup(r => r.GetByPollAndEligibleUnitAsync("soc-001", poll.Id, "apt-1", It.IsAny<CancellationToken>())).ReturnsAsync((PollVote?)null);
        _voteRepoMock.Setup(r => r.CreateAsync(It.IsAny<PollVote>(), It.IsAny<CancellationToken>())).ReturnsAsync((PollVote v, CancellationToken _) => v);

        var result = await CreateHandler().Handle(new CastVoteCommand("soc-001", poll.Id, owner.Id, [poll.Options[0].Id]), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _voteRepoMock.Verify(r => r.CreateAsync(It.Is<PollVote>(v => v.EligibleUnitId == "apt-1"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_OutsideVotingWindow_ReturnsPollNotOpen()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-5), DateTime.UtcNow.AddDays(-1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);
        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);

        var result = await CreateHandler().Handle(new CastVoteCommand("soc-001", poll.Id, "user-001", [poll.Options[0].Id]), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.PollNotOpen);
    }

    [Fact]
    public async Task Handle_SingleChoiceWithMultipleSelections_ReturnsValidationFailed()
    {
        var poll = OpenPerResidentPoll();
        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);

        var result = await CreateHandler().Handle(
            new CastVoteCommand("soc-001", poll.Id, "user-001", [poll.Options[0].Id, poll.Options[1].Id]), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ValidationFailed);
    }

    [Fact]
    public async Task Handle_WithInvalidOptionId_ReturnsValidationFailed()
    {
        var poll = OpenPerResidentPoll();
        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);

        var result = await CreateHandler().Handle(new CastVoteCommand("soc-001", poll.Id, "user-001", ["not-a-real-option"]), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ValidationFailed);
    }
}

// ─── ClosePollCommandHandler Tests ──────────────────────────────────────────────

public class ClosePollCommandHandlerTests
{
    private readonly Mock<IPollRepository> _pollRepoMock = new();
    private readonly Mock<IPollVoteRepository> _voteRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<ClosePollCommandHandler>> _loggerMock = new();

    private ClosePollCommandHandler CreateHandler() =>
        new(_pollRepoMock.Object, _voteRepoMock.Object, _apartmentRepoMock.Object, _userRepoMock.Object, _notificationMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_OpenPoll_ClosesComputesTallyAndNotifiesResidents()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.AfterClose, null, null, false, true);
        var resident = User.Create("soc-001", "Jane Resident", "jane@test.com", "+91-9876543210", UserRole.SUUser, ResidentType.Tenant);
        var vote = PollVote.Create("soc-001", poll.Id, resident.Id, resident.Id, [poll.Options[0].Id]);

        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);
        _pollRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Poll>(), It.IsAny<CancellationToken>())).ReturnsAsync((Poll p, CancellationToken _) => p);
        _voteRepoMock.Setup(r => r.GetByPollAsync("soc-001", poll.Id, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<PollVote>)[vote]);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUUser, 1, 500, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<User>)[resident]);

        var result = await CreateHandler().Handle(new ClosePollCommand("soc-001", poll.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("Closed");
        result.Value.Tally.Should().Contain(t => t.Id == poll.Options[0].Id && t.VoteCount == 1);
        _notificationMock.Verify(n => n.SendPushNotificationAsync(resident.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Once);
    }

    [Fact]
    public async Task Handle_AdminOnlyVisibility_DoesNotNotifyResidentsOnClose()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.AdminOnly, null, null, false, true);

        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);
        _pollRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Poll>(), It.IsAny<CancellationToken>())).ReturnsAsync((Poll p, CancellationToken _) => p);
        _voteRepoMock.Setup(r => r.GetByPollAsync("soc-001", poll.Id, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<PollVote>)[]);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUUser, 1, 500, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<User>)[]);

        var result = await CreateHandler().Handle(new ClosePollCommand("soc-001", poll.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _notificationMock.Verify(n => n.SendPushNotificationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Never);
    }

    [Fact]
    public async Task Handle_AlreadyClosedPoll_ReturnsPollAlreadyClosed()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);
        poll.Close(10, 5, 3);

        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);
        _voteRepoMock.Setup(r => r.GetByPollAsync("soc-001", poll.Id, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<PollVote>)[]);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUUser, 1, 500, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<User>)[]);

        var result = await CreateHandler().Handle(new ClosePollCommand("soc-001", poll.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.PollAlreadyClosed);
    }
}

// ─── PublishPollResultsCommandHandler Tests ─────────────────────────────────────

public class PublishPollResultsCommandHandlerTests
{
    private readonly Mock<IPollRepository> _pollRepoMock = new();
    private readonly Mock<IPollVoteRepository> _voteRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<PublishPollResultsCommandHandler>> _loggerMock = new();

    private PublishPollResultsCommandHandler CreateHandler() =>
        new(_pollRepoMock.Object, _voteRepoMock.Object, _apartmentRepoMock.Object, _userRepoMock.Object, _notificationMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_ClosedPoll_PublishesAndNotifiesResidents()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(-1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.AdminOnly, null, null, false, true);
        poll.Close(10, 5, 3);
        var resident = User.Create("soc-001", "Jane Resident", "jane@test.com", "+91-9876543210", UserRole.SUUser, ResidentType.Tenant);

        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);
        _pollRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Poll>(), It.IsAny<CancellationToken>())).ReturnsAsync((Poll p, CancellationToken _) => p);
        _voteRepoMock.Setup(r => r.GetByPollAsync("soc-001", poll.Id, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<PollVote>)[]);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUUser, 1, 500, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<User>)[resident]);

        var result = await CreateHandler().Handle(new PublishPollResultsCommand("soc-001", poll.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ResultsPublished.Should().BeTrue();
        _notificationMock.Verify(n => n.SendPushNotificationAsync(resident.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Once);
    }

    [Fact]
    public async Task Handle_AlreadyPublished_ReturnsPollResultsAlreadyPublished()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(-1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.AdminOnly, null, null, false, true);
        poll.Close(10, 5, 3);
        poll.PublishResults();

        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);

        var result = await CreateHandler().Handle(new PublishPollResultsCommand("soc-001", poll.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.PollResultsAlreadyPublished);
    }
}

// ─── GetPollQueryHandler Tests (visibility rules) ───────────────────────────────

public class GetPollQueryHandlerTests
{
    private readonly Mock<IPollRepository> _pollRepoMock = new();
    private readonly Mock<IPollVoteRepository> _voteRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();

    private GetPollQueryHandler CreateHandler() =>
        new(_pollRepoMock.Object, _voteRepoMock.Object, _apartmentRepoMock.Object, _userRepoMock.Object);

    private void SetupPoll(Poll poll, IReadOnlyList<PollVote>? votes = null)
    {
        _pollRepoMock.Setup(r => r.GetByIdAsync(poll.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(poll);
        _voteRepoMock.Setup(r => r.GetByPollAsync("soc-001", poll.Id, It.IsAny<CancellationToken>())).ReturnsAsync(votes ?? (IReadOnlyList<PollVote>)[]);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUUser, 1, 500, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<User>)[]);
        _userRepoMock.Setup(r => r.GetByIdAsync(It.IsAny<string>(), "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);
    }

    [Fact]
    public async Task Handle_AsAdmin_SeesTallyWhileOpenRegardlessOfVisibility()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.AdminOnly, null, null, false, true);
        SetupPoll(poll);

        var result = await CreateHandler().Handle(new GetPollQuery("soc-001", poll.Id, "admin-001", "SUAdmin"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Tally.Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_AsSecurity_DoesNotSeeTallyWhileOpen()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);
        SetupPoll(poll);

        var result = await CreateHandler().Handle(new GetPollQuery("soc-001", poll.Id, "guard-001", "SUSecurity"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Tally.Should().BeNull();
    }

    [Fact]
    public async Task Handle_AsSecurity_SeesTallyAfterCloseWhenNotAdminOnly()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(-1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.AfterClose, null, null, false, true);
        poll.Close(10, 5, 3);
        SetupPoll(poll);

        var result = await CreateHandler().Handle(new GetPollQuery("soc-001", poll.Id, "guard-001", "SUSecurity"), CancellationToken.None);

        result.Value!.Tally.Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_AsSecurity_DoesNotSeeAdminOnlyResultsUntilPublished()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(-1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.AdminOnly, null, null, false, true);
        poll.Close(10, 5, 3);
        SetupPoll(poll);

        var result = await CreateHandler().Handle(new GetPollQuery("soc-001", poll.Id, "guard-001", "SUSecurity"), CancellationToken.None);

        result.Value!.Tally.Should().BeNull();
    }

    [Fact]
    public async Task Handle_AsResident_ImmediatelyVisibility_SeesTallyWhileOpen()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);
        SetupPoll(poll);

        var result = await CreateHandler().Handle(new GetPollQuery("soc-001", poll.Id, "user-001", "SUUser"), CancellationToken.None);

        result.Value!.Tally.Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_AsResident_AfterCloseVisibility_DoesNotSeeTallyWhileOpen()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.AfterClose, null, null, false, true);
        SetupPoll(poll);

        var result = await CreateHandler().Handle(new GetPollQuery("soc-001", poll.Id, "user-001", "SUUser"), CancellationToken.None);

        result.Value!.Tally.Should().BeNull();
    }

    [Fact]
    public async Task Handle_AsResident_AdminOnlyVisibility_DoesNotSeeUntilPublished()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(-1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.AdminOnly, null, null, false, true);
        poll.Close(10, 5, 3);
        SetupPoll(poll);

        var result = await CreateHandler().Handle(new GetPollQuery("soc-001", poll.Id, "user-001", "SUUser"), CancellationToken.None);
        result.Value!.Tally.Should().BeNull();

        poll.PublishResults();
        var afterPublish = await CreateHandler().Handle(new GetPollQuery("soc-001", poll.Id, "user-001", "SUUser"), CancellationToken.None);
        afterPublish.Value!.Tally.Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_AsResident_HasVotedReflectsOnlyTheRequestersOwnVote()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);
        var me = User.Create("soc-001", "Me", "me@test.com", "+91-1111111111", UserRole.SUUser, ResidentType.Tenant);
        var otherResident = User.Create("soc-001", "Other", "other@test.com", "+91-2222222222", UserRole.SUUser, ResidentType.Tenant);
        var myVote = PollVote.Create("soc-001", poll.Id, me.Id, me.Id, [poll.Options[0].Id]);
        var otherVote = PollVote.Create("soc-001", poll.Id, otherResident.Id, otherResident.Id, [poll.Options[1].Id]);

        SetupPoll(poll, [myVote, otherVote]);
        _userRepoMock.Setup(r => r.GetByIdAsync(me.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(me);

        var result = await CreateHandler().Handle(new GetPollQuery("soc-001", poll.Id, me.Id, "SUUser"), CancellationToken.None);

        result.Value!.HasVoted.Should().BeTrue();
        result.Value.MySelectedOptionIds.Should().ContainSingle().Which.Should().Be(poll.Options[0].Id);
        result.Value.ParticipantCount.Should().Be(2);
    }

    [Fact]
    public async Task Handle_MissingPoll_ReturnsPollNotFound()
    {
        _pollRepoMock.Setup(r => r.GetByIdAsync("missing", "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((Poll?)null);

        var result = await CreateHandler().Handle(new GetPollQuery("soc-001", "missing", "user-001", "SUUser"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.PollNotFound);
    }
}

// ─── GetPollsQueryHandler Tests ─────────────────────────────────────────────────

public class GetPollsQueryHandlerTests
{
    [Fact]
    public async Task Handle_ReturnsPagedSummariesOrderedByOpensAtDescending()
    {
        var pollRepoMock = new Mock<IPollRepository>();
        var older = Poll.Create("soc-001", "admin-001", "Older", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-10), DateTime.UtcNow.AddDays(-9), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);
        var newer = Poll.Create("soc-001", "admin-001", "Newer", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);

        pollRepoMock.Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<Poll>)[older, newer]);

        var handler = new GetPollsQueryHandler(pollRepoMock.Object);
        var result = await handler.Handle(new GetPollsQuery("soc-001", new PaginationParams { Page = 1, PageSize = 20 }), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Select(p => p.Title).Should().ContainInOrder("Newer", "Older");
    }

    [Fact]
    public async Task Handle_WithLinkedNoticeIdFilter_ReturnsOnlyThePollSurfacedFromThatNotice()
    {
        var pollRepoMock = new Mock<IPollRepository>();
        var linked = Poll.Create("soc-001", "admin-001", "AGM Notice Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, "notice-001", null, false, true);
        var unrelated = Poll.Create("soc-001", "admin-001", "Quick Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);

        pollRepoMock.Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<Poll>)[linked, unrelated]);

        var handler = new GetPollsQueryHandler(pollRepoMock.Object);
        var result = await handler.Handle(
            new GetPollsQuery("soc-001", new PaginationParams { Page = 1, PageSize = 20 }, LinkedNoticeId: "notice-001"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle(p => p.Id == linked.Id);
    }
}

// ─── UpdatePollStatusesCommandHandler Tests ─────────────────────────────────────

public class UpdatePollStatusesCommandHandlerTests
{
    private readonly Mock<IPollRepository> _pollRepoMock = new();
    private readonly Mock<IPollVoteRepository> _voteRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<UpdatePollStatusesCommandHandler>> _loggerMock = new();

    private UpdatePollStatusesCommandHandler CreateHandler() =>
        new(_pollRepoMock.Object, _voteRepoMock.Object, _apartmentRepoMock.Object, _userRepoMock.Object, _notificationMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_ScheduledPollPastOpensAt_ActivatesAndNotifies()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddMinutes(5), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);
        var resident = User.Create("soc-001", "Jane Resident", "jane@test.com", "+91-9876543210", UserRole.SUUser, ResidentType.Tenant);

        _pollRepoMock.Setup(r => r.GetOpenOrScheduledAcrossSocietiesAsync(It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<Poll>)[poll]);
        _pollRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Poll>(), It.IsAny<CancellationToken>())).ReturnsAsync((Poll p, CancellationToken _) => p);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUUser, 1, 500, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<User>)[resident]);

        var result = await CreateHandler().Handle(new UpdatePollStatusesCommand(poll.OpensAt.AddMinutes(1)), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(1);
        poll.Status.Should().Be(PollStatus.Open);
        _notificationMock.Verify(n => n.SendPushNotificationAsync(resident.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Once);
    }

    [Fact]
    public async Task Handle_OpenPollPastClosesAt_ClosesAndComputesTally()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddMinutes(-1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);

        _pollRepoMock.Setup(r => r.GetOpenOrScheduledAcrossSocietiesAsync(It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<Poll>)[poll]);
        _pollRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Poll>(), It.IsAny<CancellationToken>())).ReturnsAsync((Poll p, CancellationToken _) => p);
        _voteRepoMock.Setup(r => r.GetByPollAsync("soc-001", poll.Id, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<PollVote>)[]);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUUser, 1, 500, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<User>)[]);

        var result = await CreateHandler().Handle(new UpdatePollStatusesCommand(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(1);
        poll.Status.Should().Be(PollStatus.Closed);
    }

    [Fact]
    public async Task Handle_PollNotYetDue_LeavesUnchanged()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(2), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);

        _pollRepoMock.Setup(r => r.GetOpenOrScheduledAcrossSocietiesAsync(It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<Poll>)[poll]);

        var result = await CreateHandler().Handle(new UpdatePollStatusesCommand(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(0);
        poll.Status.Should().Be(PollStatus.Scheduled);
        _pollRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Poll>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

// ─── SendPollVotingRemindersCommandHandler Tests ────────────────────────────────

public class SendPollVotingRemindersCommandHandlerTests
{
    private readonly Mock<IPollRepository> _pollRepoMock = new();
    private readonly Mock<IPollVoteRepository> _voteRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<SendPollVotingRemindersCommandHandler>> _loggerMock = new();

    private SendPollVotingRemindersCommandHandler CreateHandler() =>
        new(_pollRepoMock.Object, _voteRepoMock.Object, _apartmentRepoMock.Object, _userRepoMock.Object, _notificationMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithinReminderWindow_NotifiesOnlyNonVotersAndMarksReminderSent()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddHours(10), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);
        var voted = User.Create("soc-001", "Voted Resident", "voted@test.com", "+91-1111111111", UserRole.SUUser, ResidentType.Tenant);
        var notVoted = User.Create("soc-001", "Non Voter", "nonvoter@test.com", "+91-2222222222", UserRole.SUUser, ResidentType.Tenant);
        var vote = PollVote.Create("soc-001", poll.Id, voted.Id, voted.Id, [poll.Options[0].Id]);

        _pollRepoMock.Setup(r => r.GetOpenOrScheduledAcrossSocietiesAsync(It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<Poll>)[poll]);
        _pollRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Poll>(), It.IsAny<CancellationToken>())).ReturnsAsync((Poll p, CancellationToken _) => p);
        _voteRepoMock.Setup(r => r.GetByPollAsync("soc-001", poll.Id, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<PollVote>)[vote]);
        _userRepoMock.Setup(r => r.GetByRoleAsync("soc-001", UserRole.SUUser, 1, 500, It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<User>)[voted, notVoted]);

        var result = await CreateHandler().Handle(new SendPollVotingRemindersCommand(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(1);
        poll.ReminderSentAt.Should().NotBeNull();
        _notificationMock.Verify(n => n.SendPushNotificationAsync(notVoted.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Once);
        _notificationMock.Verify(n => n.SendPushNotificationAsync(voted.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Never);
    }

    [Fact]
    public async Task Handle_OutsideReminderWindow_DoesNotRemind()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(5), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);

        _pollRepoMock.Setup(r => r.GetOpenOrScheduledAcrossSocietiesAsync(It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<Poll>)[poll]);

        var result = await CreateHandler().Handle(new SendPollVotingRemindersCommand(), CancellationToken.None);

        result.Value.Should().Be(0);
        poll.ReminderSentAt.Should().BeNull();
    }

    [Fact]
    public async Task Handle_AlreadyReminded_DoesNotRemindAgain()
    {
        var poll = Poll.Create("soc-001", "admin-001", "Poll", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddHours(10), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);
        poll.MarkReminderSent();

        _pollRepoMock.Setup(r => r.GetOpenOrScheduledAcrossSocietiesAsync(It.IsAny<CancellationToken>())).ReturnsAsync((IReadOnlyList<Poll>)[poll]);

        var result = await CreateHandler().Handle(new SendPollVotingRemindersCommand(), CancellationToken.None);

        result.Value.Should().Be(0);
        _pollRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Poll>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
