import { AfterViewInit, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';

const VIEWPORT = 280;   // on-screen crop viewport (px)
const OUTPUT = 512;     // exported square size (px)

export interface AvatarCropDialogData {
  file: File;
}

/**
 * WhatsApp-style profile-picture crop: the image pans (drag) and zooms (slider/wheel) beneath a
 * fixed circular mask; the visible square is exported as a JPEG blob on save.
 */
@Component({
  selector: 'app-avatar-crop-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatSliderModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Adjust your photo</h2>
    <mat-dialog-content>
      <div class="crop-viewport"
           (pointerdown)="onPointerDown($event)"
           (pointermove)="onPointerMove($event)"
           (pointerup)="onPointerUp($event)"
           (pointercancel)="onPointerUp($event)"
           (wheel)="onWheel($event)">
        <canvas #canvas [width]="viewport" [height]="viewport"></canvas>
        <div class="crop-mask"></div>
      </div>
      <div class="zoom-row">
        <span>Zoom</span>
        <mat-slider [min]="1" [max]="4" [step]="0.01" class="zoom-slider">
          <input matSliderThumb [ngModel]="zoom()" (ngModelChange)="setZoom($event)">
        </mat-slider>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!loaded()">Use photo</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .crop-viewport {
      position: relative;
      width: 280px;
      height: 280px;
      margin: 0 auto;
      overflow: hidden;
      touch-action: none;
      cursor: grab;
      background: #000;
      border-radius: 8px;
      &:active { cursor: grabbing; }
    }
    .crop-mask {
      position: absolute;
      inset: 0;
      pointer-events: none;
      /* Dim everything outside the circular crop area. */
      background: radial-gradient(circle at center, transparent 49.5%, rgba(0,0,0,.55) 50%);
    }
    .zoom-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      span { font-size: 13px; color: var(--text-secondary); }
      .zoom-slider { flex: 1; }
    }
  `],
})
export class AvatarCropDialogComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly dialogRef = inject(MatDialogRef<AvatarCropDialogComponent>);
  private readonly data = inject<AvatarCropDialogData>(MAT_DIALOG_DATA);

  readonly viewport = VIEWPORT;
  readonly loaded = signal(false);
  readonly zoom = signal(1);

  private image = new Image();
  private baseScale = 1;    // scale that makes the image exactly cover the viewport at zoom 1
  private offsetX = 0;      // pan offset of the image centre relative to the viewport centre
  private offsetY = 0;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private objectUrl = '';

  ngAfterViewInit(): void {
    this.objectUrl = URL.createObjectURL(this.data.file);
    this.image.onload = () => {
      this.baseScale = Math.max(VIEWPORT / this.image.width, VIEWPORT / this.image.height);
      this.loaded.set(true);
      this.draw();
    };
    this.image.src = this.objectUrl;
    this.dialogRef.afterClosed().subscribe(() => URL.revokeObjectURL(this.objectUrl));
  }

  setZoom(value: number) {
    this.zoom.set(value);
    this.clampOffsets();
    this.draw();
  }

  onPointerDown(event: PointerEvent) {
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event: PointerEvent) {
    if (!this.dragging) return;
    this.offsetX += event.clientX - this.lastX;
    this.offsetY += event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.clampOffsets();
    this.draw();
  }

  onPointerUp(_event: PointerEvent) {
    this.dragging = false;
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const next = Math.min(4, Math.max(1, this.zoom() + (event.deltaY < 0 ? 0.1 : -0.1)));
    this.setZoom(next);
  }

  save() {
    const output = document.createElement('canvas');
    output.width = OUTPUT;
    output.height = OUTPUT;
    const ctx = output.getContext('2d')!;
    const ratio = OUTPUT / VIEWPORT;
    ctx.scale(ratio, ratio);
    this.drawImageTo(ctx);
    output.toBlob(blob => this.dialogRef.close(blob), 'image/jpeg', 0.85);
  }

  private clampOffsets() {
    // Keep the image covering the whole viewport — no letterboxing inside the crop circle.
    const scale = this.baseScale * this.zoom();
    const maxX = Math.max(0, (this.image.width * scale - VIEWPORT) / 2);
    const maxY = Math.max(0, (this.image.height * scale - VIEWPORT) / 2);
    this.offsetX = Math.min(maxX, Math.max(-maxX, this.offsetX));
    this.offsetY = Math.min(maxY, Math.max(-maxY, this.offsetY));
  }

  private draw() {
    if (!this.loaded()) return;
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;
    ctx.clearRect(0, 0, VIEWPORT, VIEWPORT);
    this.drawImageTo(ctx);
  }

  private drawImageTo(ctx: CanvasRenderingContext2D) {
    const scale = this.baseScale * this.zoom();
    const width = this.image.width * scale;
    const height = this.image.height * scale;
    const x = VIEWPORT / 2 - width / 2 + this.offsetX;
    const y = VIEWPORT / 2 - height / 2 + this.offsetY;
    ctx.drawImage(this.image, x, y, width, height);
  }
}
