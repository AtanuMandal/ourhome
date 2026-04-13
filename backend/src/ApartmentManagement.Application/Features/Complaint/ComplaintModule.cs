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

namespace ApartmentManagement.Application.Commands.Complaint
{

// ─── Create Complaint ─────────────────────────────────────────────────────────

public record CreateComplaintCommand(
    string SocietyId, string ApartmentId, string UserId,
    string Title, string Description, ComplaintCategory Category,
    ComplaintPriority Priority, List<string> AttachmentUrls)
    : IRequest<Result<ComplaintResponse>>;

public sealed class CreateComplaintCommandHandler(
    IComplaintRepository complaintRepository,
    IEventPublisher eventPublisher,
    ILogger<CreateComplaintCommandHandler> logger)
    : IRequestHandler<CreateComplaintCommand, Result<ComplaintResponse>>
{
    public async Task<Result<ComplaintResponse>> Handle(CreateComplaintCommand request, CancellationToken ct)
    {
        try
        {
            var complaint = Domain.Entities.Complaint.Create(
                request.SocietyId, request.ApartmentId, request.UserId,
                request.Title, request.Description, request.Category, request.Priority,
                request.AttachmentUrls);

            var created = await complaintRepository.CreateAsync(complaint, ct);

            foreach (var evt in created.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            created.ClearDomainEvents();

            return Result<ComplaintResponse>.Success(created.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create complaint for apartment {ApartmentId}", request.ApartmentId);
            return Result<ComplaintResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Update Complaint Status ──────────────────────────────────────────────────

public record UpdateComplaintStatusCommand(
    string SocietyId, string ComplaintId, ComplaintStatus Status,
    string? AssignedToUserId, string? Notes)
    : IRequest<Result<ComplaintResponse>>;

public sealed class UpdateComplaintStatusCommandHandler(
    IComplaintRepository complaintRepository,
    IEventPublisher eventPublisher,
    ILogger<UpdateComplaintStatusCommandHandler> logger)
    : IRequestHandler<UpdateComplaintStatusCommand, Result<ComplaintResponse>>
{
    public async Task<Result<ComplaintResponse>> Handle(UpdateComplaintStatusCommand request, CancellationToken ct)
    {
        try
        {
            var complaint = await complaintRepository.GetByIdAsync(request.ComplaintId, request.SocietyId, ct)
                ?? throw new NotFoundException("Complaint", request.ComplaintId);

            switch (request.Status)
            {
                case ComplaintStatus.InProgress:
                    if (string.IsNullOrWhiteSpace(request.AssignedToUserId))
                        return Result<ComplaintResponse>.Failure(ErrorCodes.ValidationFailed, "AssignedToUserId is required for InProgress status.");
                    complaint.Assign(request.AssignedToUserId);
                    break;
                case ComplaintStatus.Resolved:
                    complaint.Resolve();
                    break;
                case ComplaintStatus.Closed:
                    complaint.Close();
                    break;
                case ComplaintStatus.Rejected:
                    complaint.Reject(request.Notes ?? string.Empty);
                    break;
                default:
                    return Result<ComplaintResponse>.Failure(ErrorCodes.ValidationFailed, $"Invalid status transition to {request.Status}.");
            }

            var updated = await complaintRepository.UpdateAsync(complaint, ct);

            foreach (var evt in updated.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            updated.ClearDomainEvents();

            return Result<ComplaintResponse>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<ComplaintResponse>.Failure(ErrorCodes.ComplaintNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update complaint status {ComplaintId}", request.ComplaintId);
            return Result<ComplaintResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Assign Complaint ─────────────────────────────────────────────────────────

public record AssignComplaintCommand(string SocietyId, string ComplaintId, string AssignedToUserId)
    : IRequest<Result<bool>>;

public sealed class AssignComplaintCommandHandler(
    IComplaintRepository complaintRepository,
    ILogger<AssignComplaintCommandHandler> logger)
    : IRequestHandler<AssignComplaintCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(AssignComplaintCommand request, CancellationToken ct)
    {
        try
        {
            var complaint = await complaintRepository.GetByIdAsync(request.ComplaintId, request.SocietyId, ct)
                ?? throw new NotFoundException("Complaint", request.ComplaintId);

            complaint.Assign(request.AssignedToUserId);
            await complaintRepository.UpdateAsync(complaint, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ComplaintNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to assign complaint {ComplaintId}", request.ComplaintId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Add Complaint Feedback ───────────────────────────────────────────────────

public record AddComplaintFeedbackCommand(
    string SocietyId, string ComplaintId, string UserId, int Rating, string? Comment)
    : IRequest<Result<bool>>;

public sealed class AddComplaintFeedbackCommandHandler(
    IComplaintRepository complaintRepository,
    ILogger<AddComplaintFeedbackCommandHandler> logger)
    : IRequestHandler<AddComplaintFeedbackCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(AddComplaintFeedbackCommand request, CancellationToken ct)
    {
        try
        {
            var complaint = await complaintRepository.GetByIdAsync(request.ComplaintId, request.SocietyId, ct)
                ?? throw new NotFoundException("Complaint", request.ComplaintId);

            if (complaint.RaisedByUserId != request.UserId)
                throw new ForbiddenException("Only the complaint raiser can add feedback.");

            complaint.AddFeedback(request.Rating, request.Comment);
            await complaintRepository.UpdateAsync(complaint, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ComplaintNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<bool>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to add feedback to complaint {ComplaintId}", request.ComplaintId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

}

namespace ApartmentManagement.Application.Queries.Complaint
{

public record GetComplaintQuery(string SocietyId, string ComplaintId) : IRequest<Result<ComplaintResponse>>;

public sealed class GetComplaintQueryHandler(IComplaintRepository complaintRepository)
    : IRequestHandler<GetComplaintQuery, Result<ComplaintResponse>>
{
    public async Task<Result<ComplaintResponse>> Handle(GetComplaintQuery request, CancellationToken ct)
    {
        try
        {
            var complaint = await complaintRepository.GetByIdAsync(request.ComplaintId, request.SocietyId, ct)
                ?? throw new NotFoundException("Complaint", request.ComplaintId);
            return Result<ComplaintResponse>.Success(complaint.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<ComplaintResponse>.Failure(ErrorCodes.ComplaintNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<ComplaintResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetComplaintsBySocietyQuery(
    string SocietyId, PaginationParams Pagination,
    ComplaintStatus? StatusFilter, ComplaintCategory? CategoryFilter)
    : IRequest<Result<PagedResult<ComplaintResponse>>>;

public sealed class GetComplaintsBySocietyQueryHandler(IComplaintRepository complaintRepository)
    : IRequestHandler<GetComplaintsBySocietyQuery, Result<PagedResult<ComplaintResponse>>>
{
    public async Task<Result<PagedResult<ComplaintResponse>>> Handle(GetComplaintsBySocietyQuery request, CancellationToken ct)
    {
        try
        {
            IReadOnlyList<Domain.Entities.Complaint> complaints;
            if (request.StatusFilter.HasValue)
            {
                complaints = await complaintRepository.GetByStatusAsync(
                    request.SocietyId, request.StatusFilter.Value,
                    request.Pagination.Page, request.Pagination.PageSize, ct);
            }
            else
            {
                complaints = await complaintRepository.GetAllAsync(request.SocietyId, ct);
            }

            if (request.CategoryFilter.HasValue)
                complaints = complaints.Where(c => c.Category == request.CategoryFilter.Value).ToList();

            var items = complaints.Select(c => c.ToResponse()).ToList();
            return Result<PagedResult<ComplaintResponse>>.Success(
                new PagedResult<ComplaintResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<ComplaintResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetComplaintsByApartmentQuery(string SocietyId, string ApartmentId, PaginationParams Pagination)
    : IRequest<Result<PagedResult<ComplaintResponse>>>;

public sealed class GetComplaintsByApartmentQueryHandler(IComplaintRepository complaintRepository)
    : IRequestHandler<GetComplaintsByApartmentQuery, Result<PagedResult<ComplaintResponse>>>
{
    public async Task<Result<PagedResult<ComplaintResponse>>> Handle(GetComplaintsByApartmentQuery request, CancellationToken ct)
    {
        try
        {
            var all = await complaintRepository.GetAllAsync(request.SocietyId, ct);
            var filtered = all.Where(c => c.ApartmentId == request.ApartmentId).ToList();
            var items = filtered.Select(c => c.ToResponse()).ToList();
            return Result<PagedResult<ComplaintResponse>>.Success(
                new PagedResult<ComplaintResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<ComplaintResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
}