namespace ApartmentManagement.Shared.Exceptions;

/// <summary>Thrown when a resource conflict is detected (HTTP 409).</summary>
public class ConflictException : AppException
{
    public ConflictException(string errorCode, string message)
        : base(errorCode, message, 409) { }

    public ConflictException(string message)
        : base(Constants.ErrorCodes.Conflict, message, 409) { }
}
