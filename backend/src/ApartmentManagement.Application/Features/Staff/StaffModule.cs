using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;

// "Staff" also names this feature's own namespace (Commands.Staff / Queries.Staff below), which
// shadows the bare entity name — alias it so `DomainStaff.Create(...)` etc. resolve unambiguously.
using DomainStaff = ApartmentManagement.Domain.Entities.Staff;

namespace ApartmentManagement.Application.Commands.Staff
{

// ─── Shift ────────────────────────────────────────────────────────────────────

public record CreateShiftCommand(string SocietyId, string Name, TimeSpan StartTime, TimeSpan EndTime, int GraceMinutes)
    : IRequest<Result<ShiftResponse>>;

public sealed class CreateShiftCommandHandler(IShiftRepository shiftRepository, ILogger<CreateShiftCommandHandler> logger)
    : IRequestHandler<CreateShiftCommand, Result<ShiftResponse>>
{
    public async Task<Result<ShiftResponse>> Handle(CreateShiftCommand request, CancellationToken ct)
    {
        try
        {
            var shift = Shift.Create(request.SocietyId, request.Name, request.StartTime, request.EndTime, request.GraceMinutes);
            var created = await shiftRepository.CreateAsync(shift, ct);
            return Result<ShiftResponse>.Success(created.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create shift {Name}", request.Name);
            return Result<ShiftResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record UpdateShiftCommand(string SocietyId, string ShiftId, string Name, TimeSpan StartTime, TimeSpan EndTime, int GraceMinutes)
    : IRequest<Result<ShiftResponse>>;

public sealed class UpdateShiftCommandHandler(IShiftRepository shiftRepository, ILogger<UpdateShiftCommandHandler> logger)
    : IRequestHandler<UpdateShiftCommand, Result<ShiftResponse>>
{
    public async Task<Result<ShiftResponse>> Handle(UpdateShiftCommand request, CancellationToken ct)
    {
        try
        {
            var shift = await shiftRepository.GetByIdAsync(request.ShiftId, request.SocietyId, ct)
                ?? throw new NotFoundException("Shift", request.ShiftId);

            shift.Update(request.Name, request.StartTime, request.EndTime, request.GraceMinutes);
            var updated = await shiftRepository.UpdateAsync(shift, ct);
            return Result<ShiftResponse>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<ShiftResponse>.Failure(ErrorCodes.ShiftNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update shift {ShiftId}", request.ShiftId);
            return Result<ShiftResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record DeleteShiftCommand(string SocietyId, string ShiftId) : IRequest<Result<bool>>;

public sealed class DeleteShiftCommandHandler(
    IShiftRepository shiftRepository,
    IStaffRepository staffRepository,
    ILogger<DeleteShiftCommandHandler> logger)
    : IRequestHandler<DeleteShiftCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DeleteShiftCommand request, CancellationToken ct)
    {
        try
        {
            var shift = await shiftRepository.GetByIdAsync(request.ShiftId, request.SocietyId, ct)
                ?? throw new NotFoundException("Shift", request.ShiftId);

            var staff = await staffRepository.GetAllAsync(request.SocietyId, ct);
            if (staff.Any(s => s.IsActive && string.Equals(s.ShiftId, request.ShiftId, StringComparison.OrdinalIgnoreCase)))
                return Result<bool>.Failure(ErrorCodes.ShiftInUse, "This shift is still assigned to one or more active staff members.");

            await shiftRepository.DeleteAsync(shift.Id, request.SocietyId, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ShiftNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete shift {ShiftId}", request.ShiftId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Staff ────────────────────────────────────────────────────────────────────

public record CreateStaffCommand(
    string SocietyId, string FullName, string Phone, StaffCategory Category, StaffEmploymentType EmploymentType,
    string? PhotoUrl, string? VendorId, string? ShiftId) : IRequest<Result<StaffResponse>>;

public sealed class CreateStaffCommandHandler(
    IStaffRepository staffRepository,
    IShiftRepository shiftRepository,
    ILogger<CreateStaffCommandHandler> logger)
    : IRequestHandler<CreateStaffCommand, Result<StaffResponse>>
{
    public async Task<Result<StaffResponse>> Handle(CreateStaffCommand request, CancellationToken ct)
    {
        try
        {
            string? shiftName = null;
            if (!string.IsNullOrWhiteSpace(request.ShiftId))
            {
                var shift = await shiftRepository.GetByIdAsync(request.ShiftId, request.SocietyId, ct);
                if (shift is null)
                    return Result<StaffResponse>.Failure(ErrorCodes.ShiftNotFound, "Shift not found.");
                shiftName = shift.Name;
            }

            var staff = DomainStaff.Create(
                request.SocietyId, request.FullName, request.Phone, request.Category, request.EmploymentType,
                request.PhotoUrl, request.VendorId, request.ShiftId, shiftName);

            var created = await staffRepository.CreateAsync(staff, ct);
            return Result<StaffResponse>.Success(created.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create staff member {Name}", request.FullName);
            return Result<StaffResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record UpdateStaffCommand(string SocietyId, string StaffId, string FullName, string Phone, string? PhotoUrl, string? ShiftId)
    : IRequest<Result<StaffResponse>>;

public sealed class UpdateStaffCommandHandler(
    IStaffRepository staffRepository,
    IShiftRepository shiftRepository,
    ILogger<UpdateStaffCommandHandler> logger)
    : IRequestHandler<UpdateStaffCommand, Result<StaffResponse>>
{
    public async Task<Result<StaffResponse>> Handle(UpdateStaffCommand request, CancellationToken ct)
    {
        try
        {
            var staff = await staffRepository.GetByIdAsync(request.StaffId, request.SocietyId, ct)
                ?? throw new NotFoundException("Staff", request.StaffId);

            staff.UpdateDetails(request.FullName, request.Phone, request.PhotoUrl);

            if (!string.IsNullOrWhiteSpace(request.ShiftId) &&
                !string.Equals(request.ShiftId, staff.ShiftId, StringComparison.OrdinalIgnoreCase))
            {
                var shift = await shiftRepository.GetByIdAsync(request.ShiftId, request.SocietyId, ct);
                if (shift is null)
                    return Result<StaffResponse>.Failure(ErrorCodes.ShiftNotFound, "Shift not found.");
                staff.AssignShift(shift.Id, shift.Name, DateTime.UtcNow);
            }

            await staffRepository.UpdateAsync(staff, ct);
            return Result<StaffResponse>.Success(staff.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<StaffResponse>.Failure(ErrorCodes.StaffNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update staff member {StaffId}", request.StaffId);
            return Result<StaffResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record DeactivateStaffCommand(string SocietyId, string StaffId) : IRequest<Result<bool>>;

public sealed class DeactivateStaffCommandHandler(IStaffRepository staffRepository, ILogger<DeactivateStaffCommandHandler> logger)
    : IRequestHandler<DeactivateStaffCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DeactivateStaffCommand request, CancellationToken ct)
    {
        try
        {
            var staff = await staffRepository.GetByIdAsync(request.StaffId, request.SocietyId, ct)
                ?? throw new NotFoundException("Staff", request.StaffId);

            staff.Deactivate();
            await staffRepository.UpdateAsync(staff, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.StaffNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to deactivate staff member {StaffId}", request.StaffId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record ReactivateStaffCommand(string SocietyId, string StaffId) : IRequest<Result<bool>>;

public sealed class ReactivateStaffCommandHandler(IStaffRepository staffRepository, ILogger<ReactivateStaffCommandHandler> logger)
    : IRequestHandler<ReactivateStaffCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ReactivateStaffCommand request, CancellationToken ct)
    {
        try
        {
            var staff = await staffRepository.GetByIdAsync(request.StaffId, request.SocietyId, ct)
                ?? throw new NotFoundException("Staff", request.StaffId);

            staff.Reactivate();
            await staffRepository.UpdateAsync(staff, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.StaffNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to reactivate staff member {StaffId}", request.StaffId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record DeleteStaffCommand(string SocietyId, string StaffId) : IRequest<Result<bool>>;

public sealed class DeleteStaffCommandHandler(IStaffRepository staffRepository, ILogger<DeleteStaffCommandHandler> logger)
    : IRequestHandler<DeleteStaffCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DeleteStaffCommand request, CancellationToken ct)
    {
        try
        {
            var staff = await staffRepository.GetByIdAsync(request.StaffId, request.SocietyId, ct)
                ?? throw new NotFoundException("Staff", request.StaffId);

            await staffRepository.DeleteAsync(staff.Id, request.SocietyId, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.StaffNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete staff member {StaffId}", request.StaffId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Attendance ───────────────────────────────────────────────────────────────

public record CheckInStaffCommand(string SocietyId, string StaffId) : IRequest<Result<StaffAttendanceResponse>>;

public sealed class CheckInStaffCommandHandler(
    IStaffRepository staffRepository,
    IShiftRepository shiftRepository,
    IStaffAttendanceRepository attendanceRepository,
    ILogger<CheckInStaffCommandHandler> logger)
    : IRequestHandler<CheckInStaffCommand, Result<StaffAttendanceResponse>>
{
    public async Task<Result<StaffAttendanceResponse>> Handle(CheckInStaffCommand request, CancellationToken ct)
    {
        try
        {
            var staff = await staffRepository.GetByIdAsync(request.StaffId, request.SocietyId, ct)
                ?? throw new NotFoundException("Staff", request.StaffId);

            if (!staff.IsActive)
                return Result<StaffAttendanceResponse>.Failure(ErrorCodes.StaffInactive, "This staff member is deactivated.");

            var open = await attendanceRepository.GetOpenAttendanceAsync(request.SocietyId, request.StaffId, ct);
            if (open is not null)
                return Result<StaffAttendanceResponse>.Failure(ErrorCodes.StaffAlreadyCheckedIn, "Staff member is already checked in.");

            var now = DateTime.UtcNow;
            var isLate = await IsLateAsync(staff, now, ct);

            var attendance = StaffAttendance.CheckIn(request.SocietyId, staff.Id, staff.FullName, staff.ShiftId, now, isLate);
            var created = await attendanceRepository.CreateAsync(attendance, ct);
            return Result<StaffAttendanceResponse>.Success(created.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<StaffAttendanceResponse>.Failure(ErrorCodes.StaffNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to check in staff member {StaffId}", request.StaffId);
            return Result<StaffAttendanceResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }

    private async Task<bool> IsLateAsync(DomainStaff staff, DateTime nowUtc, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(staff.ShiftId))
            return false;

        var shift = await shiftRepository.GetByIdAsync(staff.ShiftId, staff.SocietyId, ct);
        if (shift is null)
            return false;

        var graceDeadline = shift.StartTime.Add(TimeSpan.FromMinutes(shift.GraceMinutes));
        return nowUtc.TimeOfDay > graceDeadline;
    }
}

public record CheckOutStaffCommand(string SocietyId, string StaffId) : IRequest<Result<StaffAttendanceResponse>>;

public sealed class CheckOutStaffCommandHandler(
    IStaffAttendanceRepository attendanceRepository,
    ILogger<CheckOutStaffCommandHandler> logger)
    : IRequestHandler<CheckOutStaffCommand, Result<StaffAttendanceResponse>>
{
    public async Task<Result<StaffAttendanceResponse>> Handle(CheckOutStaffCommand request, CancellationToken ct)
    {
        try
        {
            var open = await attendanceRepository.GetOpenAttendanceAsync(request.SocietyId, request.StaffId, ct);
            if (open is null)
                return Result<StaffAttendanceResponse>.Failure(ErrorCodes.StaffNotCheckedIn, "Staff member is not currently checked in.");

            open.CheckOut(DateTime.UtcNow);
            await attendanceRepository.UpdateAsync(open, ct);
            return Result<StaffAttendanceResponse>.Success(open.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to check out staff member {StaffId}", request.StaffId);
            return Result<StaffAttendanceResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Timer-driven commands (society-agnostic — see TimerFunctions) ───────────

public record MarkAbsentStaffCommand : IRequest<Result<int>>;

public sealed class MarkAbsentStaffCommandHandler(
    IStaffRepository staffRepository,
    IStaffAttendanceRepository attendanceRepository,
    ILogger<MarkAbsentStaffCommandHandler> logger)
    : IRequestHandler<MarkAbsentStaffCommand, Result<int>>
{
    public async Task<Result<int>> Handle(MarkAbsentStaffCommand request, CancellationToken ct)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var staffWithShifts = await staffRepository.GetActiveWithShiftsAcrossSocietiesAsync(ct);

            var marked = 0;
            foreach (var staff in staffWithShifts)
            {
                var hasRecord = await attendanceRepository.HasRecordForDateAsync(staff.SocietyId, staff.Id, today, ct);
                if (hasRecord)
                    continue;

                var absence = StaffAttendance.CreateAbsent(staff.SocietyId, staff.Id, staff.FullName, staff.ShiftId, today);
                await attendanceRepository.CreateAsync(absence, ct);
                marked++;
            }

            return Result<int>.Success(marked);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to mark absent staff for {Date}", DateTime.UtcNow.Date);
            return Result<int>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record NotifyMissingStaffCheckInsCommand : IRequest<Result<int>>;

public sealed class NotifyMissingStaffCheckInsCommandHandler(
    IStaffRepository staffRepository,
    IShiftRepository shiftRepository,
    IStaffAttendanceRepository attendanceRepository,
    IUserRepository userRepository,
    INotificationService notificationService,
    ILogger<NotifyMissingStaffCheckInsCommandHandler> logger)
    : IRequestHandler<NotifyMissingStaffCheckInsCommand, Result<int>>
{
    /// <summary>The timer runs every 15 minutes — notify only in the 15-minute window right after the
    /// grace deadline passes, so admins aren't re-notified for the same no-show throughout the day.</summary>
    private static readonly TimeSpan NotificationWindow = TimeSpan.FromMinutes(15);

    public async Task<Result<int>> Handle(NotifyMissingStaffCheckInsCommand request, CancellationToken ct)
    {
        try
        {
            var now = DateTime.UtcNow;
            var staffWithShifts = await staffRepository.GetActiveWithShiftsAcrossSocietiesAsync(ct);

            var notified = 0;
            foreach (var staff in staffWithShifts)
            {
                var shift = await shiftRepository.GetByIdAsync(staff.ShiftId!, staff.SocietyId, ct);
                if (shift is null)
                    continue;

                var graceDeadline = shift.StartTime.Add(TimeSpan.FromMinutes(shift.GraceMinutes));
                var withinNotificationWindow = now.TimeOfDay >= graceDeadline && now.TimeOfDay < graceDeadline.Add(NotificationWindow);
                if (!withinNotificationWindow)
                    continue;

                var hasRecordToday = await attendanceRepository.HasRecordForDateAsync(staff.SocietyId, staff.Id, now.Date, ct);
                if (hasRecordToday)
                    continue;

                var admins = await userRepository.GetByRoleAsync(staff.SocietyId, UserRole.SUAdmin, 1, 50, ct);
                var title = "Staff Missing Check-In";
                var body = $"{staff.FullName} ({staff.Category}) has not checked in for the {shift.Name} shift.";
                await Task.WhenAll(admins.Select(admin =>
                    notificationService.SendPushNotificationAsync(admin.Id, title, body, ct)));
                notified++;
            }

            return Result<int>.Success(notified);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to notify missing staff check-ins.");
            return Result<int>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

}

namespace ApartmentManagement.Application.Queries.Staff
{

public record GetStaffQuery(string SocietyId, string StaffId) : IRequest<Result<StaffResponse>>;

public sealed class GetStaffQueryHandler(IStaffRepository staffRepository)
    : IRequestHandler<GetStaffQuery, Result<StaffResponse>>
{
    public async Task<Result<StaffResponse>> Handle(GetStaffQuery request, CancellationToken ct)
    {
        try
        {
            var staff = await staffRepository.GetByIdAsync(request.StaffId, request.SocietyId, ct)
                ?? throw new NotFoundException("Staff", request.StaffId);
            return Result<StaffResponse>.Success(staff.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<StaffResponse>.Failure(ErrorCodes.StaffNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<StaffResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetStaffListQuery(string SocietyId, string? Category, bool? ActiveOnly, PaginationParams Pagination)
    : IRequest<Result<PagedResult<StaffResponse>>>;

public sealed class GetStaffListQueryHandler(IStaffRepository staffRepository)
    : IRequestHandler<GetStaffListQuery, Result<PagedResult<StaffResponse>>>
{
    public async Task<Result<PagedResult<StaffResponse>>> Handle(GetStaffListQuery request, CancellationToken ct)
    {
        try
        {
            IEnumerable<DomainStaff> all = await staffRepository.GetAllAsync(request.SocietyId, ct);

            if (request.ActiveOnly == true)
                all = all.Where(s => s.IsActive);

            if (!string.IsNullOrWhiteSpace(request.Category) &&
                Enum.TryParse<StaffCategory>(request.Category, true, out var category))
                all = all.Where(s => s.Category == category);

            var ordered = all.OrderBy(s => s.FullName, StringComparer.OrdinalIgnoreCase).ToList();

            var page = request.Pagination.Page < 1 ? 1 : request.Pagination.Page;
            var pageSize = request.Pagination.PageSize < 1 ? 20 : request.Pagination.PageSize;
            var pagedItems = ordered.Skip((page - 1) * pageSize).Take(pageSize).Select(s => s.ToResponse()).ToList();

            return Result<PagedResult<StaffResponse>>.Success(
                new PagedResult<StaffResponse>(pagedItems, ordered.Count, page, pageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<StaffResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetShiftsQuery(string SocietyId) : IRequest<Result<IReadOnlyList<ShiftResponse>>>;

public sealed class GetShiftsQueryHandler(IShiftRepository shiftRepository)
    : IRequestHandler<GetShiftsQuery, Result<IReadOnlyList<ShiftResponse>>>
{
    public async Task<Result<IReadOnlyList<ShiftResponse>>> Handle(GetShiftsQuery request, CancellationToken ct)
    {
        try
        {
            var shifts = await shiftRepository.GetAllAsync(request.SocietyId, ct);
            var items = shifts.OrderBy(s => s.StartTime).Select(s => s.ToResponse()).ToList();
            return Result<IReadOnlyList<ShiftResponse>>.Success(items);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<ShiftResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetOnDutyStaffQuery(string SocietyId) : IRequest<Result<IReadOnlyList<StaffAttendanceResponse>>>;

public sealed class GetOnDutyStaffQueryHandler(IStaffAttendanceRepository attendanceRepository)
    : IRequestHandler<GetOnDutyStaffQuery, Result<IReadOnlyList<StaffAttendanceResponse>>>
{
    public async Task<Result<IReadOnlyList<StaffAttendanceResponse>>> Handle(GetOnDutyStaffQuery request, CancellationToken ct)
    {
        try
        {
            var onDuty = await attendanceRepository.GetOnDutyAsync(request.SocietyId, ct);
            var items = onDuty.OrderBy(a => a.StaffName, StringComparer.OrdinalIgnoreCase).Select(a => a.ToResponse()).ToList();
            return Result<IReadOnlyList<StaffAttendanceResponse>>.Success(items);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<StaffAttendanceResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetStaffAttendanceHistoryQuery(
    string SocietyId, string StaffId, DateOnly? FromDate, DateOnly? ToDate, PaginationParams Pagination)
    : IRequest<Result<PagedResult<StaffAttendanceResponse>>>;

public sealed class GetStaffAttendanceHistoryQueryHandler(IStaffAttendanceRepository attendanceRepository)
    : IRequestHandler<GetStaffAttendanceHistoryQuery, Result<PagedResult<StaffAttendanceResponse>>>
{
    public async Task<Result<PagedResult<StaffAttendanceResponse>>> Handle(GetStaffAttendanceHistoryQuery request, CancellationToken ct)
    {
        try
        {
            var fromUtc = (request.FromDate ?? DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-30)).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var toUtc = (request.ToDate ?? DateOnly.FromDateTime(DateTime.UtcNow)).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

            var records = await attendanceRepository.GetByStaffAsync(request.SocietyId, request.StaffId, fromUtc, toUtc, ct);
            var ordered = records.OrderByDescending(r => r.AttendanceDate).ToList();

            var page = request.Pagination.Page < 1 ? 1 : request.Pagination.Page;
            var pageSize = request.Pagination.PageSize < 1 ? 20 : request.Pagination.PageSize;
            var pagedItems = ordered.Skip((page - 1) * pageSize).Take(pageSize).Select(r => r.ToResponse()).ToList();

            return Result<PagedResult<StaffAttendanceResponse>>.Success(
                new PagedResult<StaffAttendanceResponse>(pagedItems, ordered.Count, page, pageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<StaffAttendanceResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetStaffAttendanceReportQuery(string SocietyId, string? Category, DateOnly FromDate, DateOnly ToDate)
    : IRequest<Result<StaffAttendanceReportResponse>>;

public sealed class GetStaffAttendanceReportQueryHandler(
    IStaffRepository staffRepository,
    IStaffAttendanceRepository attendanceRepository)
    : IRequestHandler<GetStaffAttendanceReportQuery, Result<StaffAttendanceReportResponse>>
{
    public async Task<Result<StaffAttendanceReportResponse>> Handle(GetStaffAttendanceReportQuery request, CancellationToken ct)
    {
        try
        {
            IEnumerable<DomainStaff> staffList = await staffRepository.GetAllAsync(request.SocietyId, ct);
            if (!string.IsNullOrWhiteSpace(request.Category) &&
                Enum.TryParse<StaffCategory>(request.Category, true, out var category))
                staffList = staffList.Where(s => s.Category == category);

            var fromUtc = request.FromDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var toUtc = request.ToDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var records = await attendanceRepository.GetBySocietyAndDateRangeAsync(request.SocietyId, fromUtc, toUtc, ct);
            var byStaff = records.GroupBy(r => r.StaffId).ToDictionary(g => g.Key, g => g.ToList());

            var entries = new List<StaffAttendanceReportEntry>();
            foreach (var staff in staffList.OrderBy(s => s.FullName, StringComparer.OrdinalIgnoreCase))
            {
                var staffRecords = byStaff.TryGetValue(staff.Id, out var list) ? list : [];

                var presentDays = staffRecords.Where(r => r.CheckInTime.HasValue)
                    .Select(r => r.AttendanceDate).Distinct().Count();
                var lateDays = staffRecords.Where(r => r.IsLate)
                    .Select(r => r.AttendanceDate).Distinct().Count();
                var absentDays = staffRecords.Count(r => r.Status == StaffAttendanceStatus.Absent);
                var onLeaveDays = staffRecords.Count(r => r.Status == StaffAttendanceStatus.OnLeave);

                entries.Add(new StaffAttendanceReportEntry(
                    staff.Id, staff.FullName, staff.Category.ToString(), presentDays, absentDays, lateDays, onLeaveDays));
            }

            return Result<StaffAttendanceReportResponse>.Success(
                new StaffAttendanceReportResponse(fromUtc, toUtc, entries));
        }
        catch (Exception ex)
        {
            return Result<StaffAttendanceReportResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

}
