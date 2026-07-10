import { Component, EventEmitter, HostBinding, Input, Output, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';
import { SecureImageComponent } from '../secure-image/secure-image.component';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']);

const FILE_ICONS: Record<string, string> = {
  pdf: 'picture_as_pdf',
  doc: 'description',
  docx: 'description',
  xls: 'table_chart',
  xlsx: 'table_chart',
};

function extensionOf(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const match = /\.([a-z0-9]+)$/i.exec(clean);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Renders a payment-proof / document thumbnail: images use the existing SecureImageComponent
 * flow unchanged (clickable -> caller's lightbox via imageClick). Non-image files (PDF/Word/Excel)
 * render a file-type icon tile instead, and clicking it downloads the file through the same
 * authenticated endpoint and opens it in a new browser tab — a plain `<a href>` to the raw API URL
 * won't authenticate, since these containers require the JWT-interceptor-attached HttpClient.
 */
@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule, UpperCasePipe, SecureImageComponent],
  template: `
    @if (isImage()) {
      <app-secure-image [src]="src" [alt]="alt" [imgClass]="imgClass" [clickable]="clickable"
        (imageClick)="imageClick.emit()"></app-secure-image>
    } @else {
      <div class="file-preview__tile" [class.file-preview__tile--fill]="!!imgClass" (click)="viewFile()">
        @if (opening()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          <mat-icon>{{ fileIcon() }}</mat-icon>
          <span class="file-preview__ext">{{ extension() | uppercase }}</span>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      overflow: hidden;
    }
    .file-preview__tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      background: var(--background, #f5f5f5);
      color: var(--text-secondary, #757575);
      min-height: 48px;
      cursor: pointer;

      &--fill { width: 100%; height: 100%; min-height: 0; }
    }
    .file-preview__ext {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
  `],
})
export class FilePreviewComponent {
  @Input({ required: true }) src!: string;
  @Input() alt = '';
  @Input() imgClass = '';
  @Input() clickable = false;
  @Output() imageClick = new EventEmitter<void>();

  @HostBinding('class') get hostClass(): string { return this.imgClass; }

  private readonly api = inject(ApiService);

  readonly opening = signal(false);

  isImage(): boolean {
    return IMAGE_EXTENSIONS.has(this.extension());
  }

  extension(): string {
    return this.src ? extensionOf(this.src) : '';
  }

  fileIcon(): string {
    return FILE_ICONS[this.extension()] ?? 'insert_drive_file';
  }

  viewFile(): void {
    if (this.opening() || !this.src) return;

    this.opening.set(true);
    this.api.download(this.src).subscribe({
      next: response => {
        this.opening.set(false);
        const blob = response.body;
        if (!blob) return;
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank');
        // Give the new tab time to load the blob before freeing it.
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: () => this.opening.set(false),
    });
  }
}
