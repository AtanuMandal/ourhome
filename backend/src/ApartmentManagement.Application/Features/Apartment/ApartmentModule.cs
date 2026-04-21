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

namespace ApartmentManagement.Application.Commands.Apartment
{

// ─── Create Apartment ─────────────────────────────────────────────────────────

public record CreateApartmentCommand(
    string SocietyId, string ApartmentNumber, string BlockName, int FloorNumber,
    int NumberOfRooms, IReadOnlyList<string> ParkingSlots, string? OwnerId,
    double CarpetArea, double BuildUpArea, double SuperBuildArea, CreateApartmentResidentRequest? InitialResident = null)
    : IRequest<Result<ApartmentResponse>>;

public sealed class CreateApartmentCommandHandler(
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ISocietyRepository societyRepository,
    ICurrentUserService currentUserService,
    IEventPublisher eventPublisher,
    ILogger<CreateApartmentCommandHandler> logger)
    : IRequestHandler<CreateApartmentCommand, Result<ApartmentResponse>>
{
    public async Task<Result<ApartmentResponse>> Handle(CreateApartmentCommand request, CancellationToken ct)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(request.OwnerId) && request.InitialResident is not null)
                return Result<ApartmentResponse>.Failure(
                    ErrorCodes.ValidationFailed,
                    "Provide either ownerId or initialResident when onboarding an occupied apartment.");

            var existing = await apartmentRepository.GetByLocationAsync(
                request.SocietyId, request.BlockName, request.ApartmentNumber, request.FloorNumber, ct);
            if (existing is not null)
                return Result<ApartmentResponse>.Failure(ErrorCodes.ApartmentNumberDuplicate,
                    ApartmentLocationMessages.DuplicateLocationMessage(request.ApartmentNumber, request.BlockName, request.FloorNumber));

            Domain.Entities.User? resident = null;
            ResidentType? residentType = null;

            if (!string.IsNullOrWhiteSpace(request.OwnerId))
            {
                resident = await userRepository.GetByIdAsync(request.OwnerId, request.SocietyId, ct);
                if (resident is null)
                    return Result<ApartmentResponse>.Failure(ErrorCodes.UserNotFound, $"Resident with id '{request.OwnerId}' was not found.");
                if (resident.Role != UserRole.SUUser)
                    return Result<ApartmentResponse>.Failure(ErrorCodes.Conflict, "Only resident users can be linked as apartment occupants.");
                residentType = ResidentType.Owner;
            }
            else if (request.InitialResident is not null)
            {
                residentType = request.InitialResident.ResidentType;
                resident = await userRepository.GetByEmailAsync(request.SocietyId, request.InitialResident.Email.Trim().ToLowerInvariant(), ct);

                if (resident is not null && resident.Role != UserRole.SUUser)
                    return Result<ApartmentResponse>.Failure(ErrorCodes.Conflict, "Only resident users can be linked as apartment occupants.");
            }

            var apartment = Domain.Entities.Apartment.Create(
                request.SocietyId, request.ApartmentNumber, request.BlockName,
                request.FloorNumber, request.NumberOfRooms, request.ParkingSlots,
                request.CarpetArea, request.BuildUpArea, request.SuperBuildArea);

            var created = await apartmentRepository.CreateAsync(apartment, ct);

            if (residentType.HasValue)
            {
                if (resident is null && request.InitialResident is not null)
                {
                    resident = await userRepository.CreateAsync(
                        Domain.Entities.User.Create(
                            request.SocietyId,
                            request.InitialResident.FullName,
                            request.InitialResident.Email,
                            request.InitialResident.Phone,
                            UserRole.SUUser,
                            residentType.Value,
                            created.Id,
                            currentUserService.UserId),
                        ct);
                }

                if (residentType.Value == ResidentType.Owner)
                    created.AssignOwner(resident!.Id, resident.FullName);
                else
                    created.AssignTenant(resident!.Id, resident.FullName);

                created = await apartmentRepository.UpdateAsync(created, ct);
                resident.LinkApartment(created.Id, created.ToDisplayLabel(), residentType.Value, makePrimary: string.IsNullOrWhiteSpace(resident.ApartmentId));
                await userRepository.UpdateAsync(resident, ct);
            }

            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct);
            var apartmentCount = await apartmentRepository.CountBySocietyAsync(request.SocietyId, ct);
            if (society is not null && apartmentCount > society.TotalApartments)
            {
                society.Update(society.Name, society.ContactEmail, society.ContactPhone, society.TotalBlocks, apartmentCount);
                await societyRepository.UpdateAsync(society, ct);
            }

            foreach (var evt in created.DomainEvents)
                await eventPublisher.PublishAsync(evt, ct);
            created.ClearDomainEvents();

            return Result<ApartmentResponse>.Success(created.ToResponse());
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create apartment {Number}", request.ApartmentNumber);
            return Result<ApartmentResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Update Apartment ─────────────────────────────────────────────────────────

public record UpdateApartmentCommand(
    string SocietyId, string ApartmentId, string BlockName, int FloorNumber,
    int NumberOfRooms, IReadOnlyList<string> ParkingSlots,
    double CarpetArea, double BuildUpArea, double SuperBuildArea)
    : IRequest<Result<ApartmentResponse>>;

public sealed class UpdateApartmentCommandHandler(
    IApartmentRepository apartmentRepository,
    ILogger<UpdateApartmentCommandHandler> logger)
    : IRequestHandler<UpdateApartmentCommand, Result<ApartmentResponse>>
{
    public async Task<Result<ApartmentResponse>> Handle(UpdateApartmentCommand request, CancellationToken ct)
    {
        try
        {
            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct)
                ?? throw new NotFoundException("Apartment", request.ApartmentId);

            var existing = await apartmentRepository.GetByLocationAsync(
                request.SocietyId,
                request.BlockName,
                apartment.ApartmentNumber,
                request.FloorNumber,
                ct);

            if (existing is not null && !string.Equals(existing.Id, apartment.Id, StringComparison.Ordinal))
            {
                return Result<ApartmentResponse>.Failure(
                    ErrorCodes.ApartmentNumberDuplicate,
                    ApartmentLocationMessages.DuplicateLocationMessage(apartment.ApartmentNumber, request.BlockName, request.FloorNumber));
            }

            apartment.Update(request.BlockName, request.FloorNumber, request.NumberOfRooms, request.ParkingSlots,
                request.CarpetArea, request.BuildUpArea, request.SuperBuildArea);
            var updated = await apartmentRepository.UpdateAsync(apartment, ct);
            return Result<ApartmentResponse>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<ApartmentResponse>.Failure(ErrorCodes.ApartmentNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update apartment {ApartmentId}", request.ApartmentId);
            return Result<ApartmentResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Delete Apartment ─────────────────────────────────────────────────────────

public record DeleteApartmentCommand(string SocietyId, string ApartmentId) : IRequest<Result<bool>>;

public sealed class DeleteApartmentCommandHandler(
    IApartmentRepository apartmentRepository,
    ILogger<DeleteApartmentCommandHandler> logger)
    : IRequestHandler<DeleteApartmentCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DeleteApartmentCommand request, CancellationToken ct)
    {
        try
        {
            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct)
                ?? throw new NotFoundException("Apartment", request.ApartmentId);

            if (apartment.Status == ApartmentStatus.Occupied)
                return Result<bool>.Failure(ErrorCodes.ApartmentOccupied, "Cannot delete an occupied apartment.");

            await apartmentRepository.DeleteAsync(request.ApartmentId, request.SocietyId, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ApartmentNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete apartment {ApartmentId}", request.ApartmentId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Change Apartment Status ──────────────────────────────────────────────────

public record ChangeApartmentStatusCommand(
    string SocietyId, string ApartmentId, ApartmentStatus Status, string Reason)
    : IRequest<Result<bool>>;

public sealed class ChangeApartmentStatusCommandHandler(
    IApartmentRepository apartmentRepository,
    ILogger<ChangeApartmentStatusCommandHandler> logger)
    : IRequestHandler<ChangeApartmentStatusCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(ChangeApartmentStatusCommand request, CancellationToken ct)
    {
        try
        {
            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct)
                ?? throw new NotFoundException("Apartment", request.ApartmentId);

            switch (request.Status)
            {
                case ApartmentStatus.Available:
                    apartment.MarkAvailable();
                    break;
                case ApartmentStatus.UnderMaintenance:
                    apartment.MarkUnderMaintenance();
                    break;
                default:
                    return Result<bool>.Failure(ErrorCodes.ValidationFailed, $"Cannot manually set status to {request.Status}.");
            }

            await apartmentRepository.UpdateAsync(apartment, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ApartmentNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to change apartment status {ApartmentId}", request.ApartmentId);
            return Result<bool>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

// ─── Bulk Import Apartments ───────────────────────────────────────────────────

public record BulkImportApartmentsCommand(string SocietyId, List<CreateApartmentRequest> Apartments)
    : IRequest<Result<BulkImportResult>>;

public sealed class BulkImportApartmentsCommandHandler(
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository,
    ISocietyRepository societyRepository,
    IEventPublisher eventPublisher,
    ILogger<BulkImportApartmentsCommandHandler> logger)
    : IRequestHandler<BulkImportApartmentsCommand, Result<BulkImportResult>>
{
    public async Task<Result<BulkImportResult>> Handle(BulkImportApartmentsCommand request, CancellationToken ct)
    {
        int succeeded = 0;
        var errors = new List<string>();
        var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct);

        foreach (var req in request.Apartments)
        {
            try
            {
                var existing = await apartmentRepository.GetByLocationAsync(
                    request.SocietyId, req.BlockName, req.ApartmentNumber, req.FloorNumber, ct);
                if (existing is not null)
                {
                    errors.Add(ApartmentLocationMessages.DuplicateLocationMessage(req.ApartmentNumber, req.BlockName, req.FloorNumber));
                    continue;
                }

                var apartment = Domain.Entities.Apartment.Create(
                    request.SocietyId, req.ApartmentNumber, req.BlockName,
                    req.FloorNumber, req.NumberOfRooms, req.ParkingSlots,
                    req.CarpetArea,req.BuildUpArea,req.SuperBuildArea);

                if (!string.IsNullOrWhiteSpace(req.OwnerId))
                {
                    var owner = await userRepository.GetByIdAsync(req.OwnerId, request.SocietyId, ct);
                    if (owner is null)
                    {
                        errors.Add($"Apartment {req.ApartmentNumber}: resident with id '{req.OwnerId}' was not found.");
                        continue;
                    }

                    if (owner.Role != UserRole.SUUser)
                    {
                        errors.Add($"Apartment {req.ApartmentNumber}: only resident users can be linked as apartment occupants.");
                        continue;
                    }
                }

                var created = await apartmentRepository.CreateAsync(apartment, ct);
                if (!string.IsNullOrWhiteSpace(req.OwnerId))
                {
                    var owner = await userRepository.GetByIdAsync(req.OwnerId, request.SocietyId, ct);
                    if (owner is not null)
                    {
                        created.AssignOwner(owner.Id, owner.FullName);
                        created = await apartmentRepository.UpdateAsync(created, ct);
                        owner.LinkApartment(created.Id, created.ToDisplayLabel(), ResidentType.Owner, makePrimary: string.IsNullOrWhiteSpace(owner.ApartmentId));
                        await userRepository.UpdateAsync(owner, ct);
                    }
                }
                foreach (var evt in created.DomainEvents)
                    await eventPublisher.PublishAsync(evt, ct);
                created.ClearDomainEvents();
                succeeded++;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to import apartment {Number}", req.ApartmentNumber);
                errors.Add($"Apartment {req.ApartmentNumber}: {ex.Message}");
            }
        }

        if (succeeded > 0 && society is not null)
        {
            var apartmentCount = await apartmentRepository.CountBySocietyAsync(request.SocietyId, ct);
            if (apartmentCount > society.TotalApartments)
            {
                society.Update(society.Name, society.ContactEmail, society.ContactPhone, society.TotalBlocks, apartmentCount);
                await societyRepository.UpdateAsync(society, ct);
            }
        }

        var result = new BulkImportResult(request.Apartments.Count, succeeded,
            request.Apartments.Count - succeeded, errors);
        return Result<BulkImportResult>.Success(result);
    }
}

internal static class ApartmentLocationMessages
{
    internal static string DuplicateLocationMessage(string apartmentNumber, string blockName, int floorNumber) =>
        $"Apartment {apartmentNumber.Trim()} in block {blockName.Trim()} on floor {floorNumber} already exists in this society.";
}

// ─── Queries ──────────────────────────────────────────────────────────────────

}

namespace ApartmentManagement.Application.Queries.Apartment
{

public record GetApartmentQuery(string SocietyId, string ApartmentId) : IRequest<Result<ApartmentResponse>>;

public sealed class GetApartmentQueryHandler(IApartmentRepository apartmentRepository)
    : IRequestHandler<GetApartmentQuery, Result<ApartmentResponse>>
{
    public async Task<Result<ApartmentResponse>> Handle(GetApartmentQuery request, CancellationToken ct)
    {
        try
        {
            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct)
                ?? throw new NotFoundException("Apartment", request.ApartmentId);
            return Result<ApartmentResponse>.Success(apartment.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<ApartmentResponse>.Failure(ErrorCodes.ApartmentNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<ApartmentResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetApartmentResidentHistoryQuery(string SocietyId, string ApartmentId)
    : IRequest<Result<ApartmentResidentHistoryResponse>>;

public sealed class GetApartmentResidentHistoryQueryHandler(IApartmentRepository apartmentRepository)
    : IRequestHandler<GetApartmentResidentHistoryQuery, Result<ApartmentResidentHistoryResponse>>
{
    public async Task<Result<ApartmentResidentHistoryResponse>> Handle(GetApartmentResidentHistoryQuery request, CancellationToken ct)
    {
        try
        {
            var apartment = await apartmentRepository.GetByIdAsync(request.ApartmentId, request.SocietyId, ct)
                ?? throw new NotFoundException("Apartment", request.ApartmentId);

            return Result<ApartmentResidentHistoryResponse>.Success(apartment.ToResidentHistoryResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<ApartmentResidentHistoryResponse>.Failure(ErrorCodes.ApartmentNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<ApartmentResidentHistoryResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record GetApartmentsBySocietyQuery(
    string SocietyId, PaginationParams Pagination,
    ApartmentStatus? StatusFilter, string? BlockFilter)
    : IRequest<Result<PagedResult<ApartmentResponse>>>;

public sealed class GetApartmentsBySocietyQueryHandler(IApartmentRepository apartmentRepository)
    : IRequestHandler<GetApartmentsBySocietyQuery, Result<PagedResult<ApartmentResponse>>>
{
    public async Task<Result<PagedResult<ApartmentResponse>>> Handle(GetApartmentsBySocietyQuery request, CancellationToken ct)
    {
        try
        {
            IReadOnlyList<Domain.Entities.Apartment> apartments;
            if (request.StatusFilter.HasValue)
            {
                apartments = await apartmentRepository.GetByStatusAsync(
                    request.SocietyId, request.StatusFilter.Value,
                    request.Pagination.Page, request.Pagination.PageSize, ct);
            }
            else
            {
                apartments = await apartmentRepository.GetAllAsync(request.SocietyId, ct);
            }

            var filtered = request.BlockFilter is null
                ? apartments
                : apartments.Where(a => a.BlockName.Equals(request.BlockFilter, StringComparison.OrdinalIgnoreCase)).ToList();

            var items = filtered.Select(a => a.ToResponse()).ToList();
            return Result<PagedResult<ApartmentResponse>>.Success(
                new PagedResult<ApartmentResponse>(items, items.Count, request.Pagination.Page, request.Pagination.PageSize));
        }
        catch (Exception ex)
        {
            return Result<PagedResult<ApartmentResponse>>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
}
