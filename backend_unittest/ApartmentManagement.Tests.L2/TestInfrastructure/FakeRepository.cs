using System.Collections.Concurrent;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;

namespace ApartmentManagement.Tests.L2.TestInfrastructure;

/// <summary>
/// Generic thread-safe in-memory repository backed by a <see cref="ConcurrentDictionary{TKey,TValue}"/>.
/// Each subclass adds the domain-specific query methods on top of this base.
/// </summary>
public class FakeRepository<T> : IRepository<T> where T : BaseEntity
{
    public readonly ConcurrentDictionary<string, T> Store = new();

    public Task<T?> GetByIdAsync(string id, string societyId, CancellationToken ct = default)
    {
        Store.TryGetValue(id, out var entity);
        if (entity is not null && entity.SocietyId == societyId)
            return Task.FromResult<T?>(entity);
        return Task.FromResult<T?>(null);
    }

    public Task<IReadOnlyList<T>> GetAllAsync(string societyId, CancellationToken ct = default)
    {
        IReadOnlyList<T> result = Store.Values
            .Where(e => e.SocietyId == societyId)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<T> CreateAsync(T entity, CancellationToken ct = default)
    {
        Store[entity.Id] = entity;
        return Task.FromResult(entity);
    }

    public Task<T> UpdateAsync(T entity, CancellationToken ct = default)
    {
        Store[entity.Id] = entity;
        return Task.FromResult(entity);
    }

    public Task DeleteAsync(string id, string societyId, CancellationToken ct = default)
    {
        Store.TryRemove(id, out _);
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(string id, string societyId, CancellationToken ct = default)
    {
        var exists = Store.TryGetValue(id, out var entity) && entity?.SocietyId == societyId;
        return Task.FromResult(exists);
    }
}
