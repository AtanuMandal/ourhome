using ApartmentManagement.Application.Commands.Amenity;
using ApartmentManagement.Application.Commands.Complaint;
using ApartmentManagement.Application.Queries.Amenity;
using ApartmentManagement.Application.Queries.Complaint;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Shared.Models;
using ApartmentManagement.Tests.L2.TestInfrastructure;
using FluentAssertions;

namespace ApartmentManagement.Tests.L2;

public class AmenityComplaintIntegrationTests : IntegrationTestBase
{
    private const string SocietyId = "society-amenity-001";
    private const string UserId = "user-001";
    private const string ApartmentId = "apt-001";

    // ─── Booking time helpers ─────────────────────────────────────────────────
    // Use tomorrow at 10:00–11:00 UTC so we're:
    //   (a) in the future (validator: StartTime > UtcNow)
    //   (b) within operating hours 08:00–22:00
    //   (c) within AdvanceBookingDays = 30

    private static DateTime TomorrowAt(int hour) =>
        DateTime.UtcNow.Date.AddDays(1).AddHours(hour);

    // ─── Amenity: create → retrieve ──────────────────────────────────────────

    private async Task<string> CreateTestAmenityAsync(string name = "Gym")
    {
        var cmd = new CreateAmenityCommand(
            SocietyId, name, $"{name} description", 20, "No shoes",
            60, "08:00", "22:00", 30);
        var result = await Mediator.Send(cmd);
        result.IsSuccess.Should().BeTrue();
        return result.Value!.Id;
    }

    [Fact]
    public async Task CreateAmenity_ThenGetById_ReturnsAmenity()
    {
        var cmd = new CreateAmenityCommand(
            SocietyId, "Swimming Pool", "Outdoor pool", 30, "No diving",
            60, "07:00", "21:00", 14);

        var createResult = await Mediator.Send(cmd);

        createResult.IsSuccess.Should().BeTrue();
        var amenity = createResult.Value!;
        amenity.Name.Should().Be("Swimming Pool");
        amenity.Capacity.Should().Be(30);
        amenity.IsActive.Should().BeTrue();

        var getResult = await Mediator.Send(new GetAmenityQuery(SocietyId, amenity.Id));
        getResult.IsSuccess.Should().BeTrue();
        getResult.Value!.Id.Should().Be(amenity.Id);
    }

    [Fact]
    public async Task GetAmenitiesBySociety_ReturnsActiveAmenities()
    {
        await CreateTestAmenityAsync("Gym");
        await CreateTestAmenityAsync("Clubhouse");

        var result = await Mediator.Send(new GetAmenitiesBySocietyQuery(SocietyId));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Should().HaveCountGreaterThanOrEqualTo(2);
        result.Value.Should().OnlyContain(a => a.IsActive);
    }

    // ─── Amenity: book → appears in user's bookings ───────────────────────────

    [Fact]
    public async Task BookAmenity_ThenGetMyBookings_BookingAppears()
    {
        var amenityId = await CreateTestAmenityAsync("Tennis Court");

        var bookCmd = new BookAmenityCommand(
            SocietyId, amenityId, UserId, ApartmentId,
            TomorrowAt(10), TomorrowAt(11));

        var bookResult = await Mediator.Send(bookCmd);

        bookResult.IsSuccess.Should().BeTrue();
        bookResult.Value!.Status.Should().Be("Pending");

        // Check it appears in user bookings
        var myBookings = await Mediator.Send(new GetMyBookingsQuery(
            SocietyId, UserId, new PaginationParams { Page = 1, PageSize = 10 }));

        myBookings.IsSuccess.Should().BeTrue();
        myBookings.Value!.Items.Should().ContainSingle(b => b.AmenityId == amenityId);
    }

    // ─── Amenity: overlapping slot → conflict ─────────────────────────────────

    [Fact]
    public async Task BookAmenity_OverlappingSlot_ReturnsConflict()
    {
        var amenityId = await CreateTestAmenityAsync("Badminton Court");

        // First booking: 10:00–11:00
        var first = await Mediator.Send(new BookAmenityCommand(
            SocietyId, amenityId, UserId, ApartmentId,
            TomorrowAt(10), TomorrowAt(11)));
        first.IsSuccess.Should().BeTrue();

        // Second booking: 10:30–11:30 — overlaps
        var second = await Mediator.Send(new BookAmenityCommand(
            SocietyId, amenityId, "user-002", "apt-002",
            TomorrowAt(10), TomorrowAt(11)));

        second.IsFailure.Should().BeTrue();
        second.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.BookingConflict);
    }

    // ─── Amenity: approve booking ─────────────────────────────────────────────

    [Fact]
    public async Task ApproveBooking_ChangesStatusToApproved()
    {
        var amenityId = await CreateTestAmenityAsync("Conference Room");

        var booking = (await Mediator.Send(new BookAmenityCommand(
            SocietyId, amenityId, UserId, ApartmentId,
            TomorrowAt(14), TomorrowAt(15)))).Value!;

        var approveResult = await Mediator.Send(new ApproveBookingCommand(
            SocietyId, booking.Id, "Looks good"));

        approveResult.IsSuccess.Should().BeTrue();
        approveResult.Value!.Status.Should().Be("Approved");

        NotificationService.SentPushNotifications.Should().Contain(n =>
            n.UserId == UserId && n.Title.Contains("Approved"));
    }

    // ─── Amenity: reject booking ──────────────────────────────────────────────

    [Fact]
    public async Task RejectBooking_ChangesStatusToRejected()
    {
        var amenityId = await CreateTestAmenityAsync("Party Hall");

        var booking = (await Mediator.Send(new BookAmenityCommand(
            SocietyId, amenityId, UserId, ApartmentId,
            TomorrowAt(16), TomorrowAt(18)))).Value!;

        var rejectResult = await Mediator.Send(new RejectBookingCommand(
            SocietyId, booking.Id, "Hall not available"));

        rejectResult.IsSuccess.Should().BeTrue();
        rejectResult.Value!.Status.Should().Be("Rejected");
    }

    // ─── Amenity: cancel booking ──────────────────────────────────────────────

    [Fact]
    public async Task CancelBooking_ByOwner_Succeeds()
    {
        // Make the CurrentUserService match the booking owner
        CurrentUserService.UserId = UserId;

        var amenityId = await CreateTestAmenityAsync("Yoga Room");

        var booking = (await Mediator.Send(new BookAmenityCommand(
            SocietyId, amenityId, UserId, ApartmentId,
            TomorrowAt(19), TomorrowAt(20)))).Value!;

        var cancelResult = await Mediator.Send(new CancelBookingCommand(SocietyId, booking.Id, UserId));

        cancelResult.IsSuccess.Should().BeTrue();
        BookingRepo.Store[booking.Id].Status.Should().Be(BookingStatus.Cancelled);
    }

    // ─── Amenity availability ─────────────────────────────────────────────────

    [Fact]
    public async Task GetAmenityAvailability_ShowsCorrectSlots()
    {
        var amenityId = await CreateTestAmenityAsync("Squash Court");
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

        var result = await Mediator.Send(new GetAmenityAvailabilityQuery(SocietyId, amenityId, tomorrow));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Should().NotBeEmpty("operating hours span 08:00–22:00 with 60-min slots → 14 slots");
        result.Value.Should().OnlyContain(s => s.IsAvailable, "no bookings yet");
    }

    // ─── Complaint: create → status changes ──────────────────────────────────

    private async Task<string> CreateTestComplaintAsync(string userId = UserId)
    {
        var cmd = new CreateComplaintCommand(
            SocietyId, ApartmentId, userId,
            "Leaking tap", "Kitchen tap leaking since 3 days",
            ComplaintCategory.Maintenance, ComplaintPriority.Medium, []);
        var result = await Mediator.Send(cmd);
        result.IsSuccess.Should().BeTrue();
        return result.Value!.Id;
    }

    [Fact]
    public async Task CreateComplaint_ThenGetById_ReturnsOpenComplaint()
    {
        var complaintId = await CreateTestComplaintAsync();

        var result = await Mediator.Send(new GetComplaintQuery(SocietyId, complaintId));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("Open");
        result.Value.Title.Should().Be("Leaking tap");
    }

    [Fact]
    public async Task UpdateComplaintStatus_ToInProgress_AssignsStaff()
    {
        var complaintId = await CreateTestComplaintAsync();

        var result = await Mediator.Send(new UpdateComplaintStatusCommand(
            SocietyId, complaintId, ComplaintStatus.InProgress, "staff-user-001", "Assigned to John"));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("InProgress");
        result.Value.AssignedToUserId.Should().Be("staff-user-001");
    }

    [Fact]
    public async Task UpdateComplaintStatus_ToResolved_SetsResolvedStatus()
    {
        var complaintId = await CreateTestComplaintAsync();

        // Must be InProgress first (assign it)
        await Mediator.Send(new UpdateComplaintStatusCommand(
            SocietyId, complaintId, ComplaintStatus.InProgress, "staff-001", null));

        var result = await Mediator.Send(new UpdateComplaintStatusCommand(
            SocietyId, complaintId, ComplaintStatus.Resolved, null, null));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Status.Should().Be("Resolved");
    }

    [Fact]
    public async Task AddComplaintFeedback_ByRaiser_FeedbackStored()
    {
        var complaintId = await CreateTestComplaintAsync(UserId);

        // Resolve it first so feedback can be added
        await Mediator.Send(new UpdateComplaintStatusCommand(
            SocietyId, complaintId, ComplaintStatus.InProgress, "staff-001", null));
        await Mediator.Send(new UpdateComplaintStatusCommand(
            SocietyId, complaintId, ComplaintStatus.Resolved, null, null));

        var feedbackResult = await Mediator.Send(new AddComplaintFeedbackCommand(
            SocietyId, complaintId, UserId, 4, "Quick resolution, thanks!"));

        feedbackResult.IsSuccess.Should().BeTrue();

        var stored = ComplaintRepo.Store[complaintId];
        stored.FeedbackRating.Should().Be(4);
        stored.FeedbackComment.Should().Be("Quick resolution, thanks!");
    }

    [Fact]
    public async Task AddComplaintFeedback_ByDifferentUser_ReturnsForbidden()
    {
        var complaintId = await CreateTestComplaintAsync(UserId);

        var result = await Mediator.Send(new AddComplaintFeedbackCommand(
            SocietyId, complaintId, "other-user-id", 5, "Not my complaint"));

        result.IsFailure.Should().BeTrue();
        result.ErrorCode.Should().Be(ApartmentManagement.Shared.Constants.ErrorCodes.Forbidden);
    }

    [Fact]
    public async Task UpdateComplaintStatus_ToInProgress_WithoutAssignee_ReturnsValidationFailure()
    {
        var complaintId = await CreateTestComplaintAsync();

        var result = await Mediator.Send(new UpdateComplaintStatusCommand(
            SocietyId, complaintId, ComplaintStatus.InProgress,
            null,   // no assignee → should fail
            null));

        result.IsFailure.Should().BeTrue();
    }

    // ─── GetComplaintsBySociety ───────────────────────────────────────────────

    [Fact]
    public async Task GetComplaintsBySociety_WithStatusFilter_ReturnsFiltered()
    {
        await CreateTestComplaintAsync("user-a");
        var closedId = await CreateTestComplaintAsync("user-b");

        // Close one of them
        await Mediator.Send(new UpdateComplaintStatusCommand(SocietyId, closedId, ComplaintStatus.Closed, null, null));

        var result = await Mediator.Send(new GetComplaintsBySocietyQuery(
            SocietyId,
            new PaginationParams { Page = 1, PageSize = 20 },
            ComplaintStatus.Open, null));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().NotContain(c => c.Id == closedId);
        result.Value.Items.Should().OnlyContain(c => c.Status == "Open");
    }

    // ─── GetComplaintsByApartment ─────────────────────────────────────────────

    [Fact]
    public async Task GetComplaintsByApartment_ReturnsOnlyApartmentComplaints()
    {
        await CreateTestComplaintAsync();

        var result = await Mediator.Send(new GetComplaintsByApartmentQuery(
            SocietyId, ApartmentId, new PaginationParams { Page = 1, PageSize = 10 }));

        result.IsSuccess.Should().BeTrue();
        result.Value!.Items.Should().OnlyContain(c => c.ApartmentId == ApartmentId);
    }
}
