using ApartmentManagement.Application.Commands.ServiceProvider;
using ApartmentManagement.Application.Queries.ServiceProvider;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class ServiceProviderFunctions(ISender mediator)
{
    [Function("RegisterServiceProvider")]
    public async Task<IActionResult> RegisterServiceProvider(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "service-providers")] HttpRequest req,
        CancellationToken ct)
    {
        var command = await req.DeserializeAsync<RegisterServiceProviderCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command, ct);
        return result.ToActionResult(201);
    }

    [Function("ListServiceProviders")]
    public async Task<IActionResult> ListServiceProviders(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/service-providers")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var result = await mediator.Send(new GetServiceProvidersQuery(null, new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }), ct);
        return result.ToActionResult();
    }

    [Function("CreateServiceRequest")]
    public async Task<IActionResult> CreateServiceRequest(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/service-requests")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<CreateServiceRequestCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId }, ct);
        return result.ToActionResult(201);
    }

    [Function("ListServiceRequests")]
    public async Task<IActionResult> ListServiceRequests(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/service-requests")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var result = await mediator.Send(new GetServiceRequestsQuery(societyId, null, new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }), ct);
        return result.ToActionResult();
    }
}
