import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SosAlertListComponent } from './sos-alert-list.component';
import { SosService } from '../../core/services/sos.service';
import { AuthService } from '../../core/services/auth.service';
import { SosAlert } from '../../core/models/sos.model';

describe('SosAlertListComponent', () => {
  function alert(overrides: Partial<SosAlert>): SosAlert {
    return {
      id: overrides.id ?? 'a1',
      societyId: 'soc-1',
      apartmentId: 'apt-1',
      apartmentLabel: 'A-101',
      triggeredByUserId: 'user-1',
      triggeredByUserName: 'Jane Resident',
      category: 'Fire',
      status: 'Triggered',
      triggeredAt: '2026-01-01T00:00:00Z',
      escalationCount: 0,
      ...overrides,
    };
  }

  function setup(
    alerts: SosAlert[],
    serviceOverrides: Partial<Record<string, unknown>> = {},
    isAdmin = true,
    isSecurity = false,
  ) {
    const sosServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: alerts, total: alerts.length, page: 1, pageSize: 50 })),
      acknowledge: jasmine.createSpy().and.returnValue(of(alert({ id: 'a1', status: 'Acknowledged', acknowledgedByUserName: 'Guard' }))),
      resolve: jasmine.createSpy().and.returnValue(of(alert({ id: 'a1', status: 'Resolved', resolvedByUserName: 'Guard' }))),
      ...serviceOverrides,
    };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => isAdmin, isSecurity: () => isSecurity };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [SosAlertListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: SosService, useValue: sosServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    const fixture = TestBed.createComponent(SosAlertListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, sosServiceStub, fixture };
  }

  it('loads alerts on init', () => {
    const { component, sosServiceStub } = setup([alert({ id: '1' }), alert({ id: '2', status: 'Resolved' })]);

    expect(sosServiceStub.list).toHaveBeenCalledWith('soc-1', 1, 50, { status: '' });
    expect(component.items().length).toBe(2);
  });

  it('reloads with the selected status filter', () => {
    const { component, sosServiceStub } = setup([alert({ id: '1' })]);

    component.onStatusChange('Resolved');

    expect(component.statusFilter()).toBe('Resolved');
    expect(sosServiceStub.list).toHaveBeenCalledWith('soc-1', 1, 50, { status: 'Resolved' });
  });

  it('acknowledges a triggered alert and updates it in place', () => {
    const { component, sosServiceStub } = setup([alert({ id: 'a1' })]);

    component.acknowledge(component.items()[0]);

    expect(sosServiceStub.acknowledge).toHaveBeenCalledWith('soc-1', 'a1');
    expect(component.items()[0].status).toBe('Acknowledged');
  });

  it('resolves an alert and updates it in place', () => {
    const { component, sosServiceStub } = setup([alert({ id: 'a1', status: 'Acknowledged' })]);

    component.resolve(component.items()[0]);

    expect(sosServiceStub.resolve).toHaveBeenCalledWith('soc-1', 'a1');
    expect(component.items()[0].status).toBe('Resolved');
  });

  it('shows Acknowledge/Resolve actions for an admin', () => {
    const { fixture } = setup([alert({ id: 'a1', status: 'Triggered' })], {}, true, false);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Acknowledge');
    expect(text).toContain('Resolve');
  });

  it('shows Acknowledge/Resolve actions for security', () => {
    const { fixture } = setup([alert({ id: 'a1', status: 'Triggered' })], {}, false, true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Acknowledge');
    expect(text).toContain('Resolve');
  });

  it('hides Acknowledge/Resolve actions for a plain resident (view-only)', () => {
    const { fixture } = setup([alert({ id: 'a1', status: 'Triggered' })], {}, false, false);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).not.toContain('Acknowledge');
    expect(text).not.toContain('Resolve');
  });
});
