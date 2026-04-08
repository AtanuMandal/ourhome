# ApartmentManagement.Application - REMAINING FILES (Part 2)

Continue from Part 1 (ALL_FILES_GUIDE.md)

---

# AMENITIES\COMMANDS

## CreateAmenityCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Amenities.Commands;

public record CreateAmenityCommand(
    string SocietyId, string Name, string Description,
    int Capacity, TimeSpan OpenTime, TimeSpan CloseTime,
    decimal PricePerHour, bool RequiresApproval) : IRequest<Result<Amenity>>;

public class CreateAmenityCommandHandler : IRequestHandler<CreateAmenityCommand, Result<Amenity>>
{
    private readonly IAmenityRepository _repo;

    public CreateAmenityCommandHandler(IAmenityRepository repo) => _repo = repo;

    public async Task<Result<Amenity>> Handle(CreateAmenityCommand cmd, CancellationToken ct)
    {
        var amenity = new Amenity
        {
            SocietyId = cmd.SocietyId,
            Name = cmd.Name,
            Description = cmd.Description,
            Capacity = cmd.Capacity,
            OpenTime = cmd.OpenTime,
            CloseTime = cmd.CloseTime,
            PricePerHour = cmd.PricePerHour,
            RequiresApproval = cmd.RequiresApproval
        };
        await _repo.AddAsync(amenity, ct);
        return Result<Amenity>.Success(amenity);
    }
}
```

## UpdateAmenityCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Amenities.Commands;

public record UpdateAmenityCommand(
    string SocietyId, string AmenityId, string Name, string Description,
    int Capacity, TimeSpan OpenTime, TimeSpan CloseTime,
    decimal PricePerHour, bool RequiresApproval, bool IsActive) : IRequest<Result<Amenity>>;

public class UpdateAmenityCommandHandler : IRequestHandler<UpdateAmenityCommand, Result<Amenity>>
{
    private readonly IAmenityRepository _repo;

    public UpdateAmenityCommandHandler(IAmenityRepository repo) => _repo = repo;

    public async Task<Result<Amenity>> Handle(UpdateAmenityCommand cmd, CancellationToken ct)
    {
        var amenity = await _repo.GetByIdAsync(cmd.AmenityId, cmd.SocietyId, ct);
        if (amenity is null)
            return Result<Amenity>.Failure("AMENITY_NOT_FOUND", "Amenity not found.");

        amenity.Name = cmd.Name;
        amenity.Description = cmd.Description;
        amenity.Capacity = cmd.Capacity;
        amenity.OpenTime = cmd.OpenTime;
        amenity.CloseTime = cmd.CloseTime;
        amenity.PricePerHour = cmd.PricePerHour;
        amenity.RequiresApproval = cmd.RequiresApproval;
        amenity.IsActive = cmd.IsActive;
        amenity.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(amenity, amenity.ETag, ct);
        return Result<Amenity>.Success(amenity);
    }
}
```

## CreateBookingCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.Services;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Amenities.Commands;

public record CreateBookingCommand(
    string SocietyId, string AmenityId, string UserId, string ApartmentId,
    DateTime StartTime, DateTime EndTime, string? Notes) : IRequest<Result<AmenityBooking>>;

public class CreateBookingCommandHandler : IRequestHandler<CreateBookingCommand, Result<AmenityBooking>>
{
    private readonly IAmenityRepository _amenityRepo;
    private readonly IAmenityBookingRepository _bookingRepo;
    private readonly IEventPublisher _events;

    public CreateBookingCommandHandler(IAmenityRepository amenityRepo, IAmenityBookingRepository bookingRepo, IEventPublisher events)
    {
        _amenityRepo = amenityRepo;
        _bookingRepo = bookingRepo;
        _events = events;
    }

    public async Task<Result<AmenityBooking>> Handle(CreateBookingCommand cmd, CancellationToken ct)
    {
        var amenity = await _amenityRepo.GetByIdAsync(cmd.AmenityId, cmd.SocietyId, ct);
        if (amenity is null)
            return Result<AmenityBooking>.Failure("AMENITY_NOT_FOUND", "Amenity not found.");

        var overlaps = await _bookingRepo.GetOverlappingBookingsAsync(
            cmd.AmenityId, cmd.SocietyId, cmd.StartTime, cmd.EndTime, null, ct);
        if (overlaps.Count > 0)
            return Result<AmenityBooking>.Failure("BOOKING_CONFLICT", "The requested time slot is not available.");

        var hours = (decimal)(cmd.EndTime - cmd.StartTime).TotalHours;
        var booking = new AmenityBooking
        {
            SocietyId = cmd.SocietyId,
            AmenityId = cmd.AmenityId,
            UserId = cmd.UserId,
            ApartmentId = cmd.ApartmentId,
            StartTime = cmd.StartTime,
            EndTime = cmd.EndTime,
            Notes = cmd.Notes,
            TotalPrice = hours * amenity.PricePerHour,
            Status = amenity.RequiresApproval ? "Pending" : "Approved"
        };

        await _bookingRepo.AddAsync(booking, ct);
        await _events.PublishAsync(new BookingCreatedEvent(cmd.SocietyId, booking.Id, cmd.AmenityId, cmd.UserId), ct);
        return Result<AmenityBooking>.Success(booking);
    }
}
```

## ApproveBookingCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.Services;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Amenities.Commands;

public record ApproveBookingCommand(string SocietyId, string BookingId, string ApprovedBy) : IRequest<Result<AmenityBooking>>;

public class ApproveBookingCommandHandler : IRequestHandler<ApproveBookingCommand, Result<AmenityBooking>>
{
    private readonly IAmenityBookingRepository _repo;
    private readonly IEventPublisher _events;

    public ApproveBookingCommandHandler(IAmenityBookingRepository repo, IEventPublisher events)
    {
        _repo = repo;
        _events = events;
    }

    public async Task<Result<AmenityBooking>> Handle(ApproveBookingCommand cmd, CancellationToken ct)
    {
        var booking = await _repo.GetByIdAsync(cmd.BookingId, cmd.SocietyId, ct);
        if (booking is null)
            return Result<AmenityBooking>.Failure("BOOKING_NOT_FOUND", "Booking not found.");

        booking.Status = "Approved";
        booking.ApprovedBy = cmd.ApprovedBy;
        booking.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(booking, booking.ETag, ct);
        await _events.PublishAsync(new BookingStatusChangedEvent(cmd.SocietyId, cmd.BookingId, booking.UserId, "Approved"), ct);
        return Result<AmenityBooking>.Success(booking);
    }
}
```

## RejectBookingCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.Services;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Amenities.Commands;

public record RejectBookingCommand(string SocietyId, string BookingId, string Reason) : IRequest<Result<AmenityBooking>>;

public class RejectBookingCommandHandler : IRequestHandler<RejectBookingCommand, Result<AmenityBooking>>
{
    private readonly IAmenityBookingRepository _repo;
    private readonly IEventPublisher _events;

    public RejectBookingCommandHandler(IAmenityBookingRepository repo, IEventPublisher events)
    {
        _repo = repo;
        _events = events;
    }

    public async Task<Result<AmenityBooking>> Handle(RejectBookingCommand cmd, CancellationToken ct)
    {
        var booking = await _repo.GetByIdAsync(cmd.BookingId, cmd.SocietyId, ct);
        if (booking is null)
            return Result<AmenityBooking>.Failure("BOOKING_NOT_FOUND", "Booking not found.");

        booking.Status = "Rejected";
        booking.RejectionReason = cmd.Reason;
        booking.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(booking, booking.ETag, ct);
        await _events.PublishAsync(new BookingStatusChangedEvent(cmd.SocietyId, cmd.BookingId, booking.UserId, "Rejected"), ct);
        return Result<AmenityBooking>.Success(booking);
    }
}
```

## CancelBookingCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.Services;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Amenities.Commands;

public record CancelBookingCommand(string SocietyId, string BookingId, string UserId) : IRequest<Result<AmenityBooking>>;

public class CancelBookingCommandHandler : IRequestHandler<CancelBookingCommand, Result<AmenityBooking>>
{
    private readonly IAmenityBookingRepository _repo;
    private readonly IEventPublisher _events;

    public CancelBookingCommandHandler(IAmenityBookingRepository repo, IEventPublisher events)
    {
        _repo = repo;
        _events = events;
    }

    public async Task<Result<AmenityBooking>> Handle(CancelBookingCommand cmd, CancellationToken ct)
    {
        var booking = await _repo.GetByIdAsync(cmd.BookingId, cmd.SocietyId, ct);
        if (booking is null)
            return Result<AmenityBooking>.Failure("BOOKING_NOT_FOUND", "Booking not found.");

        booking.Status = "Cancelled";
        booking.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(booking, booking.ETag, ct);
        await _events.PublishAsync(new BookingStatusChangedEvent(cmd.SocietyId, cmd.BookingId, booking.UserId, "Cancelled"), ct);
        return Result<AmenityBooking>.Success(booking);
    }
}
```

---

# AMENITIES\QUERIES

## GetAmenitiesQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Amenities.Queries;

public record GetAmenitiesQuery(string SocietyId, int Page = 1, int PageSize = 20) : IRequest<Result<PagedResult<Amenity>>>;

public class GetAmenitiesQueryHandler : IRequestHandler<GetAmenitiesQuery, Result<PagedResult<Amenity>>>
{
    private readonly IAmenityRepository _repo;

    public GetAmenitiesQueryHandler(IAmenityRepository repo) => _repo = repo;

    public async Task<Result<PagedResult<Amenity>>> Handle(GetAmenitiesQuery query, CancellationToken ct)
    {
        var result = await _repo.GetPagedAsync(
            $"SELECT * FROM c WHERE c.societyId = '{query.SocietyId}'",
            null, query.Page, query.PageSize, ct);
        return Result<PagedResult<Amenity>>.Success(result);
    }
}
```

## GetAmenityQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Amenities.Queries;

public record GetAmenityQuery(string SocietyId, string AmenityId) : IRequest<Result<Amenity>>;

public class GetAmenityQueryHandler : IRequestHandler<GetAmenityQuery, Result<Amenity>>
{
    private readonly IAmenityRepository _repo;

    public GetAmenityQueryHandler(IAmenityRepository repo) => _repo = repo;

    public async Task<Result<Amenity>> Handle(GetAmenityQuery query, CancellationToken ct)
    {
        var amenity = await _repo.GetByIdAsync(query.AmenityId, query.SocietyId, ct);
        return amenity is null
            ? Result<Amenity>.Failure("AMENITY_NOT_FOUND", "Amenity not found.")
            : Result<Amenity>.Success(amenity);
    }
}
```

## GetBookingQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Amenities.Queries;

public record GetBookingQuery(string SocietyId, string BookingId) : IRequest<Result<AmenityBooking>>;

public class GetBookingQueryHandler : IRequestHandler<GetBookingQuery, Result<AmenityBooking>>
{
    private readonly IAmenityBookingRepository _repo;

    public GetBookingQueryHandler(IAmenityBookingRepository repo) => _repo = repo;

    public async Task<Result<AmenityBooking>> Handle(GetBookingQuery query, CancellationToken ct)
    {
        var booking = await _repo.GetByIdAsync(query.BookingId, query.SocietyId, ct);
        return booking is null
            ? Result<AmenityBooking>.Failure("BOOKING_NOT_FOUND", "Booking not found.")
            : Result<AmenityBooking>.Success(booking);
    }
}
```

## GetAvailabilityQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Amenities.Queries;

public record AvailabilitySlot(DateTime StartTime, DateTime EndTime, bool IsAvailable);

public record GetAvailabilityQuery(string SocietyId, string AmenityId, DateTime Date) : IRequest<Result<IReadOnlyList<AvailabilitySlot>>>;

public class GetAvailabilityQueryHandler : IRequestHandler<GetAvailabilityQuery, Result<IReadOnlyList<AvailabilitySlot>>>
{
    private readonly IAmenityRepository _amenityRepo;
    private readonly IAmenityBookingRepository _bookingRepo;

    public GetAvailabilityQueryHandler(IAmenityRepository amenityRepo, IAmenityBookingRepository bookingRepo)
    {
        _amenityRepo = amenityRepo;
        _bookingRepo = bookingRepo;
    }

    public async Task<Result<IReadOnlyList<AvailabilitySlot>>> Handle(GetAvailabilityQuery query, CancellationToken ct)
    {
        var amenity = await _amenityRepo.GetByIdAsync(query.AmenityId, query.SocietyId, ct);
        if (amenity is null)
            return Result<IReadOnlyList<AvailabilitySlot>>.Failure("AMENITY_NOT_FOUND", "Amenity not found.");

        var dayStart = query.Date.Date.Add(amenity.OpenTime);
        var dayEnd = query.Date.Date.Add(amenity.CloseTime);
        var bookings = await _bookingRepo.GetOverlappingBookingsAsync(
            query.AmenityId, query.SocietyId, dayStart, dayEnd, null, ct);

        var slots = new List<AvailabilitySlot>();
        var current = dayStart;
        while (current.AddHours(1) <= dayEnd)
        {
            var slotEnd = current.AddHours(1);
            var isBooked = bookings.Any(b => b.StartTime < slotEnd && b.EndTime > current);
            slots.Add(new AvailabilitySlot(current, slotEnd, !isBooked));
            current = slotEnd;
        }

        return Result<IReadOnlyList<AvailabilitySlot>>.Success(slots);
    }
}
```

---

# COMPLAINTS\COMMANDS

## CreateComplaintCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Complaints.Commands;

public record CreateComplaintCommand(
    string SocietyId, string RaisedByUserId, string ApartmentId,
    string Category, string Title, string Description, string Priority) : IRequest<Result<Complaint>>;

public class CreateComplaintCommandHandler : IRequestHandler<CreateComplaintCommand, Result<Complaint>>
{
    private readonly IComplaintRepository _repo;

    public CreateComplaintCommandHandler(IComplaintRepository repo) => _repo = repo;

    public async Task<Result<Complaint>> Handle(CreateComplaintCommand cmd, CancellationToken ct)
    {
        var complaint = new Complaint
        {
            SocietyId = cmd.SocietyId,
            RaisedByUserId = cmd.RaisedByUserId,
            ApartmentId = cmd.ApartmentId,
            Category = cmd.Category,
            Title = cmd.Title,
            Description = cmd.Description,
            Priority = cmd.Priority
        };
        await _repo.AddAsync(complaint, ct);
        return Result<Complaint>.Success(complaint);
    }
}
```

## UpdateComplaintStatusCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.Services;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Complaints.Commands;

public record UpdateComplaintStatusCommand(
    string SocietyId, string ComplaintId, string Status, string? Resolution) : IRequest<Result<Complaint>>;

public class UpdateComplaintStatusCommandHandler : IRequestHandler<UpdateComplaintStatusCommand, Result<Complaint>>
{
    private readonly IComplaintRepository _repo;
    private readonly IEventPublisher _events;

    public UpdateComplaintStatusCommandHandler(IComplaintRepository repo, IEventPublisher events)
    {
        _repo = repo;
        _events = events;
    }

    public async Task<Result<Complaint>> Handle(UpdateComplaintStatusCommand cmd, CancellationToken ct)
    {
        var complaint = await _repo.GetByIdAsync(cmd.ComplaintId, cmd.SocietyId, ct);
        if (complaint is null)
            return Result<Complaint>.Failure("COMPLAINT_NOT_FOUND", "Complaint not found.");

        complaint.Status = cmd.Status;
        if (cmd.Resolution is not null) complaint.Resolution = cmd.Resolution;
        if (cmd.Status is "Resolved" or "Closed") complaint.ResolvedAt = DateTime.UtcNow;
        complaint.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(complaint, complaint.ETag, ct);
        await _events.PublishAsync(new ComplaintStatusChangedEvent(cmd.SocietyId, cmd.ComplaintId, complaint.RaisedByUserId, cmd.Status), ct);
        return Result<Complaint>.Success(complaint);
    }
}
```

## AssignComplaintCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Complaints.Commands;

public record AssignComplaintCommand(string SocietyId, string ComplaintId, string AssignToUserId) : IRequest<Result<Complaint>>;

public class AssignComplaintCommandHandler : IRequestHandler<AssignComplaintCommand, Result<Complaint>>
{
    private readonly IComplaintRepository _repo;

    public AssignComplaintCommandHandler(IComplaintRepository repo) => _repo = repo;

    public async Task<Result<Complaint>> Handle(AssignComplaintCommand cmd, CancellationToken ct)
    {
        var complaint = await _repo.GetByIdAsync(cmd.ComplaintId, cmd.SocietyId, ct);
        if (complaint is null)
            return Result<Complaint>.Failure("COMPLAINT_NOT_FOUND", "Complaint not found.");

        complaint.AssignedToUserId = cmd.AssignToUserId;
        complaint.Status = "InProgress";
        complaint.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(complaint, complaint.ETag, ct);
        return Result<Complaint>.Success(complaint);
    }
}
```

## AddComplaintFeedbackCommand.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Complaints.Commands;

public record AddComplaintFeedbackCommand(
    string SocietyId, string ComplaintId, int Rating, string? Comment) : IRequest<Result<Complaint>>;

public class AddComplaintFeedbackCommandHandler : IRequestHandler<AddComplaintFeedbackCommand, Result<Complaint>>
{
    private readonly IComplaintRepository _repo;

    public AddComplaintFeedbackCommandHandler(IComplaintRepository repo) => _repo = repo;

    public async Task<Result<Complaint>> Handle(AddComplaintFeedbackCommand cmd, CancellationToken ct)
    {
        var complaint = await _repo.GetByIdAsync(cmd.ComplaintId, cmd.SocietyId, ct);
        if (complaint is null)
            return Result<Complaint>.Failure("COMPLAINT_NOT_FOUND", "Complaint not found.");

        complaint.FeedbackRating = cmd.Rating;
        complaint.FeedbackComment = cmd.Comment;
        complaint.UpdatedAt = DateTime.UtcNow;
        await _repo.UpdateAsync(complaint, complaint.ETag, ct);
        return Result<Complaint>.Success(complaint);
    }
}
```

---

# COMPLAINTS\QUERIES

## GetComplaintsQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Complaints.Queries;

public record GetComplaintsQuery(string SocietyId, int Page = 1, int PageSize = 20) : IRequest<Result<PagedResult<Complaint>>>;

public class GetComplaintsQueryHandler : IRequestHandler<GetComplaintsQuery, Result<PagedResult<Complaint>>>
{
    private readonly IComplaintRepository _repo;

    public GetComplaintsQueryHandler(IComplaintRepository repo) => _repo = repo;

    public async Task<Result<PagedResult<Complaint>>> Handle(GetComplaintsQuery query, CancellationToken ct)
    {
        var result = await _repo.GetPagedAsync(
            $"SELECT * FROM c WHERE c.societyId = '{query.SocietyId}' ORDER BY c.createdAt DESC",
            null, query.Page, query.PageSize, ct);
        return Result<PagedResult<Complaint>>.Success(result);
    }
}
```

## GetComplaintQuery.cs
```csharp
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Result;
using MediatR;

namespace ApartmentManagement.Application.Complaints.Queries;

public record GetComplaintQuery(string SocietyId, string ComplaintId) : IRequest<Result<Complaint>>;

public class GetComplaintQueryHandler : IRequestHandler<GetComplaintQuery, Result<Complaint>>
{
    private readonly IComplaintRepository _repo;

    public GetComplaintQueryHandler(IComplaintRepository repo) => _repo = repo;

    public async Task<Result<Complaint>> Handle(GetComplaintQuery query, CancellationToken ct)
    {
        var complaint = await _repo.GetByIdAsync(query.ComplaintId, query.SocietyId, ct);
        return complaint is null
            ? Result<Complaint>.Failure("COMPLAINT_NOT_FOUND", "Complaint not found.")
            : Result<Complaint>.Success(complaint);
    }
}
```

---

Continue with more files in the next document...
