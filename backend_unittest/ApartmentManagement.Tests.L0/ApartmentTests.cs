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
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"], 500, 600, 700);

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
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"], 500, 600, 700);

        // Assert
        apartment.DomainEvents.Should().ContainSingle(e => e is ApartmentCreatedEvent);
    }

    [Fact]
    public void Create_WithEmptyApartmentNumber_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => Apartment.Create(SocietyId, "", "A", 1, 3, ["P1"], 500, 600, 700);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_WithInvalidRooms_ThrowsArgumentOutOfRangeException(int rooms)
    {
        // Arrange & Act
        var act = () => Apartment.Create(SocietyId, "A101", "A", 1, rooms, [], 500, 600, 700);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_WithBlankParkingSlot_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => Apartment.Create(SocietyId, "A101", "A", 1, 3, [" "], 500, 600, 700);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void AssignOwner_SetsOwnerAndStatusOccupied()
    {
        // Arrange
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"], 500, 600, 700);
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
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"], 500, 600, 700);
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
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"], 500, 600, 700);
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
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"], 500, 600, 700);
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
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"], 500, 600, 700);

        // Act
        apartment.MarkUnderMaintenance();

        // Assert
        apartment.Status.Should().Be(ApartmentStatus.UnderMaintenance);
    }

    [Fact]
    public void MarkAvailable_ClearsOwnerAndTenantAndSetsAvailable()
    {
        // Arrange
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"], 500, 600, 700);
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
        var apartment = Apartment.Create(SocietyId, "a101", "a", 1, 3, [], 500, 600, 700);

        // Assert
        apartment.ApartmentNumber.Should().Be("A101");
        apartment.BlockName.Should().Be("A");
    }

    [Fact]
    public void SetParkingCarNumbers_WithMatchingSlot_AssignsCarNumber()
    {
        // Arrange
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1", "P2"], 500, 600, 700);

        // Act
        apartment.SetParkingCarNumbers(new Dictionary<string, string> { ["P1"] = "ka-01-ab-1234" });

        // Assert
        apartment.ParkingCarNumbers.Should().ContainSingle(p => p.SlotId == "P1" && p.CarNumber == "KA-01-AB-1234");
    }

    [Fact]
    public void SetParkingCarNumbers_IgnoresSlotIdsNotOnTheApartment()
    {
        // Arrange
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1"], 500, 600, 700);

        // Act
        apartment.SetParkingCarNumbers(new Dictionary<string, string> { ["P1"] = "KA-01-AB-1234", ["P9"] = "KA-02-CD-5678" });

        // Assert
        apartment.ParkingCarNumbers.Should().ContainSingle();
        apartment.ParkingCarNumbers[0].SlotId.Should().Be("P1");
    }

    [Fact]
    public void SetParkingCarNumbers_WithBlankValue_ClearsThatSlotsEntry()
    {
        // Arrange
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1", "P2"], 500, 600, 700);
        apartment.SetParkingCarNumbers(new Dictionary<string, string> { ["P1"] = "KA-01-AB-1234", ["P2"] = "KA-02-CD-5678" });

        // Act
        apartment.SetParkingCarNumbers(new Dictionary<string, string> { ["P1"] = "KA-01-AB-1234", ["P2"] = "" });

        // Assert
        apartment.ParkingCarNumbers.Should().ContainSingle(p => p.SlotId == "P1");
    }

    [Fact]
    public void Update_RemovingAParkingSlot_PrunesItsCarNumber()
    {
        // Arrange
        var apartment = Apartment.Create(SocietyId, "A101", "A", 1, 3, ["P1", "P2"], 500, 600, 700);
        apartment.SetParkingCarNumbers(new Dictionary<string, string> { ["P1"] = "KA-01-AB-1234", ["P2"] = "KA-02-CD-5678" });

        // Act — the apartment is re-edited to have only P1
        apartment.Update("A", 1, 3, ["P1"], 500, 600, 700);

        // Assert
        apartment.ParkingCarNumbers.Should().ContainSingle(p => p.SlotId == "P1");
    }
}
