namespace ApartmentManagement.Domain.Services;

public interface IEventPublisher
{
    Task PublishAsync<TEvent>(TEvent @event, CancellationToken ct = default) where TEvent : class;
}
