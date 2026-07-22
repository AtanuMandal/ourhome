import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { UserAvatarComponent } from '../../shared/components/user-avatar/user-avatar.component';
import { UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

const ROLE_ORDER: string[] = ['SUAdmin', 'HQAdmin', 'HQUser', 'SUSecurity', 'SUUser'];
const ROLE_LABELS: Record<string, string> = {
  SUAdmin: 'Society Admins',
  HQAdmin: 'HQ Admins',
  HQUser: 'HQ Viewers',
  SUSecurity: 'Security',
  SUUser: 'Residents',
};

interface RoleGroup { role: string; label: string; users: User[]; }

@Component({
  selector: 'app-resident-list',
  standalone: true,
  imports: [RouterLink, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent, UserAvatarComponent],
  template: `
    <app-page-header title="Users"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {

        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search by name, email, phone or apartment</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search users…">
        </mat-form-field>

        @if (isAdmin() && pendingRequests().length > 0) {
          <div class="section-title pending-title">Pending Apartment Requests ({{ pendingRequests().length }})</div>
          @for (r of pendingRequests(); track r.id) {
            <div class="pending-card">
              <div class="pending-info">
                <span class="rc-name">{{ r.fn ?? r.nm }}</span>
                <span class="pending-detail">Wants to join: {{ r.paid }} as {{ r.prt }}</span>
              </div>
              <div class="pending-actions">
                <button mat-raised-button color="primary" type="button"
                        (click)="approveRequest(r)" [disabled]="actioning()">
                  Approve
                </button>
                <button mat-stroked-button color="warn" type="button"
                        (click)="denyRequest(r)" [disabled]="actioning()">
                  Deny
                </button>
              </div>
            </div>
          }
        }

        @if (isAdmin()) {
          <div class="invite-section">
            <div class="invite-section__row">
              <mat-form-field appearance="outline" class="invite-email-field">
                <mat-label>Registrant's email</mat-label>
                <input matInput type="email" [ngModel]="shareEmail()" (ngModelChange)="shareEmail.set($event)"
                       placeholder="name@example.com">
              </mat-form-field>
              <button mat-stroked-button color="primary" type="button"
                      (click)="sendInviteLink()" [disabled]="sendingLink() || !shareEmail()">
                <mat-icon>mail_outline</mat-icon>
                {{ sendingLink() ? 'Sending…' : 'Send Registration Link' }}
              </button>
            </div>
          </div>
        }

        @if (filtered().length === 0) {
          <app-empty-state icon="people" title="No users" message="No users found.">
            @if (isAdmin()) {
              <a routerLink="new" mat-stroked-button color="primary" style="margin-top:16px">Add Resident</a>
            }
          </app-empty-state>
        } @else {
          @for (group of groupedByRole(); track group.role) {
            <div class="section-title">{{ group.label }} ({{ group.users.length }})</div>
            <div class="resident-list">
              @for (r of group.users; track r.id) {
                <div class="resident-card">
                  <a [routerLink]="[r.id]" class="resident-card-link">
                    <app-user-avatar class="rc-avatar"
                      [name]="r.fn ?? r.nm ?? '?'"
                      [pictureUrl]="r.pic"
                      (click)="onAvatarClick($event, r)"></app-user-avatar>
                    <div class="rc-info">
                      <span class="rc-name">{{ r.fn ?? r.nm }}</span>
                      <span class="rc-email">Apartments: {{ apartmentNamesFor(r) }}</span>
                      @if (r.em) { <span class="rc-email">{{ r.em }}</span> }
                      @if (r.ph) { <span class="rc-phone">{{ r.ph }}</span> }
                    </div>
                  </a>
                  @if (isAdmin()) {
                    <button mat-icon-button type="button" aria-label="Delete user"
                            [disabled]="deleting() === r.id" (click)="deleteUser(r)">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  }
                </div>
              }
            </div>
          }
        }
      }
    </div>
    @if (isAdmin()) {
      <a routerLink="new" mat-fab color="primary" class="fab"><mat-icon>add</mat-icon></a>
    }
  `,
  styles: [`
    .pending-title { font-size:14px; font-weight:600; color:var(--warn,#f57c00); margin:0 0 8px; }
    .pending-card { display:flex; justify-content:space-between; align-items:center; gap:12px;
      padding:12px; background:#fff8e1; border:1px solid #ffe082; border-radius:12px; margin-bottom:8px; }
    .pending-info { display:flex; flex-direction:column; gap:4px; }
    .pending-detail { font-size:12px; color:var(--text-secondary); }
    .pending-actions { display:flex; gap:8px; flex-shrink:0; }
    .invite-section { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
    .invite-section__row { display:flex; align-items:flex-start; gap:8px; flex-wrap:wrap; }
    .invite-email-field { flex:1; min-width:220px; }
    .rc-name { font-weight:500; font-size:14px; }
    .search-field { width:100%; margin-bottom:12px; }
    .section-title { font-size:14px; font-weight:600; color:var(--text-secondary); margin:16px 0 8px; text-transform:uppercase; letter-spacing:.02em; }
    .resident-card { display:flex; align-items:center; gap:4px; }
    .resident-card-link { flex:1; min-width:0; }
  `],
  styleUrl: './residents.scss',
})
export class ResidentListComponent implements OnInit {
  private readonly userSvc = inject(UserService);
  private readonly auth    = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly actioning = signal(false);
  readonly sendingLink = signal(false);
  readonly deleting = signal<string | null>(null);
  readonly items   = signal<User[]>([]);
  readonly pendingRequests = signal<User[]>([]);
  readonly shareEmail = signal('');
  readonly isAdmin = this.auth.isAdmin;
  readonly search = signal('');

  readonly filtered = computed<User[]>(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.items();
    if (!term) return list;
    return list.filter(r =>
      (r.fn ?? r.nm ?? '').toLowerCase().includes(term) ||
      (r.em ?? '').toLowerCase().includes(term) ||
      (r.ph ?? '').toLowerCase().includes(term) ||
      this.apartmentNamesFor(r).toLowerCase().includes(term)
    );
  });

  /** Keep the avatar's zoom lightbox from also triggering the row's profile navigation. */
  onAvatarClick(event: Event, user: User) {
    if (user.pic) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  readonly groupedByRole = computed<RoleGroup[]>(() => {
    const byRole = new Map<string, User[]>();
    for (const user of this.filtered()) {
      const role = user.rl ?? 'SUUser';
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role)!.push(user);
    }
    const roles = [...byRole.keys()].sort((a, b) => {
      const ia = ROLE_ORDER.indexOf(a);
      const ib = ROLE_ORDER.indexOf(b);
      return (ia === -1 ? ROLE_ORDER.length : ia) - (ib === -1 ? ROLE_ORDER.length : ib);
    });
    return roles.map(role => ({ role, label: ROLE_LABELS[role] ?? role, users: byRole.get(role)! }));
  });

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }

    this.userSvc.list(sid, 1, 500).subscribe({
      next: residents => {
        this.items.set(residents.items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    if (this.auth.isAdmin()) {
      this.userSvc.getPendingJoinRequests(sid).subscribe({
        next: pending => this.pendingRequests.set(pending ?? []),
        error: () => {},
      });
    }
  }

  apartmentNamesFor(resident: User) {
    if (!resident.apts?.length) return 'Not assigned';
    return resident.apts.map(apartment => `${apartment.nm} (${apartment.rt})`).join(', ');
  }

  deleteUser(user: User) {
    const sid = this.auth.societyId();
    if (!sid) return;
    if (!confirm(`Delete ${user.fn ?? user.nm}? This cannot be undone.`)) return;

    this.deleting.set(user.id);
    this.userSvc.delete(sid, user.id).subscribe({
      next: () => {
        this.items.update(list => list.filter(u => u.id !== user.id));
        this.deleting.set(null);
        this.snackBar.open('User deleted.', 'Dismiss', { duration: 3000 });
      },
      // The global error interceptor already surfaces the backend's specific
      // validation message (apartment mapping / pending dues) as a snackbar.
      error: () => this.deleting.set(null),
    });
  }

  sendInviteLink() {
    const sid = this.auth.societyId();
    const email = this.shareEmail().trim();
    if (!sid || !email) return;
    this.sendingLink.set(true);
    this.userSvc.shareInviteLink(sid, email).subscribe({
      next: () => {
        this.sendingLink.set(false);
        this.shareEmail.set('');
        this.snackBar.open(`Registration link sent to ${email}.`, 'Dismiss', { duration: 3000 });
      },
      error: () => this.sendingLink.set(false),
    });
  }

  approveRequest(user: User) {
    const sid = this.auth.societyId();
    if (!sid) return;
    this.actioning.set(true);
    this.userSvc.approveApartmentJoin(sid, user.id).subscribe({
      next: () => {
        this.pendingRequests.update(list => list.filter(u => u.id !== user.id));
        this.items.update(list => list.map(u => u.id === user.id
          ? { ...u, paid: undefined, prt: undefined }
          : u));
        this.actioning.set(false);
        this.snackBar.open('Request approved.', 'Dismiss', { duration: 3000 });
      },
      error: () => this.actioning.set(false),
    });
  }

  denyRequest(user: User) {
    const sid = this.auth.societyId();
    if (!sid) return;
    this.actioning.set(true);
    this.userSvc.denyApartmentJoin(sid, user.id).subscribe({
      next: () => {
        this.pendingRequests.update(list => list.filter(u => u.id !== user.id));
        this.actioning.set(false);
        this.snackBar.open('Request denied.', 'Dismiss', { duration: 3000 });
      },
      error: () => this.actioning.set(false),
    });
  }
}
