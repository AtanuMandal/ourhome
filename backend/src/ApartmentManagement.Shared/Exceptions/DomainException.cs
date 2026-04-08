namespace ApartmentManagement.Shared.Exceptions;

public class DomainException : Exception
{
    public string ErrorCode { get; }

    public DomainException(string errorCode, string message) : base(message)
    {
        ErrorCode = errorCode;
    }
}
