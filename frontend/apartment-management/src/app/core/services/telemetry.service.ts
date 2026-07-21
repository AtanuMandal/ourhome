import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Matches the backend's ClientTelemetryEvent DTO — see requirements/telemetry_observability.md §6. */
export interface ClientTelemetryEvent {
  traceId: string;
  spanId?: string;
  name: string;
  method?: string;
  url?: string;
  httpStatusCode?: number;
  errorMessage?: string;
  attributes?: Record<string, unknown>;
}

export const TELEMETRY_RELAY_PATH = 'telemetry/client-events';

/**
 * Forwards client-only telemetry (network failures the backend never saw, JS errors) to the
 * backend relay endpoint — see requirements/telemetry_observability.md §6 "relay, not direct".
 * Best-effort and silent: a failure to report telemetry must never surface as a second error
 * on top of whatever the user already hit.
 */
@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private readonly http = inject(HttpClient);

  reportClientEvent(event: ClientTelemetryEvent): void {
    this.http.post(`${environment.apiBaseUrl}/${TELEMETRY_RELAY_PATH}`, { events: [event] }).subscribe({
      error: () => {
        // Swallow — telemetry reporting must never itself surface as a user-facing failure.
      },
    });
  }
}
