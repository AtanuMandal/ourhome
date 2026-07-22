using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Application.Queries.Maintenance;
using ApartmentManagement.Application.Queries.Visitor;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class HttpHelpersParseUpdatedSinceTests
{
    private static HttpRequest RequestWithQuery(string? updatedSince)
    {
        var context = new DefaultHttpContext();
        if (updatedSince is not null)
            context.Request.QueryString = new QueryString($"?updatedSince={Uri.EscapeDataString(updatedSince)}");
        return context.Request;
    }

    [Fact]
    public void ParseUpdatedSince_ValidIsoUtcTimestamp_ParsesToUtcDateTime()
    {
        var request = RequestWithQuery("2026-07-22T09:15:00Z");

        var parsed = request.ParseUpdatedSince();

        parsed.Should().Be(new DateTime(2026, 7, 22, 9, 15, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void ParseUpdatedSince_Absent_ReturnsNull()
    {
        var request = RequestWithQuery(null);

        request.ParseUpdatedSince().Should().BeNull();
    }

    [Fact]
    public void ParseUpdatedSince_Unparsable_ReturnsNull()
    {
        var request = RequestWithQuery("not-a-date");

        request.ParseUpdatedSince().Should().BeNull();
    }
}

/// <summary>
/// `updatedSince` delta/auto-refresh behavior on list queries — see requirements/auto_refresh.md.
/// These cover the server-side contract: filtering by UpdatedAt and the 10-minute server-side
/// clamp regardless of what the client requests. Client-side merge behavior is covered by web
/// and mobile unit tests for the shared `mergeById` utility.
/// </summary>
public class GetVisitorsBySocietyQueryHandlerDeltaTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();

    private static VisitorLog CreateVisitor(string name, DateTime updatedAt, string apartmentId = "apt-001")
    {
        var log = VisitorLog.Create("soc-001", name, "+91-9876543210",
            null, null, "Personal visit", apartmentId, "user-001",
            "Resident User", "A", 1, "A-101", isPreApproved: false);
        typeof(VisitorLog).GetProperty(nameof(VisitorLog.UpdatedAt))!.SetValue(log, updatedAt);
        return log;
    }

    private static VisitorLog CreateVisitor(string name, VisitorStatus status, DateTime updatedAt, string apartmentId = "apt-001")
    {
        var log = CreateVisitor(name, updatedAt, apartmentId);
        typeof(VisitorLog).GetProperty(nameof(VisitorLog.Status))!.SetValue(log, status);
        return log;
    }

    [Fact]
    public async Task Handle_WithUpdatedSince_ReturnsOnlyRecentlyChangedVisitors_Unpaginated()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var recentlyChanged = CreateVisitor("Recently Changed", now.AddMinutes(-2));
        var olderThanRequestedSince = CreateVisitor("Older Than Requested Since", now.AddMinutes(-8));

        _visitorRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VisitorLog> { recentlyChanged, olderThanRequestedSince });
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("soc-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society?)null);

        var handler = new GetVisitorsBySocietyQueryHandler(_visitorRepoMock.Object, _societyRepoMock.Object);

        // Act — ask for changes in the last 5 minutes only
        var result = await handler.Handle(
            new GetVisitorsBySocietyQuery("soc-001", null, null, null, null, null, null,
                new PaginationParams { Page = 1, PageSize = 20 }, now.AddMinutes(-5)),
            CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle();
        result.Value.Items[0].VisitorName.Should().Be("Recently Changed");
        // Delta responses are unpaginated — Page/PageSize/TotalCount reflect the actual (small)
        // result set, not the request's normal paging.
        result.Value.Page.Should().Be(1);
        result.Value.PageSize.Should().Be(1);
        result.Value.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task Handle_WithUpdatedSinceOlderThanTenMinutes_ClampsServerSide_ExcludesOlderChanges()
    {
        // Arrange — a client asking for "since 2 hours ago" must still only get the last 10 minutes.
        var now = DateTime.UtcNow;
        var withinTenMinutes = CreateVisitor("Within Window", now.AddMinutes(-9));
        var beyondTenMinutes = CreateVisitor("Beyond Window", now.AddMinutes(-30));

        _visitorRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VisitorLog> { withinTenMinutes, beyondTenMinutes });
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("soc-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society?)null);

        var handler = new GetVisitorsBySocietyQueryHandler(_visitorRepoMock.Object, _societyRepoMock.Object);

        // Act
        var result = await handler.Handle(
            new GetVisitorsBySocietyQuery("soc-001", null, null, null, null, null, null,
                new PaginationParams { Page = 1, PageSize = 20 }, now.AddHours(-2)),
            CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle();
        result.Value.Items[0].VisitorName.Should().Be("Within Window");
    }

    [Fact]
    public async Task Handle_WithUpdatedSinceAndActiveStatusFilter_StillReturnsRecordsThatNoLongerMatchTheFilter()
    {
        // Arrange — a client is viewing "Pending only" (Status filter active) and, while polling,
        // one of those visitors gets approved. If the delta query re-applied the Status filter
        // before checking UpdatedAt, this record would vanish from the delta entirely and the
        // client's stale "Pending" row would never be corrected. It must still come back so the
        // client can evict/update it locally (see requirements/auto_refresh.md "stillVisible").
        var now = DateTime.UtcNow;
        var justApproved = CreateVisitor("Just Approved", VisitorStatus.Approved, now.AddMinutes(-1));
        var stillPendingButUntouched = CreateVisitor("Still Pending", VisitorStatus.Pending, now.AddDays(-1));

        _visitorRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VisitorLog> { justApproved, stillPendingButUntouched });
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("soc-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society?)null);

        var handler = new GetVisitorsBySocietyQueryHandler(_visitorRepoMock.Object, _societyRepoMock.Object);

        // Act — same request the client sent for its "Pending only" view, now with updatedSince
        var result = await handler.Handle(
            new GetVisitorsBySocietyQuery("soc-001", null, null, null, "Pending", null, null,
                new PaginationParams { Page = 1, PageSize = 20 }, now.AddMinutes(-5)),
            CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle();
        result.Value.Items[0].VisitorName.Should().Be("Just Approved");
    }

    [Fact]
    public async Task Handle_WithoutUpdatedSince_UsesNormalPagedPath()
    {
        // Arrange — absence of updatedSince must be indistinguishable from today's behavior.
        var now = DateTime.UtcNow;
        var visitor = CreateVisitor("Anyone", now.AddDays(-30));

        _visitorRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VisitorLog> { visitor });
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
        result.Value!.Items.Should().ContainSingle();
        result.Value.PageSize.Should().Be(20); // the requested page size, not a delta-shaped result
    }
}

public class GetVisitorDefaultViewQueryHandlerDeltaTests
{
    private readonly Mock<IVisitorLogRepository> _visitorRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();

    private static VisitorLog CreateVisitor(string name, VisitorStatus status, DateTime updatedAt, string apartmentId = "apt-001")
    {
        var log = VisitorLog.Create("soc-001", name, "+91-9876543210",
            null, null, "Personal visit", apartmentId, "user-001",
            "Resident User", "A", 1, "A-101", isPreApproved: false);
        typeof(VisitorLog).GetProperty(nameof(VisitorLog.Status))!.SetValue(log, status);
        typeof(VisitorLog).GetProperty(nameof(VisitorLog.UpdatedAt))!.SetValue(log, updatedAt);
        return log;
    }

    [Fact]
    public async Task Handle_WithUpdatedSince_ReturnsChangedVisitorsRegardlessOfStatus()
    {
        // Arrange — a visitor that just concluded (e.g. CheckedOut) must still come back in the
        // delta so the client can notice the status transition and drop it from its own view,
        // even though a normal (non-delta) default view only shows Pending/CheckedIn plus the N
        // most recent concluded entries.
        var now = DateTime.UtcNow;
        var justConcluded = CreateVisitor("Just Concluded", VisitorStatus.CheckedOut, now.AddMinutes(-1));
        var untouchedPending = CreateVisitor("Untouched Pending", VisitorStatus.Pending, now.AddDays(-1));

        _visitorRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<VisitorLog> { justConcluded, untouchedPending });
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("soc-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society?)null);

        var handler = new GetVisitorDefaultViewQueryHandler(_visitorRepoMock.Object, _societyRepoMock.Object);

        // Act
        var result = await handler.Handle(
            new GetVisitorDefaultViewQuery("soc-001", null, RecentCount: 25, UpdatedSince: now.AddMinutes(-5)),
            CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Should().ContainSingle();
        result.Value![0].VisitorName.Should().Be("Just Concluded");
    }
}

public class GetMaintenanceChargesQueryHandlerDeltaTests
{
    private readonly Mock<IMaintenanceChargeRepository> _chargeRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();

    private const string SocietyId = "soc-001";

    private GetMaintenanceChargesQueryHandler CreateHandler() =>
        new(_chargeRepoMock.Object, _apartmentRepoMock.Object, _societyRepoMock.Object, _currentUserMock.Object);

    [Fact]
    public async Task Handle_WithUpdatedSince_ReturnsOnlyRecentlyChangedCharges_Unpaginated()
    {
        // Arrange
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(true);
        var society = Society.Create(SocietyId, new Address("1 Main St", "Mumbai", "MH", "400001", "India"),
            "admin@test.com", "9876543210", 1, 10);
        _societyRepoMock.Setup(r => r.GetByIdAsync(SocietyId, SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync(society);

        var apt = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        var dueDate = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc);
        var justPaid = MaintenanceCharge.Create(SocietyId, apt.Id, "sched-1", "Monthly Maintenance", 5000m, dueDate);
        justPaid.MarkPaid("Cash", null, null); // bumps UpdatedAt to DateTime.UtcNow internally
        var untouched = MaintenanceCharge.Create(SocietyId, apt.Id, "sched-2", "Sinking Fund", 1000m, dueDate);
        typeof(MaintenanceCharge).GetProperty(nameof(MaintenanceCharge.UpdatedAt))!.SetValue(untouched, DateTime.UtcNow.AddDays(-1));

        _chargeRepoMock
            .Setup(r => r.GetBySocietyAsync(SocietyId, 1, 10_000, null, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([justPaid, untouched]);
        _apartmentRepoMock.Setup(r => r.GetAllAsync(SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync([apt]);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(
            new GetMaintenanceChargesQuery(SocietyId, null, null, null, null,
                new PaginationParams { Page = 1, PageSize = 20 }, DateTime.UtcNow.AddMinutes(-5)),
            CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle();
        result.Value.Items[0].Amount.Should().Be(5000m);
        result.Value.Page.Should().Be(1);
        result.Value.PageSize.Should().Be(1);

        // Delta path fetches an unbounded batch to filter in memory, not the request's own page size.
        _chargeRepoMock.Verify(r => r.GetBySocietyAsync(SocietyId, 1, 10_000, null, null, null, null, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithUpdatedSinceAndActiveStatusFilter_StillReturnsChargesThatNoLongerMatchTheFilter()
    {
        // Arrange — a client is viewing "Pending only" (Status filter active) and, while
        // polling, one of those charges gets paid. If the delta query re-applied the Status
        // filter before checking UpdatedAt, this record would vanish from the delta entirely and
        // the client's stale "Pending" row would never be corrected.
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(true);
        var society = Society.Create(SocietyId, new Address("1 Main St", "Mumbai", "MH", "400001", "India"),
            "admin@test.com", "9876543210", 1, 10);
        _societyRepoMock.Setup(r => r.GetByIdAsync(SocietyId, SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync(society);

        var apt = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        var dueDate = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc);
        var justPaid = MaintenanceCharge.Create(SocietyId, apt.Id, "sched-1", "Monthly Maintenance", 5000m, dueDate);
        justPaid.MarkPaid("Cash", null, null);
        var stillPendingButUntouched = MaintenanceCharge.Create(SocietyId, apt.Id, "sched-2", "Sinking Fund", 1000m, dueDate);
        typeof(MaintenanceCharge).GetProperty(nameof(MaintenanceCharge.UpdatedAt))!.SetValue(stillPendingButUntouched, DateTime.UtcNow.AddDays(-1));

        _chargeRepoMock
            .Setup(r => r.GetBySocietyAsync(SocietyId, 1, 10_000, null, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([justPaid, stillPendingButUntouched]);
        _apartmentRepoMock.Setup(r => r.GetAllAsync(SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync([apt]);

        var handler = CreateHandler();

        // Act — same "Pending only" filter the client's view is using, now with updatedSince
        var result = await handler.Handle(
            new GetMaintenanceChargesQuery(SocietyId, null, null, null, PaymentStatus.Pending,
                new PaginationParams { Page = 1, PageSize = 20 }, DateTime.UtcNow.AddMinutes(-5)),
            CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle();
        result.Value.Items[0].Amount.Should().Be(5000m);
    }
}

public class GetApartmentMaintenanceHistoryQueryHandlerDeltaTests
{
    private readonly Mock<IMaintenanceChargeRepository> _chargeRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();

    private const string SocietyId = "soc-001";

    [Fact]
    public async Task Handle_WithUpdatedSince_ReturnsOnlyRecentlyChangedCharges()
    {
        // Arrange
        var apt = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        var society = Society.Create(SocietyId, new Address("1 Main St", "Mumbai", "MH", "400001", "India"),
            "admin@test.com", "9876543210", 1, 10);
        _societyRepoMock.Setup(r => r.GetByIdAsync(SocietyId, SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync(society);
        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apt.Id, SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync(apt);

        var dueDate = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc);
        var justPaid = MaintenanceCharge.Create(SocietyId, apt.Id, "sched-1", "Monthly Maintenance", 5000m, dueDate);
        justPaid.MarkPaid("Cash", null, null);
        var untouched = MaintenanceCharge.Create(SocietyId, apt.Id, "sched-2", "Sinking Fund", 1000m, dueDate);
        typeof(MaintenanceCharge).GetProperty(nameof(MaintenanceCharge.UpdatedAt))!.SetValue(untouched, DateTime.UtcNow.AddDays(-1));

        _chargeRepoMock
            .Setup(r => r.GetByApartmentAsync(SocietyId, apt.Id, 1, 10_000, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([justPaid, untouched]);

        var handler = new GetApartmentMaintenanceHistoryQueryHandler(
            _chargeRepoMock.Object, _apartmentRepoMock.Object, _societyRepoMock.Object);

        // Act
        var result = await handler.Handle(
            new GetApartmentMaintenanceHistoryQuery(SocietyId, apt.Id, null, null,
                new PaginationParams { Page = 1, PageSize = 20 }, DateTime.UtcNow.AddMinutes(-5)),
            CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().ContainSingle();
        result.Value.Items[0].Amount.Should().Be(5000m);
    }
}

public class GetMaintenanceChargeGridQueryHandlerDeltaTests
{
    private readonly Mock<IMaintenanceChargeGridViewRepository> _gridViewRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();

    private const string SocietyId = "soc-001";

    private GetMaintenanceChargeGridQueryHandler CreateHandler() =>
        new(_gridViewRepoMock.Object, _apartmentRepoMock.Object, _societyRepoMock.Object, _currentUserMock.Object);

    private void SetupSociety() =>
        _societyRepoMock.Setup(r => r.GetByIdAsync(SocietyId, SocietyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Society.Create(SocietyId, new Address("1 Main St", "Mumbai", "MH", "400001", "India"),
                "admin@test.com", "9876543210", 1, 10));

    private static List<MaintenanceChargeGridChargeDto> AllCharges(MaintenanceChargeGridDto grid) =>
        grid.Rows.SelectMany(row => row.Months).SelectMany(month => month.Charges).ToList();

    [Fact]
    public async Task Handle_WithUpdatedSince_ReturnsOnlySparseRowsForChangedCharges()
    {
        // Arrange
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(true);
        SetupSociety();

        var apt1 = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        var apt2 = Apartment.Create(SocietyId, "102", "A", 1, 2, [], 500, 600, 700);
        _apartmentRepoMock.Setup(r => r.GetAllAsync(SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync([apt1, apt2]);

        var now = DateTime.UtcNow;
        var dueDate = now.Date.AddDays(5);
        var justPaid = new MaintenanceChargeGridView.GridCharge(
            "charge-1", "sched-1", "Monthly Maintenance", 5000m, "Paid", dueDate,
            now, "Cash", null, null, null, [], null, null, now.AddMinutes(-1));
        var untouched = new MaintenanceChargeGridView.GridCharge(
            "charge-2", "sched-1", "Monthly Maintenance", 3000m, "Pending", dueDate,
            null, null, null, null, null, [], null, null, now.AddDays(-1));

        var row1 = new MaintenanceChargeGridView.GridRow(apt1.Id, apt1.ToDisplayLabel(), apt1.BlockName, apt1.FloorNumber, "Owner One",
            [new MaintenanceChargeGridView.GridCell(now.Month, now.Year, [justPaid])]);
        var row2 = new MaintenanceChargeGridView.GridRow(apt2.Id, apt2.ToDisplayLabel(), apt2.BlockName, apt2.FloorNumber, "Owner Two",
            [new MaintenanceChargeGridView.GridCell(now.Month, now.Year, [untouched])]);

        var financialYearStart = now.Month >= 4 ? now.Year : now.Year - 1;
        var gridView = MaintenanceChargeGridView.Create(SocietyId, financialYearStart,
            new DateTime(financialYearStart, 4, 1), new DateTime(financialYearStart + 1, 3, 31), [now.Month], [row1, row2]);
        _gridViewRepoMock.Setup(r => r.GetByFinancialYearAsync(SocietyId, financialYearStart, It.IsAny<CancellationToken>()))
            .ReturnsAsync(gridView);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(
            new GetMaintenanceChargeGridQuery(SocietyId, financialYearStart, null, null, null, null, null, null, now.AddMinutes(-5)),
            CancellationToken.None);

        // Assert — apt2's untouched charge/row is dropped entirely; only apt1's change survives.
        result.IsSuccess.Should().BeTrue();
        result.Value!.Rows.Should().ContainSingle();
        result.Value.Rows[0].ApartmentId.Should().Be(apt1.Id);
        var charges = AllCharges(result.Value);
        charges.Should().ContainSingle();
        charges[0].Id.Should().Be("charge-1");
    }

    [Fact]
    public async Task Handle_WithUpdatedSinceAndActiveStatusFilter_StillReturnsChargesThatNoLongerMatchTheFilter()
    {
        // Arrange — a client viewing "Pending only" needs to see a charge that just got paid so
        // it can evict it locally, even though it no longer matches a literal Status=Pending filter.
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(true);
        SetupSociety();

        var apt = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        _apartmentRepoMock.Setup(r => r.GetAllAsync(SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync([apt]);

        var now = DateTime.UtcNow;
        var dueDate = now.Date.AddDays(5);
        var justPaid = new MaintenanceChargeGridView.GridCharge(
            "charge-1", "sched-1", "Monthly Maintenance", 5000m, "Paid", dueDate,
            now, "Cash", null, null, null, [], null, null, now.AddMinutes(-1));

        var row = new MaintenanceChargeGridView.GridRow(apt.Id, apt.ToDisplayLabel(), apt.BlockName, apt.FloorNumber, "Owner One",
            [new MaintenanceChargeGridView.GridCell(now.Month, now.Year, [justPaid])]);

        var financialYearStart = now.Month >= 4 ? now.Year : now.Year - 1;
        var gridView = MaintenanceChargeGridView.Create(SocietyId, financialYearStart,
            new DateTime(financialYearStart, 4, 1), new DateTime(financialYearStart + 1, 3, 31), [now.Month], [row]);
        _gridViewRepoMock.Setup(r => r.GetByFinancialYearAsync(SocietyId, financialYearStart, It.IsAny<CancellationToken>()))
            .ReturnsAsync(gridView);

        var handler = CreateHandler();

        // Act — same "Pending only" filter the client's view is using, now with updatedSince
        var result = await handler.Handle(
            new GetMaintenanceChargeGridQuery(SocietyId, financialYearStart, null, null, null, PaymentStatus.Pending, null, null, now.AddMinutes(-5)),
            CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        var charges = AllCharges(result.Value!);
        charges.Should().ContainSingle();
        charges[0].Id.Should().Be("charge-1");
    }

    [Fact]
    public async Task Handle_WithUpdatedSinceOlderThanTenMinutes_ClampsServerSide_ExcludesOlderChanges()
    {
        // Arrange
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(true);
        SetupSociety();

        var apt = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        _apartmentRepoMock.Setup(r => r.GetAllAsync(SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync([apt]);

        var now = DateTime.UtcNow;
        var dueDate = now.Date.AddDays(5);
        var withinTenMinutes = new MaintenanceChargeGridView.GridCharge(
            "charge-1", "sched-1", "Monthly Maintenance", 5000m, "Pending", dueDate,
            null, null, null, null, null, [], null, null, now.AddMinutes(-9));
        var beyondTenMinutes = new MaintenanceChargeGridView.GridCharge(
            "charge-2", "sched-1", "Monthly Maintenance", 3000m, "Pending", dueDate,
            null, null, null, null, null, [], null, null, now.AddMinutes(-30));

        var row = new MaintenanceChargeGridView.GridRow(apt.Id, apt.ToDisplayLabel(), apt.BlockName, apt.FloorNumber, "Owner One",
            [new MaintenanceChargeGridView.GridCell(now.Month, now.Year, [withinTenMinutes, beyondTenMinutes])]);

        var financialYearStart = now.Month >= 4 ? now.Year : now.Year - 1;
        var gridView = MaintenanceChargeGridView.Create(SocietyId, financialYearStart,
            new DateTime(financialYearStart, 4, 1), new DateTime(financialYearStart + 1, 3, 31), [now.Month], [row]);
        _gridViewRepoMock.Setup(r => r.GetByFinancialYearAsync(SocietyId, financialYearStart, It.IsAny<CancellationToken>()))
            .ReturnsAsync(gridView);

        var handler = CreateHandler();

        // Act — a client asking for "since 2 hours ago" must still only get the last 10 minutes.
        var result = await handler.Handle(
            new GetMaintenanceChargeGridQuery(SocietyId, financialYearStart, null, null, null, null, null, null, now.AddHours(-2)),
            CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        var charges = AllCharges(result.Value!);
        charges.Should().ContainSingle();
        charges[0].Id.Should().Be("charge-1");
    }

    [Fact]
    public async Task Handle_WithUpdatedSinceAndApartmentIdScoping_OnlyReturnsChangesWithinThatApartment()
    {
        // Arrange — ApartmentId is stable scoping (a charge's apartment never changes), so it is
        // always re-applied in delta mode, unlike Status/FromDate/ToDate.
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(true);
        SetupSociety();

        var apt1 = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        var apt2 = Apartment.Create(SocietyId, "102", "A", 1, 2, [], 500, 600, 700);
        _apartmentRepoMock.Setup(r => r.GetAllAsync(SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync([apt1, apt2]);

        var now = DateTime.UtcNow;
        var dueDate = now.Date.AddDays(5);
        var changedInApt1 = new MaintenanceChargeGridView.GridCharge(
            "charge-1", "sched-1", "Monthly Maintenance", 5000m, "Paid", dueDate,
            now, "Cash", null, null, null, [], null, null, now.AddMinutes(-1));
        var changedInApt2 = new MaintenanceChargeGridView.GridCharge(
            "charge-2", "sched-1", "Monthly Maintenance", 3000m, "Paid", dueDate,
            now, "Cash", null, null, null, [], null, null, now.AddMinutes(-1));

        var row1 = new MaintenanceChargeGridView.GridRow(apt1.Id, apt1.ToDisplayLabel(), apt1.BlockName, apt1.FloorNumber, "Owner One",
            [new MaintenanceChargeGridView.GridCell(now.Month, now.Year, [changedInApt1])]);
        var row2 = new MaintenanceChargeGridView.GridRow(apt2.Id, apt2.ToDisplayLabel(), apt2.BlockName, apt2.FloorNumber, "Owner Two",
            [new MaintenanceChargeGridView.GridCell(now.Month, now.Year, [changedInApt2])]);

        var financialYearStart = now.Month >= 4 ? now.Year : now.Year - 1;
        var gridView = MaintenanceChargeGridView.Create(SocietyId, financialYearStart,
            new DateTime(financialYearStart, 4, 1), new DateTime(financialYearStart + 1, 3, 31), [now.Month], [row1, row2]);
        _gridViewRepoMock.Setup(r => r.GetByFinancialYearAsync(SocietyId, financialYearStart, It.IsAny<CancellationToken>()))
            .ReturnsAsync(gridView);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(
            new GetMaintenanceChargeGridQuery(SocietyId, financialYearStart, apt1.Id, null, null, null, null, null, now.AddMinutes(-5)),
            CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value!.Rows.Should().ContainSingle();
        result.Value.Rows[0].ApartmentId.Should().Be(apt1.Id);
    }
}
