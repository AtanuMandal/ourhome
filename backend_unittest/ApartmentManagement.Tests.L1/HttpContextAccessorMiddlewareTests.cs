using ApartmentManagement.Functions;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using System.Security.Claims;

namespace ApartmentManagement.Tests.L1.Handlers;

public class HttpContextAccessorMiddlewareTests
{
    [Fact]
    public async Task PopulateUserAsync_WithBearerHeader_SetsAuthenticatedPrincipal()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Headers.Authorization = "Bearer token";

        var principal = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, "user-001"),
            new Claim(ClaimTypes.Role, "SUAdmin"),
            new Claim("societyId", "soc-001")
        ], JwtBearerDefaults.AuthenticationScheme));

        var ticket = new AuthenticationTicket(principal, JwtBearerDefaults.AuthenticationScheme);
        var authService = new Mock<IAuthenticationService>();
        authService
            .Setup(service => service.AuthenticateAsync(context, JwtBearerDefaults.AuthenticationScheme))
            .ReturnsAsync(AuthenticateResult.Success(ticket));

        context.RequestServices = new ServiceCollection()
            .AddSingleton(authService.Object)
            .BuildServiceProvider();

        // Act
        await HttpContextAccessorMiddleware.PopulateUserAsync(context);

        // Assert
        context.User.Identity?.IsAuthenticated.Should().BeTrue();
        context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value.Should().Be("user-001");
        context.User.FindFirst("societyId")?.Value.Should().Be("soc-001");
    }
}
