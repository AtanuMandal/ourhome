namespace ApartmentManagement.Shared.Constants;

/// <summary>Application-wide error codes used in Result failures and HTTP problem responses.</summary>
public static class ErrorCodes
{
    public const string NotFound = "NOT_FOUND";
    public const string ValidationFailed = "VALIDATION_FAILED";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string Forbidden = "FORBIDDEN";
    public const string Conflict = "CONFLICT";
    public const string InternalError = "INTERNAL_ERROR";
    public const string RateLimitExceeded = "RATE_LIMIT_EXCEEDED";

    public const string SocietyNotFound = "SOCIETY_NOT_FOUND";
    public const string SocietyAlreadyExists = "SOCIETY_ALREADY_EXISTS";
    public const string SocietyNotActive = "SOCIETY_NOT_ACTIVE";

    public const string ApartmentNotFound = "APARTMENT_NOT_FOUND";
    public const string ApartmentNumberDuplicate = "APARTMENT_NUMBER_DUPLICATE";
    public const string ApartmentOccupied = "APARTMENT_OCCUPIED";

    public const string UserNotFound = "USER_NOT_FOUND";
    public const string UserAlreadyExists = "USER_ALREADY_EXISTS";
    public const string InvalidCredentials = "INVALID_CREDENTIALS";
    public const string OtpInvalid = "OTP_INVALID";
    public const string OtpExpired = "OTP_EXPIRED";
    public const string UserNotVerified = "USER_NOT_VERIFIED";

    public const string AmenityNotFound = "AMENITY_NOT_FOUND";
    public const string BookingConflict = "BOOKING_CONFLICT";
    public const string BookingNotFound = "BOOKING_NOT_FOUND";
    public const string BookingWindowExceeded = "BOOKING_WINDOW_EXCEEDED";
    public const string AmenityUnavailable = "AMENITY_UNAVAILABLE";
    public const string OutsideOperatingHours = "OUTSIDE_OPERATING_HOURS";

    public const string ComplaintNotFound = "COMPLAINT_NOT_FOUND";
    public const string NoticeNotFound = "NOTICE_NOT_FOUND";

    public const string VisitorNotFound = "VISITOR_NOT_FOUND";
    public const string InvalidPassCode = "INVALID_PASS_CODE";
    public const string VisitorNotApproved = "VISITOR_NOT_APPROVED";

    public const string FeeScheduleNotFound = "FEE_SCHEDULE_NOT_FOUND";
    public const string PaymentNotFound = "PAYMENT_NOT_FOUND";
    public const string VendorNotFound = "VENDOR_NOT_FOUND";
    public const string VendorScheduleNotFound = "VENDOR_SCHEDULE_NOT_FOUND";
    public const string VendorChargeNotFound = "VENDOR_CHARGE_NOT_FOUND";

    public const string CompetitionNotFound = "COMPETITION_NOT_FOUND";
    public const string CompetitionNotActive = "COMPETITION_NOT_ACTIVE";
    public const string AlreadyRegistered = "ALREADY_REGISTERED";
    public const string InsufficientPoints = "INSUFFICIENT_POINTS";
    public const string CompetitionFull = "COMPETITION_FULL";

    public const string ServiceProviderNotFound = "SERVICE_PROVIDER_NOT_FOUND";
    public const string ServiceProviderNotApproved = "SERVICE_PROVIDER_NOT_APPROVED";
    public const string ServiceRequestNotFound = "SERVICE_REQUEST_NOT_FOUND";
    public const string ServiceRequestNotOpen = "SERVICE_REQUEST_NOT_OPEN";
}
