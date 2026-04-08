namespace ApartmentManagement.Shared.Exceptions;

/// <summary>Thrown when the caller is authenticated but lacks the required permissions (HTTP 403).</summary>
public class ForbiddenException : AppException
{
    public ForbiddenException(string message = "You do not have permission to perform this action.")
        : base(Constants.ErrorCodes.Forbidden, message, 403) { }
}
