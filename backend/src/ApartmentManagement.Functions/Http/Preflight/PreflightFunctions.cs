using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;

namespace ApartmentManagement.Functions.Http;

public sealed class PreflightFunctions(IConfiguration configuration)
{
    private static readonly string[] FallbackAllowedHeaders =
    [
        "authorization",
        "content-type",
        "x-requested-with"
    ];

    [Function("HandleCorsPreflight")]
    public IActionResult HandleCorsPreflight(
        [HttpTrigger(AuthorizationLevel.Anonymous, "options", Route = "{*path}")] HttpRequest req)
    {
        var origin = req.Headers.Origin.ToString();
        var allowedOrigin = ResolveAllowedOrigin(origin);

        if (!string.IsNullOrWhiteSpace(allowedOrigin))
        {
            req.HttpContext.Response.Headers["Access-Control-Allow-Origin"] = allowedOrigin;
            req.HttpContext.Response.Headers["Vary"] = "Origin";
            req.HttpContext.Response.Headers["Access-Control-Allow-Credentials"] = "true";
        }

        var requestedMethod = req.Headers["Access-Control-Request-Method"].ToString();
        if (!string.IsNullOrWhiteSpace(requestedMethod))
            req.HttpContext.Response.Headers["Access-Control-Allow-Methods"] = requestedMethod;

        var requestedHeaders = req.Headers["Access-Control-Request-Headers"].ToString();
        req.HttpContext.Response.Headers["Access-Control-Allow-Headers"] =
            string.IsNullOrWhiteSpace(requestedHeaders)
                ? string.Join(", ", FallbackAllowedHeaders)
                : requestedHeaders;

        req.HttpContext.Response.Headers["Access-Control-Max-Age"] = "86400";

        return new NoContentResult();
    }

    private string? ResolveAllowedOrigin(string origin)
    {
        if (string.IsNullOrWhiteSpace(origin))
            return null;

        var configuredOrigins = configuration["Cors:AllowedOrigins"]
            ?? configuration["Host:CORS"]
            ?? configuration["CORS_ALLOWED_ORIGINS"];

        if (string.IsNullOrWhiteSpace(configuredOrigins))
            return origin;

        var origins = configuredOrigins
            .Split([',', ';'], StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        if (origins.Contains("*", StringComparer.Ordinal))
            return origin;

        return origins.Contains(origin, StringComparer.OrdinalIgnoreCase) ? origin : null;
    }
}
