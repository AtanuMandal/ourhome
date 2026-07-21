import { AxiosError } from 'axios';
import type { ApiError } from '../../api/types';
import { traceIdFromHeader } from './traceContext';

/**
 * See requirements/telemetry_observability.md "The errorId Contract": an unexpected failure
 * (network error, 5xx) gets its errorId appended so it can be quoted to support and looked up
 * directly in the telemetry UI. A handled 4xx (validation, forbidden, not found) already has a
 * specific, actionable message from the backend and doesn't need one.
 */
export function normalizeError(e: unknown): string {
  if (e instanceof AxiosError) {
    const status = e.response?.status;
    const data = e.response?.data as ApiError | undefined;
    const message = data?.error ?? e.message ?? 'An unknown error occurred';

    const isUnexpected = status === undefined || status >= 500;
    if (isUnexpected) {
      const errorId =
        data?.errorId ??
        traceIdFromHeader((e.config?.headers as Record<string, string> | undefined)?.['traceparent']);
      if (errorId) return `${message} (Ref: ${errorId})`;
    }

    return message;
  }
  if (e instanceof Error) return e.message;
  return 'An unknown error occurred';
}
