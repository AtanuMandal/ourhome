using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Application.Queries.Maintenance;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Shared.Models;
using FluentAssertions;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class GetMaintenanceChargesQueryHandlerTests
{
    private readonly Mock<IMaintenanceChargeRepository> _chargeRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();

    private const string SocietyId = "soc-001";

    private GetMaintenanceChargesQueryHandler CreateHandler() =>
        new(_chargeRepoMock.Object, _apartmentRepoMock.Object, _societyRepoMock.Object, _currentUserMock.Object);

    private void SetupSociety()
    {
        var society = Society.Create(SocietyId, new Address("1 Main St", "Mumbai", "MH", "400001", "India"),
            "admin@test.com", "9876543210", 1, 10);
        _societyRepoMock.Setup(r => r.GetByIdAsync(SocietyId, SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync(society);
    }

    [Fact]
    public async Task Handle_AsAdminAcrossApartments_BulkFetchesApartmentsInsteadOfPerCharge()
    {
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(true);
        SetupSociety();

        var apt1 = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        var apt2 = Apartment.Create(SocietyId, "102", "A", 1, 2, [], 500, 600, 700);
        var dueDate = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc);
        var c1 = MaintenanceCharge.Create(SocietyId, apt1.Id, "sched-1", "Monthly Maintenance", 5000m, dueDate);
        var c2 = MaintenanceCharge.Create(SocietyId, apt2.Id, "sched-1", "Monthly Maintenance", 3000m, dueDate);

        _chargeRepoMock
            .Setup(r => r.GetBySocietyAsync(SocietyId, 1, 20, null, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([c1, c2]);
        _apartmentRepoMock.Setup(r => r.GetAllAsync(SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync([apt1, apt2]);

        var handler = CreateHandler();
        var result = await handler.Handle(
            new GetMaintenanceChargesQuery(SocietyId, null, null, null, null, new PaginationParams { Page = 1, PageSize = 20 }),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().HaveCount(2);
        result.Value.Items.Should().Contain(i => i.ApartmentNumber == apt1.ToDisplayLabel());
        result.Value.Items.Should().Contain(i => i.ApartmentNumber == apt2.ToDisplayLabel());

        _apartmentRepoMock.Verify(r => r.GetAllAsync(SocietyId, It.IsAny<CancellationToken>()), Times.Once);
        _apartmentRepoMock.Verify(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_FilteredToOneApartment_FetchesThatApartmentOnceNotPerCharge()
    {
        _currentUserMock.Setup(c => c.IsInRoles(It.IsAny<string[]>())).Returns(false);
        SetupSociety();

        var apt = Apartment.Create(SocietyId, "101", "A", 1, 2, [], 500, 600, 700);
        var dueDate = new DateTime(2026, 1, 10, 0, 0, 0, DateTimeKind.Utc);
        var c1 = MaintenanceCharge.Create(SocietyId, apt.Id, "sched-1", "Monthly Maintenance", 5000m, dueDate);
        var c2 = MaintenanceCharge.Create(SocietyId, apt.Id, "sched-2", "Sinking Fund", 1000m, dueDate.AddMonths(1));

        _chargeRepoMock
            .Setup(r => r.GetBySocietyAsync(SocietyId, 1, 20, apt.Id, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([c1, c2]);
        _apartmentRepoMock.Setup(r => r.GetByIdAsync(apt.Id, SocietyId, It.IsAny<CancellationToken>())).ReturnsAsync(apt);

        var handler = CreateHandler();
        var result = await handler.Handle(
            new GetMaintenanceChargesQuery(SocietyId, apt.Id, null, null, null, new PaginationParams { Page = 1, PageSize = 20 }),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().HaveCount(2);
        result.Value.Items.Should().OnlyContain(i => i.ApartmentNumber == apt.ToDisplayLabel());

        _apartmentRepoMock.Verify(r => r.GetByIdAsync(apt.Id, SocietyId, It.IsAny<CancellationToken>()), Times.Once);
        _apartmentRepoMock.Verify(r => r.GetAllAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
