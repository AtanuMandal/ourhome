namespace ApartmentManagement.Shared.Exceptions;

public class RateLimitExceededException : DomainException
{
    public RateLimitExceededException(string message = "Rate limit exceeded.")
        : base("RATE_LIMIT_EXCEEDED", message) { }
}
