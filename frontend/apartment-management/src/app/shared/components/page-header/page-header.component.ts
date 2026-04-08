import { Component, Input } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatButtonModule],
  template: `
    <header class="page-header">
      @if (showBack) {
        <button mat-icon-button class="back-btn" (click)="goBack()" aria-label="Go back">
          <mat-icon>arrow_back</mat-icon>
        </button>
      }
      <div class="header-title">
        <h1>{{ title }}</h1>
        @if (subtitle) {
          <p class="subtitle">{{ subtitle }}</p>
        }
      </div>
      <ng-content select="[actions]"></ng-content>
    </header>
  `,
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() showBack = false;

  constructor(private location: Location) {}

  goBack() { this.location.back(); }
}
