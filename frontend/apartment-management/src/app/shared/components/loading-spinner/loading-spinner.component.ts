import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="spinner-wrap">
      <mat-spinner diameter="40"></mat-spinner>
    </div>
  `,
  styles: [`
    .spinner-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 48px 16px;
    }
  `],
})
export class LoadingSpinnerComponent {}
