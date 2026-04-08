using ApartmentManagement.Application.Commands.Society;
using ApartmentManagement.Application.Commands.Apartment;
using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.Commands.Amenity;
using ApartmentManagement.Application.Commands.Complaint;
using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Application.Commands.Fee;
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
    }
}

// ─── Apartment ────────────────────────────────────────────────────────────────

public sealed class CreateApartmentCommandValidator : AbstractValidator<CreateApartmentCommand>
{
    public CreateApartmentCommandValidator()
    {
        RuleFor(x => x.ApartmentNumber).NotEmpty();
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.FloorNumber).GreaterThanOrEqualTo(0);
        RuleFor(x => x.NumberOfRooms).InclusiveBetween(1, 20);
        RuleFor(x => x.ParkingSlots).InclusiveBetween(0, 10);
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
        RuleFor(x => x.SocietyId).NotEmpty();
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
}

// ─── Visitor ──────────────────────────────────────────────────────────────────

public sealed class RegisterVisitorCommandValidator : AbstractValidator<RegisterVisitorCommand>
{
    public RegisterVisitorCommandValidator()
    {
        RuleFor(x => x.VisitorName).NotEmpty();
        RuleFor(x => x.Phone).NotEmpty();
        RuleFor(x => x.Purpose).NotEmpty();
        RuleFor(x => x.HostApartmentId).NotEmpty();
        RuleFor(x => x.SocietyId).NotEmpty();
    }
}

// ─── Fee ─────────────────────────────────────────────────────────────────────

public sealed class CreateFeeScheduleCommandValidator : AbstractValidator<CreateFeeScheduleCommand>
{
    public CreateFeeScheduleCommandValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.DueDay).InclusiveBetween(1, 28);
        RuleFor(x => x.Frequency).IsInEnum();
        RuleFor(x => x.ApartmentId).NotEmpty();
        RuleFor(x => x.SocietyId).NotEmpty();
    }
}

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
