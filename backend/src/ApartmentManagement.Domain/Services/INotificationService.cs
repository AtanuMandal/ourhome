namespace ApartmentManagement.Domain.Services;

public interface INotificationService
{
    Task SendEmailAsync(string to, string subject, string body, CancellationToken ct = default);
    Task SendSmsAsync(string phoneNumber, string message, CancellationToken ct = default);
    Task SendPushNotificationAsync(string userId, string title, string message, CancellationToken ct = default);
    Task SendBulkEmailAsync(IEnumerable<string> recipients, string subject, string body, CancellationToken ct = default);
    Task SendBulkSmsAsync(IEnumerable<string> phoneNumbers, string message, CancellationToken ct = default);
}
