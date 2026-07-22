using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;
using DomainAgmSession = ApartmentManagement.Domain.Entities.AgmSession;

namespace ApartmentManagement.Application.Commands.Poll
{

public record CreateAgmSessionCommand(string SocietyId, string CreatedByUserId, string Title, string Description, DateTime SessionDate)
    : IRequest<Result<AgmSessionSummaryResponse>>;

public sealed class CreateAgmSessionCommandHandler(
    IAgmSessionRepository agmSessionRepository,
    ILogger<CreateAgmSessionCommandHandler> logger)
    : IRequestHandler<CreateAgmSessionCommand, Result<AgmSessionSummaryResponse>>
{
    public async Task<Result<AgmSessionSummaryResponse>> Handle(CreateAgmSessionCommand request, CancellationToken ct)
    {
        try
        {
            var session = DomainAgmSession.Create(request.SocietyId, request.CreatedByUserId, request.Title, request.Description, request.SessionDate);
            var created = await agmSessionRepository.CreateAsync(session, ct);
            return Result<AgmSessionSummaryResponse>.Success(created.ToSummaryResponse(resolutionCount: 0));
        }
        catch (ArgumentException ex)
        {
            return Result<AgmSessionSummaryResponse>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create AGM session for society {SocietyId}", request.SocietyId);
            return Result<AgmSessionSummaryResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

}

namespace ApartmentManagement.Application.Queries.Poll
{

using ApartmentManagement.Application.Commands.Poll;

public record GetAgmSessionsQuery(string SocietyId, PaginationParams Pagination) : IRequest<Result<PagedResult<AgmSessionSummaryResponse>>>;

public sealed class GetAgmSessionsQueryHandler(IAgmSessionRepository agmSessionRepository, IPollRepository pollRepository)
    : IRequestHandler<GetAgmSessionsQuery, Result<PagedResult<AgmSessionSummaryResponse>>>
{
    public async Task<Result<PagedResult<AgmSessionSummaryResponse>>> Handle(GetAgmSessionsQuery request, CancellationToken ct)
    {
        try
        {
            var sessions = await agmSessionRepository.GetAllAsync(request.SocietyId, ct);
            var polls = await pollRepository.GetAllAsync(request.SocietyId, ct);
            var resolutionCountsBySession = polls
                .Where(p => !string.IsNullOrEmpty(p.AgmSessionId))
                .ToLookup(p => p.AgmSessionId!, StringComparer.OrdinalIgnoreCase);

            var ordered = sessions.OrderByDescending(s => s.SessionDate).ToList();
            var page = request.Pagination.Page < 1 ? 1 : request.Pagination.Page;
            var pageSize = request.Pagination.PageSize < 1 ? 20 : request.Pagination.PageSize;
            var items = ordered.Skip((page - 1) * pageSize).Take(pageSize)
                .Select(s => s.ToSummaryResponse(resolutionCountsBySession[s.Id].Count()))
                .ToList();

            return Result<PagedResult<AgmSessionSummaryResponse>>.Success(new PagedResult<AgmSessionSummaryResponse>(items, ordered.Count, page, pageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<AgmSessionSummaryResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetAgmSessionQuery(string SocietyId, string AgmSessionId, string RequestingUserId, string RequestingUserRole)
    : IRequest<Result<AgmSessionDetailResponse>>;

public sealed class GetAgmSessionQueryHandler(
    IAgmSessionRepository agmSessionRepository,
    IPollRepository pollRepository,
    IPollVoteRepository pollVoteRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository)
    : IRequestHandler<GetAgmSessionQuery, Result<AgmSessionDetailResponse>>
{
    public async Task<Result<AgmSessionDetailResponse>> Handle(GetAgmSessionQuery request, CancellationToken ct)
    {
        try
        {
            var session = await agmSessionRepository.GetByIdAsync(request.AgmSessionId, request.SocietyId, ct)
                ?? throw new NotFoundException("AgmSession", request.AgmSessionId);

            var polls = await pollRepository.GetAllAsync(request.SocietyId, ct);
            var resolutions = polls
                .Where(p => string.Equals(p.AgmSessionId, request.AgmSessionId, StringComparison.OrdinalIgnoreCase))
                .OrderBy(p => p.CreatedAt);

            // Fetch the requesting user once and reuse it for every resolution in the session,
            // instead of BuildPollResponseAsync refetching the same user on every iteration.
            var requester = await userRepository.GetByIdAsync(request.RequestingUserId, request.SocietyId, ct);

            var responses = new List<PollResponse>();
            foreach (var poll in resolutions)
            {
                responses.Add(await PollNotificationHelper.BuildPollResponseAsync(
                    poll, request.RequestingUserId, request.RequestingUserRole,
                    pollVoteRepository, apartmentRepository, userRepository, ct, requester));
            }

            return Result<AgmSessionDetailResponse>.Success(new AgmSessionDetailResponse(
                session.Id, session.Title, session.Description, session.SessionDate, responses));
        }
        catch (NotFoundException ex)
        {
            return Result<AgmSessionDetailResponse>.Failure(ErrorCodes.AgmSessionNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<AgmSessionDetailResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

}
