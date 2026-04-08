using ApartmentManagement.Application.Commands.Amenity;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace ApartmentManagement.Tests.L1.Handlers;

public class BookAmenityCommandHandlerTests
{
    private readonly Mock<IAmenityRepository> _amenityRepoMock = new();
    private readonly Mock<IAmenityBookingRepository> _bookingRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<IEventPublisher> _eventPublisherMock = new();
    private readonly Mock<ILogger<BookAmenityCommandHandler>> _loggerMock = new();

    private BookAmenityCommandHandler CreateHandler() =>
        new(_amenityRepoMock.Object, _bookingRepoMock.Object, _notificationMock.Object,
            _eventPublisherMock.Object, _loggerMock.Object);

    private static Amenity CreateActiveAmenity(string societyId) =>
        Amenity.Create(societyId, "Pool", "Swimming pool", 10, "No glass",
            60, new TimeOnly(8, 0), new TimeOnly(22, 0), 30);

    private static DateTime TomorrowAt10Am() =>
        new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, DateTime.UtcNow.Day, 10, 0, 0, DateTimeKind.Utc).AddDays(1);

    [Fact]
    public async Task Handle_WithValidSlot_CreatesBookingAndReturnsSuccess()
    {
        // Arrange
        var societyId = "soc-001";
        var amenity = CreateActiveAmenity(societyId);
        var start = TomorrowAt10Am();
        var end = start.AddHours(1);

        _amenityRepoMock
            .Setup(r => r.GetByIdAsync(amenity.Id, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(amenity);
        _bookingRepoMock
            .Setup(r => r.GetByAmenityAsync(societyId, amenity.Id, DateOnly.FromDateTime(start), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AmenityBooking>());
        _bookingRepoMock
            .Setup(r => r.CreateAsync(It.IsAny<AmenityBooking>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AmenityBooking b, CancellationToken _) => b);

        var handler = CreateHandler();
        var command = new BookAmenityCommand(societyId, amenity.Id, "user-001", "apt-001", start, end);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        _bookingRepoMock.Verify(r => r.CreateAsync(It.IsAny<AmenityBooking>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenAmenityNotFound_ReturnsFailure()
    {
        // Arrange
        _amenityRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Amenity?)null);

        var handler = CreateHandler();
        var start = TomorrowAt10Am();
        var command = new BookAmenityCommand("soc-001", "invalid-id", "user-001", "apt-001", start, start.AddHours(1));

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.AmenityNotFound);
    }

    [Fact]
    public async Task Handle_WhenAmenityInactive_ReturnsFailure()
    {
        // Arrange
        var societyId = "soc-001";
        var amenity = CreateActiveAmenity(societyId);
        amenity.Deactivate();

        _amenityRepoMock
            .Setup(r => r.GetByIdAsync(amenity.Id, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(amenity);

        var handler = CreateHandler();
        var start = TomorrowAt10Am();
        var command = new BookAmenityCommand(societyId, amenity.Id, "user-001", "apt-001", start, start.AddHours(1));

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.AmenityUnavailable);
    }

    [Fact]
    public async Task Handle_WhenBookingConflicts_ReturnsFailure()
    {
        // Arrange
        var societyId = "soc-001";
        var amenity = CreateActiveAmenity(societyId);
        var start = TomorrowAt10Am();
        var end = start.AddHours(2);

        var existingBooking = AmenityBooking.Create(societyId, amenity.Id, "Pool", "other-user", "apt-002", start, end);
        existingBooking.Approve();

        _amenityRepoMock
            .Setup(r => r.GetByIdAsync(amenity.Id, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(amenity);
        _bookingRepoMock
            .Setup(r => r.GetByAmenityAsync(societyId, amenity.Id, DateOnly.FromDateTime(start), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AmenityBooking> { existingBooking });

        var handler = CreateHandler();
        var command = new BookAmenityCommand(societyId, amenity.Id, "user-001", "apt-001", start.AddMinutes(30), end.AddMinutes(30));

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.BookingConflict);
    }
}

public class ApproveBookingCommandHandlerTests
{
    private readonly Mock<IAmenityBookingRepository> _bookingRepoMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<ApproveBookingCommandHandler>> _loggerMock = new();

    private ApproveBookingCommandHandler CreateHandler() =>
        new(_bookingRepoMock.Object, _notificationMock.Object, _loggerMock.Object);

    [Fact]
    public async Task Handle_WhenBookingPending_ApprovesAndReturnsSuccess()
    {
        // Arrange
        var societyId = "soc-001";
        var start = DateTime.UtcNow.AddHours(1);
        var booking = AmenityBooking.Create(societyId, "amenity-001", "Pool", "user-001", "apt-001", start, start.AddHours(1));
        var bookingId = booking.Id;

        _bookingRepoMock
            .Setup(r => r.GetByIdAsync(bookingId, societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(booking);
        _bookingRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<AmenityBooking>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AmenityBooking b, CancellationToken _) => b);

        var handler = CreateHandler();
        var command = new ApproveBookingCommand(societyId, bookingId, null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        booking.Status.Should().Be(BookingStatus.Approved);
    }

    [Fact]
    public async Task Handle_WhenBookingNotFound_ReturnsFailure()
    {
        // Arrange
        _bookingRepoMock
            .Setup(r => r.GetByIdAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AmenityBooking?)null);

        var handler = CreateHandler();
        var command = new ApproveBookingCommand("soc-001", "non-existent", null);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.BookingNotFound);
    }
}
