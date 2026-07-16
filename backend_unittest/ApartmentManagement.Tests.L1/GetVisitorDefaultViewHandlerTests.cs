using ApartmentManagement.Application.Queries.Visitor;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using FluentAssertions;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class GetVisitorDefaultViewQueryHandlerTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();

    private GetVisitorDefaultViewQueryHandler CreateHandler() =>
        new(_visitorRepoMock.Object, _societyRepoMock.Object);

    private static VisitorLog CreateVisitor(string name, VisitorStatus status, DateTime createdAt, string apartmentId = "apt-001")
    {
        var log = VisitorLog.Create("soc-001", name, "+91-9876543210",
            null, null, "Personal visit", apartmentId, "user-001",
            "Resident User", "A", 1, "A-101", isPreApproved: false);
        typeof(VisitorLog).GetProperty(nameof(VisitorLog.Status))!.SetValue(log, status);
        typeof(VisitorLog).GetProperty(nameof(VisitorLog.CreatedAt))!.SetValue(log, createdAt);
        return log;
    }

    [Fact]
    public async Task Handle_ReturnsAllPendingAndCheckedInPlusRecentConcluded_FromOneRepositoryRead()
    {
        // Arrange — old Pending/CheckedIn must never age out; concluded entries cap at RecentCount.
        var now = DateTime.UtcNow;
        var visitors = new List<VisitorLog>
        {
            CreateVisitor("Pending Old", VisitorStatus.Pending, now.AddDays(-30)),
            CreateVisitor("CheckedIn Old", VisitorStatus.CheckedIn, now.AddDays(-20)),
            CreateVisitor("Approved Recent", VisitorStatus.Approved, now.AddDays(-1)),
            CreateVisitor("Denied Recent", VisitorStatus.Denied, now.AddDays(-2)),
            CreateVisitor("CheckedOut Older", VisitorStatus.CheckedOut, now.AddDays(-3)),
        };
        _visitorRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(visitors);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(
            new GetVisitorDefaultViewQuery("soc-001", null, RecentCount: 2), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Select(v => v.VisitorName).Should().BeEquivalentTo(
            "Pending Old", "CheckedIn Old", "Approved Recent", "Denied Recent");
        _visitorRepoMock.Verify(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithApartmentId_ScopesTheViewToThatApartment()
    {
        // Arrange — residents only ever see their own apartment's visitors.
        var now = DateTime.UtcNow;
        var visitors = new List<VisitorLog>
        {
            CreateVisitor("Mine", VisitorStatus.Pending, now, "apt-001"),
            CreateVisitor("Someone Else's", VisitorStatus.Pending, now, "apt-002"),
        };
        _visitorRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(visitors);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(
            new GetVisitorDefaultViewQuery("soc-001", "apt-001", RecentCount: 25), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Should().OnlyContain(v => v.VisitorName == "Mine");
    }

    [Fact]
    public async Task Handle_NonPositiveRecentCount_FallsBackToDefaultOf25()
    {
        // Arrange — 30 concluded entries; an unset/invalid recentCount must not return them all.
        var now = DateTime.UtcNow;
        var visitors = Enumerable.Range(1, 30)
            .Select(i => CreateVisitor($"Approved {i}", VisitorStatus.Approved, now.AddMinutes(-i)))
            .ToList();
        _visitorRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(visitors);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(
            new GetVisitorDefaultViewQuery("soc-001", null, RecentCount: 0), CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Should().HaveCount(25);
        result.Value![0].VisitorName.Should().Be("Approved 1"); // newest first
    }
}
