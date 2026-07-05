import { Component, EventEmitter, HostBinding, Input, OnChanges, OnDestroy, Output, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../core/services/api.service';

/**
 * Renders an image that lives behind an authenticated app endpoint (e.g. `files/visitor-images/...`)
 * instead of a raw, long-lived Azure Blob Storage / SAS URL. Fetches the bytes via the existing
 * JWT-interceptor-attached HttpClient and renders them as a local blob: object URL — a direct
 * navigation to the underlying API URL without a valid session still gets a 401/403.
 *
 * `imgClass` is reflected onto the component's own host element (not an inner element) via
 * @HostBinding — Angular's view encapsulation scopes a parent's CSS rules to elements declared
 * in the parent's own template, so a class merely passed down to an element *inside* this
 * component's template would never actually be styled by the caller's stylesheet. Binding it to
 * the host lets callers keep reusing plain CSS classes like `.vc-avatar-img` unchanged. The inner
 * `<img>` always fills 100% of that host box so the caller's width/height/border-radius apply as
 * expected; with no `imgClass` (e.g. inside the zoom lightbox) the image instead sizes naturally.
 */
@Component({
  selector: 'app-secure-image',
  standalone: true,
  imports: [MatIconModule, MatProgressSpinnerModule],
  template: `
    @if (loading()) {
      <div class="secure-image__placeholder" [class.secure-image__placeholder--fill]="!!imgClass">
        <mat-spinner diameter="20"></mat-spinner>
      </div>
    } @else if (objectUrl()) {
      <img [src]="objectUrl()" [alt]="alt" [class.secure-image__img--fill]="!!imgClass"
           [class.secure-image--clickable]="clickable" (click)="onClick()">
    } @else {
      <div class="secure-image__placeholder" [class.secure-image__placeholder--fill]="!!imgClass" (click)="onClick()">
        <mat-icon>broken_image</mat-icon>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      overflow: hidden;
    }
    .secure-image__placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--background, #f5f5f5);
      color: var(--text-secondary, #757575);
      min-height: 48px;

      &--fill { width: 100%; height: 100%; min-height: 0; }
    }
    .secure-image__img--fill {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    img:not(.secure-image__img--fill) {
      display: block;
      max-width: 100%;
      height: auto;
    }
    .secure-image--clickable { cursor: pointer; }
  `],
})
export class SecureImageComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) src!: string;
  @Input() alt = '';
  @Input() imgClass = '';
  @Input() clickable = false;
  @Output() imageClick = new EventEmitter<void>();

  // Reflects imgClass onto <app-secure-image> itself so the caller's own (encapsulated) CSS
  // class — e.g. `.vc-avatar-img { width:44px; height:44px; border-radius:50% }` — actually applies.
  @HostBinding('class') get hostClass(): string { return this.imgClass; }

  private readonly api = inject(ApiService);

  readonly loading = signal(true);
  readonly objectUrl = signal<string | null>(null);

  ngOnChanges(): void {
    this.revokeObjectUrl();
    if (!this.src) {
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.api.download(this.src).subscribe({
      next: response => {
        const blob = response.body;
        this.objectUrl.set(blob ? URL.createObjectURL(blob) : null);
        this.loading.set(false);
      },
      error: () => {
        this.objectUrl.set(null);
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  onClick(): void {
    if (this.clickable) this.imageClick.emit();
  }

  private revokeObjectUrl(): void {
    const url = this.objectUrl();
    if (url) URL.revokeObjectURL(url);
    this.objectUrl.set(null);
  }
}
