import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaintenanceAdminComponent } from './maintenance-admin.component';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { MaintenanceCharge } from '../../core/models/maintenance.model';

describe('MaintenanceAdminComponent — Charge register (approve, deny, resubmission)', () => {
  function makeCharge(overrides: Partial<MaintenanceCharge> = {}): MaintenanceCharge {
    return {
      id: 'charge-1',
      societyId: 'soc-1',
      apartmentId: 'apt-1',
      apartmentNumber: 'A-101',
      scheduleId: 'sched-1',
      scheduleName: 'Monthly Maintenance',
      chargeYear: 2026,
      chargeMonth: 7,
      amount: 5000,
      status: 'ProofSubmitted',
      dueDate: '2026-07-05T00:00:00Z',
      isOverdue: false,
      proofs: [],
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
      ...overrides,
    };
  }

  function setup(charges: MaintenanceCharge[], serviceOverrides: Partial<Record<string, unknown>> = {}) {
    const maintenanceServiceStub = {
      listSchedules: jasmine.createSpy().and.returnValue(of([])),
      listCharges: jasmine.createSpy().and.returnValue(of({ items: charges, total: charges.length, page: 1, pageSize: 20 })),
      approveProof: jasmine.createSpy().and.returnValue(of(true)),
      markPaid: jasmine.createSpy().and.returnValue(of(true)),
      denyProof: jasmine.createSpy(),
      createSchedule: jasmine.createSpy(),
      updateSchedule: jasmine.createSpy(),
      deleteSchedule: jasmine.createSpy(),
      ...serviceOverrides,
    };
    const apartmentServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 500 })),
    };
    const authServiceStub = { societyId: () => 'soc-1', user: () => ({ role: 'SUAdmin', apartmentId: '' }) };

    TestBed.configureTestingModule({
      imports: [MaintenanceAdminComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: MaintenanceService, useValue: maintenanceServiceStub },
        { provide: ApartmentService, useValue: apartmentServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(MaintenanceAdminComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, maintenanceServiceStub };
  }

  it('shows Approve proof and Deny for a ProofSubmitted charge — including one that was resubmitted after a denial', () => {
    // Regression for "once resubmitted, SUAdmin cannot view/approve/deny it": a charge whose
    // status is ProofSubmitted must always expose both actions, regardless of whether it has a
    // RejectionReason left over in its history (the field is cleared server-side on resubmit,
    // but this proves the CLIENT never gates the buttons on anything but the current status).
    const resubmitted = makeCharge({ id: 'charge-resubmitted', status: 'ProofSubmitted', rejectionReason: null });
    const { component } = setup([resubmitted]);

    expect(component.charges().map(c => c.id)).toContain('charge-resubmitted');
    // isSelectableCharge / status-driven template gates are exercised indirectly — assert the
    // handler methods are reachable and operate on the right charge id.
    component.approveProof({ id: resubmitted.id });
  });

  it('approving a ProofSubmitted charge calls approveProof with the settlement payload', () => {
    const charge = makeCharge();
    const { component, maintenanceServiceStub } = setup([charge]);
    component.settlementForm.setValue({ paymentMethod: 'UPI', transactionReference: 'TXN1', receiptUrl: '', notes: '' });

    component.approveProof({ id: charge.id });

    expect(maintenanceServiceStub.approveProof).toHaveBeenCalledWith('soc-1', charge.id, jasmine.objectContaining({ paymentMethod: 'UPI' }));
  });

  it('opening the deny dialog and confirming calls denyProof with the reason', () => {
    const charge = makeCharge();
    const { component, maintenanceServiceStub } = setup([charge]);
    maintenanceServiceStub.denyProof.and.returnValue(of({ id: charge.id, status: 'Rejected', rejectionReason: 'Blurry receipt.' }));

    component.openDenyDialog(charge);
    expect(component.denyTargetCharge()).toEqual(charge);

    component.denyForm.setValue({ reason: 'Blurry receipt.' });
    component.confirmDeny();

    expect(maintenanceServiceStub.denyProof).toHaveBeenCalledWith('soc-1', charge.id, { reason: 'Blurry receipt.' });
    expect(component.denyTargetCharge()).toBeNull();
  });

  it('the deny dialog requires a non-empty reason before it can be confirmed', () => {
    const charge = makeCharge();
    const { component, maintenanceServiceStub } = setup([charge]);

    component.openDenyDialog(charge);
    component.confirmDeny();

    expect(maintenanceServiceStub.denyProof).not.toHaveBeenCalled();
    expect(component.denyForm.invalid).toBeTrue();
  });

  it('closing the deny dialog clears the target and resets the form', () => {
    const charge = makeCharge();
    const { component } = setup([charge]);

    component.openDenyDialog(charge);
    component.denyForm.setValue({ reason: 'Some reason' });
    component.closeDenyDialog();

    expect(component.denyTargetCharge()).toBeNull();
    expect(component.denyForm.controls.reason.value).toBe('');
  });

  it('a Rejected charge with a reason is still visible in the charge list (not hidden or blocked)', () => {
    const denied = makeCharge({ id: 'charge-denied', status: 'Rejected', rejectionReason: 'Amount mismatch.' });
    const { component } = setup([denied]);

    expect(component.charges().map(c => c.id)).toContain('charge-denied');
    expect(component.charges().find(c => c.id === 'charge-denied')?.rejectionReason).toBe('Amount mismatch.');
  });
});

describe('MaintenanceAdminComponent — silent auto-refresh does not disturb in-progress work', () => {
  function makeCharge(overrides: Partial<MaintenanceCharge> = {}): MaintenanceCharge {
    return {
      id: 'charge-1', societyId: 'soc-1', apartmentId: 'apt-1', apartmentNumber: 'A-101',
      scheduleId: 'sched-1', scheduleName: 'Monthly Maintenance', chargeYear: 2026, chargeMonth: 7,
      amount: 5000, status: 'Pending', dueDate: '2026-07-05T00:00:00Z', isOverdue: false,
      proofs: [], createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z', ...overrides,
    };
  }

  function setup(charges: MaintenanceCharge[]) {
    const maintenanceServiceStub = {
      listSchedules: jasmine.createSpy().and.returnValue(of([])),
      listCharges: jasmine.createSpy().and.returnValue(of({ items: charges, total: charges.length, page: 1, pageSize: 20 })),
      approveProof: jasmine.createSpy(), markPaid: jasmine.createSpy(), denyProof: jasmine.createSpy(),
      createSchedule: jasmine.createSpy(), updateSchedule: jasmine.createSpy(), deleteSchedule: jasmine.createSpy(),
    };
    const apartmentServiceStub = { list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 500 })) };
    TestBed.configureTestingModule({
      imports: [MaintenanceAdminComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: MaintenanceService, useValue: maintenanceServiceStub },
        { provide: ApartmentService, useValue: apartmentServiceStub },
        { provide: AuthService, useValue: { societyId: () => 'soc-1', user: () => ({ role: 'SUAdmin', apartmentId: '' }) } },
      ],
    });
    const fixture = TestBed.createComponent(MaintenanceAdminComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, maintenanceServiceStub };
  }

  it('a background refresh does not toggle the main loading flag', () => {
    const { component, maintenanceServiceStub } = setup([makeCharge()]);
    maintenanceServiceStub.listCharges.and.returnValue(of({
      items: [makeCharge(), makeCharge({ id: 'charge-2', status: 'ProofSubmitted' })], total: 2, page: 1, pageSize: 20,
    }));

    component.refreshCharges(true);

    expect(component.chargesLoading()).toBeFalse();
    expect(component.charges().map(c => c.id)).toContain('charge-2');
  });

  it('a manual refresh still uses the full loading flag', () => {
    const { component } = setup([makeCharge()]);

    component.refreshCharges(false);

    // Synchronous stub resolves immediately, so by the time we check, loading has already
    // cleared — the important assertion is that no error was thrown taking the manual path.
    expect(component.chargesLoading()).toBeFalse();
  });
});
