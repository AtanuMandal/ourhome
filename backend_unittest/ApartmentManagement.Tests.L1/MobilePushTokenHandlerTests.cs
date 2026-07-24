using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Infrastructure;
using ApartmentManagement.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace ApartmentManagement.Tests.L1.Infrastructure;

public class MobilePushTokenHandlerTests
{
    private readonly Mock<IMobilePushTokenStore> _mobilePushTokenStoreMock = new();
    private readonly Mock<IPushSubscriptionStore> _pushSubscriptionStoreMock = new();
    private readonly Mock<IOptions<InfrastructureSettings>> _settingsMock = new();
    private readonly Mock<IEmailSender> _emailSenderMock = new();
    private readonly Mock<ILogger<NotificationService>> _loggerMock = new();

    public MobilePushTokenHandlerTests()
    {
        _settingsMock.Setup(s => s.Value).Returns(new InfrastructureSettings());
    }

    private NotificationService CreateService() =>
        new(_settingsMock.Object, _emailSenderMock.Object, _pushSubscriptionStoreMock.Object,
            _mobilePushTokenStoreMock.Object, _loggerMock.Object);

    [Fact]
    public async Task SaveMobilePushToken_CallsUpsertOnStore()
    {
        // Arrange
        MobilePushTokenDocument? captured = null;
        _mobilePushTokenStoreMock
            .Setup(s => s.UpsertAsync(It.IsAny<MobilePushTokenDocument>(), It.IsAny<CancellationToken>()))
            .Callback<MobilePushTokenDocument, CancellationToken>((doc, _) => captured = doc)
            .Returns(Task.CompletedTask);

        var service = CreateService();

        // Act
        await service.SaveMobilePushTokenAsync(
            "user-001", "society-001", "android", "fcm-token-xyz", "1.2.3");

        // Assert
        _mobilePushTokenStoreMock.Verify(
            s => s.UpsertAsync(It.IsAny<MobilePushTokenDocument>(), It.IsAny<CancellationToken>()),
            Times.Once);
        captured.Should().NotBeNull();
        captured!.UserId.Should().Be("user-001");
        captured.SocietyId.Should().Be("society-001");
        captured.Platform.Should().Be("android");
        captured.Token.Should().Be("fcm-token-xyz");
        captured.AppVersion.Should().Be("1.2.3");
        captured.Id.Should().StartWith("user-001_");
    }

    [Fact]
    public async Task DeleteMobilePushToken_CallsDeleteOnStore()
    {
        // Arrange
        _mobilePushTokenStoreMock
            .Setup(s => s.DeleteByTokenAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var service = CreateService();

        // Act
        await service.DeleteMobilePushTokenAsync("user-001", "society-001", "fcm-token-xyz");

        // Assert
        _mobilePushTokenStoreMock.Verify(
            s => s.DeleteByTokenAsync("fcm-token-xyz", "society-001", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SendMobilePushNotification_WhenNoTokens_DoesNotThrow()
    {
        // Arrange
        _mobilePushTokenStoreMock
            .Setup(s => s.GetByUserIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var service = CreateService();

        // Act
        var act = async () =>
            await service.SendMobilePushNotificationAsync(
                "user-001", "society-001", "Test Title", "Test Body");

        // Assert
        await act.Should().NotThrowAsync();
        _mobilePushTokenStoreMock.Verify(
            s => s.GetByUserIdAsync("user-001", "society-001", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SendMobilePushNotification_WithTokens_LogsStubMessage()
    {
        // Arrange
        var tokens = new List<MobilePushTokenDocument>
        {
            new() { Id = "user-001_abc", UserId = "user-001", SocietyId = "society-001",
                    Platform = "android", Token = "fcm-token-aaa" },
            new() { Id = "user-001_def", UserId = "user-001", SocietyId = "society-001",
                    Platform = "ios",     Token = "apns-token-bbb" }
        };

        _mobilePushTokenStoreMock
            .Setup(s => s.GetByUserIdAsync("user-001", "society-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(tokens);

        var service = CreateService();

        // Act
        var act = async () =>
            await service.SendMobilePushNotificationAsync(
                "user-001", "society-001", "Maintenance Due", "A new charge has been added.");

        // Assert: stub should not throw; it should simply log and return.
        await act.Should().NotThrowAsync();
        _mobilePushTokenStoreMock.Verify(
            s => s.GetByUserIdAsync("user-001", "society-001", It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
