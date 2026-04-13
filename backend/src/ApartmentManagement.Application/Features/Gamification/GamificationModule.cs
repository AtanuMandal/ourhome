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

namespace ApartmentManagement.Application.Commands.Gamification
{

// ─── Create Competition ───────────────────────────────────────────────────────

public record CreateCompetitionCommand(
    string SocietyId, string UserId, string Title, string Description,
    DateTime StartDate, DateTime EndDate, string Prize, int MaxParticipants)
    : IRequest<Result<CompetitionResponse>>;

public sealed class CreateCompetitionCommandHandler(
    ICompetitionRepository competitionRepository,
    ILogger<CreateCompetitionCommandHandler> logger)
    : IRequestHandler<CreateCompetitionCommand, Result<CompetitionResponse>>
{
    public async Task<Result<CompetitionResponse>> Handle(CreateCompetitionCommand request, CancellationToken ct)
    {
        try
        {
            var competition = Competition.Create(
                request.SocietyId, request.UserId, request.Title, request.Description,
                request.StartDate, request.EndDate, request.Prize, request.MaxParticipants);

            var created = await competitionRepository.CreateAsync(competition, ct);
            return Result<CompetitionResponse>.Success(created.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create competition {Title}", request.Title);
            return Result<CompetitionResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Register For Competition ─────────────────────────────────────────────────

public record RegisterForCompetitionCommand(string SocietyId, string CompetitionId, string UserId, string ApartmentId)
    : IRequest<Result<CompetitionEntryResponse>>;

public sealed class RegisterForCompetitionCommandHandler(
    ICompetitionRepository competitionRepository,
    ICompetitionEntryRepository entryRepository,
    ILogger<RegisterForCompetitionCommandHandler> logger)
    : IRequestHandler<RegisterForCompetitionCommand, Result<CompetitionEntryResponse>>
{
    public async Task<Result<CompetitionEntryResponse>> Handle(RegisterForCompetitionCommand request, CancellationToken ct)
    {
        try
        {
            var competition = await competitionRepository.GetByIdAsync(request.CompetitionId, request.SocietyId, ct)
                ?? throw new NotFoundException("Competition", request.CompetitionId);

            if (competition.Status != CompetitionStatus.Active && competition.Status != CompetitionStatus.Upcoming)
                return Result<CompetitionEntryResponse>.Failure(ErrorCodes.CompetitionNotActive,
                    "Competition is not open for registration.");

            var existing = await entryRepository.GetUserEntryAsync(request.SocietyId, request.CompetitionId, request.UserId, ct);
            if (existing is not null)
                return Result<CompetitionEntryResponse>.Failure(ErrorCodes.AlreadyRegistered,
                    "User is already registered for this competition.");

            if (competition.MaxParticipants.HasValue)
            {
                var currentEntries = await entryRepository.GetByCompetitionAsync(request.SocietyId, request.CompetitionId, ct);
                if (currentEntries.Count >= competition.MaxParticipants.Value)
                    return Result<CompetitionEntryResponse>.Failure(ErrorCodes.CompetitionFull,
                        "Competition has reached maximum participants.");
            }

            var entry = CompetitionEntry.Create(request.SocietyId, request.CompetitionId, request.ApartmentId, request.UserId);
            var created = await entryRepository.CreateAsync(entry, ct);
            return Result<CompetitionEntryResponse>.Success(created.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<CompetitionEntryResponse>.Failure(ErrorCodes.CompetitionNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to register for competition {CompetitionId}", request.CompetitionId);
            return Result<CompetitionEntryResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Update Score ─────────────────────────────────────────────────────────────

public record UpdateScoreCommand(string SocietyId, string CompetitionId, string UserId, decimal Score)
    : IRequest<Result<bool>>;

public sealed class UpdateScoreCommandHandler(
    ICompetitionEntryRepository entryRepository,
    ILogger<UpdateScoreCommandHandler> logger)
    : IRequestHandler<UpdateScoreCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(UpdateScoreCommand request, CancellationToken ct)
    {
        try
        {
            var entry = await entryRepository.GetUserEntryAsync(request.SocietyId, request.CompetitionId, request.UserId, ct);
            if (entry is null)
                return Result<bool>.Failure(ErrorCodes.NotFound, "Competition entry not found.");

            entry.UpdateScore(request.Score);
            await entryRepository.UpdateAsync(entry, ct);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update score for user {UserId} in competition {CompetitionId}",
                request.UserId, request.CompetitionId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Award Points ─────────────────────────────────────────────────────────────

public record AwardPointsCommand(string SocietyId, string UserId, string ApartmentId, int Points, string Reason)
    : IRequest<Result<bool>>;

public sealed class AwardPointsCommandHandler(
    IRewardPointsRepository rewardPointsRepository,
    INotificationService notificationService,
    IEventPublisher eventPublisher,
    ILogger<AwardPointsCommandHandler> logger)
    : IRequestHandler<AwardPointsCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(AwardPointsCommand request, CancellationToken ct)
    {
        try
        {
            var rewardPoints = RewardPoints.Create(
                request.SocietyId, request.UserId, request.ApartmentId, request.Points, request.Reason);

            var created = await rewardPointsRepository.CreateAsync(rewardPoints, ct);

            foreach (var evt in created.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            created.ClearDomainEvents();

            await notificationService.SendPushNotificationAsync(request.UserId,
                "Points Awarded",
                $"You earned {request.Points} points! Reason: {request.Reason}", ct);

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to award points to user {UserId}", request.UserId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Redeem Points ────────────────────────────────────────────────────────────

public record RedeemPointsCommand(string SocietyId, string UserId, int Points, string Reason)
    : IRequest<Result<bool>>;

public sealed class RedeemPointsCommandHandler(
    IRewardPointsRepository rewardPointsRepository,
    ILogger<RedeemPointsCommandHandler> logger)
    : IRequestHandler<RedeemPointsCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(RedeemPointsCommand request, CancellationToken ct)
    {
        try
        {
            var allPoints = await rewardPointsRepository.GetLeaderboardAsync(request.SocietyId, int.MaxValue, ct);
            var userPoints = allPoints.Where(p => p.UserId == request.UserId).Sum(p => p.Points);

            if (userPoints < request.Points)
                return Result<bool>.Failure(ErrorCodes.InsufficientPoints,
                    $"User has {userPoints} points but needs {request.Points} to redeem.");

            var redemption = RewardPoints.Create(
                request.SocietyId, request.UserId, string.Empty, -request.Points, request.Reason);

            await rewardPointsRepository.CreateAsync(redemption, ct);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to redeem points for user {UserId}", request.UserId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

}

namespace ApartmentManagement.Application.Queries.Gamification
{

public record GetCompetitionsQuery(string SocietyId, CompetitionStatus? Status, PaginationParams Pagination)
    : IRequest<Result<PagedResult<CompetitionResponse>>>;

public sealed class GetCompetitionsQueryHandler(ICompetitionRepository competitionRepository)
    : IRequestHandler<GetCompetitionsQuery, Result<PagedResult<CompetitionResponse>>>
{
    public async Task<Result<PagedResult<CompetitionResponse>>> Handle(GetCompetitionsQuery request, CancellationToken ct)
    {
        try
        {
            IReadOnlyList<Competition> competitions;
            if (request.Status.HasValue)
            {
                competitions = await competitionRepository.GetByStatusAsync(
                    request.SocietyId, request.Status.Value,
                    request.Pagination.Page, request.Pagination.PageSize, ct);
            }
            else
            {
                competitions = await competitionRepository.GetAllAsync(request.SocietyId, ct);
            }

            var items = competitions.Select(c => c.ToResponse()).ToList();
            return Result<PagedResult<CompetitionResponse>>.Success(
                new PagedResult<CompetitionResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<CompetitionResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetLeaderboardQuery(string SocietyId, string CompetitionId, int Top = 10)
    : IRequest<Result<IReadOnlyList<LeaderboardEntryDto>>>;

public sealed class GetLeaderboardQueryHandler(ICompetitionEntryRepository entryRepository)
    : IRequestHandler<GetLeaderboardQuery, Result<IReadOnlyList<LeaderboardEntryDto>>>
{
    public async Task<Result<IReadOnlyList<LeaderboardEntryDto>>> Handle(GetLeaderboardQuery request, CancellationToken ct)
    {
        try
        {
            var entries = await entryRepository.GetLeaderboardAsync(
                request.SocietyId, request.CompetitionId, request.Top, ct);

            var leaderboard = entries
                .Select((e, i) => new LeaderboardEntryDto(e.Rank ?? (i + 1), e.UserId, e.ApartmentId, e.Score))
                .ToList();

            return Result<IReadOnlyList<LeaderboardEntryDto>>.Success(leaderboard);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<LeaderboardEntryDto>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetUserPointsQuery(string SocietyId, string UserId) : IRequest<Result<UserPointsResponse>>;

public sealed class GetUserPointsQueryHandler(IRewardPointsRepository rewardPointsRepository)
    : IRequestHandler<GetUserPointsQuery, Result<UserPointsResponse>>
{
    public async Task<Result<UserPointsResponse>> Handle(GetUserPointsQuery request, CancellationToken ct)
    {
        try
        {
            var allPoints = await rewardPointsRepository.GetLeaderboardAsync(request.SocietyId, int.MaxValue, ct);
            var userHistory = allPoints.Where(p => p.UserId == request.UserId).ToList();
            var total = userHistory.Sum(p => p.Points);

            var history = userHistory
                .Select(p => new PointHistoryDto(p.Points, p.Reason, p.CreatedAt))
                .ToList();

            return Result<UserPointsResponse>.Success(
                new UserPointsResponse(request.UserId, request.SocietyId, total, history));
        }
        catch (Exception ex)
        {
            return Result<UserPointsResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
}

namespace ApartmentManagement.Application.Commands.Gamification
{
public record UpdateCompetitionStatusesCommand() : IRequest<Result<int>>;

public sealed class UpdateCompetitionStatusesCommandHandler(ILogger<UpdateCompetitionStatusesCommandHandler> logger)
    : IRequestHandler<UpdateCompetitionStatusesCommand, Result<int>>
{
    public Task<Result<int>> Handle(UpdateCompetitionStatusesCommand request, CancellationToken ct)
    {
        logger.LogInformation("UpdateCompetitionStatuses: batch competition status update scheduled");
        return Task.FromResult(Result<int>.Success(0));
    }
}
}