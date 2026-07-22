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
    string SocietyId,
    string Name,
    string ContactEmail,
    string ContactPhone,
    int TotalBlocks,
    int TotalApartments,
    int MaintenanceOverdueThresholdDays,
    IReadOnlyList<SocietyUserAssignmentRequest>? SocietyUsers,
    IReadOnlyList<SocietyCommitteeRequest>? Committees,
    // Address fields are optional — omitted (all-null) means "leave the address unchanged".
    // Populated by the HQAdmin society-edit flow, which manages address but never SocietyUsers/Committees.
    string? Street = null, string? City = null, string? State = null, string? PostalCode = null, string? Country = null,
    // Omitted (null) means "leave the theme unchanged".
    string? ThemeId = null,
    // Omitted (null) means "leave unchanged". Changing MaxUsersPerApartment is HQAdmin-only.
    int? MaxUsersPerApartment = null,
    int? VisitorOverstayThresholdHours = null)
    : IRequest<Result<SocietyResponse>>;

public sealed class UpdateSocietyCommandHandler(
    ISocietyRepository societyRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUserService,
    ILogger<UpdateSocietyCommandHandler> logger)
    : IRequestHandler<UpdateSocietyCommand, Result<SocietyResponse>>
{
    public async Task<Result<SocietyResponse>> Handle(UpdateSocietyCommand request, CancellationToken ct)
    {
        try
        {
            // HQAdmin manages any society platform-wide (checked via the JWT role, since an HQAdmin's own
            // record lives in the "hq" partition, not this society's). A society's own SUAdmin manages
            // their own society, looked up within this society's partition.
            var isHqAdmin = string.Equals(currentUserService.Role, "HQAdmin", StringComparison.OrdinalIgnoreCase);
            if (!isHqAdmin)
            {
                var actor = await userRepository.GetByIdAsync(currentUserService.UserId, request.SocietyId, ct);
                if (actor is null || actor.Role != UserRole.SUAdmin)
                    return Result<SocietyResponse>.Failure(ErrorCodes.Forbidden, "Only society admins can update society details.");
            }

            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            // The number of apartments and the per-apartment user cap are platform-controlled values —
            // a SUAdmin sees them on the society page but only HQAdmin may change them.
            if (!isHqAdmin)
            {
                if (request.TotalApartments > 0 && request.TotalApartments != society.TotalApartments)
                    return Result<SocietyResponse>.Failure(ErrorCodes.Forbidden,
                        "Only the platform administrator can change the number of apartments.");
                if (request.MaxUsersPerApartment.HasValue && request.MaxUsersPerApartment.Value != society.MaxUsersPerApartment)
                    return Result<SocietyResponse>.Failure(ErrorCodes.Forbidden,
                        "Only the platform administrator can change the per-apartment user cap.");
            }

            Address? address = null;
            if (request.Street is not null || request.City is not null || request.State is not null
                || request.PostalCode is not null || request.Country is not null)
            {
                address = new Address(
                    request.Street ?? society.Address.Street,
                    request.City ?? society.Address.City,
                    request.State ?? society.Address.State,
                    request.PostalCode ?? society.Address.PostalCode,
                    request.Country ?? society.Address.Country);
            }

            society.Update(request.Name, request.ContactEmail, request.ContactPhone,
                request.TotalBlocks, request.TotalApartments, request.MaintenanceOverdueThresholdDays, address, request.ThemeId);

            if (isHqAdmin && request.MaxUsersPerApartment.HasValue)
                society.SetMaxUsersPerApartment(request.MaxUsersPerApartment.Value);
            if (request.VisitorOverstayThresholdHours.HasValue)
                society.SetVisitorOverstayThreshold(request.VisitorOverstayThresholdHours.Value);

            // SocietyUsers/Committees are omitted (null) by callers that only manage name/address/contact
            // (e.g. the HQAdmin society-edit flow) — only touch leadership when the caller actually sent it.
            if (request.SocietyUsers is not null || request.Committees is not null)
            {
                var societyUsers = await ResolveSocietyUsersAsync(request.SocietyId, request.SocietyUsers ?? [], userRepository, ct);
                var committees = new List<Domain.Entities.Society.SocietyCommittee>((request.Committees ?? []).Count);
                var userIdsOnCommittees = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var committee in request.Committees ?? [])
                {
                    if (string.IsNullOrWhiteSpace(committee.Name))
                        return Result<SocietyResponse>.Failure(ErrorCodes.ValidationFailed, "Committee name is required.");

                    var members = await ResolveSocietyUsersAsync(request.SocietyId, committee.Members ?? [], userRepository, ct);
                    foreach (var member in members)
                    {
                        if (!userIdsOnCommittees.Add(member.UserId))
                            return Result<SocietyResponse>.Failure(ErrorCodes.UserAlreadyOnCommittee,
                                $"{member.FullName} is already assigned to a committee role. A user can only hold one committee role at a time.");
                    }
                    committees.Add(new Domain.Entities.Society.SocietyCommittee(committee.Name.Trim(), members));
                }

                society.UpdateLeadership(societyUsers, committees);
            }

            var updated = await societyRepository.UpdateAsync(society, ct);
            return Result<SocietyResponse>.Success(updated.ToResponse());
        }
        catch (ValidationException ex)
        {
            return Result<SocietyResponse>.Failure(ErrorCodes.ValidationFailed, ex.Message);
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

    private static async Task<IReadOnlyList<Domain.Entities.Society.SocietyUserReference>> ResolveSocietyUsersAsync(
        string societyId,
        IReadOnlyList<SocietyUserAssignmentRequest> requests,
        IUserRepository userRepository,
        CancellationToken ct)
    {
        var users = new List<Domain.Entities.Society.SocietyUserReference>(requests.Count);
        var seenEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var request in requests)
        {
            var email = request.Email?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(email))
                throw new ValidationException("societyUsers", "Society user email is required.");
            if (string.IsNullOrWhiteSpace(request.RoleTitle))
                throw new ValidationException("societyUsers", "Society user role title is required.");
            if (!seenEmails.Add(email))
                throw new ValidationException("societyUsers", $"Duplicate society user email '{email}' is not allowed.");

            var user = await userRepository.GetByEmailAsync(societyId, email, ct);
            if (user is null)
                throw new ValidationException("societyUsers", $"Resident with email '{email}' was not found in this society.");

            users.Add(new Domain.Entities.Society.SocietyUserReference(
                user.Id,
                user.FullName,
                user.Email,
                request.RoleTitle.Trim()));
        }

        return users;
    }
}

// ─── Society Branding (logo / sidenav background) ─────────────────────────────

public record UploadSocietyLogoCommand(
    string SocietyId, string FileName, string ContentType, byte[] Content)
    : IRequest<Result<SocietyLogoUploadResponse>>;

public sealed class UploadSocietyLogoCommandHandler(
    ISocietyRepository societyRepository,
    IUserRepository userRepository,
    IFileStorageService fileStorageService,
    ICurrentUserService currentUserService,
    ILogger<UploadSocietyLogoCommandHandler> logger)
    : IRequestHandler<UploadSocietyLogoCommand, Result<SocietyLogoUploadResponse>>
{
    private const string ContainerName = "society-logos";

    public async Task<Result<SocietyLogoUploadResponse>> Handle(UploadSocietyLogoCommand request, CancellationToken ct)
    {
        try
        {
            var authError = await SocietyBrandingAuthorization.AuthorizeSocietyBrandingChangeAsync(
                request.SocietyId, currentUserService, userRepository, ct);
            if (authError is not null)
                return Result<SocietyLogoUploadResponse>.Failure(ErrorCodes.Forbidden, authError);

            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            var extension = System.IO.Path.GetExtension(request.FileName);
            var blobName = $"{request.SocietyId}/{Guid.NewGuid():N}{extension}";

            await using var stream = new System.IO.MemoryStream(request.Content, writable: false);
            await fileStorageService.UploadAsync(stream, blobName, request.ContentType, ContainerName, ct);

            // Store an app-relative path (served via GetFileQuery) instead of a raw blob/SAS URL.
            var appUrl = $"files/{ContainerName}/{blobName}";
            society.SetLogoUrl(appUrl);
            await societyRepository.UpdateAsync(society, ct);

            return Result<SocietyLogoUploadResponse>.Success(new SocietyLogoUploadResponse(appUrl));
        }
        catch (NotFoundException ex)
        {
            return Result<SocietyLogoUploadResponse>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upload logo for society {SocietyId}", request.SocietyId);
            return Result<SocietyLogoUploadResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record UploadSocietyBackgroundImageCommand(
    string SocietyId, string FileName, string ContentType, byte[] Content)
    : IRequest<Result<SocietyBackgroundImageUploadResponse>>;

public sealed class UploadSocietyBackgroundImageCommandHandler(
    ISocietyRepository societyRepository,
    IUserRepository userRepository,
    IFileStorageService fileStorageService,
    ICurrentUserService currentUserService,
    ILogger<UploadSocietyBackgroundImageCommandHandler> logger)
    : IRequestHandler<UploadSocietyBackgroundImageCommand, Result<SocietyBackgroundImageUploadResponse>>
{
    private const string ContainerName = "society-backgrounds";

    public async Task<Result<SocietyBackgroundImageUploadResponse>> Handle(UploadSocietyBackgroundImageCommand request, CancellationToken ct)
    {
        try
        {
            var authError = await SocietyBrandingAuthorization.AuthorizeSocietyBrandingChangeAsync(
                request.SocietyId, currentUserService, userRepository, ct);
            if (authError is not null)
                return Result<SocietyBackgroundImageUploadResponse>.Failure(ErrorCodes.Forbidden, authError);

            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            var extension = System.IO.Path.GetExtension(request.FileName);
            var blobName = $"{request.SocietyId}/{Guid.NewGuid():N}{extension}";

            await using var stream = new System.IO.MemoryStream(request.Content, writable: false);
            await fileStorageService.UploadAsync(stream, blobName, request.ContentType, ContainerName, ct);

            // Store an app-relative path (served via GetFileQuery) instead of a raw blob/SAS URL.
            var appUrl = $"files/{ContainerName}/{blobName}";
            society.SetSidenavBackgroundUrl(appUrl);
            await societyRepository.UpdateAsync(society, ct);

            return Result<SocietyBackgroundImageUploadResponse>.Success(new SocietyBackgroundImageUploadResponse(appUrl));
        }
        catch (NotFoundException ex)
        {
            return Result<SocietyBackgroundImageUploadResponse>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upload sidenav background image for society {SocietyId}", request.SocietyId);
            return Result<SocietyBackgroundImageUploadResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record RemoveSocietyLogoCommand(string SocietyId) : IRequest<Result<SocietyResponse>>;

public sealed class RemoveSocietyLogoCommandHandler(
    ISocietyRepository societyRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUserService,
    ILogger<RemoveSocietyLogoCommandHandler> logger)
    : IRequestHandler<RemoveSocietyLogoCommand, Result<SocietyResponse>>
{
    public async Task<Result<SocietyResponse>> Handle(RemoveSocietyLogoCommand request, CancellationToken ct)
    {
        try
        {
            var authError = await SocietyBrandingAuthorization.AuthorizeSocietyBrandingChangeAsync(
                request.SocietyId, currentUserService, userRepository, ct);
            if (authError is not null)
                return Result<SocietyResponse>.Failure(ErrorCodes.Forbidden, authError);

            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            society.SetLogoUrl(null);
            var updated = await societyRepository.UpdateAsync(society, ct);
            return Result<SocietyResponse>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<SocietyResponse>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to remove logo for society {SocietyId}", request.SocietyId);
            return Result<SocietyResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

public record RemoveSocietyBackgroundImageCommand(string SocietyId) : IRequest<Result<SocietyResponse>>;

public sealed class RemoveSocietyBackgroundImageCommandHandler(
    ISocietyRepository societyRepository,
    IUserRepository userRepository,
    ICurrentUserService currentUserService,
    ILogger<RemoveSocietyBackgroundImageCommandHandler> logger)
    : IRequestHandler<RemoveSocietyBackgroundImageCommand, Result<SocietyResponse>>
{
    public async Task<Result<SocietyResponse>> Handle(RemoveSocietyBackgroundImageCommand request, CancellationToken ct)
    {
        try
        {
            var authError = await SocietyBrandingAuthorization.AuthorizeSocietyBrandingChangeAsync(
                request.SocietyId, currentUserService, userRepository, ct);
            if (authError is not null)
                return Result<SocietyResponse>.Failure(ErrorCodes.Forbidden, authError);

            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            society.SetSidenavBackgroundUrl(null);
            var updated = await societyRepository.UpdateAsync(society, ct);
            return Result<SocietyResponse>.Success(updated.ToResponse());
        }
        catch (NotFoundException ex)
        {
            return Result<SocietyResponse>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to remove background image for society {SocietyId}", request.SocietyId);
            return Result<SocietyResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}

/// <summary>Shared by both branding upload handlers: HQAdmin manages any society; a society's
/// own SUAdmin manages their own society. Returns null when authorized, or an error message.</summary>
file static class SocietyBrandingAuthorization
{
    public static async Task<string?> AuthorizeSocietyBrandingChangeAsync(
        string societyId,
        ICurrentUserService currentUserService,
        IUserRepository userRepository,
        CancellationToken ct)
    {
        if (string.Equals(currentUserService.Role, "HQAdmin", StringComparison.OrdinalIgnoreCase))
            return null;

        var actor = await userRepository.GetByIdAsync(currentUserService.UserId, societyId, ct);
        return actor is null || actor.Role != UserRole.SUAdmin
            ? "Only society admins can update society branding."
            : null;
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

// ─── Deactivate Society ───────────────────────────────────────────────────────

public record DeactivateSocietyCommand(string SocietyId) : IRequest<Result<bool>>;

public sealed class DeactivateSocietyCommandHandler(
    ISocietyRepository societyRepository,
    ILogger<DeactivateSocietyCommandHandler> logger)
    : IRequestHandler<DeactivateSocietyCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(DeactivateSocietyCommand request, CancellationToken ct)
    {
        try
        {
            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            society.Deactivate();
            await societyRepository.UpdateAsync(society, ct);
            return Result<bool>.Success(true);
        }
        catch (NotFoundException ex)
        {
            return Result<bool>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to deactivate society {SocietyId}", request.SocietyId);
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
            var all = await societyRepository.GetAllAcrossSocietiesAsync(
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

/// <summary>
/// Occupancy snapshot for HQAdmin/HQUser — apartment and owner/tenant counts only, no financial data
/// (requirements/UserAndAccess.md: "HQAdmin and HQUser should be able to pull a report regarding the
/// society — how many apartments, how many owner/tenant — no financial data").
/// </summary>
public record GetSocietySummaryReportQuery(string SocietyId) : IRequest<Result<SocietySummaryReportResponse>>;

public sealed class GetSocietySummaryReportQueryHandler(
    ISocietyRepository societyRepository, IApartmentRepository apartmentRepository, IUserRepository userRepository)
    : IRequestHandler<GetSocietySummaryReportQuery, Result<SocietySummaryReportResponse>>
{
    public async Task<Result<SocietySummaryReportResponse>> Handle(GetSocietySummaryReportQuery request, CancellationToken ct)
    {
        try
        {
            var society = await societyRepository.GetByIdAsync(request.SocietyId, request.SocietyId, ct)
                ?? throw new NotFoundException("Society", request.SocietyId);

            var apartments = await apartmentRepository.GetAllAsync(request.SocietyId, ct);
            var occupied = apartments.Count(a => a.Status == Domain.Enums.ApartmentStatus.Occupied);
            var underMaintenance = apartments.Count(a => a.Status == Domain.Enums.ApartmentStatus.UnderMaintenance);
            var vacant = apartments.Count - occupied - underMaintenance;

            var residents = await userRepository.GetAllAsync(request.SocietyId, ct);
            var owners = residents.Count(u => u.Role == Domain.Enums.UserRole.SUUser && u.ResidentType == Domain.Enums.ResidentType.Owner);
            var tenants = residents.Count(u => u.Role == Domain.Enums.UserRole.SUUser && u.ResidentType == Domain.Enums.ResidentType.Tenant);
            var totalResidents = residents.Count(u => u.Role == Domain.Enums.UserRole.SUUser);

            return Result<SocietySummaryReportResponse>.Success(new SocietySummaryReportResponse(
                society.Id, society.Name, society.Status.ToString(),
                apartments.Count, occupied, vacant, underMaintenance,
                owners, tenants, totalResidents));
        }
        catch (NotFoundException ex)
        {
            return Result<SocietySummaryReportResponse>.Failure(ErrorCodes.SocietyNotFound, ex.Message);
        }
        catch (Exception ex)
        {
            return Result<SocietySummaryReportResponse>.Failure(ErrorCodes.InternalError, ex.Message);
        }
    }
}
}
