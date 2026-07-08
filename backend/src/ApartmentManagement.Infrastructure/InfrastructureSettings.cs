namespace ApartmentManagement.Infrastructure;

public sealed class InfrastructureSettings
{
    public string CosmosDbConnectionString { get; set; } = string.Empty;

    // One Cosmos account (one connection string above), split into several databases so no
    // single database exceeds ~10 containers. See CosmosDatabaseGroup for what lives where.
    public string CosmosDbIdentityDatabaseName { get; set; } = "ApartmentManagement-Identity";
    public string CosmosDbOperationsDatabaseName { get; set; } = "ApartmentManagement-Operations";
    public string CosmosDbStaffDatabaseName { get; set; } = "ApartmentManagement-Staff";
    public string CosmosDbFinanceDatabaseName { get; set; } = "ApartmentManagement-Finance";
    public string CosmosDbEngagementDatabaseName { get; set; } = "ApartmentManagement-Engagement";
    public string CosmosDbPlatformDatabaseName { get; set; } = "ApartmentManagement-Platform";

    public string GetDatabaseName(CosmosDatabaseGroup group) => group switch
    {
        CosmosDatabaseGroup.Identity => CosmosDbIdentityDatabaseName,
        CosmosDatabaseGroup.Operations => CosmosDbOperationsDatabaseName,
        CosmosDatabaseGroup.Staff => CosmosDbStaffDatabaseName,
        CosmosDatabaseGroup.Finance => CosmosDbFinanceDatabaseName,
        CosmosDatabaseGroup.Engagement => CosmosDbEngagementDatabaseName,
        CosmosDatabaseGroup.Platform => CosmosDbPlatformDatabaseName,
        _ => throw new ArgumentOutOfRangeException(nameof(group), group, "Unknown Cosmos database group."),
    };

    public string AzureCommunicationConnectionString { get; set; } = string.Empty;
    public string BlobStorageConnectionString { get; set; } = string.Empty;
    public string BlobStorageContainerPrefix { get; set; } = "apartment-management";
    public string EmailSenderAddress { get; set; } = "no-reply@apartmentmgmt.io";
    public string SmsSenderNumber { get; set; } = string.Empty;
    public string EventGridTopicEndpoint { get; set; } = string.Empty;
    public string EventGridTopicKey { get; set; } = string.Empty;
    public string AzureAdB2CTenantId { get; set; } = string.Empty;
    public string AzureAdB2CClientId { get; set; } = string.Empty;
    public string AzureAdB2CClientSecret { get; set; } = string.Empty;
    public string AzureAdB2CUserFlow { get; set; } = string.Empty;

    // VAPID (Web Push) — generate with WebPush.VapidHelper.GenerateVapidKeys()
    public string VapidPublicKey { get; set; } = string.Empty;
    public string VapidPrivateKey { get; set; } = string.Empty;
    public string VapidSubject { get; set; } = "mailto:admin@apartmentmgmt.io";

    // JWT
    public string JwtSecret { get; set; } = "uastfdays35667a0s8p9da8sdioasodipo9";
    public string JwtIssuer { get; set; } = "apartment-management";
    public string JwtAudience { get; set; } = "apartment-management-app";
    public int JwtExpiryHours { get; set; } = 24;

    // Dev-only test data seeding — off by default everywhere, including production.
    // Must be explicitly enabled (e.g. in local.settings.json) to expose the seed endpoint.
    public bool AllowTestDataSeeding { get; set; } = false;
}
