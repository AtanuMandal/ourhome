import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HqSocietyReportComponent } from './hq-society-report.component';
import { SocietyService } from '../../core/services/society.service';
import { SocietySummaryReport } from '../../core/models/society.model';

describe('HqSocietyReportComponent', () => {
  function makeReport(overrides: Partial<SocietySummaryReport> = {}): SocietySummaryReport {
    return {
      societyId: 's1', societyName: 'Green Valley', status: 'Active',
      totalApartments: 40, occupiedApartments: 30, vacantApartments: 8, underMaintenanceApartments: 2,
      ownerCount: 25, tenantCount: 5, totalResidents: 30,
      ...overrides,
    };
  }

  function setup(report: SocietySummaryReport | null) {
    const societyServiceStub = {
      getSummaryReport: jasmine.createSpy().and.returnValue(report ? of(report) : of(null)),
    };

    TestBed.configureTestingModule({
      imports: [HqSocietyReportComponent, NoopAnimationsModule],
      providers: [
        { provide: SocietyService, useValue: societyServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 's1' }) } } },
      ],
    });

    const fixture = TestBed.createComponent(HqSocietyReportComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, societyServiceStub, fixture };
  }

  it('loads the summary report for the routed society id', () => {
    const { component, societyServiceStub } = setup(makeReport());
    expect(societyServiceStub.getSummaryReport).toHaveBeenCalledWith('s1');
    expect(component.report()?.societyName).toBe('Green Valley');
  });

  it('exposes apartment and resident counts with no financial fields', () => {
    const { component } = setup(makeReport({ totalApartments: 40, ownerCount: 25, tenantCount: 5 }));
    const report = component.report()!;
    expect(report.totalApartments).toBe(40);
    expect(report.ownerCount).toBe(25);
    expect(report.tenantCount).toBe(5);
    expect(Object.keys(report)).not.toContain('totalIncome');
    expect(Object.keys(report)).not.toContain('totalExpense');
  });

  it('stops loading once the report resolves', () => {
    const { component } = setup(makeReport());
    expect(component.loading()).toBeFalse();
  });
});
