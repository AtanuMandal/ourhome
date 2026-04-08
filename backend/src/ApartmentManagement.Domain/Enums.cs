namespace ApartmentManagement.Domain.Enums;

public enum SocietyStatus { Draft, Active, Inactive }
public enum ApartmentStatus { Available, Occupied, UnderMaintenance }
public enum UserRole { SuperAdmin, SocietyAdmin, Owner, Tenant, SecurityPersonnel, ServiceProvider, FamilyMember }
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
