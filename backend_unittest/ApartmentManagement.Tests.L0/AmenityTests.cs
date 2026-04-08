using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using FluentAssertions;

namespace ApartmentManagement.Tests.L0.Domain;

public class AmenityTests
{
    private const string SocietyId = "society-001";
    private static readonly TimeOnly Open = new(8, 0);
    private static readonly TimeOnly Close = new(22, 0);

    private static Amenity CreateAmenity(string name = "Swimming Pool") =>
        Amenity.Create(SocietyId, name, "Description", 20, "No glass allowed", 60, Open, Close, 7);

    [Fact]
    public void Create_WithValidParameters_ReturnsActiveAmenity()
    {
        // Arrange & Act
        var amenity = CreateAmenity();

        // Assert
        amenity.Id.Should().NotBeNullOrEmpty();
        amenity.Name.Should().Be("Swimming Pool");
        amenity.IsActive.Should().BeTrue();
        amenity.Capacity.Should().Be(20);
        amenity.BookingSlotMinutes.Should().Be(60);
        amenity.AdvanceBookingDays.Should().Be(7);
    }

    [Fact]
    public void Create_WithInvalidCapacity_ThrowsArgumentOutOfRangeException()
    {
        // Arrange & Act
        var act = () => Amenity.Create(SocietyId, "Pool", "Desc", 0, "", 60, Open, Close, 7);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Create_WithTooShortBookingSlot_ThrowsArgumentOutOfRangeException()
    {
        // Arrange & Act
        var act = () => Amenity.Create(SocietyId, "Pool", "Desc", 10, "", 10, Open, Close, 7);

        // Assert
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Deactivate_SetsIsActiveFalse()
    {
        // Arrange
        var amenity = CreateAmenity();

        // Act
        amenity.Deactivate();

        // Assert
        amenity.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Activate_SetsIsActiveTrue()
    {
        // Arrange
        var amenity = CreateAmenity();
        amenity.Deactivate();

        // Act
        amenity.Activate();

        // Assert
        amenity.IsActive.Should().BeTrue();
    }

    [Theory]
    [InlineData(9, 0, true)]
    [InlineData(8, 0, true)]
    [InlineData(22, 0, true)]
    [InlineData(7, 59, false)]
    [InlineData(22, 1, false)]
    public void IsWithinOperatingHours_ReturnsCorrectResult(int hour, int minute, bool expected)
    {
        // Arrange
        var amenity = CreateAmenity();
        var time = new TimeOnly(hour, minute);

        // Act
        var result = amenity.IsWithinOperatingHours(time);

        // Assert
        result.Should().Be(expected);
    }
}

public class AmenityBookingTests
{
    private const string SocietyId = "society-001";
    private const string AmenityId = "amenity-001";
    private const string UserId = "user-001";
    private const string ApartmentId = "apt-001";

    private static AmenityBooking CreateBooking(DateTime? start = null, DateTime? end = null)
    {
        var startTime = start ?? DateTime.UtcNow.AddHours(1);
        var endTime = end ?? startTime.AddHours(1);
        return AmenityBooking.Create(SocietyId, AmenityId, "Pool", UserId, ApartmentId, startTime, endTime);
    }

    [Fact]
    public void Create_WithValidParameters_ReturnsBookingInPendingStatus()
    {
        // Arrange & Act
        var booking = CreateBooking();

        // Assert
        booking.Id.Should().NotBeNullOrEmpty();
        booking.Status.Should().Be(BookingStatus.Pending);
        booking.BookedByUserId.Should().Be(UserId);
        booking.AmenityId.Should().Be(AmenityId);
    }

    [Fact]
    public void Create_RaisesBookingCreatedEvent()
    {
        // Arrange & Act
        var booking = CreateBooking();

        // Assert
        booking.DomainEvents.Should().ContainSingle(e => e is BookingCreatedEvent);
    }

    [Fact]
    public void Create_WithEndBeforeStart_ThrowsArgumentException()
    {
        // Arrange
        var start = DateTime.UtcNow.AddHours(2);
        var end = DateTime.UtcNow.AddHours(1);

        // Act
        var act = () => AmenityBooking.Create(SocietyId, AmenityId, "Pool", UserId, ApartmentId, start, end);

        // Assert
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Approve_SetsStatusApproved()
    {
        // Arrange
        var booking = CreateBooking();

        // Act
        booking.Approve("Looks good");

        // Assert
        booking.Status.Should().Be(BookingStatus.Approved);
        booking.AdminNotes.Should().Be("Looks good");
    }

    [Fact]
    public void Reject_SetsStatusRejected()
    {
        // Arrange
        var booking = CreateBooking();

        // Act
        booking.Reject("Capacity full");

        // Assert
        booking.Status.Should().Be(BookingStatus.Rejected);
    }

    [Fact]
    public void Cancel_SetsStatusCancelled()
    {
        // Arrange
        var booking = CreateBooking();

        // Act
        booking.Cancel();

        // Assert
        booking.Status.Should().Be(BookingStatus.Cancelled);
    }

    [Fact]
    public void IsOverlapping_WithOverlappingRange_ReturnsTrue()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var booking = CreateBooking(now.AddHours(1), now.AddHours(3));

        // Act
        var result = booking.IsOverlapping(now.AddHours(2), now.AddHours(4));

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void IsOverlapping_WithNonOverlappingRange_ReturnsFalse()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var booking = CreateBooking(now.AddHours(1), now.AddHours(2));

        // Act
        var result = booking.IsOverlapping(now.AddHours(3), now.AddHours(4));

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsOverlapping_WhenRejected_ReturnsFalse()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var booking = CreateBooking(now.AddHours(1), now.AddHours(3));
        booking.Reject();

        // Act
        var result = booking.IsOverlapping(now.AddHours(2), now.AddHours(4));

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void Duration_ReturnsCorrectTimeSpan()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var booking = CreateBooking(now.AddHours(1), now.AddHours(3));

        // Assert
        booking.Duration.Should().Be(TimeSpan.FromHours(2));
    }
}
