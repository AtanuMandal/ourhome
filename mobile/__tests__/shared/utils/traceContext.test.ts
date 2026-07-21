import { createTraceContext, traceIdFromHeader } from '../../../src/shared/utils/traceContext';

describe('createTraceContext', () => {
  test('generates a 32-hex-char trace ID and 16-hex-char span ID', () => {
    const { traceId, spanId } = createTraceContext();

    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(spanId).toMatch(/^[0-9a-f]{16}$/);
  });

  test('builds a well-formed W3C traceparent header', () => {
    const { traceId, spanId, header } = createTraceContext();

    expect(header).toBe(`00-${traceId}-${spanId}-01`);
    expect(header).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  test('generates a fresh ID on every call', () => {
    const a = createTraceContext();
    const b = createTraceContext();

    expect(a.traceId).not.toBe(b.traceId);
    expect(a.spanId).not.toBe(b.spanId);
  });
});

describe('traceIdFromHeader', () => {
  test('extracts the trace-id segment from a well-formed header', () => {
    expect(traceIdFromHeader('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01')).toBe(
      '4bf92f3577b34da6a3ce929d0e0e4736'
    );
  });

  test.each([
    [null],
    [undefined],
    [''],
    ['00-4bf92f3577b34da6a3ce929d0e0e4736'], // too few segments
    ['00-short-00f067aa0ba902b7-01'], // trace-id not 32 hex chars
    ['00-4BF92F3577B34DA6A3CE929D0E0E4736-00f067aa0ba902b7-01'], // uppercase not accepted
  ])('returns null for malformed input %p', (input) => {
    expect(traceIdFromHeader(input as string | null | undefined)).toBeNull();
  });
});
