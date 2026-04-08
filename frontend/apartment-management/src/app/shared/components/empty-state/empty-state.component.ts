import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="empty-state">
      <mat-icon class="empty-icon">{{ icon }}</mat-icon>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      gap: 8px;
    }
    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #cbd5e1;
    }
    h3 { font-size: 16px; color: #374151; margin: 8px 0 4px; }
    p  { font-size: 14px; color: #9ca3af; margin: 0; }
  `],
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'Nothing here yet';
  @Input() message = '';
}
