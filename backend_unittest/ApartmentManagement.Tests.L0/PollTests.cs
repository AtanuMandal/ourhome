using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class PollTests
{
    private const string SocietyId = "society-001";
    private const string AdminUserId = "admin-001";

    private static Poll CreatePoll(
        DateTime? opensAt = null, DateTime? closesAt = null, double? quorumThresholdPercent = null,
        PollEligibilityUnit eligibilityUnit = PollEligibilityUnit.PerResident, bool allowVoteChange = true) =>
        Poll.Create(
            SocietyId, AdminUserId, "Repaint the gate?", "Should we repaint the gate this month?",
            PollType.SingleChoice, ["Yes", "No"],
            opensAt ?? DateTime.UtcNow.AddDays(-1), closesAt ?? DateTime.UtcNow.AddDays(1),
            eligibilityUnit, PollAnonymity.Anonymous, PollVisibility.Immediately,
            null, quorumThresholdPercent, false, allowVoteChange);

    [Fact]
    public void Create_WithOpensAtInPast_ReturnsOpenPoll()
    {
        var poll = CreatePoll(opensAt: DateTime.UtcNow.AddMinutes(-5));
        poll.Status.Should().Be(PollStatus.Open);
        poll.Options.Should().HaveCount(2);
    }

    [Fact]
    public void Create_WithAgmSessionId_LinksThePollToTheSession()
    {
        var poll = Poll.Create(
            SocietyId, AdminUserId, "Repaint the gate?", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, true, true,
            agmSessionId: "agm-session-001");

        poll.AgmSessionId.Should().Be("agm-session-001");
    }

    [Fact]
    public void Create_WithoutAgmSessionId_LeavesItNull()
    {
        var poll = CreatePoll();
        poll.AgmSessionId.Should().BeNull();
    }

    [Fact]
    public void Create_DefaultsToFullSocietyTargetAudienceWithNoBlocks()
    {
        var poll = CreatePoll();
        poll.TargetAudience.Should().Be(PollTargetAudience.FullSociety);
        poll.TargetBlockNames.Should().BeEmpty();
    }

    [Fact]
    public void Create_WithPerBlockAndOneBlock_SetsNormalizedTargetBlockNames()
    {
        var poll = Poll.Create(
            SocietyId, AdminUserId, "Title", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true,
            targetAudience: PollTargetAudience.PerBlock, targetBlockNames: [" block a "]);

        poll.TargetAudience.Should().Be(PollTargetAudience.PerBlock);
        poll.TargetBlockNames.Should().ContainSingle().Which.Should().Be("BLOCK A");
    }

    [Fact]
    public void Create_WithPerBlockAndNoBlocks_ThrowsArgumentException()
    {
        var act = () => Poll.Create(
            SocietyId, AdminUserId, "Title", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true,
            targetAudience: PollTargetAudience.PerBlock, targetBlockNames: []);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithPerBlockAndMultipleBlocks_ThrowsArgumentException()
    {
        var act = () => Poll.Create(
            SocietyId, AdminUserId, "Title", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true,
            targetAudience: PollTargetAudience.PerBlock, targetBlockNames: ["Block A", "Block B"]);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithMultipleBlockAndNoBlocks_ThrowsArgumentException()
    {
        var act = () => Poll.Create(
            SocietyId, AdminUserId, "Title", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true,
            targetAudience: PollTargetAudience.MultipleBlock, targetBlockNames: []);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithMultipleBlockAndSeveralBlocks_SetsDistinctNormalizedTargetBlockNames()
    {
        var poll = Poll.Create(
            SocietyId, AdminUserId, "Title", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true,
            targetAudience: PollTargetAudience.MultipleBlock, targetBlockNames: ["Block A", "block a", "Block B"]);

        poll.TargetBlockNames.Should().BeEquivalentTo(["BLOCK A", "BLOCK B"]);
    }

    [Fact]
    public void Create_WithFullSocietyButBlocksProvided_ClearsTargetBlockNames()
    {
        var poll = Poll.Create(
            SocietyId, AdminUserId, "Title", "desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true,
            targetAudience: PollTargetAudience.FullSociety, targetBlockNames: ["Block A"]);

        poll.TargetBlockNames.Should().BeEmpty();
    }

    [Fact]
    public void Create_WithOpensAtInFuture_ReturnsScheduledPoll()
    {
        var poll = CreatePoll(opensAt: DateTime.UtcNow.AddDays(1), closesAt: DateTime.UtcNow.AddDays(2));
        poll.Status.Should().Be(PollStatus.Scheduled);
    }

    [Fact]
    public void Create_WithFewerThanTwoOptions_ThrowsArgumentException()
    {
        var act = () => Poll.Create(
            SocietyId, AdminUserId, "Title", "Desc", PollType.SingleChoice, ["Only one"],
            DateTime.UtcNow, DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithClosesAtBeforeOpensAt_ThrowsArgumentException()
    {
        var act = () => Poll.Create(
            SocietyId, AdminUserId, "Title", "Desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow, DateTime.UtcNow.AddDays(-1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_WithQuorumThresholdOutOfRange_ThrowsArgumentException()
    {
        var act = () => CreatePoll(quorumThresholdPercent: 150);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Activate_FromScheduled_SetsStatusOpen()
    {
        var poll = CreatePoll(opensAt: DateTime.UtcNow.AddDays(1), closesAt: DateTime.UtcNow.AddDays(2));
        poll.Activate();
        poll.Status.Should().Be(PollStatus.Open);
    }

    [Fact]
    public void Activate_WhenAlreadyOpen_ThrowsInvalidOperationException()
    {
        var poll = CreatePoll();
        var act = () => poll.Activate();
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void IsCurrentlyOpen_WhileStillScheduledButPastOpensAt_ReturnsTrue()
    {
        // Guards against the timer-activation race: voting should work the instant opensAt
        // arrives, even if the minutely status timer hasn't flipped Scheduled -> Open yet.
        var poll = Poll.Create(
            SocietyId, AdminUserId, "Title", "Desc", PollType.SingleChoice, ["Yes", "No"],
            DateTime.UtcNow.AddSeconds(-1), DateTime.UtcNow.AddDays(1), PollEligibilityUnit.PerResident,
            PollAnonymity.Anonymous, PollVisibility.Immediately, null, null, false, true);

        poll.IsCurrentlyOpen(DateTime.UtcNow).Should().BeTrue();
    }

    [Fact]
    public void IsCurrentlyOpen_BeforeOpensAt_ReturnsFalse()
    {
        var poll = CreatePoll(opensAt: DateTime.UtcNow.AddDays(1), closesAt: DateTime.UtcNow.AddDays(2));
        poll.IsCurrentlyOpen(DateTime.UtcNow).Should().BeFalse();
    }

    [Fact]
    public void IsCurrentlyOpen_AfterClosesAt_ReturnsFalse()
    {
        var poll = CreatePoll(opensAt: DateTime.UtcNow.AddDays(-2), closesAt: DateTime.UtcNow.AddDays(-1));
        poll.IsCurrentlyOpen(DateTime.UtcNow).Should().BeFalse();
    }

    [Fact]
    public void IsCurrentlyOpen_AfterExplicitClose_ReturnsFalse()
    {
        var poll = CreatePoll();
        poll.Close(10, 5, 3);
        poll.IsCurrentlyOpen(DateTime.UtcNow).Should().BeFalse();
    }

    [Fact]
    public void Close_WithNoQuorumThresholdConfigured_LeavesOutcomeNull()
    {
        var poll = CreatePoll();
        poll.Close(eligibleCount: 10, participantCount: 2, leadingOptionVoteCount: 2);

        poll.Status.Should().Be(PollStatus.Closed);
        poll.Outcome.Should().BeNull();
        poll.EligibleCountAtClose.Should().Be(10);
        poll.ParticipantCountAtClose.Should().Be(2);
    }

    [Fact]
    public void Close_WithParticipationBelowQuorum_MarksNoQuorum()
    {
        var poll = CreatePoll(quorumThresholdPercent: 50);
        poll.Close(eligibleCount: 10, participantCount: 3, leadingOptionVoteCount: 3);

        poll.Outcome.Should().Be(PollOutcome.NoQuorum);
    }

    [Fact]
    public void Close_WithQuorumMetAndMajorityForLeadingOption_MarksPassed()
    {
        var poll = CreatePoll(quorumThresholdPercent: 50);
        // 6 of 10 eligible voted (60% turnout, meets 50% quorum); 4 of 6 voted for the leading option.
        poll.Close(eligibleCount: 10, participantCount: 6, leadingOptionVoteCount: 4);

        poll.Outcome.Should().Be(PollOutcome.Passed);
    }

    [Fact]
    public void Close_WithQuorumMetButNoMajorityForLeadingOption_MarksFailed()
    {
        var poll = CreatePoll(quorumThresholdPercent: 50);
        // 6 of 10 eligible voted; leading option only got 3 of 6 (exactly half, not a majority).
        poll.Close(eligibleCount: 10, participantCount: 6, leadingOptionVoteCount: 3);

        poll.Outcome.Should().Be(PollOutcome.Failed);
    }

    [Fact]
    public void Close_WhenAlreadyClosed_ThrowsInvalidOperationException()
    {
        var poll = CreatePoll();
        poll.Close(10, 5, 3);
        var act = () => poll.Close(10, 5, 3);
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void PublishResults_FromClosed_SetsResultsPublished()
    {
        var poll = CreatePoll();
        poll.Close(10, 5, 3);
        poll.PublishResults();
        poll.ResultsPublished.Should().BeTrue();
    }

    [Fact]
    public void PublishResults_WhenNotClosed_ThrowsInvalidOperationException()
    {
        var poll = CreatePoll();
        var act = () => poll.PublishResults();
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void PublishResults_WhenAlreadyPublished_ThrowsInvalidOperationException()
    {
        var poll = CreatePoll();
        poll.Close(10, 5, 3);
        poll.PublishResults();
        var act = () => poll.PublishResults();
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void MarkReminderSent_SetsReminderSentAt()
    {
        var poll = CreatePoll();
        poll.ReminderSentAt.Should().BeNull();
        poll.MarkReminderSent();
        poll.ReminderSentAt.Should().NotBeNull();
    }
}
