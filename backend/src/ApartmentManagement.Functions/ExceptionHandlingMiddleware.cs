using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Shared.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ApartmentManagement.Functions;

/// <summary>
/// Global safety net for exceptions the MediatR pipeline throws past the function body —
/// FluentValidation failures (<see cref="ValidationException"/>, 422), authorization
/// failures (<see cref="ForbiddenException"/>, 403), and other <see cref="AppException"/>s.
/// Without this, a simple validation error surfaces as an unhandled 500 with a stack
/// trace instead of a structured payload the clients can display.
/// </summary>
public class ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> logger) : IFunctionsWorkerMiddleware
{
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            var httpContext = context.GetHttpContext();
            if (httpContext is null || httpContext.Response.HasStarted)
                throw; // Non-HTTP trigger (timer, event) or response already streaming — nothing to map.

            // `error` is the field both clients read first (mobile normalizeError,
            // web error.interceptor); `message`/`errorCode`/`errors` mirror
            // HttpHelpers.ToValidationErrorResponse for richer consumers.
            var errorId = ErrorIdProvider.Current;

            object payload;
            int status;
            switch (ex)
            {
                case ValidationException vex:
                    status = vex.StatusCode;
                    payload = new
                    {
                        error = FlattenValidationMessage(vex),
                        errorCode = vex.ErrorCode,
                        message = vex.Message,
                        errors = vex.Errors,
                        errorId
                    };
                    logger.LogWarning(ex, "Validation failed for {Function} (errorId={ErrorId})", context.FunctionDefinition.Name, errorId);
                    break;
                case AppException aex:
                    status = aex.StatusCode;
                    payload = new { error = aex.Message, errorCode = aex.ErrorCode, message = aex.Message, errorId };
                    logger.LogWarning(ex, "{ExceptionType} in {Function} (errorId={ErrorId})", ex.GetType().Name, context.FunctionDefinition.Name, errorId);
                    break;
                default:
                    status = StatusCodes.Status500InternalServerError;
                    payload = new { error = "An unexpected error occurred.", errorCode = "INTERNAL_ERROR", message = "An unexpected error occurred.", errorId };
                    logger.LogError(ex, "Unhandled exception in {Function} (errorId={ErrorId})", context.FunctionDefinition.Name, errorId);
                    break;
            }

            httpContext.Response.StatusCode = status;
            httpContext.Response.ContentType = "application/json";
            await httpContext.Response.WriteAsync(JsonSerializer.Serialize(payload, _json));
        }
    }

    /// <summary>Joins field-level errors into one human-readable line for simple clients.</summary>
    private static string FlattenValidationMessage(ValidationException vex)
    {
        var all = vex.Errors.SelectMany(kvp => kvp.Value).ToList();
        return all.Count > 0 ? string.Join(" ", all) : vex.Message;
    }
}
