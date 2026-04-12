import { Component, inject, signal, OnInit } from '@angular/core';
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
              <mat-error>Apartment number is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Block Name</mat-label>
            <input matInput formControlName="blockName" placeholder="e.g. Block A">
            @if (form.get('blockName')?.invalid && form.get('blockName')?.touched) {
              <mat-error>Block name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="fill" class="full-width">
            <mat-label>Floor Number</mat-label>
            <input matInput type="number" formControlName="floorNumber">
          </mat-form-field>

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
  });

  ngOnInit() {
    this.editId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.editId) {
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
    const sid = this.auth.societyId()!;
    this.loading.set(true);
    const value = this.form.getRawValue();
    const parkingSlots = value.parkingSlots
      .split(/[;,|]/)
      .map(slot => slot.trim())
      .filter(Boolean);
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
        } satisfies CreateApartmentDto);
    action.subscribe({
      next: a => { this.loading.set(false); this.router.navigate(['/apartments', a.id]); },
      error: () => this.loading.set(false),
    });
  }
}
