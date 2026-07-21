import { createTraceContext, traceIdFromHeader } from './trace-context';

describe('createTraceContext', () => {
  it('generates a 32-hex-char trace ID and 16-hex-char span ID', () => {
    const { traceId, spanId } = createTraceContext();

    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(spanId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('builds a well-formed W3C traceparent header', () => {
    const { traceId, spanId, header } = createTraceContext();

    expect(header).toBe(`00-${traceId}-${spanId}-01`);
    expect(header).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it('generates a fresh ID on every call', () => {
    const a = createTraceContext();
    const b = createTraceContext();

    expect(a.traceId).not.toBe(b.traceId);
    expect(a.spanId).not.toBe(b.spanId);
  });
});

describe('traceIdFromHeader', () => {
  it('extracts the trace-id segment from a well-formed header', () => {
    const id = traceIdFromHeader('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
    expect(id).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('returns null for a null header', () => {
    expect(traceIdFromHeader(null)).toBeNull();
  });

  it('returns null for an undefined header', () => {
    expect(traceIdFromHeader(undefined)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(traceIdFromHeader('')).toBeNull();
  });

  it('returns null for a header with too few segments', () => {
    expect(traceIdFromHeader('00-4bf92f3577b34da6a3ce929d0e0e4736')).toBeNull();
  });

  it('returns null when the trace-id segment is not 32 hex chars', () => {
    expect(traceIdFromHeader('00-short-00f067aa0ba902b7-01')).toBeNull();
  });

  it('returns null when the trace-id segment has uppercase characters', () => {
    expect(traceIdFromHeader('00-4BF92F3577B34DA6A3CE929D0E0E4736-00f067aa0ba902b7-01')).toBeNull();
  });
});
