import { AxiosError } from 'axios';
import { normalizeError } from '../../../src/shared/utils/errors';

function makeAxiosError(opts: {
  message?: string;
  status?: number;
  data?: { error?: string; errorCode?: string; errorId?: string };
  traceparent?: string;
}): AxiosError {
  const config = { headers: opts.traceparent ? { traceparent: opts.traceparent } : {} } as any;
  const response = opts.status
    ? ({ status: opts.status, data: opts.data, config, headers: {}, statusText: '' } as any)
    : undefined;
  return new AxiosError(opts.message ?? 'Request failed', undefined, config, undefined, response);
}

describe('normalizeError', () => {
  test('a handled 4xx with a server message shows the plain message — no Ref appended', () => {
    const err = makeAxiosError({
      status: 400,
      data: { error: 'Start time is outside operating hours.', errorId: '4bf92f3577b34da6a3ce929d0e0e4736' },
    });

    expect(normalizeError(err)).toBe('Start time is outside operating hours.');
  });

  test('a 5xx with a server errorId appends the reference', () => {
    const err = makeAxiosError({
      status: 500,
      data: { error: 'An unexpected error occurred.', errorId: '4bf92f3577b34da6a3ce929d0e0e4736' },
    });

    expect(normalizeError(err)).toBe('An unexpected error occurred. (Ref: 4bf92f3577b34da6a3ce929d0e0e4736)');
  });

  test('a 5xx with no errorId in the payload falls back to the plain message', () => {
    const err = makeAxiosError({ status: 500, data: { error: 'boom' } });

    expect(normalizeError(err)).toBe('boom');
  });

  test('a pure network failure falls back to the traceparent header for the reference', () => {
    const err = makeAxiosError({
      message: 'Network Error',
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    });

    expect(normalizeError(err)).toBe('Network Error (Ref: 4bf92f3577b34da6a3ce929d0e0e4736)');
  });

  test('a network failure with no traceparent header shows the plain message', () => {
    const err = makeAxiosError({ message: 'Network Error' });

    expect(normalizeError(err)).toBe('Network Error');
  });

  test('a plain Error falls back to its message', () => {
    expect(normalizeError(new Error('plain failure'))).toBe('plain failure');
  });

  test('a non-Error value falls back to a generic message', () => {
    expect(normalizeError('not an error object')).toBe('An unknown error occurred');
  });
});
