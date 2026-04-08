namespace ApartmentManagement.Shared.Exceptions;

/// <summary>Thrown when a requested resource is not found (HTTP 404).</summary>
public class NotFoundException : AppException
{
    public NotFoundException(string resourceName, string id)
        : base(Constants.ErrorCodes.NotFound, $"{resourceName} with id '{id}' was not found.", 404) { }
}
