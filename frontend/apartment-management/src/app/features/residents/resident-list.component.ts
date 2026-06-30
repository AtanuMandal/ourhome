import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-resident-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule,
            PageHeaderComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <app-page-header title="Residents"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {

        @if (isAdmin() && pendingRequests().length > 0) {
          <div class="section-title pending-title">Pending Apartment Requests ({{ pendingRequests().length }})</div>
          @for (r of pendingRequests(); track r.id) {
            <div class="pending-card">
              <div class="pending-info">
                <span class="rc-name">{{ r.fullName ?? r.name }}</span>
                <span class="pending-detail">Wants to join: {{ r.pendingApartmentId }} as {{ r.pendingResidentType }}</span>
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
            <button mat-stroked-button color="primary" type="button"
                    (click)="generateInviteLink()" [disabled]="generatingLink()">
              <mat-icon>link</mat-icon>
              {{ generatingLink() ? 'Generating…' : 'Generate Registration Link' }}
            </button>
            @if (inviteUrl()) {
              <div class="invite-link-box">
                <span class="invite-url">{{ inviteUrl() }}</span>
                <button mat-icon-button type="button" (click)="copyInviteLink()">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
            }
          </div>
        }

        @if (items().length === 0) {
          <app-empty-state icon="people" title="No residents" message="No residents found.">
            @if (isAdmin()) {
              <a routerLink="new" mat-stroked-button color="primary" style="margin-top:16px">Add Resident</a>
            }
          </app-empty-state>
        } @else {
          <div class="resident-list">
            @for (r of items(); track r.id) {
              <a [routerLink]="[r.id]" class="resident-card">
                <div class="avatar">{{ (r.fullName ?? r.name ?? '?')[0] }}</div>
                <div class="rc-info">
                  <span class="rc-name">{{ r.fullName ?? r.name }}</span>
                  <span class="rc-email">Apartments: {{ apartmentNamesFor(r) }}</span>
                  @if (isAdmin() && r.email) { <span class="rc-email">{{ r.email }}</span> }
                  @if (isAdmin() && r.phone) { <span class="rc-phone">{{ r.phone }}</span> }
                </div>
              </a>
            }
          </div>
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
    .invite-link-box { display:flex; align-items:center; gap:8px; background:#e8f5e9; border:1px solid #a5d6a7;
      border-radius:8px; padding:8px 12px; }
    .invite-url { font-size:12px; font-family:monospace; color:var(--text-secondary); word-break:break-all; flex:1; }
    .rc-name { font-weight:500; font-size:14px; }
  `],
  styleUrl: './residents.scss',
})
export class ResidentListComponent implements OnInit {
  private readonly userSvc = inject(UserService);
  private readonly auth    = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly clipboard = inject(Clipboard);

  readonly loading = signal(true);
  readonly actioning = signal(false);
  readonly generatingLink = signal(false);
  readonly items   = signal<User[]>([]);
  readonly pendingRequests = signal<User[]>([]);
  readonly inviteUrl = signal<string | null>(null);
  readonly isAdmin = this.auth.isAdmin;

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) { this.loading.set(false); return; }

    this.userSvc.list(sid).subscribe({
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
    if (!resident.apartments?.length) return 'Not assigned';
    return resident.apartments.map(apartment => `${apartment.name} (${apartment.residentType})`).join(', ');
  }

  generateInviteLink() {
    const sid = this.auth.societyId();
    if (!sid) return;
    this.generatingLink.set(true);
    this.userSvc.generateInviteLink(sid).subscribe({
      next: link => {
        const url = `${window.location.origin}${link.inviteUrl}`;
        this.inviteUrl.set(url);
        this.generatingLink.set(false);
      },
      error: () => this.generatingLink.set(false),
    });
  }

  copyInviteLink() {
    const url = this.inviteUrl();
    if (!url) return;
    this.clipboard.copy(url);
    this.snackBar.open('Link copied!', 'Dismiss', { duration: 3000 });
  }

  approveRequest(user: User) {
    const sid = this.auth.societyId();
    if (!sid) return;
    this.actioning.set(true);
    this.userSvc.approveApartmentJoin(sid, user.id).subscribe({
      next: () => {
        this.pendingRequests.update(list => list.filter(u => u.id !== user.id));
        this.items.update(list => list.map(u => u.id === user.id
          ? { ...u, pendingApartmentId: undefined, pendingResidentType: undefined }
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
