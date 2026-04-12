using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Domain.Entities;

namespace ApartmentManagement.Application.Mappings;

public static class MappingExtensions
{
    public static SocietyResponse ToResponse(this Society society) =>
        new(
            society.Id,
            society.Name,
            new AddressDto(
                society.Address.Street,
                society.Address.City,
                society.Address.State,
                society.Address.PostalCode,
                society.Address.Country),
            society.ContactEmail,
            society.ContactPhone,
            society.TotalBlocks,
            society.TotalApartments,
            society.Status.ToString(),
            society.AdminUserIds,
            society.CreatedAt);

    public static ApartmentResponse ToResponse(this Apartment apartment) =>
        new(
            apartment.Id,
            apartment.SocietyId,
            apartment.ApartmentNumber,
            apartment.BlockName,
            apartment.FloorNumber,
            apartment.NumberOfRooms,
            apartment.ParkingSlots,
            apartment.CarpetArea,
            apartment.BuildUpArea,
            apartment.SuperBuildArea,
            apartment.Status.ToString(),
            apartment.OwnerId,
            apartment.TenantId,
            apartment.OwnershipHistory.Select(h => new ApartmentResidentHistoryDto(h.UserId, h.FullName, h.FromUtc, h.ToUtc)).ToList(),
            apartment.TenantHistory.Select(h => new ApartmentResidentHistoryDto(h.UserId, h.FullName, h.FromUtc, h.ToUtc)).ToList(),
            apartment.CreatedAt);

    public static ApartmentResidentHistoryResponse ToResidentHistoryResponse(this Apartment apartment) =>
        new(
            apartment.Id,
            apartment.ApartmentNumber,
            apartment.OwnerId,
            apartment.TenantId,
            apartment.OwnershipHistory.Select(h => new ApartmentResidentHistoryDto(h.UserId, h.FullName, h.FromUtc, h.ToUtc)).ToList(),
            apartment.TenantHistory.Select(h => new ApartmentResidentHistoryDto(h.UserId, h.FullName, h.FromUtc, h.ToUtc)).ToList());

    public static UserResponse ToResponse(this User user) =>
        new(
            user.Id,
            user.SocietyId,
            user.FullName,
            user.Email,
            user.Phone,
            user.Role.ToString(),
            user.ResidentType.ToString(),
            user.ApartmentId,
            user.InvitedByUserId,
            user.IsActive,
            user.IsVerified,
            user.HasPassword,
            user.GetPermissions(),
            user.CreatedAt);

    public static AuthUserDto ToAuthUser(this User user) =>
        new(
            user.Id,
            user.SocietyId,
            user.FullName,
            user.Email,
            user.Phone,
            user.Role.ToString(),
            user.ResidentType.ToString(),
            user.ApartmentId,
            user.IsVerified,
            user.GetPermissions());

    public static AmenityResponse ToResponse(this Amenity amenity) =>
        new(
            amenity.Id,
            amenity.SocietyId,
            amenity.Name,
            amenity.Description,
            amenity.Capacity,
            amenity.Rules,
            amenity.IsActive,
            amenity.BookingSlotMinutes,
            amenity.OperatingStart.ToString("HH:mm"),
            amenity.OperatingEnd.ToString("HH:mm"),
            amenity.AdvanceBookingDays);

    public static BookingResponse ToResponse(this AmenityBooking booking) =>
        new(
            booking.Id,
            booking.SocietyId,
            booking.AmenityId,
            booking.AmenityName,
            booking.BookedByUserId,
            booking.BookedByApartmentId,
            booking.StartTime,
            booking.EndTime,
            booking.Status.ToString(),
            booking.AdminNotes,
            booking.Duration.TotalMinutes,
            booking.CreatedAt);

    public static ComplaintResponse ToResponse(this Complaint complaint) =>
        new(
            complaint.Id,
            complaint.SocietyId,
            complaint.ApartmentId,
            complaint.RaisedByUserId,
            complaint.Title,
            complaint.Description,
            complaint.Category.ToString(),
            complaint.Status.ToString(),
            complaint.Priority.ToString(),
            complaint.AssignedToUserId,
            complaint.AttachmentUrls,
            complaint.CreatedAt,
            complaint.UpdatedAt,
            complaint.ResolvedAt,
            complaint.FeedbackRating,
            complaint.FeedbackComment);

    public static NoticeResponse ToResponse(this Notice notice) =>
        new(
            notice.Id,
            notice.SocietyId,
            notice.Title,
            notice.Content,
            notice.Category.ToString(),
            notice.PostedByUserId,
            notice.IsArchived,
            notice.PublishAt,
            notice.ExpiresAt,
            notice.IsActive,
            notice.CreatedAt,
            notice.TargetApartmentIds);

    public static VisitorResponse ToResponse(this VisitorLog log) =>
        new(
            log.Id,
            log.SocietyId,
            log.VisitorName,
            log.VisitorPhone,
            log.Purpose,
            log.HostApartmentId,
            log.Status.ToString(),
            log.QrCode,
            log.PassCode,
            log.CheckInTime,
            log.CheckOutTime,
            log.Duration?.TotalMinutes,
            log.CreatedAt);

    public static FeeScheduleResponse ToResponse(this FeeSchedule schedule) =>
        new(
            schedule.Id,
            schedule.SocietyId,
            schedule.ApartmentId,
            schedule.Description,
            schedule.Amount,
            schedule.Frequency.ToString(),
            schedule.DueDay,
            schedule.NextDueDate,
            schedule.IsActive);

    public static FeePaymentResponse ToResponse(this FeePayment payment) =>
        new(
            payment.Id,
            payment.SocietyId,
            payment.ApartmentId,
            payment.FeeScheduleId,
            payment.Description,
            payment.Amount,
            payment.Status.ToString(),
            payment.DueDate,
            payment.PaidAt,
            payment.PaymentMethod,
            payment.TransactionId,
            payment.ReceiptUrl);

    public static CompetitionResponse ToResponse(this Competition competition) =>
        new(
            competition.Id,
            competition.SocietyId,
            competition.Title,
            competition.Description,
            competition.StartDate,
            competition.EndDate,
            competition.Status.ToString(),
            competition.Prize,
            competition.MaxParticipants,
            competition.CreatedAt);

    public static CompetitionEntryResponse ToResponse(this CompetitionEntry entry) =>
        new(
            entry.Id,
            entry.CompetitionId,
            entry.ApartmentId,
            entry.UserId,
            entry.Score,
            entry.Rank,
            entry.RegisteredAt);

    public static ServiceProviderResponse ToResponse(this ServiceProvider provider) =>
        new(
            provider.Id,
            provider.ProviderName,
            provider.ContactName,
            provider.ContactPhone,
            provider.ServiceTypes,
            provider.Description,
            provider.Status.ToString(),
            provider.Rating,
            provider.ReviewCount);

    public static ServiceRequestResponse ToResponse(this ServiceProviderRequest request) =>
        new(
            request.Id,
            request.SocietyId,
            request.ApartmentId,
            request.ServiceType,
            request.Description,
            request.PreferredDateTime,
            request.Status.ToString(),
            request.AcceptedByProviderId,
            request.Rating,
            request.ReviewComment,
            request.CreatedAt);

    public static IReadOnlyList<string> GetPermissions(this User user)
    {
        var permissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (user.Role is Domain.Enums.UserRole.HQAdmin or Domain.Enums.UserRole.SUAdmin)
        {
            permissions.Add("manage_society");
            permissions.Add("view_financials");
            permissions.Add("transfer_ownership");
            permissions.Add("transfer_tenancy");
            permissions.Add("add_family_member");
            permissions.Add("add_cooccupant");
        }

        switch (user.ResidentType)
        {
            case Domain.Enums.ResidentType.Owner:
                permissions.Add("view_financials");
                permissions.Add("transfer_ownership");
                permissions.Add("add_family_member");
                break;
            case Domain.Enums.ResidentType.Tenant:
                permissions.Add("transfer_tenancy");
                permissions.Add("add_cooccupant");
                break;
        }

        return permissions.ToList();
    }
}
