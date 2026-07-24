using ApartmentManagement.Application.Queries.Visitor;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Models;
using FluentAssertions;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

/// <summary>
/// Visitors no longer get auto-checked-out on an overstay timer — instead the list surfaces
/// overstaying visitors first so security sees the red warning without scrolling.
/// </summary>
public class VisitorOverstaySortingTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();

    private static VisitorLog CreateCheckedInVisitor(string name, DateTime checkInTime, string apartmentId = "apt-001")
    {
        var log = VisitorLog.Create("soc-001", name, "+91-9876543210",
            null, null, "Personal visit", apartmentId, "user-001",
            "Resident User", "A", 1, "A-101", isPreApproved: false);
        log.Approve();
        log.CheckIn();
        typeof(VisitorLog).GetProperty(nameof(VisitorLog.CheckInTime))!.SetValue(log, checkInTime);
        typeof(VisitorLog).GetProperty(nameof(VisitorLog.CreatedAt))!.SetValue(log, checkInTime);
        return log;
    }

    [Fact]
    public async Task GetVisitorsBySociety_OverstayingVisitor_IsSortedBeforeNewerRecords()
    {
        // Arrange — a visitor checked in 10 hours ago (past the 5-hour default threshold) must
        // rank above a visitor created moments ago, even though it is older.
        var now = DateTime.UtcNow;
        var overstaying = CreateCheckedInVisitor("Overstaying Guest", now.AddHours(-10));
        var recent = CreateCheckedInVisitor("Recent Guest", now.AddMinutes(-5));

        _visitorRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VisitorLog> { recent, overstaying });
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("soc-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society?)null);

        var handler = new GetVisitorsBySocietyQueryHandler(_visitorRepoMock.Object, _societyRepoMock.Object);

        // Act
        var result = await handler.Handle(
            new GetVisitorsBySocietyQuery("soc-001", null, null, null, null, null, null,
                new PaginationParams { Page = 1, PageSize = 20 }),
            CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Items[0].VisitorName.Should().Be("Overstaying Guest");
        result.Value!.Items[0].IsOverstay.Should().BeTrue();
    }

    [Fact]
    public async Task GetActiveVisitors_OverstayingVisitor_IsSortedBeforeNewerCheckIns()
    {
        var now = DateTime.UtcNow;
        var overstaying = CreateCheckedInVisitor("Overstaying Guest", now.AddHours(-10));
        var recent = CreateCheckedInVisitor("Recent Guest", now.AddMinutes(-5));

        _visitorRepoMock
            .Setup(r => r.GetActiveVisitorsAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VisitorLog> { recent, overstaying });
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("soc-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society?)null);

        var handler = new GetActiveVisitorsQueryHandler(_visitorRepoMock.Object, _societyRepoMock.Object);

        // Act
        var result = await handler.Handle(new GetActiveVisitorsQuery("soc-001"), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value![0].VisitorName.Should().Be("Overstaying Guest");
        result.Value![0].IsOverstay.Should().BeTrue();
    }
}
