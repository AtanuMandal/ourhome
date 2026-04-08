namespace ApartmentManagement.Shared.Exceptions;

/// <summary>Thrown when the caller is not authenticated (HTTP 401).</summary>
public class UnauthorizedException : AppException
{
    public UnauthorizedException(string message = "Authentication is required.")
        : base(Constants.ErrorCodes.Unauthorized, message, 401) { }
}
