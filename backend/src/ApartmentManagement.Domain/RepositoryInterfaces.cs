using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;

namespace ApartmentManagement.Domain.Repositories;

// ─── Generic base ────────────────────────────────────────────────────────────

public interface IRepository<T> where T : BaseEntity
{
    Task<T?> GetByIdAsync(string id, string societyId, CancellationToken ct = default);
    Task<IReadOnlyList<T>> GetAllAsync(string societyId, CancellationToken ct = default);
    Task<T> CreateAsync(T entity, CancellationToken ct = default);
    Task<T> UpdateAsync(T entity, CancellationToken ct = default);
    Task DeleteAsync(string id, string societyId, CancellationToken ct = default);
    Task<bool> ExistsAsync(string id, string societyId, CancellationToken ct = default);
}

// ─── Society ─────────────────────────────────────────────────────────────────

public interface ISocietyRepository : IRepository<Society>
{
    Task<Society?> GetByRegistrationNumberAsync(string registrationNumber, CancellationToken ct = default);
    Task<IReadOnlyList<Society>> GetByStatusAsync(SocietyStatus status, int page, int pageSize, CancellationToken ct = default);
    Task<int> CountAsync(CancellationToken ct = default);
}

// ─── Apartment ────────────────────────────────────────────────────────────────

public interface IApartmentRepository : IRepository<Apartment>
{
    Task<Apartment?> GetByLocationAsync(string societyId, string blockName, string apartmentNumber, int floorNumber, CancellationToken ct = default);
    Task<IReadOnlyList<Apartment>> GetByStatusAsync(string societyId, ApartmentStatus status, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<Apartment>> GetByOwnerAsync(string societyId, string ownerUserId, CancellationToken ct = default);
    Task<IReadOnlyList<Apartment>> GetByTenantAsync(string societyId, string tenantUserId, CancellationToken ct = default);
    Task<int> CountBySocietyAsync(string societyId, CancellationToken ct = default);
}

// ─── User ─────────────────────────────────────────────────────────────────────

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string societyId, string email, CancellationToken ct = default);
    Task<IReadOnlyList<User>> GetByEmailAcrossSocietiesAsync(string email, CancellationToken ct = default);
    Task<User?> GetByPhoneAsync(string societyId, string phone, CancellationToken ct = default);
    Task<IReadOnlyList<User>> GetByPhoneAcrossSocietiesAsync(string phone, CancellationToken ct = default);
    Task<User?> GetByExternalAuthIdAsync(string externalAuthId, CancellationToken ct = default);
    Task<IReadOnlyList<User>> GetByRoleAsync(string societyId, UserRole role, int page, int pageSize, CancellationToken ct = default);
}

// ─── Amenity ──────────────────────────────────────────────────────────────────

public interface IAmenityRepository : IRepository<Amenity>
{
    Task<IReadOnlyList<Amenity>> GetActiveAsync(string societyId, CancellationToken ct = default);
}

// ─── Amenity Booking ──────────────────────────────────────────────────────────

public interface IAmenityBookingRepository : IRepository<AmenityBooking>
{
    Task<IReadOnlyList<AmenityBooking>> GetByAmenityAsync(string societyId, string amenityId, DateOnly date, CancellationToken ct = default);
    Task<IReadOnlyList<AmenityBooking>> GetByUserAsync(string societyId, string userId, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<AmenityBooking>> GetByStatusAsync(string societyId, BookingStatus status, int page, int pageSize, CancellationToken ct = default);
}

// ─── Complaint ────────────────────────────────────────────────────────────────

public interface IComplaintRepository : IRepository<Complaint>
{
    Task<IReadOnlyList<Complaint>> GetByUserAsync(string societyId, string userId, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<Complaint>> GetByStatusAsync(string societyId, ComplaintStatus status, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<Complaint>> GetByAssigneeAsync(string societyId, string assignedToUserId, int page, int pageSize, CancellationToken ct = default);
}

// ─── Notice ───────────────────────────────────────────────────────────────────

public interface INoticeRepository : IRepository<Notice>
{
    Task<IReadOnlyList<Notice>> GetActiveAsync(string societyId, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<Notice>> GetExpiredAsync(string societyId, CancellationToken ct = default);
}

// ─── Visitor Log ──────────────────────────────────────────────────────────────

public interface IVisitorLogRepository : IRepository<VisitorLog>
{
    Task<IReadOnlyList<VisitorLog>> GetByApartmentAsync(string societyId, string apartmentId, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<VisitorLog>> GetActiveVisitorsAsync(string societyId, CancellationToken ct = default);
    Task<VisitorLog?> GetByPassCodeAsync(string passCode, CancellationToken ct = default);
}

// ─── Maintenance Schedule ─────────────────────────────────────────────────────

public interface IMaintenanceScheduleRepository : IRepository<MaintenanceSchedule>
{
    Task<IReadOnlyList<MaintenanceSchedule>> GetActiveAsync(string societyId, CancellationToken ct = default);
    Task<IReadOnlyList<MaintenanceSchedule>> GetByApartmentAsync(string societyId, string apartmentId, CancellationToken ct = default);
    Task<IReadOnlyList<MaintenanceSchedule>> GetActiveDueOnAsync(DateTime dueOnUtc, CancellationToken ct = default);
}

// ─── Maintenance Charge ───────────────────────────────────────────────────────

public interface IMaintenanceChargeRepository : IRepository<MaintenanceCharge>
{
    Task<IReadOnlyList<MaintenanceCharge>> GetByApartmentAsync(string societyId, string apartmentId, int page, int pageSize, int? year, int? month, CancellationToken ct = default);
    Task<IReadOnlyList<MaintenanceCharge>> GetBySocietyAsync(string societyId, int page, int pageSize, string? apartmentId, PaymentStatus? status, int? year, int? month, CancellationToken ct = default);
    Task<IReadOnlyList<MaintenanceCharge>> GetByScheduleAsync(string societyId, string scheduleId, CancellationToken ct = default);
    Task<IReadOnlyList<MaintenanceCharge>> GetByStatusAsync(string societyId, PaymentStatus status, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<MaintenanceCharge>> GetDueSoonAsync(string societyId, int withinDays, CancellationToken ct = default);
    Task<MaintenanceCharge?> GetByScheduleAndPeriodAsync(string societyId, string scheduleId, string apartmentId, int year, int month, CancellationToken ct = default);
    Task<IReadOnlyList<MaintenanceCharge>> GetByDueDateRangeAsync(string societyId, DateTime fromInclusiveUtc, DateTime toInclusiveUtc, CancellationToken ct = default);
}

public interface IMaintenanceChargeGridViewRepository : IRepository<MaintenanceChargeGridView>
{
    Task<MaintenanceChargeGridView?> GetByFinancialYearAsync(string societyId, int financialYearStart, CancellationToken ct = default);
}

// ─── Competition ──────────────────────────────────────────────────────────────

public interface ICompetitionRepository : IRepository<Competition>
{
    Task<IReadOnlyList<Competition>> GetActiveAsync(string societyId, CancellationToken ct = default);
    Task<IReadOnlyList<Competition>> GetByStatusAsync(string societyId, CompetitionStatus status, int page, int pageSize, CancellationToken ct = default);
}

// ─── Competition Entry ────────────────────────────────────────────────────────

public interface ICompetitionEntryRepository : IRepository<CompetitionEntry>
{
    Task<IReadOnlyList<CompetitionEntry>> GetByCompetitionAsync(string societyId, string competitionId, CancellationToken ct = default);
    Task<IReadOnlyList<CompetitionEntry>> GetLeaderboardAsync(string societyId, string competitionId, int topN, CancellationToken ct = default);
    Task<CompetitionEntry?> GetUserEntryAsync(string societyId, string competitionId, string userId, CancellationToken ct = default);
}

// ─── Reward Points ────────────────────────────────────────────────────────────

public interface IRewardPointsRepository : IRepository<RewardPoints>
{
    Task<RewardPoints?> GetByUserAsync(string societyId, string userId, CancellationToken ct = default);
    Task<IReadOnlyList<RewardPoints>> GetLeaderboardAsync(string societyId, int topN, CancellationToken ct = default);
}

// ─── Service Provider ─────────────────────────────────────────────────────────

public interface IServiceProviderRepository : IRepository<ServiceProvider>
{
    Task<IReadOnlyList<ServiceProvider>> GetByServiceTypeAsync(string societyId, string serviceType, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<ServiceProvider>> GetApprovedAsync(string societyId, CancellationToken ct = default);
}

// ─── Service Provider Request ─────────────────────────────────────────────────

public interface IServiceProviderRequestRepository : IRepository<ServiceProviderRequest>
{
    Task<IReadOnlyList<ServiceProviderRequest>> GetByUserAsync(string societyId, string userId, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<ServiceProviderRequest>> GetByStatusAsync(string societyId, ServiceRequestStatus status, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<ServiceProviderRequest>> GetByProviderAsync(string societyId, string providerId, int page, int pageSize, CancellationToken ct = default);
}

// ─── Shift ────────────────────────────────────────────────────────────────────

public interface IShiftRepository : IRepository<Shift>
{
}

// ─── Staff ────────────────────────────────────────────────────────────────────

public interface IStaffRepository : IRepository<Staff>
{
    Task<IReadOnlyList<Staff>> GetActiveAsync(string societyId, CancellationToken ct = default);

    /// <summary>Cross-partition — used by the missing-check-in grace-period timer, which runs society-agnostic.</summary>
    Task<IReadOnlyList<Staff>> GetActiveWithShiftsAcrossSocietiesAsync(CancellationToken ct = default);
}

// ─── Staff Attendance ─────────────────────────────────────────────────────────

public interface IStaffAttendanceRepository : IRepository<StaffAttendance>
{
    Task<IReadOnlyList<StaffAttendance>> GetOnDutyAsync(string societyId, CancellationToken ct = default);
    Task<StaffAttendance?> GetOpenAttendanceAsync(string societyId, string staffId, CancellationToken ct = default);
    Task<IReadOnlyList<StaffAttendance>> GetByStaffAsync(string societyId, string staffId, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);
    Task<IReadOnlyList<StaffAttendance>> GetBySocietyAndDateRangeAsync(string societyId, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);
    Task<bool> HasRecordForDateAsync(string societyId, string staffId, DateTime attendanceDate, CancellationToken ct = default);
}

// ─── SOS Alert ────────────────────────────────────────────────────────────────

public interface ISosAlertRepository : IRepository<SosAlert>
{
    /// <summary>Cross-partition — used by the escalation timer, which runs society-agnostic.</summary>
    Task<IReadOnlyList<SosAlert>> GetActiveAcrossSocietiesAsync(CancellationToken ct = default);
}

// ─── Poll ─────────────────────────────────────────────────────────────────────

public interface IPollRepository : IRepository<Poll>
{
    /// <summary>Cross-partition — used by the status/reminder timers, which run society-agnostic.</summary>
    Task<IReadOnlyList<Poll>> GetOpenOrScheduledAcrossSocietiesAsync(CancellationToken ct = default);
}

public interface IPollVoteRepository : IRepository<PollVote>
{
    Task<IReadOnlyList<PollVote>> GetByPollAsync(string societyId, string pollId, CancellationToken ct = default);
    Task<PollVote?> GetByPollAndEligibleUnitAsync(string societyId, string pollId, string eligibleUnitId, CancellationToken ct = default);
}

public interface IAgmSessionRepository : IRepository<AgmSession>
{
}

// ─── Outbox ───────────────────────────────────────────────────────────────────

public interface IOutboxRepository : IRepository<OutboxRecord>
{
    /// <summary>Returns pending records for manual/admin recovery use. Normal flow is Change Feed.</summary>
    Task<IReadOnlyList<OutboxRecord>> GetPendingAsync(int maxCount = 100, CancellationToken ct = default);
}
