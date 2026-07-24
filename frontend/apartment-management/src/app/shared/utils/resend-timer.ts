import { signal, Signal } from '@angular/core';

export interface ResendTimer {
  readonly remaining: Signal<number>;
  /** (Re)starts the countdown from `seconds`. */
  start(): void;
  /** Clears any pending interval — call from ngOnDestroy. */
  dispose(): void;
}

/** Countdown (seconds remaining) for gating a "Resend OTP" action. */
export function createResendTimer(seconds = 30): ResendTimer {
  const remaining = signal(0);
  let handle: ReturnType<typeof setInterval> | null = null;

  function clear() {
    if (handle !== null) {
      clearInterval(handle);
      handle = null;
    }
  }

  return {
    remaining,
    start() {
      clear();
      remaining.set(seconds);
      handle = setInterval(() => {
        remaining.update(s => {
          if (s <= 1) { clear(); return 0; }
          return s - 1;
        });
      }, 1000);
    },
    dispose: clear,
  };
}
