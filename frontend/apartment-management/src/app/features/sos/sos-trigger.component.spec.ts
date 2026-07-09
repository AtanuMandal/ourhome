import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SosTriggerComponent } from './sos-trigger.component';
import { SosService } from '../../core/services/sos.service';
import { AuthService } from '../../core/services/auth.service';
import { SosAlert } from '../../core/models/sos.model';

describe('SosTriggerComponent', () => {
  function alert(overrides: Partial<SosAlert> = {}): SosAlert {
    return {
      id: 'alert-1',
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

  function setup(serviceOverrides: Partial<Record<string, unknown>> = {}) {
    const sosServiceStub = {
      trigger: jasmine.createSpy().and.returnValue(of(alert())),
      get: jasmine.createSpy().and.returnValue(of(alert())),
      markFalseAlarm: jasmine.createSpy().and.returnValue(of(alert({ status: 'FalseAlarm' }))),
      ...serviceOverrides,
    };
    const authServiceStub = { societyId: () => 'soc-1' };

    TestBed.configureTestingModule({
      imports: [SosTriggerComponent, NoopAnimationsModule],
      providers: [
        { provide: SosService, useValue: sosServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(SosTriggerComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, sosServiceStub, fixture };
  }

  it('opens the confirmation dialog with Fire pre-selected', () => {
    const { component } = setup();

    component.openDialog();

    expect(component.showDialog()).toBeTrue();
    expect(component.category()).toBe('Fire');
  });

  it('triggers an alert and shows the returned status', () => {
    const { component, sosServiceStub } = setup();

    component.openDialog();
    component.category.set('Medical');
    component.note.set('Chest pain');
    component.confirmTrigger();

    expect(sosServiceStub.trigger).toHaveBeenCalledWith('soc-1', { category: 'Medical', note: 'Chest pain' });
    expect(component.showDialog()).toBeFalse();
    expect(component.activeAlert()?.id).toBe('alert-1');
  });

  it('marks the active alert as a false alarm and stops polling', fakeAsync(() => {
    const { component, sosServiceStub } = setup();

    component.confirmTrigger();
    component.markFalseAlarm();
    tick();

    expect(sosServiceStub.markFalseAlarm).toHaveBeenCalledWith('soc-1', 'alert-1');
    expect(component.activeAlert()?.status).toBe('FalseAlarm');

    // No further polling calls after the alert is settled.
    tick(30_000);
    expect(sosServiceStub.get).not.toHaveBeenCalled();
    component.ngOnDestroy();
  }));

  it('polls for status updates while the alert remains active', fakeAsync(() => {
    const { component, sosServiceStub } = setup({
      get: jasmine.createSpy().and.returnValue(of(alert({ status: 'Acknowledged', acknowledgedByUserName: 'Guard' }))),
    });

    component.confirmTrigger();
    tick(10_000);

    expect(sosServiceStub.get).toHaveBeenCalledWith('soc-1', 'alert-1');
    expect(component.activeAlert()?.status).toBe('Acknowledged');
    component.ngOnDestroy();
  }));

  it('dismisses a settled alert and resets to trigger-ready state', () => {
    const { component } = setup();

    component.confirmTrigger();
    component.dismiss();

    expect(component.activeAlert()).toBeNull();
  });
});
