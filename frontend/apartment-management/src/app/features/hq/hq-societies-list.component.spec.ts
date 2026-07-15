import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HqSocietiesListComponent } from './hq-societies-list.component';
import { SocietyService } from '../../core/services/society.service';
import { AuthService } from '../../core/services/auth.service';
import { Society } from '../../core/models/society.model';

describe('HqSocietiesListComponent', () => {
  function makeSociety(overrides: Partial<Society> = {}): Society {
    return {
      id: 's1', name: 'Green Valley',
      address: { street: '1 Main St', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
      totalBlocks: 2, totalApartments: 40, maintenanceOverdueThresholdDays: 7, maxUsersPerApartment: 10, visitorOverstayThresholdHours: 5,
      status: 'Active', adminUserIds: [], societyUsers: [], committees: [], themeId: 'ocean', createdAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  function setup(societies: Society[], isHqAdmin = true) {
    const societyServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: societies, total: societies.length, page: 1, pageSize: 100 })),
      activate: jasmine.createSpy().and.returnValue(of(true)),
      deactivate: jasmine.createSpy().and.returnValue(of(true)),
    };
    const authServiceStub = { isHqAdmin: () => isHqAdmin };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [HqSocietiesListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: SocietyService, useValue: societyServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    const fixture = TestBed.createComponent(HqSocietiesListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, societyServiceStub, fixture };
  }

  it('loads and displays all societies regardless of status', () => {
    const { component } = setup([makeSociety({ status: 'Active' }), makeSociety({ id: 's2', status: 'Inactive' })]);
    expect(component.societies().length).toBe(2);
  });

  it('activates a society and reloads the list', () => {
    const { component, societyServiceStub } = setup([makeSociety({ status: 'Inactive' })]);
    component.activate(component.societies()[0]);
    expect(societyServiceStub.activate).toHaveBeenCalledWith('s1');
  });

  it('deactivates a society and reloads the list', () => {
    const { component, societyServiceStub } = setup([makeSociety({ status: 'Active' })]);
    component.deactivate(component.societies()[0]);
    expect(societyServiceStub.deactivate).toHaveBeenCalledWith('s1');
  });

  it('exposes isHqAdmin for template-level action gating', () => {
    const { component } = setup([makeSociety()], false);
    expect(component.isHqAdmin()).toBeFalse();
  });
});
