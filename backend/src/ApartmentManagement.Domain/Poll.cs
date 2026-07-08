using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Domain.Entities;

public sealed record PollOption(string Id, string Text);

/// <summary>
/// A community poll or AGM e-voting resolution. Lifecycle: Scheduled -&gt; Open -&gt; Closed.
/// </summary>
public sealed class Poll : BaseEntity
{
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public PollType Type { get; private set; }

    public IReadOnlyList<PollOption> Options { get; private set; } = [];

    public DateTime OpensAt { get; private set; }
    public DateTime ClosesAt { get; private set; }
    public PollEligibilityUnit EligibilityUnit { get; private set; }
    public PollAnonymity Anonymity { get; private set; }
    public PollVisibility Visibility { get; private set; }
    public string? LinkedNoticeId { get; private set; }
    public double? QuorumThresholdPercent { get; private set; }
    public bool IsAgmResolution { get; private set; }
    public bool AllowVoteChange { get; private set; }
    public string CreatedByUserId { get; private set; } = string.Empty;

    /// <summary>When set, groups this resolution under an AgmSession so residents see it as one combined ballot.</summary>
    public string? AgmSessionId { get; private set; }

    public PollStatus Status { get; private set; }
    public DateTime? ClosedAt { get; private set; }
    public bool ResultsPublished { get; private set; }
    public DateTime? ReminderSentAt { get; private set; }

    public int? EligibleCountAtClose { get; private set; }
    public int? ParticipantCountAtClose { get; private set; }
    public PollOutcome? Outcome { get; private set; }

    private Poll() { }

    public static Poll Create(
        string societyId, string createdByUserId, string title, string description, PollType type,
        IReadOnlyList<string> optionTexts, DateTime opensAt, DateTime closesAt,
        PollEligibilityUnit eligibilityUnit, PollAnonymity anonymity, PollVisibility visibility,
        string? linkedNoticeId, double? quorumThresholdPercent, bool isAgmResolution, bool allowVoteChange,
        string? agmSessionId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(createdByUserId, nameof(createdByUserId));
        ArgumentException.ThrowIfNullOrWhiteSpace(title, nameof(title));
        if (optionTexts.Count < 2)
            throw new ArgumentException("A poll requires at least 2 options.", nameof(optionTexts));
        if (closesAt <= opensAt)
            throw new ArgumentException("closesAt must be after opensAt.", nameof(closesAt));
        if (quorumThresholdPercent is < 0 or > 100)
            throw new ArgumentException("Quorum threshold must be between 0 and 100.", nameof(quorumThresholdPercent));

        var poll = new Poll
        {
            SocietyId = societyId,
            CreatedByUserId = createdByUserId,
            Title = title.Trim(),
            Description = description?.Trim() ?? string.Empty,
            Type = type,
            OpensAt = opensAt,
            ClosesAt = closesAt,
            EligibilityUnit = eligibilityUnit,
            Anonymity = anonymity,
            Visibility = visibility,
            LinkedNoticeId = string.IsNullOrWhiteSpace(linkedNoticeId) ? null : linkedNoticeId,
            QuorumThresholdPercent = quorumThresholdPercent,
            IsAgmResolution = isAgmResolution,
            AllowVoteChange = allowVoteChange,
            AgmSessionId = string.IsNullOrWhiteSpace(agmSessionId) ? null : agmSessionId,
            Status = opensAt <= DateTime.UtcNow ? PollStatus.Open : PollStatus.Scheduled,
        };

        poll.Options = optionTexts.Select(text => new PollOption(Guid.NewGuid().ToString(), text.Trim())).ToList();
        return poll;
    }

    /// <summary>Called by the status timer when a Scheduled poll's opensAt has arrived.</summary>
    public void Activate()
    {
        if (Status != PollStatus.Scheduled)
            throw new InvalidOperationException("Only a scheduled poll can be activated.");
        Status = PollStatus.Open;
        TouchUpdatedAt();
    }

    // Time-based rather than Status-based so voting works the instant opensAt arrives, without
    // waiting on the minutely status timer to flip Scheduled -> Open. Status == Closed remains
    // authoritative for an early manual close, which can happen before closesAt.
    public bool IsCurrentlyOpen(DateTime nowUtc) =>
        Status != PollStatus.Closed && nowUtc >= OpensAt && nowUtc < ClosesAt;

    /// <summary>
    /// Closes voting (either explicitly by SUAdmin, or automatically once closesAt has passed) and
    /// evaluates quorum. A quorum-configured poll is marked NoQuorum if participation fell short;
    /// otherwise the leading option's votes are compared against a simple majority of participants
    /// to determine Passed/Failed. Polls with no quorum threshold configured get no Outcome — just a tally.
    /// </summary>
    public void Close(int eligibleCount, int participantCount, int leadingOptionVoteCount)
    {
        if (Status != PollStatus.Open)
            throw new InvalidOperationException("Only an open poll can be closed.");

        Status = PollStatus.Closed;
        ClosedAt = DateTime.UtcNow;
        EligibleCountAtClose = eligibleCount;
        ParticipantCountAtClose = participantCount;

        if (QuorumThresholdPercent.HasValue)
        {
            var participationPercent = eligibleCount == 0 ? 0 : participantCount * 100.0 / eligibleCount;
            Outcome = participationPercent < QuorumThresholdPercent.Value
                ? PollOutcome.NoQuorum
                : (participantCount > 0 && leadingOptionVoteCount * 2 > participantCount ? PollOutcome.Passed : PollOutcome.Failed);
        }

        TouchUpdatedAt();
    }

    public void PublishResults()
    {
        if (Status != PollStatus.Closed)
            throw new InvalidOperationException("Only a closed poll's results can be published.");
        if (ResultsPublished)
            throw new InvalidOperationException("Results have already been published.");

        ResultsPublished = true;
        TouchUpdatedAt();
    }

    public void MarkReminderSent()
    {
        ReminderSentAt = DateTime.UtcNow;
        TouchUpdatedAt();
    }
}
