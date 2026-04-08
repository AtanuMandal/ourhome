namespace ApartmentManagement.Shared.Exceptions;

public class AppValidationException : DomainException
{
    public IReadOnlyList<string> Errors { get; }

    public AppValidationException(IEnumerable<string> errors)
        : base("VALIDATION_FAILED", "One or more validation errors occurred.")
    {
        Errors = errors.ToList().AsReadOnly();
    }
}
