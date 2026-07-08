using ApartmentManagement.Application.Commands.Dev;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Shared.Constants;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class SeedTestDataCommandHandlerTests
{
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<IApartmentRepository> _apartmentRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IMaintenanceChargeRepository> _chargeRepoMock = new();
    private readonly Mock<IMaintenanceChargeGridViewRepository> _gridViewRepoMock = new();
    private readonly Mock<ILogger<SeedTestDataCommandHandler>> _loggerMock = new();

    private SeedTestDataCommandHandler CreateHandler() =>
        new(_societyRepoMock.Object, _apartmentRepoMock.Object, _userRepoMock.Object,
            _chargeRepoMock.Object, _gridViewRepoMock.Object, _loggerMock.Object);

    private void SetUpHappyPathMocks()
    {
        var society = Society.Create("Our Home", new Address("Street", "City", "State", "12345", "India"), "soc@test.com", "8888888888", 1, 10);
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("soc-001", "soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);

        _apartmentRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment a, CancellationToken _) => a);
        _apartmentRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Apartment a, CancellationToken _) => a);
        _apartmentRepoMock
            .Setup(r => r.GetAllAsync("soc-001", It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        _userRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);
        _userRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User u, CancellationToken _) => u);

        _chargeRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<MaintenanceCharge>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceCharge c, CancellationToken _) => c);
        _chargeRepoMock
            .Setup(r => r.GetByDueDateRangeAsync("soc-001", It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        _gridViewRepoMock
            .Setup(r => r.GetByFinancialYearAsync("soc-001", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceChargeGridView?)null);
        _gridViewRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<MaintenanceChargeGridView>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceChargeGridView v, CancellationToken _) => v);
    }

    [Fact]
    public async Task Handle_WithValidCommand_CreatesApartmentWithOwnerAndTenantAndThreeCharges()
    {
        SetUpHappyPathMocks();

        var result = await CreateHandler().Handle(new SeedTestDataCommand("soc-001", 1), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ApartmentsCreated.Should().Be(1);
        result.Value!.Failed.Should().Be(0);
        var seededApartment = result.Value!.Apartments.Should().ContainSingle().Subject;
        seededApartment.ChargeIds.Should().HaveCount(3);
        seededApartment.OwnerId.Should().NotBe(seededApartment.TenantId);

        _apartmentRepoMock.Verify(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()), Times.Once);
        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
        _chargeRepoMock.Verify(r => r.CreateAsync(It.IsAny<MaintenanceCharge>(), It.IsAny<CancellationToken>()), Times.Exactly(3));
    }

    [Fact]
    public async Task Handle_WithValidCommand_ChargesCoverPendingOverdueAndPaidStates()
    {
        SetUpHappyPathMocks();
        var createdCharges = new List<MaintenanceCharge>();
        _chargeRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<MaintenanceCharge>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((MaintenanceCharge c, CancellationToken _) => { createdCharges.Add(c); return c; });

        var result = await CreateHandler().Handle(new SeedTestDataCommand("soc-001", 1), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        createdCharges.Should().ContainSingle(c => c.Status == PaymentStatus.Pending && c.DueDate > DateTime.UtcNow);
        createdCharges.Should().ContainSingle(c => c.Status == PaymentStatus.Pending && c.DueDate < DateTime.UtcNow.AddDays(-30));
        var paidCharge = createdCharges.Should().ContainSingle(c => c.Status == PaymentStatus.Paid).Subject;
        paidCharge.Proofs.Should().ContainSingle();
        paidCharge.PaymentMethod.Should().Be("UPI");
    }

    [Fact]
    public async Task Handle_WithMultipleApartments_CreatesOneOwnerAndTenantPerApartment()
    {
        SetUpHappyPathMocks();

        var result = await CreateHandler().Handle(new SeedTestDataCommand("soc-001", 3), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ApartmentsCreated.Should().Be(3);
        result.Value!.Apartments.Should().HaveCount(3);
        result.Value!.Apartments.Select(a => a.ApartmentId).Should().OnlyHaveUniqueItems();
        _userRepoMock.Verify(r => r.CreateAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Exactly(6));
    }

    [Fact]
    public async Task Handle_WithMissingSociety_ReturnsSocietyNotFound()
    {
        _societyRepoMock
            .Setup(r => r.GetByIdAsync("missing-soc", "missing-soc", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society?)null);

        var result = await CreateHandler().Handle(new SeedTestDataCommand("missing-soc", 1), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.SocietyNotFound);
    }

    [Fact]
    public async Task Handle_WhenOneApartmentFails_RecordsErrorWithoutFailingWholeBatch()
    {
        SetUpHappyPathMocks();
        var fallbackApartment = Apartment.Create("soc-001", "FALLBACK", "A", 1, 2, [], 800, 900, 1000);
        _apartmentRepoMock
            .SetupSequence(r => r.CreateAsync(It.IsAny<Apartment>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("simulated failure"))
            .ReturnsAsync(fallbackApartment);

        var result = await CreateHandler().Handle(new SeedTestDataCommand("soc-001", 2), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.ApartmentsCreated.Should().Be(1);
        result.Value!.Failed.Should().Be(1);
        result.Value!.Errors.Should().ContainSingle(e => e.Contains("simulated failure"));
    }
}
