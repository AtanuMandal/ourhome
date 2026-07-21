using ApartmentManagement.Application.Interfaces;
using ApartmentManagement.Functions.Helpers;
using ApartmentManagement.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Diagnostics;
using System.Text.Json;

namespace ApartmentManagement.Functions.Http.Telemetry;

/// <summary>Web/mobile-forwarded event — see requirements/telemetry_observability.md §6-7 "relay, not direct".</summary>
public record ClientTelemetryEvent(
    string TraceId,
    string? SpanId,
    string Name,
    string? Method,
    string? Url,
    int? HttpStatusCode,
    string? ErrorMessage,
    Dictionary<string, object>? Attributes);

public record SubmitClientTelemetryRequest(List<ClientTelemetryEvent> Events);

/// <summary>
/// Client telemetry relay (see requirements/telemetry_observability.md §6-7). Browsers and the
/// mobile app never talk to the OTLP collector directly — that would require accepting public,
/// unauthenticated, CORS-enabled traffic from anyone's browser. Instead they POST here (behind
/// the same JWT auth as every other endpoint), and this function re-emits the event server-side
/// as a child Activity of the client's own trace (continuing the trace the client already
/// started via its `traceparent` header), after running it through the same redaction pass as
/// the request/response body capture middleware.
///
/// This exists specifically for telemetry a normal API call can't carry on its own: a pure
/// client-side error, an app crash, or a network failure where the request never reached the
/// backend at all (status 0) — cases the server would otherwise have zero visibility into.
/// </summary>
public class TelemetryFunctions(
    ICurrentUserService currentUser,
    IOptions<InfrastructureSettings> settings,
    ILogger<TelemetryFunctions> logger)
{
    private static readonly ActivitySource RelaySource = new("OurHome.ClientRelay");

    /// <summary>Untrusted client input — bound defensively so one buggy/malicious client can't flood a trace backend.</summary>
    private const int MaxEventsPerRequest = 50;

    [Function("SubmitClientTelemetry")]
    public async Task<IActionResult> SubmitClientTelemetry(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "telemetry/client-events")] HttpRequest req,
        CancellationToken ct)
    {
        if (!currentUser.IsAuthenticated) return new UnauthorizedResult();
        if (!settings.Value.TelemetryRelayEnabled) return new NoContentResult();

        var request = await req.DeserializeAsync<SubmitClientTelemetryRequest>(ct);
        if (request?.Events is null || request.Events.Count == 0) return new NoContentResult();

        foreach (var evt in request.Events.Take(MaxEventsPerRequest))
        {
            RecordClientEvent(evt);
        }

        return new NoContentResult();
    }

    private void RecordClientEvent(ClientTelemetryEvent evt)
    {
        var parentContext = TryParseContext(evt.TraceId, evt.SpanId);
        using var activity = RelaySource.StartActivity(
            SanitizeName(evt.Name), ActivityKind.Client, parentContext ?? default);

        activity?.SetTag("enduser.id", currentUser.UserId);
        activity?.SetTag("society.id", currentUser.SocietyId);
        if (evt.HttpStatusCode is not null)
            activity?.SetTag("http.status_code", evt.HttpStatusCode);
        if (!string.IsNullOrWhiteSpace(evt.Method))
            activity?.SetTag("http.method", evt.Method);
        if (!string.IsNullOrWhiteSpace(evt.Url))
            activity?.SetTag("http.url", TelemetryRedactor.RedactBody(evt.Url, "text/plain"));
        if (!string.IsNullOrWhiteSpace(evt.ErrorMessage))
            activity?.SetTag("client.error.message", TelemetryRedactor.RedactBody(evt.ErrorMessage, "text/plain"));
        if (evt.Attributes is { Count: > 0 })
        {
            var json = JsonSerializer.Serialize(evt.Attributes);
            activity?.SetTag("client.attributes", TelemetryRedactor.RedactBody(json, "application/json"));
        }

        logger.LogInformation(
            "Client telemetry: {EventName} status={StatusCode} userId={UserId} clientTraceId={TraceId}",
            evt.Name, evt.HttpStatusCode, currentUser.UserId, evt.TraceId);
    }

    /// <summary>Event names are free text from the client — cap length so a span name can't smuggle a huge string.</summary>
    internal static string SanitizeName(string name) =>
        string.IsNullOrWhiteSpace(name) ? "client.event" : (name.Length > 200 ? name[..200] : name);

    internal static ActivityContext? TryParseContext(string? traceId, string? spanId)
    {
        if (string.IsNullOrWhiteSpace(traceId) || traceId.Length != 32 || !IsHex(traceId))
            return null;
        if (string.IsNullOrWhiteSpace(spanId) || spanId.Length != 16 || !IsHex(spanId))
            return null;

        try
        {
            var parsedTraceId = ActivityTraceId.CreateFromString(traceId);
            var parsedSpanId = ActivitySpanId.CreateFromString(spanId);
            return new ActivityContext(parsedTraceId, parsedSpanId, ActivityTraceFlags.Recorded);
        }
        catch (ArgumentOutOfRangeException)
        {
            // Malformed client input — fall back to rooting the event under the current
            // request's own trace rather than failing the whole batch.
            return null;
        }
    }

    internal static bool IsHex(string s)
    {
        foreach (var c in s)
        {
            if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')))
                return false;
        }
        return true;
    }
}
