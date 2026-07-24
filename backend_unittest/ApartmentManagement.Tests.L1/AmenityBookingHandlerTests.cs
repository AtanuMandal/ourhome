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

public class CancelBookingCommandHandlerTests
{
    private const string SocietyId = "soc-001";
    private const string OwnerId = "user-owner";
    private const string AdminId = "user-admin";

    private readonly Mock<IAmenityBookingRepository> _bookingRepoMock = new();
    private readonly Mock<ICurrentUserService> _currentUserMock = new();
    private readonly Mock<INotificationService> _notificationMock = new();
    private readonly Mock<ILogger<CancelBookingCommandHandler>> _loggerMock = new();

    private CancelBookingCommandHandler CreateHandler() =>
        new(_bookingRepoMock.Object, _currentUserMock.Object, _notificationMock.Object, _loggerMock.Object);

    private AmenityBooking SetupPendingBooking()
    {
        var start = DateTime.UtcNow.AddDays(1);
        var booking = AmenityBooking.Create(SocietyId, "amenity-001", "Pool", OwnerId, "apt-001", start, start.AddHours(1));
        _bookingRepoMock
            .Setup(r => r.GetByIdAsync(booking.Id, SocietyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(booking);
        _bookingRepoMock
            .Setup(r => r.UpdateAsync(It.IsAny<AmenityBooking>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AmenityBooking b, CancellationToken _) => b);
        return booking;
    }

    [Fact]
    public async Task Handle_OwnerCancelsOwnBooking_SucceedsWithoutRemarks()
    {
        var booking = SetupPendingBooking();
        _currentUserMock.Setup(c => c.IsInRoles("SUAdmin", "HQAdmin")).Returns(false);

        var result = await CreateHandler().Handle(
            new CancelBookingCommand(SocietyId, booking.Id, OwnerId, null), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        booking.Status.Should().Be(BookingStatus.Cancelled);
        // Owner cancelling their own booking gets no "cancelled by admin" push.
        _notificationMock.Verify(n => n.SendPushNotificationAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>(),
            It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Never);
    }

    [Fact]
    public async Task Handle_AdminCancelsWithRemarks_StoresRemarksAndNotifiesOwner()
    {
        var booking = SetupPendingBooking();
        _currentUserMock.Setup(c => c.IsInRoles("SUAdmin", "HQAdmin")).Returns(true);

        var result = await CreateHandler().Handle(
            new CancelBookingCommand(SocietyId, booking.Id, AdminId, "Pool maintenance scheduled"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.CancellationRemarks.Should().Be("Pool maintenance scheduled");
        result.Value.CancelledByUserId.Should().Be(AdminId);
        booking.Status.Should().Be(BookingStatus.Cancelled);
        _notificationMock.Verify(n => n.SendPushNotificationAsync(
            OwnerId, "Booking Cancelled", It.Is<string>(m => m.Contains("Pool maintenance scheduled")),
            It.IsAny<CancellationToken>(), It.IsAny<IReadOnlyDictionary<string, string>?>()), Times.Once);
    }

    [Fact]
    public async Task Handle_AdminCancelsWithoutRemarks_ReturnsValidationFailure()
    {
        var booking = SetupPendingBooking();
        _currentUserMock.Setup(c => c.IsInRoles("SUAdmin", "HQAdmin")).Returns(true);

        var result = await CreateHandler().Handle(
            new CancelBookingCommand(SocietyId, booking.Id, AdminId, "  "), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ValidationFailed);
        booking.Status.Should().Be(BookingStatus.Pending);
    }

    [Fact]
    public async Task Handle_NonOwnerNonAdmin_ReturnsForbidden()
    {
        var booking = SetupPendingBooking();
        _currentUserMock.Setup(c => c.IsInRoles("SUAdmin", "HQAdmin")).Returns(false);

        var result = await CreateHandler().Handle(
            new CancelBookingCommand(SocietyId, booking.Id, "some-other-user", null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.Forbidden);
        booking.Status.Should().Be(BookingStatus.Pending);
    }

    [Fact]
    public async Task Handle_AlreadyCancelledBooking_ReturnsValidationFailure()
    {
        var booking = SetupPendingBooking();
        booking.Cancel();
        _currentUserMock.Setup(c => c.IsInRoles("SUAdmin", "HQAdmin")).Returns(false);

        var result = await CreateHandler().Handle(
            new CancelBookingCommand(SocietyId, booking.Id, OwnerId, null), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ErrorCodes.ValidationFailed);
    }
}

public class GetSocietyBookingsQueryHandlerTests
{
    private readonly Mock<IAmenityBookingRepository> _bookingRepoMock = new();

    [Fact]
    public async Task Handle_ReturnsBookingsOrderedByStartTimeDescending()
    {
        var societyId = "soc-001";
        var baseTime = DateTime.UtcNow.AddDays(1);
        var earlier = AmenityBooking.Create(societyId, "a-1", "Pool", "u-1", "apt-1", baseTime, baseTime.AddHours(1));
        var later = AmenityBooking.Create(societyId, "a-2", "Gym", "u-2", "apt-2", baseTime.AddHours(3), baseTime.AddHours(4));

        _bookingRepoMock
            .Setup(r => r.GetAllAsync(societyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AmenityBooking> { earlier, later });

        var handler = new ApartmentManagement.Application.Queries.Amenity.GetSocietyBookingsQueryHandler(_bookingRepoMock.Object);
        var result = await handler.Handle(
            new ApartmentManagement.Application.Queries.Amenity.GetSocietyBookingsQuery(
                societyId, new ApartmentManagement.Shared.Models.PaginationParams { Page = 1, PageSize = 10 }),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().HaveCount(2);
        result.Value.Items[0].AmenityName.Should().Be("Gym", "most recent start time comes first");
        result.Value.TotalCount.Should().Be(2);
    }
}
