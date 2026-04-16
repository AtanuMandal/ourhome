import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-maintenance-dashboard',
  standalone: true,
  imports: [LoadingSpinnerComponent],
  template: `
    <div class="page-content">
      <app-loading-spinner></app-loading-spinner>
    </div>
  `,
})
export class MaintenanceDashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    queueMicrotask(() => {
      this.router.navigate([this.auth.isAdmin() ? 'admin' : 'my'], {
        relativeTo: this.route,
        replaceUrl: true,
      });
    });
  }
}
