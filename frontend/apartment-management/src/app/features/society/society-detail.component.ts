import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { SearchableSelectComponent, SelectOption } from '../../shared/components/searchable-select/searchable-select.component';
import { SocietyService } from '../../core/services/society.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/apartment.service';
import { Society, SocietyCommittee, SocietyUserAssignment } from '../../core/models/society.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-society-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatDividerModule,
    PageHeaderComponent,
    LoadingSpinnerComponent,
    SearchableSelectComponent,
  ],
  template: `
    <app-page-header title="Society Details"></app-page-header>
    <div class="page-content">
      @if (loading()) {
        <app-loading-spinner></app-loading-spinner>
      } @else if (!editing()) {
        <div class="card">
          <div class="society-brand">
            <div class="soc-icon"><span class="material-icons">location_city</span></div>
            <h2>{{ society()?.name }}</h2>
          </div>
          <mat-divider style="margin:16px 0"></mat-divider>
          <div class="detail-row"><span class="label">Address</span><span>{{ society()?.address?.street }}</span></div>
          <div class="detail-row"><span class="label">City</span><span>{{ society()?.address?.city }}, {{ society()?.address?.state }}</span></div>
          <div class="detail-row"><span class="label">PIN</span><span>{{ society()?.address?.postalCode }}</span></div>
          <div class="detail-row"><span class="label">Country</span><span>{{ society()?.address?.country }}</span></div>
           <div class="detail-row"><span class="label">Apartments</span><span>{{ society()?.totalApartments }}</span></div>
           <div class="detail-row"><span class="label">User cap per apartment</span><span>{{ society()?.maxUsersPerApartment }} user(s)</span></div>
           <div class="detail-row"><span class="label">Overdue threshold</span><span>{{ society()?.maintenanceOverdueThresholdDays }} day(s)</span></div>
           <div class="detail-row"><span class="label">Visitor overstay threshold</span><span>{{ society()?.visitorOverstayThresholdHours }} hour(s)</span></div>
           @if (society()?.contactEmail) {
             <div class="detail-row"><span class="label">Email</span><span>{{ society()?.contactEmail }}</span></div>
          }
          @if (society()?.contactPhone) {
            <div class="detail-row"><span class="label">Phone</span><span>{{ society()?.contactPhone }}</span></div>
          }
          @if (society()?.societyUsers?.length) {
            <mat-divider style="margin:16px 0"></mat-divider>
            <div class="section-title">Society Users</div>
            @for (user of society()!.societyUsers; track user.userId + user.roleTitle) {
              <div class="detail-card">
                <div class="detail-card__title">{{ user.fullName }}</div>
                <div class="detail-card__meta">{{ user.email }}</div>
                <div class="detail-card__role">{{ user.roleTitle }}</div>
              </div>
            }
          }
          @if (society()?.committees?.length) {
            <mat-divider style="margin:16px 0"></mat-divider>
            <div class="section-title">Committees</div>
            @for (committee of society()!.committees; track committee.name) {
              <div class="committee-card">
                <div class="detail-card__title">{{ committee.name }}</div>
                @for (member of committee.members; track member.userId + member.roleTitle) {
                  <div class="committee-member">
                    <span>{{ member.fullName }}</span>
                    <span>{{ member.roleTitle }}</span>
                  </div>
                }
              </div>
            }
          }
          @if (isAdmin()) {
            <div class="primary-actions">
              <a mat-stroked-button routerLink="/apartments">Manage Apartments</a>
              <a mat-stroked-button color="primary" routerLink="/apartments/new">Add Apartment</a>
              <button mat-raised-button color="primary" class="primary-action" (click)="startEditing()">
                Edit Society
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="card">
          <div class="section-title">Branding</div>
          <div class="section-copy">Shown at the top of every user's sidenav, and as the sidenav's background (70% opacity). Leave unset to use the default.</div>
          <div class="branding-row">
            <div class="branding-preview">
              @if (society()?.logoUrl) {
                <img [src]="absoluteUrl(society()!.logoUrl!)" alt="Society logo" class="branding-thumb">
              } @else {
                <div class="branding-thumb branding-thumb--empty">No logo</div>
              }
              <div class="branding-actions">
                <span>Sidenav logo</span>
                <button mat-stroked-button type="button" [disabled]="uploadingLogo()" (click)="logoInput.click()">
                  {{ uploadingLogo() ? 'Uploading…' : (society()?.logoUrl ? 'Change' : 'Upload') }}
                </button>
                @if (society()?.logoUrl) {
                  <button mat-stroked-button color="warn" type="button" [disabled]="uploadingLogo()" (click)="removeLogo()">
                    Remove
                  </button>
                }
                <input #logoInput type="file" accept="image/*" hidden (change)="onLogoSelected($event)">
              </div>
            </div>
            <div class="branding-preview">
              @if (society()?.sidenavBackgroundUrl) {
                <img [src]="absoluteUrl(society()!.sidenavBackgroundUrl!)" alt="Sidenav background" class="branding-thumb">
              } @else {
                <div class="branding-thumb branding-thumb--empty">No background</div>
              }
              <div class="branding-actions">
                <span>Sidenav background</span>
                <button mat-stroked-button type="button" [disabled]="uploadingBackground()" (click)="backgroundInput.click()">
                  {{ uploadingBackground() ? 'Uploading…' : (society()?.sidenavBackgroundUrl ? 'Change' : 'Upload') }}
                </button>
                @if (society()?.sidenavBackgroundUrl) {
                  <button mat-stroked-button color="warn" type="button" [disabled]="uploadingBackground()" (click)="removeBackgroundImage()">
                    Remove
                  </button>
                }
                <input #backgroundInput type="file" accept="image/*" hidden (change)="onBackgroundSelected($event)">
              </div>
            </div>
          </div>
          <mat-divider style="margin:16px 0"></mat-divider>

          <form [formGroup]="form" (ngSubmit)="save()" novalidate>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Society Name</mat-label>
              <input matInput formControlName="name">
            </mat-form-field>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Contact Email</mat-label>
              <input matInput formControlName="contactEmail">
            </mat-form-field>
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Contact Phone</mat-label>
              <input matInput formControlName="contactPhone">
            </mat-form-field>
             <div class="two-col">
               <mat-form-field appearance="fill">
                 <mat-label>Total Blocks</mat-label>
                <input matInput type="number" formControlName="totalBlocks" min="1">
              </mat-form-field>
               <mat-form-field appearance="fill">
                 <mat-label>Total Apartments</mat-label>
                 <input matInput type="number" formControlName="totalApartments" min="1">
                 <mat-hint>Managed by the platform administrator</mat-hint>
               </mat-form-field>
             </div>
             <mat-form-field appearance="fill" class="full-width">
               <mat-label>Maintenance overdue threshold (days)</mat-label>
               <input matInput type="number" formControlName="maintenanceOverdueThresholdDays" min="1" max="90">
             </mat-form-field>
             <mat-form-field appearance="fill" class="full-width">
               <mat-label>Visitor overstay threshold (hours)</mat-label>
               <input matInput type="number" formControlName="visitorOverstayThresholdHours" min="1" max="24">
               <mat-hint>Checked-in visitors staying longer show in red in the visitor list</mat-hint>
             </mat-form-field>

            <mat-divider style="margin:16px 0"></mat-divider>
            <div class="section-header">
              <div>
                <div class="section-title">Society Users</div>
                <div class="section-copy">Enter the resident email and the society role title to validate and save it.</div>
              </div>
              <button mat-stroked-button type="button" (click)="addSocietyUser()">Add User</button>
            </div>

            <div formArrayName="societyUsers" class="stack">
              @for (user of societyUsers.controls; track user; let userIndex = $index) {
                <div class="sub-card" [formGroupName]="userIndex">
                  <mat-form-field appearance="fill" class="full-width">
                    <mat-label>Resident Email</mat-label>
                    <input matInput formControlName="email">
                  </mat-form-field>
                  <mat-form-field appearance="fill" class="full-width">
                    <mat-label>Role Title</mat-label>
                    <input matInput formControlName="roleTitle" placeholder="President, Chairman, Cashier...">
                  </mat-form-field>
                  <button mat-stroked-button color="warn" type="button" (click)="removeSocietyUser(userIndex)">Remove</button>
                </div>
              }
            </div>

            <mat-divider style="margin:16px 0"></mat-divider>
            <div class="section-header">
              <div>
                <div class="section-title">Committees</div>
                <div class="section-copy">Create a committee and pick an existing resident for each role. A resident can only hold one committee role at a time.</div>
              </div>
              <button mat-stroked-button type="button" (click)="addCommittee()">Add Committee</button>
            </div>

            <div formArrayName="committees" class="stack">
              @for (committee of committees.controls; track committee; let committeeIndex = $index) {
                <div class="sub-card" [formGroupName]="committeeIndex">
                  <mat-form-field appearance="fill" class="full-width">
                    <mat-label>Committee Name</mat-label>
                    <input matInput formControlName="name">
                  </mat-form-field>

                  <div class="section-header section-header--compact">
                    <div class="section-copy">Committee members</div>
                    <button mat-stroked-button type="button" (click)="addCommitteeMember(committeeIndex)">Add Member</button>
                  </div>

                  <div formArrayName="members" class="stack">
                    @for (member of committeeMembers(committeeIndex).controls; track member; let memberIndex = $index) {
                      <div class="nested-card" [formGroupName]="memberIndex">
                        <app-searchable-select label="Resident" formControlName="email"
                          [options]="optionsForMember(member.get('email')?.value)"></app-searchable-select>
                        <mat-form-field appearance="fill" class="full-width">
                          <mat-label>Role Title</mat-label>
                          <input matInput formControlName="roleTitle" placeholder="Chairman, Member, Treasurer...">
                        </mat-form-field>
                        <button mat-stroked-button color="warn" type="button" (click)="removeCommitteeMember(committeeIndex, memberIndex)">
                          Remove Member
                        </button>
                      </div>
                    }
                  </div>

                  <button mat-stroked-button color="warn" type="button" (click)="removeCommittee(committeeIndex)">Remove Committee</button>
                </div>
              }
            </div>

            <div class="action-row">
              <button mat-stroked-button type="button" (click)="cancelEditing()">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="saving() || form.invalid">Save</button>
            </div>
          </form>
        </div>
      }
      @if (saving()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    </div>
  `,
  styles: [`
    .society-brand { text-align:center; padding-bottom:8px; }
    .soc-icon { width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#1565c0,#009688);
      display:flex;align-items:center;justify-content:center;margin:0 auto 10px; }
    .soc-icon .material-icons { font-size:32px;color:white; }
    .society-brand h2 { font-size:20px;font-weight:700;margin:0; }
    .detail-row { display:flex;justify-content:space-between;padding:10px 0;font-size:14px;
      border-bottom:1px solid var(--border); gap:16px; }
    .label { color:var(--text-secondary);font-size:13px; }
    .section-title { font-size:15px; font-weight:600; margin-bottom:4px; }
    .section-copy { color:var(--text-secondary); font-size:13px; }
     .primary-action { margin-top:16px; width:100%; height:48px; }
     .primary-actions { display:flex; flex-direction:column; gap:12px; margin-top:16px; }
     .detail-card, .committee-card, .sub-card, .nested-card {
      border:1px solid var(--border); border-radius:12px; padding:12px; background:#fafafa;
    }
    .detail-card, .committee-card { margin-top:12px; }
    .detail-card__title { font-weight:600; }
    .detail-card__meta { color:var(--text-secondary); font-size:13px; margin-top:4px; }
    .detail-card__role { color:var(--primary-light); font-size:13px; font-weight:600; margin-top:8px; }
    .committee-member { display:flex; justify-content:space-between; gap:12px; padding-top:10px; font-size:13px; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .section-header { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; margin-bottom:12px; }
    .section-header--compact { margin-top:8px; }
    .stack { display:flex; flex-direction:column; gap:12px; }
    .sub-card { display:flex; flex-direction:column; gap:8px; }
    .nested-card { display:flex; flex-direction:column; gap:8px; }
    .action-row { display:flex; gap:8px; margin-top:16px; }
    .action-row button { flex:1; height:48px; }
    .branding-row { display:flex; gap:16px; flex-wrap:wrap; margin-top:12px; }
    .branding-preview { display:flex; align-items:center; gap:12px; }
    .branding-thumb {
      width:72px; height:72px; border-radius:8px; object-fit:cover;
      border:1px solid var(--border); background:#fafafa;
    }
    .branding-thumb--empty {
      display:flex; align-items:center; justify-content:center;
      font-size:11px; color:var(--text-secondary); text-align:center; padding:4px;
    }
    .branding-actions { display:flex; flex-direction:column; gap:4px; font-size:13px; color:var(--text-secondary); }
  `],
})
export class SocietyDetailComponent implements OnInit {
  private readonly svc = inject(SocietyService);
  private readonly auth = inject(AuthService);
  private readonly userSvc = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly society = signal<Society | null>(null);
  readonly isAdmin = this.auth.isAdmin;
  readonly allUsers = signal<{ email: string; fullName: string }[]>([]);
  readonly uploadingLogo = signal(false);
  readonly uploadingBackground = signal(false);

  /** App-relative file paths (e.g. "files/society-logos/...") need the API origin prefixed —
   * a plain <img> can't attach the JWT header an authenticated request would use. */
  absoluteUrl(path: string): string {
    return `${environment.apiBaseUrl}/${path}`;
  }

  readonly form = this.fb.group({
    name: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
    contactPhone: ['', Validators.required],
    totalBlocks: [1, [Validators.required, Validators.min(1)]],
    // Read-only on this page — only HQAdmin (via the HQ societies screen) can change it.
    totalApartments: [{ value: 1, disabled: true }, [Validators.required, Validators.min(1)]],
    maintenanceOverdueThresholdDays: [7, [Validators.required, Validators.min(1), Validators.max(90)]],
    visitorOverstayThresholdHours: [5, [Validators.required, Validators.min(1), Validators.max(24)]],
    societyUsers: this.fb.array([]),
    committees: this.fb.array([]),
  });

  get societyUsers(): FormArray {
    return this.form.get('societyUsers') as FormArray;
  }

  get committees(): FormArray {
    return this.form.get('committees') as FormArray;
  }

  private readonly committeesValue = toSignal(this.committees.valueChanges, { initialValue: [] as Array<{ members?: { email?: string }[] }> });

  private readonly assignedEmails = computed(() => {
    const emails = new Set<string>();
    for (const committee of this.committeesValue() ?? []) {
      for (const member of committee.members ?? []) {
        if (member.email) emails.add(member.email.toLowerCase());
      }
    }
    return emails;
  });

  optionsForMember(currentEmail: string | null | undefined): SelectOption<string>[] {
    const assigned = this.assignedEmails();
    const current = (currentEmail ?? '').toLowerCase();
    return this.allUsers()
      .filter(u => u.email.toLowerCase() === current || !assigned.has(u.email.toLowerCase()))
      .map(u => ({ value: u.email, label: `${u.fullName} (${u.email})` }));
  }

  ngOnInit() {
    const sid = this.auth.societyId();
    if (!sid) {
      this.loading.set(false);
      return;
    }

    this.svc.get(sid).subscribe({
      next: society => {
        this.society.set(society);
        this.patchForm(society);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.userSvc.list(sid, 1, 500).subscribe({
      next: users => this.allUsers.set((users.items ?? []).map(u => ({ email: u.email, fullName: u.fullName ?? u.name ?? u.email }))),
      error: () => {},
    });
  }

  startEditing() {
    if (!this.isAdmin()) return;
    this.patchForm(this.society());
    this.editing.set(true);
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file later
    if (!file) return;

    const sid = this.auth.societyId();
    if (!sid) return;

    this.uploadingLogo.set(true);
    this.svc.uploadLogo(sid, file, file.name).subscribe({
      next: res => {
        this.uploadingLogo.set(false);
        this.society.update(current => current ? { ...current, logoUrl: res.logoUrl } : current);
        this.snackBar.open('Logo updated.', 'Dismiss', { duration: 3000 });
      },
      error: () => {
        this.uploadingLogo.set(false);
        this.snackBar.open('Unable to upload the logo. Try again.', 'Dismiss', { duration: 4000 });
      },
    });
  }

  onBackgroundSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const sid = this.auth.societyId();
    if (!sid) return;

    this.uploadingBackground.set(true);
    this.svc.uploadBackgroundImage(sid, file, file.name).subscribe({
      next: res => {
        this.uploadingBackground.set(false);
        this.society.update(current => current ? { ...current, sidenavBackgroundUrl: res.sidenavBackgroundUrl } : current);
        this.snackBar.open('Sidenav background updated.', 'Dismiss', { duration: 3000 });
      },
      error: () => {
        this.uploadingBackground.set(false);
        this.snackBar.open('Unable to upload the background image. Try again.', 'Dismiss', { duration: 4000 });
      },
    });
  }

  removeLogo() {
    const sid = this.auth.societyId();
    if (!sid) return;

    this.uploadingLogo.set(true);
    this.svc.removeLogo(sid).subscribe({
      next: society => {
        this.uploadingLogo.set(false);
        this.society.update(current => current ? { ...current, logoUrl: society.logoUrl } : current);
        this.snackBar.open('Logo removed.', 'Dismiss', { duration: 3000 });
      },
      error: () => {
        this.uploadingLogo.set(false);
        this.snackBar.open('Unable to remove the logo. Try again.', 'Dismiss', { duration: 4000 });
      },
    });
  }

  removeBackgroundImage() {
    const sid = this.auth.societyId();
    if (!sid) return;

    this.uploadingBackground.set(true);
    this.svc.removeBackgroundImage(sid).subscribe({
      next: society => {
        this.uploadingBackground.set(false);
        this.society.update(current => current ? { ...current, sidenavBackgroundUrl: society.sidenavBackgroundUrl } : current);
        this.snackBar.open('Sidenav background removed.', 'Dismiss', { duration: 3000 });
      },
      error: () => {
        this.uploadingBackground.set(false);
        this.snackBar.open('Unable to remove the background image. Try again.', 'Dismiss', { duration: 4000 });
      },
    });
  }

  cancelEditing() {
    this.patchForm(this.society());
    this.editing.set(false);
  }

  addSocietyUser() {
    this.societyUsers.push(this.createUserGroup());
  }

  removeSocietyUser(index: number) {
    this.societyUsers.removeAt(index);
  }

  addCommittee() {
    this.committees.push(this.createCommitteeGroup());
  }

  removeCommittee(index: number) {
    this.committees.removeAt(index);
  }

  committeeMembers(index: number): FormArray {
    return this.committees.at(index).get('members') as FormArray;
  }

  addCommitteeMember(index: number) {
    this.committeeMembers(index).push(this.createUserGroup());
  }

  removeCommitteeMember(committeeIndex: number, memberIndex: number) {
    this.committeeMembers(committeeIndex).removeAt(memberIndex);
  }

  save() {
    const sid = this.auth.societyId();
    if (!sid || this.form.invalid) return;

    this.saving.set(true);
    this.svc.update(sid, {
      name: this.form.controls.name.value ?? '',
      contactEmail: this.form.controls.contactEmail.value ?? '',
      contactPhone: this.form.controls.contactPhone.value ?? '',
      totalBlocks: this.form.controls.totalBlocks.value ?? 1,
      // Sent unchanged — the backend rejects a non-HQAdmin attempt to modify it.
      totalApartments: this.society()?.totalApartments ?? 1,
      maintenanceOverdueThresholdDays: this.form.controls.maintenanceOverdueThresholdDays.value ?? 7,
      visitorOverstayThresholdHours: this.form.controls.visitorOverstayThresholdHours.value ?? 5,
      societyUsers: this.societyUsers.controls
        .map(control => ({
          email: control.get('email')?.value?.trim() ?? '',
          roleTitle: control.get('roleTitle')?.value?.trim() ?? '',
        }))
        .filter(user => user.email && user.roleTitle),
      committees: this.committees.controls
        .map(control => ({
          name: control.get('name')?.value?.trim() ?? '',
          members: (control.get('members') as FormArray).controls
            .map(member => ({
              email: member.get('email')?.value?.trim() ?? '',
              roleTitle: member.get('roleTitle')?.value?.trim() ?? '',
            }))
            .filter(member => member.email && member.roleTitle),
        }))
        .filter(committee => committee.name),
    }).subscribe({
      next: society => {
        this.society.set(society);
        this.patchForm(society);
        this.saving.set(false);
        this.editing.set(false);
        this.snackBar.open('Society details saved.', 'Dismiss', { duration: 4000 });
      },
      error: () => this.saving.set(false),
    });
  }

  private patchForm(society: Society | null) {
    this.form.patchValue({
      name: society?.name ?? '',
      contactEmail: society?.contactEmail ?? '',
      contactPhone: society?.contactPhone ?? '',
      totalBlocks: society?.totalBlocks ?? 1,
      totalApartments: society?.totalApartments ?? 1,
      maintenanceOverdueThresholdDays: this.normalizeMaintenanceThreshold(society?.maintenanceOverdueThresholdDays),
      visitorOverstayThresholdHours: this.normalizeOverstayThreshold(society?.visitorOverstayThresholdHours),
    });

    this.societyUsers.clear();
    this.committees.clear();

    for (const user of society?.societyUsers ?? [])
      this.societyUsers.push(this.createUserGroup(user));

    for (const committee of society?.committees ?? [])
      this.committees.push(this.createCommitteeGroup(committee));
  }

  private createUserGroup(user?: SocietyUserAssignment) {
    return this.fb.group({
      email: [user?.email ?? '', [Validators.required, Validators.email]],
      roleTitle: [user?.roleTitle ?? '', Validators.required],
    });
  }

  private createCommitteeGroup(committee?: SocietyCommittee) {
    return this.fb.group({
      name: [committee?.name ?? '', Validators.required],
      members: this.fb.array((committee?.members ?? []).map(member => this.createUserGroup(member))),
    });
  }

  private normalizeMaintenanceThreshold(value?: number | null) {
    if (!value || value < 1 || value > 90) return 7;
    return value;
  }

  private normalizeOverstayThreshold(value?: number | null) {
    if (!value || value < 1 || value > 24) return 5;
    return value;
  }
}
