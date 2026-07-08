namespace ApartmentManagement.Domain.Entities;

/// <summary>
/// One vote per eligible unit (apartment or resident, per the poll's eligibility setting) per poll —
/// the audit record kept regardless of the poll's anonymity setting (see Poll.Anonymity). For
/// Anonymous polls this identity-to-choice link is never exposed via any API response — only the
/// aggregate tally is.
/// </summary>
public sealed class PollVote : BaseEntity
{
    public string PollId { get; private set; } = string.Empty;

    /// <summary>ApartmentId when the poll is PerApartment, otherwise the voter's own UserId.</summary>
    public string EligibleUnitId { get; private set; } = string.Empty;

    public string VoterUserId { get; private set; } = string.Empty;

    public IReadOnlyList<string> SelectedOptionIds { get; private set; } = [];

    public DateTime VotedAt => CreatedAt;

    private PollVote() { }

    public static PollVote Create(
        string societyId, string pollId, string eligibleUnitId, string voterUserId, IReadOnlyList<string> selectedOptionIds)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(pollId, nameof(pollId));
        ArgumentException.ThrowIfNullOrWhiteSpace(eligibleUnitId, nameof(eligibleUnitId));
        ArgumentException.ThrowIfNullOrWhiteSpace(voterUserId, nameof(voterUserId));
        if (selectedOptionIds.Count == 0)
            throw new ArgumentException("At least one option must be selected.", nameof(selectedOptionIds));

        var vote = new PollVote
        {
            SocietyId = societyId,
            PollId = pollId,
            EligibleUnitId = eligibleUnitId,
            VoterUserId = voterUserId,
            SelectedOptionIds = selectedOptionIds.ToList(),
        };
        return vote;
    }

    public void ChangeSelection(IReadOnlyList<string> selectedOptionIds)
    {
        if (selectedOptionIds.Count == 0)
            throw new ArgumentException("At least one option must be selected.", nameof(selectedOptionIds));

        SelectedOptionIds = selectedOptionIds.ToList();
        TouchUpdatedAt();
    }
}
