using System.Text.Json.Serialization;
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

    /// <summary>
    /// In-memory-only optimistic-concurrency token, populated from the Cosmos SDK's response
    /// headers by <c>GetByIdAsync</c>/<c>CreateAsync</c>/<c>UpdateAsync</c>. Must never be
    /// persisted into the document body: a query-based read (<c>ExecuteQueryAsync</c>) has no
    /// per-item response header to source it from, so if this property round-trips through the
    /// document JSON, a later query fetch would rehydrate a stale value left over from a prior
    /// write — and a subsequent single-item <c>UpdateAsync</c> would send that stale value as
    /// If-Match, failing with 412 Precondition Failed against the document's real, since-bumped
    /// system `_etag` (this is exactly what broke a second OTP-login request).
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.Always)]
    public string? ETag { get; set; }

    /// <summary>Read-only view of uncommitted domain events.</summary>
    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    protected void AddDomainEvent(IDomainEvent @event) => _domainEvents.Add(@event);

    /// <summary>Clears domain events after they have been published.</summary>
    public void ClearDomainEvents() => _domainEvents.Clear();

    public void TouchUpdatedAt() => UpdatedAt = DateTime.UtcNow;
}
