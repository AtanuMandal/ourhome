import { computeGridSummary, mergeGridDelta } from './maintenance-shared';
import { MaintenanceChargeGrid, MaintenanceGridCharge, MaintenanceGridRow } from '../../core/models/maintenance.model';

function charge(overrides: Partial<MaintenanceGridCharge> = {}): MaintenanceGridCharge {
  return {
    id: 'charge-1',
    scheduleId: 'sched-1',
    scheduleName: 'Monthly Maintenance',
    amount: 5000,
    status: 'Pending',
    dueDate: '2026-07-10T00:00:00Z',
    isOverdue: false,
    proofs: [],
    ...overrides,
  };
}

function row(apartmentId: string, cells: MaintenanceGridRow['months']): MaintenanceGridRow {
  return { apartmentId, apartmentNumber: apartmentId, residentName: 'Resident', months: cells };
}

function grid(rows: MaintenanceGridRow[]): MaintenanceChargeGrid {
  return {
    societyId: 'soc-1',
    year: 2026,
    months: [4, 5, 6, 7],
    summary: { pendingAmount: 0, submittedAmount: 0, paidAmount: 0, pendingCount: 0, submittedCount: 0, paidCount: 0 },
    rows,
  };
}

describe('computeGridSummary', () => {
  it('sums amounts and counts per status across every row and cell', () => {
    const rows = [
      row('apt-1', [{ month: 4, totalAmount: 5000, hasOverdue: false, charges: [charge({ id: 'c1', status: 'Pending', amount: 5000 })] }]),
      row('apt-2', [{ month: 4, totalAmount: 3000, hasOverdue: false, charges: [charge({ id: 'c2', status: 'Paid', amount: 3000 })] }]),
    ];

    const summary = computeGridSummary(rows);

    expect(summary).toEqual({
      pendingAmount: 5000,
      submittedAmount: 0,
      paidAmount: 3000,
      pendingCount: 1,
      submittedCount: 0,
      paidCount: 1,
    });
  });

  it('returns all zeros for an empty grid', () => {
    expect(computeGridSummary([])).toEqual({
      pendingAmount: 0, submittedAmount: 0, paidAmount: 0, pendingCount: 0, submittedCount: 0, paidCount: 0,
    });
  });
});

describe('mergeGridDelta', () => {
  it('updates a charge in place within its existing cell and recomputes the cell totals', () => {
    const existing = grid([
      row('apt-1', [{ month: 4, totalAmount: 5000, hasOverdue: false, charges: [charge({ id: 'c1', status: 'Pending', amount: 5000 })] }]),
    ]);
    const delta = grid([
      row('apt-1', [{ month: 4, totalAmount: 0, hasOverdue: false, charges: [charge({ id: 'c1', status: 'Paid', amount: 5000 })] }]),
    ]);

    const merged = mergeGridDelta(existing, delta);

    const cell = merged.rows[0].months[0];
    expect(cell.charges).toEqual([charge({ id: 'c1', status: 'Paid', amount: 5000 })]);
    expect(cell.totalAmount).toBe(5000);
  });

  it('appends a genuinely new charge to an existing cell', () => {
    const existing = grid([
      row('apt-1', [{ month: 4, totalAmount: 5000, hasOverdue: false, charges: [charge({ id: 'c1', amount: 5000 })] }]),
    ]);
    const delta = grid([
      row('apt-1', [{ month: 4, totalAmount: 0, hasOverdue: false, charges: [charge({ id: 'c2', amount: 1000 })] }]),
    ]);

    const merged = mergeGridDelta(existing, delta);

    const cell = merged.rows[0].months[0];
    expect(cell.charges.map(c => c.id)).toEqual(['c1', 'c2']);
    expect(cell.totalAmount).toBe(6000);
  });

  it('appends a genuinely new row for an apartment not yet in the existing grid', () => {
    const existing = grid([row('apt-1', [{ month: 4, totalAmount: 0, hasOverdue: false, charges: [] }])]);
    const delta = grid([
      row('apt-2', [{ month: 4, totalAmount: 5000, hasOverdue: false, charges: [charge({ id: 'c9', amount: 5000 })] }]),
    ]);

    const merged = mergeGridDelta(existing, delta);

    expect(merged.rows.map(r => r.apartmentId)).toEqual(['apt-1', 'apt-2']);
  });

  it('leaves an untouched row/cell in another apartment alone', () => {
    const existing = grid([
      row('apt-1', [{ month: 4, totalAmount: 5000, hasOverdue: false, charges: [charge({ id: 'c1', amount: 5000 })] }]),
      row('apt-2', [{ month: 4, totalAmount: 3000, hasOverdue: false, charges: [charge({ id: 'c2', amount: 3000 })] }]),
    ]);
    const delta = grid([
      row('apt-1', [{ month: 4, totalAmount: 0, hasOverdue: false, charges: [charge({ id: 'c1', status: 'Paid', amount: 5000 })] }]),
    ]);

    const merged = mergeGridDelta(existing, delta);

    expect(merged.rows[1]).toEqual(existing.rows[1]);
  });

  it('drops a merged charge that no longer satisfies stillVisible', () => {
    const existing = grid([
      row('apt-1', [{ month: 4, totalAmount: 5000, hasOverdue: false, charges: [charge({ id: 'c1', status: 'Pending', amount: 5000 })] }]),
    ]);
    const delta = grid([
      row('apt-1', [{ month: 4, totalAmount: 0, hasOverdue: false, charges: [charge({ id: 'c1', status: 'Paid', amount: 5000 })] }]),
    ]);

    const merged = mergeGridDelta(existing, delta, c => c.status === 'Pending');

    expect(merged.rows[0].months[0].charges).toEqual([]);
    expect(merged.rows[0].months[0].totalAmount).toBe(0);
  });

  it('recomputes the summary from the merged grid, ignoring the delta response summary', () => {
    const existing = grid([
      row('apt-1', [{ month: 4, totalAmount: 5000, hasOverdue: false, charges: [charge({ id: 'c1', status: 'Pending', amount: 5000 })] }]),
    ]);
    const delta = grid([
      row('apt-1', [{ month: 4, totalAmount: 0, hasOverdue: false, charges: [charge({ id: 'c1', status: 'Paid', amount: 5000 })] }]),
    ]);
    delta.summary = { pendingAmount: 999, submittedAmount: 0, paidAmount: 0, pendingCount: 1, submittedCount: 0, paidCount: 0 };

    const merged = mergeGridDelta(existing, delta);

    expect(merged.summary).toEqual({
      pendingAmount: 0, submittedAmount: 0, paidAmount: 5000, pendingCount: 0, submittedCount: 0, paidCount: 1,
    });
  });

  it('returns the existing grid unchanged when the delta has no rows', () => {
    const existing = grid([row('apt-1', [{ month: 4, totalAmount: 5000, hasOverdue: false, charges: [charge()] }])]);

    const merged = mergeGridDelta(existing, grid([]));

    expect(merged).toBe(existing);
  });
});
