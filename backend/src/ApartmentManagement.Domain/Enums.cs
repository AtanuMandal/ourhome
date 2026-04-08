namespace ApartmentManagement.Domain.Enums;

public enum SocietyStatus { Draft, Active, Inactive }
public enum ApartmentStatus { Available, Occupied, UnderMaintenance }
/// <summary>
/// HQ = HeadQuarters (platform-level). SU = Society Users (society-level).
/// HQAdmin can create/manage societies. HQUser can view them.
/// SUAdmin is the Housing Officer managing a society. SUUser is a regular resident.
/// </summary>
public enum UserRole { HQAdmin, HQUser, SUAdmin, SUUser }
public enum BookingStatus { Pending, Approved, Rejected, Cancelled, Completed }
public enum ComplaintCategory { Maintenance, Security, Noise, Cleanliness, Parking, Other }
public enum ComplaintStatus { Open, InProgress, Resolved, Closed, Rejected }
public enum ComplaintPriority { Low, Medium, High, Critical }
public enum NoticeCategory { Maintenance, Events, General, Financial, Emergency }
public enum VisitorStatus { Pending, Approved, Denied, CheckedIn, CheckedOut }
public enum FeeFrequency { Monthly, Quarterly, Annual, OneTime }
public enum PaymentStatus { Pending, Paid, Failed, Overdue, Cancelled }
public enum CompetitionStatus { Upcoming, Active, Completed, Cancelled }
public enum ServiceProviderStatus { Pending, Approved, Rejected, Suspended }
public enum ServiceRequestStatus { Open, Accepted, InProgress, Completed, Cancelled }
