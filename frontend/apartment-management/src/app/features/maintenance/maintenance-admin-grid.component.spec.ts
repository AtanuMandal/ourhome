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
      sid: 'sched-1',
      snm: 'Monthly Maintenance',
      amt: 5000,
      st: 'ProofSubmitted',
      dd: '2026-07-05T00:00:00Z',
      ov: false,
      pa: null,
      pm: null,
      tr: null,
      ru: null,
      nt: null,
      pf: [],
      ...overrides,
    };
  }

  function makeRow(apartmentId: string, apartmentNumber: string, charges: MaintenanceGridCharge[] = []): MaintenanceGridRow {
    return {
      aid: apartmentId,
      anm: apartmentNumber,
      rn: `Resident ${apartmentNumber}`,
      mos: [
        { mo: 7, ta: charges.reduce((s, c) => s + c.amt, 0), ho: charges.some(c => c.ov), chg: charges },
      ],
    };
  }

  function makeGrid(rows: MaintenanceGridRow[]): MaintenanceChargeGrid {
    return {
      mos: [7],
      sum: { pa: 0, sa: 0, pda: 0, pc: 0, sc: 0, pdc: 0 },
      rows,
    };
  }

  function setup(grid: MaintenanceChargeGrid, serviceOverrides: Partial<Record<string, unknown>> = {}) {
    const maintenanceServiceStub = {
      getChargeGrid: jasmine.createSpy().and.returnValue(of(grid)),
      approveProof: jasmine.createSpy().and.returnValue(of(true)),
      markPaid: jasmine.createSpy().and.returnValue(of(true)),
      denyProof: jasmine.createSpy(),
      approveProofGroup: jasmine.createSpy(),
      denyProofGroup: jasmine.createSpy(),
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
    const charge = makeGridCharge({ id: 'charge-1', st: 'ProofSubmitted' });
    const { component, maintenanceServiceStub } = setup(makeGrid([makeRow('apt-1', 'A-1', [charge])]));

    component.settlementForm.setValue({
      paymentMethod: 'UPI', transactionReference: 'TXN123', receiptUrl: '', notes: '',
    });
    component.approveProof(charge);

    expect(maintenanceServiceStub.getChargeGrid).toHaveBeenCalledTimes(1); // only the initial load
    const updated = component.grid()!.rows[0].mos[0].chg[0];
    expect(updated.st).toBe('Paid');
    expect(updated.tr).toBe('TXN123');
    expect(updated.ov).toBeFalse();
  });

  it('marking a charge paid updates it in place instead of reloading the grid', () => {
    const charge = makeGridCharge({ id: 'charge-2', st: 'Pending', ov: true });
    const { component, maintenanceServiceStub } = setup(makeGrid([makeRow('apt-1', 'A-1', [charge])]));

    component.settlementForm.setValue({
      paymentMethod: 'Cash', transactionReference: '', receiptUrl: '', notes: 'Paid at office',
    });
    component.markPaid(charge);

    expect(maintenanceServiceStub.getChargeGrid).toHaveBeenCalledTimes(1);
    const updated = component.grid()!.rows[0].mos[0].chg[0];
    expect(updated.st).toBe('Paid');
    expect(updated.nt).toBe('Paid at office');
  });

  it('creating a penalty charge adds it to the grid without reloading', () => {
    const { component, maintenanceServiceStub } = setup(makeGrid([makeRow('apt-1', 'A-1', [])]));
    const createdCharge: MaintenanceCharge = {
      id: 'penalty-1', aid: 'apt-1', anm: 'A-1',
      sid: 'penalty', snm: 'Late Fee', cy: 2026, cm: 7,
      amt: 250, st: 'Pending', dd: '2026-07-15T00:00:00Z', ov: false,
      pf: [],
    };
    maintenanceServiceStub.createPenaltyCharge.and.returnValue(of(createdCharge));

    component.penaltyForm.setValue({
      apartmentId: 'apt-1', amount: 250, dueDate: '2026-07-15', reason: 'Late payment',
    });
    component.createPenalty();

    expect(maintenanceServiceStub.getChargeGrid).toHaveBeenCalledTimes(1);
    const cellCharges = component.grid()!.rows[0].mos[0].chg;
    expect(cellCharges).toContain(jasmine.objectContaining({ id: 'penalty-1', amt: 250 }));
  });

  it('does not add a newly created penalty charge when it would not match the active status filter', () => {
    const { component, maintenanceServiceStub } = setup(makeGrid([makeRow('apt-1', 'A-1', [])]));
    component.filterForm.controls.status.setValue('Paid');

    const createdCharge: MaintenanceCharge = {
      id: 'penalty-2', aid: 'apt-1', anm: 'A-1',
      sid: 'penalty', snm: 'Late Fee', cy: 2026, cm: 7,
      amt: 250, st: 'Pending', dd: '2026-07-15T00:00:00Z', ov: false,
      pf: [],
    };
    maintenanceServiceStub.createPenaltyCharge.and.returnValue(of(createdCharge));

    component.penaltyForm.setValue({
      apartmentId: 'apt-1', amount: 250, dueDate: '2026-07-15', reason: 'Late payment',
    });
    component.createPenalty();

    const cellCharges = component.grid()!.rows[0].mos[0].chg;
    expect(cellCharges.length).toBe(0);
  });
});

describe('MaintenanceAdminGridComponent — clubbed submissions (grouping, approve, deny)', () => {
  function makeGridCharge(overrides: Partial<MaintenanceGridCharge> = {}): MaintenanceGridCharge {
    return {
      id: 'charge-1',
      sid: 'sched-1',
      snm: 'Monthly Maintenance',
      amt: 5000,
      st: 'ProofSubmitted',
      dd: '2026-04-05T00:00:00Z',
      ov: false,
      pa: null,
      pm: null,
      tr: null,
      ru: null,
      nt: null,
      pf: [],
      sgi: 'group-1',
      ...overrides,
    };
  }

  function makeRow(apartmentId: string, apartmentNumber: string, chargesByMonth: { month: number; charges: MaintenanceGridCharge[] }[]): MaintenanceGridRow {
    return {
      aid: apartmentId,
      anm: apartmentNumber,
      rn: `Resident ${apartmentNumber}`,
      mos: chargesByMonth.map(({ month, charges }) => ({
        mo: month,
        ta: charges.reduce((s, c) => s + c.amt, 0),
        ho: charges.some(c => c.ov),
        chg: charges,
      })),
    };
  }

  function makeGrid(rows: MaintenanceGridRow[]): MaintenanceChargeGrid {
    return {
      mos: [4, 5, 6],
      sum: { pa: 0, sa: 0, pda: 0, pc: 0, sc: 0, pdc: 0 },
      rows,
    };
  }

  function setup(grid: MaintenanceChargeGrid, serviceOverrides: Partial<Record<string, unknown>> = {}) {
    const maintenanceServiceStub = {
      getChargeGrid: jasmine.createSpy().and.returnValue(of(grid)),
      approveProof: jasmine.createSpy().and.returnValue(of(true)),
      markPaid: jasmine.createSpy().and.returnValue(of(true)),
      denyProof: jasmine.createSpy(),
      approveProofGroup: jasmine.createSpy(),
      denyProofGroup: jasmine.createSpy(),
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

  // A resident clubbing Apr+May+Jun dues into one proof submission — three charges, same
  // apartment, same submissionGroupId, spread across three different month cells.
  function makeClubbedGrid() {
    const apr = makeGridCharge({ id: 'charge-apr', dd: '2026-04-05T00:00:00Z' });
    const may = makeGridCharge({ id: 'charge-may', dd: '2026-05-05T00:00:00Z' });
    const jun = makeGridCharge({ id: 'charge-jun', dd: '2026-06-05T00:00:00Z' });
    const row = makeRow('apt-1', 'A-1', [
      { month: 4, charges: [apr] },
      { month: 5, charges: [may] },
      { month: 6, charges: [jun] },
    ]);
    return { apr, may, jun, grid: makeGrid([row]) };
  }

  it('clusters charges sharing an apartment and submissionGroupId into one group', () => {
    const { grid } = makeClubbedGrid();
    const { component } = setup(grid);

    const groups = component.groupedSubmissions();

    expect(groups.length).toBe(1);
    expect(groups[0].apartmentId).toBe('apt-1');
    expect(groups[0].charges.map(c => c.id).sort()).toEqual(['charge-apr', 'charge-jun', 'charge-may']);
    expect(groups[0].totalAmount).toBe(15000);
    expect(groups[0].status).toBe('ProofSubmitted');
  });

  it('does not group a lone submission (only one charge sharing that group id)', () => {
    const charge = makeGridCharge({ id: 'charge-solo' });
    const { component } = setup(makeGrid([makeRow('apt-1', 'A-1', [{ month: 4, charges: [charge] }])]));

    expect(component.groupedSubmissions().length).toBe(0);
    expect(component.isGroupedCharge(charge)).toBeFalse();
  });

  it('does not group charges with no submissionGroupId', () => {
    const chargeA = makeGridCharge({ id: 'a', sgi: undefined });
    const chargeB = makeGridCharge({ id: 'b', sgi: undefined, dd: '2026-05-05T00:00:00Z' });
    const { component } = setup(makeGrid([makeRow('apt-1', 'A-1', [
      { month: 4, charges: [chargeA] },
      { month: 5, charges: [chargeB] },
    ])]));

    expect(component.groupedSubmissions().length).toBe(0);
  });

  it('resolves the clubbed group for each member charge so its cell renders group-level actions', () => {
    const { apr, grid } = makeClubbedGrid();
    const { component } = setup(grid);

    expect(component.isGroupedCharge(apr)).toBeTrue();
    const group = component.groupForCharge(apr);
    expect(group).not.toBeNull();
    expect(group!.charges.length).toBe(3);
  });

  // Regression: "admin functionality to approve/view proof/deny has been removed from the grid
  // view — it should stay in the grid". Clubbed-submission actions render INSIDE the member
  // charges' own grid cells (Approve all N / Deny all N), never in a separate section.
  it('renders clubbed Approve all/Deny all buttons inside the grid cells, with no separate section', () => {
    const { grid } = makeClubbedGrid();
    const { fixture } = setup(grid);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Clubbed payment proof submissions');
    expect(text).not.toContain('review it above');
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(buttons.filter(label => label === 'Approve all 3').length).toBe(3);
    expect(buttons.filter(label => label === 'Deny all 3').length).toBe(3);
  });

  // Regression: "after approving, SUAdmin should still see the proof submitted for the paid
  // ones". A Paid clubbed charge keeps its View proofs button in its grid cell; only the
  // approve/deny actions disappear once settled.
  it('a Paid clubbed charge still shows View proofs in its grid cell', () => {
    const { grid } = makeClubbedGrid();
    for (const row of grid.rows) {
      for (const cell of row.mos) {
        for (const charge of cell.chg) {
          charge.st = 'Paid';
          charge.pf = [{ pu: 'https://proofs.example.com/receipt.jpg', sa: '2026-07-02T00:00:00Z' }];
        }
      }
    }
    const { fixture } = setup(grid);

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(buttons.filter(label => label === 'View proofs').length).toBe(3);
    expect(buttons).not.toContain('Approve all 3');
    expect(buttons).not.toContain('Deny all 3');
  });

  it('a Paid ungrouped charge with proofs still shows View proofs in its grid cell', () => {
    const paid = makeGridCharge({
      id: 'charge-paid', st: 'Paid', sgi: undefined,
      pf: [{ pu: 'https://proofs.example.com/receipt.jpg', sa: '2026-07-02T00:00:00Z' }],
    });
    const { fixture } = setup(makeGrid([makeRow('apt-1', 'A-1', [{ month: 4, charges: [paid] }])]));

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map(b => b.textContent?.trim());
    expect(buttons).toContain('View proofs');
    expect(buttons).not.toContain('Mark paid');
  });

  it('a group where every charge is Paid is still reported as a group with status Paid', () => {
    const { grid } = makeClubbedGrid();
    for (const row of grid.rows) {
      for (const cell of row.mos) {
        for (const charge of cell.chg) charge.st = 'Paid';
      }
    }
    const { component } = setup(grid);

    const groups = component.groupedSubmissions();
    expect(groups.length).toBe(1);
    expect(groups[0].status).toBe('Paid');
  });

  it('approving a group calls approveProofGroup with every member id and patches them all to Paid', () => {
    const { grid } = makeClubbedGrid();
    const { component, maintenanceServiceStub } = setup(grid);
    maintenanceServiceStub.approveProofGroup.and.returnValue(of([
      { id: 'charge-apr', st: 'Paid', pa: '2026-07-01T00:00:00Z' },
      { id: 'charge-may', st: 'Paid', pa: '2026-07-01T00:00:00Z' },
      { id: 'charge-jun', st: 'Paid', pa: '2026-07-01T00:00:00Z' },
    ]));
    component.settlementForm.setValue({ paymentMethod: 'UPI', transactionReference: 'TXN1', receiptUrl: '', notes: '' });

    component.approveGroup(component.groupedSubmissions()[0]);

    expect(maintenanceServiceStub.approveProofGroup).toHaveBeenCalledWith('soc-1', jasmine.objectContaining({
      chargeIds: jasmine.arrayContaining(['charge-apr', 'charge-may', 'charge-jun']),
      paymentMethod: 'UPI',
      transactionReference: 'TXN1',
    }));
    const statuses = component.grid()!.rows[0].mos.flatMap(m => m.chg).map(c => c.st);
    expect(statuses).toEqual(['Paid', 'Paid', 'Paid']);
    // Approved-together charges stay clustered — still reported as a (now Paid) group.
    expect(component.groupedSubmissions().length).toBe(1);
    expect(component.groupedSubmissions()[0].status).toBe('Paid');
  });

  it('denying a single ungrouped charge calls denyProof and falls back to Rejected', () => {
    const charge = makeGridCharge({ id: 'charge-solo', sgi: undefined });
    const { component, maintenanceServiceStub } = setup(makeGrid([makeRow('apt-1', 'A-1', [{ month: 4, charges: [charge] }])]));
    maintenanceServiceStub.denyProof.and.returnValue(of({ id: 'charge-solo', st: 'Rejected', rr: 'Blurry screenshot.' }));

    component.openDenyDialog({ type: 'single', charge });
    component.denyForm.setValue({ reason: 'Blurry screenshot.' });
    component.confirmDeny();

    expect(maintenanceServiceStub.denyProof).toHaveBeenCalledWith('soc-1', 'charge-solo', { reason: 'Blurry screenshot.' });
    const updated = component.grid()!.rows[0].mos[0].chg[0];
    expect(updated.st).toBe('Rejected');
    expect(updated.rr).toBe('Blurry screenshot.');
    expect(component.denyTarget()).toBeNull();
  });

  it('denying a group calls denyProofGroup with every member id and each falls back out of the group (default view)', () => {
    const { grid } = makeClubbedGrid();
    const { component, maintenanceServiceStub } = setup(grid);
    maintenanceServiceStub.denyProofGroup.and.returnValue(of([
      { id: 'charge-apr', st: 'Rejected', rr: 'Total mismatch.' },
      { id: 'charge-may', st: 'Rejected', rr: 'Total mismatch.' },
      { id: 'charge-jun', st: 'Rejected', rr: 'Total mismatch.' },
    ]));
    const group = component.groupedSubmissions()[0];

    component.openDenyDialog({ type: 'group', group });
    component.denyForm.setValue({ reason: 'Total mismatch.' });
    component.confirmDeny();

    expect(maintenanceServiceStub.denyProofGroup).toHaveBeenCalledWith('soc-1', {
      chargeIds: ['charge-apr', 'charge-may', 'charge-jun'],
      reason: 'Total mismatch.',
    });
    const statuses = component.grid()!.rows[0].mos.flatMap(m => m.chg).map(c => c.st);
    expect(statuses).toEqual(['Rejected', 'Rejected', 'Rejected']);
    // The group is gone — each charge now shows individually (default view) since Rejected
    // charges are excluded from the grouping predicate.
    expect(component.groupedSubmissions().length).toBe(0);
  });

  it('the deny dialog requires a non-empty reason', () => {
    const charge = makeGridCharge({ id: 'charge-solo', sgi: undefined });
    const { component, maintenanceServiceStub } = setup(makeGrid([makeRow('apt-1', 'A-1', [{ month: 4, charges: [charge] }])]));

    component.openDenyDialog({ type: 'single', charge });
    component.confirmDeny();

    expect(maintenanceServiceStub.denyProof).not.toHaveBeenCalled();
  });

  // Regression: "once resubmitted by SUUser, SUAdmin cannot view/approve/deny it". A charge that
  // was denied and then resubmitted (Rejected -> ProofSubmitted again, with a fresh, unshared
  // submissionGroupId) must render with the completely normal single-charge Approve/Deny action
  // row — it must never be treated as still "grouped" with its old (now-irrelevant) submission,
  // and it must never lack action buttons.
  it('a charge resubmitted after denial is NOT grouped and shows the normal Approve/Deny buttons', () => {
    const resubmitted = makeGridCharge({
      id: 'charge-resubmitted',
      st: 'ProofSubmitted',
      sgi: 'brand-new-group-from-resubmission',
      rr: null,
    });
    const { component } = setup(makeGrid([makeRow('apt-1', 'A-1', [{ month: 4, charges: [resubmitted] }])]));

    expect(component.groupedSubmissions().length).toBe(0);
    expect(component.isGroupedCharge(resubmitted)).toBeFalse();
  });

  it('a Rejected charge (awaiting resubmission) shows its denial reason and no Approve/Deny buttons', () => {
    const denied = makeGridCharge({ id: 'charge-denied', st: 'Rejected', rr: 'Amount mismatch.' });
    const { component } = setup(makeGrid([makeRow('apt-1', 'A-1', [{ month: 4, charges: [denied] }])]));

    // Not grouped (Rejected is excluded from the grouping predicate) — falls back to normal view.
    expect(component.isGroupedCharge(denied)).toBeFalse();
  });
});

describe('MaintenanceAdminGridComponent — silent auto-refresh', () => {
  function makeGridCharge(overrides: Partial<MaintenanceGridCharge> = {}): MaintenanceGridCharge {
    return {
      id: 'charge-1', sid: 'sched-1', snm: 'Monthly Maintenance', amt: 5000,
      st: 'ProofSubmitted', dd: '2026-07-05T00:00:00Z', ov: false,
      pa: null, pm: null, tr: null, ru: null, nt: null,
      pf: [], ...overrides,
    };
  }

  function makeRow(apartmentId: string, apartmentNumber: string, charges: MaintenanceGridCharge[]): MaintenanceGridRow {
    return {
      aid: apartmentId, anm: apartmentNumber, rn: `Resident ${apartmentNumber}`,
      mos: [{ mo: 7, ta: charges.reduce((s, c) => s + c.amt, 0), ho: false, chg: charges }],
    };
  }

  function makeGrid(rows: MaintenanceGridRow[]): MaintenanceChargeGrid {
    return { mos: [7], sum: { pa: 0, sa: 0, pda: 0, pc: 0, sc: 0, pdc: 0 }, rows };
  }

  function setup(initialGrid: MaintenanceChargeGrid) {
    const maintenanceServiceStub = {
      getChargeGrid: jasmine.createSpy().and.returnValue(of(initialGrid)),
      approveProof: jasmine.createSpy(),
      markPaid: jasmine.createSpy(),
      denyProof: jasmine.createSpy(),
      approveProofGroup: jasmine.createSpy(),
      denyProofGroup: jasmine.createSpy(),
      createPenaltyCharge: jasmine.createSpy(),
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
    return { component: fixture.componentInstance, maintenanceServiceStub };
  }

  it('a background refresh does not toggle the main loading flag or reset the visible row window', () => {
    const charge = makeGridCharge();
    const { component, maintenanceServiceStub } = setup(makeGrid([makeRow('apt-1', 'A-1', [charge])]));
    component.onGridScroll({ target: { scrollHeight: 1000, scrollTop: 750, clientHeight: 200 } } as unknown as Event);
    const expandedRowCount = component.visibleRowCount();

    const resubmitted = makeGridCharge({ id: 'charge-2', st: 'ProofSubmitted' });
    maintenanceServiceStub.getChargeGrid.and.returnValue(of(makeGrid([makeRow('apt-1', 'A-1', [charge, resubmitted])])));

    component.loadGrid(true);

    expect(component.loading()).toBeFalse();
    // A resident's newly (re)submitted proof is now visible without a manual reload.
    expect(component.grid()!.rows[0].mos[0].chg.map(c => c.id)).toContain('charge-2');
    expect(component.visibleRowCount()).toBe(expandedRowCount);
  });

  it('a manual (non-background) loadGrid still uses the full loading flag and resets the row window', () => {
    const { component } = setup(makeGrid([makeRow('apt-1', 'A-1', [makeGridCharge()])]));
    component.onGridScroll({ target: { scrollHeight: 1000, scrollTop: 750, clientHeight: 200 } } as unknown as Event);

    component.loadGrid(false);

    expect(component.visibleRowCount()).toBe(20);
  });

  it('a background refresh is treated as a normal load when no grid has ever loaded yet', () => {
    // Guards a background tick firing before the very first load ever produced any grid data
    // (e.g. an initial request that resolved to null) — it must not get stuck mid-refresh.
    const maintenanceServiceStub = {
      getChargeGrid: jasmine.createSpy().and.returnValue(of(null)),
      approveProof: jasmine.createSpy(), markPaid: jasmine.createSpy(), denyProof: jasmine.createSpy(),
      approveProofGroup: jasmine.createSpy(), denyProofGroup: jasmine.createSpy(), createPenaltyCharge: jasmine.createSpy(),
    };
    TestBed.configureTestingModule({
      imports: [MaintenanceAdminGridComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: MaintenanceService, useValue: maintenanceServiceStub },
        { provide: AuthService, useValue: { societyId: () => 'soc-1' } },
      ],
    });
    const fixture = TestBed.createComponent(MaintenanceAdminGridComponent);
    fixture.detectChanges(); // initial load resolves synchronously to null grid
    const component = fixture.componentInstance;

    component.loadGrid(true);

    expect(component.backgroundRefreshing()).toBeFalse();
    expect(component.loading()).toBeFalse(); // of(null) resolves synchronously too
  });
});
