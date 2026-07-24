import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ShiftFormComponent } from './shift-form.component';
import { ShiftService } from '../../core/services/staff.service';
import { AuthService } from '../../core/services/auth.service';
import { Shift } from '../../core/models/staff.model';

describe('ShiftFormComponent', () => {
  function setup(id: string | null, serviceOverrides: Partial<Record<string, unknown>> = {}) {
    const shifts: Shift[] = [
      { id: 'sh1', societyId: 'soc-1', name: 'Morning Security', startTime: '08:00:00', endTime: '16:00:00', graceMinutes: 30 },
    ];
    const shiftServiceStub = {
      list: jasmine.createSpy().and.returnValue(of(shifts)),
      create: jasmine.createSpy().and.returnValue(of(shifts[0])),
      update: jasmine.createSpy().and.returnValue(of(shifts[0])),
      ...serviceOverrides,
    };
    const authServiceStub = { societyId: () => 'soc-1' };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [ShiftFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ShiftService, useValue: shiftServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(ShiftFormComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    return { component: fixture.componentInstance, shiftServiceStub, router };
  }

  it('starts in add mode with default values when no id is present', () => {
    const { component } = setup(null);

    expect(component.isEditMode()).toBeFalse();
    expect(component.form.value.name).toBe('');
    expect(component.loading()).toBeFalse();
  });

  it('loads and patches the existing shift in edit mode, converting HH:mm:ss to HH:mm', () => {
    const { component } = setup('sh1');

    expect(component.isEditMode()).toBeTrue();
    expect(component.form.value.name).toBe('Morning Security');
    expect(component.form.value.startTime).toBe('08:00');
    expect(component.form.value.endTime).toBe('16:00');
  });

  it('creates a new shift, converting HH:mm to HH:mm:ss', () => {
    const { component, shiftServiceStub, router } = setup(null);
    spyOn(router, 'navigate');
    component.form.patchValue({ name: 'Night Security', startTime: '20:00', endTime: '04:00', graceMinutes: 15 });

    component.submit();

    expect(shiftServiceStub.create).toHaveBeenCalledWith('soc-1', {
      name: 'Night Security', startTime: '20:00:00', endTime: '04:00:00', graceMinutes: 15,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/staff/shifts']);
  });

  it('updates an existing shift', () => {
    const { component, shiftServiceStub } = setup('sh1');
    component.form.patchValue({ name: 'Morning Security (Updated)' });

    component.submit();

    expect(shiftServiceStub.update).toHaveBeenCalledWith('soc-1', 'sh1', {
      name: 'Morning Security (Updated)', startTime: '08:00:00', endTime: '16:00:00', graceMinutes: 30,
    });
  });

  it('does not submit an invalid form', () => {
    const { component, shiftServiceStub } = setup(null);
    component.form.patchValue({ name: '' });

    component.submit();

    expect(shiftServiceStub.create).not.toHaveBeenCalled();
  });
});
