// Superseded by ApartmentModule.cs — do not compile
#if false
using ApartmentManagement.Application.DTOs;

public sealed record UpdateApartmentCommand(string SocietyId, string ApartmentId, UpdateApartmentRequest Request)
    : IRequest<Result<ApartmentDto>>;

public sealed record AssignOwnerCommand(string SocietyId, string ApartmentId, string OwnerUserId)
    : IRequest<Result<bool>>;

public sealed record AssignTenantCommand(string SocietyId, string ApartmentId, string TenantUserId)
    : IRequest<Result<bool>>;

public sealed record RemoveTenantCommand(string SocietyId, string ApartmentId)
    : IRequest<Result<bool>>;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

public sealed record GetApartmentQuery(string SocietyId, string ApartmentId)
    : IRequest<Result<ApartmentDto>>;

public sealed record ListApartmentsQuery(string SocietyId, int Page, int PageSize, ApartmentStatus? Status = null)
    : IRequest<Result<PagedResult<ApartmentDto>>>;

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

public sealed class CreateApartmentCommandHandler(
    IApartmentRepository apartmentRepository,
    IEventPublisher eventPublisher)
    : IRequestHandler<CreateApartmentCommand, Result<ApartmentDto>>
{
    public async Task<Result<ApartmentDto>> Handle(
        CreateApartmentCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var req = command.Request;

            var existing = await apartmentRepository
                .GetByUnitNumberAsync(command.SocietyId, req.Block, req.UnitNumber, cancellationToken);
            if (existing is not null)
                return Result<ApartmentDto>.Failure(
                    ErrorCodes.ApartmentNumberDuplicate,
                    $"Apartment {req.Block}-{req.UnitNumber} already exists in this society.");

            var apartment = Apartment.Create(
                command.SocietyId,
                apartmentNumber: req.UnitNumber,
                blockName:       req.Block,
                floorNumber:     req.Floor,
                numberOfRooms:   req.Bedrooms,
                parkingSlots:    0);

            var saved = await apartmentRepository.CreateAsync(apartment, cancellationToken);

            foreach (var domainEvent in saved.DomainEvents)
                await eventPublisher.PublishAsync(domainEvent, cancellationToken);

            saved.ClearDomainEvents();

            return Result<ApartmentDto>.Success(ApartmentMapper.ToDto(saved));
        }
        catch (ArgumentException ex)
        {
            return Result<ApartmentDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return Result<ApartmentDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
    }
}

public sealed class UpdateApartmentCommandHandler(IApartmentRepository apartmentRepository)
    : IRequestHandler<UpdateApartmentCommand, Result<ApartmentDto>>
{
    public async Task<Result<ApartmentDto>> Handle(
        UpdateApartmentCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var apartment = await apartmentRepository
                .GetByIdAsync(command.ApartmentId, command.SocietyId, cancellationToken);
            if (apartment is null)
                return Result<ApartmentDto>.Failure(ErrorCodes.ApartmentNotFound, "Apartment not found.");

            var req = command.Request;
            apartment.Update(
                apartment.BlockName,
                apartment.FloorNumber,
                req.Bedrooms ?? apartment.NumberOfRooms,
                apartment.ParkingSlots);

            var saved = await apartmentRepository.UpdateAsync(apartment, cancellationToken);
            return Result<ApartmentDto>.Success(ApartmentMapper.ToDto(saved));
        }
        catch (ArgumentException ex)
        {
            return Result<ApartmentDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return Result<ApartmentDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
    }
}

public sealed class AssignOwnerCommandHandler(
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository)
    : IRequestHandler<AssignOwnerCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(
        AssignOwnerCommand command, CancellationToken cancellationToken)
    {
        var apartment = await apartmentRepository
            .GetByIdAsync(command.ApartmentId, command.SocietyId, cancellationToken);
        if (apartment is null)
            return Result<bool>.Failure(ErrorCodes.ApartmentNotFound, "Apartment not found.");

        var user = await userRepository
            .GetByIdAsync(command.OwnerUserId, command.SocietyId, cancellationToken);
        if (user is null)
            return Result<bool>.Failure(ErrorCodes.UserNotFound, "User not found.");

        apartment.AssignOwner(command.OwnerUserId);
        await apartmentRepository.UpdateAsync(apartment, cancellationToken);
        return Result<bool>.Success(true);
    }
}

public sealed class AssignTenantCommandHandler(
    IApartmentRepository apartmentRepository,
    IUserRepository userRepository)
    : IRequestHandler<AssignTenantCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(
        AssignTenantCommand command, CancellationToken cancellationToken)
    {
        var apartment = await apartmentRepository
            .GetByIdAsync(command.ApartmentId, command.SocietyId, cancellationToken);
        if (apartment is null)
            return Result<bool>.Failure(ErrorCodes.ApartmentNotFound, "Apartment not found.");

        var user = await userRepository
            .GetByIdAsync(command.TenantUserId, command.SocietyId, cancellationToken);
        if (user is null)
            return Result<bool>.Failure(ErrorCodes.UserNotFound, "User not found.");

        apartment.AssignTenant(command.TenantUserId);
        await apartmentRepository.UpdateAsync(apartment, cancellationToken);
        return Result<bool>.Success(true);
    }
}

public sealed class RemoveTenantCommandHandler(IApartmentRepository apartmentRepository)
    : IRequestHandler<RemoveTenantCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(
        RemoveTenantCommand command, CancellationToken cancellationToken)
    {
        var apartment = await apartmentRepository
            .GetByIdAsync(command.ApartmentId, command.SocietyId, cancellationToken);
        if (apartment is null)
            return Result<bool>.Failure(ErrorCodes.ApartmentNotFound, "Apartment not found.");

        apartment.RemoveTenant();
        await apartmentRepository.UpdateAsync(apartment, cancellationToken);
        return Result<bool>.Success(true);
    }
}

public sealed class GetApartmentQueryHandler(IApartmentRepository apartmentRepository)
    : IRequestHandler<GetApartmentQuery, Result<ApartmentDto>>
{
    public async Task<Result<ApartmentDto>> Handle(
        GetApartmentQuery query, CancellationToken cancellationToken)
    {
        var apartment = await apartmentRepository
            .GetByIdAsync(query.ApartmentId, query.SocietyId, cancellationToken);
        if (apartment is null)
            return Result<ApartmentDto>.Failure(ErrorCodes.ApartmentNotFound, "Apartment not found.");

        return Result<ApartmentDto>.Success(ApartmentMapper.ToDto(apartment));
    }
}

public sealed class ListApartmentsQueryHandler(IApartmentRepository apartmentRepository)
    : IRequestHandler<ListApartmentsQuery, Result<PagedResult<ApartmentDto>>>
{
    public async Task<Result<PagedResult<ApartmentDto>>> Handle(
        ListApartmentsQuery query, CancellationToken cancellationToken)
    {
        var page     = query.Page     < 1 ? 1  : query.Page;
        var pageSize = query.PageSize < 1 ? 20 : query.PageSize;

        if (query.Status.HasValue)
        {
            var paged = await apartmentRepository
                .GetByStatusAsync(query.SocietyId, query.Status.Value, page, pageSize, cancellationToken);
            var total = await apartmentRepository.CountBySocietyAsync(query.SocietyId, cancellationToken);
            var dtos  = paged.Select(ApartmentMapper.ToDto).ToList();
            return Result<PagedResult<ApartmentDto>>.Success(
                new PagedResult<ApartmentDto>(dtos, total, page, pageSize));
        }
        else
        {
            var all   = await apartmentRepository.GetAllAsync(query.SocietyId, cancellationToken);
            var total = all.Count;
            var dtos  = all
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(ApartmentMapper.ToDto)
                .ToList();
            return Result<PagedResult<ApartmentDto>>.Success(
                new PagedResult<ApartmentDto>(dtos, total, page, pageSize));
        }
    }
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

internal static class ApartmentMapper
{
    internal static ApartmentDto ToDto(Apartment a) =>
        new(
            Id:           a.Id,
            SocietyId:    a.SocietyId,
            Block:        a.BlockName,
            UnitNumber:   a.ApartmentNumber,
            Floor:        a.FloorNumber,
            Type:         string.Empty,
            AreaSqFt:     0m,
            Bedrooms:     a.NumberOfRooms,
            Bathrooms:    0,
            Status:       a.Status,
            OwnerUserId:  a.OwnerId,
            TenantUserId: a.TenantId,
            CreatedAt:    a.CreatedAt,
            UpdatedAt:    a.UpdatedAt);
}
#endif
