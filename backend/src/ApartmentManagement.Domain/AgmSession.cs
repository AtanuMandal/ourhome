namespace ApartmentManagement.Domain.Entities;

/// <summary>
/// Groups multiple poll resolutions under a single AGM (Annual General Meeting) session so
/// residents see them as one combined ballot rather than separate unrelated polls
/// (requirements/polls_and_voting.md — Feature #4: AGM Support).
/// </summary>
public sealed class AgmSession : BaseEntity
{
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public DateTime SessionDate { get; private set; }
    public string CreatedByUserId { get; private set; } = string.Empty;

    private AgmSession() { }

    public static AgmSession Create(string societyId, string createdByUserId, string title, string description, DateTime sessionDate)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(createdByUserId, nameof(createdByUserId));
        ArgumentException.ThrowIfNullOrWhiteSpace(title, nameof(title));

        return new AgmSession
        {
            SocietyId = societyId,
            CreatedByUserId = createdByUserId,
            Title = title.Trim(),
            Description = description?.Trim() ?? string.Empty,
            SessionDate = sessionDate,
        };
    }
}
