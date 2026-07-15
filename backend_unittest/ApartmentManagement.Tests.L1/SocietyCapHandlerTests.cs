using ApartmentManagement.Application.Commands.Society;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Shared.Constants;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

// ─── HQAdmin-only society capacity settings ────────────────────────────────────
// Per requirements: SUAdmin must not be able to modify the number of apartments or the
// per-apartment user cap — only HQAdmin can. SUAdmin may still tune the visitor overstay
// threshold, which is a society-level operational setting.
public class SocietyCapHandlerTests
{
    private readonly Mock<ISocietyRepository> _societyRepoMock = new();
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserServiceMock = new();
    private readonly Mock<ILogger<UpdateSocietyCommandHandler>> _loggerMock = new();

    private UpdateSocietyCommandHandler CreateHandler() =>
        new(_societyRepoMock.Object, _userRepoMock.Object, _currentUserServiceMock.Object, _loggerMock.Object);

    private Society SeedSociety(string actorRole)
    {
        var address = new Address("123 Main St", "Mumbai", "Maharashtra", "400001", "India");
        var society = Society.Create("GV", address, "admin@gv.com", "+91-9876543210", 2, 40);

        _societyRepoMock
            .Setup(r => r.GetByIdAsync(society.Id, society.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(society);
        _societyRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Society s, CancellationToken _) => s);

        _currentUserServiceMock.Setup(s => s.Role).Returns(actorRole);
        if (actorRole == "SUAdmin")
        {
            var admin = Domain.Entities.User.Create(society.Id, "Admin", "admin@gv.com", "+91-9000000000", UserRole.SUAdmin, ResidentType.SocietyAdmin);
            _currentUserServiceMock.Setup(s => s.UserId).Returns(admin.Id);
            _userRepoMock
                .Setup(r => r.GetByIdAsync(admin.Id, society.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(admin);
        }
        else
        {
            _currentUserServiceMock.Setup(s => s.UserId).Returns("hq-admin-1");
        }

        return society;
    }

    private static UpdateSocietyCommand Command(
        Society society, int totalApartments, int? maxUsersPerApartment = null, int? visitorOverstayThresholdHours = null) =>
        new(society.Id, society.Name, society.ContactEmail, society.ContactPhone,
            society.TotalBlocks, totalApartments, society.MaintenanceOverdueThresholdDays,
            null, null,
            MaxUsersPerApartment: maxUsersPerApartment,
            VisitorOverstayThresholdHours: visitorOverstayThresholdHours);

    [Fact]
    public async Task Handle_SUAdminChangingTotalApartments_ReturnsForbidden()
    {
        var society = SeedSociety("SUAdmin");
        var handler = CreateHandler();

        var result = await handler.Handle(Command(society, totalApartments: 99), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Forbidden);
        _societyRepoMock.Verify(r => r.UpdateAsync(It.IsAny<Society>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_SUAdminChangingUserCap_ReturnsForbidden()
    {
        var society = SeedSociety("SUAdmin");
        var handler = CreateHandler();

        var result = await handler.Handle(
            Command(society, society.TotalApartments, maxUsersPerApartment: society.MaxUsersPerApartment + 1),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Forbidden);
    }

    [Fact]
    public async Task Handle_SUAdminKeepingCountsAndChangingOverstayThreshold_Succeeds()
    {
        var society = SeedSociety("SUAdmin");
        var handler = CreateHandler();

        var result = await handler.Handle(
            Command(society, society.TotalApartments, visitorOverstayThresholdHours: 8),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        society.VisitorOverstayThresholdHours.Should().Be(8);
        society.TotalApartments.Should().Be(40);
    }

    [Fact]
    public async Task Handle_HQAdminChangingApartmentCountAndCap_Succeeds()
    {
        var society = SeedSociety("HQAdmin");
        var handler = CreateHandler();

        var result = await handler.Handle(
            Command(society, totalApartments: 60, maxUsersPerApartment: 6),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        society.TotalApartments.Should().Be(60);
        society.MaxUsersPerApartment.Should().Be(6);
        result.Value!.MaxUsersPerApartment.Should().Be(6);
    }
}
