/**
 * Minimal W3C Trace Context generation — mobile counterpart of the web app's
 * core/services/trace-context.ts (see requirements/telemetry_observability.md §7). Not
 * cryptographically random by design: a trace ID only needs to be unique enough to avoid
 * collisions for correlation purposes, not unpredictable — Math.random avoids pulling in a
 * native crypto module (expo-crypto) just for this.
 *
 * https://www.w3.org/TR/trace-context/#traceparent-header
 */

function randomHex(byteLength: number): string {
  let hex = '';
  for (let i = 0; i < byteLength; i++) {
    hex += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  }
  return hex;
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
