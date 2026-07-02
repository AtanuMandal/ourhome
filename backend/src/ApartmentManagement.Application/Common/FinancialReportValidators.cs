using ApartmentManagement.Application.Queries.FinancialReport;
using FluentValidation;

namespace ApartmentManagement.Application.Validators;

public sealed class GetCashFlowQueryValidator : AbstractValidator<GetCashFlowQuery>
{
    public GetCashFlowQueryValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.FromMonth).InclusiveBetween(1, 12);
        RuleFor(x => x.FromYear).InclusiveBetween(2000, 2100);
        RuleFor(x => x.ToMonth).InclusiveBetween(1, 12);
        RuleFor(x => x.ToYear).InclusiveBetween(2000, 2100);
        RuleFor(x => x).Must(x =>
        {
            var from = x.FromYear * 12 + x.FromMonth;
            var to = x.ToYear * 12 + x.ToMonth;
            return to >= from && (to - from) <= 23;
        }).WithMessage("Date range must be chronological and no longer than 24 months.");
    }
}

public sealed class GetApartmentLedgerQueryValidator : AbstractValidator<GetApartmentLedgerQuery>
{
    public GetApartmentLedgerQueryValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ApartmentId).NotEmpty();
    }
}

public sealed class GetPersonalStatementQueryValidator : AbstractValidator<GetPersonalStatementQuery>
{
    public GetPersonalStatementQueryValidator()
    {
        RuleFor(x => x.SocietyId).NotEmpty();
        RuleFor(x => x.ApartmentId).NotEmpty();
        When(x => x.Year.HasValue, () => RuleFor(x => x.Year!.Value).InclusiveBetween(2000, 2100));
    }
}
