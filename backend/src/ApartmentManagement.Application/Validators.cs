using ApartmentManagement.Application.Commands.Society;
using ApartmentManagement.Application.Commands.Apartment;
using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.Commands.Amenity;
using ApartmentManagement.Application.Commands.Complaint;
using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Application.Commands.Gamification;
using ApartmentManagement.Application.Commands.ServiceProvider;
using ApartmentManagement.Domain.Enums;
using FluentValidation;

namespace ApartmentManagement.Application.Validators;

// ─── Society ──────────────────────────────────────────────────────────────────

public sealed class CreateSocietyCommandValidator : AbstractValidator<CreateSocietyCommand>
{
    public CreateSocietyCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContactEmail).NotEmpty().EmailAddress();
        RuleFor(x => x.ContactPhone).NotEmpty();
        RuleFor(x => x.TotalBlocks).GreaterThan(0);
        RuleFor(x => x.TotalApartments).GreaterThan(0);
        RuleFor(x => x.Street).NotEmpty();
        RuleFor(x => x.City).NotEmpty();
        RuleFor(x => x.State).NotEmpty();
        RuleFor(x => x.PostalCode).NotEmpty();
        RuleFor(x => x.Country).NotEmpty();
        // Initial Housing Officer (SUAdmin) validation
        RuleFor(x => x.AdminFullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.AdminEmail).NotEmpty().EmailAddress();
        RuleFor(x => x.AdminPhone).NotEmpty();
    }
}

// ─── Apartment ────────────────────────────────────────────────────────────────

public sealed class CreateApartmentCommandValidator : AbstractValidator<CreateApartmentCommand>
{
    public CreateApartmentCommandValidator()
    {
        RuleFor(x => x.ApartmentNumber).NotEmpty();
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.BlockName).NotEmpty();
        RuleFor(x => x.FloorNumber).GreaterThanOrEqualTo(0);
        RuleFor(x => x.NumberOfRooms).InclusiveBetween(1, 20);
        RuleFor(x => x.ParkingSlots).NotNull().Must(slots => slots.Count <= 10)
            .WithMessage("No more than 10 parking slots can be assigned.");
        RuleForEach(x => x.ParkingSlots).NotEmpty().MaximumLength(50);
        RuleFor(x => x.CarpetArea).GreaterThan(0).WithMessage("Carpet area must be greater than 0.");
        RuleFor(x => x.BuildUpArea).GreaterThan(0).WithMessage("BuildUp area must be greater than 0.");
        RuleFor(x => x.SuperBuildArea).GreaterThan(0).WithMessage("SuperBuild area must be greater than 0.");
    }
}

// ─── User ─────────────────────────────────────────────────────────────────────

public sealed class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Phone).NotEmpty();
        RuleFor(x => x.Role).IsInEnum();
        RuleFor(x => x.ResidentType).IsInEnum();
        RuleFor(x => x.SocietyId).NotEmpty();
        When(x => x.Role == UserRole.SUAdmin, () =>
        {
            RuleFor(x => x.ApartmentId).Empty();
            RuleFor(x => x.ResidentType).Equal(ResidentType.SocietyAdmin);
        });
        When(x => x.Role == UserRole.SUUser, () =>
        {
            RuleFor(x => x.ApartmentId)
                .NotEmpty()
                .When(x => x.ResidentType is ResidentType.Owner or ResidentType.Tenant or ResidentType.FamilyMember or ResidentType.CoOccupant);
        });
    }
}

// ─── Amenity ──────────────────────────────────────────────────────────────────

public sealed class BookAmenityCommandValidator : AbstractValidator<BookAmenityCommand>
{
    public BookAmenityCommandValidator()
    {
        RuleFor(x => x.AmenityId).NotEmpty();
        RuleFor(x => x.StartTime).GreaterThan(DateTime.UtcNow).WithMessage("Start time must be in the future.");
        RuleFor(x => x.EndTime).GreaterThan(x => x.StartTime).WithMessage("End time must be after start time.");
        RuleFor(x => x).Must(x => (x.EndTime - x.StartTime).TotalHours <= 8)
            .WithMessage("Booking duration cannot exceed 8 hours.");
    }
}

// ─── Complaint ────────────────────────────────────────────────────────────────

public sealed class CreateComplaintCommandValidator : AbstractValidator<CreateComplaintCommand>
{
    public CreateComplaintCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty();
        RuleFor(x => x.Category).IsInEnum();
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ApartmentId).NotEmpty();
    }
}

// ─── Notice ───────────────────────────────────────────────────────────────────

public sealed class CreateNoticeCommandValidator : AbstractValidator<CreateNoticeCommand>
{
    public CreateNoticeCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty();
        RuleFor(x => x.Content).NotEmpty();
        RuleFor(x => x.PublishAt).GreaterThanOrEqualTo(DateTime.UtcNow.AddMinutes(-5))
            .WithMessage("Publish date cannot be in the past.");
        RuleFor(x => x.SocietyId).NotEmpty();
    }
    //{CreateNoticeCommand { SocietyId = , UserId = 577df16c-19ca-4a30-b3ae-f439c9495bce, Title = ssgsgg, Content = sgsgsg, Category = General, PublishAt = 08-04-2026 11:53:00, ExpiresAt = , TargetApartmentIds =  }}
}

// ─── Visitor ──────────────────────────────────────────────────────────────────

public sealed class RegisterVisitorCommandValidator : AbstractValidator<RegisterVisitorCommand>
{
    public RegisterVisitorCommandValidator()
    {
        RuleFor(x => x.VisitorName).NotEmpty();
        RuleFor(x => x.Phone).NotEmpty();
        RuleFor(x => x.Purpose).NotEmpty();
        //RuleFor(x => x.HostApartmentId).NotEmpty(); -> TBD
        RuleFor(x => x.SocietyId).NotEmpty();
    }
}

// ─── Fee ─────────────────────────────────────────────────────────────────────



// ─── Gamification ─────────────────────────────────────────────────────────────

public sealed class CreateCompetitionCommandValidator : AbstractValidator<CreateCompetitionCommand>
{
    public CreateCompetitionCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty();
        RuleFor(x => x.StartDate).GreaterThan(DateTime.UtcNow).WithMessage("Start date must be in the future.");
        RuleFor(x => x.EndDate).GreaterThan(x => x.StartDate).WithMessage("End date must be after start date.");
        RuleFor(x => x.SocietyId).NotEmpty();
    }
}

// ─── ServiceProvider ──────────────────────────────────────────────────────────

public sealed class RegisterServiceProviderCommandValidator : AbstractValidator<RegisterServiceProviderCommand>
{
    public RegisterServiceProviderCommandValidator()
    {
        RuleFor(x => x.ProviderName).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.ServiceTypes).NotEmpty().WithMessage("At least one service type is required.");
    }
}
