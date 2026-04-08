import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-resident-profile',
  standalone: true,
  imports: [MatButtonModule, PageHeaderComponent, LoadingSpinnerComponent],
  template: `
    <app-page-header [title]="user()?.name ?? 'Profile'" [showBack]="true"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (user()) {
        <div class="profile-header">
          <div class="avatar avatar-xl">{{ initials() }}</div>
          <h2>{{ user()!.name }}</h2>
          <span class="role-chip">{{ user()!.role }}</span>
        </div>
        <div class="card" style="margin-top:16px">
          <div class="row"><span class="label">Email</span><span>{{ user()!.email }}</span></div>
          @if (user()!.phone) {
            <div class="row"><span class="label">Phone</span><span>{{ user()!.phone }}</span></div>
          }
          <div class="row"><span class="label">Apartment</span><span>{{ user()!.apartmentId ?? '–' }}</span></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-header { text-align:center; padding:32px 16px 16px;
      .avatar-xl { width:80px;height:80px;font-size:28px;margin:0 auto 12px;
        border-radius:50%;background:var(--primary-light);color:white;
        display:flex;align-items:center;justify-content:center;font-weight:700; }
      h2 { font-size:20px;margin:0 0 4px; }
    }
    .role-chip { font-size:12px;background:rgba(25,118,210,.1);color:var(--primary-light);
      padding:3px 10px;border-radius:999px;font-weight:500; }
    .row { display:flex;justify-content:space-between;padding:12px 0;font-size:14px;
      border-bottom:1px solid var(--border); &:last-child { border-bottom:none; }
      .label { color:var(--text-secondary);font-size:13px; }
    }
  `],
})
export class ResidentProfileComponent implements OnInit {
  private readonly svc   = inject(UserService);
  private readonly auth  = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly user    = signal<User | null>(null);
  initials = () => this.user()?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) ?? '';

  ngOnInit() {
    const sid = this.auth.societyId()!;
    const id  = this.route.snapshot.paramMap.get('id')!;
    this.svc.get(sid, id).subscribe({
      next: u => { this.user.set(u); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
