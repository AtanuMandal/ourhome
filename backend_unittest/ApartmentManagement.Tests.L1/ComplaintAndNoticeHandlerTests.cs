using ApartmentManagement.Application.Commands.Complaint;
using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class CreateComplaintCommandHandlerTests
{
    private readonly Mock<IComplaintRepository> _complaintRepoMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<ILogger<CreateComplaintCommandHandler>> _loggerMock = new();

    private CreateComplaintCommandHandler CreateHandler() =>
        new(_complaintRepoMock.Object, _eventPublisherMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidCommand_CreatesComplaintAndReturnsSuccess()
    {
        // Arrange
        var societyId = "soc-001";
        _complaintRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Complaint>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Complaint c, CancellationToken _) => c);

        var handler = CreateHandler();
        var command = new CreateComplaintCommand(societyId, "apt-001", "user-001",
            "Leaking Pipe", "Bathroom pipe is leaking", ComplaintCategory.Maintenance,
            ComplaintPriority.High, []);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _complaintRepoMock.Verify(r => r.CreateAsync(It.IsAny<Complaint>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenRepositoryThrows_ReturnsInternalError()
    {
        // Arrange
        _complaintRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Complaint>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("DB error"));

        var handler = CreateHandler();
        var command = new CreateComplaintCommand("soc-001", "apt-001", "user-001",
            "Title", "Desc", ComplaintCategory.Noise, ComplaintPriority.Low, []);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.InternalError);
    }
}

public class AssignComplaintCommandHandlerTests
{
    private readonly Mock<IComplaintRepository> _complaintRepoMock = new();
    private readonly Mock<ILogger<AssignComplaintCommandHandler>> _loggerMock = new();

    private AssignComplaintCommandHandler CreateHandler() =>
        new(_complaintRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenComplaintExists_AssignsAndReturnsSuccess()
    {
        // Arrange
        var societyId = "soc-001";
        var complaint = Complaint.Create(societyId, "apt-001", "user-001",
            "Title", "Desc", ComplaintCategory.Noise, ComplaintPriority.Medium);
        var complaintId = complaint.Id;

        _complaintRepoMock
            .Setup(r => r.GetByIdAsync(complaintId, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(complaint);
        _complaintRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Complaint>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Complaint c, CancellationToken _) => c);

        var handler = CreateHandler();
        var command = new AssignComplaintCommand(societyId, complaintId, "staff-001");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        complaint.AssignedToUserId.Should().Be("staff-001");
        complaint.Status.Should().Be(ComplaintStatus.InProgress);
    }

    [Fact]
    public async Task Handle_WhenComplaintNotFound_ReturnsFailure()
    {
        // Arrange
        _complaintRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Complaint?)null);

        var handler = CreateHandler();
        var command = new AssignComplaintCommand("soc-001", "invalid-id", "staff-001");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ComplaintNotFound);
    }
}

public class CreateNoticeCommandHandlerTests
{
    private readonly Mock<INoticeRepository> _noticeRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<ILogger<CreateNoticeCommandHandler>> _loggerMock = new();

    private CreateNoticeCommandHandler CreateHandler() =>
        new(_noticeRepoMock.Object, _notificationMock.Object, _eventPublisherMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WithValidCommand_CreatesNoticeAndReturnsSuccess()
    {
        // Arrange
        _noticeRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Notice>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Notice n, CancellationToken _) => n);

        var handler = CreateHandler();
        var command = new CreateNoticeCommand(
            "soc-001", "user-001", "Water Shutdown",
            "Water will be off tomorrow", NoticeCategory.Maintenance,
            DateTime.UtcNow, null, []);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _noticeRepoMock.Verify(r => r.CreateAsync(It.IsAny<Notice>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}

public class ArchiveNoticeCommandHandlerTests
{
    private readonly Mock<INoticeRepository> _noticeRepoMock = new();
    private readonly Mock<ILogger<ArchiveNoticeCommandHandler>> _loggerMock = new();

    private ArchiveNoticeCommandHandler CreateHandler() =>
        new(_noticeRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenNoticeExists_ArchivesAndReturnsSuccess()
    {
        // Arrange
        var notice = Notice.Create("soc-001", "user-001", "Title", "Content",
            NoticeCategory.General, DateTime.UtcNow.AddMinutes(-5));
        var noticeId = notice.Id;

        _noticeRepoMock
            .Setup(r => r.GetByIdAsync(noticeId, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(notice);
        _noticeRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Notice>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Notice n, CancellationToken _) => n);

        var handler = CreateHandler();
        var command = new ArchiveNoticeCommand("soc-001", noticeId);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        notice.IsArchived.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_WhenNoticeNotFound_ReturnsFailure()
    {
        // Arrange
        _noticeRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Notice?)null);

        var handler = CreateHandler();
        var command = new ArchiveNoticeCommand("soc-001", "invalid-id");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.NoticeNotFound);
    }
}
