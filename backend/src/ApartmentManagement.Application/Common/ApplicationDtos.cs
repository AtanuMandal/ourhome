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
    IReadOnlyList<SocietyUserAssignmentRequest>? SocietyUsers,
    IReadOnlyList<SocietyCommitteeRequest>? Committees);

public record ConfigureFeeRequest(decimal BaseAmount, decimal PerRoomCharge, decimal ParkingCharge, string Currency);

public record SocietyResponse(
    string Id, string Name, AddressDto Address, string ContactEmail, string ContactPhone,
    int TotalBlocks, int TotalApartments, string Status, IReadOnlyList<string> AdminUserIds,
    IReadOnlyList<SocietyUserAssignmentDto> SocietyUsers,
    IReadOnlyList<SocietyCommitteeDto> Committees,
    DateTime CreatedAt);

public record SocietyUserAssignmentRequest(string Email, string RoleTitle);
public record SocietyCommitteeRequest(string Name, IReadOnlyList<SocietyUserAssignmentRequest> Members);
public record SocietyUserAssignmentDto(string UserId, string FullName, string Email, string RoleTitle);
public record SocietyCommitteeDto(string Name, IReadOnlyList<SocietyUserAssignmentDto> Members);

// ─── Apartment ────────────────────────────────────────────────────────────────

public record CreateApartmentRequest(
    string ApartmentNumber, string BlockName, int FloorNumber, int NumberOfRooms, IReadOnlyList<string> ParkingSlots, string? OwnerId,
    double CarpetArea, double BuildUpArea, double SuperBuildArea);

public record UpdateApartmentRequest(string BlockName, int FloorNumber, int NumberOfRooms, IReadOnlyList<string> ParkingSlots,
    double CarpetArea, double BuildUpArea, double SuperBuildArea);

public record ApartmentResponse(
    string Id, string SocietyId, string ApartmentNumber, string BlockName, int FloorNumber,
    int NumberOfRooms, IReadOnlyList<string> ParkingSlots, double CarpetArea, double BuildUpArea, double SuperBuildArea,
    string Status, IReadOnlyList<ApartmentResidentDto> Residents, string? TenantId,
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

public record UserResponse(
    string Id, string SocietyId, string FullName, string Email, string Phone,
    string Role, string ResidentType, string? ApartmentId, string? InvitedByUserId, bool IsActive, bool IsVerified, bool HasPassword,
    IReadOnlyList<string> Permissions, IReadOnlyList<ResidentApartmentDto> Apartments, DateTime CreatedAt);

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
public record ConfirmPasswordResetRequest(string SocietyId, string UserId, string OtpCode, string NewPassword);
public record TransferApartmentOwnershipRequest(string ApartmentId, string FullName, string Email, string Phone);
public record TransferApartmentTenancyRequest(string ApartmentId, string FullName, string Email, string Phone);
public record AddHouseholdMemberRequest(
    string ApartmentId,
    string FullName,
    string Email,
    string Phone,
    [property: JsonConverter(typeof(JsonStringEnumConverter))] ResidentType ResidentType);

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

// ─── Visitor ─────────────────────────────────────────────────────────────────

public sealed record VisitorLogDto(
    string Id, string SocietyId, string VisitorName, string VisitorPhone,
    string? VisitorEmail, string Purpose, string HostApartmentId, string HostUserId,
    VisitorStatus Status, string QrCode, string PassCode, string? VehicleNumber,
    DateTime? CheckInTime, DateTime? CheckOutTime, TimeSpan? Duration, DateTime CreatedAt);

public sealed record RegisterVisitorRequest(
    string VisitorName, string VisitorPhone, string? VisitorEmail,
    string Purpose, string ApartmentId, string HostUserId, string? VehicleNumber = null);

// ─── Fee ─────────────────────────────────────────────────────────────────────

public sealed record FeeScheduleDto(
    string Id, string SocietyId, string ApartmentId, string Description,
    decimal Amount, FeeFrequency Frequency, int DueDay,
    DateTime NextDueDate, bool IsActive, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record FeePaymentDto(
    string Id, string SocietyId, string ApartmentId, string FeeScheduleId,
    string Description, decimal Amount, PaymentStatus Status,
    DateTime DueDate, DateTime? PaidAt, string? PaymentMethod,
    string? TransactionId, string? ReceiptUrl, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record CreateFeeScheduleRequest(
    string ApartmentId, string Description, decimal Amount, FeeFrequency Frequency, int DueDay);

public sealed record RecordPaymentRequest(
    string PaymentMethod, string TransactionId, string? ReceiptUrl = null);

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
    bool IsActive, DateTime CreatedAt, IReadOnlyList<string> TargetApartmentIds);

public record VisitorResponse(
    string Id, string SocietyId, string VisitorName, string VisitorPhone, string Purpose,
    string HostApartmentId, string Status, string? QrCode, string PassCode,
    DateTime? CheckInTime, DateTime? CheckOutTime, double? Duration, DateTime CreatedAt);

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

// ─── Common ───────────────────────────────────────────────────────────────────

public record IdResponse(string Id);
public record MessageResponse(string Message);


