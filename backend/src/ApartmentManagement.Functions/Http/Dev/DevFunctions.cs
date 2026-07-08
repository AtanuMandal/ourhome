using ApartmentManagement.Application.Commands.Dev;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Infrastructure;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Options;

namespace ApartmentManagement.Functions.Http;

/// <summary>
/// Dev-only test-data generation. Disabled by default (returns 404 so the endpoint's existence
/// isn't revealed) — enable via <c>Infrastructure:AllowTestDataSeeding</c> for local/dev use only.
/// </summary>
public class DevFunctions(ISender mediator, ICurrentUserService currentUser, IOptions<InfrastructureSettings> settings)
{
    [Function("SeedTestData")]
    public async Task<IActionResult> SeedTestData(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/dev/seed-test-data")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!settings.Value.AllowTestDataSeeding) return new NotFoundResult();
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin", "HQAdmin")) return new ForbidResult();

        var request = await req.DeserializeAsync<SeedTestDataRequest>(ct) ?? new SeedTestDataRequest();
        var apartmentCount = request.ApartmentCount is > 0 ? request.ApartmentCount.Value : 3;

        var result = await mediator.Send(new SeedTestDataCommand(societyId, apartmentCount), ct);
        return result.ToActionResult(201);
    }
}
