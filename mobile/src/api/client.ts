import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as tokenStore from '../auth/tokenStore';
import { createTraceContext, traceIdFromHeader } from '../shared/utils/traceContext';

const BASE_URL = process.env['API_BASE_URL'] ?? 'http://192.168.1.2:7071/api';
// Never traced/reported-on itself — see the guards below — to avoid a reporting loop.
const TELEMETRY_RELAY_PATH = 'telemetry/client-events';
let authEventListener: (() => void) | null = null;

export function setAuthEventListener(listener: () => void): void {
  authEventListener = listener;
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStore.getToken();
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Stamp a W3C traceparent header on every outgoing request (see
  // requirements/telemetry_observability.md §7 "Trace propagation") so the backend's OTel
  // instrumentation continues the SAME trace this request started on-device.
  if (config.headers && !config.url?.includes(TELEMETRY_RELAY_PATH)) {
    const { header } = createTraceContext();
    config.headers['traceparent'] = header;
  }

  return config;
});

/**
 * Forwards a client-only telemetry event — currently just network failures the backend never
 * saw at all — to the relay endpoint. See requirements/telemetry_observability.md §7
 * "relay, not direct": the app never talks to the OTLP collector directly, it POSTs here
 * (behind the same JWT auth as every other call) and the backend re-emits it server-side.
 * Best-effort and silent: a failure to report telemetry must never surface as a second error
 * on top of whatever the user already hit.
 */
export function reportClientEvent(event: {
  traceId: string;
  spanId?: string;
  name: string;
  method?: string;
  url?: string;
  httpStatusCode?: number;
  errorMessage?: string;
}): void {
  api.post(TELEMETRY_RELAY_PATH, { events: [event] }).catch(() => {
    // Swallow — see the doc comment above.
  });
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const errorCode = (error.response?.data as { errorCode?: string } | undefined)?.errorCode;
    // A disabled society locks out its own users from every action, same as an expired
    // session — clear any stored token so the app doesn't keep retrying requests that
    // will always be rejected, and drop back to the login screen.
    if (error.response?.status === 401 || errorCode === 'SOCIETY_NOT_ACTIVE') {
      await tokenStore.clearTokens();
      authEventListener?.();
    }

    // Pure network failure (request never reached the backend) — the one case nothing
    // server-side will ever record, since the backend never saw it at all.
    if (!error.response && !error.config?.url?.includes(TELEMETRY_RELAY_PATH)) {
      const traceparent = (error.config?.headers as Record<string, string> | undefined)?.['traceparent'];
      const traceId = traceIdFromHeader(traceparent);
      if (traceId) {
        reportClientEvent({
          traceId,
          name: `mobile.api.network-error ${error.config?.method?.toUpperCase() ?? ''} ${error.config?.url ?? ''}`.trim(),
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
          httpStatusCode: 0,
          errorMessage: error.message,
        });
      }
    }

    return Promise.reject(error);
  }
);

export default api;
