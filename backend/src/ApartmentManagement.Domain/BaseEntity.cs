using ApartmentManagement.Domain.Events;

namespace ApartmentManagement.Domain.Entities;

/// <summary>Base class for all domain entities. Manages identity, timestamps, ETag and domain events.</summary>
public abstract class BaseEntity
{
    private readonly List<IDomainEvent> _domainEvents = [];

    /// <summary>Unique identifier (Guid string).</summary>
    public string Id { get; protected set; } = Guid.NewGuid().ToString();

    /// <summary>Society partition key — scopes ALL data to a single society (multi-tenancy).</summary>
    public string SocietyId { get; protected set; } = string.Empty;

    public DateTime CreatedAt { get; protected set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; protected set; } = DateTime.UtcNow;

    /// <summary>Cosmos DB ETag for optimistic concurrency control.</summary>
    public string? ETag { get; set; }

    /// <summary>Read-only view of uncommitted domain events.</summary>
    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    protected void AddDomainEvent(IDomainEvent @event) => _domainEvents.Add(@event);

    /// <summary>Clears domain events after they have been published.</summary>
    public void ClearDomainEvents() => _domainEvents.Clear();

    public void TouchUpdatedAt() => UpdatedAt = DateTime.UtcNow;
}
