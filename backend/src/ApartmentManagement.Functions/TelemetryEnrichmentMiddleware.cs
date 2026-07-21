using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Functions.Helpers;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;
using System.Diagnostics;
using System.Text;

namespace ApartmentManagement.Functions;

/// <summary>
/// Attaches the redacted request/response body and caller identity to the current
/// OpenTelemetry span — see requirements/telemetry_observability.md §5. This is what makes
/// "what was sent to the API and what came back" answerable by opening a trace, without any
/// handler needing to log the payload itself.
///
/// Runs after <see cref="HttpContextAccessorMiddleware"/> (so the authenticated user is
/// already populated on <c>httpContext.User</c>) and inside <see cref="ExceptionHandlingMiddleware"/>
/// (so a bug in here still maps to a structured error response instead of an unhandled 500).
/// </summary>
public class TelemetryEnrichmentMiddleware(ICurrentUserService currentUser) : IFunctionsWorkerMiddleware
{
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var httpContext = context.GetHttpContext();
        if (httpContext is null)
        {
            await next(context);
            return;
        }

        var activity = Activity.Current;

        if (activity is not null)
        {
            if (currentUser.IsAuthenticated)
            {
                activity.SetTag("enduser.id", currentUser.UserId);
                activity.SetTag("society.id", currentUser.SocietyId);
                activity.SetTag("enduser.role", currentUser.Role);
            }

            var requestBody = await CaptureRequestBodyAsync(httpContext.Request);
            activity.SetTag("http.request.body", TelemetryRedactor.RedactBody(
                requestBody, httpContext.Request.ContentType, httpContext.Request.ContentLength));
        }

        // Swap in a capturing stream so the response body is still readable after the function
        // completes (HttpResponse.Body is write-only) — copied back to the real stream in the
        // finally block regardless of whether the function succeeded or threw.
        var originalBody = httpContext.Response.Body;
        await using var capture = new MemoryStream();
        httpContext.Response.Body = capture;

        try
        {
            await next(context);

            if (activity is not null)
            {
                capture.Position = 0;
                using var reader = new StreamReader(capture, Encoding.UTF8, leaveOpen: true);
                var responseBody = await reader.ReadToEndAsync();
                activity.SetTag("http.response.body", TelemetryRedactor.RedactBody(
                    responseBody, httpContext.Response.ContentType, capture.Length));
                activity.SetTag("http.response.status_code", httpContext.Response.StatusCode);
            }
        }
        finally
        {
            httpContext.Response.Body = originalBody;
            capture.Position = 0;
            await capture.CopyToAsync(originalBody);
        }
    }

    private static async Task<string> CaptureRequestBodyAsync(HttpRequest request)
    {
        if (request.ContentLength is null or 0)
            return string.Empty;

        request.EnableBuffering();
        request.Body.Position = 0;
        using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        request.Body.Position = 0; // rewind for the function body's own DeserializeAsync call
        return body;
    }
}
