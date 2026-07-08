using ApartmentManagement.Application.Commands.Poll;
using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Queries.Poll;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace ApartmentManagement.Functions.Http;

public class PollFunctions(ISender mediator, ICurrentUserService currentUser)
{
    private static readonly string[] SocietyRoles = ["SUAdmin", "SUUser", "SUSecurity"];

    [Function("CreatePoll")]
    public async Task<IActionResult> CreatePoll(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/polls")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();
        var request = await req.DeserializeAsync<CreatePollRequest>(ct);
        if (request is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(new CreatePollCommand(
            societyId, currentUser.UserId, request.Title, request.Description, request.Type, request.Options,
            request.OpensAt, request.ClosesAt, request.EligibilityUnit, request.Anonymity, request.Visibility,
            request.LinkedNoticeId, request.QuorumThresholdPercent, request.IsAgmResolution, request.AllowVoteChange,
            request.AgmSessionId, request.TargetAudience, request.TargetBlockNames), ct);
        return result.ToActionResult(201);
    }

    [Function("ListPolls")]
    public async Task<IActionResult> ListPolls(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/polls")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles(SocietyRoles)) return new ForbidResult();

        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);
        var linkedNoticeId = req.Query["linkedNoticeId"].ToString();

        var result = await mediator.Send(new GetPollsQuery(
            societyId, new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize },
            string.IsNullOrWhiteSpace(linkedNoticeId) ? null : linkedNoticeId), ct);
        return result.ToActionResult();
    }

    [Function("GetPoll")]
    public async Task<IActionResult> GetPoll(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/polls/{id:guid}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles(SocietyRoles)) return new ForbidResult();

        var result = await mediator.Send(new GetPollQuery(societyId, id, currentUser.UserId, currentUser.Role), ct);
        return result.ToActionResult();
    }

    [Function("CastPollVote")]
    public async Task<IActionResult> CastPollVote(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/polls/{id}/vote")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUUser")) return new ForbidResult();
        var request = await req.DeserializeAsync<CastVoteRequest>(ct);
        if (request is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(new CastVoteCommand(societyId, id, currentUser.UserId, request.SelectedOptionIds), ct);
        return result.ToActionResult();
    }

    [Function("ClosePoll")]
    public async Task<IActionResult> ClosePoll(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/polls/{id}/close")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();

        var result = await mediator.Send(new ClosePollCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("PublishPollResults")]
    public async Task<IActionResult> PublishPollResults(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/polls/{id}/publish-results")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();

        var result = await mediator.Send(new PublishPollResultsCommand(societyId, id), ct);
        return result.ToActionResult();
    }

    [Function("CreateAgmSession")]
    public async Task<IActionResult> CreateAgmSession(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "societies/{societyId}/agm-sessions")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles("SUAdmin")) return new ForbidResult();
        var request = await req.DeserializeAsync<CreateAgmSessionRequest>(ct);
        if (request is null) return new BadRequestObjectResult("Invalid request body");

        var result = await mediator.Send(new CreateAgmSessionCommand(
            societyId, currentUser.UserId, request.Title, request.Description, request.SessionDate), ct);
        return result.ToActionResult(201);
    }

    [Function("ListAgmSessions")]
    public async Task<IActionResult> ListAgmSessions(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/agm-sessions")] HttpRequest req,
        string societyId, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles(SocietyRoles)) return new ForbidResult();

        int.TryParse(req.Query["page"], out var page);
        int.TryParse(req.Query["pageSize"], out var pageSize);

        var result = await mediator.Send(new GetAgmSessionsQuery(
            societyId, new PaginationParams { Page = page < 1 ? 1 : page, PageSize = pageSize < 1 ? 20 : pageSize }), ct);
        return result.ToActionResult();
    }

    [Function("GetAgmSession")]
    public async Task<IActionResult> GetAgmSession(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "societies/{societyId}/agm-sessions/{id:guid}")] HttpRequest req,
        string societyId, string id, CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!currentUser.IsInRoles(SocietyRoles)) return new ForbidResult();

        var result = await mediator.Send(new GetAgmSessionQuery(societyId, id, currentUser.UserId, currentUser.Role), ct);
        return result.ToActionResult();
    }
}
