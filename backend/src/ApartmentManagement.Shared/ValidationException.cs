namespace ApartmentManagement.Shared.Exceptions;

/// <summary>Thrown when request data fails validation (HTTP 422).</summary>
public class ValidationException : AppException
{
    /// <summary>Field-level validation errors: key = field name, value = error messages.</summary>
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ValidationException(IDictionary<string, string[]> errors)
        : base(Constants.ErrorCodes.ValidationFailed, "One or more validation errors occurred.", 422)
    {
        Errors = new Dictionary<string, string[]>(errors);
    }

    public ValidationException(string field, string message)
        : this(new Dictionary<string, string[]> { [field] = [message] }) { }
}
