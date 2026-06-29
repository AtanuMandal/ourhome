using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Application.Commands.Maintenance;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class RegisterVisitorCommandHandlerTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<IQrCodeService> _qrCodeMock = new();
    private readonly Mock<ILogger<RegisterVisitorCommandHandler>> _loggerMock = new();

    private RegisterVisitorCommandHandler CreateHandler() =>
        new(_visitorRepoMock.Object, _apartmentRepoMock.Object, _notificationMock.Object, _currentUserMock.Object, _qrCodeMock.Object,
            _eventPublisherMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidCommand_CreatesVisitorLogAndReturnsSuccess()
    {
        // Arrange
        var apartment = Apartment.Create("soc-001", "A-101", "A", 1, 3, [], 500, 600, 700);
        apartment.AssignOwner("user-001", "Resident One");

        _qrCodeMock
            .Setup(q => q.GenerateQrCodeBase64Async(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("base64qrdata");
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);
        _visitorRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((VisitorLog l, CancellationToken _) => l);

        var handler = CreateHandler();
        var command = new RegisterVisitorCommand(
            "soc-001", "John Visitor", "+91-9876543210", null,
            "Personal visit", apartment.Id, "Amazon", null, false);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();
        result.Value!.PassCode.Should().NotBeNullOrEmpty();
        result.Value.HostResidentName.Should().Be("Resident One");
        result.Value.CompanyName.Should().Be("Amazon");
        _visitorRepoMock.Verify(r => r.CreateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>()), Times.Once);
        _notificationMock.Verify(n => n.SendPushNotificationAsync("user-001", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithResidentPreApproval_CreatesApprovedPassWithoutNotification()
    {
        var apartment = Apartment.Create("soc-001", "A-101", "A", 1, 3, [], 500, 600, 700);
        apartment.AssignOwner("resident-001", "Resident User");

        _currentUserMock.SetupGet(x => x.UserId).Returns("resident-001");
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);
        _qrCodeMock
            .Setup(q => q.GenerateQrCodeBase64Async(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("base64qrdata");
        _visitorRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((VisitorLog l, CancellationToken _) => l);

        var result = await CreateHandler().Handle(new RegisterVisitorCommand(
            "soc-001", "Pre Approved Visitor", "+91-9999999999", null,
            "Guest", apartment.Id, null, "WB12AA1111", true), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("Approved");
        result.Value.IsPreApproved.Should().BeTrue();
        _notificationMock.Verify(
            n => n.SendPushNotificationAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()),
            Times.Never);
    }

    [Fact]
    public async Task Handle_WhenNotPreApproved_NotificationBodyIncludesPhoneNumber()
    {
        // Arrange
        var apartment = Apartment.Create("soc-001", "B-201", "B", 2, 3, [], 500, 600, 700);
        apartment.AssignOwner("user-002", "Resident Two");

        _qrCodeMock.Setup(q => q.GenerateQrCodeBase64Async(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync("qr");
        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(apartment);
        _visitorRepoMock.Setup(r => r.CreateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>())).ReturnsAsync((VisitorLog l, CancellationToken _) => l);

        var handler = CreateHandler();
        var command = new RegisterVisitorCommand(
            "soc-001", "Jane Visitor", "+91-9876541234", null,
            "Delivery", apartment.Id, null, null, false);

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert – notification body must contain the visitor's phone number
        _notificationMock.Verify(n => n.SendPushNotificationAsync(
            "user-002",
            It.IsAny<string>(),
            It.Is<string>(body => body.Contains("+91-9876541234")),
            It.IsAny<CancellationToken>(),
            It.IsAny<IReadOnlyDictionary<string, string>?>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_WhenNotPreApproved_NotificationDataContainsApproveAndDenyUrls()
    {
        // Arrange
        var apartment = Apartment.Create("soc-001", "C-301", "C", 3, 3, [], 500, 600, 700);
        apartment.AssignOwner("user-003", "Resident Three");

        _qrCodeMock.Setup(q => q.GenerateQrCodeBase64Async(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync("qr");
        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(apartment);

        VisitorLog? capturedLog = null;
        _visitorRepoMock.Setup(r => r.CreateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((VisitorLog l, CancellationToken _) => { capturedLog = l; return l; });

        IReadOnlyDictionary<string, string>? capturedData = null;
        _notificationMock.Setup(n => n.SendPushNotificationAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()))
            .Callback<string, string, string, CancellationToken, IReadOnlyDictionary<string, string>?>(
                (_, _, _, _, d) => capturedData = d)
            .Returns(Task.CompletedTask);

        var handler = CreateHandler();
        var command = new RegisterVisitorCommand(
            "soc-001", "Courier Guy", "+91-9000009999", null,
            "Parcel", apartment.Id, "Delhivery", null, false);

        // Act
        await handler.Handle(command, CancellationToken.None);

        // Assert – data must include action keys for approve/deny deeplinks
        capturedData.Should().NotBeNull();
        capturedData.Should().ContainKey("approveUrl");
        capturedData.Should().ContainKey("denyUrl");
        capturedData.Should().ContainKey("visitorId");
        capturedData!["action"].Should().Be("visitor-approval");
        capturedData["approveUrl"].Should().Contain("approve");
        capturedData["denyUrl"].Should().Contain("deny");
    }
}

public class CheckInVisitorCommandHandlerTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<ILogger<CheckInVisitorCommandHandler>> _loggerMock = new();

    private CheckInVisitorCommandHandler CreateHandler() =>
        new(_visitorRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithApprovedVisitorPassCode_ChecksInAndReturnsSuccess()
    {
        // Arrange
        var log = VisitorLog.Create("soc-001", "John", "+91-9876543210", null, null, "Visit", "apt-001", "host-001", "Host User", "A", 1, "A-101", false, null);
        log.Approve();
        var passCode = log.PassCode;

        _visitorRepoMock
            .Setup(r => r.GetByPassCodeAsync(passCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(log);
        _visitorRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((VisitorLog l, CancellationToken _) => l);

        var handler = CreateHandler();
        var command = new CheckInVisitorCommand("soc-001", passCode);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        log.Status.Should().Be(VisitorStatus.CheckedIn);
    }

    [Fact]
    public async Task Handle_WithInvalidPassCode_ReturnsFailure()
    {
        // Arrange: log exists but command uses a wrong passCode
        var log = VisitorLog.Create("soc-001", "John", "+91-9876543210", null, null, "Visit", "apt-001", "host-001", "Host User", "A", 1, "A-101", false, null);
        log.Approve();

        _visitorRepoMock
            .Setup(r => r.GetByPassCodeAsync("WRONG-PASS", It.IsAny<CancellationToken>()))
            .ReturnsAsync((VisitorLog?)null);

        var handler = CreateHandler();
        var command = new CheckInVisitorCommand("soc-001", "WRONG-PASS");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.InvalidPassCode);
    }

    [Fact]
    public async Task Handle_WithPendingVisitor_ReturnsFailure()
    {
        // Arrange: log exists with correct passCode but is NOT approved
        var log = VisitorLog.Create("soc-001", "John", "+91-9876543210", null, null, "Visit", "apt-001", "host-001", "Host User", "A", 1, "A-101", false, null);
        var passCode = log.PassCode;

        _visitorRepoMock
            .Setup(r => r.GetByPassCodeAsync(passCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(log);

        var handler = CreateHandler();
        var command = new CheckInVisitorCommand("soc-001", passCode);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.VisitorNotApproved);
    }

    [Fact]
    public async Task Handle_WithExpiredPass_ReturnsFailure()
    {
        // Arrange: pre-approved log with ValidUntil in the past
        var log = VisitorLog.Create("soc-001", "John", "+91-9876543210", null, null, "Visit",
            "apt-001", "host-001", "Host User", "A", 1, "A-101",
            isPreApproved: true, vehicleNumber: null,
            validUntil: DateTime.UtcNow.AddHours(-2));
        var passCode = log.PassCode;

        _visitorRepoMock
            .Setup(r => r.GetByPassCodeAsync(passCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(log);

        var result = await CreateHandler().Handle(new CheckInVisitorCommand("soc-001", passCode), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.InternalError);
    }
}

public class RegisterVisitorWithValidityTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<IQrCodeService> _qrCodeMock = new();
    private readonly Mock<ILogger<RegisterVisitorCommandHandler>> _loggerMock = new();

    private RegisterVisitorCommandHandler CreateHandler() =>
        new(_visitorRepoMock.Object, _apartmentRepoMock.Object, _notificationMock.Object,
            _currentUserMock.Object, _qrCodeMock.Object, _eventPublisherMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidityHours_SetsValidUntilOnCreatedLog()
    {
        var apartment = Apartment.Create("soc-001", "A-101", "A", 1, 3, [], 500, 600, 700);
        apartment.AssignOwner("resident-001", "Resident User");

        _currentUserMock.SetupGet(x => x.UserId).Returns("resident-001");
        _qrCodeMock.Setup(q => q.GenerateQrCodeBase64Async(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync("qr");
        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(apartment);
        _visitorRepoMock.Setup(r => r.CreateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>())).ReturnsAsync((VisitorLog l, CancellationToken _) => l);

        var before = DateTime.UtcNow.AddHours(3.9);
        var result = await CreateHandler().Handle(new RegisterVisitorCommand(
            "soc-001", "Guest", "+91-9000000001", null, "Visit", apartment.Id,
            null, null, true, ValidityHours: 4), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ValidUntil.Should().NotBeNull();
        result.Value.ValidUntil!.Value.Should().BeAfter(before);
    }

    [Fact]
    public async Task Handle_WithNoValidityHours_ValidUntilIsNull()
    {
        var apartment = Apartment.Create("soc-001", "A-101", "A", 1, 3, [], 500, 600, 700);
        apartment.AssignOwner("resident-001", "Resident User");

        _currentUserMock.SetupGet(x => x.UserId).Returns("resident-001");
        _qrCodeMock.Setup(q => q.GenerateQrCodeBase64Async(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync("qr");
        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(apartment);
        _visitorRepoMock.Setup(r => r.CreateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>())).ReturnsAsync((VisitorLog l, CancellationToken _) => l);

        var result = await CreateHandler().Handle(new RegisterVisitorCommand(
            "soc-001", "Guest", "+91-9000000002", null, "Visit", apartment.Id,
            null, null, true), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ValidUntil.Should().BeNull();
    }

    [Fact]
    public async Task Handle_WithImageUrl_SetsImageUrlOnCreatedLog()
    {
        var apartment = Apartment.Create("soc-001", "A-101", "A", 1, 3, [], 500, 600, 700);
        apartment.AssignOwner("user-001", "Resident One");

        _currentUserMock.SetupGet(x => x.UserId).Returns("user-001");
        _qrCodeMock.Setup(q => q.GenerateQrCodeBase64Async(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync("qr");
        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(apartment);
        _visitorRepoMock.Setup(r => r.CreateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>())).ReturnsAsync((VisitorLog l, CancellationToken _) => l);

        const string imageUrl = "https://storage.example.com/visitor-images/test.jpg";
        var result = await CreateHandler().Handle(new RegisterVisitorCommand(
            "soc-001", "Guest", "+91-9000000003", null, "Visit", apartment.Id,
            null, null, false, VisitorImageUrl: imageUrl), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.VisitorImageUrl.Should().Be(imageUrl);
    }
}

public class UploadVisitorImageCommandHandlerTests
{
    private readonly Mock<IFileStorageService> _fileStorageMock = new();
    private readonly Mock<ILogger<UploadVisitorImageCommandHandler>> _loggerMock = new();

    private UploadVisitorImageCommandHandler CreateHandler() =>
        new(_fileStorageMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidFile_UploadsAndReturnsUrl()
    {
        const string expectedUrl = "https://storage.example.com/visitor-images/soc-001/abc.jpg";
        _fileStorageMock
            .Setup(s => s.UploadAsync(It.IsAny<System.IO.Stream>(), It.IsAny<string>(), "image/jpeg", "visitor-images", It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedUrl);

        var content = new byte[] { 1, 2, 3, 4, 5 };
        var result = await CreateHandler().Handle(
            new UploadVisitorImageCommand("soc-001", "visitor.jpg", "image/jpeg", content),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ImageUrl.Should().Be(expectedUrl);
        result.Value.FileName.Should().Be("visitor.jpg");
    }

    [Fact]
    public async Task Handle_WhenStorageThrows_ReturnsFailure()
    {
        _fileStorageMock
            .Setup(s => s.UploadAsync(It.IsAny<System.IO.Stream>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Storage unavailable"));

        var result = await CreateHandler().Handle(
            new UploadVisitorImageCommand("soc-001", "visitor.jpg", "image/jpeg", [1, 2, 3]),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.InternalError);
    }
}

public class ApproveVisitorCommandHandlerTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<ApproveVisitorCommandHandler>> _loggerMock = new();

    private ApproveVisitorCommandHandler CreateHandler() =>
        new(_visitorRepoMock.Object, _currentUserMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_ByHostUser_ApprovesSuccessfully()
    {
        var log = VisitorLog.Create("soc-001", "Jane", "+91-9111111111", null, null, "Guest", "apt-001", "host-001", "Host", "A", 1, "A-101", false);

        _visitorRepoMock.Setup(r => r.GetByIdAsync(log.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(log);
        _visitorRepoMock.Setup(r => r.UpdateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>())).ReturnsAsync((VisitorLog l, CancellationToken _) => l);
        _currentUserMock.Setup(x => x.IsInRoles(It.IsAny<string[]>())).Returns(false);

        var result = await CreateHandler().Handle(new ApproveVisitorCommand("soc-001", log.Id, "host-001"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        log.Status.Should().Be(VisitorStatus.Approved);
    }

    [Fact]
    public async Task Handle_ByAdmin_ApprovesSuccessfully()
    {
        var log = VisitorLog.Create("soc-001", "Jane", "+91-9222222222", null, null, "Guest", "apt-001", "host-001", "Host", "A", 1, "A-101", false);

        _visitorRepoMock.Setup(r => r.GetByIdAsync(log.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(log);
        _visitorRepoMock.Setup(r => r.UpdateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>())).ReturnsAsync((VisitorLog l, CancellationToken _) => l);
        _currentUserMock.Setup(x => x.IsInRoles(It.IsAny<string[]>())).Returns(true);

        var result = await CreateHandler().Handle(new ApproveVisitorCommand("soc-001", log.Id, "admin-001"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_BySecurityRole_ApprovesSuccessfully()
    {
        var log = VisitorLog.Create("soc-001", "Jane", "+91-9288888888", null, null, "Guest", "apt-001", "host-001", "Host", "A", 1, "A-101", false);

        _visitorRepoMock.Setup(r => r.GetByIdAsync(log.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(log);
        _visitorRepoMock.Setup(r => r.UpdateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>())).ReturnsAsync((VisitorLog l, CancellationToken _) => l);
        _currentUserMock.Setup(x => x.IsInRoles("SUAdmin", "HQAdmin", "SUSecurity")).Returns(true);

        var result = await CreateHandler().Handle(new ApproveVisitorCommand("soc-001", log.Id, "security-001"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        log.Status.Should().Be(VisitorStatus.Approved);
    }

    [Fact]
    public async Task Handle_ByNonHostNonAdmin_ReturnsForbidden()
    {
        var log = VisitorLog.Create("soc-001", "Jane", "+91-9333333333", null, null, "Guest", "apt-001", "host-001", "Host", "A", 1, "A-101", false);

        _visitorRepoMock.Setup(r => r.GetByIdAsync(log.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(log);
        _currentUserMock.Setup(x => x.IsInRoles(It.IsAny<string[]>())).Returns(false);

        var result = await CreateHandler().Handle(new ApproveVisitorCommand("soc-001", log.Id, "stranger-001"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Forbidden);
    }

    [Fact]
    public async Task Handle_VisitorNotFound_ReturnsNotFound()
    {
        _visitorRepoMock.Setup(r => r.GetByIdAsync("missing", "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((VisitorLog?)null);
        _currentUserMock.Setup(x => x.IsInRoles(It.IsAny<string[]>())).Returns(false);

        var result = await CreateHandler().Handle(new ApproveVisitorCommand("soc-001", "missing", "host-001"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.VisitorNotFound);
    }
}

public class DenyVisitorCommandHandlerTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<DenyVisitorCommandHandler>> _loggerMock = new();

    private DenyVisitorCommandHandler CreateHandler() =>
        new(_visitorRepoMock.Object, _currentUserMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_ByHostUser_DeniesSuccessfully()
    {
        var log = VisitorLog.Create("soc-001", "Jake", "+91-9444444444", null, null, "Salesman", "apt-001", "host-001", "Host", "A", 1, "A-101", false);

        _visitorRepoMock.Setup(r => r.GetByIdAsync(log.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(log);
        _visitorRepoMock.Setup(r => r.UpdateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>())).ReturnsAsync((VisitorLog l, CancellationToken _) => l);
        _currentUserMock.Setup(x => x.IsInRoles(It.IsAny<string[]>())).Returns(false);

        var result = await CreateHandler().Handle(new DenyVisitorCommand("soc-001", log.Id, "host-001"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        log.Status.Should().Be(VisitorStatus.Denied);
    }

    [Fact]
    public async Task Handle_BySecurityRole_DeniesSuccessfully()
    {
        var log = VisitorLog.Create("soc-001", "Jake", "+91-9488888888", null, null, "Salesman", "apt-001", "host-001", "Host", "A", 1, "A-101", false);

        _visitorRepoMock.Setup(r => r.GetByIdAsync(log.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(log);
        _visitorRepoMock.Setup(r => r.UpdateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>())).ReturnsAsync((VisitorLog l, CancellationToken _) => l);
        _currentUserMock.Setup(x => x.IsInRoles("SUAdmin", "HQAdmin", "SUSecurity")).Returns(true);

        var result = await CreateHandler().Handle(new DenyVisitorCommand("soc-001", log.Id, "security-001"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        log.Status.Should().Be(VisitorStatus.Denied);
    }

    [Fact]
    public async Task Handle_ByNonHostNonAdmin_ReturnsForbidden()
    {
        var log = VisitorLog.Create("soc-001", "Jake", "+91-9555555555", null, null, "Visit", "apt-001", "host-001", "Host", "A", 1, "A-101", false);

        _visitorRepoMock.Setup(r => r.GetByIdAsync(log.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(log);
        _currentUserMock.Setup(x => x.IsInRoles(It.IsAny<string[]>())).Returns(false);

        var result = await CreateHandler().Handle(new DenyVisitorCommand("soc-001", log.Id, "stranger-002"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Forbidden);
    }
}

public class CheckOutVisitorCommandHandlerTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<ILogger<CheckOutVisitorCommandHandler>> _loggerMock = new();

    private CheckOutVisitorCommandHandler CreateHandler() =>
        new(_visitorRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenCheckedIn_ChecksOutSuccessfully()
    {
        var log = VisitorLog.Create("soc-001", "Kay", "+91-9666666666", null, null, "Visit", "apt-001", "host-001", "Host", "A", 1, "A-101", false);
        log.Approve();
        log.CheckIn();

        _visitorRepoMock.Setup(r => r.GetByIdAsync(log.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(log);
        _visitorRepoMock.Setup(r => r.UpdateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>())).ReturnsAsync((VisitorLog l, CancellationToken _) => l);

        var result = await CreateHandler().Handle(new CheckOutVisitorCommand("soc-001", log.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        log.Status.Should().Be(VisitorStatus.CheckedOut);
        log.CheckOutTime.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task Handle_WhenNotCheckedIn_ThrowsAndReturnsFailure()
    {
        var log = VisitorLog.Create("soc-001", "Lea", "+91-9777777777", null, null, "Visit", "apt-001", "host-001", "Host", "A", 1, "A-101", false);
        log.Approve(); // approved but not checked in

        _visitorRepoMock.Setup(r => r.GetByIdAsync(log.Id, "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync(log);

        var result = await CreateHandler().Handle(new CheckOutVisitorCommand("soc-001", log.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.InternalError);
    }

    [Fact]
    public async Task Handle_WhenVisitorNotFound_ReturnsFailure()
    {
        _visitorRepoMock.Setup(r => r.GetByIdAsync("missing", "soc-001", It.IsAny<CancellationToken>())).ReturnsAsync((VisitorLog?)null);

        var result = await CreateHandler().Handle(new CheckOutVisitorCommand("soc-001", "missing"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.VisitorNotFound);
    }
}

public class CreateMaintenanceScheduleCommandHandlerTests
{
    private readonly Mock<IMaintenanceScheduleRepository> _scheduleRepoMock = new();
    private readonly Mock<IMaintenanceChargeRepository> _chargeRepoMock = new();
    private readonly Mock<IMaintenanceChargeGridViewRepository> _gridViewRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<CreateMaintenanceScheduleCommandHandler>> _loggerMock = new();

    private CreateMaintenanceScheduleCommandHandler CreateHandler() =>
        new(_scheduleRepoMock.Object, _chargeRepoMock.Object, _gridViewRepoMock.Object, _apartmentRepoMock.Object, _currentUserMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidCommand_CreatesMaintenanceScheduleAndUpcomingCharges()
    {
        // Arrange
        var apartment = Apartment.Create("soc-001", "A-101", "A", 1, 3, [], 500, 600, 700);

        _currentUserMock.Setup(x => x.IsInRoles(It.IsAny<string[]>())).Returns(true);
        _scheduleRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<MaintenanceSchedule>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceSchedule s, CancellationToken _) => s);
        _scheduleRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);
        _apartmentRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync([apartment]);
        _chargeRepoMock
            .Setup(r => r.GetByScheduleAndPeriodAsync("soc-001", It.IsAny<string>(), apartment.Id, It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceCharge?)null);
        _chargeRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<MaintenanceCharge>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceCharge c, CancellationToken _) => c);
        _chargeRepoMock
            .Setup(r => r.GetByScheduleAsync("soc-001", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _chargeRepoMock
            .Setup(r => r.GetByDueDateRangeAsync("soc-001", It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string _, DateTime __, DateTime ___, CancellationToken ____) => new List<MaintenanceCharge>());
        _gridViewRepoMock
            .Setup(r => r.GetByFinancialYearAsync("soc-001", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceChargeGridView?)null);
        _gridViewRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<MaintenanceChargeGridView>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceChargeGridView view, CancellationToken _) => view);

        var handler = CreateHandler();
        var command = new CreateMaintenanceScheduleCommand(
            "soc-001",
            "Monthly Maintenance",
            "Monthly upkeep",
            apartment.Id,
            2500m,
            MaintenancePricingType.FixedAmount,
            null,
            FeeFrequency.Monthly,
            5,
            4,
            2026,
            9,
            2026);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Name.Should().Be("Monthly Maintenance");
        _scheduleRepoMock.Verify(r => r.CreateAsync(It.IsAny<MaintenanceSchedule>(), It.IsAny<CancellationToken>()), Times.Once);
        _chargeRepoMock.Verify(r => r.CreateAsync(It.IsAny<MaintenanceCharge>(), It.IsAny<CancellationToken>()), Times.Exactly(6));
    }
}

public class SubmitMaintenancePaymentProofCommandHandlerTests
{
    private readonly Mock<IMaintenanceChargeRepository> _chargeRepoMock = new();
    private readonly Mock<IMaintenanceChargeGridViewRepository> _gridViewRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<SubmitMaintenancePaymentProofCommandHandler>> _loggerMock = new();

    private SubmitMaintenancePaymentProofCommandHandler CreateHandler() =>
        new(_chargeRepoMock.Object, _gridViewRepoMock.Object, _apartmentRepoMock.Object, _societyRepoMock.Object, _userRepoMock.Object, _notificationMock.Object, _currentUserMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenResidentOwnsCharge_SubmitsProofAndNotifiesAdmins()
    {
        // Arrange
        var apartment = Apartment.Create("soc-001", "A-101", "A", 1, 3, [], 500, 600, 700);
        var payment = MaintenanceCharge.Create("soc-001", apartment.Id, "schedule-001", "Monthly Maintenance", 2500m, DateTime.UtcNow.AddDays(5));
        var resident = User.Create("soc-001", "Resident User", "resident@test.com", "9999999999", UserRole.SUUser, ResidentType.Owner, apartment.Id);
        var society = Society.Create("Our Home", new Domain.ValueObjects.Address("Street", "City", "State", "12345", "India"), "soc@test.com", "8888888888", 1, 10);
        society.AssignAdmin("admin-001");
        var paymentId = payment.Id;

        _currentUserMock.SetupGet(x => x.UserId).Returns(resident.Id);
        _currentUserMock.Setup(x => x.IsInRoles(It.IsAny<string[]>())).Returns(false);
        _userRepoMock
            .Setup(r => r.GetByIdAsync(resident.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(resident);
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("soc-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _chargeRepoMock
            .Setup(r => r.GetByIdAsync(paymentId, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(payment);
        _chargeRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<MaintenanceCharge>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceCharge p, CancellationToken _) => p);
        _chargeRepoMock
            .Setup(r => r.GetByDueDateRangeAsync("soc-001", It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string _, DateTime __, DateTime ___, CancellationToken ____) => new List<MaintenanceCharge> { payment });
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);
        _apartmentRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync([apartment]);
        _gridViewRepoMock
            .Setup(r => r.GetByFinancialYearAsync("soc-001", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceChargeGridView?)null);
        _gridViewRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<MaintenanceChargeGridView>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceChargeGridView view, CancellationToken _) => view);

        var handler = CreateHandler();
        var command = new SubmitMaintenancePaymentProofCommand("soc-001", [paymentId], "https://proofs.example.com/1", "UPI receipt");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        payment.Status.Should().Be(PaymentStatus.ProofSubmitted);
        payment.Proofs.Should().ContainSingle();
        _notificationMock.Verify(n => n.SendPushNotificationAsync("admin-001", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Once);
    }
}

public class MarkMaintenanceChargePaidCommandHandlerTests
{
    private readonly Mock<IMaintenanceChargeRepository> _chargeRepoMock = new();
    private readonly Mock<IMaintenanceChargeGridViewRepository> _gridViewRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<MarkMaintenanceChargePaidCommandHandler>> _loggerMock = new();

    private MarkMaintenanceChargePaidCommandHandler CreateHandler() =>
        new(_chargeRepoMock.Object, _gridViewRepoMock.Object, _apartmentRepoMock.Object, _societyRepoMock.Object, _eventPublisherMock.Object, _currentUserMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenChargeExists_MarksAsPaidAndPublishesEvent()
    {
        var apartment = Apartment.Create("soc-001", "A-101", "A", 1, 3, [], 500, 600, 700);
        var charge = MaintenanceCharge.Create("soc-001", apartment.Id, "schedule-001", "Monthly Maintenance", 2500m, DateTime.UtcNow.AddDays(5));
        var society = Society.Create("Our Home", new Domain.ValueObjects.Address("Street", "City", "State", "12345", "India"), "soc@test.com", "8888888888", 1, 10);

        _currentUserMock.Setup(x => x.IsInRoles(It.IsAny<string[]>())).Returns(true);
        _chargeRepoMock
            .Setup(r => r.GetByIdAsync(charge.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(charge);
        _chargeRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<MaintenanceCharge>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceCharge c, CancellationToken _) => c);
        _chargeRepoMock
            .Setup(r => r.GetByDueDateRangeAsync("soc-001", It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string _, DateTime __, DateTime ___, CancellationToken ____) => new List<MaintenanceCharge> { charge });
        _apartmentRepoMock
            .Setup(r => r.GetByIdAsync(apartment.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(apartment);
        _apartmentRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync([apartment]);
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("soc-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _gridViewRepoMock
            .Setup(r => r.GetByFinancialYearAsync("soc-001", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceChargeGridView?)null);
        _gridViewRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<MaintenanceChargeGridView>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceChargeGridView view, CancellationToken _) => view);

        var handler = CreateHandler();
        var command = new MarkMaintenanceChargePaidCommand("soc-001", charge.Id, "UPI", "TXN123", null, null);

        var result = await handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        charge.Status.Should().Be(PaymentStatus.Paid);
        charge.TransactionReference.Should().Be("TXN123");
        _eventPublisherMock.Verify(e => e.PublishAsync(It.IsAny<IDomainEvent>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }
}
