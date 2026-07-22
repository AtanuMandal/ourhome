import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { PublicVisitorPass } from '../../core/models/visitor.model';
import { VisitorService } from '../../core/services/visitor.service';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';

@Component({
  selector: 'app-visitor-pass-public',
  standalone: true,
  imports: [DatePipe, MatProgressBarModule, MatIconModule, StatusChipComponent],
  template: `
    <div class="public-pass-page">
      <div class="public-pass-header">
        <mat-icon class="public-pass-logo">home</mat-icon>
        <span class="public-pass-title">OurHome Visitor Pass</span>
      </div>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      @if (error()) {
        <div class="public-pass-card error-card">
          <mat-icon>error_outline</mat-icon>
          <h3>Pass Not Found</h3>
          <p>{{ error() }}</p>
        </div>
      }

      @if (pass()) {
        <div class="public-pass-card" [class.expired]="pass()!.ipe">
          @if (pass()!.ipe) {
            <div class="expired-banner">
              <mat-icon>timer_off</mat-icon>
              This visitor pass has expired
            </div>
          }

          @if (pass()!.img) {
            <div class="visitor-image-wrap">
              <img [src]="pass()!.img" alt="Visitor photo" class="visitor-image">
            </div>
          }

          <div class="pass-info">
            <div class="pass-info__row">
              <span class="pass-info__label">Visitor</span>
              <strong class="pass-info__value">{{ pass()!.vn }}</strong>
            </div>
            <div class="pass-info__row">
              <span class="pass-info__label">Purpose</span>
              <span class="pass-info__value">{{ pass()!.pu }}</span>
            </div>
            <div class="pass-info__row">
              <span class="pass-info__label">Flat</span>
              <span class="pass-info__value">{{ pass()!.hbn }}-{{ pass()!.hft }}</span>
            </div>
            <div class="pass-info__row">
              <span class="pass-info__label">Status</span>
              <app-status-chip [status]="pass()!.st"></app-status-chip>
            </div>
            @if (pass()!.vu) {
              <div class="pass-info__row">
                <span class="pass-info__label">Valid until</span>
                <span class="pass-info__value" [class.expired-text]="pass()!.ipe">
                  {{ pass()!.vu | date:'medium' }}
                </span>
              </div>
            }
          </div>

          @if (pass()!.qr && !pass()!.ipe) {
            <div class="pass-qr">
              <p class="pass-qr__label">Security can scan this QR to verify entry</p>
              <img [src]="qrDataUrl()" alt="QR code" class="pass-qr__img">
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .public-pass-page {
      min-height: 100vh;
      background: #f5f5f5;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
    }
    .public-pass-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 0;
      margin-bottom: 16px;
      color: #1976d2;
      font-weight: 600;
      font-size: 1.2rem;
    }
    .public-pass-logo { font-size: 2rem; }
    .public-pass-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.12);
      padding: 24px;
      width: 100%;
      max-width: 420px;
    }
    .public-pass-card.expired {
      border: 2px solid #f44336;
    }
    .error-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
      color: #f44336;
    }
    .error-card mat-icon { font-size: 3rem; width: 3rem; height: 3rem; }
    .expired-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffebee;
      color: #f44336;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-weight: 500;
    }
    .visitor-image-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }
    .visitor-image {
      width: 96px;
      height: 96px;
      object-fit: cover;
      border-radius: 50%;
      border: 3px solid #e0e0e0;
    }
    .pass-info__row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .pass-info__label { color: #666; font-size: 0.85rem; }
    .pass-info__value { font-weight: 500; }
    .expired-text { color: #f44336; }
    .pass-qr {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .pass-qr__label { color: #666; font-size: 0.85rem; text-align: center; }
    .pass-qr__img { width: 200px; height: 200px; }
  `]
})
export class VisitorPassPublicComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly visitorService = inject(VisitorService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly pass = signal<PublicVisitorPass | null>(null);

  ngOnInit() {
    const passCode = this.route.snapshot.paramMap.get('passCode') ?? '';
    this.visitorService.getPublicPass(passCode).subscribe({
      next: data => {
        this.pass.set(data);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'This visitor pass could not be found or has been removed.');
        this.loading.set(false);
      }
    });
  }

  qrDataUrl() {
    const qr = this.pass()?.qr;
    if (!qr) return '';
    return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
  }
}
