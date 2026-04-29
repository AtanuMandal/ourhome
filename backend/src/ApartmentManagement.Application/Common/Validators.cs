using ApartmentManagement.Application.Commands.Society;
using ApartmentManagement.Application.Commands.Apartment;
using ApartmentManagement.Application.Commands.User;
using ApartmentManagement.Application.Commands.Amenity;
using ApartmentManagement.Application.Commands.Complaint;
using ApartmentManagement.Application.Commands.Notice;
using ApartmentManagement.Application.Commands.Visitor;
using ApartmentManagement.Application.Commands.Maintenance;
using ApartmentManagement.Application.Commands.Gamification;
using ApartmentManagement.Application.Commands.ServiceProvider;
using ApartmentManagement.Domain.Enums;
using FluentValidation;

namespace ApartmentManagement.Application.Validators;

internal static class ValidationPatterns
{
    internal const string TenDigitPhone = @"^\d{10}$";
}

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

public sealed class UpdateSocietyCommandValidator : AbstractValidator<UpdateSocietyCommand>
{
    public UpdateSocietyCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ContactEmail).NotEmpty().EmailAddress();
        RuleFor(x => x.ContactPhone).NotEmpty();
        RuleFor(x => x.TotalBlocks).GreaterThan(0);
        RuleFor(x => x.TotalApartments).GreaterThan(0);
        RuleFor(x => x.MaintenanceOverdueThresholdDays).InclusiveBetween(1, 90);
        When(x => x.SocietyUsers is not null, () =>
        {
            RuleForEach(x => x.SocietyUsers!)
                .ChildRules(user =>
                {
                    user.RuleFor(x => x.Email).NotEmpty().EmailAddress();
                    user.RuleFor(x => x.RoleTitle).NotEmpty().MaximumLength(100);
                });
        });
        When(x => x.Committees is not null, () =>
        {
            RuleForEach(x => x.Committees!)
                .ChildRules(committee =>
                {
                    committee.RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
                    committee.RuleForEach(x => x.Members)
                        .ChildRules(member =>
                        {
                            member.RuleFor(x => x.Email).NotEmpty().EmailAddress();
                            member.RuleFor(x => x.RoleTitle).NotEmpty().MaximumLength(100);
                        });
                });
        });
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
        RuleFor(x => x)
            .Must(x => string.IsNullOrWhiteSpace(x.OwnerId) || x.InitialResident is null)
            .WithMessage("Provide either ownerId or initialResident when onboarding an occupied apartment.");

        When(x => x.InitialResident is not null, () =>
        {
            RuleFor(x => x.InitialResident!.FullName).NotEmpty();
            RuleFor(x => x.InitialResident!.Email).NotEmpty().EmailAddress();
            RuleFor(x => x.InitialResident!.Phone).NotEmpty();
            RuleFor(x => x.InitialResident!.ResidentType)
                .Must(type => type is ResidentType.Owner or ResidentType.Tenant)
                .WithMessage("Initial resident must be an owner or tenant.");
        });
    }
}

public sealed class UpdateApartmentCommandValidator : AbstractValidator<UpdateApartmentCommand>
{
    public UpdateApartmentCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ApartmentId).NotEmpty();
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
        RuleFor(x => x.Phone)
            .NotEmpty()
            .Matches(ValidationPatterns.TenDigitPhone)
            .WithMessage("Phone must be exactly 10 digits.");
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

public sealed class TransferApartmentOwnershipCommandValidator : AbstractValidator<TransferApartmentOwnershipCommand>
{
    public TransferApartmentOwnershipCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ApartmentId).NotEmpty();
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Phone)
            .NotEmpty()
            .Matches(ValidationPatterns.TenDigitPhone)
            .WithMessage("Phone must be exactly 10 digits.");
    }
}

public sealed class TransferApartmentTenancyCommandValidator : AbstractValidator<TransferApartmentTenancyCommand>
{
    public TransferApartmentTenancyCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ApartmentId).NotEmpty();
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Phone)
            .NotEmpty()
            .Matches(ValidationPatterns.TenDigitPhone)
            .WithMessage("Phone must be exactly 10 digits.");
    }
}

public sealed class AddHouseholdMemberCommandValidator : AbstractValidator<AddHouseholdMemberCommand>
{
    public AddHouseholdMemberCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ApartmentId).NotEmpty();
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Phone)
            .NotEmpty()
            .Matches(ValidationPatterns.TenDigitPhone)
            .WithMessage("Phone must be exactly 10 digits.");
        RuleFor(x => x.ResidentType)
            .Must(type => type is ResidentType.FamilyMember or ResidentType.CoOccupant)
            .WithMessage("Only family members or co-occupants can be added with this action.");
    }
}

public sealed class AssignUserApartmentCommandValidator : AbstractValidator<AssignUserApartmentCommand>
{
    public AssignUserApartmentCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.ApartmentId).NotEmpty();
        RuleFor(x => x.ResidentType)
            .Must(type => type is ResidentType.Owner or ResidentType.Tenant)
            .WithMessage("Only owner or tenant apartment assignments are supported.");
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

// ─── Maintenance ─────────────────────────────────────────────────────────────

public sealed class CreateMaintenanceScheduleCommandValidator : AbstractValidator<CreateMaintenanceScheduleCommand>
{
    public CreateMaintenanceScheduleCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Rate).GreaterThan(0);
        RuleFor(x => x.DueDay).InclusiveBetween(1, 28);
        RuleFor(x => x.StartMonth).InclusiveBetween(1, 12);
        RuleFor(x => x.StartYear).InclusiveBetween(2000, 2100);
        RuleFor(x => x.EndMonth).InclusiveBetween(1, 12);
        RuleFor(x => x.EndYear).InclusiveBetween(2000, 2100);
        RuleFor(x => x.Frequency).IsInEnum();
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x)
            .Must(x => x.PricingType == MaintenancePricingType.FixedAmount ? x.AreaBasis is null : x.AreaBasis is not null)
            .WithMessage("Area basis is required only for per-square-foot maintenance schedules.");
        RuleFor(x => x)
            .Must(x =>
            {
                if (x.StartMonth is < 1 or > 12 || x.EndMonth is < 1 or > 12)
                    return true;

                return new DateOnly(x.EndYear, x.EndMonth, 1) >= new DateOnly(x.StartYear, x.StartMonth, 1);
            })
            .WithMessage("End month and year must be on or after the start month and year.");
    }
}

public sealed class UpdateMaintenanceScheduleCommandValidator : AbstractValidator<UpdateMaintenanceScheduleCommand>
{
    public UpdateMaintenanceScheduleCommandValidator()
    {
        RuleFor(x => x.ScheduleId).NotEmpty();
        RuleFor(x => x.EffectiveMonth).InclusiveBetween(1, 12);
        RuleFor(x => x.EffectiveYear).InclusiveBetween(2000, 2100);
        RuleFor(x => x.ChangeReason).NotEmpty().MaximumLength(500);
        RuleFor(x => x.SocietyId).NotEmpty();
    }
}

public sealed class DeleteMaintenanceScheduleCommandValidator : AbstractValidator<DeleteMaintenanceScheduleCommand>
{
    public DeleteMaintenanceScheduleCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ScheduleId).NotEmpty();
        RuleFor(x => x.ChangeReason).NotEmpty().MaximumLength(500);
    }
}

public sealed class SubmitMaintenancePaymentProofCommandValidator : AbstractValidator<SubmitMaintenancePaymentProofCommand>
{
    public SubmitMaintenancePaymentProofCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ChargeIds).NotEmpty();
        RuleForEach(x => x.ChargeIds).NotEmpty();
        RuleFor(x => x.ProofUrl).NotEmpty().MaximumLength(1000);
    }
}

public sealed class UploadMaintenanceProofCommandValidator : AbstractValidator<UploadMaintenanceProofCommand>
{
    public UploadMaintenanceProofCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.FileName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.ContentType).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Content).NotEmpty();
    }
}

public sealed class MarkMaintenanceChargePaidCommandValidator : AbstractValidator<MarkMaintenanceChargePaidCommand>
{
    public MarkMaintenanceChargePaidCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ChargeId).NotEmpty();
        RuleFor(x => x.PaymentMethod).NotEmpty().MaximumLength(100);
    }
}

public sealed class CreateMaintenancePenaltyChargeCommandValidator : AbstractValidator<CreateMaintenancePenaltyChargeCommand>
{
    public CreateMaintenancePenaltyChargeCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ApartmentId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(200);
        RuleFor(x => x.DueDate).NotEqual(default(DateTime));
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
