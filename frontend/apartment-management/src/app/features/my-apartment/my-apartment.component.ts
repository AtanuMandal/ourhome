import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { AuthService } from '../../core/services/auth.service';
import { UserService, ApartmentService } from '../../core/services/apartment.service';
import { User } from '../../core/models/user.model';
import { Apartment, formatApartmentLabel } from '../../core/models/apartment.model';

@Component({
  selector: 'app-my-apartment',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatDividerModule,
    MatCardModule,
    PageHeaderComponent,
    LoadingSpinnerComponent,
    SearchableSelectComponent,
  ],
  template: `
    <app-page-header title="My Apartment" [showBack]="false"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else {

        @if (currentUser()?.apts?.length) {
          <div class="card">
            <div class="section-title">Your Apartments</div>
            @for (apt of currentUser()!.apts!; track apt.aid) {
              <div class="apartment-pill">
                <div class="apt-info">
                  <span class="apt-name">{{ apt.nm }}</span>
                  <span class="apt-type">{{ apt.rt }}</span>
                </div>
                <div class="invite-row">
                  <mat-form-field appearance="outline" class="invite-email-field">
                    <mat-label>Registrant's email</mat-label>
                    <input matInput type="email" [ngModel]="shareEmail()" (ngModelChange)="shareEmail.set($event)"
                           placeholder="name@example.com">
                  </mat-form-field>
                  <button mat-stroked-button color="primary" type="button"
                          (click)="sendInviteLink(apt.aid)"
                          [disabled]="sendingLink() || !shareEmail()">
                    Send Invite Link
                  </button>
                </div>
              </div>
            }
          </div>
        }

        @if (currentUser()?.paid) {
          <div class="card pending-card">
            <div class="section-title">Pending Apartment Request</div>
            <p>Your request to join an apartment is awaiting approval from your society admin.</p>
            <div class="pending-info">
              <span class="label">Apartment:</span>
              <span>{{ pendingApartmentName() }}</span>
            </div>
            <div class="pending-info">
              <span class="label">As:</span>
              <span>{{ currentUser()!.prt }}</span>
            </div>
          </div>
        }

        @if (!currentUser()?.paid) {
          <div class="card">
            <div class="section-title">
              {{ currentUser()?.apts?.length ? 'Join Another Apartment' : 'Select Your Apartment' }}
            </div>
            @if (!currentUser()?.apts?.length) {
              <p class="help-text">You're not linked to any apartment yet. Select the apartment you live in and submit a request. Your society admin will approve it.</p>
            }
            <form [formGroup]="joinForm" (ngSubmit)="submitJoinRequest()" novalidate>
              <app-searchable-select label="Apartment" formControlName="apartmentId"
                [options]="apartmentJoinOptions()" errorMessage="Please select an apartment"></app-searchable-select>

              <app-searchable-select label="I am a" formControlName="residentType"
                [options]="residentTypeOptions"></app-searchable-select>

              <button mat-raised-button color="primary" type="submit"
                      class="full-width" style="height:48px;margin-top:8px"
                      [disabled]="submittingJoin() || joinForm.invalid || apartments().length === 0">
                Submit Request
              </button>
            </form>
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .section-title { font-size:15px; font-weight:600; margin-bottom:12px; }
    .apartment-pill { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-start; gap:12px;
      padding:12px; border:1px solid var(--border); border-radius:12px; margin-bottom:8px; background:#fafafa; }
    .apt-info { display:flex; flex-direction:column; gap:4px; }
    .apt-name { font-size:14px; font-weight:500; }
    .apt-type { font-size:12px; color:var(--primary-light); font-weight:600; }
    .invite-row { display:flex; align-items:flex-start; gap:8px; flex-wrap:wrap; }
    .invite-email-field { width:220px; }
    .pending-card { background:#fff8e1; border:1px solid #ffe082; }
    .pending-info { display:flex; gap:12px; padding:6px 0; font-size:14px;
      .label { color:var(--text-secondary); font-size:13px; width:100px; } }
    .help-text { color:var(--text-secondary); font-size:13px; margin:0 0 16px; }
    .full-width { width:100%; }
  `],
})
export class MyApartmentComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly userSvc = inject(UserService);
  private readonly apartmentSvc = inject(ApartmentService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly submittingJoin = signal(false);
  readonly sendingLink = signal(false);
  readonly shareEmail = signal('');
  readonly residentTypeOptions = [
    { value: 'Owner', label: 'Owner' },
    { value: 'Tenant', label: 'Tenant' },
  ];
  readonly currentUser = signal<User | null>(null);
  readonly apartments = signal<Apartment[]>([]);     // unlinked apartments for the join form
  readonly apartmentJoinOptions = computed(() =>
    this.apartments().map(a => ({ value: a.id, label: formatApartmentLabel(a) }))
  );
  private readonly allApartments = signal<Apartment[]>([]); // full list for name lookups

  readonly joinForm = this.fb.group({
    apartmentId: ['', Validators.required],
    residentType: ['Owner' as 'Owner' | 'Tenant', Validators.required],
  });

  formatApartmentLabel(apt: Apartment) { return formatApartmentLabel(apt); }

  pendingApartmentName(): string {
    const pid = this.currentUser()?.paid;
    if (!pid) return '';
    const apt = this.allApartments().find(a => a.id === pid);
    return apt ? formatApartmentLabel(apt) : pid;
  }

  ngOnInit() {
    const sid = this.auth.societyId();
    const uid = this.auth.user()?.id;
    if (!sid || !uid) { this.loading.set(false); return; }

    forkJoin({
      user: this.userSvc.get(sid, uid),
      apartments: this.apartmentSvc.list(sid, 1, 500),
    }).subscribe({
      next: ({ user, apartments }) => {
        this.currentUser.set(user);
        this.allApartments.set(apartments.items);
        const linked = new Set((user.apts ?? []).map(a => a.aid));
        this.apartments.set(apartments.items.filter(a => !linked.has(a.id)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  submitJoinRequest() {
    if (this.joinForm.invalid) return;
    const sid = this.auth.societyId();
    const uid = this.auth.user()?.id;
    if (!sid || !uid) return;

    this.submittingJoin.set(true);
    const { apartmentId, residentType } = this.joinForm.getRawValue();
    this.userSvc.requestApartmentJoin(sid, uid, { apartmentId, residentType }).subscribe({
      next: updated => {
        this.currentUser.set(updated);
        this.submittingJoin.set(false);
        this.snackBar.open('Request submitted! Waiting for admin approval.', 'Dismiss', { duration: 5000 });
      },
      error: () => this.submittingJoin.set(false),
    });
  }

  sendInviteLink(apartmentId: string) {
    const sid = this.auth.societyId();
    const email = this.shareEmail().trim();
    if (!sid || !email) return;

    this.sendingLink.set(true);
    this.userSvc.shareInviteLink(sid, email, apartmentId).subscribe({
      next: () => {
        this.sendingLink.set(false);
        this.shareEmail.set('');
        this.snackBar.open(`Registration link sent to ${email}.`, 'Dismiss', { duration: 3000 });
      },
      error: () => this.sendingLink.set(false),
    });
  }
}
