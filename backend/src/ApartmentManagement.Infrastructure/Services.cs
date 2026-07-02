using ApartmentManagement.Domain.Events;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ApartmentManagement.Infrastructure.Services;

public class JwtAuthService(IOptions<InfrastructureSettings> options) : IAuthService
{
    private readonly InfrastructureSettings _s = options.Value;

    public string GenerateOtp()
    {
        var bytes = new byte[4];
        RandomNumberGenerator.Fill(bytes);
        var num = BitConverter.ToUInt32(bytes) % 1_000_000;
        return num.ToString("D6");
    }

    public Task<string> GenerateJwtTokenAsync(
        string userId, string email, string role, string societyId,
        string? apartmentId = null, CancellationToken ct = default)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_s.JwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub,   userId),
            new(JwtRegisteredClaimNames.Email, email),
            new(ClaimTypes.Role,               role),
            new("societyId",                   societyId),
            new(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
        };

        if (!string.IsNullOrWhiteSpace(apartmentId))
            claims.Add(new Claim("apartmentId", apartmentId));

        var token = new JwtSecurityToken(
            issuer:            _s.JwtIssuer,
            audience:          _s.JwtAudience,
            claims:            claims,
            expires:           DateTime.UtcNow.AddHours(_s.JwtExpiryHours),
            signingCredentials: creds);

        return Task.FromResult(new JwtSecurityTokenHandler().WriteToken(token));
    }

    public Task<bool> ValidateTokenAsync(string token, CancellationToken ct = default)
    {
        try
        {
            var key     = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_s.JwtSecret));
            var handler = new JwtSecurityTokenHandler();
            handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey         = key,
                ValidateIssuer           = true,
                ValidIssuer              = _s.JwtIssuer,
                ValidateAudience         = true,
                ValidAudience            = _s.JwtAudience,
                ValidateLifetime         = true,
                ClockSkew                = TimeSpan.Zero,
            }, out _);
            return Task.FromResult(true);
        }
        catch { return Task.FromResult(false); }
    }

    public Task<string> GenerateInviteTokenAsync(string societyId, string? apartmentId = null, CancellationToken ct = default)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_s.JwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim("type", "invite"),
            new Claim("societyId", societyId),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        if (!string.IsNullOrWhiteSpace(apartmentId))
            claims.Add(new Claim("apartmentId", apartmentId));

        var token = new JwtSecurityToken(
            issuer: _s.JwtIssuer,
            audience: _s.JwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds);

        return Task.FromResult(new JwtSecurityTokenHandler().WriteToken(token));
    }

    public Task<InviteTokenClaims?> ValidateInviteTokenAsync(string token, CancellationToken ct = default)
    {
        try
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_s.JwtSecret));
            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = _s.JwtIssuer,
                ValidateAudience = true,
                ValidAudience = _s.JwtAudience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
            }, out _);

            var typeClaim = principal.FindFirst("type")?.Value;
            if (typeClaim != "invite") return Task.FromResult<InviteTokenClaims?>(null);

            var sid = principal.FindFirst("societyId")?.Value;
            if (string.IsNullOrWhiteSpace(sid)) return Task.FromResult<InviteTokenClaims?>(null);

            var apt = principal.FindFirst("apartmentId")?.Value;
            return Task.FromResult<InviteTokenClaims?>(new InviteTokenClaims(sid, apt));
        }
        catch { return Task.FromResult<InviteTokenClaims?>(null); }
    }

    public string HashPassword(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        var salt = RandomNumberGenerator.GetBytes(16);
        var derived = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password),
            salt,
            100_000,
            HashAlgorithmName.SHA256,
            32);

        return $"{Convert.ToBase64String(salt)}:{Convert.ToBase64String(derived)}";
    }

    public bool VerifyPassword(string password, string hash)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(hash))
            return false;

        var parts = hash.Split(':', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2)
            return false;

        try
        {
            var salt = Convert.FromBase64String(parts[0]);
            var expected = Convert.FromBase64String(parts[1]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(
                Encoding.UTF8.GetBytes(password),
                salt,
                100_000,
                HashAlgorithmName.SHA256,
                expected.Length);

            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch
        {
            return false;
        }
    }
}

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

    public Task PublishManyAsync(IEnumerable<IDomainEvent> events, CancellationToken ct = default)
        => Task.WhenAll(events.Select(e => PublishAsync(e, ct)));
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
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    public Task<bool> IsAllowedAsync(string userId, string societyId, string endpoint, CancellationToken ct = default)
    {
        var key = $"{userId}:{societyId}:{endpoint}";
        lock (_lock)
        {
            var now = DateTime.UtcNow;
            // Evict expired buckets on every write to prevent unbounded growth.
            foreach (var expired in _buckets.Where(kv => (now - kv.Value.Window) >= Window).Select(kv => kv.Key).ToList())
                _buckets.Remove(expired);

            if (_buckets.TryGetValue(key, out var bucket) && (now - bucket.Window) < Window)
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

    public Task<int> GetRemainingCallsAsync(string userId, string societyId, string endpoint, CancellationToken ct = default)
    {
        var key = $"{userId}:{societyId}:{endpoint}";
        lock (_lock)
        {
            var now = DateTime.UtcNow;
            if (_buckets.TryGetValue(key, out var bucket) && (now - bucket.Window) < Window)
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
            if (_cache.TryGetValue(key, out var entry))
            {
                if (entry.Expires > DateTime.UtcNow)
                    return Task.FromResult((T?)entry.Value);
                _cache.Remove(key); // evict stale entry on read
            }
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
