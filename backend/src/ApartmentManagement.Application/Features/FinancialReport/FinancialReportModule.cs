using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Application.Queries.FinancialReport;

// ─── Queries ──────────────────────────────────────────────────────────────────

public record GetFinancialDashboardQuery(string SocietyId)
    : IRequest<Result<FinancialDashboardDto>>;

public record GetCashFlowQuery(string SocietyId, int FromMonth, int FromYear, int ToMonth, int ToYear)
    : IRequest<Result<CashFlowDto>>;

public record GetApartmentLedgerQuery(string SocietyId, string ApartmentId, int? FromYear, int? ToYear)
    : IRequest<Result<ApartmentLedgerDto>>;

public record GetSocietyLedgerQuery(string SocietyId, DateTime? From = null, DateTime? To = null)
    : IRequest<Result<SocietyLedgerDto>>;

public record GetSocietySummaryQuery(string SocietyId)
    : IRequest<Result<SocietySummaryDto>>;

public record GetPersonalStatementQuery(string SocietyId, string ApartmentId, int? Year)
    : IRequest<Result<PersonalStatementDto>>;

// ─── Shared helpers ───────────────────────────────────────────────────────────

file static class MonthHelper
{
    private static readonly string[] Names =
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    internal static string Label(int month, int year) => $"{Names[month - 1]} {year}";

    internal static bool InRange(int year, int month, int fromYear, int fromMonth, int toYear, int toMonth)
    {
        var v = year * 12 + month;
        return v >= fromYear * 12 + fromMonth && v <= toYear * 12 + toMonth;
    }

    internal static int CurrentFyStart(DateTime now) => now.Month >= 4 ? now.Year : now.Year - 1;
}

file static class LedgerHelper
{
    /// <summary>Raw (unbalanced) ledger transaction — a debit or a credit at a point in time.</summary>
    internal readonly record struct RawEntry(DateTime Date, string Description, string Type, decimal? Debit, decimal? Credit);

    /// <summary>
    /// Builds the debit (charge raised) and credit (payment received) transactions for a single
    /// maintenance charge. Shared by both the per-apartment ledger and the society-wide ledger so the
    /// debit/credit-formatting logic only lives in one place.
    /// </summary>
    internal static IEnumerable<RawEntry> MaintenanceChargeEntries(Domain.Entities.MaintenanceCharge charge, string? apartmentLabel = null)
    {
        var suffix = apartmentLabel is null ? string.Empty : $"{apartmentLabel} — ";
        var period = MonthHelper.Label(charge.ChargeMonth, charge.ChargeYear);

        yield return new RawEntry(
            charge.DueDate, $"Maintenance — {suffix}{period}", "Charge", charge.Amount, null);

        if (charge.Status == PaymentStatus.Paid && charge.PaidAt.HasValue)
        {
            yield return new RawEntry(
                charge.PaidAt.Value, $"Payment received — {suffix}{period}", "Payment", null, charge.Amount);
        }
    }

    /// <summary>Builds the debit (bill raised) and credit (payment made) transactions for a vendor charge.</summary>
    internal static IEnumerable<RawEntry> VendorChargeEntries(Domain.Entities.VendorCharge charge)
    {
        var period = MonthHelper.Label(charge.ChargeMonth, charge.ChargeYear);

        yield return new RawEntry(
            charge.DueDate, $"Vendor Bill — {charge.VendorName} — {period}", "VendorBill", charge.Amount, null);

        if (charge.Status == PaymentStatus.Paid && charge.PaidAt.HasValue)
        {
            yield return new RawEntry(
                charge.PaidAt.Value, $"Vendor payment — {charge.VendorName} — {period}", "VendorPayment", null, charge.Amount);
        }
    }

    /// <summary>Sorts raw transactions chronologically and accumulates a running balance (debit adds, credit subtracts).</summary>
    internal static List<LedgerEntryDto> ToLedgerEntries(IEnumerable<RawEntry> rawEntries)
    {
        var entries = new List<LedgerEntryDto>();
        decimal balance = 0;

        foreach (var raw in rawEntries.OrderBy(e => e.Date))
        {
            balance += (raw.Debit ?? 0) - (raw.Credit ?? 0);
            entries.Add(new LedgerEntryDto(raw.Date, raw.Description, raw.Type, raw.Debit, raw.Credit, balance));
        }

        return entries;
    }
}

// ─── GetFinancialDashboard ────────────────────────────────────────────────────

public sealed class GetFinancialDashboardQueryHandler(
    IMaintenanceChargeRepository maintenanceChargeRepo,
    IVendorChargeRepository vendorChargeRepo,
    IApartmentRepository apartmentRepo,
    ISocietyRepository societyRepo,
    ICurrentUserService currentUser,
    ILogger<GetFinancialDashboardQueryHandler> logger)
    : IRequestHandler<GetFinancialDashboardQuery, Result<FinancialDashboardDto>>
{
    /// <summary>Shared "next N days" window used for both upcoming vendor dues (outflow) and upcoming charges (inflow).</summary>
    private const int UpcomingWindowDays = 7;

    public async Task<Result<FinancialDashboardDto>> Handle(
        GetFinancialDashboardQuery request, CancellationToken ct)
    {
        try
        {
            if (!currentUser.IsInRoles("SUAdmin", "HQAdmin", "HQUser"))
                return Result<FinancialDashboardDto>.Failure(ErrorCodes.Forbidden,
                    "Only society admins may access the financial dashboard.");

            var society = await societyRepo.GetByIdAsync(request.SocietyId, request.SocietyId, ct);
            if (society is null)
                return Result<FinancialDashboardDto>.Failure(ErrorCodes.SocietyNotFound, "Society not found.");

            var now = DateTime.UtcNow;
            var month = now.Month;
            var year = now.Year;

            var mainCharges = await maintenanceChargeRepo.GetBySocietyAsync(
                request.SocietyId, 1, 10_000, null, null, year, month, ct);

            var vendorCharges = (await vendorChargeRepo.GetBySocietyAsync(
                request.SocietyId, 1, 10_000, null, null, year, month, ct))
                .Where(c => !c.IsDeleted)
                .ToList();

            var active = mainCharges.Where(c => c.Status != PaymentStatus.Cancelled).ToList();
            var mainBilled      = active.Sum(c => c.Amount);
            var mainCollected   = active.Where(c => c.Status == PaymentStatus.Paid).Sum(c => c.Amount);
            var mainPending     = active.Where(c => c.Status is PaymentStatus.Pending or PaymentStatus.ProofSubmitted).Sum(c => c.Amount);
            // "Overdue" is never a persisted status (see MappingExtensions.IsOverdue) — it must be
            // computed from the due date and the society's grace period, not compared against the enum.
            var mainOverdue     = active.Where(c => c.IsOverdue(society.MaintenanceOverdueThresholdDays)).Sum(c => c.Amount);

            var billed  = active.Count;
            var paid    = active.Count(c => c.Status == PaymentStatus.Paid);
            var efficiency = billed > 0 ? (int)Math.Round((double)paid / billed * 100) : 0;

            var activeVendor = vendorCharges.Where(c => c.IsActive).ToList();
            var vendorBilled      = activeVendor.Sum(c => c.Amount);
            var vendorPaid        = activeVendor.Where(c => c.Status == PaymentStatus.Paid).Sum(c => c.Amount);
            var vendorOutstanding = activeVendor.Where(c => c.Status != PaymentStatus.Paid).Sum(c => c.Amount);

            // Top 5 overdue apartments
            var overdueGroups = mainCharges
                .Where(c => c.IsOverdue(society.MaintenanceOverdueThresholdDays))
                .GroupBy(c => c.ApartmentId)
                .Select(g => (AptId: g.Key, Amount: g.Sum(c => c.Amount),
                              OldestDue: g.Min(c => c.DueDate)))
                .OrderByDescending(x => x.Amount)
                .Take(5)
                .ToList();

            var topOverdue = new List<OverdueApartmentDto>(overdueGroups.Count);
            foreach (var (aptId, amount, oldestDue) in overdueGroups)
            {
                var apt = await apartmentRepo.GetByIdAsync(aptId, request.SocietyId, ct);
                topOverdue.Add(new OverdueApartmentDto(
                    aptId,
                    apt?.ToDisplayLabel() ?? aptId,
                    amount,
                    (int)(now.Date - oldestDue.Date).TotalDays));
            }

            // Upcoming vendor dues — next N days (Pending charges across all months)
            var nextWindow = now.Date.AddDays(UpcomingWindowDays);
            var upcomingVendorDues = vendorCharges
                .Where(c => c.IsActive && c.Status != PaymentStatus.Paid
                         && c.DueDate.Date >= now.Date && c.DueDate.Date <= nextWindow)
                .OrderBy(c => c.DueDate)
                .Take(5)
                .Select(c => new UpcomingVendorDueDto(
                    c.VendorId, c.VendorName, c.Amount, c.DueDate,
                    (int)(c.DueDate.Date - now.Date).TotalDays))
                .ToList();

            // Upcoming charges (resident dues) — next N days across all months. Uses the due-date-range
            // repository query (rather than the current-month-scoped `mainCharges` above) so charges due
            // in the next few days are found even when they fall just past a calendar-month boundary.
            var upcomingChargeEntities = (await maintenanceChargeRepo.GetByDueDateRangeAsync(
                request.SocietyId, now.Date, nextWindow, ct))
                // A charge due in this future window can't already be overdue, so only Pending applies here.
                .Where(c => c.Status is PaymentStatus.Pending)
                .OrderBy(c => c.DueDate)
                .ToList();

            var upcomingCharges = new List<UpcomingChargeDto>(upcomingChargeEntities.Count);
            foreach (var charge in upcomingChargeEntities)
            {
                var apt = await apartmentRepo.GetByIdAsync(charge.ApartmentId, request.SocietyId, ct);
                upcomingCharges.Add(new UpcomingChargeDto(
                    charge.ApartmentId,
                    apt?.ToDisplayLabel() ?? charge.ApartmentId,
                    charge.Amount,
                    charge.DueDate,
                    (int)(charge.DueDate.Date - now.Date).TotalDays));
            }

            var upcomingCashInflow  = upcomingCharges.Sum(c => c.Amount);
            var upcomingCashOutflow = vendorCharges
                .Where(c => c.IsActive && c.Status != PaymentStatus.Paid
                         && c.DueDate.Date >= now.Date && c.DueDate.Date <= nextWindow)
                .Sum(c => c.Amount);

            return Result<FinancialDashboardDto>.Success(new FinancialDashboardDto(
                month, year, MonthHelper.Label(month, year),
                mainBilled, mainCollected, mainPending, mainOverdue, efficiency,
                vendorBilled, vendorPaid, vendorOutstanding,
                mainCollected - vendorPaid,
                topOverdue,
                upcomingVendorDues,
                upcomingCharges,
                upcomingCashInflow,
                upcomingCashOutflow));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetFinancialDashboard failed for society {SocietyId}", request.SocietyId);
            return Result<FinancialDashboardDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── GetCashFlow ──────────────────────────────────────────────────────────────

public sealed class GetCashFlowQueryHandler(
    IMaintenanceChargeRepository maintenanceChargeRepo,
    IVendorChargeRepository vendorChargeRepo,
    ICurrentUserService currentUser,
    ILogger<GetCashFlowQueryHandler> logger)
    : IRequestHandler<GetCashFlowQuery, Result<CashFlowDto>>
{
    public async Task<Result<CashFlowDto>> Handle(GetCashFlowQuery request, CancellationToken ct)
    {
        try
        {
            if (!currentUser.IsInRoles("SUAdmin", "HQAdmin", "HQUser"))
                return Result<CashFlowDto>.Failure(ErrorCodes.Forbidden,
                    "Only society admins may access the cash flow report.");

            // Maintenance charges in the date range (by DueDate)
            var fromDate = new DateTime(request.FromYear, request.FromMonth, 1, 0, 0, 0, DateTimeKind.Utc);
            var toDate   = new DateTime(request.ToYear,   request.ToMonth,
                DateTime.DaysInMonth(request.ToYear, request.ToMonth), 23, 59, 59, DateTimeKind.Utc);

            var mainCharges = (await maintenanceChargeRepo.GetByDueDateRangeAsync(
                request.SocietyId, fromDate, toDate, ct))
                .Where(c => c.Status != PaymentStatus.Cancelled)
                .ToList();

            // Vendor charges for each calendar year that overlaps the range
            var vendorCharges = new List<Domain.Entities.VendorCharge>();
            for (int y = request.FromYear; y <= request.ToYear; y++)
            {
                var yearly = await vendorChargeRepo.GetByYearAsync(request.SocietyId, y, ct);
                vendorCharges.AddRange(yearly.Where(c => !c.IsDeleted && c.IsActive));
            }
            // Filter to the requested month range
            var filteredVendor = vendorCharges
                .Where(c => MonthHelper.InRange(c.ChargeYear, c.ChargeMonth,
                    request.FromYear, request.FromMonth, request.ToYear, request.ToMonth))
                .ToList();

            // Build month list in chronological order
            var months = new List<CashFlowMonthDto>();
            var cursor = new DateTime(request.FromYear, request.FromMonth, 1, 0, 0, 0, DateTimeKind.Utc);
            var end    = new DateTime(request.ToYear,   request.ToMonth,   1, 0, 0, 0, DateTimeKind.Utc);

            while (cursor <= end)
            {
                var y = cursor.Year;
                var m = cursor.Month;

                var mMain = mainCharges.Where(c => c.ChargeYear == y && c.ChargeMonth == m).ToList();
                var mVend = filteredVendor.Where(c => c.ChargeYear == y && c.ChargeMonth == m).ToList();

                var mainCollected = mMain.Where(c => c.Status == PaymentStatus.Paid).Sum(c => c.Amount);
                var vendorPaid    = mVend.Where(c => c.Status == PaymentStatus.Paid).Sum(c => c.Amount);

                months.Add(new CashFlowMonthDto(
                    y, m, MonthHelper.Label(m, y),
                    mainCollected,
                    mainCollected,
                    vendorPaid,
                    vendorPaid,
                    mainCollected - vendorPaid));

                cursor = cursor.AddMonths(1);
            }

            var totalIn  = months.Sum(m => m.TotalCashIn);
            var totalOut = months.Sum(m => m.TotalCashOut);

            return Result<CashFlowDto>.Success(new CashFlowDto(
                request.FromMonth, request.FromYear,
                request.ToMonth,   request.ToYear,
                months, totalIn, totalOut, totalIn - totalOut));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetCashFlow failed for society {SocietyId}", request.SocietyId);
            return Result<CashFlowDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── GetApartmentLedger ───────────────────────────────────────────────────────

public sealed class GetApartmentLedgerQueryHandler(
    IMaintenanceChargeRepository maintenanceChargeRepo,
    IApartmentRepository apartmentRepo,
    ICurrentUserService currentUser,
    ILogger<GetApartmentLedgerQueryHandler> logger)
    : IRequestHandler<GetApartmentLedgerQuery, Result<ApartmentLedgerDto>>
{
    public async Task<Result<ApartmentLedgerDto>> Handle(
        GetApartmentLedgerQuery request, CancellationToken ct)
    {
        try
        {
            var isSelf = currentUser.IsInRole("SUUser")
                      && currentUser.ApartmentId == request.ApartmentId;

            if (!currentUser.IsInRoles("SUAdmin", "HQAdmin") && !isSelf)
                return Result<ApartmentLedgerDto>.Failure(ErrorCodes.Forbidden,
                    "Residents may only view their own apartment ledger.");

            var apt = await apartmentRepo.GetByIdAsync(request.ApartmentId, request.SocietyId, ct);
            var aptLabel = apt?.ToDisplayLabel() ?? request.ApartmentId;

            // Load charges (use a generous page size)
            var charges = await maintenanceChargeRepo.GetByApartmentAsync(
                request.SocietyId, request.ApartmentId, 1, 10_000,
                null, null, ct);

            // Apply optional year filter
            if (request.FromYear.HasValue)
                charges = charges.Where(c => c.ChargeYear >= request.FromYear.Value).ToList();
            if (request.ToYear.HasValue)
                charges = charges.Where(c => c.ChargeYear <= request.ToYear.Value).ToList();

            // Build ledger entries: one debit per charge, one credit for paid charges — sorted chronologically
            var rawEntries = charges.SelectMany(c => LedgerHelper.MaintenanceChargeEntries(c));
            var entries = LedgerHelper.ToLedgerEntries(rawEntries);
            var balance = entries.Count > 0 ? entries[^1].Balance : 0;

            return Result<ApartmentLedgerDto>.Success(new ApartmentLedgerDto(
                request.ApartmentId,
                aptLabel,
                null,
                balance,
                entries));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetApartmentLedger failed for apartment {ApartmentId}", request.ApartmentId);
            return Result<ApartmentLedgerDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── GetSocietyLedger (overall society view, all apartments + vendor charges) ─

public sealed class GetSocietyLedgerQueryHandler(
    IMaintenanceChargeRepository maintenanceChargeRepo,
    IVendorChargeRepository vendorChargeRepo,
    IApartmentRepository apartmentRepo,
    ICurrentUserService currentUser,
    ILogger<GetSocietyLedgerQueryHandler> logger)
    : IRequestHandler<GetSocietyLedgerQuery, Result<SocietyLedgerDto>>
{
    public async Task<Result<SocietyLedgerDto>> Handle(
        GetSocietyLedgerQuery request, CancellationToken ct)
    {
        try
        {
            if (!currentUser.IsInRoles("SUAdmin", "HQAdmin", "HQUser"))
                return Result<SocietyLedgerDto>.Failure(ErrorCodes.Forbidden,
                    "Only society admins may view the society-wide ledger.");

            // Load all maintenance charges (across every apartment) and all vendor charges for the society.
            var maintenanceCharges = await maintenanceChargeRepo.GetBySocietyAsync(
                request.SocietyId, 1, 10_000, null, null, null, null, ct);

            var vendorCharges = (await vendorChargeRepo.GetBySocietyAsync(
                request.SocietyId, 1, 10_000, null, null, null, null, ct))
                .Where(c => !c.IsDeleted && c.IsActive)
                .ToList();

            if (request.From.HasValue)
            {
                maintenanceCharges = maintenanceCharges.Where(c => c.DueDate.Date >= request.From.Value.Date).ToList();
                vendorCharges      = vendorCharges.Where(c => c.DueDate.Date >= request.From.Value.Date).ToList();
            }
            if (request.To.HasValue)
            {
                maintenanceCharges = maintenanceCharges.Where(c => c.DueDate.Date <= request.To.Value.Date).ToList();
                vendorCharges      = vendorCharges.Where(c => c.DueDate.Date <= request.To.Value.Date).ToList();
            }

            // Resolve every apartment's display label with a single bulk fetch for the whole
            // society, instead of one repository round-trip per distinct apartment referenced
            // in the charges above.
            var allApartments = await apartmentRepo.GetAllAsync(request.SocietyId, ct);
            var apartmentsById = allApartments.ToDictionary(a => a.Id, StringComparer.OrdinalIgnoreCase);
            var labels = maintenanceCharges
                .Select(c => c.ApartmentId)
                .Distinct()
                .ToDictionary(
                    aptId => aptId,
                    aptId => apartmentsById.TryGetValue(aptId, out var apt) ? apt.ToDisplayLabel() : aptId,
                    StringComparer.OrdinalIgnoreCase);

            var rawEntries = maintenanceCharges
                .SelectMany(c => LedgerHelper.MaintenanceChargeEntries(c, labels.GetValueOrDefault(c.ApartmentId, c.ApartmentId)))
                .Concat(vendorCharges.SelectMany(LedgerHelper.VendorChargeEntries));

            var entries = LedgerHelper.ToLedgerEntries(rawEntries);
            var balance = entries.Count > 0 ? entries[^1].Balance : 0;

            return Result<SocietyLedgerDto>.Success(new SocietyLedgerDto(
                request.SocietyId,
                balance,
                entries));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetSocietyLedger failed for society {SocietyId}", request.SocietyId);
            return Result<SocietyLedgerDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── GetSocietySummary ────────────────────────────────────────────────────────

public sealed class GetSocietySummaryQueryHandler(
    IMaintenanceChargeRepository maintenanceChargeRepo,
    IVendorChargeRepository vendorChargeRepo,
    ICurrentUserService currentUser,
    ILogger<GetSocietySummaryQueryHandler> logger)
    : IRequestHandler<GetSocietySummaryQuery, Result<SocietySummaryDto>>
{
    public async Task<Result<SocietySummaryDto>> Handle(
        GetSocietySummaryQuery request, CancellationToken ct)
    {
        try
        {
            if (!currentUser.IsInRoles("SUAdmin", "SUUser", "SUSecurity", "HQAdmin", "HQUser"))
                return Result<SocietySummaryDto>.Failure(ErrorCodes.Forbidden,
                    "Authentication required to view society summary.");

            // Society summary is aggregate financial reporting — tenants (as opposed to owners/
            // family members/co-occupants) get their own statement/ledger but not society-wide reports.
            if (currentUser.IsInRole("SUUser") && string.Equals(currentUser.ResidentType, "Tenant", StringComparison.OrdinalIgnoreCase))
                return Result<SocietySummaryDto>.Failure(ErrorCodes.Forbidden,
                    "Tenants do not have access to society financial reports.");

            var now    = DateTime.UtcNow;
            var month  = now.Month;
            var year   = now.Year;
            var fyStart = MonthHelper.CurrentFyStart(now);
            var fyEnd   = fyStart + 1;

            // Current month
            var currentMonthMain = (await maintenanceChargeRepo.GetBySocietyAsync(
                request.SocietyId, 1, 10_000, null, null, year, month, ct))
                .Where(c => c.Status != PaymentStatus.Cancelled).ToList();

            var currentMonthVendor = (await vendorChargeRepo.GetBySocietyAsync(
                request.SocietyId, 1, 10_000, null, null, year, month, ct))
                .Where(c => !c.IsDeleted && c.IsActive).ToList();

            var due       = currentMonthMain.Sum(c => c.Amount);
            var collected = currentMonthMain.Where(c => c.Status == PaymentStatus.Paid).Sum(c => c.Amount);
            var vPaid     = currentMonthVendor.Where(c => c.Status == PaymentStatus.Paid).Sum(c => c.Amount);
            var pct       = due > 0 ? (int)Math.Round(collected / due * 100) : 0;

            // YTD: from April 1 of fyStart to today
            var fyFrom = new DateTime(fyStart, 4, 1, 0, 0, 0, DateTimeKind.Utc);
            var ytdMain = (await maintenanceChargeRepo.GetByDueDateRangeAsync(
                request.SocietyId, fyFrom, now, ct))
                .Where(c => c.Status != PaymentStatus.Cancelled).ToList();

            var ytdVendor = new List<Domain.Entities.VendorCharge>();
            foreach (var y in new[] { fyStart, fyEnd }.Distinct())
            {
                var yearCharges = await vendorChargeRepo.GetByYearAsync(request.SocietyId, y, ct);
                ytdVendor.AddRange(yearCharges.Where(c => !c.IsDeleted && c.IsActive));
            }
            ytdVendor = ytdVendor.Where(c =>
            {
                var chargeDate = c.ChargeYear * 12 + c.ChargeMonth;
                var fromDate   = fyStart * 12 + 4;
                var toDate     = now.Year * 12 + now.Month;
                return chargeDate >= fromDate && chargeDate <= toDate;
            }).ToList();

            var ytdCollected  = ytdMain.Where(c => c.Status == PaymentStatus.Paid).Sum(c => c.Amount);
            var ytdVendorPaid = ytdVendor.Where(c => c.Status == PaymentStatus.Paid).Sum(c => c.Amount);

            // Expense breakdown by vendor business type (YTD)
            var totalExpense = ytdVendorPaid;
            var byCategory = ytdVendor
                .Where(c => c.Status == PaymentStatus.Paid)
                .GroupBy(c => string.IsNullOrWhiteSpace(c.VendorName) ? "Other" : c.VendorName)
                .Select(g => new
                {
                    Category = g.Key,
                    Amount   = g.Sum(x => x.Amount)
                })
                .OrderByDescending(x => x.Amount)
                .Take(6)
                .Select(x => new ExpenseCategoryDto(
                    x.Category,
                    x.Amount,
                    totalExpense > 0 ? (int)Math.Round(x.Amount / totalExpense * 100) : 0))
                .ToList();

            return Result<SocietySummaryDto>.Success(new SocietySummaryDto(
                month, year,
                due, collected, pct,
                vPaid, collected - vPaid,
                ytdCollected, ytdVendorPaid, ytdCollected - ytdVendorPaid,
                byCategory));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetSocietySummary failed for society {SocietyId}", request.SocietyId);
            return Result<SocietySummaryDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── GetPersonalStatement ─────────────────────────────────────────────────────

public sealed class GetPersonalStatementQueryHandler(
    IMaintenanceChargeRepository maintenanceChargeRepo,
    IApartmentRepository apartmentRepo,
    ICurrentUserService currentUser,
    ILogger<GetPersonalStatementQueryHandler> logger)
    : IRequestHandler<GetPersonalStatementQuery, Result<PersonalStatementDto>>
{
    public async Task<Result<PersonalStatementDto>> Handle(
        GetPersonalStatementQuery request, CancellationToken ct)
    {
        try
        {
            var isSelf = currentUser.IsInRole("SUUser")
                      && currentUser.ApartmentId == request.ApartmentId;

            if (!currentUser.IsInRoles("SUAdmin", "HQAdmin") && !isSelf)
                return Result<PersonalStatementDto>.Failure(ErrorCodes.Forbidden,
                    "Residents may only view their own payment statement.");

            var apt = await apartmentRepo.GetByIdAsync(request.ApartmentId, request.SocietyId, ct);

            var year = request.Year ?? DateTime.UtcNow.Year;

            var charges = await maintenanceChargeRepo.GetByApartmentAsync(
                request.SocietyId, request.ApartmentId, 1, 10_000, year, null, ct);

            var activeCharges = charges.Where(c => c.Status != PaymentStatus.Cancelled)
                .OrderBy(c => c.DueDate)
                .ToList();

            var totalCharged    = activeCharges.Sum(c => c.Amount);
            var totalPaid       = activeCharges.Where(c => c.Status == PaymentStatus.Paid).Sum(c => c.Amount);
            var totalOutstanding = totalCharged - totalPaid;

            var chargeDtos = activeCharges.Select(c => new PersonalChargeDto(
                c.Id,
                MonthHelper.Label(c.ChargeMonth, c.ChargeYear),
                c.Amount,
                c.DueDate,
                c.Status.ToString(),
                c.Proofs.FirstOrDefault()?.SubmittedAt,
                c.Status == PaymentStatus.Paid ? c.PaidAt : null,
                c.PaymentMethod,
                c.ReceiptUrl))
                .ToList();

            return Result<PersonalStatementDto>.Success(new PersonalStatementDto(
                request.ApartmentId,
                apt?.ToDisplayLabel() ?? request.ApartmentId,
                year,
                totalCharged,
                totalPaid,
                totalOutstanding,
                chargeDtos));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "GetPersonalStatement failed for apartment {ApartmentId}", request.ApartmentId);
            return Result<PersonalStatementDto>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
