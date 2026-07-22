import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { Apartment, formatApartmentLabel } from '../../core/models/apartment.model';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { Visitor } from '../../core/models/visitor.model';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { VisitorService } from '../../core/services/visitor.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';

@Component({
  selector: 'app-visitor-register',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    PageHeaderComponent,
    StatusChipComponent,
    SearchableSelectComponent
  ],
  template: `
    <app-page-header
      [title]="pageTitle()"
      [showBack]="true">
    </app-page-header>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    <div class="page-content visitor-register-page">
      @if (errorMessage()) {
        <div class="card error-banner">{{ errorMessage() }}</div>
      }

      <div class="card">
        <div class="form-header">
          <h3>{{ formTitle() }}</h3>
          <p>{{ formDescription() }}</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (canManageVisitors()) {
            <app-searchable-select label="Apartment" formControlName="apartmentId"
              [options]="apartmentOptions()" errorMessage="Select an apartment"></app-searchable-select>
          } @else {
            <div class="resident-target">
              <span class="resident-target__label">Apartment</span>
              <strong>{{ residentApartmentLabel() }}</strong>
              <small>This pass will be generated for your apartment only.</small>
            </div>
          }

          @if (!canManageVisitors()) {
            <app-searchable-select label="Valid for (hours)" formControlName="validityHours"
              [options]="validitySelectOptions"></app-searchable-select>
          }

          <div class="image-upload-row">
            <button type="button" mat-stroked-button (click)="imageInput.click()">
              <mat-icon>photo_camera</mat-icon>
              {{ visitorImagePreview() ? 'Change photo' : 'Add visitor photo' }}
            </button>
            <input #imageInput type="file" accept="image/*" capture="environment"
                   class="hidden-file-input" (change)="onImageSelected($event)">
            @if (visitorImagePreview()) {
              <div class="image-preview-wrap">
                <img [src]="visitorImagePreview()!" alt="Visitor photo" class="image-preview">
                <button type="button" mat-icon-button (click)="removeImage()" aria-label="Remove photo">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
            }
          </div>

          <div class="form-grid">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Visitor name</mat-label>
              <input matInput formControlName="visitorName">
              @if (form.get('visitorName')?.invalid && form.get('visitorName')?.touched) {
                <mat-error>Name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Phone</mat-label>
              <input matInput type="tel" formControlName="visitorPhone">
              @if (form.get('visitorPhone')?.invalid && form.get('visitorPhone')?.touched) {
                <mat-error>Phone is required</mat-error>
              }
            </mat-form-field>
          </div>

          <div class="form-grid">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="visitorEmail">
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Company / service type</mat-label>
              <input matInput formControlName="companyName" placeholder="Amazon, Swiggy, Personal, Courier"
                [matAutocomplete]="companyAuto">
              <mat-autocomplete #companyAuto="matAutocomplete">
                @for (option of filteredCompanies(); track option) {
                  <mat-option [value]="option">{{ option }}</mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>
          </div>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Purpose</mat-label>
            <input matInput formControlName="purpose" placeholder="Delivery, guest visit, electrician, etc."
              [matAutocomplete]="purposeAuto">
            <mat-autocomplete #purposeAuto="matAutocomplete">
              @for (option of filteredPurposes(); track option) {
                <mat-option [value]="option">{{ option }}</mat-option>
              }
            </mat-autocomplete>
            @if (form.get('purpose')?.invalid && form.get('purpose')?.touched) {
              <mat-error>Purpose is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Vehicle / bike / car number</mat-label>
            <input matInput formControlName="vehicleNumber">
          </mat-form-field>

          <button
            mat-raised-button
            color="primary"
            type="submit"
            class="full-width submit-btn"
            [disabled]="loading() || form.invalid || (!canManageVisitors() && !resolvedApartmentId())">
            {{ submitLabel() }}
          </button>
        </form>
      </div>

      @if (createdVisitor()) {
        <div class="card pass-card">
          <div class="pass-card__header">
            <div>
              <h3>{{ createdVisitor()!.vn }}</h3>
              <p>{{ createdVisitor()!.pu }} for {{ createdVisitor()!.hft }}</p>
            </div>
            <app-status-chip [status]="createdVisitor()!.st"></app-status-chip>
          </div>

          <div class="pass-card__body">
            <div>
              <span class="pass-card__label">Pass code</span>
              <strong class="pass-card__code">{{ createdVisitor()!.pc }}</strong>
            </div>
            <div>
              <span class="pass-card__label">Resident</span>
              <strong>{{ createdVisitor()!.hrn }}</strong>
            </div>
            @if (createdVisitor()!.vu) {
              <div>
                <span class="pass-card__label">Valid until</span>
                <strong>{{ createdVisitor()!.vu | date:'short' }}</strong>
              </div>
            }
            @if (qrImageUrl()) {
              <div class="pass-card__qr">
                <span class="pass-card__label">QR pass</span>
                <img [src]="qrImageUrl()!" alt="Visitor QR pass">
              </div>
            }
          </div>

          <p class="pass-card__note">
            @if (createdVisitor()!.ipa) {
              Share this pass with the visitor or security for quick verification and check-in.
            } @else {
              Visitor request created. Resident approval is still required before entry.
            }
          </p>

          <div class="pass-card__actions">
            <button mat-stroked-button color="primary" (click)="copyPassLink()">
              <mat-icon>link</mat-icon>
              Copy pass link
            </button>
            <button mat-stroked-button (click)="showShareDialog.set(true)">
              <mat-icon>share</mat-icon>
              Share via email/SMS
            </button>
            <a mat-stroked-button routerLink="/visitors">View visitor history</a>
          </div>

          @if (showShareDialog()) {
            <div class="share-dialog">
              <h4>Share visitor pass</h4>
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Email (optional)</mat-label>
                <input matInput type="email" [(ngModel)]="shareEmail" placeholder="visitor@example.com">
              </mat-form-field>
              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Phone (optional)</mat-label>
                <input matInput type="tel" [(ngModel)]="sharePhone" placeholder="+91-XXXXXXXXXX">
              </mat-form-field>
              @if (shareError()) {
                <p class="share-error">{{ shareError() }}</p>
              }
              @if (shareSuccess()) {
                <p class="share-success">Pass shared successfully!</p>
              }
              <div class="share-dialog__actions">
                <button mat-button (click)="showShareDialog.set(false)">Cancel</button>
                <button mat-raised-button color="primary" [disabled]="shareLoading()" (click)="submitShare()">
                  {{ shareLoading() ? 'Sending...' : 'Send' }}
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './visitors.scss'
})
export class VisitorRegisterComponent implements OnInit {
  @ViewChild('imageInput') imageInputRef?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly visitorService = inject(VisitorService);
  private readonly apartmentService = inject(ApartmentService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly apartmentsLoading = signal(false);
  readonly apartments = signal<Apartment[]>([]);
  readonly createdVisitor = signal<Visitor | null>(null);
  readonly errorMessage = signal('');
  readonly showShareDialog = signal(false);
  readonly shareLoading = signal(false);
  readonly shareError = signal('');
  readonly shareSuccess = signal(false);
  shareEmail = '';
  sharePhone = '';
  readonly isAdmin = this.auth.isAdmin;
  readonly canManageVisitors = this.auth.canManageVisitors;
  readonly visitorImagePreview = signal<string | null>(null);
  readonly validityOptions = [1, 2, 4, 8, 12, 24, 48, 72, 168];
  readonly validitySelectOptions = [
    { value: null, label: 'No expiry' },
    ...this.validityOptions.map(h => ({ value: h, label: `${h} hour${h > 1 ? 's' : ''}` })),
  ];
  readonly apartmentOptions = computed(() =>
    this.apartments().map(a => ({ value: a.id, label: formatApartmentLabel(a) }))
  );

  readonly companies = signal<string[]>([]);
  readonly purposes = signal<string[]>([]);

  private _selectedImageFile: File | null = null;

  readonly residentApartmentLabel = computed(() => {
    const user = this.auth.user();
    return user?.apts?.[0]?.nm ?? 'Your apartment';
  });

  readonly resolvedApartmentId = computed(() => {
    if (this.canManageVisitors()) {
      return this.form.controls.apartmentId.value?.trim() ?? '';
    }

    const user = this.auth.user();
    return user?.aid ?? user?.apts?.[0]?.aid ?? '';
  });

  readonly form = this.fb.group({
    apartmentId: [''],
    visitorName: ['', Validators.required],
    visitorPhone: ['', Validators.required],
    visitorEmail: ['', Validators.email],
    companyName: [''],
    purpose: ['', Validators.required],
    vehicleNumber: [''],
    validityHours: [null as number | null]
  });

  private readonly companyInput = toSignal(
    this.form.controls.companyName.valueChanges.pipe(startWith(this.form.controls.companyName.value)),
    { initialValue: '' }
  );
  private readonly purposeInput = toSignal(
    this.form.controls.purpose.valueChanges.pipe(startWith(this.form.controls.purpose.value)),
    { initialValue: '' }
  );

  readonly filteredCompanies = computed(() => this.filterOptions(this.companies(), this.companyInput()));
  readonly filteredPurposes = computed(() => this.filterOptions(this.purposes(), this.purposeInput()));

  private filterOptions(options: string[], query: string | null): string[] {
    const term = (query ?? '').trim().toLowerCase();
    if (!term) return options;
    return options.filter(option => option.toLowerCase().includes(term));
  }

  ngOnInit(): void {
    const societyIdForLookups = this.auth.societyId();
    if (societyIdForLookups) {
      this.visitorService.getLookups(societyIdForLookups).subscribe({
        next: lookups => {
          this.companies.set(lookups.companies ?? []);
          this.purposes.set(lookups.purposes ?? []);
        },
        error: () => {},
      });
    }

    if (!this.canManageVisitors()) {
      this.form.controls.apartmentId.clearValidators();
      this.form.controls.apartmentId.updateValueAndValidity({ emitEvent: false });
      return;
    }

    const societyId = this.auth.societyId();
    if (!societyId) {
      return;
    }

    this.form.controls.apartmentId.setValidators([Validators.required]);
    this.form.controls.apartmentId.updateValueAndValidity({ emitEvent: false });

    this.apartmentsLoading.set(true);
    this.apartmentService.list(societyId, 1, 200).subscribe({
      next: response => {
        this.apartments.set(response.items ?? []);
        this.apartmentsLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load apartments right now.');
        this.apartmentsLoading.set(false);
      }
    });
  }

  pageTitle() {
    return this.canManageVisitors() ? 'Register Visitor' : 'Pre-approve Visitor';
  }

  formTitle() {
    return this.canManageVisitors() ? 'Gate registration' : 'Resident pass generation';
  }

  formDescription() {
    return this.canManageVisitors()
      ? 'Register the visitor at the gate and send the request to the resident for approval.'
      : 'Pre-enter visitor details to generate an approved pass before arrival.';
  }

  submitLabel() {
    return this.canManageVisitors() ? 'Register visitor request' : 'Pre-approve & generate pass';
  }

  apartmentLabel(apartment: Apartment) {
    return formatApartmentLabel(apartment);
  }

  qrImageUrl() {
    const qrCode = this.createdVisitor()?.qr;
    if (!qrCode) {
      return null;
    }

    return qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`;
  }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this._selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = () => this.visitorImagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  removeImage() {
    this._selectedImageFile = null;
    this.visitorImagePreview.set(null);
    if (this.imageInputRef) {
      this.imageInputRef.nativeElement.value = '';
    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const societyId = this.auth.societyId();
    const apartmentId = this.resolvedApartmentId();
    if (!societyId || !apartmentId) {
      this.errorMessage.set('A target apartment is required to continue.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const doRegister = (imageUrl?: string) => {
      const isPreApproved = !this.canManageVisitors();
      const validityHours = this.form.controls.validityHours.value ?? undefined;
      this.visitorService.register(societyId, {
        visitorName: this.form.controls.visitorName.value?.trim() ?? '',
        visitorPhone: this.form.controls.visitorPhone.value?.trim() ?? '',
        visitorEmail: this.form.controls.visitorEmail.value?.trim() ?? undefined,
        purpose: this.form.controls.purpose.value?.trim() ?? '',
        apartmentId,
        companyName: this.form.controls.companyName.value?.trim() ?? undefined,
        vehicleNumber: this.form.controls.vehicleNumber.value?.trim() ?? undefined,
        isPreApproved,
        validityHours: isPreApproved ? (typeof validityHours === 'number' ? validityHours : undefined) : undefined,
        visitorImageUrl: imageUrl
      }).subscribe({
        next: visitor => {
          this.createdVisitor.set(visitor);
          this.loading.set(false);
        },
        error: error => {
          this.errorMessage.set(error?.error?.message ?? 'Unable to register the visitor right now.');
          this.loading.set(false);
        }
      });
    };

    if (this._selectedImageFile) {
      this.visitorService.uploadImage(societyId, this._selectedImageFile).subscribe({
        next: res => doRegister(res.imageUrl),
        error: () => {
          doRegister();
        }
      });
    } else {
      doRegister();
    }
  }

  copyPassLink() {
    const visitor = this.createdVisitor();
    if (!visitor) return;
    const link = `${window.location.origin}/visitor-pass/${visitor.pc}`;
    navigator.clipboard.writeText(link).catch(() => {});
  }

  submitShare() {
    const visitor = this.createdVisitor();
    const societyId = this.auth.societyId();
    if (!visitor || !societyId) return;
    if (!this.shareEmail && !this.sharePhone) {
      this.shareError.set('Enter at least one of email or phone.');
      return;
    }

    this.shareLoading.set(true);
    this.shareError.set('');
    this.shareSuccess.set(false);

    this.visitorService.sharePass(societyId, visitor.id, {
      email: this.shareEmail || undefined,
      phone: this.sharePhone || undefined
    }).subscribe({
      next: () => {
        this.shareLoading.set(false);
        this.shareSuccess.set(true);
        this.shareEmail = '';
        this.sharePhone = '';
      },
      error: err => {
        this.shareLoading.set(false);
        this.shareError.set(err?.error?.message ?? 'Unable to share the pass right now.');
      }
    });
  }
}
