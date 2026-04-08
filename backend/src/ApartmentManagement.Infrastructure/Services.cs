using ApartmentManagement.Domain.Events;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ApartmentManagement.Infrastructure.Services;

public class OutboxEventPublisher(
    IOutboxRepository outboxRepository,
    ILogger<OutboxEventPublisher> logger) : IEventPublisher
{
    public async Task PublishAsync<T>(T domainEvent, CancellationToken ct = default) where T : IDomainEvent
    {
        try
        {
            var json = JsonSerializer.Serialize(domainEvent, domainEvent!.GetType());
            var record = OutboxRecord.Create(domainEvent.SocietyId, typeof(T).Name, json);
            await outboxRepository.CreateAsync(record, ct);
            logger.LogDebug("Queued outbox record for {EventType}", typeof(T).Name);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to queue outbox record for {EventType}", typeof(T).Name);
        }
    }

    public async Task PublishManyAsync(IEnumerable<IDomainEvent> events, CancellationToken ct = default)
    {
        foreach (var e in events)
            await PublishAsync(e, ct);
    }
}

public class QrCodeService : IQrCodeService
{
    public Task<string> GenerateQrCodeBase64Async(string data, CancellationToken ct = default)
    {
        using var generator = new QRCoder.QRCodeGenerator();
        var qrData = generator.CreateQrCode(data, QRCoder.QRCodeGenerator.ECCLevel.Q);
        using var code = new QRCoder.PngByteQRCode(qrData);
        return Task.FromResult(Convert.ToBase64String(code.GetGraphic(5)));
    }

    public bool ValidateQrCode(string qrData, string expectedData) =>
        qrData.Equals(expectedData, StringComparison.Ordinal);
}

public class InMemoryRateLimitService : IRateLimitService
{
    private readonly Dictionary<string, (int Count, DateTime Window)> _buckets = new();
    private readonly object _lock = new();
    private const int MaxPerMinute = 60;

    public Task<bool> IsAllowedAsync(string userId, string societyId, string endpoint, CancellationToken ct = default)
    {
        var key = $"{userId}:{societyId}:{endpoint}";
        lock (_lock)
        {
            var now = DateTime.UtcNow;
            var window = TimeSpan.FromMinutes(1);
            if (_buckets.TryGetValue(key, out var bucket) && (now - bucket.Window) < window)
            {
                if (bucket.Count >= MaxPerMinute) return Task.FromResult(false);
                _buckets[key] = (bucket.Count + 1, bucket.Window);
            }
            else
            {
                _buckets[key] = (1, now);
            }
            return Task.FromResult(true);
        }
    }

    public Task<int> GetRemainingCallsAsync(string userId, string endpoint, CancellationToken ct = default)
    {
        var key = $"{userId}::{endpoint}";
        lock (_lock)
        {
            var now = DateTime.UtcNow;
            var window = TimeSpan.FromMinutes(1);
            if (_buckets.TryGetValue(key, out var bucket) && (now - bucket.Window) < window)
                return Task.FromResult(Math.Max(0, MaxPerMinute - bucket.Count));
            return Task.FromResult(MaxPerMinute);
        }
    }
}

public class InMemoryCacheService : ICacheService
{
    private readonly Dictionary<string, (object Value, DateTime Expires)> _cache = new();
    private readonly object _lock = new();

    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        lock (_lock)
        {
            if (_cache.TryGetValue(key, out var entry) && entry.Expires > DateTime.UtcNow)
                return Task.FromResult((T?)entry.Value);
            return Task.FromResult(default(T?));
        }
    }

    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default)
    {
        lock (_lock)
        {
            _cache[key] = (value!, DateTime.UtcNow.Add(ttl));
            return Task.CompletedTask;
        }
    }

    public Task RemoveAsync(string key, CancellationToken ct = default)
    {
        lock (_lock)
        {
            _cache.Remove(key);
            return Task.CompletedTask;
        }
    }
}