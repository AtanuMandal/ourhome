namespace ApartmentManagement.Domain.Services;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? SocietyId { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
    bool IsInRole(string role);
}
