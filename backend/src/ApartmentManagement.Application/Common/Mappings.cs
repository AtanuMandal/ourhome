using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Domain.Entities;

namespace ApartmentManagement.Application.Mappings;

public static class MappingExtensions
{
    public static string ToDisplayLabel(this Apartment apartment)
    {
        var apartmentNumber = apartment.ApartmentNumber.Trim();
        var blockName = apartment.BlockName.Trim();
        return string.IsNullOrWhiteSpace(blockName)
            ? $"{apartment.FloorNumber}-{apartmentNumber}"
            : $"{blockName} {apartment.FloorNumber}-{apartmentNumber}";
    }

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
            society.MaintenanceOverdueThresholdDays,
            society.SocietyUsers
                .Select(user => new SocietyUserAssignmentDto(user.UserId, user.FullName, user.Email, user.RoleTitle))
                .ToList(),
            society.Committees
                .Select(committee => new SocietyCommitteeDto(
                    committee.Name,
                    committee.Members.Select(member =>
                        new SocietyUserAssignmentDto(member.UserId, member.FullName, member.Email, member.RoleTitle)).ToList()))
                .ToList(),
            society.ThemeId,
            society.MaxUsersPerApartment,
            society.VisitorOverstayThresholdHours);

    public static ApartmentResponse ToResponse(this Apartment apartment) =>
        new(
            apartment.Id,
            apartment.ApartmentNumber,
            apartment.BlockName,
            apartment.FloorNumber,
            apartment.NumberOfRooms,
            apartment.ParkingSlots,
            apartment.CarpetArea,
            apartment.BuildUpArea,
            apartment.SuperBuildArea,
            apartment.Status.ToString(),
            apartment.GetResidentsForRead().Select(r => new ApartmentResidentDto(r.UserId, r.UserName, r.ResidentType.ToString())).ToList(),
            apartment.GetPrimaryResidentName(),
            apartment.OwnershipHistory.Select(h => new ApartmentResidentHistoryDto(h.UserId, h.FullName, h.FromUtc, h.ToUtc)).ToList(),
            apartment.TenantHistory.Select(h => new ApartmentResidentHistoryDto(h.UserId, h.FullName, h.FromUtc, h.ToUtc)).ToList());

    public static ApartmentResidentHistoryResponse ToResidentHistoryResponse(this Apartment apartment) =>
        new(
            apartment.ToDisplayLabel(),
            apartment.GetResidentsForRead().Select(r => new ApartmentResidentDto(r.UserId, r.UserName, r.ResidentType.ToString())).ToList(),
            apartment.OwnershipHistory.Select(h => new ApartmentResidentHistoryDto(h.UserId, h.FullName, h.FromUtc, h.ToUtc)).ToList(),
            apartment.TenantHistory.Select(h => new ApartmentResidentHistoryDto(h.UserId, h.FullName, h.FromUtc, h.ToUtc)).ToList());

    private static string? GetPrimaryResidentName(this Apartment apartment)
    {
        var tenant = apartment.GetResident(Domain.Enums.ResidentType.Tenant);
        if (tenant is not null)
            return tenant.UserName;

        var owner = apartment.GetResident(Domain.Enums.ResidentType.Owner);
        if (owner is not null)
            return owner.UserName;

        return null;
    }

    public static UserResponse ToResponse(this User user, IReadOnlyList<ResidentApartmentDto>? apartments = null) =>
        new(
            user.Id,
            user.SocietyId,
            user.FullName,
            user.Email,
            user.Phone,
            user.Role.ToString(),
            user.ResidentType.ToString(),
            user.ApartmentId,
            user.IsActive,
            user.IsVerified,
            user.GetPermissions(),
            apartments ?? [],
            user.PendingApartmentId,
            user.PendingResidentType,
            user.ProfilePictureUrl);

    /// <summary>
    /// Masks phone/email when a SUUser views another resident's record. The viewer's own record,
    /// and every other role (SUAdmin, SUSecurity, HQAdmin, HQUser), are always returned unmasked.
    /// </summary>
    public static UserResponse ApplyContactMasking(this UserResponse response, string? viewerUserId, string? viewerRole)
    {
        if (!string.Equals(viewerRole, "SUUser", StringComparison.OrdinalIgnoreCase))
            return response;
        if (!string.IsNullOrEmpty(viewerUserId) && string.Equals(response.Id, viewerUserId, StringComparison.Ordinal))
            return response;

        return response with { Phone = MaskPhone(response.Phone), Email = MaskEmail(response.Email) };
    }

    /// <summary>
    /// Masks the middle of the trailing digit run (the subscriber number), keeping any leading
    /// country-code digit group (e.g. the "91" in "+91-...") fully visible along with the first
    /// and last 2 digits of the number itself, e.g. "+91-9876543210" -&gt; "+91-98XXXXXX10".
    /// </summary>
    private static string MaskPhone(string phone)
    {
        if (string.IsNullOrEmpty(phone)) return phone;

        var runStart = -1;
        var runEnd = -1;
        var i = 0;
        while (i < phone.Length)
        {
            if (!char.IsDigit(phone[i])) { i++; continue; }
            var start = i;
            while (i < phone.Length && char.IsDigit(phone[i])) i++;
            runStart = start;
            runEnd = i;
        }
        if (runStart < 0) return phone;

        var runLength = runEnd - runStart;
        var chars = phone.ToCharArray();
        if (runLength <= 4)
        {
            for (var idx = runStart; idx < runEnd; idx++) chars[idx] = 'X';
        }
        else
        {
            for (var idx = runStart + 2; idx < runEnd - 2; idx++) chars[idx] = 'X';
        }
        return new string(chars);
    }

    private static string MaskEmail(string email)
    {
        if (string.IsNullOrEmpty(email)) return email;

        var atIndex = email.IndexOf('@');
        if (atIndex <= 0) return "***";

        var local = email[..atIndex];
        var visibleLocal = local.Length <= 2 ? local : local[..2];
        var domain = email[(atIndex + 1)..];
        var lastDot = domain.LastIndexOf('.');
        var tld = lastDot >= 0 ? domain[lastDot..] : string.Empty;
        return $"{visibleLocal}***@***{tld}";
    }

    public static ResidentApartmentDto ToResidentApartmentResponse(this Apartment apartment, Domain.Enums.ResidentType residentType) =>
        new(
            apartment.Id,
            apartment.ToDisplayLabel(),
            residentType.ToString());

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
            user.ProfilePictureUrl);

    public static AmenityResponse ToResponse(this Amenity amenity) =>
        new(
            amenity.Id,
            amenity.Name,
            amenity.Description,
            amenity.Capacity,
            amenity.IsActive,
            amenity.OperatingStart.ToString("HH:mm"),
            amenity.OperatingEnd.ToString("HH:mm"));

    public static BookingResponse ToResponse(this AmenityBooking booking) =>
        new(
            booking.Id,
            booking.AmenityName,
            booking.BookedByUserId,
            booking.StartTime,
            booking.EndTime,
            booking.Status.ToString(),
            booking.AdminNotes,
            booking.CancellationRemarks,
            booking.CancelledByUserId);

    public static ComplaintResponse ToResponse(this Complaint complaint) =>
        new(
            complaint.Id,
            complaint.Title,
            complaint.Description,
            complaint.Category.ToString(),
            complaint.Status.ToString(),
            complaint.Priority.ToString(),
            complaint.CreatedAt,
            complaint.ResolvedAt);

    public static NoticeResponse ToResponse(this Notice notice, string? currentUserId = null, string? postedByName = null) =>
        new(
            notice.Id,
            notice.Title,
            notice.Content,
            notice.Category.ToString(),
            notice.PostedByUserId,
            notice.PublishAt,
            notice.ExpiresAt,
            currentUserId is not null && notice.IsReadByUser(currentUserId),
            postedByName);

    public static VisitorResponse ToResponse(this VisitorLog log, int? overstayThresholdHours = null) =>
        new(
            log.Id,
            log.VisitorName,
            log.VisitorPhone,
            log.VisitorEmail,
            log.CompanyName,
            log.Purpose,
            log.HostApartmentId,
            log.HostResidentName,
            log.HostBlockName,
            log.HostFloorNumber,
            log.HostFlatNumber,
            log.IsPreApproved,
            log.Status.ToString(),
            log.QrCode,
            log.PassCode,
            log.VehicleNumber,
            log.CheckInTime,
            log.CheckOutTime,
            log.CreatedAt,
            log.ValidUntil,
            log.VisitorImageUrl,
            log.IsPassExpired,
            log.IsOverstaying(overstayThresholdHours ?? Society.DefaultVisitorOverstayThresholdHours));

    public static MaintenanceScheduleDto ToResponse(this MaintenanceSchedule schedule) =>
        new(
            schedule.Id,
            schedule.ApartmentId,
            schedule.Name,
            schedule.Description,
            schedule.Rate,
            schedule.PricingType.ToString(),
            schedule.AreaBasis?.ToString(),
            schedule.Frequency.ToString(),
            schedule.DueDay,
            schedule.StartMonth,
            schedule.StartYear,
            schedule.EndMonth,
            schedule.EndYear,
            schedule.ActiveFromDate,
            schedule.ActiveUntilDate,
            schedule.InactiveFromDate,
            schedule.NextDueDate,
            schedule.IsActive,
            schedule.ChangeHistory
                .Select(change => new MaintenanceScheduleChangeDto(
                    change.PreviousRate,
                    change.NewRate,
                    change.ChangedByUserName,
                    change.Reason,
                    change.ChangedAt))
                .ToList());

    /// <summary>
    /// Whether a charge is overdue right now. "Overdue" is never a persisted <see cref="Domain.Enums.PaymentStatus"/>
    /// value — a charge stays Pending/ProofSubmitted/etc. until paid — so this must be computed from
    /// the due date and the society's grace period rather than compared against the enum.
    /// </summary>
    public static bool IsOverdue(this MaintenanceCharge charge, int overdueThresholdDays) =>
        charge.Status != Domain.Enums.PaymentStatus.Paid && charge.DueDate.Date.AddDays(overdueThresholdDays) < DateTime.UtcNow.Date;

    public static MaintenanceChargeDto ToResponse(this MaintenanceCharge charge, string apartmentNumber, int overdueThresholdDays) =>
        new(
            charge.Id,
            charge.ApartmentId,
            apartmentNumber,
            charge.ScheduleId,
            charge.ScheduleName,
            charge.ChargeYear,
            charge.ChargeMonth,
            charge.Amount,
            charge.Status.ToString(),
            charge.DueDate,
            charge.IsOverdue(overdueThresholdDays),
            charge.PaidAt,
            charge.PaymentMethod,
            charge.TransactionReference,
            charge.ReceiptUrl,
            charge.Notes,
            charge.Proofs
                .Select(proof => new MaintenancePaymentProofDto(
                    proof.ProofUrl,
                    proof.Notes,
                    proof.SubmittedAt))
                .ToList(),
            charge.RejectionReason,
            charge.RejectedAt,
            charge.LatestSubmissionGroupId);

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
            request.ServiceType,
            request.Description,
            request.PreferredDateTime,
            request.Status.ToString());

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

        if (user.Role == Domain.Enums.UserRole.SUSecurity)
        {
            permissions.Add("manage_visitors");
            permissions.Add("view_residents");
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

    public static ShiftResponse ToResponse(this Shift shift) =>
        new(shift.Id, shift.Name);

    public static StaffResponse ToResponse(this Staff staff) =>
        new(
            staff.Id, staff.FullName, staff.Phone,
            staff.Category.ToString(), staff.EmploymentType.ToString(),
            staff.ShiftId, staff.ShiftName, staff.IsActive);

    public static StaffAttendanceResponse ToResponse(this StaffAttendance attendance) =>
        new(attendance.StaffId);

    public static SosAlertResponse ToResponse(this SosAlert alert, string apartmentLabel) =>
        new(
            alert.Id, apartmentLabel,
            alert.TriggeredByUserName, alert.Category.ToString(), alert.Note,
            alert.Status.ToString(), alert.CreatedAt,
            alert.AcknowledgedByUserName, alert.ResolvedByUserName,
            alert.EscalationCount);

    public static PollResponse ToResponse(
        this Poll poll,
        IReadOnlyList<PollOptionTallyResponse>? tally,
        int? eligibleCount,
        int? participantCount,
        bool hasVoted,
        IReadOnlyList<string>? mySelectedOptionIds) =>
        new(
            poll.Id, poll.Title, poll.Description, poll.Type.ToString(),
            poll.Options.Select(o => new PollOptionResponse(o.Id, o.Text)).ToList(),
            poll.OpensAt, poll.ClosesAt,
            poll.IsAgmResolution, poll.AllowVoteChange,
            poll.Status.ToString(), poll.ResultsPublished, poll.Outcome?.ToString(),
            tally, eligibleCount, participantCount, hasVoted, mySelectedOptionIds,
            poll.TargetAudience.ToString(), poll.TargetBlockNames);

    public static PollSummaryResponse ToSummaryResponse(this Poll poll) =>
        new(poll.Id, poll.Title, poll.Type.ToString(), poll.ClosesAt,
            poll.Status.ToString(), poll.IsAgmResolution);

    public static AgmSessionSummaryResponse ToSummaryResponse(this AgmSession session, int resolutionCount) =>
        new(session.Id, session.Title, session.SessionDate, resolutionCount);
}
