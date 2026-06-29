using Newtonsoft.Json;

namespace ApartmentManagement.Infrastructure;

/// <summary>Cosmos DB document representing a single browser Web Push subscription for a user.</summary>
public sealed class PushSubscriptionDocument
{
    [JsonProperty("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>Partition key — same as the society the user belongs to.</summary>
    [JsonProperty("societyId")]
    public string SocietyId { get; set; } = string.Empty;

    [JsonProperty("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>Browser push endpoint URL (unique per browser/device).</summary>
    [JsonProperty("endpoint")]
    public string Endpoint { get; set; } = string.Empty;

    [JsonProperty("p256dh")]
    public string P256dh { get; set; } = string.Empty;

    [JsonProperty("auth")]
    public string Auth { get; set; } = string.Empty;

    [JsonProperty("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
