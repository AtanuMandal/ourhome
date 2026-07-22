import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ShiftListComponent } from './shift-list.component';
import { ShiftService } from '../../core/services/staff.service';
import { AuthService } from '../../core/services/auth.service';
import { Shift } from '../../core/models/staff.model';

describe('ShiftListComponent', () => {
  function shift(overrides: Partial<Shift>): Shift {
    return {
      id: overrides.id ?? 'sh1',
      societyId: 'soc-1',
      name: overrides.name ?? 'Morning Security',
      startTime: overrides.startTime ?? '08:00:00',
      endTime: overrides.endTime ?? '16:00:00',
      graceMinutes: overrides.graceMinutes ?? 30,
      ...overrides,
    };
  }

  function setup(shifts: Shift[], serviceOverrides: Partial<Record<string, unknown>> = {}) {
    const shiftServiceStub = {
      list: jasmine.createSpy().and.returnValue(of(shifts)),
      delete: jasmine.createSpy().and.returnValue(of(true)),
      ...serviceOverrides,
    };
    const authServiceStub = { societyId: () => 'soc-1' };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [ShiftListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ShiftService, useValue: shiftServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    const fixture = TestBed.createComponent(ShiftListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, shiftServiceStub, snackBarStub };
  }

  it('loads and displays shifts', () => {
    const { component } = setup([shift({ id: '1', name: 'Morning Security' })]);

    expect(component.shifts().map(s => s.name)).toEqual(['Morning Security']);
    expect(component.loading()).toBeFalse();
  });

  it('formats "HH:mm:ss" times as "HH:mm"', () => {
    const { component } = setup([]);
    expect(component.formatTime('08:30:00')).toBe('08:30');
  });

  it('deletes a shift when confirmed', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const { component, shiftServiceStub } = setup([shift({ id: '1' })]);

    component.delete(component.shifts()[0]);

    expect(shiftServiceStub.delete).toHaveBeenCalledWith('soc-1', '1');
    expect(component.shifts()).toEqual([]);
  });

  it('does not delete when the user cancels the confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const { component, shiftServiceStub } = setup([shift({ id: '1' })]);

    component.delete(component.shifts()[0]);

    expect(shiftServiceStub.delete).not.toHaveBeenCalled();
  });

  it('shows a specific message when the shift is still assigned to active staff', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const { component, snackBarStub } = setup([shift({ id: '1' })], {
      delete: jasmine.createSpy().and.returnValue(throwError(() => ({ error: { errorCode: 'SHIFT_IN_USE' } }))),
    });

    component.delete(component.shifts()[0]);

    expect(snackBarStub.open).toHaveBeenCalledWith(
      'This shift is still assigned to active staff — reassign them before deleting.', 'Dismiss', { duration: 4000 });
  });
});
