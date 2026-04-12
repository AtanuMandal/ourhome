using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class UserTests
{
    private const string SocietyId = "society-001";

    [Fact]
    public void Create_WithValidParameters_ReturnsUnverifiedUser()
    {
        // Arrange & Act
        var user = User.Create(SocietyId, "Alice Smith", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner, "apt-001");

        // Assert
        user.Id.Should().NotBeNullOrEmpty();
        user.SocietyId.Should().Be(SocietyId);
        user.FullName.Should().Be("Alice Smith");
        user.Email.Should().Be("alice@example.com");
        user.Role.Should().Be(UserRole.SUUser);
        user.IsVerified.Should().BeFalse();
        user.IsActive.Should().BeTrue();
        user.ApartmentId.Should().Be("apt-001");
    }

    [Fact]
    public void Create_RaisesResidentOnboardedEvent()
    {
        // Arrange & Act
        var user = User.Create(SocietyId, "Alice Smith", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner, "apt-001");

        // Assert
        user.DomainEvents.Should().ContainSingle(e => e is ResidentOnboardedEvent);
    }

    [Fact]
    public void Create_WithInvalidEmail_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => User.Create(SocietyId, "Alice", "not-an-email", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);

        // Assert
        act.Should().Throw<ArgumentException>().WithMessage("*email*");
    }

    [Fact]
    public void Create_WithEmptyName_ThrowsArgumentException()
    {
        // Arrange & Act
        var act = () => User.Create(SocietyId, "", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void GenerateOtp_SetsOtpCodeAndExpiry()
    {
        // Arrange
        var user = User.Create(SocietyId, "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);

        // Act
        user.GenerateOtp();

        // Assert
        user.OtpCode.Should().NotBeNullOrEmpty();
        user.OtpCode.Should().HaveLength(6);
        user.OtpExpiry.Should().BeCloseTo(DateTime.UtcNow.AddMinutes(10), TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void ValidateOtp_WithCorrectAndValidCode_ReturnsTrue()
    {
        // Arrange
        var user = User.Create(SocietyId, "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);
        user.GenerateOtp();
        var otp = user.OtpCode!;

        // Act
        var result = user.ValidateOtp(otp);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void ValidateOtp_WithWrongCode_ReturnsFalse()
    {
        // Arrange
        var user = User.Create(SocietyId, "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);
        user.GenerateOtp();

        // Act
        var result = user.ValidateOtp("000000");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ValidateOtp_WithNoOtpGenerated_ReturnsFalse()
    {
        // Arrange
        var user = User.Create(SocietyId, "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);

        // Act
        var result = user.ValidateOtp("123456");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void Verify_SetsIsVerifiedTrueAndClearsOtp()
    {
        // Arrange
        var user = User.Create(SocietyId, "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);
        user.GenerateOtp();

        // Act
        user.Verify();

        // Assert
        user.IsVerified.Should().BeTrue();
        user.OtpCode.Should().BeNull();
        user.OtpExpiry.Should().BeNull();
    }

    [Fact]
    public void Deactivate_SetsIsActiveFalse()
    {
        // Arrange
        var user = User.Create(SocietyId, "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);

        // Act
        user.Deactivate();

        // Assert
        user.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Activate_SetsIsActiveTrue()
    {
        // Arrange
        var user = User.Create(SocietyId, "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);
        user.Deactivate();

        // Act
        user.Activate();

        // Assert
        user.IsActive.Should().BeTrue();
    }

    [Fact]
    public void SetExternalAuthId_SetsExternalId()
    {
        // Arrange
        var user = User.Create(SocietyId, "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);

        // Act
        user.SetExternalAuthId("external-auth-id-123");

        // Assert
        user.ExternalAuthId.Should().Be("external-auth-id-123");
    }

    [Fact]
    public void UpdateProfile_UpdatesNameAndPhone()
    {
        // Arrange
        var user = User.Create(SocietyId, "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);

        // Act
        user.UpdateProfile("Alice Updated", "+91-1234567890");

        // Assert
        user.FullName.Should().Be("Alice Updated");
        user.Phone.Should().Be("+91-1234567890");
    }

    [Fact]
    public void Email_IsStoredLowercase()
    {
        // Arrange & Act
        var user = User.Create(SocietyId, "Alice", "ALICE@EXAMPLE.COM", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);

        // Assert
        user.Email.Should().Be("alice@example.com");
    }

    [Fact]
    public void LinkApartment_AddsApartmentMembership()
    {
        var user = User.Create(SocietyId, "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.Owner);

        user.LinkApartment("apt-001", "A-101", ResidentType.Owner, makePrimary: true);

        user.ApartmentId.Should().Be("apt-001");
        user.Apartments.Should().ContainSingle(a => a.ApartmentId == "apt-001" && a.Name == "A-101" && a.ResidentType == ResidentType.Owner);
    }

    [Fact]
    public void ValidateOtp_WhenExpired_ReturnsFalse()
    {
        // Arrange
        var user = User.Create(SocietyId, "Alice", "alice@example.com", "+91-9876543210", UserRole.SUUser, ResidentType.SocietyAdmin);
        user.GenerateOtp();
        var otp = user.OtpCode!;

        // Simulate expiry by forcing OtpExpiry to a past datetime via reflection
        var expiry = typeof(User).GetProperty("OtpExpiry");
        expiry!.SetValue(user, DateTime.UtcNow.AddMinutes(-1));

        // Act
        var result = user.ValidateOtp(otp);

        // Assert
        result.Should().BeFalse();
    }
}
