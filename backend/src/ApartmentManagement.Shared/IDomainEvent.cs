namespace ApartmentManagement.Shared.Common;

public interface IDomainEvent
{
    DateTime OccurredAt { get; }
}
