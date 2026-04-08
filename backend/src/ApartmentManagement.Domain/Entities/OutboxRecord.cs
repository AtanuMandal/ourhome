namespace ApartmentManagement.Domain.Entities;

/// <summary>
/// Transactional outbox record. Written atomically with business data;
/// the Cosmos DB Change Feed picks it up and publishes to Event Grid.
/// </summary>
public class OutboxRecord : BaseEntity
{
    public string EventType { get; set; } = string.Empty;
    public string EventData { get; set; } = string.Empty;

    /// <summary>Pending → Published | Failed</summary>
    public string Status { get; set; } = "Pending";

    public DateTime? PublishedAt { get; set; }
    public int RetryCount { get; set; }

    private OutboxRecord() { }

    public static OutboxRecord Create(string societyId, string eventType, string eventData)
        => new()
        {
            Id = Guid.NewGuid().ToString(),
            SocietyId = societyId,
            EventType = eventType,
            EventData = eventData,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

    public void MarkPublished()
    {
        Status = "Published";
        PublishedAt = DateTime.UtcNow;
        TouchUpdatedAt();
    }

    public void MarkFailed()
    {
        Status = "Failed";
        RetryCount++;
        TouchUpdatedAt();
    }
}
