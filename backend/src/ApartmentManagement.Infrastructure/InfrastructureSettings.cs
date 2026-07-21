namespace ApartmentManagement.Infrastructure;

public sealed class InfrastructureSettings
{
    public string CosmosDbConnectionString { get; set; } = string.Empty;

    // One Cosmos account, one database — every container lives here.
    public string CosmosDbDatabaseName { get; set; } = "apartment-management";

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

    // OpenTelemetry (see requirements/telemetry_observability.md).
    // Empty OtelExporterOtlpEndpoint disables OTLP export — spans/logs are still created
    // (errorId population keeps working) but nothing is shipped anywhere. Point this at
    // infra/observability/docker-compose.yml's OTLP HTTP port (http://localhost:4318) locally,
    // or at the production Collector's endpoint.
    public string OtelExporterOtlpEndpoint { get; set; } = string.Empty;
    public string OtelServiceName { get; set; } = "ourhome-functions";

    // Client telemetry relay (POST /telemetry/client-events) — shared secret the web/mobile
    // apps never see; the relay endpoint itself still requires a valid user JWT to call it,
    // this is a second, cheap guard against the endpoint being probed directly.
    public bool TelemetryRelayEnabled { get; set; } = true;
}
