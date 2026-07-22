import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { SocietyService } from '../../core/services/society.service';
import { AuthService } from '../../core/services/auth.service';
import { Society } from '../../core/models/society.model';

@Component({
  selector: 'app-hq-societies-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, PageHeaderComponent, LoadingSpinnerComponent, StatusChipComponent],
  template: `
    <app-page-header title="Societies" subtitle="Platform-wide society directory">
      <div actions>
        @if (isHqAdmin()) {
          <a routerLink="/hq/societies/new" mat-raised-button color="primary">
            <mat-icon>add</mat-icon>
            Add Society
          </a>
        }
      </div>
    </app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {
        @for (society of societies(); track society.id) {
          <div class="card society-row">
            <div class="society-info">
              <div class="society-name">{{ society.nm }}</div>
              <div class="society-meta">
                {{ society.addr.cty }}, {{ society.addr.ste }} &middot; {{ society.ta }} apartments
              </div>
            </div>
            <app-status-chip [status]="society.st"></app-status-chip>
            <div class="society-actions">
              <a mat-stroked-button [routerLink]="['/hq/societies', society.id, 'report']">Report</a>
              @if (isHqAdmin()) {
                <a mat-stroked-button [routerLink]="['/hq/societies', society.id, 'edit']">Edit</a>
                @if (society.st === 'Active') {
                  <button mat-stroked-button color="warn" (click)="deactivate(society)">Disable</button>
                } @else {
                  <button mat-stroked-button color="primary" (click)="activate(society)">Enable</button>
                }
              }
            </div>
          </div>
        } @empty {
          <div class="card">No societies found.</div>
        }
      }
    </div>
  `,
  styles: [`
    .society-row { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
    .society-info { flex:1; min-width:180px; }
    .society-name { font-weight:600; }
    .society-meta { color:var(--text-secondary); font-size:13px; margin-top:2px; }
    .society-actions { display:flex; gap:8px; }
  `],
})
export class HqSocietiesListComponent implements OnInit {
  private readonly svc = inject(SocietyService);
  private readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly societies = signal<Society[]>([]);
  readonly isHqAdmin = this.auth.isHqAdmin;

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.svc.list(1, 100).subscribe({
      next: res => {
        this.societies.set(res.items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  activate(society: Society) {
    this.svc.activate(society.id).subscribe({
      next: () => {
        this.snackBar.open(`${society.nm} enabled.`, 'Dismiss', { duration: 3000 });
        this.load();
      },
    });
  }

  deactivate(society: Society) {
    this.svc.deactivate(society.id).subscribe({
      next: () => {
        this.snackBar.open(`${society.nm} disabled.`, 'Dismiss', { duration: 3000 });
        this.load();
      },
    });
  }
}
