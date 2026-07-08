using ApartmentManagement.Domain.Entities;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class PollVoteTests
{
    [Fact]
    public void Create_WithValidParameters_ReturnsVote()
    {
        var vote = PollVote.Create("soc-001", "poll-001", "apt-001", "user-001", ["opt-1"]);

        vote.PollId.Should().Be("poll-001");
        vote.EligibleUnitId.Should().Be("apt-001");
        vote.VoterUserId.Should().Be("user-001");
        vote.SelectedOptionIds.Should().ContainSingle().Which.Should().Be("opt-1");
    }

    [Fact]
    public void Create_WithNoSelectedOptions_ThrowsArgumentException()
    {
        var act = () => PollVote.Create("soc-001", "poll-001", "apt-001", "user-001", []);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ChangeSelection_UpdatesSelectedOptionIds()
    {
        var vote = PollVote.Create("soc-001", "poll-001", "apt-001", "user-001", ["opt-1"]);
        vote.ChangeSelection(["opt-2", "opt-3"]);

        vote.SelectedOptionIds.Should().BeEquivalentTo(["opt-2", "opt-3"]);
    }

    [Fact]
    public void ChangeSelection_WithEmptyList_ThrowsArgumentException()
    {
        var vote = PollVote.Create("soc-001", "poll-001", "apt-001", "user-001", ["opt-1"]);
        var act = () => vote.ChangeSelection([]);
        act.Should().Throw<ArgumentException>();
    }
}
