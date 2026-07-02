using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.FinancialReport;
using ApartmentManagement.Functions.Helpers;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class FinancialReportFunctions(ISender mediator, ICurrentUserService currentUser)
{
    [Function("GetFinancialDashboard")]
    public async Task<IActionResult> GetFinancialDashboard(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get",
            Route = "societies/{societyId}/financial-report/dashboard")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        var result = await mediator.Send(new GetFinancialDashboardQuery(societyId), ct);
        return result.ToActionResult();
    }

    [Function("GetCashFlow")]
    public async Task<IActionResult> GetCashFlow(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get",
            Route = "societies/{societyId}/financial-report/cash-flow")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();

        var now = DateTime.UtcNow;
        var fyStart = now.Month >= 4 ? now.Year : now.Year - 1;

        var fromMonth = int.TryParse(req.Query["fromMonth"], out var fm) ? fm : 4;
        var fromYear  = int.TryParse(req.Query["fromYear"],  out var fy) ? fy : fyStart;
        var toMonth   = int.TryParse(req.Query["toMonth"],   out var tm) ? tm : now.Month;
        var toYear    = int.TryParse(req.Query["toYear"],    out var ty) ? ty : now.Year;

        var result = await mediator.Send(
            new GetCashFlowQuery(societyId, fromMonth, fromYear, toMonth, toYear), ct);
        return result.ToActionResult();
    }

    [Function("GetApartmentLedger")]
    public async Task<IActionResult> GetApartmentLedger(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get",
            Route = "societies/{societyId}/apartments/{apartmentId}/financial-report/ledger")] HttpRequest req,
        string societyId, string apartmentId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();

        int? fromYear = int.TryParse(req.Query["fromYear"], out var fy) ? fy : null;
        int? toYear   = int.TryParse(req.Query["toYear"],   out var ty) ? ty : null;

        var result = await mediator.Send(
            new GetApartmentLedgerQuery(societyId, apartmentId, fromYear, toYear), ct);
        return result.ToActionResult();
    }

    [Function("GetSocietySummary")]
    public async Task<IActionResult> GetSocietySummary(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get",
            Route = "societies/{societyId}/financial-report/society-summary")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        var result = await mediator.Send(new GetSocietySummaryQuery(societyId), ct);
        return result.ToActionResult();
    }

    [Function("GetPersonalStatement")]
    public async Task<IActionResult> GetPersonalStatement(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get",
            Route = "societies/{societyId}/apartments/{apartmentId}/financial-report/statement")] HttpRequest req,
        string societyId, string apartmentId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();

        int? year = int.TryParse(req.Query["year"], out var y) ? y : null;

        var result = await mediator.Send(
            new GetPersonalStatementQuery(societyId, apartmentId, year), ct);
        return result.ToActionResult();
    }
}
