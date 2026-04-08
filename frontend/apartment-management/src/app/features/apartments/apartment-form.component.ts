import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
            <input matInput type="number" formControlName="parkingSlots">
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
  private readonly fb     = inject(FormBuilder);
  private readonly svc    = inject(ApartmentService);
  private readonly auth   = inject(AuthService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  editId = '';

  readonly form = this.fb.group({
    apartmentNumber: ['', Validators.required],
    blockName:       [''],
    floorNumber:     [1, Validators.required],
    numberOfRooms:   [1, Validators.required],
    parkingSlots:    [0],
  });

  ngOnInit() {
    this.editId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.editId) {
      const sid = this.auth.societyId()!;
      this.loading.set(true);
      this.svc.get(sid, this.editId).subscribe({
        next: a => { this.form.patchValue(a as any); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    }
  }

  submit() {
    if (this.form.invalid) return;
    const sid = this.auth.societyId()!;
    this.loading.set(true);
    const action = this.editId
      ? this.svc.update(sid, this.editId, this.form.value as any)
      : this.svc.create(sid, this.form.value as any);
    action.subscribe({
      next: a => { this.loading.set(false); this.router.navigate(['/apartments', a.id]); },
      error: () => this.loading.set(false),
    });
  }
}
