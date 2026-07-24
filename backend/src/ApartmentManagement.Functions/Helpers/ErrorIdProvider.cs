using System.Diagnostics;

namespace ApartmentManagement.Functions.Helpers;

/// <summary>
/// The `errorId` every error response carries (see requirements/telemetry_observability.md
/// "The errorId Contract") — the exact same 32-hex-char W3C trace ID that OpenTelemetry
/// tagged the request's span with, not a separately minted GUID. Pasting it into the
/// telemetry UI's trace search lands directly on the failing request: every span, every
/// dependency call, the captured (redacted) request/response bodies, and the matching log line.
///
/// Falls back to a fresh GUID only if no Activity is active — realistically only possible
/// during a startup-time failure before the tracing middleware/instrumentation has run. That
/// fallback ID is still logged alongside the exception, so it stays searchable via full-text
/// log search even without a trace to jump to.
/// </summary>
public static class ErrorIdProvider
{
    public static string Current => Activity.Current?.TraceId.ToHexString() ?? Guid.NewGuid().ToString("N");
}
