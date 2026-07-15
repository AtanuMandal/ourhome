using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class AutoCheckOutOverdueVisitorsCommandHandlerTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<ILogger<AutoCheckOutOverdueVisitorsCommandHandler>> _loggerMock = new();

    private AutoCheckOutOverdueVisitorsCommandHandler CreateHandler() =>
        new(_visitorRepoMock.Object, _loggerMock.Object);

    private static VisitorLog CreateCheckedInVisitor(TimeSpan checkedInAgo)
    {
        var log = VisitorLog.Create("soc-001", "John Visitor", "+91-9876543210",
            null, null, "Personal visit", "apt-001", "user-001",
            "Resident User", "A", 1, "A-101", isPreApproved: true);
        log.CheckIn();
        // CheckIn stamps "now" — backdate it for the test via the private setter.
        typeof(VisitorLog).GetProperty(nameof(VisitorLog.CheckInTime))!
            .SetValue(log, DateTime.UtcNow - checkedInAgo);
        return log;
    }

    [Fact]
    public async Task Handle_VisitorCheckedInOver24Hours_AutoChecksOut()
    {
        // Arrange
        var overdue = CreateCheckedInVisitor(TimeSpan.FromHours(25));
        _visitorRepoMock
            .Setup(r => r.GetCheckedInAcrossSocietiesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([overdue]);
        _visitorRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((VisitorLog v, CancellationToken _) => v);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(new AutoCheckOutOverdueVisitorsCommand(), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(1);
        overdue.Status.Should().Be(VisitorStatus.CheckedOut);
        overdue.IsAutoCheckedOut.Should().BeTrue();
        _visitorRepoMock.Verify(r => r.UpdateAsync(overdue, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_VisitorCheckedInUnder24Hours_IsLeftCheckedIn()
    {
        // Arrange
        var recent = CreateCheckedInVisitor(TimeSpan.FromHours(6));
        _visitorRepoMock
            .Setup(r => r.GetCheckedInAcrossSocietiesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([recent]);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(new AutoCheckOutOverdueVisitorsCommand(), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(0);
        recent.Status.Should().Be(VisitorStatus.CheckedIn);
        _visitorRepoMock.Verify(r => r.UpdateAsync(It.IsAny<VisitorLog>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
