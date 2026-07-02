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

// ─── GetFinancialDashboard ────────────────────────────────────────────────────

public sealed class GetFinancialDashboardQueryHandler(
    IMaintenanceChargeRepository maintenanceChargeRepo,
    IVendorChargeRepository vendorChargeRepo,
    IApartmentRepository apartmentRepo,
    ICurrentUserService currentUser,
    ILogger<GetFinancialDashboardQueryHandler> logger)
    : IRequestHandler<GetFinancialDashboardQuery, Result<FinancialDashboardDto>>
{
    public async Task<Result<FinancialDashboardDto>> Handle(
        GetFinancialDashboardQuery request, CancellationToken ct)
    {
        try
        {
            if (!currentUser.IsInRoles("SUAdmin", "HQAdmin", "HQUser"))
                return Result<FinancialDashboardDto>.Failure(ErrorCodes.Forbidden,
                    "Only society admins may access the financial dashboard.");

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
            var mainOverdue     = active.Where(c => c.Status == PaymentStatus.Overdue).Sum(c => c.Amount);

            var billed  = active.Count;
            var paid    = active.Count(c => c.Status == PaymentStatus.Paid);
            var efficiency = billed > 0 ? (int)Math.Round((double)paid / billed * 100) : 0;

            var activeVendor = vendorCharges.Where(c => c.IsActive).ToList();
            var vendorBilled      = activeVendor.Sum(c => c.Amount);
            var vendorPaid        = activeVendor.Where(c => c.Status == PaymentStatus.Paid).Sum(c => c.Amount);
            var vendorOutstanding = activeVendor.Where(c => c.Status != PaymentStatus.Paid).Sum(c => c.Amount);

            // Top 5 overdue apartments
            var overdueGroups = mainCharges
                .Where(c => c.Status == PaymentStatus.Overdue)
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

            // Upcoming vendor dues — next 7 days (Pending charges across all months)
            var nextWeek = now.Date.AddDays(7);
            var upcoming = vendorCharges
                .Where(c => c.IsActive && c.Status != PaymentStatus.Paid
                         && c.DueDate.Date >= now.Date && c.DueDate.Date <= nextWeek)
                .OrderBy(c => c.DueDate)
                .Take(5)
                .Select(c => new UpcomingVendorDueDto(
                    c.VendorId, c.VendorName, c.Amount, c.DueDate,
                    (int)(c.DueDate.Date - now.Date).TotalDays))
                .ToList();

            return Result<FinancialDashboardDto>.Success(new FinancialDashboardDto(
                month, year, MonthHelper.Label(month, year),
                mainBilled, mainCollected, mainPending, mainOverdue, efficiency,
                vendorBilled, vendorPaid, vendorOutstanding,
                mainCollected - vendorPaid,
                topOverdue,
                upcoming));
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

            // Sort chronologically
            var sorted = charges.OrderBy(c => c.DueDate).ToList();

            // Build ledger entries: one debit per charge, one credit for paid charges
            var entries = new List<LedgerEntryDto>(sorted.Count * 2);
            decimal balance = 0;

            foreach (var charge in sorted)
            {
                // Debit (charge raised)
                balance += charge.Amount;
                entries.Add(new LedgerEntryDto(
                    charge.DueDate,
                    $"Maintenance — {MonthHelper.Label(charge.ChargeMonth, charge.ChargeYear)}",
                    "Charge",
                    charge.Amount,
                    null,
                    balance));

                // Credit (payment received)
                if (charge.Status == PaymentStatus.Paid && charge.PaidAt.HasValue)
                {
                    balance -= charge.Amount;
                    entries.Add(new LedgerEntryDto(
                        charge.PaidAt.Value,
                        $"Payment received — {MonthHelper.Label(charge.ChargeMonth, charge.ChargeYear)}",
                        "Payment",
                        null,
                        charge.Amount,
                        balance));
                }
            }

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
