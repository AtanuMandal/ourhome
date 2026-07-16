import { Component, Input, signal } from '@angular/core';
import { SecureImageComponent } from '../secure-image/secure-image.component';
import { ImageLightboxComponent } from '../image-lightbox/image-lightbox.component';

/**
 * User avatar shown wherever a user is listed: renders the profile picture when one exists
 * (with the standard click-to-zoom lightbox), otherwise the user's initials.
 */
@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [SecureImageComponent, ImageLightboxComponent],
  template: `
    @if (pictureUrl) {
      <app-secure-image [src]="pictureUrl" [alt]="name" imgClass="user-avatar__img"
        [clickable]="zoom" (imageClick)="lightboxOpen.set(true)"></app-secure-image>
      @if (zoom) {
        <app-image-lightbox [open]="lightboxOpen()" [src]="pictureUrl"
          (closed)="lightboxOpen.set(false)"></app-image-lightbox>
      }
    } @else {
      <div class="user-avatar__initials">{{ initials }}</div>
    }
  `,
  styles: [`
    :host { display: inline-block; }
    :host, .user-avatar__img, .user-avatar__initials {
      width: var(--avatar-size, 40px);
      height: var(--avatar-size, 40px);
    }
    .user-avatar__img { border-radius: 50%; }
    .user-avatar__initials {
      border-radius: 50%;
      background: var(--primary-light, #1976d2);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: calc(var(--avatar-size, 40px) * 0.38);
      text-transform: uppercase;
    }
  `],
})
export class UserAvatarComponent {
  @Input({ required: true }) name = '';
  @Input() pictureUrl: string | null | undefined;
  /** Click-to-zoom on the picture; disable in dense contexts. */
  @Input() zoom = true;

  readonly lightboxOpen = signal(false);

  get initials(): string {
    return this.name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2);
  }
}
