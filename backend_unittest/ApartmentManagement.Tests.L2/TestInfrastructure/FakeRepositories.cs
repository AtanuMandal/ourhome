using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;

namespace ApartmentManagement.Tests.L2.TestInfrastructure;

// ─── Society ─────────────────────────────────────────────────────────────────

public sealed class FakeSocietyRepository : FakeRepository<Society>, ISocietyRepository
{
    public Task<Society?> GetByRegistrationNumberAsync(string registrationNumber, CancellationToken ct = default)
        => Task.FromResult<Society?>(null); // societies have no RegistrationNumber in the entity

    public Task<IReadOnlyList<Society>> GetByStatusAsync(SocietyStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<Society> result = Store.Values
            .Where(s => s.Status == status)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<int> CountAsync(CancellationToken ct = default)
        => Task.FromResult(Store.Count);
}

// ─── Apartment ────────────────────────────────────────────────────────────────

public sealed class FakeApartmentRepository : FakeRepository<Apartment>, IApartmentRepository
{
    public Task<Apartment?> GetByLocationAsync(string societyId, string blockName, string apartmentNumber, int floorNumber, CancellationToken ct = default)
    {
        var found = Store.Values.FirstOrDefault(a =>
            string.Equals(a.SocietyId, societyId, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(a.BlockName, blockName, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(a.ApartmentNumber, apartmentNumber, StringComparison.OrdinalIgnoreCase) &&
            a.FloorNumber == floorNumber);
        return Task.FromResult<Apartment?>(found);
    }

    public Task<IReadOnlyList<Apartment>> GetByStatusAsync(string societyId, ApartmentStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<Apartment> result = Store.Values
            .Where(a => a.SocietyId == societyId && a.Status == status)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<Apartment>> GetByOwnerAsync(string societyId, string ownerUserId, CancellationToken ct = default)
    {
        IReadOnlyList<Apartment> result = Store.Values
            .Where(a => a.SocietyId == societyId && a.OwnerId == ownerUserId)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<Apartment>> GetByTenantAsync(string societyId, string tenantUserId, CancellationToken ct = default)
    {
        IReadOnlyList<Apartment> result = Store.Values
            .Where(a => a.SocietyId == societyId && a.TenantId == tenantUserId)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<int> CountBySocietyAsync(string societyId, CancellationToken ct = default)
        => Task.FromResult(Store.Values.Count(a => a.SocietyId == societyId));
}

// ─── User ─────────────────────────────────────────────────────────────────────

public sealed class FakeUserRepository : FakeRepository<User>, IUserRepository
{
    public Task<User?> GetByEmailAsync(string societyId, string email, CancellationToken ct = default)
    {
        var found = Store.Values.FirstOrDefault(u =>
            u.SocietyId == societyId &&
            u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
        return Task.FromResult<User?>(found);
    }

    public Task<IReadOnlyList<User>> GetByEmailAcrossSocietiesAsync(string email, CancellationToken ct = default)
    {
        IReadOnlyList<User> result = Store.Values
            .Where(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase))
            .ToList();
        return Task.FromResult(result);
    }

    public Task<User?> GetByPhoneAsync(string societyId, string phone, CancellationToken ct = default)
    {
        var found = Store.Values.FirstOrDefault(u =>
            u.SocietyId == societyId && u.Phone == phone);
        return Task.FromResult<User?>(found);
    }

    public Task<User?> GetByExternalAuthIdAsync(string externalAuthId, CancellationToken ct = default)
        => Task.FromResult<User?>(null);

    public Task<IReadOnlyList<User>> GetByRoleAsync(string societyId, UserRole role, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<User> result = Store.Values
            .Where(u => u.SocietyId == societyId && u.Role == role)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }
}

// ─── Amenity ──────────────────────────────────────────────────────────────────

public sealed class FakeAmenityRepository : FakeRepository<Amenity>, IAmenityRepository
{
    public Task<IReadOnlyList<Amenity>> GetActiveAsync(string societyId, CancellationToken ct = default)
    {
        IReadOnlyList<Amenity> result = Store.Values
            .Where(a => a.SocietyId == societyId && a.IsActive)
            .ToList();
        return Task.FromResult(result);
    }
}

// ─── Amenity Booking ──────────────────────────────────────────────────────────

public sealed class FakeAmenityBookingRepository : FakeRepository<AmenityBooking>, IAmenityBookingRepository
{
    public Task<IReadOnlyList<AmenityBooking>> GetByAmenityAsync(string societyId, string amenityId, DateOnly date, CancellationToken ct = default)
    {
        IReadOnlyList<AmenityBooking> result = Store.Values
            .Where(b =>
                b.SocietyId == societyId &&
                b.AmenityId == amenityId &&
                DateOnly.FromDateTime(b.StartTime) == date &&
                b.Status != BookingStatus.Cancelled &&
                b.Status != BookingStatus.Rejected)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<AmenityBooking>> GetByUserAsync(string societyId, string userId, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<AmenityBooking> result = Store.Values
            .Where(b => b.SocietyId == societyId && b.BookedByUserId == userId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<AmenityBooking>> GetByStatusAsync(string societyId, BookingStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<AmenityBooking> result = Store.Values
            .Where(b => b.SocietyId == societyId && b.Status == status)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }
}

// ─── Complaint ────────────────────────────────────────────────────────────────

public sealed class FakeComplaintRepository : FakeRepository<Complaint>, IComplaintRepository
{
    public Task<IReadOnlyList<Complaint>> GetByUserAsync(string societyId, string userId, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<Complaint> result = Store.Values
            .Where(c => c.SocietyId == societyId && c.RaisedByUserId == userId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<Complaint>> GetByStatusAsync(string societyId, ComplaintStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<Complaint> result = Store.Values
            .Where(c => c.SocietyId == societyId && c.Status == status)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<Complaint>> GetByAssigneeAsync(string societyId, string assignedToUserId, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<Complaint> result = Store.Values
            .Where(c => c.SocietyId == societyId && c.AssignedToUserId == assignedToUserId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }
}

// ─── Notice ───────────────────────────────────────────────────────────────────

public sealed class FakeNoticeRepository : FakeRepository<Notice>, INoticeRepository
{
    public Task<IReadOnlyList<Notice>> GetActiveAsync(string societyId, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<Notice> result = Store.Values
            .Where(n => n.SocietyId == societyId && n.IsActive && !n.IsArchived)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<Notice>> GetExpiredAsync(string societyId, CancellationToken ct = default)
    {
        IReadOnlyList<Notice> result = Store.Values
            .Where(n => n.SocietyId == societyId && n.ExpiresAt.HasValue && n.ExpiresAt < DateTime.UtcNow)
            .ToList();
        return Task.FromResult(result);
    }
}

// ─── Visitor Log ──────────────────────────────────────────────────────────────

public sealed class FakeVisitorLogRepository : FakeRepository<VisitorLog>, IVisitorLogRepository
{
    public Task<IReadOnlyList<VisitorLog>> GetByApartmentAsync(string societyId, string apartmentId, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<VisitorLog> result = Store.Values
            .Where(v => v.SocietyId == societyId && v.HostApartmentId == apartmentId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<VisitorLog>> GetActiveVisitorsAsync(string societyId, CancellationToken ct = default)
    {
        IReadOnlyList<VisitorLog> result = Store.Values
            .Where(v => v.SocietyId == societyId && v.Status == VisitorStatus.CheckedIn)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<VisitorLog?> GetByPassCodeAsync(string passCode, CancellationToken ct = default)
    {
        var found = Store.Values.FirstOrDefault(v => v.PassCode == passCode);
        return Task.FromResult<VisitorLog?>(found);
    }
}

// ─── Maintenance Schedule ─────────────────────────────────────────────────────

public sealed class FakeMaintenanceScheduleRepository : FakeRepository<MaintenanceSchedule>, IMaintenanceScheduleRepository
{
    public Task<IReadOnlyList<MaintenanceSchedule>> GetActiveAsync(string societyId, CancellationToken ct = default)
    {
        IReadOnlyList<MaintenanceSchedule> result = Store.Values
            .Where(s => s.SocietyId == societyId && s.IsEffectiveOn(DateTime.UtcNow.Date))
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<MaintenanceSchedule>> GetByApartmentAsync(string societyId, string apartmentId, CancellationToken ct = default)
    {
        IReadOnlyList<MaintenanceSchedule> result = Store.Values
            .Where(s => s.SocietyId == societyId && (string.IsNullOrWhiteSpace(s.ApartmentId) || s.ApartmentId == apartmentId))
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<MaintenanceSchedule>> GetActiveDueOnAsync(DateTime dueOnUtc, CancellationToken ct = default)
    {
        IReadOnlyList<MaintenanceSchedule> result = Store.Values
            .Where(s => s.IsEffectiveOn(dueOnUtc.Date) && s.NextDueDate.Date <= dueOnUtc.Date)
            .ToList();
        return Task.FromResult(result);
    }
}

// ─── Maintenance Charge ───────────────────────────────────────────────────────

public sealed class FakeMaintenanceChargeRepository : FakeRepository<MaintenanceCharge>, IMaintenanceChargeRepository
{
    public Task<IReadOnlyList<MaintenanceCharge>> GetByApartmentAsync(string societyId, string apartmentId, int page, int pageSize, int? year, int? month, CancellationToken ct = default)
    {
        var query = Store.Values
            .Where(p => p.SocietyId == societyId && p.ApartmentId == apartmentId)
            .AsEnumerable();
        if (year.HasValue)
            query = query.Where(p => p.ChargeYear == year.Value);
        if (month.HasValue)
            query = query.Where(p => p.ChargeMonth == month.Value);
        IReadOnlyList<MaintenanceCharge> result = query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<MaintenanceCharge>> GetBySocietyAsync(string societyId, int page, int pageSize, string? apartmentId, PaymentStatus? status, int? year, int? month, CancellationToken ct = default)
    {
        var query = Store.Values.Where(p => p.SocietyId == societyId).AsEnumerable();
        if (!string.IsNullOrWhiteSpace(apartmentId))
            query = query.Where(p => p.ApartmentId == apartmentId);
        if (status.HasValue)
            query = query.Where(p => p.Status == status.Value);
        if (year.HasValue)
            query = query.Where(p => p.ChargeYear == year.Value);
        if (month.HasValue)
            query = query.Where(p => p.ChargeMonth == month.Value);
        IReadOnlyList<MaintenanceCharge> result = query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<MaintenanceCharge>> GetByScheduleAsync(string societyId, string scheduleId, CancellationToken ct = default)
    {
        IReadOnlyList<MaintenanceCharge> result = Store.Values
            .Where(p => p.SocietyId == societyId && p.ScheduleId == scheduleId)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<MaintenanceCharge>> GetByStatusAsync(string societyId, PaymentStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<MaintenanceCharge> result = Store.Values
            .Where(p => p.SocietyId == societyId && p.Status == status)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<MaintenanceCharge>> GetDueSoonAsync(string societyId, int withinDays, CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(withinDays);
        IReadOnlyList<MaintenanceCharge> result = Store.Values
            .Where(p => p.SocietyId == societyId &&
                        (p.Status == PaymentStatus.Pending || p.Status == PaymentStatus.ProofSubmitted) &&
                        p.DueDate <= cutoff)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<MaintenanceCharge?> GetByScheduleAndPeriodAsync(string societyId, string scheduleId, string apartmentId, int year, int month, CancellationToken ct = default)
    {
        var found = Store.Values.FirstOrDefault(p =>
            p.SocietyId == societyId &&
            p.ScheduleId == scheduleId &&
            p.ApartmentId == apartmentId &&
            p.ChargeYear == year &&
            p.ChargeMonth == month);
        return Task.FromResult<MaintenanceCharge?>(found);
    }
}

// ─── Competition ──────────────────────────────────────────────────────────────

public sealed class FakeCompetitionRepository : FakeRepository<Competition>, ICompetitionRepository
{
    public Task<IReadOnlyList<Competition>> GetActiveAsync(string societyId, CancellationToken ct = default)
    {
        IReadOnlyList<Competition> result = Store.Values
            .Where(c => c.SocietyId == societyId && c.Status == CompetitionStatus.Active)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<Competition>> GetByStatusAsync(string societyId, CompetitionStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<Competition> result = Store.Values
            .Where(c => c.SocietyId == societyId && c.Status == status)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }
}

// ─── Competition Entry ────────────────────────────────────────────────────────

public sealed class FakeCompetitionEntryRepository : FakeRepository<CompetitionEntry>, ICompetitionEntryRepository
{
    public Task<IReadOnlyList<CompetitionEntry>> GetByCompetitionAsync(string societyId, string competitionId, CancellationToken ct = default)
    {
        IReadOnlyList<CompetitionEntry> result = Store.Values
            .Where(e => e.SocietyId == societyId && e.CompetitionId == competitionId)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<CompetitionEntry>> GetLeaderboardAsync(string societyId, string competitionId, int topN, CancellationToken ct = default)
    {
        IReadOnlyList<CompetitionEntry> result = Store.Values
            .Where(e => e.SocietyId == societyId && e.CompetitionId == competitionId)
            .OrderByDescending(e => e.Score)
            .Take(topN)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<CompetitionEntry?> GetUserEntryAsync(string societyId, string competitionId, string userId, CancellationToken ct = default)
    {
        var found = Store.Values.FirstOrDefault(e =>
            e.SocietyId == societyId &&
            e.CompetitionId == competitionId &&
            e.UserId == userId);
        return Task.FromResult<CompetitionEntry?>(found);
    }
}

// ─── Reward Points ────────────────────────────────────────────────────────────

public sealed class FakeRewardPointsRepository : FakeRepository<RewardPoints>, IRewardPointsRepository
{
    public Task<RewardPoints?> GetByUserAsync(string societyId, string userId, CancellationToken ct = default)
    {
        var found = Store.Values.FirstOrDefault(r => r.SocietyId == societyId && r.UserId == userId);
        return Task.FromResult<RewardPoints?>(found);
    }

    /// <summary>Returns all reward-point transaction records ordered by points descending (topN applies per record, not per user).</summary>
    public Task<IReadOnlyList<RewardPoints>> GetLeaderboardAsync(string societyId, int topN, CancellationToken ct = default)
    {
        IReadOnlyList<RewardPoints> result = Store.Values
            .Where(r => r.SocietyId == societyId)
            .OrderByDescending(r => r.Points)
            .Take(topN)
            .ToList();
        return Task.FromResult(result);
    }
}

// ─── Service Provider ─────────────────────────────────────────────────────────

public sealed class FakeServiceProviderRepository : FakeRepository<Domain.Entities.ServiceProvider>, IServiceProviderRepository
{
    public Task<IReadOnlyList<Domain.Entities.ServiceProvider>> GetByServiceTypeAsync(string societyId, string serviceType, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<Domain.Entities.ServiceProvider> result = Store.Values
            .Where(p => (societyId == null || p.SocietyId == societyId) &&
                        p.ServiceTypes.Contains(serviceType, StringComparer.OrdinalIgnoreCase))
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<Domain.Entities.ServiceProvider>> GetApprovedAsync(string societyId, CancellationToken ct = default)
    {
        IReadOnlyList<Domain.Entities.ServiceProvider> result = Store.Values
            .Where(p => p.Status == ServiceProviderStatus.Approved)
            .ToList();
        return Task.FromResult(result);
    }
}

// ─── Service Provider Request ─────────────────────────────────────────────────

public sealed class FakeServiceProviderRequestRepository : FakeRepository<ServiceProviderRequest>, IServiceProviderRequestRepository
{
    public Task<IReadOnlyList<ServiceProviderRequest>> GetByUserAsync(string societyId, string userId, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<ServiceProviderRequest> result = Store.Values
            .Where(r => r.SocietyId == societyId && r.RequestedByUserId == userId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<ServiceProviderRequest>> GetByStatusAsync(string societyId, ServiceRequestStatus status, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<ServiceProviderRequest> result = Store.Values
            .Where(r => r.SocietyId == societyId && r.Status == status)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }

    public Task<IReadOnlyList<ServiceProviderRequest>> GetByProviderAsync(string societyId, string providerId, int page, int pageSize, CancellationToken ct = default)
    {
        IReadOnlyList<ServiceProviderRequest> result = Store.Values
            .Where(r => r.SocietyId == societyId && r.AcceptedByProviderId == providerId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(result);
    }
}
