import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaintenanceAdminGridComponent } from './maintenance-admin-grid.component';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { AuthService } from '../../core/services/auth.service';
import { MaintenanceCharge, MaintenanceChargeGrid, MaintenanceGridCharge, MaintenanceGridRow } from '../../core/models/maintenance.model';

describe('MaintenanceAdminGridComponent', () => {
  function makeGridCharge(overrides: Partial<MaintenanceGridCharge> = {}): MaintenanceGridCharge {
    return {
      id: 'charge-1',
      scheduleId: 'sched-1',
      scheduleName: 'Monthly Maintenance',
      amount: 5000,
      status: 'ProofSubmitted',
      dueDate: '2026-07-05T00:00:00Z',
      isOverdue: false,
      paidAt: null,
      paymentMethod: null,
      transactionReference: null,
      receiptUrl: null,
      notes: null,
      proofs: [],
      ...overrides,
    };
  }

  function makeRow(apartmentId: string, apartmentNumber: string, charges: MaintenanceGridCharge[] = []): MaintenanceGridRow {
    return {
      apartmentId,
      apartmentNumber,
      residentName: `Resident ${apartmentNumber}`,
      months: [
        { month: 7, totalAmount: charges.reduce((s, c) => s + c.amount, 0), hasOverdue: charges.some(c => c.isOverdue), charges },
      ],
    };
  }

  function makeGrid(rows: MaintenanceGridRow[]): MaintenanceChargeGrid {
    return {
      societyId: 'soc-1',
      year: 2026,
      months: [7],
      summary: { pendingAmount: 0, submittedAmount: 0, paidAmount: 0, pendingCount: 0, submittedCount: 0, paidCount: 0 },
      rows,
    };
  }

  function setup(grid: MaintenanceChargeGrid, serviceOverrides: Partial<Record<string, unknown>> = {}) {
    const maintenanceServiceStub = {
      getChargeGrid: jasmine.createSpy().and.returnValue(of(grid)),
      approveProof: jasmine.createSpy().and.returnValue(of(true)),
      markPaid: jasmine.createSpy().and.returnValue(of(true)),
      createPenaltyCharge: jasmine.createSpy(),
      ...serviceOverrides,
    };
    const authServiceStub = { societyId: () => 'soc-1' };

    TestBed.configureTestingModule({
      imports: [MaintenanceAdminGridComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: MaintenanceService, useValue: maintenanceServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(MaintenanceAdminGridComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture, maintenanceServiceStub };
  }

  it('renders only the first 20 apartment rows when the grid has more', () => {
    const rows = Array.from({ length: 45 }, (_, i) => makeRow(`apt-${i}`, `A-${i}`));
    const { component } = setup(makeGrid(rows));

    expect(component.displayRows().length).toBe(20);
    expect(component.totalRowCount()).toBe(45);
  });

  it('reveals more rows once the admin scrolls near the bottom of the grid', () => {
    const rows = Array.from({ length: 45 }, (_, i) => makeRow(`apt-${i}`, `A-${i}`));
    const { component } = setup(makeGrid(rows));

    component.onGridScroll({
      target: { scrollHeight: 1000, scrollTop: 750, clientHeight: 200 },
    } as unknown as Event);

    expect(component.displayRows().length).toBe(40);
  });

  it('does not reveal more rows while still far from the bottom', () => {
    const rows = Array.from({ length: 45 }, (_, i) => makeRow(`apt-${i}`, `A-${i}`));
    const { component } = setup(makeGrid(rows));

    component.onGridScroll({
      target: { scrollHeight: 1000, scrollTop: 100, clientHeight: 200 },
    } as unknown as Event);

    expect(component.displayRows().length).toBe(20);
  });

  it('caps the revealed rows at the total row count', () => {
    const rows = Array.from({ length: 25 }, (_, i) => makeRow(`apt-${i}`, `A-${i}`));
    const { component } = setup(makeGrid(rows));

    component.onGridScroll({ target: { scrollHeight: 1000, scrollTop: 750, clientHeight: 200 } } as unknown as Event);
    component.onGridScroll({ target: { scrollHeight: 1000, scrollTop: 750, clientHeight: 200 } } as unknown as Event);

    expect(component.displayRows().length).toBe(25);
  });

  it('approving a proof updates the charge in place instead of reloading the grid', () => {
    const charge = makeGridCharge({ id: 'charge-1', status: 'ProofSubmitted' });
    const { component, maintenanceServiceStub } = setup(makeGrid([makeRow('apt-1', 'A-1', [charge])]));

    component.settlementForm.setValue({
      paymentMethod: 'UPI', transactionReference: 'TXN123', receiptUrl: '', notes: '',
    });
    component.approveProof(charge);

    expect(maintenanceServiceStub.getChargeGrid).toHaveBeenCalledTimes(1); // only the initial load
    const updated = component.grid()!.rows[0].months[0].charges[0];
    expect(updated.status).toBe('Paid');
    expect(updated.transactionReference).toBe('TXN123');
    expect(updated.isOverdue).toBeFalse();
  });

  it('marking a charge paid updates it in place instead of reloading the grid', () => {
    const charge = makeGridCharge({ id: 'charge-2', status: 'Pending', isOverdue: true });
    const { component, maintenanceServiceStub } = setup(makeGrid([makeRow('apt-1', 'A-1', [charge])]));

    component.settlementForm.setValue({
      paymentMethod: 'Cash', transactionReference: '', receiptUrl: '', notes: 'Paid at office',
    });
    component.markPaid(charge);

    expect(maintenanceServiceStub.getChargeGrid).toHaveBeenCalledTimes(1);
    const updated = component.grid()!.rows[0].months[0].charges[0];
    expect(updated.status).toBe('Paid');
    expect(updated.notes).toBe('Paid at office');
  });

  it('creating a penalty charge adds it to the grid without reloading', () => {
    const { component, maintenanceServiceStub } = setup(makeGrid([makeRow('apt-1', 'A-1', [])]));
    const createdCharge: MaintenanceCharge = {
      id: 'penalty-1', societyId: 'soc-1', apartmentId: 'apt-1', apartmentNumber: 'A-1',
      scheduleId: 'penalty', scheduleName: 'Late Fee', chargeYear: 2026, chargeMonth: 7,
      amount: 250, status: 'Pending', dueDate: '2026-07-15T00:00:00Z', isOverdue: false,
      proofs: [], createdAt: '2026-07-10T00:00:00Z', updatedAt: '2026-07-10T00:00:00Z',
    };
    maintenanceServiceStub.createPenaltyCharge.and.returnValue(of(createdCharge));

    component.penaltyForm.setValue({
      apartmentId: 'apt-1', amount: 250, dueDate: '2026-07-15', reason: 'Late payment',
    });
    component.createPenalty();

    expect(maintenanceServiceStub.getChargeGrid).toHaveBeenCalledTimes(1);
    const cellCharges = component.grid()!.rows[0].months[0].charges;
    expect(cellCharges).toContain(jasmine.objectContaining({ id: 'penalty-1', amount: 250 }));
  });

  it('does not add a newly created penalty charge when it would not match the active status filter', () => {
    const { component, maintenanceServiceStub } = setup(makeGrid([makeRow('apt-1', 'A-1', [])]));
    component.filterForm.controls.status.setValue('Paid');

    const createdCharge: MaintenanceCharge = {
      id: 'penalty-2', societyId: 'soc-1', apartmentId: 'apt-1', apartmentNumber: 'A-1',
      scheduleId: 'penalty', scheduleName: 'Late Fee', chargeYear: 2026, chargeMonth: 7,
      amount: 250, status: 'Pending', dueDate: '2026-07-15T00:00:00Z', isOverdue: false,
      proofs: [], createdAt: '2026-07-10T00:00:00Z', updatedAt: '2026-07-10T00:00:00Z',
    };
    maintenanceServiceStub.createPenaltyCharge.and.returnValue(of(createdCharge));

    component.penaltyForm.setValue({
      apartmentId: 'apt-1', amount: 250, dueDate: '2026-07-15', reason: 'Late payment',
    });
    component.createPenalty();

    const cellCharges = component.grid()!.rows[0].months[0].charges;
    expect(cellCharges.length).toBe(0);
  });
});
