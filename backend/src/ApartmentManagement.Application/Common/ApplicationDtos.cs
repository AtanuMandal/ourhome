using ApartmentManagement.Domain.Enums;
using System.Text.Json.Serialization;

namespace ApartmentManagement.Application.DTOs;

// ─── Society ──────────────────────────────────────────────────────────────────

public record AddressDto(
    [property: JsonPropertyName("str")] string Street,
    [property: JsonPropertyName("cty")] string City,
    [property: JsonPropertyName("ste")] string State,
    [property: JsonPropertyName("pc")] string PostalCode,
    [property: JsonPropertyName("co")] string Country);

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
    string? ThemeId = null,
    // Omitted (null) means "leave unchanged". MaxUsersPerApartment is HQAdmin-only.
    int? MaxUsersPerApartment = null,
    int? VisitorOverstayThresholdHours = null);

public record SocietyResponse(
    string Id,
    [property: JsonPropertyName("nm")] string Name,
    [property: JsonPropertyName("addr")] AddressDto Address,
    [property: JsonPropertyName("ce")] string ContactEmail,
    [property: JsonPropertyName("cp")] string ContactPhone,
    [property: JsonPropertyName("tb")] int TotalBlocks,
    [property: JsonPropertyName("ta")] int TotalApartments,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("mot")] int MaintenanceOverdueThresholdDays,
    [property: JsonPropertyName("su")] IReadOnlyList<SocietyUserAssignmentDto> SocietyUsers,
    [property: JsonPropertyName("cm")] IReadOnlyList<SocietyCommitteeDto> Committees,
    [property: JsonPropertyName("th")] string ThemeId,
    [property: JsonPropertyName("mua")] int MaxUsersPerApartment = Domain.Entities.Society.DefaultMaxUsersPerApartment,
    [property: JsonPropertyName("voh")] int VisitorOverstayThresholdHours = Domain.Entities.Society.DefaultVisitorOverstayThresholdHours);

/// <summary>
/// Platform-level occupancy snapshot for HQAdmin/HQUser — deliberately excludes any financial data
/// (per requirements/UserAndAccess.md: HQ roles get a society report with no financial data).
/// </summary>
public record SocietySummaryReportResponse(
    [property: JsonPropertyName("sn")] string SocietyName,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("ta")] int TotalApartments,
    [property: JsonPropertyName("oa")] int OccupiedApartments,
    [property: JsonPropertyName("va")] int VacantApartments,
    [property: JsonPropertyName("uma")] int UnderMaintenanceApartments,
    [property: JsonPropertyName("oc")] int OwnerCount,
    [property: JsonPropertyName("tc")] int TenantCount,
    [property: JsonPropertyName("tr")] int TotalResidents);

public record SocietyUserAssignmentRequest(string Email, string RoleTitle);
public record SocietyCommitteeRequest(string Name, IReadOnlyList<SocietyUserAssignmentRequest> Members);
public record SocietyUserAssignmentDto(
    [property: JsonPropertyName("uid")] string UserId,
    [property: JsonPropertyName("fn")] string FullName,
    [property: JsonPropertyName("em")] string Email,
    [property: JsonPropertyName("rt")] string RoleTitle);
public record SocietyCommitteeDto(
    [property: JsonPropertyName("nm")] string Name,
    [property: JsonPropertyName("mem")] IReadOnlyList<SocietyUserAssignmentDto> Members);

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
    string Id,
    [property: JsonPropertyName("num")] string ApartmentNumber,
    [property: JsonPropertyName("blk")] string BlockName,
    [property: JsonPropertyName("flr")] int FloorNumber,
    [property: JsonPropertyName("rms")] int NumberOfRooms,
    [property: JsonPropertyName("pks")] IReadOnlyList<string> ParkingSlots,
    [property: JsonPropertyName("ca")] double CarpetArea,
    [property: JsonPropertyName("ba")] double BuildUpArea,
    [property: JsonPropertyName("sba")] double SuperBuildArea,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("res")] IReadOnlyList<ApartmentResidentDto> Residents,
    [property: JsonPropertyName("prn")] string? PrimaryResidentName,
    [property: JsonPropertyName("oh")] IReadOnlyList<ApartmentResidentHistoryDto> OwnershipHistory,
    [property: JsonPropertyName("th")] IReadOnlyList<ApartmentResidentHistoryDto> TenantHistory);

public record ApartmentResidentHistoryDto(
    [property: JsonPropertyName("uid")] string UserId,
    [property: JsonPropertyName("fn")] string? FullName,
    [property: JsonPropertyName("fu")] DateTime FromUtc,
    [property: JsonPropertyName("tu")] DateTime? ToUtc);
public record ApartmentResidentDto(
    [property: JsonPropertyName("uid")] string UserId,
    [property: JsonPropertyName("unm")] string UserName,
    [property: JsonPropertyName("rt")] string ResidentType);

public record ChangeApartmentStatusRequest(
    [property: JsonConverter(typeof(JsonStringEnumConverter))] ApartmentStatus Status,
    string Reason);

public record BulkImportResult(int TotalRequested, int Succeeded, int Failed, List<string> Errors);

public record ApartmentResidentHistoryResponse(
    [property: JsonPropertyName("num")] string ApartmentNumber,
    [property: JsonPropertyName("res")] IReadOnlyList<ApartmentResidentDto> Residents,
    [property: JsonPropertyName("oh")] IReadOnlyList<ApartmentResidentHistoryDto> OwnershipHistory,
    [property: JsonPropertyName("th")] IReadOnlyList<ApartmentResidentHistoryDto> TenantHistory);

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
    string Id,
    [property: JsonPropertyName("sid")] string SocietyId,
    [property: JsonPropertyName("fn")] string FullName,
    [property: JsonPropertyName("em")] string Email,
    [property: JsonPropertyName("ph")] string Phone,
    [property: JsonPropertyName("rl")] string Role,
    [property: JsonPropertyName("rt")] string ResidentType,
    [property: JsonPropertyName("aid")] string? ApartmentId,
    [property: JsonPropertyName("ac")] bool IsActive,
    [property: JsonPropertyName("vf")] bool IsVerified,
    [property: JsonPropertyName("perm")] IReadOnlyList<string> Permissions,
    [property: JsonPropertyName("apts")] IReadOnlyList<ResidentApartmentDto> Apartments,
    [property: JsonPropertyName("paid")] string? PendingApartmentId = null,
    [property: JsonPropertyName("prt")] string? PendingResidentType = null,
    [property: JsonPropertyName("pic")] string? ProfilePictureUrl = null);

public record UserProfilePictureResponse([property: JsonPropertyName("pic")] string ProfilePictureUrl);

public record ResidentApartmentDto(
    [property: JsonPropertyName("aid")] string ApartmentId,
    [property: JsonPropertyName("nm")] string Name,
    [property: JsonPropertyName("rt")] string ResidentType);

// Auth response user — field names intentionally match the Angular User model
public record AuthUserDto(
    string Id,
    [property: JsonPropertyName("sid")] string SocietyId,
    [property: JsonPropertyName("nm")] string Name,
    [property: JsonPropertyName("em")] string Email,
    [property: JsonPropertyName("ph")] string? Phone,
    [property: JsonPropertyName("rl")] string Role,
    [property: JsonPropertyName("rt")] string ResidentType,
    [property: JsonPropertyName("aid")] string? ApartmentId,
    [property: JsonPropertyName("vf")] bool IsVerified,
    [property: JsonPropertyName("pic")] string? ProfilePictureUrl = null);

public record VerifyOtpResponse(
    [property: JsonPropertyName("tok")] string AccessToken,
    [property: JsonPropertyName("usr")] AuthUserDto User);

public record VerifyOtpRequest(string UserId, string OtpCode);
public record OtpCodeBody
{
    public string OtpCode { get; init; } = string.Empty;
}
public record LoginRequest(string Email, string Password, string? SelectedUserId = null);
public record LoginOptionDto(
    [property: JsonPropertyName("uid")] string UserId,
    [property: JsonPropertyName("sid")] string SocietyId,
    [property: JsonPropertyName("snm")] string SocietyName,
    [property: JsonPropertyName("aid")] string? ApartmentId,
    [property: JsonPropertyName("alb")] string? ApartmentLabel,
    [property: JsonPropertyName("rl")] string Role,
    [property: JsonPropertyName("rt")] string ResidentType);
public record LoginResponse(
    [property: JsonPropertyName("rs")] bool RequiresSelection,
    [property: JsonPropertyName("tok")] string? Token,
    [property: JsonPropertyName("usr")] AuthUserDto? User,
    [property: JsonPropertyName("opts")] IReadOnlyList<LoginOptionDto> Options);
public record SendOtpRequest(string UserId);
public record RequestOtpByEmailRequest(string Email);
public record RequestOtpByEmailResponse([property: JsonPropertyName("uid")] string UserId);
public record PasswordResetRequest(string Email, string? SelectedUserId = null);
public record PasswordResetRequestResponse(
    [property: JsonPropertyName("rs")] bool RequiresSelection,
    [property: JsonPropertyName("uid")] string? UserId,
    [property: JsonPropertyName("opts")] IReadOnlyList<LoginOptionDto> Options);
public record PhoneLoginOtpRequest(string Phone, string? SelectedUserId = null);
public record PhoneLoginOtpResponse(
    [property: JsonPropertyName("rs")] bool RequiresSelection,
    [property: JsonPropertyName("uid")] string? UserId,
    [property: JsonPropertyName("opts")] IReadOnlyList<LoginOptionDto> Options);
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
public record InviteLinkResponse(
    [property: JsonPropertyName("tok")] string Token,
    [property: JsonPropertyName("url")] string InviteUrl);
public record ShareInviteLinkRequest(string? ApartmentId, string Email);
public record ValidateInviteTokenResponse(
    [property: JsonPropertyName("vl")] bool Valid,
    [property: JsonPropertyName("sid")] string? SocietyId,
    [property: JsonPropertyName("aid")] string? ApartmentId);
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
    [property: JsonPropertyName("pr")] decimal PreviousRate,
    [property: JsonPropertyName("nr")] decimal NewRate,
    [property: JsonPropertyName("cbn")] string ChangedByUserName,
    [property: JsonPropertyName("rsn")] string Reason,
    [property: JsonPropertyName("ca")] DateTime ChangedAt);

public sealed record MaintenanceScheduleDto(
    string Id,
    [property: JsonPropertyName("aid")] string? ApartmentId,
    [property: JsonPropertyName("nm")] string Name,
    [property: JsonPropertyName("ds")] string? Description,
    [property: JsonPropertyName("rt")] decimal Rate,
    [property: JsonPropertyName("pt")] string PricingType,
    [property: JsonPropertyName("ab")] string? AreaBasis,
    [property: JsonPropertyName("fq")] string Frequency,
    [property: JsonPropertyName("dd")] int DueDay,
    [property: JsonPropertyName("sm")] int StartMonth,
    [property: JsonPropertyName("sy")] int StartYear,
    [property: JsonPropertyName("em")] int EndMonth,
    [property: JsonPropertyName("ey")] int EndYear,
    [property: JsonPropertyName("afd")] DateTime ActiveFromDate,
    [property: JsonPropertyName("aud")] DateTime ActiveUntilDate,
    [property: JsonPropertyName("ifd")] DateTime? InactiveFromDate,
    [property: JsonPropertyName("ndd")] DateTime NextDueDate,
    [property: JsonPropertyName("ac")] bool IsActive,
    [property: JsonPropertyName("ch")] IReadOnlyList<MaintenanceScheduleChangeDto> ChangeHistory);

public sealed record MaintenancePaymentProofDto(
    [property: JsonPropertyName("pu")] string ProofUrl,
    [property: JsonPropertyName("nt")] string? Notes,
    [property: JsonPropertyName("sa")] DateTime SubmittedAt);

public sealed record MaintenanceChargeDto(
    string Id,
    [property: JsonPropertyName("aid")] string ApartmentId,
    [property: JsonPropertyName("anm")] string ApartmentNumber,
    [property: JsonPropertyName("sid")] string ScheduleId,
    [property: JsonPropertyName("snm")] string ScheduleName,
    [property: JsonPropertyName("cy")] int ChargeYear,
    [property: JsonPropertyName("cm")] int ChargeMonth,
    [property: JsonPropertyName("amt")] decimal Amount,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("dd")] DateTime DueDate,
    [property: JsonPropertyName("ov")] bool IsOverdue,
    [property: JsonPropertyName("pa")] DateTime? PaidAt,
    [property: JsonPropertyName("pm")] string? PaymentMethod,
    [property: JsonPropertyName("tr")] string? TransactionReference,
    [property: JsonPropertyName("ru")] string? ReceiptUrl,
    [property: JsonPropertyName("nt")] string? Notes,
    [property: JsonPropertyName("pf")] IReadOnlyList<MaintenancePaymentProofDto> Proofs,
    [property: JsonPropertyName("rr")] string? RejectionReason = null,
    [property: JsonPropertyName("ra")] DateTime? RejectedAt = null,
    // The most recently submitted proof's group id — clients use this (together with ApartmentId)
    // to cluster charges that a resident submitted together into one "clubbed submission" card.
    // Only meaningful while Status is ProofSubmitted or Paid.
    [property: JsonPropertyName("sgi")] string? SubmissionGroupId = null);

public sealed record MaintenanceChargeGridChargeDto(
    string Id,
    [property: JsonPropertyName("sid")] string ScheduleId,
    [property: JsonPropertyName("snm")] string ScheduleName,
    [property: JsonPropertyName("amt")] decimal Amount,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("dd")] DateTime DueDate,
    [property: JsonPropertyName("ov")] bool IsOverdue,
    [property: JsonPropertyName("pa")] DateTime? PaidAt,
    [property: JsonPropertyName("pm")] string? PaymentMethod,
    [property: JsonPropertyName("tr")] string? TransactionReference,
    [property: JsonPropertyName("ru")] string? ReceiptUrl,
    [property: JsonPropertyName("nt")] string? Notes,
    [property: JsonPropertyName("pf")] IReadOnlyList<MaintenancePaymentProofDto> Proofs,
    [property: JsonPropertyName("rr")] string? RejectionReason = null,
    [property: JsonPropertyName("ra")] DateTime? RejectedAt = null,
    [property: JsonPropertyName("sgi")] string? SubmissionGroupId = null);

public sealed record MaintenanceChargeGridCellDto(
    [property: JsonPropertyName("mo")] int Month,
    [property: JsonPropertyName("ta")] decimal TotalAmount,
    [property: JsonPropertyName("ho")] bool HasOverdue,
    [property: JsonPropertyName("chg")] IReadOnlyList<MaintenanceChargeGridChargeDto> Charges);

public sealed record MaintenanceChargeGridRowDto(
    [property: JsonPropertyName("aid")] string ApartmentId,
    [property: JsonPropertyName("anm")] string ApartmentNumber,
    [property: JsonPropertyName("rn")] string? ResidentName,
    [property: JsonPropertyName("mos")] IReadOnlyList<MaintenanceChargeGridCellDto> Months);

public sealed record MaintenanceChargeGridDto(
    [property: JsonPropertyName("mos")] IReadOnlyList<int> Months,
    [property: JsonPropertyName("sum")] MaintenanceChargeGridSummaryDto Summary,
    [property: JsonPropertyName("rows")] IReadOnlyList<MaintenanceChargeGridRowDto> Rows);

public sealed record MaintenanceChargeGridSummaryDto(
    [property: JsonPropertyName("pa")] decimal PendingAmount,
    [property: JsonPropertyName("sa")] decimal SubmittedAmount,
    [property: JsonPropertyName("pda")] decimal PaidAmount,
    [property: JsonPropertyName("pc")] int PendingCount,
    [property: JsonPropertyName("sc")] int SubmittedCount,
    [property: JsonPropertyName("pdc")] int PaidCount);

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

public sealed record DenyMaintenancePaymentProofRequest(string Reason);

public sealed record ApproveMaintenancePaymentProofGroupRequest(
    IReadOnlyList<string> ChargeIds,
    string PaymentMethod,
    string? TransactionReference,
    string? ReceiptUrl = null,
    string? Notes = null);

public sealed record DenyMaintenancePaymentProofGroupRequest(
    IReadOnlyList<string> ChargeIds,
    string Reason);

public sealed record CreateMaintenancePenaltyChargeRequest(
    string ApartmentId,
    decimal Amount,
    DateTime DueDate,
    string Reason);

public sealed record MaintenanceProofUploadResponse(
    [property: JsonPropertyName("fn")] string FileName,
    [property: JsonPropertyName("fu")] string FileUrl);

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
    string Id,
    [property: JsonPropertyName("nm")] string Name,
    [property: JsonPropertyName("ds")] string Description,
    [property: JsonPropertyName("cap")] int Capacity,
    [property: JsonPropertyName("ac")] bool IsActive,
    [property: JsonPropertyName("os")] string OperatingStart,
    [property: JsonPropertyName("oe")] string OperatingEnd);

public record BookingResponse(
    string Id,
    [property: JsonPropertyName("an")] string AmenityName,
    [property: JsonPropertyName("uid")] string BookedByUserId,
    [property: JsonPropertyName("stt")] DateTime StartTime,
    [property: JsonPropertyName("ent")] DateTime EndTime,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("adn")] string? AdminNotes,
    [property: JsonPropertyName("cr")] string? CancellationRemarks = null,
    [property: JsonPropertyName("cid")] string? CancelledByUserId = null);

public record CancelBookingRequest(string? Remarks);

public record AvailabilitySlot(DateTime Start, DateTime End, bool IsAvailable);

public record ApproveRejectBookingRequest(string? AdminNotes);

public record ComplaintResponse(
    string Id,
    [property: JsonPropertyName("tt")] string Title,
    [property: JsonPropertyName("ds")] string Description,
    [property: JsonPropertyName("cat")] string Category,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("pr")] string Priority,
    [property: JsonPropertyName("ca")] DateTime CreatedAt,
    [property: JsonPropertyName("ra")] DateTime? ResolvedAt);

public record AddFeedbackRequest(int Rating, string? Comment);

public record NoticeResponse(
    string Id,
    [property: JsonPropertyName("tt")] string Title,
    [property: JsonPropertyName("ct")] string Content,
    [property: JsonPropertyName("cat")] string Category,
    [property: JsonPropertyName("pid")] string PostedByUserId,
    [property: JsonPropertyName("pa")] DateTime PublishAt,
    [property: JsonPropertyName("ea")] DateTime? ExpiresAt,
    [property: JsonPropertyName("rd")] bool IsReadByCurrentUser = false,
    // Full name of the poster — clients must show this, never the raw user id.
    [property: JsonPropertyName("pn")] string? PostedByName = null);

public record NoticeReadReceiptEntry(string UserId, string FullName);

public record NoticeReadReceiptsResponse(
    IReadOnlyList<NoticeReadReceiptEntry> Read,
    IReadOnlyList<NoticeReadReceiptEntry> Unread);

public record VisitorResponse(
    string Id,
    [property: JsonPropertyName("vn")] string VisitorName,
    [property: JsonPropertyName("vp")] string VisitorPhone,
    [property: JsonPropertyName("ve")] string? VisitorEmail,
    [property: JsonPropertyName("cn")] string? CompanyName,
    [property: JsonPropertyName("pu")] string Purpose,
    [property: JsonPropertyName("aid")] string HostApartmentId,
    [property: JsonPropertyName("hrn")] string HostResidentName,
    [property: JsonPropertyName("hbn")] string HostBlockName,
    [property: JsonPropertyName("hfn")] int HostFloorNumber,
    [property: JsonPropertyName("hft")] string HostFlatNumber,
    [property: JsonPropertyName("ipa")] bool IsPreApproved,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("qr")] string? QrCode,
    [property: JsonPropertyName("pc")] string PassCode,
    [property: JsonPropertyName("vh")] string? VehicleNumber,
    [property: JsonPropertyName("cit")] DateTime? CheckInTime,
    [property: JsonPropertyName("cot")] DateTime? CheckOutTime,
    [property: JsonPropertyName("ca")] DateTime CreatedAt,
    [property: JsonPropertyName("vu")] DateTime? ValidUntil = null,
    [property: JsonPropertyName("img")] string? VisitorImageUrl = null,
    [property: JsonPropertyName("ipe")] bool IsPassExpired = false,
    // True when the visitor is checked in past the society's overstay threshold — shown in red in lists.
    [property: JsonPropertyName("ov")] bool IsOverstay = false);

public sealed record CheckInVisitorRequest(string PassCode);

public sealed record VisitorImageUploadResponse(string FileName, string ImageUrl);

public sealed record VisitorExportResponse(string FileName, string ContentType, byte[] Content);

/// <summary>Sanitized pass info returned on the public (unauthenticated) shareable pass page.</summary>
public sealed record PublicVisitorPassResponse(
    [property: JsonPropertyName("vn")] string VisitorName,
    [property: JsonPropertyName("pu")] string Purpose,
    [property: JsonPropertyName("hbn")] string HostBlockName,
    [property: JsonPropertyName("hft")] string HostFlatNumber,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("qr")] string? QrCode,
    [property: JsonPropertyName("vu")] DateTime? ValidUntil,
    [property: JsonPropertyName("ipe")] bool IsPassExpired,
    [property: JsonPropertyName("img")] string? VisitorImageUrl);

public sealed record ShareVisitorPassRequest(string? Email, string? Phone);

public record CompetitionResponse(
    string Id, string SocietyId, string Title, string Description,
    DateTime StartDate, DateTime EndDate, string Status, string Prize, int? MaxParticipants, DateTime CreatedAt);

public record CompetitionEntryResponse(
    string Id, string CompetitionId, string ApartmentId, string UserId, decimal Score, int? Rank, DateTime RegisteredAt);

public record UpdateScoreRequest(decimal Score);

public record LeaderboardEntryDto(int Rank, string UserId, string ApartmentId, decimal Score);

public record UserPointsResponse(
    [property: JsonPropertyName("tp")] int TotalPoints,
    [property: JsonPropertyName("h")] IReadOnlyList<PointHistoryDto> History);

public record PointHistoryDto(
    [property: JsonPropertyName("pts")] int Points,
    [property: JsonPropertyName("rsn")] string Reason,
    [property: JsonPropertyName("ca")] DateTime CreatedAt);

public record ServiceProviderResponse(
    string Id,
    [property: JsonPropertyName("pn")] string ProviderName,
    [property: JsonPropertyName("cn")] string ContactName,
    [property: JsonPropertyName("cp")] string ContactPhone,
    [property: JsonPropertyName("svt")] IReadOnlyList<string> ServiceTypes,
    [property: JsonPropertyName("ds")] string Description,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("rt")] decimal Rating,
    [property: JsonPropertyName("rc")] int ReviewCount);

public record CreateServiceRequestRequest(string ServiceType, string Description, DateTime PreferredDateTime);

public record ServiceRequestResponse(
    string Id,
    [property: JsonPropertyName("svt")] string ServiceType,
    [property: JsonPropertyName("ds")] string Description,
    [property: JsonPropertyName("pdt")] DateTime PreferredDateTime,
    [property: JsonPropertyName("st")] string Status);

public record AddReviewRequest(int Rating, string Comment);

// ─── Staff Attendance ─────────────────────────────────────────────────────────

public sealed record CreateShiftRequest(string Name, TimeSpan StartTime, TimeSpan EndTime, int GraceMinutes = 30);

public record ShiftResponse(
    string Id,
    [property: JsonPropertyName("nm")] string Name);

public sealed record CreateStaffRequest(
    string FullName, string Phone, StaffCategory Category, StaffEmploymentType EmploymentType,
    string? PhotoUrl = null, string? VendorId = null, string? ShiftId = null);

public sealed record UpdateStaffRequest(string FullName, string Phone, string? PhotoUrl, string? ShiftId);

public record StaffResponse(
    string Id,
    [property: JsonPropertyName("fn")] string FullName,
    [property: JsonPropertyName("ph")] string Phone,
    [property: JsonPropertyName("cat")] string Category,
    [property: JsonPropertyName("et")] string EmploymentType,
    [property: JsonPropertyName("sid")] string? ShiftId,
    [property: JsonPropertyName("sn")] string? ShiftName,
    [property: JsonPropertyName("ac")] bool IsActive);

public record StaffAttendanceResponse([property: JsonPropertyName("sid")] string StaffId);

public record StaffAttendanceReportEntry(
    [property: JsonPropertyName("sid")] string StaffId,
    [property: JsonPropertyName("sn")] string StaffName,
    [property: JsonPropertyName("cat")] string Category,
    [property: JsonPropertyName("pd")] int PresentDays,
    [property: JsonPropertyName("ad")] int AbsentDays,
    [property: JsonPropertyName("ld")] int LateDays,
    [property: JsonPropertyName("od")] int OnLeaveDays);

public record StaffAttendanceReportResponse(
    [property: JsonPropertyName("fd")] DateTime FromDate,
    [property: JsonPropertyName("td")] DateTime ToDate,
    [property: JsonPropertyName("e")] IReadOnlyList<StaffAttendanceReportEntry> Entries);

// ─── SOS Emergency Alerts ─────────────────────────────────────────────────────

public sealed record TriggerSosAlertRequest(SosCategory Category, string? Note = null);

public record SosAlertResponse(
    string Id,
    [property: JsonPropertyName("al")] string ApartmentLabel,
    [property: JsonPropertyName("un")] string TriggeredByUserName,
    [property: JsonPropertyName("cat")] string Category,
    [property: JsonPropertyName("nt")] string? Note,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("ta")] DateTime TriggeredAt,
    [property: JsonPropertyName("aun")] string? AcknowledgedByUserName,
    [property: JsonPropertyName("run")] string? ResolvedByUserName,
    [property: JsonPropertyName("ec")] int EscalationCount);

public record SosCategoryBreakdown(
    [property: JsonPropertyName("cat")] string Category,
    [property: JsonPropertyName("ct")] int Count);

public record SosAlertReportResponse(
    [property: JsonPropertyName("ta")] int TotalAlerts,
    [property: JsonPropertyName("fr")] double FalseAlarmRatePercent,
    [property: JsonPropertyName("aa")] double? AverageAcknowledgeSeconds,
    [property: JsonPropertyName("ar")] double? AverageResolveSeconds,
    [property: JsonPropertyName("bc")] IReadOnlyList<SosCategoryBreakdown> ByCategory);

// ─── Polls & AGM E-Voting ─────────────────────────────────────────────────────

public sealed record CreatePollRequest(
    string Title, string Description, PollType Type, IReadOnlyList<string> Options,
    DateTime OpensAt, DateTime ClosesAt, PollEligibilityUnit EligibilityUnit, PollAnonymity Anonymity,
    PollVisibility Visibility, string? LinkedNoticeId, double? QuorumThresholdPercent,
    bool IsAgmResolution, bool AllowVoteChange, string? AgmSessionId = null,
    PollTargetAudience TargetAudience = PollTargetAudience.FullSociety, IReadOnlyList<string>? TargetBlockNames = null);

public sealed record CastVoteRequest(IReadOnlyList<string> SelectedOptionIds);

public record PollOptionResponse(
    string Id,
    [property: JsonPropertyName("tx")] string Text);
public record PollOptionTallyResponse(
    string Id,
    [property: JsonPropertyName("tx")] string Text,
    [property: JsonPropertyName("vc")] int VoteCount);

public record PollResponse(
    string Id,
    [property: JsonPropertyName("tt")] string Title,
    [property: JsonPropertyName("ds")] string Description,
    [property: JsonPropertyName("ty")] string Type,
    [property: JsonPropertyName("op")] IReadOnlyList<PollOptionResponse> Options,
    [property: JsonPropertyName("oa")] DateTime OpensAt,
    [property: JsonPropertyName("ca")] DateTime ClosesAt,
    [property: JsonPropertyName("agm")] bool IsAgmResolution,
    [property: JsonPropertyName("avc")] bool AllowVoteChange,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("rp")] bool ResultsPublished,
    [property: JsonPropertyName("oc")] string? Outcome,
    [property: JsonPropertyName("tl")] IReadOnlyList<PollOptionTallyResponse>? Tally,
    [property: JsonPropertyName("elc")] int? EligibleCount,
    [property: JsonPropertyName("pc")] int? ParticipantCount,
    [property: JsonPropertyName("hv")] bool HasVoted,
    [property: JsonPropertyName("mso")] IReadOnlyList<string>? MySelectedOptionIds,
    [property: JsonPropertyName("ta")] string TargetAudience,
    [property: JsonPropertyName("tbn")] IReadOnlyList<string> TargetBlockNames);

public record PollSummaryResponse(
    string Id,
    [property: JsonPropertyName("tt")] string Title,
    [property: JsonPropertyName("ty")] string Type,
    [property: JsonPropertyName("ca")] DateTime ClosesAt,
    [property: JsonPropertyName("st")] string Status,
    [property: JsonPropertyName("agm")] bool IsAgmResolution);

public record PollVoteResponse(
    [property: JsonPropertyName("pid")] string PollId,
    [property: JsonPropertyName("so")] IReadOnlyList<string> SelectedOptionIds,
    [property: JsonPropertyName("va")] DateTime VotedAt);

// ─── AGM Sessions ─────────────────────────────────────────────────────────────

public sealed record CreateAgmSessionRequest(string Title, string Description, DateTime SessionDate);

public record AgmSessionSummaryResponse(
    string Id,
    [property: JsonPropertyName("tt")] string Title,
    [property: JsonPropertyName("sd")] DateTime SessionDate,
    [property: JsonPropertyName("rc")] int ResolutionCount);

public record AgmSessionDetailResponse(
    string Id,
    [property: JsonPropertyName("tt")] string Title,
    [property: JsonPropertyName("ds")] string Description,
    [property: JsonPropertyName("sd")] DateTime SessionDate,
    [property: JsonPropertyName("r")] IReadOnlyList<PollResponse> Resolutions);

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

