import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SosAlertReportComponent } from './sos-alert-report.component';
import { SosService } from '../../core/services/sos.service';
import { AuthService } from '../../core/services/auth.service';
import { SosAlertReport } from '../../core/models/sos.model';

describe('SosAlertReportComponent', () => {
  function report(overrides: Partial<SosAlertReport> = {}): SosAlertReport {
    return {
      fromDate: '2026-01-01T00:00:00Z',
      toDate: '2026-01-31T00:00:00Z',
      totalAlerts: 4,
      falseAlarmCount: 1,
      falseAlarmRatePercent: 25,
      averageAcknowledgeSeconds: 45,
      averageResolveSeconds: 300,
      byCategory: [{ category: 'Fire', count: 3 }, { category: 'Medical', count: 1 }],
      ...overrides,
    };
  }

  function setup(serviceOverrides: Partial<Record<string, unknown>> = {}) {
    const sosServiceStub = {
      report: jasmine.createSpy().and.returnValue(of(report())),
      ...serviceOverrides,
    };
    const authServiceStub = { societyId: () => 'soc-1' };

    TestBed.configureTestingModule({
      imports: [SosAlertReportComponent, NoopAnimationsModule],
      providers: [
        { provide: SosService, useValue: sosServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(SosAlertReportComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, sosServiceStub, fixture };
  }

  it('loads the report for the default date range on init', () => {
    const { component, sosServiceStub } = setup();

    expect(sosServiceStub.report).toHaveBeenCalledWith('soc-1', component.fromDate(), component.toDate());
    expect(component.report()?.totalAlerts).toBe(4);
  });

  it('reruns the report with the selected date range', () => {
    const { component, sosServiceStub } = setup();

    component.fromDate.set('2026-02-01');
    component.toDate.set('2026-02-28');
    component.load();

    expect(sosServiceStub.report).toHaveBeenCalledWith('soc-1', '2026-02-01', '2026-02-28');
  });
});
