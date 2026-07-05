using ApartmentManagement.Application.Interfaces;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;

namespace ApartmentManagement.Infrastructure.Services;

public sealed class BlobFileStorageService(IOptions<InfrastructureSettings> settings) : IFileStorageService
{
    private readonly InfrastructureSettings _settings = settings.Value;
    // Tracks containers already confirmed to exist — avoids a network round-trip on every upload.
    private static readonly ConcurrentDictionary<string, byte> _knownContainers = new(StringComparer.OrdinalIgnoreCase);

    public async Task<string> UploadAsync(Stream content, string fileName, string contentType, string containerName, CancellationToken ct = default)
    {
        var client = CreateContainerClient(containerName);
        if (_knownContainers.TryAdd(client.Name, 0))
            await client.CreateIfNotExistsAsync(cancellationToken: ct);

        var blobClient = client.GetBlobClient(fileName);
        content.Position = 0;
        await blobClient.UploadAsync(content, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType }
        }, ct);

        return GenerateReadUri(blobClient).ToString();
    }

    public async Task DeleteAsync(string fileUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(fileUrl))
            throw new ArgumentException("File URL is required.", nameof(fileUrl));

        var blobClient = new BlobClient(new Uri(fileUrl));
        await blobClient.DeleteIfExistsAsync(cancellationToken: ct);
    }

    public Task<string> GetUrlAsync(string blobName, string containerName, TimeSpan? expiry = null, CancellationToken ct = default)
    {
        var client = CreateContainerClient(containerName);
        var blobClient = client.GetBlobClient(blobName);
        return Task.FromResult(GenerateReadUri(blobClient, expiry).ToString());
    }

    public async Task<(Stream Content, string ContentType)> DownloadAsync(string containerName, string blobName, CancellationToken ct = default)
    {
        var client = CreateContainerClient(containerName);
        var blobClient = client.GetBlobClient(blobName);
        try
        {
            var download = await blobClient.DownloadStreamingAsync(cancellationToken: ct);
            var contentType = string.IsNullOrWhiteSpace(download.Value.Details.ContentType)
                ? "application/octet-stream"
                : download.Value.Details.ContentType;
            return (download.Value.Content, contentType);
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 404)
        {
            throw new FileNotFoundException($"Blob '{blobName}' was not found in container '{containerName}'.");
        }
    }

    private BlobContainerClient CreateContainerClient(string containerName)
    {
        if (string.IsNullOrWhiteSpace(_settings.BlobStorageConnectionString))
            throw new InvalidOperationException("Blob storage connection string is not configured.");

        var effectiveContainerName = $"{_settings.BlobStorageContainerPrefix}-{containerName}".ToLowerInvariant();
        return new BlobContainerClient(_settings.BlobStorageConnectionString, effectiveContainerName);
    }

    private static Uri GenerateReadUri(BlobClient blobClient, TimeSpan? expiry = null)
    {
        if (!blobClient.CanGenerateSasUri)
            return blobClient.Uri;

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = blobClient.BlobContainerName,
            BlobName = blobClient.Name,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(expiry ?? TimeSpan.FromDays(3650))
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);
        return blobClient.GenerateSasUri(sasBuilder);
    }
}
