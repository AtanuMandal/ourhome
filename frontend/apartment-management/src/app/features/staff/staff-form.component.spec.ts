import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter, ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { StaffFormComponent } from './staff-form.component';
import { StaffService, ShiftService } from '../../core/services/staff.service';
import { AuthService } from '../../core/services/auth.service';
import { Staff } from '../../core/models/staff.model';

describe('StaffFormComponent', () => {
  function setup(staffId: string | null, staffServiceOverrides: Partial<Record<string, unknown>> = {}) {
    const existingStaff: Staff = {
      id: 's1', societyId: 'soc-1', fullName: 'John Guard', phone: '9876543210',
      category: 'Security', employmentType: 'OnPayroll', shiftId: 'shift-1', isActive: true, createdAt: '2026-01-01T00:00:00Z',
    };
    const staffServiceStub = {
      get: jasmine.createSpy().and.returnValue(of(existingStaff)),
      create: jasmine.createSpy().and.returnValue(of(existingStaff)),
      update: jasmine.createSpy().and.returnValue(of(existingStaff)),
      ...staffServiceOverrides,
    };
    const shiftServiceStub = {
      list: jasmine.createSpy().and.returnValue(of([{ id: 'shift-1', societyId: 'soc-1', name: 'Morning Security', startTime: '08:00:00', endTime: '16:00:00', graceMinutes: 30 }])),
    };
    const authServiceStub = { societyId: () => 'soc-1' };
    const snackBarStub = { open: jasmine.createSpy() };
    const activatedRouteStub = { snapshot: { paramMap: convertToParamMap(staffId ? { id: staffId } : {}) } };

    TestBed.configureTestingModule({
      imports: [StaffFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: StaffService, useValue: staffServiceStub },
        { provide: ShiftService, useValue: shiftServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    });

    const fixture = TestBed.createComponent(StaffFormComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, staffServiceStub, fixture, router: TestBed.inject(Router) };
  }

  it('starts in create mode when no id route param is present', () => {
    const { component } = setup(null);
    expect(component.isEditMode()).toBeFalse();
  });

  it('loads and patches the existing staff member in edit mode', () => {
    const { component, staffServiceStub } = setup('s1');

    expect(staffServiceStub.get).toHaveBeenCalledWith('soc-1', 's1');
    expect(component.isEditMode()).toBeTrue();
    expect(component.form.controls.fullName.value).toBe('John Guard');
    expect(component.form.controls.shiftId.value).toBe('shift-1');
  });

  it('validates phone as exactly 10 digits', () => {
    const { component } = setup(null);

    component.form.controls.phone.setValue('12345AB789');
    expect(component.form.controls.phone.hasError('pattern')).toBeTrue();

    component.form.controls.phone.setValue('9876543210');
    expect(component.form.controls.phone.hasError('pattern')).toBeFalse();
  });

  it('calls create with category and employment type in create mode', () => {
    const { component, staffServiceStub } = setup(null);
    component.form.patchValue({ fullName: 'New Guard', phone: '1112223333', category: 'Gardener', employmentType: 'Contractor' });

    component.submit();

    expect(staffServiceStub.create).toHaveBeenCalledWith('soc-1', jasmine.objectContaining({
      fullName: 'New Guard', phone: '1112223333', category: 'Gardener', employmentType: 'Contractor',
    }));
  });

  it('calls update (not create) in edit mode', () => {
    const { component, staffServiceStub } = setup('s1');
    component.form.patchValue({ fullName: 'John Updated' });

    component.submit();

    expect(staffServiceStub.update).toHaveBeenCalledWith('soc-1', 's1', jasmine.objectContaining({ fullName: 'John Updated' }));
    expect(staffServiceStub.create).not.toHaveBeenCalled();
  });
});
