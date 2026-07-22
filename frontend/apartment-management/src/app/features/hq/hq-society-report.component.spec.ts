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
      sn: 'Green Valley', st: 'Active',
      ta: 40, oa: 30, va: 8, uma: 2,
      oc: 25, tc: 5, tr: 30,
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
    expect(component.report()?.sn).toBe('Green Valley');
  });

  it('exposes apartment and resident counts with no financial fields', () => {
    const { component } = setup(makeReport({ ta: 40, oc: 25, tc: 5 }));
    const report = component.report()!;
    expect(report.ta).toBe(40);
    expect(report.oc).toBe(25);
    expect(report.tc).toBe(5);
    expect(Object.keys(report)).not.toContain('totalIncome');
    expect(Object.keys(report)).not.toContain('totalExpense');
  });

  it('stops loading once the report resolves', () => {
    const { component } = setup(makeReport());
    expect(component.loading()).toBeFalse();
  });
});
