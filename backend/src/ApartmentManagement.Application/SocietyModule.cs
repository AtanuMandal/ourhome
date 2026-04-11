using ApartmentManagement.Application.DTOs;
using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Application.Mappings;
using ApartmentManagement.Domain.Entities;
using ApartmentManagement.Domain.Enums;
using ApartmentManagement.Domain.Events;
using ApartmentManagement.Domain.Repositories;
using ApartmentManagement.Domain.ValueObjects;
using ApartmentManagement.Shared.Constants;
using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ApartmentManagement.Application.Commands.Society
{

// ─── Create Society ───────────────────────────────────────────────────────────

/// <summary>
/// Creates a new society and atomically seeds the first SUAdmin (Housing Officer).
/// Only HQAdmin users should be permitted to call this endpoint.
/// </summary>
public record CreateSocietyCommand(
    string Name, string Street, string City, string State, string PostalCode, string Country,
    string ContactEmail, string ContactPhone, int TotalBlocks, int TotalApartments,
    // First Housing Officer (SUAdmin) account seeded at creation time
    string AdminFullName, string AdminEmail, string AdminPhone)
    : IRequest<Result<CreateSocietyResponse>>;

public sealed class CreateSocietyCommandHandler(
    ISocietyRepository societyRepository,
    IUserRepository userRepository,
    IEventPublisher eventPublisher,
    ILogger<CreateSocietyCommandHandler> logger)
    : IRequestHandler<CreateSocietyCommand, Result<CreateSocietyResponse>>
{
    public async Task<Result<CreateSocietyResponse>> Handle(CreateSocietyCommand request, CancellationToken ct)
    {
        try
        {
            var address = new Address(request.Street, request.City, request.State, request.PostalCode, request.Country);
            var society = Domain.Entities.Society.Create(
                request.Name, address, request.ContactEmail, request.ContactPhone,
                request.TotalBlocks, request.TotalApartments);

            var createdSociety = await societyRepository.CreateAsync(society, ct);

            // Create the first SUAdmin (Housing Officer) for this society
            var adminUser = Domain.Entities.User.Create(
                createdSociety.Id, request.AdminFullName, request.AdminEmail,
                request.AdminPhone, UserRole.SUAdmin, ResidentType.SocietyAdmin);

            var createdAdmin = await userRepository.CreateAsync(adminUser, ct);

            // Link the admin to the society
            createdSociety.AssignAdmin(createdAdmin.Id);
            await societyRepository.UpdateAsync(createdSociety, ct);

            foreach (var evt in createdSociety.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            createdSociety.ClearDomainEvents();

            foreach (var evt in createdAdmin.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            createdAdmin.ClearDomainEvents();

            return Result<CreateSocietyResponse>.Success(
                new CreateSocietyResponse(createdSociety.ToResponse(), createdAdmin.ToResponse()));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create society {Name}", request.Name);
            return Result<CreateSocietyResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Update Society ───────────────────────────────────────────────────────────

public record UpdateSocietyCommand(
    string SocietyId, string Name, string ContactEmail, string ContactPhone,
    int TotalBlocks, int TotalApartments)
    : IRequest<Result<SocietyResponse>>;

public sealed class UpdateSocietyCommandHandler(
    ISocietyRepository societyRepository,
    ILogger<UpdateSocietyCommandHandler> logger)
    : IRequestHandler<UpdateSocietyCommand, Result<SocietyResponse>>
{
    public async Task<Result<SocietyResponse>> Handle(UpdateSocietyCommand request, CancellationToken ct)
    {
        try
        {
            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            society.Update(request.Name, request.ContactEmail, request.ContactPhone,
                request.TotalBlocks, request.TotalApartments);

            var updated = await societyRepository.UpdateAsync(society, ct);
            return Result<SocietyResponse>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<SocietyResponse>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update society {SocietyId}", request.SocietyId);
            return Result<SocietyResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Publish Society ──────────────────────────────────────────────────────────

public record PublishSocietyCommand(string SocietyId) : IRequest<Result<bool>>;

public sealed class PublishSocietyCommandHandler(
    ISocietyRepository societyRepository,
    ILogger<PublishSocietyCommandHandler> logger)
    : IRequestHandler<PublishSocietyCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(PublishSocietyCommand request, CancellationToken ct)
    {
        try
        {
            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            society.Activate();
            await societyRepository.UpdateAsync(society, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to publish society {SocietyId}", request.SocietyId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Assign Admin ─────────────────────────────────────────────────────────────

public record AssignAdminCommand(string SocietyId, string UserId) : IRequest<Result<bool>>;

public sealed class AssignAdminCommandHandler(
    ISocietyRepository societyRepository,
    IUserRepository userRepository,
    ILogger<AssignAdminCommandHandler> logger)
    : IRequestHandler<AssignAdminCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(AssignAdminCommand request, CancellationToken ct)
    {
        try
        {
            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            var user = await userRepository.GetByIdAsync(request.UserId, request.SocietyId, ct)
                ?? throw new NotFoundException("User", request.UserId);

            society.AssignAdmin(request.UserId);
            await societyRepository.UpdateAsync(society, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.NotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to assign admin {UserId} to society {SocietyId}", request.UserId, request.SocietyId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Configure Fee Structure ──────────────────────────────────────────────────

public record ConfigureFeeStructureCommand(
    string SocietyId, decimal BaseAmount, decimal PerRoomCharge, decimal ParkingCharge, string Currency)
    : IRequest<Result<bool>>;

public sealed class ConfigureFeeStructureCommandHandler(
    ISocietyRepository societyRepository,
    ILogger<ConfigureFeeStructureCommandHandler> logger)
    : IRequestHandler<ConfigureFeeStructureCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ConfigureFeeStructureCommand request, CancellationToken ct)
    {
        try
        {
            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            var feeStructure = new MaintenanceFeeStructure(
                request.BaseAmount, request.PerRoomCharge, request.ParkingCharge, request.Currency);
            society.ConfigureFeeStructure(feeStructure);
            await societyRepository.UpdateAsync(society, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to configure fee structure for society {SocietyId}", request.SocietyId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

}

namespace ApartmentManagement.Application.Queries.Society
{

public record GetSocietyQuery(string SocietyId) : IRequest<Result<SocietyResponse>>;

public sealed class GetSocietyQueryHandler(ISocietyRepository societyRepository)
    : IRequestHandler<GetSocietyQuery, Result<SocietyResponse>>
{
    public async Task<Result<SocietyResponse>> Handle(GetSocietyQuery request, CancellationToken ct)
    {
        try
        {
            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);
            return Result<SocietyResponse>.Success(society.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<SocietyResponse>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<SocietyResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetAllSocietiesQuery(PaginationParams Pagination) : IRequest<Result<PagedResult<SocietyResponse>>>;

public sealed class GetAllSocietiesQueryHandler(ISocietyRepository societyRepository)
    : IRequestHandler<GetAllSocietiesQuery, Result<PagedResult<SocietyResponse>>>
{
    public async Task<Result<PagedResult<SocietyResponse>>> Handle(GetAllSocietiesQuery request, CancellationToken ct)
    {
        try
        {
            var all = await societyRepository.GetByStatusAsync(
                Domain.Enums.SocietyStatus.Active,
                request.Pagination.Page,
                request.Pagination.PageSize,
                ct);
            var total = await societyRepository.CountAsync(ct);
            var items = all.Select(s => s.ToResponse()).ToList();
            return Result<PagedResult<SocietyResponse>>.Success(
                new PagedResult<SocietyResponse>(items, total, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<SocietyResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
}
