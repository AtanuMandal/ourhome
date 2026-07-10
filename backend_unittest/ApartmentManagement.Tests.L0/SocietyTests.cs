using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.ValueObjects;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class SocietyTests
{
    private static Address ValidAddress() =>
        new("123 Main St", "Mumbai", "Maharashtra", "400001", "India");

    [Fact]
    public void Create_WithValidParameters_ReturnsSocietyInDraftStatus()
    {
        // Arrange
        var address = ValidAddress();

        // Act
        var society = Society.Create("Green Valley", address, "admin@gv.com", "+91-9876543210", 3, 60);

        // Assert
        society.Id.Should().NotBeNullOrEmpty();
        society.Name.Should().Be("Green Valley");
        society.Status.Should().Be(SocietyStatus.Draft);
        society.TotalBlocks.Should().Be(3);
        society.TotalApartments.Should().Be(60);
        society.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void Create_RaisesCreatedDomainEvent()
    {
        // Arrange & Act
        var society = Society.Create("Green Valley", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);

        // Assert
        society.DomainEvents.Should().ContainSingle(e => e is SocietyCreatedEvent);
        var evt = (SocietyCreatedEvent)society.DomainEvents.First();
        evt.SocietyName.Should().Be("Green Valley");
    }

    [Fact]
    public void Create_WithEmptyName_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => Society.Create("", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*name*");
    }

    [Fact]
    public void Create_WithInvalidEmail_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => Society.Create("GV", ValidAddress(), "notanemail", "+91-9876543210", 2, 40);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*email*");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_WithInvalidTotalBlocks_ThrowsArgumentOutOfRangeException(int blocks)
    {
        // Arrange & Act
        var act = () => Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", blocks, 40);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Activate_ChangeStatusToActive()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);

        // Act
        society.Activate();

        // Assert
        society.Status.Should().Be(SocietyStatus.Active);
    }

    [Fact]
    public void Deactivate_ChangeStatusToInactive()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);
        society.Activate();

        // Act
        society.Deactivate();

        // Assert
        society.Status.Should().Be(SocietyStatus.Inactive);
    }

    [Fact]
    public void AssignAdmin_AddsUserIdToAdminList()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);
        var userId = Guid.NewGuid().ToString();

        // Act
        society.AssignAdmin(userId);

        // Assert
        society.AdminUserIds.Should().Contain(userId);
    }

    [Fact]
    public void AssignAdmin_IsIdempotent_DoesNotDuplicateAdmins()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);
        var userId = Guid.NewGuid().ToString();

        // Act
        society.AssignAdmin(userId);
        society.AssignAdmin(userId);

        // Assert
        society.AdminUserIds.Should().ContainSingle(id => id == userId);
    }

    [Fact]
    public void RemoveAdmin_RemovesUserIdFromAdminList()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);
        var userId = Guid.NewGuid().ToString();
        society.AssignAdmin(userId);

        // Act
        society.RemoveAdmin(userId);

        // Assert
        society.AdminUserIds.Should().NotContain(userId);
    }

    [Fact]
    public void ConfigureFeeStructure_SetsFeeStructure()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);
        var feeStructure = new MaintenanceFeeStructure(1000m, 200m, 500m);

        // Act
        society.ConfigureFeeStructure(feeStructure);

        // Assert
        society.FeeStructure.Should().NotBeNull();
        society.FeeStructure!.BaseAmount.Should().Be(1000m);
    }

    [Fact]
    public void SocietyId_EqualsId_ForSocietyAsPartitionRoot()
    {
        // Arrange & Act
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);

        // Assert
        society.SocietyId.Should().Be(society.Id);
    }

    [Fact]
    public void ClearDomainEvents_ClearsAllEvents()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);

        // Act
        society.ClearDomainEvents();

        // Assert
        society.DomainEvents.Should().BeEmpty();
    }

    [Fact]
    public void AddAmenity_AddsAmenityIdToList()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);
        var amenityId = Guid.NewGuid().ToString();

        // Act
        society.AddAmenity(amenityId);

        // Assert
        society.AmenityIds.Should().Contain(amenityId);
    }

    [Fact]
    public void AddAmenity_WhenDuplicate_DoesNotAddTwice()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);
        var amenityId = Guid.NewGuid().ToString();

        // Act
        society.AddAmenity(amenityId);
        society.AddAmenity(amenityId);

        // Assert
        society.AmenityIds.Should().ContainSingle(id => id == amenityId);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(91)]
    public void SetMaintenanceOverdueThreshold_WithOutOfRangeValue_Throws(int thresholdDays)
    {
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);

        var act = () => society.SetMaintenanceOverdueThreshold(thresholdDays);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Update_WithValidData_UpdatesNameAndContact()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);

        // Act
        society.Update("Green Valley Updated", "updated@gv.com", "+91-9999999999", 3, 60);

        // Assert
        society.Name.Should().Be("Green Valley Updated");
        society.ContactEmail.Should().Be("updated@gv.com");
        society.TotalBlocks.Should().Be(3);
        society.TotalApartments.Should().Be(60);
    }

    [Fact]
    public void Update_WithAddress_UpdatesAddress()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);
        var newAddress = new Address("99 New Street", "Pune", "Maharashtra", "411001", "India");

        // Act
        society.Update("GV", "admin@gv.com", "+91-9876543210", 2, 40, address: newAddress);

        // Assert
        society.Address.Should().Be(newAddress);
    }

    [Fact]
    public void Update_WithoutAddress_LeavesAddressUnchanged()
    {
        // Arrange
        var originalAddress = ValidAddress();
        var society = Society.Create("GV", originalAddress, "admin@gv.com", "+91-9876543210", 2, 40);

        // Act
        society.Update("Green Valley Updated", "admin@gv.com", "+91-9876543210", 2, 40);

        // Assert
        society.Address.Should().Be(originalAddress);
    }

    [Fact]
    public void Update_WithInvalidAddress_ThrowsArgumentException()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);
        var invalidAddress = new Address("", "Pune", "Maharashtra", "411001", "India");

        // Act
        var act = () => society.Update("GV", "admin@gv.com", "+91-9876543210", 2, 40, address: invalidAddress);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Create_DefaultsThemeIdToOcean()
    {
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);

        society.ThemeId.Should().Be("ocean");
    }

    [Fact]
    public void Update_WithValidThemeId_ChangesTheme()
    {
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);

        society.Update("GV", "admin@gv.com", "+91-9876543210", 2, 40, themeId: "emerald");

        society.ThemeId.Should().Be("emerald");
    }

    [Fact]
    public void Update_WithoutThemeId_LeavesThemeUnchanged()
    {
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);
        society.Update("GV", "admin@gv.com", "+91-9876543210", 2, 40, themeId: "violet");

        society.Update("Green Valley Updated", "admin@gv.com", "+91-9876543210", 2, 40);

        society.ThemeId.Should().Be("violet");
    }

    [Theory]
    [InlineData("Emerald")]
    [InlineData("  teal  ")]
    public void Update_WithThemeIdInDifferentCaseOrWhitespace_NormalizesIt(string themeId)
    {
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);

        society.Update("GV", "admin@gv.com", "+91-9876543210", 2, 40, themeId: themeId);

        society.ThemeId.Should().Be(themeId.Trim().ToLowerInvariant());
    }

    [Fact]
    public void Update_WithUnknownThemeId_FallsBackToOceanInsteadOfThrowing()
    {
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);
        society.Update("GV", "admin@gv.com", "+91-9876543210", 2, 40, themeId: "violet");

        society.Update("GV", "admin@gv.com", "+91-9876543210", 2, 40, themeId: "some-retired-theme");

        society.ThemeId.Should().Be("ocean");
    }

    [Fact]
    public void Create_WithZeroTotalApartments_ThrowsArgumentOutOfRangeException()
    {
        // Arrange & Act
        var act = () => Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 0);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void AdminUserIds_InitiallyEmpty()
    {
        // Arrange & Act
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);

        // Assert
        society.AdminUserIds.Should().BeEmpty();
    }

    [Fact]
    public void AssignAdmin_MultipleAdmins_AllPresent()
    {
        // Arrange
        var society = Society.Create("GV", ValidAddress(), "admin@gv.com", "+91-9876543210", 2, 40);
        var userId1 = "user-001";
        var userId2 = "user-002";

        // Act
        society.AssignAdmin(userId1);
        society.AssignAdmin(userId2);

        // Assert
        society.AdminUserIds.Should().HaveCount(2);
        society.AdminUserIds.Should().Contain(userId1);
        society.AdminUserIds.Should().Contain(userId2);
    }
}
