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
    public const string UserHasApartmentMapping = "USER_HAS_APARTMENT_MAPPING";
    public const string UserHasPendingDues = "USER_HAS_PENDING_DUES";
    public const string UserAlreadyOnCommittee = "USER_ALREADY_ON_COMMITTEE";

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
    public const string VisitorPassExpired = "VISITOR_PASS_EXPIRED";

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

    public const string InvalidInviteToken = "INVALID_INVITE_TOKEN";
    public const string NoPendingApartmentRequest = "NO_PENDING_APARTMENT_REQUEST";
    public const string ApartmentUserCapReached = "APARTMENT_USER_CAP_REACHED";

    public const string StaffNotFound = "STAFF_NOT_FOUND";
    public const string StaffInactive = "STAFF_INACTIVE";
    public const string ShiftNotFound = "SHIFT_NOT_FOUND";
    public const string StaffAlreadyCheckedIn = "STAFF_ALREADY_CHECKED_IN";
    public const string StaffNotCheckedIn = "STAFF_NOT_CHECKED_IN";

    public const string SosAlertNotFound = "SOS_ALERT_NOT_FOUND";
    public const string SosAlertAlreadySettled = "SOS_ALERT_ALREADY_SETTLED";
    public const string UserHasNoApartment = "USER_HAS_NO_APARTMENT";

    public const string PollNotFound = "POLL_NOT_FOUND";
    public const string PollNotOpen = "POLL_NOT_OPEN";
    public const string AlreadyVoted = "ALREADY_VOTED";
    public const string PollAlreadyClosed = "POLL_ALREADY_CLOSED";
    public const string PollResultsAlreadyPublished = "POLL_RESULTS_ALREADY_PUBLISHED";
    public const string NotEligibleToVote = "NOT_ELIGIBLE_TO_VOTE";
    public const string AgmSessionNotFound = "AGM_SESSION_NOT_FOUND";
}
