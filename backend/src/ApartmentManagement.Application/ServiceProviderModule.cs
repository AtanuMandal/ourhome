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

namespace ApartmentManagement.Application.Commands.ServiceProvider
{

// ─── Register Service Provider ────────────────────────────────────────────────

public record RegisterServiceProviderCommand(
    string ProviderName, string ContactName, string Phone, string Email,
    List<string> ServiceTypes, string Description, string? SocietyId)
    : IRequest<Result<ServiceProviderResponse>>;

public sealed class RegisterServiceProviderCommandHandler(
    IServiceProviderRepository serviceProviderRepository,
    ILogger<RegisterServiceProviderCommandHandler> logger)
    : IRequestHandler<RegisterServiceProviderCommand, Result<ServiceProviderResponse>>
{
    public async Task<Result<ServiceProviderResponse>> Handle(RegisterServiceProviderCommand request, CancellationToken ct)
    {
        try
        {
            var provider = Domain.Entities.ServiceProvider.Create(
                request.ProviderName, request.ContactName, request.Phone, request.Email,
                request.ServiceTypes, request.Description, request.SocietyId);

            var created = await serviceProviderRepository.CreateAsync(provider, ct);
            return Result<ServiceProviderResponse>.Success(created.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to register service provider {Name}", request.ProviderName);
            return Result<ServiceProviderResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Approve Service Provider ─────────────────────────────────────────────────

public record ApproveServiceProviderCommand(string ProviderId) : IRequest<Result<bool>>;

public sealed class ApproveServiceProviderCommandHandler(
    IServiceProviderRepository serviceProviderRepository,
    ILogger<ApproveServiceProviderCommandHandler> logger)
    : IRequestHandler<ApproveServiceProviderCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ApproveServiceProviderCommand request, CancellationToken ct)
    {
        try
        {
            var provider = await serviceProviderRepository.GetByIdAsync(request.ProviderId, string.Empty, ct)
                ?? throw new NotFoundException("ServiceProvider", request.ProviderId);

            provider.Approve();
            await serviceProviderRepository.UpdateAsync(provider, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ServiceProviderNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to approve service provider {ProviderId}", request.ProviderId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Reject Service Provider ──────────────────────────────────────────────────

public record RejectServiceProviderCommand(string ProviderId) : IRequest<Result<bool>>;

public sealed class RejectServiceProviderCommandHandler(
    IServiceProviderRepository serviceProviderRepository,
    ILogger<RejectServiceProviderCommandHandler> logger)
    : IRequestHandler<RejectServiceProviderCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(RejectServiceProviderCommand request, CancellationToken ct)
    {
        try
        {
            var provider = await serviceProviderRepository.GetByIdAsync(request.ProviderId, string.Empty, ct)
                ?? throw new NotFoundException("ServiceProvider", request.ProviderId);

            provider.Reject();
            await serviceProviderRepository.UpdateAsync(provider, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ServiceProviderNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to reject service provider {ProviderId}", request.ProviderId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Create Service Request ───────────────────────────────────────────────────

public record CreateServiceRequestCommand(
    string SocietyId, string ApartmentId, string UserId,
    string ServiceType, string Description, DateTime PreferredDateTime)
    : IRequest<Result<ServiceRequestResponse>>;

public sealed class CreateServiceRequestCommandHandler(
    IServiceProviderRequestRepository requestRepository,
    IServiceProviderRepository providerRepository,
    INotificationService notificationService,
    ILogger<CreateServiceRequestCommandHandler> logger)
    : IRequestHandler<CreateServiceRequestCommand, Result<ServiceRequestResponse>>
{
    public async Task<Result<ServiceRequestResponse>> Handle(CreateServiceRequestCommand request, CancellationToken ct)
    {
        try
        {
            var serviceRequest = ServiceProviderRequest.Create(
                request.SocietyId, request.ApartmentId, request.UserId,
                request.ServiceType, request.Description, request.PreferredDateTime);

            var created = await requestRepository.CreateAsync(serviceRequest, ct);

            var matchingProviders = await providerRepository.GetByServiceTypeAsync(
                request.SocietyId, request.ServiceType, 1, 50, ct);

            foreach (var provider in matchingProviders.Where(p => p.Status == ServiceProviderStatus.Approved))
            {
                if (!string.IsNullOrWhiteSpace(provider.ContactEmail))
                    await notificationService.SendEmailAsync(
                        provider.ContactEmail,
                        "New Service Request",
                        $"A new {request.ServiceType} request has been posted. Description: {request.Description}", ct);
            }

            return Result<ServiceRequestResponse>.Success(created.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create service request for apartment {ApartmentId}", request.ApartmentId);
            return Result<ServiceRequestResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Accept Service Request ───────────────────────────────────────────────────

public record AcceptServiceRequestCommand(string SocietyId, string RequestId, string ProviderId)
    : IRequest<Result<bool>>;

public sealed class AcceptServiceRequestCommandHandler(
    IServiceProviderRequestRepository requestRepository,
    IServiceProviderRepository providerRepository,
    ILogger<AcceptServiceRequestCommandHandler> logger)
    : IRequestHandler<AcceptServiceRequestCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(AcceptServiceRequestCommand request, CancellationToken ct)
    {
        try
        {
            var provider = await providerRepository.GetByIdAsync(request.ProviderId, request.SocietyId, ct);
            if (provider is null)
                return Result<bool>.Failure(ErrorCodes.ServiceProviderNotFound, "Service provider not found.");

            if (provider.Status != ServiceProviderStatus.Approved)
                return Result<bool>.Failure(ErrorCodes.ServiceProviderNotApproved,
                    "Service provider is not approved.");

            var serviceRequest = await requestRepository.GetByIdAsync(request.RequestId, request.SocietyId, ct);
            if (serviceRequest is null)
                return Result<bool>.Failure(ErrorCodes.ServiceRequestNotFound, "Service request not found.");

            if (serviceRequest.Status != ServiceRequestStatus.Open)
                return Result<bool>.Failure(ErrorCodes.ServiceRequestNotOpen,
                    "Service request is not open for acceptance.");

            serviceRequest.Accept(request.ProviderId);
            await requestRepository.UpdateAsync(serviceRequest, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.NotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to accept service request {RequestId}", request.RequestId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Complete Service Request ─────────────────────────────────────────────────

public record CompleteServiceRequestCommand(string SocietyId, string RequestId) : IRequest<Result<bool>>;

public sealed class CompleteServiceRequestCommandHandler(
    IServiceProviderRequestRepository requestRepository,
    ILogger<CompleteServiceRequestCommandHandler> logger)
    : IRequestHandler<CompleteServiceRequestCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(CompleteServiceRequestCommand request, CancellationToken ct)
    {
        try
        {
            var serviceRequest = await requestRepository.GetByIdAsync(request.RequestId, request.SocietyId, ct)
                ?? throw new NotFoundException("ServiceRequest", request.RequestId);

            serviceRequest.Complete();
            await requestRepository.UpdateAsync(serviceRequest, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ServiceRequestNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to complete service request {RequestId}", request.RequestId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Add Service Review ───────────────────────────────────────────────────────

public record AddServiceReviewCommand(string SocietyId, string RequestId, string UserId, int Rating, string Comment)
    : IRequest<Result<bool>>;

public sealed class AddServiceReviewCommandHandler(
    IServiceProviderRequestRepository requestRepository,
    IServiceProviderRepository providerRepository,
    ILogger<AddServiceReviewCommandHandler> logger)
    : IRequestHandler<AddServiceReviewCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(AddServiceReviewCommand request, CancellationToken ct)
    {
        try
        {
            var serviceRequest = await requestRepository.GetByIdAsync(request.RequestId, request.SocietyId, ct)
                ?? throw new NotFoundException("ServiceRequest", request.RequestId);

            if (serviceRequest.RequestedByUserId != request.UserId)
                throw new ForbiddenException("Only the requester can add a review.");

            serviceRequest.AddReview(request.Rating, request.Comment);
            await requestRepository.UpdateAsync(serviceRequest, ct);

            if (!string.IsNullOrWhiteSpace(serviceRequest.AcceptedByProviderId))
            {
                var provider = await providerRepository.GetByIdAsync(
                    serviceRequest.AcceptedByProviderId, string.Empty, ct);
                if (provider is not null)
                {
                    provider.UpdateRating(request.Rating);
                    await providerRepository.UpdateAsync(provider, ct);
                }
            }

            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ServiceRequestNotFound, ex.Message);
        }
        catch (ForbiddenException ex)
        {
            return Result<bool>.Failure(ErrorCodes.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to add review for service request {RequestId}", request.RequestId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

}

namespace ApartmentManagement.Application.Queries.ServiceProvider
{

public record GetServiceProvidersQuery(string? ServiceType, PaginationParams Pagination)
    : IRequest<Result<PagedResult<ServiceProviderResponse>>>;

public sealed class GetServiceProvidersQueryHandler(IServiceProviderRepository serviceProviderRepository)
    : IRequestHandler<GetServiceProvidersQuery, Result<PagedResult<ServiceProviderResponse>>>
{
    public async Task<Result<PagedResult<ServiceProviderResponse>>> Handle(GetServiceProvidersQuery request, CancellationToken ct)
    {
        try
        {
            IReadOnlyList<Domain.Entities.ServiceProvider> providers;
            if (!string.IsNullOrWhiteSpace(request.ServiceType))
            {
                providers = await serviceProviderRepository.GetByServiceTypeAsync(
                    string.Empty, request.ServiceType,
                    request.Pagination.Page, request.Pagination.PageSize, ct);
            }
            else
            {
                providers = await serviceProviderRepository.GetApprovedAsync(string.Empty, ct);
            }

            var items = providers.Select(p => p.ToResponse()).ToList();
            return Result<PagedResult<ServiceProviderResponse>>.Success(
                new PagedResult<ServiceProviderResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<ServiceProviderResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetServiceRequestsQuery(string SocietyId, ServiceRequestStatus? Status, PaginationParams Pagination)
    : IRequest<Result<PagedResult<ServiceRequestResponse>>>;

public sealed class GetServiceRequestsQueryHandler(IServiceProviderRequestRepository requestRepository)
    : IRequestHandler<GetServiceRequestsQuery, Result<PagedResult<ServiceRequestResponse>>>
{
    public async Task<Result<PagedResult<ServiceRequestResponse>>> Handle(GetServiceRequestsQuery request, CancellationToken ct)
    {
        try
        {
            IReadOnlyList<ServiceProviderRequest> requests;
            if (request.Status.HasValue)
            {
                requests = await requestRepository.GetByStatusAsync(
                    request.SocietyId, request.Status.Value,
                    request.Pagination.Page, request.Pagination.PageSize, ct);
            }
            else
            {
                requests = await requestRepository.GetAllAsync(request.SocietyId, ct);
            }

            var items = requests.Select(r => r.ToResponse()).ToList();
            return Result<PagedResult<ServiceRequestResponse>>.Success(
                new PagedResult<ServiceRequestResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<ServiceRequestResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetMyServiceRequestsQuery(string SocietyId, string ApartmentId, PaginationParams Pagination)
    : IRequest<Result<PagedResult<ServiceRequestResponse>>>;

public sealed class GetMyServiceRequestsQueryHandler(IServiceProviderRequestRepository requestRepository)
    : IRequestHandler<GetMyServiceRequestsQuery, Result<PagedResult<ServiceRequestResponse>>>
{
    public async Task<Result<PagedResult<ServiceRequestResponse>>> Handle(GetMyServiceRequestsQuery request, CancellationToken ct)
    {
        try
        {
            var all = await requestRepository.GetAllAsync(request.SocietyId, ct);
            var filtered = all.Where(r => r.ApartmentId == request.ApartmentId).ToList();
            var items = filtered.Select(r => r.ToResponse()).ToList();
            return Result<PagedResult<ServiceRequestResponse>>.Success(
                new PagedResult<ServiceRequestResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<ServiceRequestResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
}