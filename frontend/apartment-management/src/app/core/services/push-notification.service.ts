import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

interface PushSubscriptionDto {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly swPush = inject(SwPush);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private vapidPublicKey: string | null = null;
  private subscriptionSent = false;

  /** Reactive permission state — update whenever permission changes. */
  readonly permission = signal<NotificationPermission>(this.currentPermission());

  get isBrowserSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  }

  /** Reactive: true if the user has NOT yet responded to the permission prompt. */
  get shouldPrompt(): boolean {
    return this.isBrowserSupported && this.permission() === 'default';
  }

  /**
   * Called from a user-gesture handler (button click).
   * Step 1: asks the browser for notification permission.
   * Step 2: if granted AND the Angular service worker is active, registers a server push subscription.
   */
  async enableNotifications(): Promise<NotificationPermission> {
    if (!this.isBrowserSupported) return 'unsupported';

    // Request browser permission — MUST be called from a user gesture
    const result = await Notification.requestPermission();
    this.permission.set(result as NotificationPermission);

    if (result !== 'granted') return result as NotificationPermission;

    // Try to register a server-push subscription (requires service worker)
    await this.tryRegisterServerPush();

    return 'granted';
  }

  /**
   * Attempts to register a Web Push subscription with the backend.
   * Silently skips if:
   * - The Angular service worker isn't enabled (dev mode / no SW build)
   * - VAPID keys aren't configured on the server
   * - Already subscribed this session
   */
  async tryRegisterServerPush(): Promise<void> {
    if (this.subscriptionSent) return;

    const societyId = this.auth.societyId();
    if (!societyId) return;

    try {
      // Fetch VAPID public key from backend
      if (!this.vapidPublicKey) {
        const res = await firstValueFrom(this.api.get<{ vapidPublicKey: string }>('push/vapid-public-key'));
        if (!res?.vapidPublicKey) {
          console.warn('[PushNotificationService] VAPID not configured on server — skipping subscription.');
          return;
        }
        this.vapidPublicKey = res.vapidPublicKey;
      }

      let sub: PushSubscription | null = null;

      if (this.swPush.isEnabled) {
        // Production path: Angular SW is active (ng build + service worker enabled)
        sub = await this.swPush.requestSubscription({ serverPublicKey: this.vapidPublicKey });
      } else {
        // Fallback path: Angular SwPush is disabled (isDevMode) but a native SW may still be active.
        // IMPORTANT: navigator.serviceWorker.ready never resolves when no SW is registered,
        // so we check .controller first — it is non-null only when a SW controls this page.
        if (!navigator.serviceWorker?.controller) {
          console.warn(
            '[PushNotificationService] No active service worker. ' +
            'Run "npm run build" and serve the dist/ folder to enable push subscriptions.'
          );
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
      }

      if (!sub) return;

      const dto: PushSubscriptionDto = {
        endpoint: sub.endpoint,
        p256dh: this.arrayBufferToBase64Url(sub.getKey('p256dh')!),
        auth: this.arrayBufferToBase64Url(sub.getKey('auth')!)
      };

      await firstValueFrom(this.api.post<void>(`societies/${societyId}/push-subscriptions`, dto));
      this.subscriptionSent = true;
      console.info('[PushNotificationService] Server push subscription registered.');
    } catch (err) {
      console.warn('[PushNotificationService] Push subscription failed:', err);
    }
  }

  /**
   * Observable of notification action clicks (SwPush only — production builds).
   * In dev mode this stream is empty; the service worker still handles click routing.
   */
  get notificationClicks$() {
    return this.swPush.notificationClicks;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private currentPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission as NotificationPermission;
  }

  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }
}
