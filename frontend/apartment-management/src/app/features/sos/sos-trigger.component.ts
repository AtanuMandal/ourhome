import { Component, OnDestroy, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SosService } from '../../core/services/sos.service';
import { SosAlert, SosCategory, SOS_CATEGORY_LABELS } from '../../core/models/sos.model';

const ACTIVE_STATUSES = new Set(['Triggered', 'Acknowledged']);
const POLL_INTERVAL_MS = 10_000;

@Component({
  selector: 'app-sos-trigger',
  standalone: true,
  imports: [NgClass, MatButtonModule, MatIconModule, MatDialogModule, FormsModule],
  templateUrl: './sos-trigger.component.html',
  styleUrl: './sos-trigger.component.scss',
})
export class SosTriggerComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly sos = inject(SosService);
  private pollSub?: Subscription;

  readonly categories: { value: SosCategory; label: string }[] = (
    Object.keys(SOS_CATEGORY_LABELS) as SosCategory[]
  ).map((value) => ({ value, label: SOS_CATEGORY_LABELS[value] }));

  readonly showDialog = signal(false);
  readonly category = signal<SosCategory>('Fire');
  readonly note = signal('');
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeAlert = signal<SosAlert | null>(null);

  categoryLabel(category: SosCategory) {
    return SOS_CATEGORY_LABELS[category];
  }

  openDialog() {
    this.category.set('Fire');
    this.note.set('');
    this.error.set(null);
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  confirmTrigger() {
    const societyId = this.auth.societyId();
    if (!societyId) return;

    this.submitting.set(true);
    this.error.set(null);
    this.sos.trigger(societyId, { category: this.category(), note: this.note().trim() || undefined }).subscribe({
      next: (alert) => {
        this.submitting.set(false);
        this.showDialog.set(false);
        this.activeAlert.set(alert);
        this.startPolling(alert.id);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set('Could not send the SOS alert. Please try again or call the gate directly.');
      },
    });
  }

  markFalseAlarm() {
    const societyId = this.auth.societyId();
    const alert = this.activeAlert();
    if (!societyId || !alert) return;

    this.sos.markFalseAlarm(societyId, alert.id).subscribe({
      next: (updated) => {
        this.activeAlert.set(updated);
        this.stopPolling();
      },
    });
  }

  dismiss() {
    this.activeAlert.set(null);
    this.stopPolling();
  }

  private startPolling(alertId: string) {
    this.stopPolling();
    this.pollSub = interval(POLL_INTERVAL_MS).subscribe(() => {
      const societyId = this.auth.societyId();
      if (!societyId) return;
      this.sos.get(societyId, alertId).subscribe({
        next: (alert) => {
          this.activeAlert.set(alert);
          if (!ACTIVE_STATUSES.has(alert.status)) this.stopPolling();
        },
      });
    });
  }

  private stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  ngOnDestroy() {
    this.stopPolling();
  }
}
