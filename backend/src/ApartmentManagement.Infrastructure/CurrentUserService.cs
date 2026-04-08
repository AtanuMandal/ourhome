using ApartmentManagement.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace ApartmentManagement.Infrastructure.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private ClaimsPrincipal? Principal => httpContextAccessor.HttpContext?.User;

    public string UserId => Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? Principal?.FindFirst("oid")?.Value
        ?? Principal?.FindFirst("sub")?.Value
        ?? string.Empty;

    public string Email => Principal?.FindFirst(ClaimTypes.Email)?.Value
        ?? Principal?.FindFirst("emails")?.Value
        ?? string.Empty;

    public string SocietyId => Principal?.FindFirst("societyId")?.Value
        ?? Principal?.FindFirst("extension_societyId")?.Value
        ?? string.Empty;

    public string Role => Principal?.FindFirst(ClaimTypes.Role)?.Value
        ?? Principal?.FindFirst("roles")?.Value
        ?? string.Empty;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public bool IsInRole(string role) => Principal?.IsInRole(role) ?? false;

    public bool IsInRoles(params string[] roles) => roles.Any(r => Principal?.IsInRole(r) ?? false);
}