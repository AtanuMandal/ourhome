namespace ApartmentManagement.Shared.Exceptions;

/// <summary>Base exception for all application-specific errors.</summary>
public class AppException : Exception
{
    /// <summary>Machine-readable error code (see <see cref="Constants.ErrorCodes"/>).</summary>
    public string ErrorCode { get; }

    /// <summary>HTTP status code this exception maps to.</summary>
    public int StatusCode { get; }

    public AppException(string errorCode, string message, int statusCode = 500)
        : base(message)
    {
        ErrorCode = errorCode;
        StatusCode = statusCode;
    }

    public AppException(string errorCode, string message, int statusCode, Exception inner)
        : base(message, inner)
    {
        ErrorCode = errorCode;
        StatusCode = statusCode;
    }
}
