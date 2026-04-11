using ApartmentManagement.Shared.Exceptions;
using ApartmentManagement.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text;
using System.Text.Json;

namespace ApartmentManagement.Functions.Helpers;

public static class HttpHelpers
{
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static async Task<T?> DeserializeAsync<T>(this HttpRequest req, CancellationToken ct,
        ILogger? logger = null)
    {
        try
        {
            req.EnableBuffering();
            req.Body.Position = 0;

            if (req.ContentLength == 0)
                return default;

            // Read to string first — avoids all stream-position edge cases and
            // lets us log the raw payload when deserialization fails.
            using var reader = new StreamReader(req.Body, Encoding.UTF8, leaveOpen: true);
            var json = await reader.ReadToEndAsync(ct);

            if (string.IsNullOrWhiteSpace(json))
                return default;

            return JsonSerializer.Deserialize<T>(json, _json);
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Failed to deserialize request body to {Type}", typeof(T).Name);
            return default;
        }
    }

    public static IActionResult ToActionResult<T>(this Result<T> result, int successStatus = 200)
    {
        if (result.IsSuccess)
        {
            return successStatus switch
            {
                201 => new ObjectResult(result.Value) { StatusCode = 201 },
                204 => new NoContentResult(),
                _ => new OkObjectResult(result.Value)
            };
        }

        var msg = result.ErrorMessage.Length > 0 ? result.ErrorMessage : "An error occurred";
        if (result.ErrorCode.Contains("NotFound") || result.ErrorCode == "NOT_FOUND")
            return new NotFoundObjectResult(new { error = msg });
        return result.ErrorCode switch
        {
            "FORBIDDEN" => new ObjectResult(new { error = msg }) { StatusCode = 403 },
            "UNAUTHORIZED" => new UnauthorizedObjectResult(new { error = msg }),
            "CONFLICT" => new ConflictObjectResult(new { error = msg }),
            "VALIDATION_ERROR" => new BadRequestObjectResult(new { error = msg }),
            _ => new ObjectResult(new { error = msg }) { StatusCode = 500 }
        };
    }


    public static Task<IActionResult> ToValidationErrorResponse(this HttpRequest req, ValidationException ex)
    {
        var payload = new
        {
            errorCode = ex.ErrorCode,
            message = ex.Message,
            errors = ex.Errors // IDictionary<string,string[]>
        };

        var result = new ObjectResult(payload)
        {
            StatusCode = ex.StatusCode // 422 for ValidationException
        };

        return Task.FromResult<IActionResult>(result);
    }

    public static  Task<IActionResult> ToAppErrorResponse(this HttpRequest req, AppException ex)
    {

        var payload = new
        {
            errorCode = ex.ErrorCode,
            message = ex.Message
        };

        var result = new ObjectResult(payload)
        {
            StatusCode = ex.StatusCode // 422 for ValidationException
        };

        return Task.FromResult<IActionResult>(result);
    }
}
