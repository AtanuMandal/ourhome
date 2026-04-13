// Superseded by SocietyModule.cs — do not compile
#if false
namespace ApartmentManagement.Application.Handlers.Superseded;

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

public sealed record CreateSocietyCommand(CreateSocietyRequest Request)
    : IRequest<Result<SocietyDto>>;

public sealed record UpdateSocietyCommand(string SocietyId, UpdateSocietyRequest Request)
    : IRequest<Result<SocietyDto>>;

public sealed record ActivateSocietyCommand(string SocietyId)
    : IRequest<Result<bool>>;

public sealed record DeactivateSocietyCommand(string SocietyId)
    : IRequest<Result<bool>>;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

public sealed record GetSocietyQuery(string SocietyId)
    : IRequest<Result<SocietyDto>>;

public sealed record ListSocietiesQuery(int Page, int PageSize)
    : IRequest<Result<PagedResult<SocietyDto>>>;

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

public sealed class CreateSocietyCommandHandler(
    ISocietyRepository societyRepository,
    IEventPublisher eventPublisher)
    : IRequestHandler<CreateSocietyCommand, Result<SocietyDto>>
{
    public async Task<Result<SocietyDto>> Handle(
        CreateSocietyCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var req = command.Request;

            var existing = await societyRepository
                .GetByRegistrationNumberAsync(req.RegistrationNumber, cancellationToken);
            if (existing is not null)
                return Result<SocietyDto>.Failure(
                    ErrorCodes.SocietyAlreadyExists,
                    "A society with this registration number already exists.");

            var address = new Address(req.AddressLine1, req.City, req.State, req.PostalCode, req.Country);
            var society = Society.Create(req.Name, address, req.ContactEmail, req.ContactPhone,
                totalBlocks: 1, totalApartments: 1);

            var saved = await societyRepository.CreateAsync(society, cancellationToken);

            foreach (var domainEvent in saved.DomainEvents)
                await eventPublisher.PublishAsync(domainEvent, cancellationToken);

            saved.ClearDomainEvents();

            return Result<SocietyDto>.Success(SocietyMapper.ToDto(saved));
        }
        catch (ArgumentException ex)
        {
            return Result<SocietyDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return Result<SocietyDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
    }
}

public sealed class UpdateSocietyCommandHandler(ISocietyRepository societyRepository)
    : IRequestHandler<UpdateSocietyCommand, Result<SocietyDto>>
{
    public async Task<Result<SocietyDto>> Handle(
        UpdateSocietyCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var society = await societyRepository
                .GetByIdAsync(command.SocietyId, command.SocietyId, cancellationToken);
            if (society is null)
                return Result<SocietyDto>.Failure(ErrorCodes.SocietyNotFound, "Society not found.");

            var req = command.Request;
            society.Update(
                req.Name         ?? society.Name,
                req.ContactEmail ?? society.ContactEmail,
                req.ContactPhone ?? society.ContactPhone,
                society.TotalBlocks,
                society.TotalApartments);

            var saved = await societyRepository.UpdateAsync(society, cancellationToken);
            return Result<SocietyDto>.Success(SocietyMapper.ToDto(saved));
        }
        catch (ArgumentException ex)
        {
            return Result<SocietyDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return Result<SocietyDto>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
    }
}

public sealed class ActivateSocietyCommandHandler(ISocietyRepository societyRepository)
    : IRequestHandler<ActivateSocietyCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(
        ActivateSocietyCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var society = await societyRepository
                .GetByIdAsync(command.SocietyId, command.SocietyId, cancellationToken);
            if (society is null)
                return Result<bool>.Failure(ErrorCodes.SocietyNotFound, "Society not found.");

            society.Activate();
            await societyRepository.UpdateAsync(society, cancellationToken);
            return Result<bool>.Success(true);
        }
        catch (ArgumentException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
    }
}

public sealed class DeactivateSocietyCommandHandler(ISocietyRepository societyRepository)
    : IRequestHandler<DeactivateSocietyCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(
        DeactivateSocietyCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var society = await societyRepository
                .GetByIdAsync(command.SocietyId, command.SocietyId, cancellationToken);
            if (society is null)
                return Result<bool>.Failure(ErrorCodes.SocietyNotFound, "Society not found.");

            society.Deactivate();
            await societyRepository.UpdateAsync(society, cancellationToken);
            return Result<bool>.Success(true);
        }
        catch (ArgumentException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return Result<bool>.Failure(ErrorCodes.ValidationFailed, ex.Message);
        }
    }
}

public sealed class GetSocietyQueryHandler(ISocietyRepository societyRepository)
    : IRequestHandler<GetSocietyQuery, Result<SocietyDto>>
{
    public async Task<Result<SocietyDto>> Handle(
        GetSocietyQuery query, CancellationToken cancellationToken)
    {
        var society = await societyRepository
            .GetByIdAsync(query.SocietyId, query.SocietyId, cancellationToken);
        if (society is null)
            return Result<SocietyDto>.Failure(ErrorCodes.SocietyNotFound, "Society not found.");

        return Result<SocietyDto>.Success(SocietyMapper.ToDto(society));
    }
}

public sealed class ListSocietiesQueryHandler(ISocietyRepository societyRepository)
    : IRequestHandler<ListSocietiesQuery, Result<PagedResult<SocietyDto>>>
{
    public async Task<Result<PagedResult<SocietyDto>>> Handle(
        ListSocietiesQuery query, CancellationToken cancellationToken)
    {
        var page     = query.Page     < 1 ? 1  : query.Page;
        var pageSize = query.PageSize < 1 ? 20 : query.PageSize;

        var totalCount = await societyRepository.CountAsync(cancellationToken);

        var active   = await societyRepository.GetByStatusAsync(SocietyStatus.Active,   1, int.MaxValue, cancellationToken);
        var draft    = await societyRepository.GetByStatusAsync(SocietyStatus.Draft,    1, int.MaxValue, cancellationToken);
        var inactive = await societyRepository.GetByStatusAsync(SocietyStatus.Inactive, 1, int.MaxValue, cancellationToken);

        var items = active
            .Concat(draft)
            .Concat(inactive)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(SocietyMapper.ToDto)
            .ToList();

        return Result<PagedResult<SocietyDto>>.Success(
            new PagedResult<SocietyDto>(items, totalCount, page, pageSize));
    }
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

internal static class SocietyMapper
{
    internal static SocietyDto ToDto(Society s) =>
        new(
            Id:                 s.Id,
            Name:               s.Name,
            RegistrationNumber: string.Empty,
            AddressLine1:       s.Address.Street,
            AddressLine2:       string.Empty,
            City:               s.Address.City,
            State:              s.Address.State,
            Country:            s.Address.Country,
            PostalCode:         s.Address.PostalCode,
            ContactEmail:       s.ContactEmail,
            ContactPhone:       s.ContactPhone,
            Website:            null,
            Status:             s.Status,
            CreatedAt:          s.CreatedAt,
            UpdatedAt:          s.UpdatedAt);
}
#endif
