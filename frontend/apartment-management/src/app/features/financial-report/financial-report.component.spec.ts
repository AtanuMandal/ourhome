import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FinancialReportComponent } from './financial-report.component';
import { FinancialReportService } from '../../core/services/financial-report.service';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { SocietyLedger, FinancialDashboard } from '../../core/models/financial-report.model';

describe('FinancialReportComponent', () => {
  function makeFinancialDashboard(): FinancialDashboard {
    return {
      month: 7, year: 2026, monthLabel: 'Jul 2026',
      maintenanceBilled: 0, maintenanceCollected: 0, maintenancePending: 0,
      maintenanceOverdue: 0, collectionEfficiencyPercent: 0,
      vendorBilled: 0, vendorPaid: 0, vendorOutstanding: 0, netPosition: 0,
      topOverdueApartments: [], upcomingVendorDues: [],
      upcomingCharges: [], upcomingCashInflow: 0, upcomingCashOutflow: 0,
    };
  }

  function makeSocietyLedger(): SocietyLedger {
    return {
      societyId: 'soc-1',
      currentBalance: 3000,
      entries: [
        { date: '2026-07-01', description: 'Maintenance — A-101 — Jul 2026', type: 'Charge', debit: 5000, credit: null, balance: 5000 },
        { date: '2026-07-02', description: 'Payment received — A-101 — Jul 2026', type: 'Payment', debit: null, credit: 5000, balance: 0 },
        { date: '2026-07-03', description: 'Maintenance — A-102 — Jul 2026', type: 'Charge', debit: 3000, credit: null, balance: 3000 },
      ],
    };
  }

  function setup() {
    const serviceStub = {
      getDashboard: jasmine.createSpy().and.returnValue(of(makeFinancialDashboard())),
      getSocietyLedger: jasmine.createSpy().and.returnValue(of(makeSocietyLedger())),
    };
    const apartmentServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], totalCount: 0, page: 1, pageSize: 200 })),
    };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => true };

    TestBed.configureTestingModule({
      imports: [FinancialReportComponent, NoopAnimationsModule],
      providers: [
        { provide: FinancialReportService, useValue: serviceStub },
        { provide: ApartmentService, useValue: apartmentServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(FinancialReportComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, serviceStub };
  }

  it('loads the society ledger when the Society Ledger tab is selected', () => {
    const { component, serviceStub, fixture } = setup();

    expect(serviceStub.getSocietyLedger).not.toHaveBeenCalled();

    component.setTab('society-ledger');
    fixture.detectChanges();

    expect(serviceStub.getSocietyLedger).toHaveBeenCalledWith('soc-1');
    expect(component.societyLedger()).not.toBeNull();
    expect(component.societyLedger()!.currentBalance).toBe(3000);
  });

  it('renders the society-wide ledger entries using the shared ledger table', () => {
    const { component, fixture } = setup();

    component.setTab('society-ledger');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Overall Society Ledger');
    expect(text).toContain('A-101');
    expect(text).toContain('A-102');
  });

  it('does not reload the society ledger if already loaded', () => {
    const { component, serviceStub, fixture } = setup();

    component.setTab('society-ledger');
    fixture.detectChanges();
    component.setTab('dashboard');
    component.setTab('society-ledger');
    fixture.detectChanges();

    expect(serviceStub.getSocietyLedger).toHaveBeenCalledTimes(1);
  });
});
