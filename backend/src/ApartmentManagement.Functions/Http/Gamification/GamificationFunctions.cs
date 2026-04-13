using ApartmentManagement.Application.Commands.Gamification;
using ApartmentManagement.Application.Queries.Gamification;
using ApartmentManagement.Functions.Helpers;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class GamificationFunctions(ISender mediator)
{
    [Function("CreateCompetition")]
    public async Task<IActionResult> CreateCompetition(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/competitions")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<CreateCompetitionCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId }, ct);
        return result.ToActionResult(201);
    }

    [Function("JoinCompetition")]
    public async Task<IActionResult> JoinCompetition(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/competitions/{id}/join")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<RegisterForCompetitionCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId, CompetitionId = id }, ct);
        return result.ToActionResult(201);
    }

    [Function("GetLeaderboard")]
    public async Task<IActionResult> GetLeaderboard(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/competitions/{id}/leaderboard")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetLeaderboardQuery(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("GetUserPoints")]
    public async Task<IActionResult> GetUserPoints(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/users/{userId}/points")] HttpRequest req,
        string societyId, string userId, CancellationToken ct)
    {
        var result = await mediator.Send(new GetUserPointsQuery(societyId, userId), ct);
        return result.ToActionResult();
    }

    [Function("AwardPoints")]
    public async Task<IActionResult> AwardPoints(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/users/{userId}/points")] HttpRequest req,
        string societyId, string userId, CancellationToken ct)
    {
        var command = await req.DeserializeAsync<AwardPointsCommand>(ct);
        if (command is null) return new BadRequestObjectResult("Invalid request body");
        var result = await mediator.Send(command with { SocietyId = societyId, UserId = userId }, ct);
        return result.ToActionResult(201);
    }
}
