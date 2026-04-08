using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Application.Commands.Amenity
{

// ─── Create Amenity ───────────────────────────────────────────────────────────

public record CreateAmenityCommand(
    string SocietyId, string Name, string Description, int Capacity, string Rules,
    int BookingSlotMinutes, string OperatingStart, string OperatingEnd, int AdvanceBookingDays)
    : IRequest<Result<AmenityResponse>>;

public sealed class CreateAmenityCommandHandler(
    IAmenityRepository amenityRepository,
    ILogger<CreateAmenityCommandHandler> logger)
    : IRequestHandler<CreateAmenityCommand, Result<AmenityResponse>>
{
    public async Task<Result<AmenityResponse>> Handle(CreateAmenityCommand request, CancellationToken ct)
    {
        try
        {
            var start = TimeOnly.Parse(request.OperatingStart);
            var end = TimeOnly.Parse(request.OperatingEnd);

            var amenity = Domain.Entities.Amenity.Create(
                request.SocietyId, request.Name, request.Description, request.Capacity,
                request.Rules, request.BookingSlotMinutes, start, end, request.AdvanceBookingDays);

            var created = await amenityRepository.CreateAsync(amenity, ct);
            return Result<AmenityResponse>.Success(created.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create amenity {Name}", request.Name);
            return Result<AmenityResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Update Amenity ───────────────────────────────────────────────────────────

public record UpdateAmenityCommand(
    string SocietyId, string AmenityId, string Name, string Description, int Capacity, string Rules,
    int BookingSlotMinutes, string OperatingStart, string OperatingEnd, int AdvanceBookingDays)
    : IRequest<Result<AmenityResponse>>;

public sealed class UpdateAmenityCommandHandler(
    IAmenityRepository amenityRepository,
    ILogger<UpdateAmenityCommandHandler> logger)
    : IRequestHandler<UpdateAmenityCommand, Result<AmenityResponse>>
{
    public async Task<Result<AmenityResponse>> Handle(UpdateAmenityCommand request, CancellationToken ct)
    {
        try
        {
            var amenity = await amenityRepository.GetByIdAsync(request.AmenityId, request.SocietyId, ct)
                ?? throw new NotFoundException("Amenity", request.AmenityId);

            var start = TimeOnly.Parse(request.OperatingStart);
            var end = TimeOnly.Parse(request.OperatingEnd);
            amenity.Update(request.Name, request.Description, request.Capacity, request.Rules,
                request.BookingSlotMinutes, start, end, request.AdvanceBookingDays);

            var updated = await amenityRepository.UpdateAsync(amenity, ct);
            return Result<AmenityResponse>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<AmenityResponse>.Failure(ErrorCodes.AmenityNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update amenity {AmenityId}", request.AmenityId);
            return Result<AmenityResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Book Amenity ─────────────────────────────────────────────────────────────

public record BookAmenityCommand(
    string SocietyId, string AmenityId, string UserId, string ApartmentId,
    DateTime StartTime, DateTime EndTime)
    : IRequest<Result<BookingResponse>>;

public sealed class BookAmenityCommandHandler(
    IAmenityRepository amenityRepository,
    IAmenityBookingRepository bookingRepository,
    INotificationService notificationService,
    IEventPublisher eventPublisher,
    ILogger<BookAmenityCommandHandler> logger)
    : IRequestHandler<BookAmenityCommand, Result<BookingResponse>>
{
    public async Task<Result<BookingResponse>> Handle(BookAmenityCommand request, CancellationToken ct)
    {
        try
        {
            var amenity = await amenityRepository.GetByIdAsync(request.AmenityId, request.SocietyId, ct)
                ?? throw new NotFoundException("Amenity", request.AmenityId);

            if (!amenity.IsActive)
                return Result<BookingResponse>.Failure(ErrorCodes.AmenityUnavailable, "Amenity is not active.");

            var startTime = TimeOnly.FromDateTime(request.StartTime);
            var endTime = TimeOnly.FromDateTime(request.EndTime);

            if (!amenity.IsWithinOperatingHours(startTime))
                return Result<BookingResponse>.Failure(ErrorCodes.OutsideOperatingHours,
                    "Start time is outside operating hours.");
            if (!amenity.IsWithinOperatingHours(endTime))
                return Result<BookingResponse>.Failure(ErrorCodes.OutsideOperatingHours,
                    "End time is outside operating hours.");

            if (request.StartTime > DateTime.UtcNow.AddDays(amenity.AdvanceBookingDays))
                return Result<BookingResponse>.Failure(ErrorCodes.BookingWindowExceeded,
                    $"Cannot book more than {amenity.AdvanceBookingDays} days in advance.");

            var existingBookings = await bookingRepository.GetByAmenityAsync(
                request.SocietyId, request.AmenityId,
                DateOnly.FromDateTime(request.StartTime), ct);

            var overlap = existingBookings.Any(b => b.IsOverlapping(request.StartTime, request.EndTime));
            if (overlap)
                return Result<BookingResponse>.Failure(ErrorCodes.BookingConflict,
                    "The requested time slot is already booked.");

            var booking = AmenityBooking.Create(
                request.SocietyId, request.AmenityId, amenity.Name,
                request.UserId, request.ApartmentId, request.StartTime, request.EndTime);

            var created = await bookingRepository.CreateAsync(booking, ct);

            foreach (var evt in created.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            created.ClearDomainEvents();

            await notificationService.SendPushNotificationAsync(request.UserId,
                "Booking Received",
                $"Your booking for {amenity.Name} on {request.StartTime:MMM d} is pending approval.", ct);

            return Result<BookingResponse>.Success(created.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<BookingResponse>.Failure(ErrorCodes.AmenityNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to book amenity {AmenityId}", request.AmenityId);
            return Result<BookingResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Approve Booking ──────────────────────────────────────────────────────────

public record ApproveBookingCommand(string SocietyId, string BookingId, string? AdminNotes)
    : IRequest<Result<BookingResponse>>;

public sealed class ApproveBookingCommandHandler(
    IAmenityBookingRepository bookingRepository,
    INotificationService notificationService,
    ILogger<ApproveBookingCommandHandler> logger)
    : IRequestHandler<ApproveBookingCommand, Result<BookingResponse>>
{
    public async Task<Result<BookingResponse>> Handle(ApproveBookingCommand request, CancellationToken ct)
    {
        try
        {
            var booking = await bookingRepository.GetByIdAsync(request.BookingId, request.SocietyId, ct)
                ?? throw new NotFoundException("Booking", request.BookingId);

            booking.Approve(request.AdminNotes);
            var updated = await bookingRepository.UpdateAsync(booking, ct);

            await notificationService.SendPushNotificationAsync(booking.BookedByUserId,
                "Booking Approved",
                $"Your booking has been approved!", ct);

            return Result<BookingResponse>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<BookingResponse>.Failure(ErrorCodes.BookingNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to approve booking {BookingId}", request.BookingId);
            return Result<BookingResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Reject Booking ───────────────────────────────────────────────────────────

public record RejectBookingCommand(string SocietyId, string BookingId, string? AdminNotes)
    : IRequest<Result<BookingResponse>>;

public sealed class RejectBookingCommandHandler(
    IAmenityBookingRepository bookingRepository,
    INotificationService notificationService,
    ILogger<RejectBookingCommandHandler> logger)
    : IRequestHandler<RejectBookingCommand, Result<BookingResponse>>
{
    public async Task<Result<BookingResponse>> Handle(RejectBookingCommand request, CancellationToken ct)
    {
        try
        {
            var booking = await bookingRepository.GetByIdAsync(request.BookingId, request.SocietyId, ct)
                ?? throw new NotFoundException("Booking", request.BookingId);

            booking.Reject(request.AdminNotes);
            var updated = await bookingRepository.UpdateAsync(booking, ct);

            await notificationService.SendPushNotificationAsync(booking.BookedByUserId,
                "Booking Rejected",
                $"Your booking has been rejected. Notes: {request.AdminNotes}", ct);

            return Result<BookingResponse>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<BookingResponse>.Failure(ErrorCodes.BookingNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to reject booking {BookingId}", request.BookingId);
            return Result<BookingResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Cancel Booking ───────────────────────────────────────────────────────────

public record CancelBookingCommand(string SocietyId, string BookingId, string UserId) : IRequest<Result<bool>>;

public sealed class CancelBookingCommandHandler(
    IAmenityBookingRepository bookingRepository,
    ICurrentUserService currentUser,
    ILogger<CancelBookingCommandHandler> logger)
    : IRequestHandler<CancelBookingCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(CancelBookingCommand request, CancellationToken ct)
    {
        try
        {
            var booking = await bookingRepository.GetByIdAsync(request.BookingId, request.SocietyId, ct)
                ?? throw new NotFoundException("Booking", request.BookingId);

            bool isOwner = booking.BookedByUserId == request.UserId;
            bool isAdmin = currentUser.IsInRoles("SUAdmin", "HQAdmin");

            if (!isOwner && !isAdmin)
                throw new ForbiddenException("Only the booking owner or an admin can cancel a booking.");

            booking.Cancel();
            await bookingRepository.UpdateAsync(booking, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.BookingNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<bool>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to cancel booking {BookingId}", request.BookingId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

}

namespace ApartmentManagement.Application.Queries.Amenity
{

public record GetAmenityQuery(string SocietyId, string AmenityId) : IRequest<Result<AmenityResponse>>;

public sealed class GetAmenityQueryHandler(IAmenityRepository amenityRepository)
    : IRequestHandler<GetAmenityQuery, Result<AmenityResponse>>
{
    public async Task<Result<AmenityResponse>> Handle(GetAmenityQuery request, CancellationToken ct)
    {
        try
        {
            var amenity = await amenityRepository.GetByIdAsync(request.AmenityId, request.SocietyId, ct)
                ?? throw new NotFoundException("Amenity", request.AmenityId);
            return Result<AmenityResponse>.Success(amenity.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<AmenityResponse>.Failure(ErrorCodes.AmenityNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<AmenityResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetAmenitiesBySocietyQuery(string SocietyId) : IRequest<Result<IReadOnlyList<AmenityResponse>>>;

public sealed class GetAmenitiesBySocietyQueryHandler(IAmenityRepository amenityRepository)
    : IRequestHandler<GetAmenitiesBySocietyQuery, Result<IReadOnlyList<AmenityResponse>>>
{
    public async Task<Result<IReadOnlyList<AmenityResponse>>> Handle(GetAmenitiesBySocietyQuery request, CancellationToken ct)
    {
        try
        {
            var amenities = await amenityRepository.GetActiveAsync(request.SocietyId, ct);
            var items = amenities.Select(a => a.ToResponse()).ToList();
            return Result<IReadOnlyList<AmenityResponse>>.Success(items);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<AmenityResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetAmenityAvailabilityQuery(string SocietyId, string AmenityId, DateOnly Date)
    : IRequest<Result<IReadOnlyList<AvailabilitySlot>>>;

public sealed class GetAmenityAvailabilityQueryHandler(
    IAmenityRepository amenityRepository,
    IAmenityBookingRepository bookingRepository)
    : IRequestHandler<GetAmenityAvailabilityQuery, Result<IReadOnlyList<AvailabilitySlot>>>
{
    public async Task<Result<IReadOnlyList<AvailabilitySlot>>> Handle(GetAmenityAvailabilityQuery request, CancellationToken ct)
    {
        try
        {
            var amenity = await amenityRepository.GetByIdAsync(request.AmenityId, request.SocietyId, ct)
                ?? throw new NotFoundException("Amenity", request.AmenityId);

            var bookings = await bookingRepository.GetByAmenityAsync(
                request.SocietyId, request.AmenityId, request.Date, ct);

            var slots = new List<AvailabilitySlot>();
            var current = request.Date.ToDateTime(amenity.OperatingStart, DateTimeKind.Utc);
            var endOfDay = request.Date.ToDateTime(amenity.OperatingEnd, DateTimeKind.Utc);

            while (current.AddMinutes(amenity.BookingSlotMinutes) <= endOfDay)
            {
                var slotEnd = current.AddMinutes(amenity.BookingSlotMinutes);
                var isUnavailable = bookings.Any(b => b.IsOverlapping(current, slotEnd));
                slots.Add(new AvailabilitySlot(current, slotEnd, !isUnavailable));
                current = slotEnd;
            }

            return Result<IReadOnlyList<AvailabilitySlot>>.Success(slots);
        }
        catch (NotFoundException ex)
        {
            return Result<IReadOnlyList<AvailabilitySlot>>.Failure(ErrorCodes.AmenityNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<AvailabilitySlot>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetMyBookingsQuery(string SocietyId, string UserId, PaginationParams Pagination)
    : IRequest<Result<PagedResult<BookingResponse>>>;

public sealed class GetMyBookingsQueryHandler(IAmenityBookingRepository bookingRepository)
    : IRequestHandler<GetMyBookingsQuery, Result<PagedResult<BookingResponse>>>
{
    public async Task<Result<PagedResult<BookingResponse>>> Handle(GetMyBookingsQuery request, CancellationToken ct)
    {
        try
        {
            var bookings = await bookingRepository.GetByUserAsync(
                request.SocietyId, request.UserId,
                request.Pagination.Page, request.Pagination.PageSize, ct);
            var items = bookings.Select(b => b.ToResponse()).ToList();
            return Result<PagedResult<BookingResponse>>.Success(
                new PagedResult<BookingResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<BookingResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
}