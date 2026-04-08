namespace ApartmentManagement.Shared.Common;

public abstract class Entity
{
    private readonly List<IDomainEvent> _domainEvents = new();

    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    public void AddDomainEvent(IDomainEvent domainEvent) => _domainEvents.Add(domainEvent);

    public void ClearDomainEvents() => _domainEvents.Clear();
}

public abstract class Entity<TId> : Entity
{
    public TId Id { get; protected set; } = default!;
}
