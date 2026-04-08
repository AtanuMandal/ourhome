using ApartmentManagement.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace ApartmentManagement.Functions.Helpers;

public static class HttpHelpers
{
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static async Task<T?> DeserializeAsync<T>(this HttpRequest req, CancellationToken ct)
    {
        try
        {
            return await JsonSerializer.DeserializeAsync<T>(req.Body, _json, ct);
        }
        catch
        {
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
}
