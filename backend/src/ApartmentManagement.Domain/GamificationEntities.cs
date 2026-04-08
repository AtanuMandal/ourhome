using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Domain.Entities;

/// <summary>An inter-apartment competition event.</summary>
public sealed class Competition : BaseEntity
{
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }
    public CompetitionStatus Status { get; private set; }
    public string CreatedByUserId { get; private set; } = string.Empty;
    public string Prize { get; private set; } = string.Empty;
    public int? MaxParticipants { get; private set; }

    private Competition() { }

    public static Competition Create(string societyId, string createdByUserId, string title,
        string description, DateTime startDate, DateTime endDate, string prize, int? maxParticipants = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(title, nameof(title));
        if (endDate <= startDate) throw new ArgumentException("End date must be after start date.");
        if (maxParticipants.HasValue && maxParticipants.Value < 2)
            throw new ArgumentOutOfRangeException(nameof(maxParticipants), "Must have at least 2 participants.");

        return new Competition
        {
            SocietyId = societyId,
            CreatedByUserId = createdByUserId,
            Title = title.Trim(),
            Description = description,
            StartDate = startDate,
            EndDate = endDate,
            Prize = prize,
            MaxParticipants = maxParticipants,
            Status = CompetitionStatus.Upcoming
        };
    }

    public void Start()
    {
        if (Status != CompetitionStatus.Upcoming)
            throw new InvalidOperationException("Only upcoming competitions can be started.");
        Status = CompetitionStatus.Active;
        TouchUpdatedAt();
    }

    public void Complete() { Status = CompetitionStatus.Completed; TouchUpdatedAt(); }
    public void Cancel() { Status = CompetitionStatus.Cancelled; TouchUpdatedAt(); }
}

/// <summary>A resident's entry into a competition.</summary>
public sealed class CompetitionEntry : BaseEntity
{
    public string CompetitionId { get; private set; } = string.Empty;
    public string ApartmentId { get; private set; } = string.Empty;
    public string UserId { get; private set; } = string.Empty;
    public decimal Score { get; private set; }
    public int? Rank { get; private set; }
    public DateTime RegisteredAt { get; private set; }

    private CompetitionEntry() { }

    public static CompetitionEntry Create(string societyId, string competitionId, string apartmentId, string userId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        return new CompetitionEntry
        {
            SocietyId = societyId,
            CompetitionId = competitionId,
            ApartmentId = apartmentId,
            UserId = userId,
            Score = 0m,
            RegisteredAt = DateTime.UtcNow
        };
    }

    public void UpdateScore(decimal score) { Score = score; TouchUpdatedAt(); }
    public void SetRank(int rank) { Rank = rank; TouchUpdatedAt(); }
}

/// <summary>A reward points record for a user.</summary>
public sealed class RewardPoints : BaseEntity
{
    public string UserId { get; private set; } = string.Empty;
    public string ApartmentId { get; private set; } = string.Empty;
    public int Points { get; private set; }
    public string Reason { get; private set; } = string.Empty;

    private RewardPoints() { }

    /// <summary>Creates a reward entry. Points can be negative for redemptions.</summary>
    public static RewardPoints Create(string societyId, string userId, string apartmentId, int points, string reason)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(reason, nameof(reason));

        var rp = new RewardPoints
        {
            SocietyId = societyId,
            UserId = userId,
            ApartmentId = apartmentId,
            Points = points,
            Reason = reason
        };
        if (points > 0) rp.AddDomainEvent(new PointsAwardedEvent(userId, societyId, points, reason));
        return rp;
    }
}
