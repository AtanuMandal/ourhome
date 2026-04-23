using ApartmentManagement.Application.Commands.VendorPayments;
using ApartmentManagement.Domain.Enums;
using FluentValidation;

namespace ApartmentManagement.Application.Common;

public sealed class CreateVendorCommandValidator : AbstractValidator<CreateVendorCommand>
{
    public CreateVendorCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Street).NotEmpty().MaximumLength(200);
        RuleFor(x => x.City).NotEmpty().MaximumLength(100);
        RuleFor(x => x.State).NotEmpty().MaximumLength(100);
        RuleFor(x => x.PostalCode).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Country).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ContactFirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ContactLastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ContactPhone).NotEmpty().MaximumLength(30);
        RuleFor(x => x.ContactEmail).NotEmpty().EmailAddress();
        RuleFor(x => x.Overview).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.ValidUptoDate).NotEqual(default(DateTime));
        RuleFor(x => x.PaymentDueDays).InclusiveBetween(0, 180);
        RuleFor(x => x.PictureUrl).MaximumLength(1000).When(x => !string.IsNullOrWhiteSpace(x.PictureUrl));
        RuleFor(x => x.ContractUrl).MaximumLength(1000).When(x => !string.IsNullOrWhiteSpace(x.ContractUrl));
        RuleFor(x => x.GeographicServiceArea).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.GeographicServiceArea));
        RuleFor(x => x.BusinessType).MaximumLength(120).When(x => !string.IsNullOrWhiteSpace(x.BusinessType));
    }
}

public sealed class UpdateVendorCommandValidator : AbstractValidator<UpdateVendorCommand>
{
    public UpdateVendorCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.VendorId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Street).NotEmpty().MaximumLength(200);
        RuleFor(x => x.City).NotEmpty().MaximumLength(100);
        RuleFor(x => x.State).NotEmpty().MaximumLength(100);
        RuleFor(x => x.PostalCode).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Country).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ContactFirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ContactLastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ContactPhone).NotEmpty().MaximumLength(30);
        RuleFor(x => x.ContactEmail).NotEmpty().EmailAddress();
        RuleFor(x => x.Overview).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.ValidUptoDate).NotEqual(default(DateTime));
        RuleFor(x => x.PaymentDueDays).InclusiveBetween(0, 180);
        RuleFor(x => x.PictureUrl).MaximumLength(1000).When(x => !string.IsNullOrWhiteSpace(x.PictureUrl));
        RuleFor(x => x.ContractUrl).MaximumLength(1000).When(x => !string.IsNullOrWhiteSpace(x.ContractUrl));
        RuleFor(x => x.GeographicServiceArea).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.GeographicServiceArea));
        RuleFor(x => x.BusinessType).MaximumLength(120).When(x => !string.IsNullOrWhiteSpace(x.BusinessType));
    }
}

public sealed class UploadVendorDocumentCommandValidator : AbstractValidator<UploadVendorDocumentCommand>
{
    public UploadVendorDocumentCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.DocumentType).NotEmpty().Must(value =>
                value.Equals("picture", StringComparison.OrdinalIgnoreCase)
                || value.Equals("contract", StringComparison.OrdinalIgnoreCase)
                || value.Equals("receipt", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Document type must be picture, contract, or receipt.");
        RuleFor(x => x.FileName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.ContentType).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Content).NotEmpty();
    }
}

public sealed class CreateVendorRecurringScheduleCommandValidator : AbstractValidator<CreateVendorRecurringScheduleCommand>
{
    public CreateVendorRecurringScheduleCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.VendorId).NotEmpty();
        RuleFor(x => x.Frequency).IsInEnum();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.StartDate).NotEqual(default(DateTime));
        RuleFor(x => x.EndDate)
            .GreaterThanOrEqualTo(x => x.StartDate)
            .When(x => x.EndDate.HasValue);
        RuleFor(x => x.Label).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.Label));
    }
}

public sealed class UpdateVendorRecurringScheduleCommandValidator : AbstractValidator<UpdateVendorRecurringScheduleCommand>
{
    public UpdateVendorRecurringScheduleCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ScheduleId).NotEmpty();
        RuleFor(x => x)
            .Must(x => x.EndDate.HasValue || x.InactiveFromDate.HasValue)
            .WithMessage("Either schedule end date or inactive-from date is required.");
        RuleFor(x => x.EndDate)
            .NotEqual(default(DateTime))
            .When(x => x.EndDate.HasValue);
        RuleFor(x => x.InactiveFromDate)
            .NotEqual(default(DateTime))
            .When(x => x.InactiveFromDate.HasValue);
    }
}

public sealed class CreateVendorOneTimeChargeCommandValidator : AbstractValidator<CreateVendorOneTimeChargeCommand>
{
    public CreateVendorOneTimeChargeCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.VendorId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.EffectiveDate).NotEqual(default(DateTime));
        RuleFor(x => x.Description).MaximumLength(300).When(x => !string.IsNullOrWhiteSpace(x.Description));
    }
}

public sealed class MarkVendorChargePaidCommandValidator : AbstractValidator<MarkVendorChargePaidCommand>
{
    public MarkVendorChargePaidCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ChargeId).NotEmpty();
        RuleFor(x => x.PaymentDate).NotEqual(default(DateTime));
        RuleFor(x => x.PaymentMethod).NotEmpty().MaximumLength(100);
        RuleFor(x => x.TransactionReference).MaximumLength(120).When(x => !string.IsNullOrWhiteSpace(x.TransactionReference));
        RuleFor(x => x.ReceiptUrl).NotEmpty().MaximumLength(1000);
    }
}

public sealed class InactivateVendorChargeCommandValidator : AbstractValidator<InactivateVendorChargeCommand>
{
    public InactivateVendorChargeCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ChargeId).NotEmpty();
    }
}

public sealed class ActivateVendorChargeCommandValidator : AbstractValidator<ActivateVendorChargeCommand>
{
    public ActivateVendorChargeCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ChargeId).NotEmpty();
    }
}

public sealed class DeleteVendorChargeCommandValidator : AbstractValidator<DeleteVendorChargeCommand>
{
    public DeleteVendorChargeCommandValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ChargeId).NotEmpty();
    }
}
