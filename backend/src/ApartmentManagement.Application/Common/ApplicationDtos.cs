using ApartmentManagement.Domain.Enums;
using System.Text.Json.Serialization;

namespace ApartmentManagement.Application.DTOs;

// ─── Society ──────────────────────────────────────────────────────────────────

public record AddressDto(string Street, string City, string State, string PostalCode, string Country);

public record CreateSocietyRequest(
    string Name, string Street, string City, string State, string PostalCode, string Country,
    string ContactEmail, string ContactPhone, int TotalBlocks, int TotalApartments,
    // Initial Housing Officer / Society Admin account
    string AdminFullName, string AdminEmail, string AdminPhone);

/// <summary>Returned when a society is registered — includes the society and the first HO admin account.</summary>
public record CreateSocietyResponse(SocietyResponse Society, UserResponse Admin);

public record UpdateSocietyRequest(
    string Name,
    string ContactEmail,
    string ContactPhone,
    int TotalBlocks,
    int TotalApartments,
    int MaintenanceOverdueThresholdDays,
    IReadOnlyList<SocietyUserAssignmentRequest>? SocietyUsers,
    IReadOnlyList<SocietyCommitteeRequest>? Committees,
    // Omitted (all-null) means "leave the address unchanged".
    string? Street = null, string? City = null, string? State = null, string? PostalCode = null, string? Country = null,
    // Omitted (null) means "leave the theme unchanged".
    string? ThemeId = null);

public record SocietyResponse(
    string Id, string Name, AddressDto Address, string ContactEmail, string ContactPhone,
    int TotalBlocks, int TotalApartments, string Status, IReadOnlyList<string> AdminUserIds,
    int MaintenanceOverdueThresholdDays,
    IReadOnlyList<SocietyUserAssignmentDto> SocietyUsers,
    IReadOnlyList<SocietyCommitteeDto> Committees,
    string ThemeId,
    DateTime CreatedAt);

/// <summary>
/// Platform-level occupancy snapshot for HQAdmin/HQUser — deliberately excludes any financial data
/// (per requirements/UserAndAccess.md: HQ roles get a society report with no financial data).
/// </summary>
public record SocietySummaryReportResponse(
    string SocietyId, string SocietyName, string Status,
    int TotalApartments, int OccupiedApartments, int VacantApartments, int UnderMaintenanceApartments,
    int OwnerCount, int TenantCount, int TotalResidents);

public record SocietyUserAssignmentRequest(string Email, string RoleTitle);
public record SocietyCommitteeRequest(string Name, IReadOnlyList<SocietyUserAssignmentRequest> Members);
public record SocietyUserAssignmentDto(string UserId, string FullName, string Email, string RoleTitle);
public record SocietyCommitteeDto(string Name, IReadOnlyList<SocietyUserAssignmentDto> Members);

// ─── Apartment ────────────────────────────────────────────────────────────────

public record CreateApartmentRequest(
    string ApartmentNumber, string BlockName, int FloorNumber, int NumberOfRooms, IReadOnlyList<string> ParkingSlots, string? OwnerId,
    double CarpetArea, double BuildUpArea, double SuperBuildArea, CreateApartmentResidentRequest? InitialResident = null);

public record CreateApartmentResidentRequest(
    string FullName,
    string Email,
    string Phone,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] ResidentType ResidentType);

public record UpdateApartmentRequest(string BlockName, int FloorNumber, int NumberOfRooms, IReadOnlyList<string> ParkingSlots,
    double CarpetArea, double BuildUpArea, double SuperBuildArea);

public record ApartmentResponse(
    string Id, string SocietyId, string ApartmentNumber, string BlockName, int FloorNumber,
    int NumberOfRooms, IReadOnlyList<string> ParkingSlots, double CarpetArea, double BuildUpArea, double SuperBuildArea,
    string Status, IReadOnlyList<ApartmentResidentDto> Residents, string? PrimaryResidentName,
    IReadOnlyList<ApartmentResidentHistoryDto> OwnershipHistory, IReadOnlyList<ApartmentResidentHistoryDto> TenantHistory, DateTime CreatedAt);

public record ApartmentResidentHistoryDto(string UserId, string? FullName, DateTime FromUtc, DateTime? ToUtc);
public record ApartmentResidentDto(string UserId, string UserName, string ResidentType);

public record ChangeApartmentStatusRequest(
    [property: JsonConverter(typeof(JsonStringEnumConverter))] ApartmentStatus Status,
    string Reason);

public record BulkImportResult(int TotalRequested, int Succeeded, int Failed, List<string> Errors);

public record ApartmentResidentHistoryResponse(
    string ApartmentId,
    string ApartmentNumber,
    IReadOnlyList<ApartmentResidentDto> Residents,
    IReadOnlyList<ApartmentResidentHistoryDto> OwnershipHistory,
    IReadOnlyList<ApartmentResidentHistoryDto> TenantHistory);

public record RemoveResidentApartmentResponse(string UserId, string ApartmentId);

// ─── User ─────────────────────────────────────────────────────────────────────

public record CreateUserRequest(
    string FullName,
    string Email,
    string Phone,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] UserRole Role,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] ResidentType ResidentType,
    string? ApartmentId,
    string? InvitedByUserId = null);

public record AttachResidentApartmentRequest(
    string ApartmentId,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] ResidentType ResidentType);

/// <summary>Request body for creating a platform-level HQ user (HQAdmin or HQUser only).</summary>
public record CreateHQUserRequest(string FullName, string Email, string Phone, UserRole Role);

public record UpdateUserRequest(string FullName, string Phone);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record UserResponse(
    string Id, string SocietyId, string FullName, string Email, string Phone,
    string Role, string ResidentType, string? ApartmentId, string? InvitedByUserId, bool IsActive, bool IsVerified, bool HasPassword,
    IReadOnlyList<string> Permissions, IReadOnlyList<ResidentApartmentDto> Apartments, DateTime CreatedAt,
    string? PendingApartmentId = null, string? PendingResidentType = null);

public record ResidentApartmentDto(
    string ApartmentId,
    string Name,
    string ResidentType);

// Auth response user — field names intentionally match the Angular User model
public record AuthUserDto(
    string Id, string SocietyId, string Name, string Email, string? Phone,
    string Role, string ResidentType, string? ApartmentId, bool IsVerified, IReadOnlyList<string> Permissions);

public record VerifyOtpResponse(string AccessToken, AuthUserDto User);

public record VerifyOtpRequest(string UserId, string OtpCode);
public record OtpCodeBody
{
    public string OtpCode { get; init; } = string.Empty;
}
public record LoginRequest(string Email, string Password, string? SelectedUserId = null);
public record LoginOptionDto(string UserId, string SocietyId, string SocietyName, string? ApartmentId, string? ApartmentLabel, string Role, string ResidentType);
public record LoginResponse(bool RequiresSelection, string? Token, AuthUserDto? User, IReadOnlyList<LoginOptionDto> Options);
public record SendOtpRequest(string UserId);
public record RequestOtpByEmailRequest(string Email);
public record RequestOtpByEmailResponse(string UserId);
public record PasswordResetRequest(string Email, string? SelectedUserId = null);
public record PasswordResetRequestResponse(bool RequiresSelection, string? UserId, IReadOnlyList<LoginOptionDto> Options);
public record PhoneLoginOtpRequest(string Phone, string? SelectedUserId = null);
public record PhoneLoginOtpResponse(bool RequiresSelection, string? UserId, IReadOnlyList<LoginOptionDto> Options);
public record ConfirmPasswordResetRequest(string SocietyId, string UserId, string OtpCode, string NewPassword);
public record TransferApartmentOwnershipRequest(string ApartmentId, string FullName, string Email, string Phone);
public record TransferApartmentTenancyRequest(string ApartmentId, string FullName, string Email, string Phone);
public record AddHouseholdMemberRequest(
    string ApartmentId,
    string FullName,
    string Email,
    string Phone,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] ResidentType ResidentType);

public record GenerateInviteLinkRequest(string? ApartmentId = null);
public record InviteLinkResponse(string Token, string InviteUrl);
public record ValidateInviteTokenResponse(bool Valid, string? SocietyId, string? ApartmentId);
public record SelfRegisterRequest(string FullName, string Email, string Phone, string Password, string InviteToken);
public record RequestApartmentJoinRequest(string ApartmentId, [property: JsonConverter(typeof(JsonStringEnumConverter))] ResidentType ResidentType);

// ─── Amenity ─────────────────────────────────────────────────────────────────

public sealed record AmenityDto(
    string Id, string SocietyId, string Name, string Description,
    int Capacity, string Rules, bool IsActive, int BookingSlotMinutes,
    TimeOnly OperatingStart, TimeOnly OperatingEnd, int AdvanceBookingDays,
    DateTime CreatedAt, DateTime UpdatedAt);

public sealed record AmenityBookingDto(
    string Id, string SocietyId, string AmenityId, string AmenityName,
    string BookedByUserId, string BookedByApartmentId,
    DateTime StartTime, DateTime EndTime,
    BookingStatus Status, string? AdminNotes, TimeSpan Duration,
    DateTime CreatedAt, DateTime UpdatedAt);

public sealed record CreateAmenityRequest(
    string Name, string Description, int Capacity, string Rules,
    int BookingSlotMinutes, TimeOnly OperatingStart, TimeOnly OperatingEnd, int AdvanceBookingDays);

public sealed record BookAmenityRequest(
    string AmenityId, string ApartmentId, DateTime StartTime, DateTime EndTime);

// ─── Complaint ────────────────────────────────────────────────────────────────

public sealed record ComplaintDto(
    string Id, string SocietyId, string ApartmentId, string RaisedByUserId,
    string Title, string Description, ComplaintCategory Category,
    ComplaintStatus Status, ComplaintPriority Priority,
    string? AssignedToUserId, IReadOnlyList<string> AttachmentUrls,
    DateTime? ResolvedAt, int? FeedbackRating, string? FeedbackComment,
    DateTime CreatedAt, DateTime UpdatedAt);

public sealed record RaiseComplaintRequest(
    string ApartmentId, ComplaintCategory Category, string Title,
    string Description, ComplaintPriority Priority,
    IEnumerable<string>? Attachments = null);

public sealed record AssignComplaintRequest(string AssignedToUserId);
public sealed record ResolveComplaintRequest(string ResolutionNotes);
public sealed record ComplaintFeedbackRequest(int Rating, string? Comment);

// ─── Notice ───────────────────────────────────────────────────────────────────

public sealed record NoticeDto(
    string Id, string SocietyId, string Title, string Content,
    NoticeCategory Category, string PostedByUserId,
    bool IsArchived, bool IsActive, DateTime PublishAt, DateTime? ExpiresAt,
    IReadOnlyList<string> TargetApartmentIds, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record CreateNoticeRequest(
    string Title, string Content, NoticeCategory Category,
    DateTime PublishAt, DateTime? ExpiresAt = null,
    IEnumerable<string>? TargetApartmentIds = null);

public sealed record UpdateNoticeRequest(string? Title, string? Content, DateTime? ExpiresAt);

public sealed record MarkNoticeReadRequest(bool IsRead);

// ─── Visitor ─────────────────────────────────────────────────────────────────

public sealed record RegisterVisitorRequest(
    string VisitorName,
    string VisitorPhone,
    string? VisitorEmail,
    string Purpose,
    string ApartmentId,
    string? CompanyName = null,
    string? VehicleNumber = null,
    bool IsPreApproved = false,
    int? ValidityHours = null,
    string? VisitorImageUrl = null);

// ─── Maintenance ─────────────────────────────────────────────────────────────

public sealed record MaintenanceScheduleChangeDto(
    decimal PreviousRate,
    decimal NewRate,
    string? AreaBasis,
    string ChangedByUserId,
    string ChangedByUserName,
    string Reason,
    DateTime ChangedAt);

public sealed record MaintenanceScheduleDto(
    string Id,
    string SocietyId,
    string? ApartmentId,
    string Name,
    string? Description,
    decimal Rate,
    string PricingType,
    string? AreaBasis,
    string Frequency,
    int DueDay,
    int StartMonth,
    int StartYear,
    int EndMonth,
    int EndYear,
    DateTime ActiveFromDate,
    DateTime ActiveUntilDate,
    DateTime? InactiveFromDate,
    DateTime NextDueDate,
    bool IsActive,
    IReadOnlyList<MaintenanceScheduleChangeDto> ChangeHistory,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record MaintenancePaymentProofDto(
    string ProofUrl,
    string? Notes,
    string SubmittedByUserId,
    DateTime SubmittedAt);

public sealed record MaintenanceChargeDto(
    string Id,
    string SocietyId,
    string ApartmentId,
    string ApartmentNumber,
    string ScheduleId,
    string ScheduleName,
    int ChargeYear,
    int ChargeMonth,
    decimal Amount,
    string Status,
    DateTime DueDate,
    bool IsOverdue,
    DateTime? PaidAt,
    string? PaymentMethod,
    string? TransactionReference,
    string? ReceiptUrl,
    string? Notes,
    IReadOnlyList<MaintenancePaymentProofDto> Proofs,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record MaintenanceChargeGridChargeDto(
    string Id,
    string ScheduleId,
    string ScheduleName,
    decimal Amount,
    string Status,
    DateTime DueDate,
    bool IsOverdue,
    DateTime? PaidAt,
    string? PaymentMethod,
    string? TransactionReference,
    string? ReceiptUrl,
    string? Notes,
    IReadOnlyList<MaintenancePaymentProofDto> Proofs);

public sealed record MaintenanceChargeGridCellDto(
    int Month,
    decimal TotalAmount,
    bool HasOverdue,
    IReadOnlyList<MaintenanceChargeGridChargeDto> Charges);

public sealed record MaintenanceChargeGridRowDto(
    string ApartmentId,
    string ApartmentNumber,
    string? ResidentName,
    IReadOnlyList<MaintenanceChargeGridCellDto> Months);

public sealed record MaintenanceChargeGridDto(
    string SocietyId,
    int Year,
    IReadOnlyList<int> Months,
    MaintenanceChargeGridSummaryDto Summary,
    IReadOnlyList<MaintenanceChargeGridRowDto> Rows);

public sealed record MaintenanceChargeGridSummaryDto(
    decimal PendingAmount,
    decimal SubmittedAmount,
    decimal PaidAmount,
    int PendingCount,
    int SubmittedCount,
    int PaidCount);

public sealed record CreateMaintenanceScheduleRequest(
    string Name,
    string? Description,
    string? ApartmentId,
    decimal Rate,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] MaintenancePricingType PricingType,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] MaintenanceAreaBasis? AreaBasis,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] FeeFrequency Frequency,
    int DueDay,
    int StartMonth,
    int StartYear,
    int EndMonth,
    int EndYear);

public sealed record UpdateMaintenanceScheduleRequest(
    bool IsActive,
    int EffectiveMonth,
    int EffectiveYear,
    string ChangeReason);

public sealed record DeleteMaintenanceScheduleRequest(
    string ChangeReason);

public sealed record SubmitMaintenancePaymentProofRequest(
    IReadOnlyList<string> ChargeIds,
    string ProofUrl,
    string? Notes = null);

public sealed record MarkMaintenanceChargePaidRequest(
    string PaymentMethod,
    string? TransactionReference,
    string? ReceiptUrl = null,
    string? Notes = null);

public sealed record CreateMaintenancePenaltyChargeRequest(
    string ApartmentId,
    decimal Amount,
    DateTime DueDate,
    string Reason);

public sealed record MaintenanceProofUploadResponse(
    string FileName,
    string FileUrl);

// ─── Gamification ─────────────────────────────────────────────────────────────

public sealed record CompetitionDto(
    string Id, string SocietyId, string Title, string Description,
    DateTime StartDate, DateTime EndDate, CompetitionStatus Status,
    string CreatedByUserId, string Prize, int? MaxParticipants,
    DateTime CreatedAt, DateTime UpdatedAt);

public sealed record CompetitionEntryDto(
    string Id, string SocietyId, string CompetitionId, string ApartmentId,
    string UserId, decimal Score, int? Rank, DateTime RegisteredAt,
    DateTime CreatedAt, DateTime UpdatedAt);

public sealed record RewardPointsDto(
    string Id, string SocietyId, string UserId, string ApartmentId,
    int Points, string Reason, DateTime CreatedAt);

public sealed record CreateCompetitionRequest(
    string CreatedByUserId, string Title, string Description,
    DateTime StartDate, DateTime EndDate, string Prize, int? MaxParticipants = null);

// ─── ServiceProvider ─────────────────────────────────────────────────────────

public sealed record ServiceProviderDto(
    string Id, string SocietyId, string ProviderName, string ContactName,
    string ContactPhone, string ContactEmail, IReadOnlyList<string> ServiceTypes,
    string Description, ServiceProviderStatus Status, decimal Rating, int ReviewCount,
    DateTime CreatedAt, DateTime UpdatedAt);

public sealed record ServiceProviderRequestDto(
    string Id, string SocietyId, string ApartmentId, string RequestedByUserId,
    string ServiceType, string Description, DateTime PreferredDateTime,
    ServiceRequestStatus Status, string? AcceptedByProviderId,
    int? Rating, string? ReviewComment, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record RegisterServiceProviderRequest(
    string ProviderName, string ContactName, string ContactPhone,
    string ContactEmail, IEnumerable<string> ServiceTypes, string Description);

public sealed record RaiseServiceRequestRequest(
    string ApartmentId, string ServiceType, string Description, DateTime PreferredDateTime);

// ─── Response types (used by handlers and mappings) ────────────────────────────

public record AmenityResponse(
    string Id, string SocietyId, string Name, string Description, int Capacity, string Rules,
    bool IsActive, int BookingSlotMinutes, string OperatingStart, string OperatingEnd, int AdvanceBookingDays);

public record BookingResponse(
    string Id, string SocietyId, string AmenityId, string AmenityName,
    string BookedByUserId, string BookedByApartmentId, DateTime StartTime, DateTime EndTime,
    string Status, string? AdminNotes, double Duration, DateTime CreatedAt);

public record AvailabilitySlot(DateTime Start, DateTime End, bool IsAvailable);

public record ApproveRejectBookingRequest(string? AdminNotes);

public record ComplaintResponse(
    string Id, string SocietyId, string ApartmentId, string RaisedByUserId,
    string Title, string Description, string Category, string Status, string Priority,
    string? AssignedToUserId, IReadOnlyList<string> AttachmentUrls,
    DateTime CreatedAt, DateTime UpdatedAt, DateTime? ResolvedAt, int? FeedbackRating, string? FeedbackComment);

public record AddFeedbackRequest(int Rating, string? Comment);

public record NoticeResponse(
    string Id, string SocietyId, string Title, string Content, string Category,
    string PostedByUserId, bool IsArchived, DateTime PublishAt, DateTime? ExpiresAt,
    bool IsActive, DateTime CreatedAt, IReadOnlyList<string> TargetApartmentIds,
    bool IsReadByCurrentUser = false);

public record VisitorResponse(
    string Id,
    string SocietyId,
    string VisitorName,
    string VisitorPhone,
    string? VisitorEmail,
    string? CompanyName,
    string Purpose,
    string HostApartmentId,
    string HostResidentName,
    string HostBlockName,
    int HostFloorNumber,
    string HostFlatNumber,
    bool IsPreApproved,
    string Status,
    string? QrCode,
    string PassCode,
    string? VehicleNumber,
    DateTime? ApprovedAt,
    DateTime? CheckInTime,
    DateTime? CheckOutTime,
    double? Duration,
    DateTime CreatedAt,
    DateTime? ValidUntil = null,
    string? VisitorImageUrl = null,
    bool IsPassExpired = false);

public sealed record CheckInVisitorRequest(string PassCode);

public sealed record VisitorImageUploadResponse(string FileName, string ImageUrl);

public sealed record VisitorExportResponse(string FileName, string ContentType, byte[] Content);

/// <summary>Sanitized pass info returned on the public (unauthenticated) shareable pass page.</summary>
public sealed record PublicVisitorPassResponse(
    string VisitorName,
    string Purpose,
    string HostBlockName,
    string HostFlatNumber,
    string Status,
    string? QrCode,
    DateTime? ValidUntil,
    bool IsPassExpired,
    string? VisitorImageUrl);

public sealed record ShareVisitorPassRequest(string? Email, string? Phone);

public record FeeScheduleResponse(
    string Id, string SocietyId, string ApartmentId, string Description,
    decimal Amount, string Frequency, int DueDay, DateTime NextDueDate, bool IsActive);

public record FeePaymentResponse(
    string Id, string SocietyId, string ApartmentId, string FeeScheduleId,
    string Description, decimal Amount, string Status, DateTime DueDate,
    DateTime? PaidAt, string? PaymentMethod, string? TransactionId, string? ReceiptUrl);

public record CompetitionResponse(
    string Id, string SocietyId, string Title, string Description,
    DateTime StartDate, DateTime EndDate, string Status, string Prize, int? MaxParticipants, DateTime CreatedAt);

public record CompetitionEntryResponse(
    string Id, string CompetitionId, string ApartmentId, string UserId, decimal Score, int? Rank, DateTime RegisteredAt);

public record UpdateScoreRequest(decimal Score);

public record LeaderboardEntryDto(int Rank, string UserId, string ApartmentId, decimal Score);

public record UserPointsResponse(string UserId, string SocietyId, int TotalPoints, IReadOnlyList<PointHistoryDto> History);

public record PointHistoryDto(int Points, string Reason, DateTime CreatedAt);

public record ServiceProviderResponse(
    string Id, string ProviderName, string ContactName, string ContactPhone,
    IReadOnlyList<string> ServiceTypes, string Description, string Status, decimal Rating, int ReviewCount);

public record CreateServiceRequestRequest(string ServiceType, string Description, DateTime PreferredDateTime);

public record ServiceRequestResponse(
    string Id, string SocietyId, string ApartmentId, string ServiceType, string Description,
    DateTime PreferredDateTime, string Status, string? AcceptedByProviderId,
    int? Rating, string? ReviewComment, DateTime CreatedAt);

public record AddReviewRequest(int Rating, string Comment);

// ─── Staff Attendance ─────────────────────────────────────────────────────────

public sealed record CreateShiftRequest(string Name, TimeSpan StartTime, TimeSpan EndTime, int GraceMinutes = 30);

public record ShiftResponse(string Id, string SocietyId, string Name, TimeSpan StartTime, TimeSpan EndTime, int GraceMinutes);

public sealed record CreateStaffRequest(
    string FullName, string Phone, StaffCategory Category, StaffEmploymentType EmploymentType,
    string? PhotoUrl = null, string? VendorId = null, string? ShiftId = null);

public sealed record UpdateStaffRequest(string FullName, string Phone, string? PhotoUrl, string? ShiftId);

public record StaffResponse(
    string Id, string SocietyId, string FullName, string Phone, string? PhotoUrl,
    string Category, string EmploymentType, string? VendorId, string? ShiftId, string? ShiftName,
    bool IsActive, DateTime CreatedAt);

public record StaffAttendanceResponse(
    string Id, string SocietyId, string StaffId, string StaffName, string? ShiftId,
    DateTime AttendanceDate, DateTime? CheckInTime, DateTime? CheckOutTime, bool IsLate, string Status);

public record StaffAttendanceReportEntry(
    string StaffId, string StaffName, string Category,
    int PresentDays, int AbsentDays, int LateDays, int OnLeaveDays);

public record StaffAttendanceReportResponse(
    DateTime FromDate, DateTime ToDate, IReadOnlyList<StaffAttendanceReportEntry> Entries);

// ─── SOS Emergency Alerts ─────────────────────────────────────────────────────

public sealed record TriggerSosAlertRequest(SosCategory Category, string? Note = null);

public record SosAlertResponse(
    string Id, string SocietyId, string ApartmentId, string ApartmentLabel,
    string TriggeredByUserId, string TriggeredByUserName, string Category, string? Note,
    string Status, DateTime TriggeredAt,
    DateTime? AcknowledgedAt, string? AcknowledgedByUserId, string? AcknowledgedByUserName,
    DateTime? ResolvedAt, string? ResolvedByUserId, string? ResolvedByUserName,
    int EscalationCount);

public record SosCategoryBreakdown(string Category, int Count);

public record SosAlertReportResponse(
    DateTime FromDate, DateTime ToDate, int TotalAlerts, int FalseAlarmCount, double FalseAlarmRatePercent,
    double? AverageAcknowledgeSeconds, double? AverageResolveSeconds, IReadOnlyList<SosCategoryBreakdown> ByCategory);

// ─── Polls & AGM E-Voting ─────────────────────────────────────────────────────

public sealed record CreatePollRequest(
    string Title, string Description, PollType Type, IReadOnlyList<string> Options,
    DateTime OpensAt, DateTime ClosesAt, PollEligibilityUnit EligibilityUnit, PollAnonymity Anonymity,
    PollVisibility Visibility, string? LinkedNoticeId, double? QuorumThresholdPercent,
    bool IsAgmResolution, bool AllowVoteChange, string? AgmSessionId = null,
    PollTargetAudience TargetAudience = PollTargetAudience.FullSociety, IReadOnlyList<string>? TargetBlockNames = null);

public sealed record CastVoteRequest(IReadOnlyList<string> SelectedOptionIds);

public record PollOptionResponse(string Id, string Text);
public record PollOptionTallyResponse(string Id, string Text, int VoteCount);

public record PollResponse(
    string Id, string SocietyId, string Title, string Description, string Type,
    IReadOnlyList<PollOptionResponse> Options, DateTime OpensAt, DateTime ClosesAt,
    string EligibilityUnit, string Anonymity, string Visibility, string? LinkedNoticeId,
    double? QuorumThresholdPercent, bool IsAgmResolution, bool AllowVoteChange,
    string Status, DateTime? ClosedAt, bool ResultsPublished, string? Outcome,
    string CreatedByUserId, DateTime CreatedAt,
    IReadOnlyList<PollOptionTallyResponse>? Tally, int? EligibleCount, int? ParticipantCount,
    bool HasVoted, IReadOnlyList<string>? MySelectedOptionIds, string? AgmSessionId,
    string TargetAudience, IReadOnlyList<string> TargetBlockNames);

public record PollSummaryResponse(
    string Id, string Title, string Type, DateTime OpensAt, DateTime ClosesAt,
    string Status, bool IsAgmResolution, bool ResultsPublished);

public record PollVoteResponse(string PollId, IReadOnlyList<string> SelectedOptionIds, DateTime VotedAt);

// ─── AGM Sessions ─────────────────────────────────────────────────────────────

public sealed record CreateAgmSessionRequest(string Title, string Description, DateTime SessionDate);

public record AgmSessionSummaryResponse(string Id, string Title, DateTime SessionDate, int ResolutionCount);

public record AgmSessionDetailResponse(
    string Id, string SocietyId, string Title, string Description, DateTime SessionDate,
    string CreatedByUserId, DateTime CreatedAt, IReadOnlyList<PollResponse> Resolutions);

// ─── Dev / Test Data Seeding ──────────────────────────────────────────────────

public sealed record SeedTestDataRequest(int? ApartmentCount = null);

public record SeededApartmentInfo(
    string ApartmentId, string ApartmentLabel,
    string OwnerId, string OwnerEmail,
    string TenantId, string TenantEmail,
    IReadOnlyList<string> ChargeIds);

public record SeedTestDataResponse(
    int ApartmentsCreated,
    int Failed,
    IReadOnlyList<SeededApartmentInfo> Apartments,
    IReadOnlyList<string> Errors);

// ─── Common ───────────────────────────────────────────────────────────────────

public record IdResponse(string Id);
public record MessageResponse(string Message);


