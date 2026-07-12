using ApartmentManagement.Application.Commands.Complaint;
using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.Queries.Notice;
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

public class UpdateNoticeCommandHandlerTests
{
    private readonly Mock<INoticeRepository> _noticeRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<ILogger<UpdateNoticeCommandHandler>> _loggerMock = new();

    private UpdateNoticeCommandHandler CreateHandler() =>
        new(_noticeRepoMock.Object, _currentUserMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_AsSUAdmin_UpdatesNoticeAndReturnsSuccess()
    {
        // Arrange
        var notice = Notice.Create("soc-001", "user-001", "Old Title", "Old Content",
            NoticeCategory.General, DateTime.UtcNow.AddMinutes(-5));
        var noticeId = notice.Id;

        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(true);
        _noticeRepoMock
            .Setup(r => r.GetByIdAsync(noticeId, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(notice);
        _noticeRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Notice>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Notice n, CancellationToken _) => n);

        var handler = CreateHandler();
        var command = new UpdateNoticeCommand("soc-001", noticeId, "New Title", "New Content", null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        notice.Title.Should().Be("New Title");
        notice.Content.Should().Be("New Content");
    }

    [Fact]
    public async Task Handle_AsNonAdmin_ReturnsForbiddenAndDoesNotUpdate()
    {
        // Arrange
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(false);

        var handler = CreateHandler();
        var command = new UpdateNoticeCommand("soc-001", "notice-001", "New Title", "New Content", null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Forbidden);
        _noticeRepoMock.Verify(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}

public class GetNoticeReadReceiptsQueryHandlerTests
{
    private readonly Mock<INoticeRepository> _noticeRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();

    private GetNoticeReadReceiptsQueryHandler CreateHandler() =>
        new(_noticeRepoMock.Object, _userRepoMock.Object, _currentUserMock.Object);

    [Fact]
    public async Task Handle_AsSUAdmin_PartitionsResidentsIntoReadAndUnread()
    {
        // Arrange
        var notice = Notice.Create("soc-001", "admin-1", "Title", "Content",
            NoticeCategory.General, DateTime.UtcNow.AddMinutes(-5));

        var readUser = User.Create("soc-001", "Alice Resident", "alice@test.com", "9000000001", UserRole.SUUser, ResidentType.Owner, "apt-1");
        var unreadUser = User.Create("soc-001", "Bob Resident", "bob@test.com", "9000000002", UserRole.SUUser, ResidentType.Tenant, "apt-2");
        var adminUser = User.Create("soc-001", "Carol Admin", "carol@test.com", "9000000003", UserRole.SUAdmin, ResidentType.SocietyAdmin);
        notice.MarkAsRead(readUser.Id);

        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(true);
        _noticeRepoMock
            .Setup(r => r.GetByIdAsync(notice.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(notice);
        _userRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync([readUser, unreadUser, adminUser]);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(new GetNoticeReadReceiptsQuery("soc-001", notice.Id), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Read.Should().ContainSingle(r => r.UserId == readUser.Id && r.FullName == "Alice Resident");
        result.Value.Unread.Should().ContainSingle(r => r.FullName == "Bob Resident");
        // Admin accounts aren't residents and shouldn't appear in either list.
        result.Value.Read.Should().NotContain(r => r.FullName == "Carol Admin");
        result.Value.Unread.Should().NotContain(r => r.FullName == "Carol Admin");
    }

    [Fact]
    public async Task Handle_AsNonAdmin_ReturnsForbidden()
    {
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(false);

        var handler = CreateHandler();
        var result = await handler.Handle(new GetNoticeReadReceiptsQuery("soc-001", "notice-001"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Forbidden);
        _noticeRepoMock.Verify(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
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

public class MarkNoticeReadCommandHandlerTests
{
    private readonly Mock<INoticeRepository> _noticeRepoMock = new();
    private readonly Mock<ILogger<MarkNoticeReadCommandHandler>> _loggerMock = new();

    private MarkNoticeReadCommandHandler CreateHandler() =>
        new(_noticeRepoMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_MarksNoticeAsReadForUser()
    {
        // Arrange
        var notice = Notice.Create("soc-001", "admin-1", "Title", "Content",
            NoticeCategory.General, DateTime.UtcNow.AddMinutes(-5));

        _noticeRepoMock
            .Setup(r => r.GetByIdAsync(notice.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(notice);
        _noticeRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Notice>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Notice n, CancellationToken _) => n);

        var handler = CreateHandler();
        var command = new MarkNoticeReadCommand("soc-001", notice.Id, "user-001");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert — there is no way to express "mark unread" through this command anymore;
        // once read, a notice can only ever be read for that user.
        result.IsSuccess.Should().BeTrue();
        notice.IsReadByUser("user-001").Should().BeTrue();
    }

    [Fact]
    public async Task Handle_CalledTwice_StaysReadAndIsIdempotent()
    {
        var notice = Notice.Create("soc-001", "admin-1", "Title", "Content",
            NoticeCategory.General, DateTime.UtcNow.AddMinutes(-5));

        _noticeRepoMock
            .Setup(r => r.GetByIdAsync(notice.Id, "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(notice);
        _noticeRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Notice>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Notice n, CancellationToken _) => n);

        var handler = CreateHandler();
        var command = new MarkNoticeReadCommand("soc-001", notice.Id, "user-001");

        await handler.Handle(command, CancellationToken.None);
        var result = await handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        notice.IsReadByUser("user-001").Should().BeTrue();
    }
}
