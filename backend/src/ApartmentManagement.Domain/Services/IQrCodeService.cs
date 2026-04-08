namespace ApartmentManagement.Domain.Services;

public interface IQrCodeService
{
    Task<string> GenerateQrCodeBase64Async(string content, CancellationToken ct = default);
    bool ValidateQrCode(string content, string expectedContent);
}
