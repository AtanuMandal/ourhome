/**
 * Minimal W3C Trace Context generation — see requirements/telemetry_observability.md §6
 * "Trace propagation". No OpenTelemetry SDK dependency: this is the whole spec surface we
 * need (a random 16-byte trace ID + 8-byte span ID, hex-encoded) to make the browser's
 * outgoing request carry a `traceparent` header the backend's ASP.NET Core OTel
 * instrumentation will recognize and continue as the SAME trace.
 *
 * https://www.w3.org/TR/trace-context/#traceparent-header
 */

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface TraceContext {
  /** 32 lowercase hex chars. */
  traceId: string;
  /** 16 lowercase hex chars. */
  spanId: string;
  /** Full `traceparent` header value: version-traceId-spanId-flags. */
  header: string;
}

/** version(00) - trace-id(32 hex) - parent-id(16 hex) - trace-flags(01 = sampled) */
export function createTraceContext(): TraceContext {
  const traceId = randomHex(16);
  const spanId = randomHex(8);
  return { traceId, spanId, header: `00-${traceId}-${spanId}-01` };
}

/** Extracts the trace-id segment from a `traceparent` header value, if well-formed. */
export function traceIdFromHeader(traceparent: string | null | undefined): string | null {
  if (!traceparent) return null;
  const parts = traceparent.split('-');
  return parts.length === 4 && /^[0-9a-f]{32}$/.test(parts[1]) ? parts[1] : null;
}
