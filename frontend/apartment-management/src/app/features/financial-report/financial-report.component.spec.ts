import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
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

  async function setup() {
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
    // cdk-virtual-scroll-viewport measures real layout (clientHeight) to decide what to render,
    // which is always 0 for a detached fixture — attach to the document so it sees real dimensions.
    document.body.appendChild(fixture.nativeElement);
    await settleVirtualScroll(fixture);
    return { fixture, component: fixture.componentInstance, serviceStub };
  }

  // cdk-virtual-scroll-viewport measures its size and computes its first render range
  // asynchronously (ResizeObserver + a scheduled frame); force a re-measure and yield a frame
  // so virtualized rows are actually present in the DOM before assertions run.
  async function settleVirtualScroll(fixture: ComponentFixture<FinancialReportComponent>) {
    fixture.detectChanges();
    for (const vp of fixture.debugElement.queryAll(By.directive(CdkVirtualScrollViewport))) {
      (vp.componentInstance as CdkVirtualScrollViewport).checkViewportSize();
    }
    fixture.detectChanges();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    fixture.detectChanges();
  }

  afterEach(() => {
    document.querySelectorAll('app-financial-report').forEach(el => el.remove());
  });

  it('loads the society ledger when the Society Ledger tab is selected', async () => {
    const { component, serviceStub, fixture } = await setup();

    expect(serviceStub.getSocietyLedger).not.toHaveBeenCalled();

    component.setTab('society-ledger');
    await settleVirtualScroll(fixture);

    expect(serviceStub.getSocietyLedger).toHaveBeenCalledWith('soc-1');
    expect(component.societyLedger()).not.toBeNull();
    expect(component.societyLedger()!.currentBalance).toBe(3000);
  });

  it('renders the society-wide ledger entries using the shared ledger table', async () => {
    const { component, fixture } = await setup();

    component.setTab('society-ledger');
    await settleVirtualScroll(fixture);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Overall Society Ledger');
    expect(text).toContain('A-101');
    expect(text).toContain('A-102');
  });

  it('does not reload the society ledger if already loaded', async () => {
    const { component, serviceStub, fixture } = await setup();

    component.setTab('society-ledger');
    await settleVirtualScroll(fixture);
    component.setTab('dashboard');
    component.setTab('society-ledger');
    await settleVirtualScroll(fixture);

    expect(serviceStub.getSocietyLedger).toHaveBeenCalledTimes(1);
  });
});
