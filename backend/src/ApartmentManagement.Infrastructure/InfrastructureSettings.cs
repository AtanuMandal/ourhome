namespace ApartmentManagement.Infrastructure;

public sealed class InfrastructureSettings
{
    public string CosmosDbConnectionString { get; set; } = string.Empty;
    public string CosmosDbDatabaseName { get; set; } = "ApartmentManagement";
    public string AzureCommunicationConnectionString { get; set; } = string.Empty;
    public string EmailSenderAddress { get; set; } = "no-reply@apartmentmgmt.io";
    public string SmsSenderNumber { get; set; } = string.Empty;
    public string EventGridTopicEndpoint { get; set; } = string.Empty;
    public string EventGridTopicKey { get; set; } = string.Empty;
    public string AzureAdB2CTenantId { get; set; } = string.Empty;
    public string AzureAdB2CClientId { get; set; } = string.Empty;
    public string AzureAdB2CClientSecret { get; set; } = string.Empty;
    public string AzureAdB2CUserFlow { get; set; } = string.Empty;
}
