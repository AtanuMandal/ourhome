import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { StaffListComponent } from './staff-list.component';
import { StaffService } from '../../core/services/staff.service';
import { AuthService } from '../../core/services/auth.service';
import { Staff, StaffAttendance } from '../../core/models/staff.model';

describe('StaffListComponent', () => {
  function staff(overrides: Partial<Staff>): Staff {
    return {
      id: overrides.id ?? 's1',
      societyId: 'soc-1',
      fullName: overrides.fullName ?? 'Test Staff',
      phone: overrides.phone ?? '9876543210',
      category: overrides.category ?? 'Security',
      employmentType: overrides.employmentType ?? 'OnPayroll',
      isActive: overrides.isActive ?? true,
      createdAt: '2026-01-01T00:00:00Z',
      ...overrides,
    } as Staff;
  }

  function setup(
    staffList: Staff[],
    onDuty: StaffAttendance[] = [],
    serviceOverrides: Partial<Record<string, unknown>> = {},
    isAdmin = true,
    isSecurity = false,
  ) {
    const staffServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: staffList, total: staffList.length, page: 1, pageSize: 100 })),
      onDuty: jasmine.createSpy().and.returnValue(of(onDuty)),
      checkIn: jasmine.createSpy().and.returnValue(of({ id: 'a1', status: 'CheckedIn' })),
      checkOut: jasmine.createSpy().and.returnValue(of({ id: 'a1', status: 'CheckedOut' })),
      deactivate: jasmine.createSpy().and.returnValue(of(true)),
      reactivate: jasmine.createSpy().and.returnValue(of(true)),
      delete: jasmine.createSpy().and.returnValue(of(true)),
      ...serviceOverrides,
    };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => isAdmin, isSecurity: () => isSecurity };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [StaffListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: StaffService, useValue: staffServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    const fixture = TestBed.createComponent(StaffListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, staffServiceStub, fixture };
  }

  it('groups staff by category in a fixed order', () => {
    const { component } = setup([
      staff({ id: '1', fullName: 'Sam Gardener', category: 'Gardener' }),
      staff({ id: '2', fullName: 'John Guard', category: 'Security' }),
    ]);

    const groups = component.groupedByCategory();
    expect(groups.map(g => g.category)).toEqual(['Security', 'Gardener']);
  });

  it('marks staff present in the on-duty list as on duty', () => {
    const { component } = setup(
      [staff({ id: '1', fullName: 'John Guard' })],
      [{ id: 'a1', societyId: 'soc-1', staffId: '1', staffName: 'John Guard', attendanceDate: '2026-01-01', isLate: false, status: 'CheckedIn' }],
    );

    expect(component.isOnDuty('1')).toBeTrue();
    expect(component.isOnDuty('2')).toBeFalse();
  });

  it('checks in a staff member and updates on-duty state', () => {
    const { component, staffServiceStub } = setup([staff({ id: '1', fullName: 'John Guard' })]);

    component.checkIn(component.items()[0]);

    expect(staffServiceStub.checkIn).toHaveBeenCalledWith('soc-1', '1');
    expect(component.isOnDuty('1')).toBeTrue();
  });

  it('checks out a staff member and clears on-duty state', () => {
    const { component, staffServiceStub } = setup(
      [staff({ id: '1', fullName: 'John Guard' })],
      [{ id: 'a1', societyId: 'soc-1', staffId: '1', staffName: 'John Guard', attendanceDate: '2026-01-01', isLate: false, status: 'CheckedIn' }],
    );

    component.checkOut(component.items()[0]);

    expect(staffServiceStub.checkOut).toHaveBeenCalledWith('soc-1', '1');
    expect(component.isOnDuty('1')).toBeFalse();
  });

  it('deactivates a staff member when confirmed', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const { component, staffServiceStub } = setup([staff({ id: '1', fullName: 'John Guard' })]);

    component.deactivate(component.items()[0]);

    expect(staffServiceStub.deactivate).toHaveBeenCalledWith('soc-1', '1');
    expect(component.items()[0].isActive).toBeFalse();
  });

  it('does not deactivate when the user cancels the confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const { component, staffServiceStub } = setup([staff({ id: '1' })]);

    component.deactivate(component.items()[0]);

    expect(staffServiceStub.deactivate).not.toHaveBeenCalled();
  });

  it('reactivates a deactivated staff member', () => {
    const { component, staffServiceStub } = setup([staff({ id: '1', fullName: 'John Guard', isActive: false })]);

    component.reactivate(component.items()[0]);

    expect(staffServiceStub.reactivate).toHaveBeenCalledWith('soc-1', '1');
    expect(component.items()[0].isActive).toBeTrue();
  });

  it('deletes a staff member when confirmed, removing them from the list', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const { component, staffServiceStub } = setup([staff({ id: '1', fullName: 'John Guard' })]);

    component.deleteStaff(component.items()[0]);

    expect(staffServiceStub.delete).toHaveBeenCalledWith('soc-1', '1');
    expect(component.items()).toEqual([]);
  });

  it('does not delete when the user cancels the confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const { component, staffServiceStub } = setup([staff({ id: '1' })]);

    component.deleteStaff(component.items()[0]);

    expect(staffServiceStub.delete).not.toHaveBeenCalled();
  });

  it('filters staff by name or phone search term', () => {
    const { component } = setup([
      staff({ id: '1', fullName: 'Alice Guard', phone: '1112223333' }),
      staff({ id: '2', fullName: 'Bob Gardener', phone: '4445556666' }),
    ]);

    component.search.set('alice');
    expect(component.filtered().map(s => s.id)).toEqual(['1']);

    component.search.set('444');
    expect(component.filtered().map(s => s.id)).toEqual(['2']);
  });

  it('does not let a SUUser (read-only) manage attendance, and never fetches on-duty status for them', () => {
    const { component, staffServiceStub } = setup([staff({ id: '1' })], [], {}, false, false);

    expect(component.canManageAttendance()).toBeFalse();
    expect(staffServiceStub.onDuty).not.toHaveBeenCalled();
  });

  it('lets SUSecurity manage attendance and fetches on-duty status', () => {
    const { component, staffServiceStub } = setup([staff({ id: '1' })], [], {}, false, true);

    expect(component.canManageAttendance()).toBeTrue();
    expect(staffServiceStub.onDuty).toHaveBeenCalledWith('soc-1');
  });

  it('lets SUAdmin manage attendance and fetches on-duty status', () => {
    const { component, staffServiceStub } = setup([staff({ id: '1' })], [], {}, true, false);

    expect(component.canManageAttendance()).toBeTrue();
    expect(staffServiceStub.onDuty).toHaveBeenCalledWith('soc-1');
  });
});
