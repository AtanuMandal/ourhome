using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Domain.Entities;

/// <summary>
/// A resident-triggered emergency alert. Lifecycle: Triggered -&gt; Acknowledged -&gt; Resolved,
/// or Triggered/Acknowledged -&gt; FalseAlarm (stood down by the triggering resident).
/// </summary>
public sealed class SosAlert : BaseEntity
{
    public string ApartmentId { get; private set; } = string.Empty;
    public string TriggeredByUserId { get; private set; } = string.Empty;
    public string TriggeredByUserName { get; private set; } = string.Empty;
    public SosCategory Category { get; private set; }
    public string? Note { get; private set; }
    public SosAlertStatus Status { get; private set; }

    public DateTime? AcknowledgedAt { get; private set; }
    public string? AcknowledgedByUserId { get; private set; }
    public string? AcknowledgedByUserName { get; private set; }

    /// <summary>Set when the alert is closed, whether Resolved or marked FalseAlarm.</summary>
    public DateTime? ResolvedAt { get; private set; }
    public string? ResolvedByUserId { get; private set; }
    public string? ResolvedByUserName { get; private set; }

    /// <summary>Number of times re-notified because it went unacknowledged past the escalation window.</summary>
    public int EscalationCount { get; private set; }
    public DateTime? LastEscalatedAt { get; private set; }

    private SosAlert() { }

    public static SosAlert Create(
        string societyId, string apartmentId, string triggeredByUserId, string triggeredByUserName,
        SosCategory category, string? note)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(societyId, nameof(societyId));
        ArgumentException.ThrowIfNullOrWhiteSpace(apartmentId, nameof(apartmentId));
        ArgumentException.ThrowIfNullOrWhiteSpace(triggeredByUserId, nameof(triggeredByUserId));
        ArgumentException.ThrowIfNullOrWhiteSpace(triggeredByUserName, nameof(triggeredByUserName));

        return new SosAlert
        {
            SocietyId = societyId,
            ApartmentId = apartmentId,
            TriggeredByUserId = triggeredByUserId,
            TriggeredByUserName = triggeredByUserName.Trim(),
            Category = category,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            Status = SosAlertStatus.Triggered,
        };
    }

    /// <summary>Records the first responder to take ownership of the alert.</summary>
    public void Acknowledge(string userId, string userName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId, nameof(userId));
        if (Status != SosAlertStatus.Triggered)
            throw new InvalidOperationException("Only a newly triggered alert can be acknowledged.");

        Status = SosAlertStatus.Acknowledged;
        AcknowledgedAt = DateTime.UtcNow;
        AcknowledgedByUserId = userId;
        AcknowledgedByUserName = userName;
        TouchUpdatedAt();
    }

    public void Resolve(string userId, string userName)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(userId, nameof(userId));
        if (Status is not (SosAlertStatus.Triggered or SosAlertStatus.Acknowledged))
            throw new InvalidOperationException("Only a triggered or acknowledged alert can be resolved.");

        Status = SosAlertStatus.Resolved;
        ResolvedAt = DateTime.UtcNow;
        ResolvedByUserId = userId;
        ResolvedByUserName = userName;
        TouchUpdatedAt();
    }

    /// <summary>The triggering resident stands the alert down — raised in error.</summary>
    public void MarkFalseAlarm()
    {
        if (Status is not (SosAlertStatus.Triggered or SosAlertStatus.Acknowledged))
            throw new InvalidOperationException("Only a triggered or acknowledged alert can be marked as a false alarm.");

        Status = SosAlertStatus.FalseAlarm;
        ResolvedAt = DateTime.UtcNow;
        TouchUpdatedAt();
    }

    /// <summary>Called by the escalation timer when the alert has gone unacknowledged past its window.</summary>
    public void RecordEscalation()
    {
        if (Status != SosAlertStatus.Triggered)
            throw new InvalidOperationException("Only a still-triggered alert can escalate.");

        EscalationCount++;
        LastEscalatedAt = DateTime.UtcNow;
        TouchUpdatedAt();
    }
}
