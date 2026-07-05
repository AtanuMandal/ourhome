namespace ApartmentManagement.Application.DTOs;

// ─── Financial Dashboard ──────────────────────────────────────────────────────

public sealed record FinancialDashboardDto(
    int Month,
    int Year,
    string MonthLabel,
    decimal MaintenanceBilled,
    decimal MaintenanceCollected,
    decimal MaintenancePending,
    decimal MaintenanceOverdue,
    int CollectionEfficiencyPercent,
    decimal VendorBilled,
    decimal VendorPaid,
    decimal VendorOutstanding,
    decimal NetPosition,
    IReadOnlyList<OverdueApartmentDto> TopOverdueApartments,
    IReadOnlyList<UpcomingVendorDueDto> UpcomingVendorDues,
    IReadOnlyList<UpcomingChargeDto> UpcomingCharges,
    decimal UpcomingCashInflow,
    decimal UpcomingCashOutflow);

public sealed record OverdueApartmentDto(
    string ApartmentId,
    string ApartmentLabel,
    decimal OverdueAmount,
    int DaysOverdue);

public sealed record UpcomingVendorDueDto(
    string VendorId,
    string VendorName,
    decimal Amount,
    DateTime DueDate,
    int DaysUntilDue);

public sealed record UpcomingChargeDto(
    string ApartmentId,
    string ApartmentLabel,
    decimal Amount,
    DateTime DueDate,
    int DaysUntilDue);

// ─── Cash Flow ────────────────────────────────────────────────────────────────

public sealed record CashFlowDto(
    int FromMonth,
    int FromYear,
    int ToMonth,
    int ToYear,
    IReadOnlyList<CashFlowMonthDto> Months,
    decimal TotalCashIn,
    decimal TotalCashOut,
    decimal NetPosition);

public sealed record CashFlowMonthDto(
    int Year,
    int Month,
    string MonthLabel,
    decimal MaintenanceCollected,
    decimal TotalCashIn,
    decimal VendorPaid,
    decimal TotalCashOut,
    decimal NetCash);

// ─── Apartment Ledger ─────────────────────────────────────────────────────────

public sealed record ApartmentLedgerDto(
    string ApartmentId,
    string ApartmentLabel,
    string? PrimaryResidentName,
    decimal CurrentOutstanding,
    IReadOnlyList<LedgerEntryDto> Entries);

public sealed record LedgerEntryDto(
    DateTime Date,
    string Description,
    string Type,
    decimal? Debit,
    decimal? Credit,
    decimal Balance);

// ─── Society Ledger (overall society view, all apartments + vendor charges) ──

public sealed record SocietyLedgerDto(
    string SocietyId,
    decimal CurrentBalance,
    IReadOnlyList<LedgerEntryDto> Entries);

// ─── Society Summary (SUUser transparency view) ───────────────────────────────

public sealed record SocietySummaryDto(
    int CurrentMonth,
    int CurrentYear,
    decimal TotalDueCurrentMonth,
    decimal TotalCollectedCurrentMonth,
    int CollectionPercentageCurrentMonth,
    decimal VendorExpensesCurrentMonth,
    decimal NetCurrentMonth,
    decimal TotalCollectedYtd,
    decimal TotalVendorExpensesYtd,
    decimal NetYtd,
    IReadOnlyList<ExpenseCategoryDto> ExpenseBreakdownYtd);

public sealed record ExpenseCategoryDto(
    string Category,
    decimal Amount,
    int PercentageOfTotal);

// ─── Personal Statement (SUUser own charges) ──────────────────────────────────

public sealed record PersonalStatementDto(
    string ApartmentId,
    string ApartmentLabel,
    int Year,
    decimal TotalCharged,
    decimal TotalPaid,
    decimal TotalOutstanding,
    IReadOnlyList<PersonalChargeDto> Charges);

public sealed record PersonalChargeDto(
    string Id,
    string Period,
    decimal Amount,
    DateTime DueDate,
    string Status,
    DateTime? SubmittedOn,
    DateTime? ApprovedOn,
    string? PaymentMethod,
    string? ReceiptUrl);
