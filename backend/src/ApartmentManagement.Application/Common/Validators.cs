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
using ApartmentManagement.Application.Commands.Staff;
using ApartmentManagement.Application.Commands.Dev;
using ApartmentManagement.Application.Commands.Sos;
using ApartmentManagement.Application.Commands.Poll;
using ApartmentManagement.Domain.Enums;
using FluentValidation;


namespace ApartmentManagement.Application.Validators;

internal static class ValidationPatterns
{
    internal const string TenDigitPhone = @"^\d{10}$";
}

internal static class CommonValidationRules
{
    internal static IRuleBuilderOptions<T, string> ValidEmail<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().EmailAddress();

    internal static IRuleBuilderOptions<T, string> ValidPhone<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().Matches(ValidationPatterns.TenDigitPhone).WithMessage("Phone must be exactly 10 digits.");

    internal static IRuleBuilderOptions<T, IReadOnlyList<string>> ValidParkingSlots<T>(this IRuleBuilder<T, IReadOnlyList<string>> rule) =>
        rule.NotNull().Must(slots => slots.Count <= 10).WithMessage("No more than 10 parking slots can be assigned.");

    internal static IRuleBuilderOptions<T, double> PositiveArea<T>(this IRuleBuilder<T, double> rule, string label) =>
        rule.GreaterThan(0).WithMessage($"{label} area must be greater than 0.");
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
        RuleFor(x => x.ParkingSlots).ValidParkingSlots();
        RuleForEach(x => x.ParkingSlots).NotEmpty().MaximumLength(50);
        RuleFor(x => x.CarpetArea).PositiveArea("Carpet");
        RuleFor(x => x.BuildUpArea).PositiveArea("BuildUp");
        RuleFor(x => x.SuperBuildArea).PositiveArea("SuperBuild");
        RuleFor(x => x)
            .Must(x => string.IsNullOrWhiteSpace(x.OwnerId) || x.InitialResident is null)
            .WithMessage("Provide either ownerId or initialResident when onboarding an occupied apartment.");

        When(x => x.InitialResident is not null, () =>
        {
            RuleFor(x => x.InitialResident!.FullName).NotEmpty();
            RuleFor(x => x.InitialResident!.Email).ValidEmail();
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
        RuleFor(x => x.ParkingSlots).ValidParkingSlots();
        RuleForEach(x => x.ParkingSlots).NotEmpty().MaximumLength(50);
        RuleFor(x => x.CarpetArea).PositiveArea("Carpet");
        RuleFor(x => x.BuildUpArea).PositiveArea("BuildUp");
        RuleFor(x => x.SuperBuildArea).PositiveArea("SuperBuild");
    }
}

// ─── User ─────────────────────────────────────────────────────────────────────

public sealed class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).ValidEmail();
        RuleFor(x => x.Phone).ValidPhone();
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
        When(x => x.Role == UserRole.SUSecurity, () =>
        {
            RuleFor(x => x.ApartmentId).Empty().WithMessage("Security personnel are not linked to an apartment.");
            RuleFor(x => x.ResidentType).Equal(ResidentType.SocietyAdmin)
                .WithMessage("Security personnel must have ResidentType = SocietyAdmin.");
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
        RuleFor(x => x.Email).ValidEmail();
        RuleFor(x => x.Phone).ValidPhone();
    }
}

public sealed class TransferApartmentTenancyCommandValidator : AbstractValidator<TransferApartmentTenancyCommand>
{
    public TransferApartmentTenancyCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ApartmentId).NotEmpty();
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).ValidEmail();
        RuleFor(x => x.Phone).ValidPhone();
    }
}

public sealed class AddHouseholdMemberCommandValidator : AbstractValidator<AddHouseholdMemberCommand>
{
    public AddHouseholdMemberCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ApartmentId).NotEmpty();
        RuleFor(x => x.FullName).NotEmpty();
        RuleFor(x => x.Email).ValidEmail();
        RuleFor(x => x.Phone).ValidPhone();
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
        RuleFor(x => x.StartTime).GreaterThan(_ => DateTime.UtcNow).WithMessage("Start time must be in the future.");
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
        RuleFor(x => x.PublishAt).GreaterThanOrEqualTo(_ => DateTime.UtcNow.AddMinutes(-5))
            .WithMessage("Publish date cannot be in the past.");
        RuleFor(x => x.SocietyId).NotEmpty();
    }
}

public sealed class UpdateNoticeCommandValidator : AbstractValidator<UpdateNoticeCommand>
{
    public UpdateNoticeCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.NoticeId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty();
        RuleFor(x => x.Content).NotEmpty();
    }
}

public sealed class MarkNoticeReadCommandValidator : AbstractValidator<MarkNoticeReadCommand>
{
    public MarkNoticeReadCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.NoticeId).NotEmpty();
        RuleFor(x => x.UserId).NotEmpty();
    }
}

// ─── Visitor ──────────────────────────────────────────────────────────────────

public sealed class RegisterVisitorCommandValidator : AbstractValidator<RegisterVisitorCommand>
{
    public RegisterVisitorCommandValidator()
    {
        RuleFor(x => x.VisitorName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(30);
        RuleFor(x => x.Purpose).NotEmpty().MaximumLength(150);
        RuleFor(x => x.ApartmentId).NotEmpty();
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.CompanyName).MaximumLength(150);
        RuleFor(x => x.VehicleNumber).MaximumLength(50);
        RuleFor(x => x.ValidityHours)
            .InclusiveBetween(1, 168)
            .When(x => x.ValidityHours.HasValue)
            .WithMessage("Validity hours must be between 1 and 168 (1 week).");
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
        RuleFor(x => x.StartDate).GreaterThan(_ => DateTime.UtcNow).WithMessage("Start date must be in the future.");
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

// ─── Staff Attendance ─────────────────────────────────────────────────────────

public sealed class CreateShiftCommandValidator : AbstractValidator<CreateShiftCommand>
{
    public CreateShiftCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.GraceMinutes).InclusiveBetween(0, 240);
    }
}

public sealed class CreateStaffCommandValidator : AbstractValidator<CreateStaffCommand>
{
    public CreateStaffCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(30);
        RuleFor(x => x.Category).IsInEnum();
        RuleFor(x => x.EmploymentType).IsInEnum();
    }
}

public sealed class UpdateStaffCommandValidator : AbstractValidator<UpdateStaffCommand>
{
    public UpdateStaffCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.StaffId).NotEmpty();
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(30);
    }
}

// ─── Dev / Test Data Seeding ──────────────────────────────────────────────────

public sealed class SeedTestDataCommandValidator : AbstractValidator<SeedTestDataCommand>
{
    public SeedTestDataCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ApartmentCount).InclusiveBetween(1, 20)
            .WithMessage("Apartment count must be between 1 and 20.");
    }
}

// ─── SOS Emergency Alerts ─────────────────────────────────────────────────────

public sealed class TriggerSosAlertCommandValidator : AbstractValidator<TriggerSosAlertCommand>
{
    public TriggerSosAlertCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.TriggeredByUserId).NotEmpty();
        RuleFor(x => x.Category).IsInEnum();
        RuleFor(x => x.Note).MaximumLength(500);
    }
}

// ─── Polls & AGM E-Voting ─────────────────────────────────────────────────────

public sealed class CreatePollCommandValidator : AbstractValidator<CreatePollCommand>
{
    public CreatePollCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.CreatedByUserId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.OptionTexts).Must(o => o.Count >= 2).WithMessage("A poll requires at least 2 options.");
        RuleFor(x => x.ClosesAt).GreaterThan(x => x.OpensAt).WithMessage("closesAt must be after opensAt.");
        RuleFor(x => x.EligibilityUnit).IsInEnum();
        RuleFor(x => x.Anonymity).IsInEnum();
        RuleFor(x => x.Visibility).IsInEnum();
        RuleFor(x => x.QuorumThresholdPercent).InclusiveBetween(0, 100).When(x => x.QuorumThresholdPercent.HasValue);
        RuleFor(x => x.TargetAudience).IsInEnum();
        RuleFor(x => x.TargetBlockNames)
            .Must(b => b != null && b.Count(name => !string.IsNullOrWhiteSpace(name)) == 1)
            .WithMessage("PerBlock target audience requires exactly one block.")
            .When(x => x.TargetAudience == PollTargetAudience.PerBlock);
        RuleFor(x => x.TargetBlockNames)
            .Must(b => b != null && b.Any(name => !string.IsNullOrWhiteSpace(name)))
            .WithMessage("MultipleBlock target audience requires at least one block.")
            .When(x => x.TargetAudience == PollTargetAudience.MultipleBlock);
    }
}

public sealed class CastVoteCommandValidator : AbstractValidator<CastVoteCommand>
{
    public CastVoteCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.PollId).NotEmpty();
        RuleFor(x => x.VoterUserId).NotEmpty();
        RuleFor(x => x.SelectedOptionIds).Must(o => o.Count > 0).WithMessage("At least one option must be selected.");
    }
}

public sealed class CreateAgmSessionCommandValidator : AbstractValidator<CreateAgmSessionCommand>
{
    public CreateAgmSessionCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.CreatedByUserId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(2000);
    }
}
