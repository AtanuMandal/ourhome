using Newtonsoft.Json;

namespace ApartmentManagement.Infrastructure;

/// <summary>Cosmos DB document representing a mobile push token (FCM/APNs) for a user.</summary>
public sealed class MobilePushTokenDocument
{
    /// <summary>Deterministic ID: {userId}_{16-char Base64url hash of token}.</summary>
    [JsonProperty("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>Partition key — same as the society the user belongs to.</summary>
    [JsonProperty("societyId")]
    public string SocietyId { get; set; } = string.Empty;

    [JsonProperty("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>"android" or "ios".</summary>
    [JsonProperty("platform")]
    public string Platform { get; set; } = string.Empty;

    /// <summary>FCM or APNs device token.</summary>
    [JsonProperty("token")]
    public string Token { get; set; } = string.Empty;

    [JsonProperty("appVersion")]
    public string? AppVersion { get; set; }

    [JsonProperty("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
