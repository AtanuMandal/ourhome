import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';
import { ComplaintService } from '../../core/services/complaint.service';
import { NoticeService } from '../../core/services/notice.service';
import { FinancialReportService } from '../../core/services/financial-report.service';
import { SosService } from '../../core/services/sos.service';
import { FinancialDashboard } from '../../core/models/financial-report.model';

describe('DashboardComponent', () => {
  function makeFinancialDashboard(): FinancialDashboard {
    return {
      month: 7, year: 2026, monthLabel: 'Jul 2026',
      maintenanceBilled: 10000, maintenanceCollected: 6000, maintenancePending: 4000,
      maintenanceOverdue: 0, collectionEfficiencyPercent: 60,
      vendorBilled: 2000, vendorPaid: 2000, vendorOutstanding: 0,
      netPosition: 4000,
      topOverdueApartments: [],
      upcomingVendorDues: [{ vendorId: 'v1', vendorName: 'CleanCo', amount: 500, dueDate: '2026-07-10', daysUntilDue: 3 }],
      upcomingCharges: [{ apartmentId: 'a1', apartmentLabel: 'A-101', amount: 5000, dueDate: '2026-07-08', daysUntilDue: 1 }],
      upcomingCashInflow: 5000,
      upcomingCashOutflow: 500,
    };
  }

  function setup(isAdmin: boolean) {
    const complaintServiceStub = { list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 3 })) };
    const noticeServiceStub    = { list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 3 })) };
    const financialReportServiceStub = {
      getDashboard: jasmine.createSpy().and.returnValue(of(makeFinancialDashboard())),
    };
    const authServiceStub = {
      user: () => ({ role: isAdmin ? 'SUAdmin' : 'SUUser', fullName: 'Test User' }),
      societyId: () => 'soc-1',
      isAdmin: () => isAdmin,
    };
    const sosServiceStub = {
      trigger: jasmine.createSpy(),
      get: jasmine.createSpy(),
      markFalseAlarm: jasmine.createSpy(),
    };

    TestBed.configureTestingModule({
      imports: [DashboardComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ComplaintService, useValue: complaintServiceStub },
        { provide: NoticeService, useValue: noticeServiceStub },
        { provide: FinancialReportService, useValue: financialReportServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: SosService, useValue: sosServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, financialReportServiceStub };
  }

  it('fetches and exposes the financial dashboard for an admin role', () => {
    const { component, financialReportServiceStub } = setup(true);

    expect(financialReportServiceStub.getDashboard).toHaveBeenCalledWith('soc-1');
    expect(component.financialSummary()).not.toBeNull();
    expect(component.financialSummary()!.upcomingCashInflow).toBe(5000);
    expect(component.financialSummary()!.upcomingCashOutflow).toBe(500);
  });

  it('renders the Upcoming Charges / Cash Inflow cards for an admin role', () => {
    const { fixture } = setup(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Upcoming Cash Inflow');
    expect(text).toContain('Upcoming Cash Outflow');
  });

  it('does not call the financial dashboard endpoint for a non-admin role', () => {
    const { component, financialReportServiceStub } = setup(false);

    expect(financialReportServiceStub.getDashboard).not.toHaveBeenCalled();
    expect(component.financialSummary()).toBeNull();
  });

  it('does not render the financial cards for a non-admin role', () => {
    const { fixture } = setup(false);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).not.toContain('Upcoming Cash Inflow');
    expect(text).not.toContain('Upcoming Cash Outflow');
  });

  it('renders the SOS trigger widget for a resident (SUUser) role', () => {
    const { fixture, component } = setup(false);

    expect(component.isResident()).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-sos-trigger')).not.toBeNull();
  });

  it('does not render the SOS trigger widget for an admin role', () => {
    const { fixture, component } = setup(true);

    expect(component.isResident()).toBeFalse();
    expect(fixture.nativeElement.querySelector('app-sos-trigger')).toBeNull();
  });
});
