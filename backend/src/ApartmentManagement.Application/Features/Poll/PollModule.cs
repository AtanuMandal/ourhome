using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;
using DomainPoll = ApartmentManagement.Domain.Entities.Poll;

namespace ApartmentManagement.Application.Commands.Poll
{

/// <summary>
/// Shared eligibility/notification/close orchestration reused across the create, close, publish,
/// and timer handlers below.
/// </summary>
internal static class PollNotificationHelper
{
    /// <summary>Eligible voting unit paired with the user id to push-notify for it.</summary>
    public sealed record EligibleUnit(string EligibleUnitId, string NotifyUserId);

    /// <summary>
    /// Scopes eligible apartments to the poll's target audience (requirements/polls_and_voting.md —
    /// Feature #1: Target Audience). null means FullSociety — no scoping.
    /// </summary>
    private static HashSet<string>? TargetBlockNameSet(DomainPoll poll) =>
        poll.TargetAudience == PollTargetAudience.FullSociety
            ? null
            : new HashSet<string>(poll.TargetBlockNames, StringComparer.OrdinalIgnoreCase);

    public static async Task<IReadOnlyList<EligibleUnit>> ResolveEligibleUnitsAsync(
        DomainPoll poll, IApartmentRepository apartmentRepository, IUserRepository userRepository, CancellationToken ct)
    {
        var targetBlockNames = TargetBlockNameSet(poll);

        if (poll.EligibilityUnit == PollEligibilityUnit.PerApartment)
        {
            var apartments = await apartmentRepository.GetAllAsync(poll.SocietyId, ct);
            var scoped = targetBlockNames is null ? apartments : apartments.Where(a => targetBlockNames.Contains(a.BlockName));
            return scoped
                .Where(a => !string.IsNullOrEmpty(a.OwnerId))
                .Select(a => new EligibleUnit(a.Id, a.OwnerId!))
                .ToList();
        }

        var users = await userRepository.GetByRoleAsync(poll.SocietyId, UserRole.SUUser, 1, 500, ct);
        if (targetBlockNames is null)
            return users.Where(u => u.IsActive).Select(u => new EligibleUnit(u.Id, u.Id)).ToList();

        var apartmentsForResidentScope = await apartmentRepository.GetAllAsync(poll.SocietyId, ct);
        var eligibleApartmentIds = apartmentsForResidentScope
            .Where(a => targetBlockNames.Contains(a.BlockName))
            .Select(a => a.Id)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return users
            .Where(u => u.IsActive && u.ApartmentId != null && eligibleApartmentIds.Contains(u.ApartmentId))
            .Select(u => new EligibleUnit(u.Id, u.Id))
            .ToList();
    }

    public static async Task NotifyUsersAsync(
        DomainPoll poll, IEnumerable<string> userIds, INotificationService notificationService,
        string title, string body, CancellationToken ct)
    {
        var data = new Dictionary<string, string> { ["type"] = "poll", ["pollId"] = poll.Id };
        await Task.WhenAll(userIds.Distinct().Select(id => notificationService.SendPushNotificationAsync(id, title, body, ct, data)));
    }

    public static async Task NotifyPollOpenedAsync(
        DomainPoll poll, IApartmentRepository apartmentRepository, IUserRepository userRepository,
        INotificationService notificationService, CancellationToken ct)
    {
        var units = await ResolveEligibleUnitsAsync(poll, apartmentRepository, userRepository, ct);
        await NotifyUsersAsync(poll, units.Select(u => u.NotifyUserId), notificationService,
            $"New Poll: {poll.Title}", "A new poll is open for voting.", ct);
    }

    public static IReadOnlyList<PollOptionTallyResponse> ComputeTally(DomainPoll poll, IReadOnlyList<Domain.Entities.PollVote> votes) =>
        poll.Options
            .Select(o => new PollOptionTallyResponse(o.Id, o.Text, votes.Count(v => v.SelectedOptionIds.Contains(o.Id))))
            .ToList();

    /// <summary>
    /// Builds a poll's response including its visibility-gated tally and the requester's own vote.
    /// Shared by GetPollQueryHandler and the AGM session detail query, since a session's resolutions
    /// must be rendered with the exact same per-role/per-visibility rules as a standalone poll.
    /// </summary>
    public static async Task<PollResponse> BuildPollResponseAsync(
        DomainPoll poll, string requestingUserId, string requestingUserRole,
        IPollVoteRepository pollVoteRepository, IApartmentRepository apartmentRepository, IUserRepository userRepository,
        CancellationToken ct)
    {
        var isAdmin = string.Equals(requestingUserRole, "SUAdmin", StringComparison.OrdinalIgnoreCase);
        var isSecurity = string.Equals(requestingUserRole, "SUSecurity", StringComparison.OrdinalIgnoreCase);

        // Visibility rules (requirements/polls_and_voting.md — Roles table + Feature #3):
        // - SUAdmin always sees the live/final tally.
        // - SUSecurity ("published results only", no voting rights) never sees a live tally —
        //   only a closed poll whose results are visible per the same closed-poll rule as residents.
        // - SUUser sees the tally per the poll's own visibility setting: Immediately (even while
        //   open), AfterClose (once closed), or AdminOnly (only once explicitly published).
        bool canSeeTally;
        if (isAdmin)
            canSeeTally = true;
        else if (poll.Status == PollStatus.Closed)
            canSeeTally = poll.Visibility != PollVisibility.AdminOnly || poll.ResultsPublished;
        else
            canSeeTally = !isSecurity && poll.Visibility == PollVisibility.Immediately;

        var votes = await pollVoteRepository.GetByPollAsync(poll.SocietyId, poll.Id, ct);

        IReadOnlyList<PollOptionTallyResponse>? tally = null;
        int? eligibleCount = null;
        int? participantCount = null;
        if (canSeeTally)
        {
            tally = ComputeTally(poll, votes);
            participantCount = votes.Count;
            eligibleCount = poll.EligibleCountAtClose
                ?? (await ResolveEligibleUnitsAsync(poll, apartmentRepository, userRepository, ct)).Count;
        }

        var requester = await userRepository.GetByIdAsync(requestingUserId, poll.SocietyId, ct);
        var myEligibleUnitId = requester is null
            ? null
            : (poll.EligibilityUnit == PollEligibilityUnit.PerApartment ? requester.ApartmentId : requester.Id);
        var myVote = myEligibleUnitId is null ? null : votes.FirstOrDefault(v => v.EligibleUnitId == myEligibleUnitId);

        return poll.ToResponse(tally, eligibleCount, participantCount, myVote is not null, myVote?.SelectedOptionIds);
    }

    /// <summary>Closes an open poll, persists it, and notifies eligible residents unless visibility is AdminOnly.</summary>
    public static async Task<(DomainPoll Poll, IReadOnlyList<PollOptionTallyResponse> Tally)> CloseAndNotifyAsync(
        DomainPoll poll,
        IPollRepository pollRepository,
        IPollVoteRepository pollVoteRepository,
        IApartmentRepository apartmentRepository,
        IUserRepository userRepository,
        INotificationService notificationService,
        CancellationToken ct)
    {
        var votes = await pollVoteRepository.GetByPollAsync(poll.SocietyId, poll.Id, ct);
        var tally = ComputeTally(poll, votes);
        var units = await ResolveEligibleUnitsAsync(poll, apartmentRepository, userRepository, ct);
        var leadingVoteCount = tally.Count == 0 ? 0 : tally.Max(t => t.VoteCount);

        poll.Close(units.Count, votes.Count, leadingVoteCount);
        var updated = await pollRepository.UpdateAsync(poll, ct);

        if (updated.Visibility != PollVisibility.AdminOnly)
        {
            await NotifyUsersAsync(updated, units.Select(u => u.NotifyUserId), notificationService,
                $"Results are in: {updated.Title}", "Voting has closed and results are now available.", ct);
        }

        return (updated, tally);
    }
}

public record CreatePollCommand(
    string SocietyId, string CreatedByUserId, string Title, string Description, PollType Type,
    IReadOnlyList<string> OptionTexts, DateTime OpensAt, DateTime ClosesAt,
    PollEligibilityUnit EligibilityUnit, PollAnonymity Anonymity, PollVisibility Visibility,
    string? LinkedNoticeId, double? QuorumThresholdPercent, bool IsAgmResolution, bool AllowVoteChange,
    string? AgmSessionId = null,
    PollTargetAudience TargetAudience = PollTargetAudience.FullSociety, IReadOnlyList<string>? TargetBlockNames = null)
    : IRequest<Result<PollResponse>>;

public sealed class CreatePollCommandHandler(
    IPollRepository pollRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    IAgmSessionRepository agmSessionRepository,
    INotificationService notificationService,
    ILogger<CreatePollCommandHandler> logger)
    : IRequestHandler<CreatePollCommand, Result<PollResponse>>
{
    public async Task<Result<PollResponse>> Handle(CreatePollCommand request, CancellationToken ct)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(request.AgmSessionId))
            {
                _ = await agmSessionRepository.GetByIdAsync(request.AgmSessionId, request.SocietyId, ct)
                    ?? throw new NotFoundException("AgmSession", request.AgmSessionId);
            }

            var poll = DomainPoll.Create(
                request.SocietyId, request.CreatedByUserId, request.Title, request.Description, request.Type,
                request.OptionTexts, request.OpensAt, request.ClosesAt, request.EligibilityUnit, request.Anonymity,
                request.Visibility, request.LinkedNoticeId, request.QuorumThresholdPercent, request.IsAgmResolution,
                request.AllowVoteChange, request.AgmSessionId, request.TargetAudience, request.TargetBlockNames);

            var created = await pollRepository.CreateAsync(poll, ct);

            if (created.IsCurrentlyOpen(DateTime.UtcNow))
                await PollNotificationHelper.NotifyPollOpenedAsync(created, apartmentRepository, userRepository, notificationService, ct);

            return Result<PollResponse>.Success(created.ToResponse(null, null, null, false, null));
        }
        catch (NotFoundException ex)
        {
            return Result<PollResponse>.Failure(ErrorCodes.NotFound, ex.Message);
        }
        catch (ArgumentException ex)
        {
            return Result<PollResponse>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create poll for society {SocietyId}", request.SocietyId);
            return Result<PollResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record CastVoteCommand(string SocietyId, string PollId, string VoterUserId, IReadOnlyList<string> SelectedOptionIds)
    : IRequest<Result<PollVoteResponse>>;

public sealed class CastVoteCommandHandler(
    IPollRepository pollRepository,
    IPollVoteRepository pollVoteRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ILogger<CastVoteCommandHandler> logger)
    : IRequestHandler<CastVoteCommand, Result<PollVoteResponse>>
{
    public async Task<Result<PollVoteResponse>> Handle(CastVoteCommand request, CancellationToken ct)
    {
        try
        {
            var poll = await pollRepository.GetByIdAsync(request.PollId, request.SocietyId, ct)
                ?? throw new NotFoundException("Poll", request.PollId);

            if (!poll.IsCurrentlyOpen(DateTime.UtcNow))
                return Result<PollVoteResponse>.Failure(ErrorCodes.PollNotOpen, "This poll is not currently open for voting.");

            var validOptionIds = poll.Options.Select(o => o.Id).ToHashSet();
            if (request.SelectedOptionIds.Count == 0 || request.SelectedOptionIds.Any(id => !validOptionIds.Contains(id)))
                return Result<PollVoteResponse>.Failure(ErrorCodes.ValidationFailed, "One or more selected options are invalid.");
            if (poll.Type == PollType.SingleChoice && request.SelectedOptionIds.Count > 1)
                return Result<PollVoteResponse>.Failure(ErrorCodes.ValidationFailed, "Only one option may be selected for a single-choice poll.");

            var voter = await userRepository.GetByIdAsync(request.VoterUserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.VoterUserId);

            string eligibleUnitId;
            if (poll.EligibilityUnit == PollEligibilityUnit.PerApartment)
            {
                if (string.IsNullOrWhiteSpace(voter.ApartmentId))
                    return Result<PollVoteResponse>.Failure(ErrorCodes.NotEligibleToVote, "You must be linked to an apartment to vote in this poll.");
                if (voter.ResidentType != ResidentType.Owner)
                    return Result<PollVoteResponse>.Failure(ErrorCodes.NotEligibleToVote, "Only the apartment owner may cast this poll's vote.");
                eligibleUnitId = voter.ApartmentId;
            }
            else
            {
                eligibleUnitId = voter.Id;
            }

            if (poll.TargetAudience != PollTargetAudience.FullSociety)
            {
                var voterApartmentId = poll.EligibilityUnit == PollEligibilityUnit.PerApartment ? eligibleUnitId : voter.ApartmentId;
                if (string.IsNullOrWhiteSpace(voterApartmentId))
                    return Result<PollVoteResponse>.Failure(ErrorCodes.NotEligibleToVote, "You must be linked to an apartment to vote in this poll.");

                var voterApartment = await apartmentRepository.GetByIdAsync(voterApartmentId, request.SocietyId, ct);
                var targetBlockNames = new HashSet<string>(poll.TargetBlockNames, StringComparer.OrdinalIgnoreCase);
                if (voterApartment is null || !targetBlockNames.Contains(voterApartment.BlockName))
                    return Result<PollVoteResponse>.Failure(ErrorCodes.NotEligibleToVote, "This poll is not open to residents of your block.");
            }

            var existing = await pollVoteRepository.GetByPollAndEligibleUnitAsync(request.SocietyId, request.PollId, eligibleUnitId, ct);
            if (existing is not null)
            {
                if (!poll.AllowVoteChange)
                    return Result<PollVoteResponse>.Failure(ErrorCodes.AlreadyVoted, "You have already voted in this poll.");

                existing.ChangeSelection(request.SelectedOptionIds);
                var updated = await pollVoteRepository.UpdateAsync(existing, ct);
                return Result<PollVoteResponse>.Success(new PollVoteResponse(request.PollId, updated.SelectedOptionIds, updated.VotedAt));
            }

            var vote = Domain.Entities.PollVote.Create(request.SocietyId, request.PollId, eligibleUnitId, request.VoterUserId, request.SelectedOptionIds);
            var createdVote = await pollVoteRepository.CreateAsync(vote, ct);
            return Result<PollVoteResponse>.Success(new PollVoteResponse(request.PollId, createdVote.SelectedOptionIds, createdVote.VotedAt));
        }
        catch (NotFoundException ex)
        {
            return Result<PollVoteResponse>.Failure(ErrorCodes.NotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to cast vote for poll {PollId}", request.PollId);
            return Result<PollVoteResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record ClosePollCommand(string SocietyId, string PollId) : IRequest<Result<PollResponse>>;

public sealed class ClosePollCommandHandler(
    IPollRepository pollRepository,
    IPollVoteRepository pollVoteRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    INotificationService notificationService,
    ILogger<ClosePollCommandHandler> logger)
    : IRequestHandler<ClosePollCommand, Result<PollResponse>>
{
    public async Task<Result<PollResponse>> Handle(ClosePollCommand request, CancellationToken ct)
    {
        try
        {
            var poll = await pollRepository.GetByIdAsync(request.PollId, request.SocietyId, ct)
                ?? throw new NotFoundException("Poll", request.PollId);

            var (updated, tally) = await PollNotificationHelper.CloseAndNotifyAsync(
                poll, pollRepository, pollVoteRepository, apartmentRepository, userRepository, notificationService, ct);

            return Result<PollResponse>.Success(updated.ToResponse(tally, updated.EligibleCountAtClose, updated.ParticipantCountAtClose, false, null));
        }
        catch (NotFoundException ex)
        {
            return Result<PollResponse>.Failure(ErrorCodes.PollNotFound, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Result<PollResponse>.Failure(ErrorCodes.PollAlreadyClosed, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to close poll {PollId}", request.PollId);
            return Result<PollResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record PublishPollResultsCommand(string SocietyId, string PollId) : IRequest<Result<PollResponse>>;

public sealed class PublishPollResultsCommandHandler(
    IPollRepository pollRepository,
    IPollVoteRepository pollVoteRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    INotificationService notificationService,
    ILogger<PublishPollResultsCommandHandler> logger)
    : IRequestHandler<PublishPollResultsCommand, Result<PollResponse>>
{
    public async Task<Result<PollResponse>> Handle(PublishPollResultsCommand request, CancellationToken ct)
    {
        try
        {
            var poll = await pollRepository.GetByIdAsync(request.PollId, request.SocietyId, ct)
                ?? throw new NotFoundException("Poll", request.PollId);

            poll.PublishResults();
            var updated = await pollRepository.UpdateAsync(poll, ct);

            var votes = await pollVoteRepository.GetByPollAsync(request.SocietyId, request.PollId, ct);
            var tally = PollNotificationHelper.ComputeTally(updated, votes);

            var units = await PollNotificationHelper.ResolveEligibleUnitsAsync(updated, apartmentRepository, userRepository, ct);
            await PollNotificationHelper.NotifyUsersAsync(
                updated, units.Select(u => u.NotifyUserId), notificationService,
                $"Results published: {updated.Title}", "The results for this poll have been published.", ct);

            return Result<PollResponse>.Success(updated.ToResponse(tally, updated.EligibleCountAtClose, updated.ParticipantCountAtClose, false, null));
        }
        catch (NotFoundException ex)
        {
            return Result<PollResponse>.Failure(ErrorCodes.PollNotFound, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Result<PollResponse>.Failure(ErrorCodes.PollResultsAlreadyPublished, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to publish results for poll {PollId}", request.PollId);
            return Result<PollResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Timer-driven commands (society-agnostic — see TimerFunctions) ───────────

public record UpdatePollStatusesCommand(DateTime? AsOfUtc = null) : IRequest<Result<int>>;

public sealed class UpdatePollStatusesCommandHandler(
    IPollRepository pollRepository,
    IPollVoteRepository pollVoteRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    INotificationService notificationService,
    ILogger<UpdatePollStatusesCommandHandler> logger)
    : IRequestHandler<UpdatePollStatusesCommand, Result<int>>
{
    public async Task<Result<int>> Handle(UpdatePollStatusesCommand request, CancellationToken ct)
    {
        try
        {
            var now = request.AsOfUtc ?? DateTime.UtcNow;
            var polls = await pollRepository.GetOpenOrScheduledAcrossSocietiesAsync(ct);
            var updatedCount = 0;

            foreach (var poll in polls)
            {
                if (poll.Status == PollStatus.Scheduled && now >= poll.OpensAt)
                {
                    poll.Activate();
                    await pollRepository.UpdateAsync(poll, ct);
                    await PollNotificationHelper.NotifyPollOpenedAsync(poll, apartmentRepository, userRepository, notificationService, ct);
                    updatedCount++;
                }
                else if (poll.Status == PollStatus.Open && now >= poll.ClosesAt)
                {
                    await PollNotificationHelper.CloseAndNotifyAsync(
                        poll, pollRepository, pollVoteRepository, apartmentRepository, userRepository, notificationService, ct);
                    updatedCount++;
                }
            }

            return Result<int>.Success(updatedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update poll statuses.");
            return Result<int>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record SendPollVotingRemindersCommand(DateTime? AsOfUtc = null) : IRequest<Result<int>>;

public sealed class SendPollVotingRemindersCommandHandler(
    IPollRepository pollRepository,
    IPollVoteRepository pollVoteRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    INotificationService notificationService,
    ILogger<SendPollVotingRemindersCommandHandler> logger)
    : IRequestHandler<SendPollVotingRemindersCommand, Result<int>>
{
    /// <summary>Reminder fires once, this far ahead of closesAt, per requirements/polls_and_voting.md.</summary>
    private static readonly TimeSpan ReminderWindow = TimeSpan.FromHours(24);

    public async Task<Result<int>> Handle(SendPollVotingRemindersCommand request, CancellationToken ct)
    {
        try
        {
            var now = request.AsOfUtc ?? DateTime.UtcNow;
            var polls = await pollRepository.GetOpenOrScheduledAcrossSocietiesAsync(ct);
            var remindedCount = 0;

            foreach (var poll in polls)
            {
                if (poll.Status != PollStatus.Open || poll.ReminderSentAt is not null)
                    continue;
                if (poll.ClosesAt <= now || poll.ClosesAt - now > ReminderWindow)
                    continue;

                var units = await PollNotificationHelper.ResolveEligibleUnitsAsync(poll, apartmentRepository, userRepository, ct);
                var votes = await pollVoteRepository.GetByPollAsync(poll.SocietyId, poll.Id, ct);
                var votedUnitIds = votes.Select(v => v.EligibleUnitId).ToHashSet();

                var nonVoterUserIds = units.Where(u => !votedUnitIds.Contains(u.EligibleUnitId)).Select(u => u.NotifyUserId).ToList();
                if (nonVoterUserIds.Count > 0)
                {
                    await PollNotificationHelper.NotifyUsersAsync(
                        poll, nonVoterUserIds, notificationService,
                        $"Reminder: {poll.Title} closes soon", "You haven't voted yet — cast your vote before this poll closes.", ct);
                }

                poll.MarkReminderSent();
                await pollRepository.UpdateAsync(poll, ct);
                remindedCount++;
            }

            return Result<int>.Success(remindedCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send poll voting reminders.");
            return Result<int>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

}

namespace ApartmentManagement.Application.Queries.Poll
{

using ApartmentManagement.Application.Commands.Poll;

public record GetPollQuery(string SocietyId, string PollId, string RequestingUserId, string RequestingUserRole)
    : IRequest<Result<PollResponse>>;

public sealed class GetPollQueryHandler(
    IPollRepository pollRepository,
    IPollVoteRepository pollVoteRepository,
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository)
    : IRequestHandler<GetPollQuery, Result<PollResponse>>
{
    public async Task<Result<PollResponse>> Handle(GetPollQuery request, CancellationToken ct)
    {
        try
        {
            var poll = await pollRepository.GetByIdAsync(request.PollId, request.SocietyId, ct)
                ?? throw new NotFoundException("Poll", request.PollId);

            var response = await PollNotificationHelper.BuildPollResponseAsync(
                poll, request.RequestingUserId, request.RequestingUserRole,
                pollVoteRepository, apartmentRepository, userRepository, ct);

            return Result<PollResponse>.Success(response);
        }
        catch (NotFoundException ex)
        {
            return Result<PollResponse>.Failure(ErrorCodes.PollNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<PollResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetPollsQuery(string SocietyId, PaginationParams Pagination, string? LinkedNoticeId = null)
    : IRequest<Result<PagedResult<PollSummaryResponse>>>;

public sealed class GetPollsQueryHandler(IPollRepository pollRepository)
    : IRequestHandler<GetPollsQuery, Result<PagedResult<PollSummaryResponse>>>
{
    public async Task<Result<PagedResult<PollSummaryResponse>>> Handle(GetPollsQuery request, CancellationToken ct)
    {
        try
        {
            var all = await pollRepository.GetAllAsync(request.SocietyId, ct);
            IEnumerable<DomainPoll> filtered = all;
            if (!string.IsNullOrWhiteSpace(request.LinkedNoticeId))
                filtered = filtered.Where(p => p.LinkedNoticeId == request.LinkedNoticeId);
            var ordered = filtered.OrderByDescending(p => p.OpensAt).ToList();
            var page = request.Pagination.Page < 1 ? 1 : request.Pagination.Page;
            var pageSize = request.Pagination.PageSize < 1 ? 20 : request.Pagination.PageSize;
            var items = ordered.Skip((page - 1) * pageSize).Take(pageSize).Select(p => p.ToSummaryResponse()).ToList();

            return Result<PagedResult<PollSummaryResponse>>.Success(new PagedResult<PollSummaryResponse>(items, ordered.Count, page, pageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<PollSummaryResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

}
