import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SecureImageComponent } from '../secure-image/secure-image.component';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.5;

/** Full-screen preview popup with zoom in/out for a secured image, e.g. a maintenance payment proof. */
@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, DecimalPipe, SecureImageComponent],
  template: `
    @if (open) {
      <div class="lightbox-backdrop" (click)="close()">
        <div class="lightbox-toolbar" (click)="$event.stopPropagation()">
          <button mat-icon-button (click)="zoomOut()" [disabled]="scale() <= minScale" aria-label="Zoom out">
            <mat-icon>zoom_out</mat-icon>
          </button>
          <span class="lightbox-toolbar__scale">{{ (scale() * 100) | number:'1.0-0' }}%</span>
          <button mat-icon-button (click)="zoomIn()" [disabled]="scale() >= maxScale" aria-label="Zoom in">
            <mat-icon>zoom_in</mat-icon>
          </button>
          <button mat-icon-button (click)="close()" aria-label="Close">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="lightbox-viewport" (click)="$event.stopPropagation()" (wheel)="onWheel($event)">
          <div class="lightbox-image" [style.transform]="'scale(' + scale() + ')'">
            <app-secure-image [src]="src"></app-secure-image>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .lightbox-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 1000;
      display: flex;
      flex-direction: column;
    }
    .lightbox-toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      padding: 8px 12px;
      color: white;

      button { color: white; }
    }
    .lightbox-toolbar__scale {
      color: white;
      font-size: 13px;
      min-width: 44px;
      text-align: center;
    }
    .lightbox-viewport {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lightbox-image {
      transition: transform 0.15s ease-out;
      max-width: 90vw;
      max-height: 80vh;
    }
  `],
})
export class ImageLightboxComponent implements OnChanges {
  @Input() open = false;
  @Input({ required: true }) src!: string;
  @Output() closed = new EventEmitter<void>();

  readonly minScale = MIN_SCALE;
  readonly maxScale = MAX_SCALE;
  readonly scale = signal(MIN_SCALE);

  ngOnChanges(): void {
    if (this.open) this.scale.set(MIN_SCALE);
  }

  zoomIn(): void {
    this.scale.update(s => Math.min(this.maxScale, s + SCALE_STEP));
  }

  zoomOut(): void {
    this.scale.update(s => Math.max(this.minScale, s - SCALE_STEP));
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) this.zoomIn();
    else this.zoomOut();
  }

  close(): void {
    this.scale.set(MIN_SCALE);
    this.closed.emit();
  }
}
