import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CreateApartmentDto, UpdateApartmentDto } from '../../core/models/apartment.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';

type OccupancyOption = 'Available' | 'Owner' | 'Tenant';

@Component({
  selector: 'app-apartment-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule,
            MatButtonModule, MatProgressBarModule, PageHeaderComponent],
  template: `
    <app-page-header [title]="editId ? 'Edit Apartment' : 'Add Apartment'" [showBack]="true"></app-page-header>
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <div class="page-content">
      <div class="card">
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Apartment Number</mat-label>
            <input matInput formControlName="apartmentNumber" placeholder="e.g. A-101">
            @if (form.get('apartmentNumber')?.invalid && form.get('apartmentNumber')?.touched) {
              <mat-error>
                @if (form.get('apartmentNumber')?.hasError('duplicateLocation')) {
                  Another apartment already uses this apartment number, block, and floor in the society.
                } @else {
                  Apartment number is required
                }
              </mat-error>
            }
            @if (editId) {
              <mat-hint>Apartment number cannot be changed after creation.</mat-hint>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Block Name</mat-label>
            <input matInput formControlName="blockName" placeholder="e.g. Block A">
            @if (form.get('blockName')?.invalid && form.get('blockName')?.touched) {
              <mat-error>
                @if (form.get('blockName')?.hasError('duplicateLocation')) {
                  Another apartment already uses this apartment number, block, and floor in the society.
                } @else {
                  Block name is required
                }
              </mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Floor Number</mat-label>
            <input matInput type="number" formControlName="floorNumber">
            @if (form.get('floorNumber')?.hasError('duplicateLocation') && form.get('floorNumber')?.touched) {
              <mat-error>Another apartment already uses this apartment number, block, and floor in the society.</mat-error>
            }
          </mat-form-field>

          @if (duplicateLocationMessage()) {
            <p class="helper-copy error-copy">{{ duplicateLocationMessage() }}</p>
          }

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Number of Rooms</mat-label>
            <input matInput type="number" formControlName="numberOfRooms">
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Parking Slots</mat-label>
            <input matInput formControlName="parkingSlots" placeholder="e.g. P1, P2">
            <mat-hint>Enter parking slot identifiers separated by commas.</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Carpet Area (SQFT)</mat-label>
            <input matInput type="number" step="0.01" formControlName="carpetArea" placeholder="e.g. 500">
            @if (form.get('carpetArea')?.invalid && form.get('carpetArea')?.touched) {
              <mat-error>Carpet area must be greater than 0</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>BuildUp Area (SQFT)</mat-label>
            <input matInput type="number" step="0.01" formControlName="buildUpArea" placeholder="e.g. 700">
            @if (form.get('buildUpArea')?.invalid && form.get('buildUpArea')?.touched) {
              <mat-error>BuildUp area must be greater than 0</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>SuperBuild Area (SQFT)</mat-label>
            <input matInput type="number" step="0.01" formControlName="superBuildArea" placeholder="e.g. 800">
            @if (form.get('superBuildArea')?.invalid && form.get('superBuildArea')?.touched) {
              <mat-error>SuperBuild area must be greater than 0</mat-error>
            }
          </mat-form-field>

          @if (!editId) {
            <div class="resident-section">
              <h3>Occupancy details</h3>
              <p class="helper-copy">
                Leave the apartment available, or add the current owner or tenant during onboarding.
                If the email already belongs to a resident in this society, the apartment will be linked to that account.
              </p>

              <mat-form-field appearance="fill" class="full-width">
                <mat-label>Occupancy</mat-label>
                <select matNativeControl formControlName="occupancy">
                  <option value="Available">Available</option>
                  <option value="Owner">Occupied by Owner</option>
                  <option value="Tenant">Occupied by Tenant</option>
                </select>
              </mat-form-field>

              @if (isOccupied()) {
                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>{{ occupancyLabel() }} Name</mat-label>
                  <input matInput formControlName="residentFullName" placeholder="e.g. Alex Resident">
                </mat-form-field>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>{{ occupancyLabel() }} Email</mat-label>
                  <input matInput type="email" formControlName="residentEmail" placeholder="e.g. alex@example.com">
                </mat-form-field>

                <mat-form-field appearance="fill" class="full-width">
                  <mat-label>{{ occupancyLabel() }} Phone</mat-label>
                  <input matInput formControlName="residentPhone" placeholder="e.g. +91-9876543210">
                </mat-form-field>
              }
            </div>
          }

          <button mat-raised-button color="primary" type="submit"
                  class="full-width" style="height:48px;margin-top:8px"
                  [disabled]="loading() || form.invalid">
            {{ editId ? 'Update' : 'Create' }} Apartment
          </button>
        </form>
      </div>
    </div>
  `,
})
export class ApartmentFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder).nonNullable;
  private readonly svc    = inject(ApartmentService);
  private readonly auth   = inject(AuthService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly duplicateLocationMessage = signal('');
  editId = '';

  readonly form = this.fb.group({
    apartmentNumber: ['', Validators.required],
    blockName:       ['', Validators.required],
    floorNumber:     [1, [Validators.required, Validators.min(0)]],
    numberOfRooms:   [1, [Validators.required, Validators.min(1)]],
    parkingSlots:    [''],
    carpetArea:      [0, [Validators.required, Validators.min(0.01)]],
    buildUpArea:     [0, [Validators.required, Validators.min(0.01)]],
    superBuildArea:  [0, [Validators.required, Validators.min(0.01)]],
    occupancy:       ['Available' as OccupancyOption],
    residentFullName:[''],
    residentEmail:   [''],
    residentPhone:   [''],
  });

  ngOnInit() {
    this.updateResidentValidators(this.form.controls.occupancy.value);
    this.form.controls.occupancy.valueChanges.subscribe(value => this.updateResidentValidators(value));
    this.form.controls.apartmentNumber.valueChanges.subscribe(() => this.clearDuplicateLocationError());
    this.form.controls.blockName.valueChanges.subscribe(() => this.clearDuplicateLocationError());
    this.form.controls.floorNumber.valueChanges.subscribe(() => this.clearDuplicateLocationError());

    this.editId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.editId) {
      this.form.controls.apartmentNumber.disable({ emitEvent: false });
      const sid = this.auth.societyId()!;
      this.loading.set(true);
      this.svc.get(sid, this.editId).subscribe({
        next: a => {
          this.form.patchValue({
            apartmentNumber: a.apartmentNumber,
            blockName: a.blockName,
            floorNumber: a.floorNumber,
            numberOfRooms: a.numberOfRooms,
            parkingSlots: a.parkingSlots.join(', '),
            carpetArea: a.carpetArea,
            buildUpArea: a.buildUpArea,
            superBuildArea: a.superBuildArea,
          });
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.clearDuplicateLocationError();
    const sid = this.auth.societyId()!;
    this.loading.set(true);
    const value = this.form.getRawValue();
    const parkingSlots = value.parkingSlots
      .split(/[;,|]/)
      .map(slot => slot.trim())
      .filter(Boolean);
    const residentType = value.occupancy === 'Tenant' ? 'Tenant' : 'Owner';
    const action = this.editId
      ? this.svc.update(sid, this.editId, {
          blockName: value.blockName.trim(),
          floorNumber: value.floorNumber,
          numberOfRooms: value.numberOfRooms,
          parkingSlots,
          carpetArea: value.carpetArea,
          buildUpArea: value.buildUpArea,
          superBuildArea: value.superBuildArea,
        } satisfies UpdateApartmentDto)
        : this.svc.create(sid, {
          apartmentNumber: value.apartmentNumber.trim(),
          blockName: value.blockName.trim(),
          floorNumber: value.floorNumber,
          numberOfRooms: value.numberOfRooms,
          parkingSlots,
          carpetArea: value.carpetArea,
          buildUpArea: value.buildUpArea,
          superBuildArea: value.superBuildArea,
          initialResident: this.isOccupied()
            ? {
                fullName: value.residentFullName.trim(),
                email: value.residentEmail.trim(),
                phone: value.residentPhone.trim(),
                residentType,
              }
            : undefined,
        } satisfies CreateApartmentDto);
    action.subscribe({
      next: a => { this.loading.set(false); this.router.navigate(['/apartments', a.id]); },
      error: error => {
        this.loading.set(false);
        if (this.handleDuplicateLocationError(error)) {
          return;
        }
      },
    });
  }

  isOccupied() {
    return this.form.controls.occupancy.value !== 'Available';
  }

  occupancyLabel() {
    return this.form.controls.occupancy.value === 'Tenant' ? 'Tenant' : 'Owner';
  }

  private updateResidentValidators(occupancy: OccupancyOption) {
    const residentControls = [
      this.form.controls.residentFullName,
      this.form.controls.residentEmail,
      this.form.controls.residentPhone,
    ];

    if (occupancy === 'Available') {
      for (const control of residentControls) {
        control.clearValidators();
        control.setValue('', { emitEvent: false });
        control.updateValueAndValidity({ emitEvent: false });
      }
      return;
    }

    this.form.controls.residentFullName.setValidators([Validators.required]);
    this.form.controls.residentEmail.setValidators([Validators.required, Validators.email]);
    this.form.controls.residentPhone.setValidators([Validators.required]);

    for (const control of residentControls)
      control.updateValueAndValidity({ emitEvent: false });
  }

  private handleDuplicateLocationError(error: unknown) {
    if (!(error instanceof HttpErrorResponse) || error.status !== 409) {
      return false;
    }

    const message = typeof error.error?.error === 'string'
      ? error.error.error
      : 'Another apartment already uses this apartment number, block, and floor in the society.';

    this.duplicateLocationMessage.set(message);
    for (const control of [this.form.controls.apartmentNumber, this.form.controls.blockName, this.form.controls.floorNumber]) {
      control.setErrors({ ...(control.errors ?? {}), duplicateLocation: true });
      control.markAsTouched();
    }
    return true;
  }

  private clearDuplicateLocationError() {
    this.duplicateLocationMessage.set('');
    for (const control of [this.form.controls.apartmentNumber, this.form.controls.blockName, this.form.controls.floorNumber]) {
      if (!control.hasError('duplicateLocation')) {
        continue;
      }

      const { duplicateLocation, ...rest } = control.errors ?? {};
      control.setErrors(Object.keys(rest).length ? rest : null);
    }
  }
}
