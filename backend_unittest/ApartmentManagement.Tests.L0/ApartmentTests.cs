using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class ApartmentTests
{
    private const string SocietyId = "society-001";

    [Fact]
    public void Create_WithValidParameters_ReturnsApartmentInAvailableStatus()
    {
        // Arrange & Act
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"]);

        // Assert
        apartment.Id.Should().NotBeNullOrEmpty();
        apartment.SocietyId.Should().Be(SocietyId);
        apartment.ApartmentNumber.Should().Be("A101");
        apartment.Status.Should().Be(ApartmentStatus.Available);
        apartment.NumberOfRooms.Should().Be(3);
        apartment.ParkingSlots.Should().Equal("P1");
    }

    [Fact]
    public void Create_RaisesApartmentCreatedEvent()
    {
        // Arrange & Act
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"]);

        // Assert
        apartment.DomainEvents.Should().ContainSingle(e => e is ApartmentCreatedEvent);
    }

    [Fact]
    public void Create_WithEmptyApartmentNumber_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => Apartment.Create(SocietyId, "", "A", 1, 3, ["P1"]);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_WithInvalidRooms_ThrowsArgumentOutOfRangeException(int rooms)
    {
        // Arrange & Act
        var act = () => Apartment.Create(SocietyId, "A101", "A", 1, rooms, []);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_WithBlankParkingSlot_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => Apartment.Create(SocietyId, "A101", "A", 1, 3, [" "]);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void AssignOwner_SetsOwnerAndStatusOccupied()
    {
        // Arrange
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"]);
        var ownerId = "user-001";

        // Act
        apartment.AssignOwner(ownerId);

        // Assert
        apartment.OwnerId.Should().Be(ownerId);
        apartment.Status.Should().Be(ApartmentStatus.Occupied);
    }

    [Fact]
    public void AssignTenant_SetsTenantAndStatusOccupied()
    {
        // Arrange
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"]);
        var tenantId = "user-002";

        // Act
        apartment.AssignTenant(tenantId);

        // Assert
        apartment.TenantId.Should().Be(tenantId);
        apartment.Status.Should().Be(ApartmentStatus.Occupied);
    }

    [Fact]
    public void RemoveTenant_WhenOwnerPresent_KeepsStatusOccupied()
    {
        // Arrange
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"]);
        apartment.AssignOwner("owner-001");
        apartment.AssignTenant("tenant-001");

        // Act
        apartment.RemoveTenant();

        // Assert
        apartment.TenantId.Should().BeNull();
        apartment.Status.Should().Be(ApartmentStatus.Occupied);
    }

    [Fact]
    public void RemoveTenant_WithoutOwner_SetsStatusAvailable()
    {
        // Arrange
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"]);
        apartment.AssignTenant("tenant-001");

        // Act
        apartment.RemoveTenant();

        // Assert
        apartment.TenantId.Should().BeNull();
        apartment.Status.Should().Be(ApartmentStatus.Available);
    }

    [Fact]
    public void MarkUnderMaintenance_SetsCorrectStatus()
    {
        // Arrange
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"]);

        // Act
        apartment.MarkUnderMaintenance();

        // Assert
        apartment.Status.Should().Be(ApartmentStatus.UnderMaintenance);
    }

    [Fact]
    public void MarkAvailable_ClearsOwnerAndTenantAndSetsAvailable()
    {
        // Arrange
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"]);
        apartment.AssignOwner("owner-001");
        apartment.AssignTenant("tenant-001");

        // Act
        apartment.MarkAvailable();

        // Assert
        apartment.OwnerId.Should().BeNull();
        apartment.TenantId.Should().BeNull();
        apartment.Status.Should().Be(ApartmentStatus.Available);
    }

    [Fact]
    public void ApartmentNumber_IsStoredUppercase()
    {
        // Arrange & Act
        var apartment = Apartment.Create(SocietyId, "a101", "a", 1, 3, []);

        // Assert
        apartment.ApartmentNumber.Should().Be("A101");
        apartment.BlockName.Should().Be("A");
    }
}
