import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HqSocietyEditComponent } from './hq-society-edit.component';
import { SocietyService } from '../../core/services/society.service';
import { Society } from '../../core/models/society.model';

describe('HqSocietyEditComponent', () => {
  function makeSociety(overrides: Partial<Society> = {}): Society {
    return {
      id: 's1', name: 'Green Valley',
      address: { street: '1 Main St', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
      contactEmail: 'admin@gv.com', contactPhone: '9876543210',
      totalBlocks: 2, totalApartments: 40, maintenanceOverdueThresholdDays: 7,
      status: 'Active', adminUserIds: ['a1'],
      societyUsers: [{ userId: 'u1', fullName: 'Bob', email: 'bob@gv.com', roleTitle: 'Chairman' }],
      committees: [{ name: 'Managing Committee', members: [] }],
      createdAt: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  function setup(society: Society) {
    const societyServiceStub = {
      get: jasmine.createSpy().and.returnValue(of(society)),
      update: jasmine.createSpy().and.returnValue(of(society)),
    };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [HqSocietyEditComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: SocietyService, useValue: societyServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 's1' }) } } },
      ],
    });

    const fixture = TestBed.createComponent(HqSocietyEditComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    return { component: fixture.componentInstance, societyServiceStub, router };
  }

  it('pre-fills the form from the loaded society', () => {
    const { component } = setup(makeSociety());

    expect(component.form.controls.name.value).toBe('Green Valley');
    expect(component.form.controls.city.value).toBe('Bengaluru');
    expect(component.form.controls.contactEmail.value).toBe('admin@gv.com');
  });

  it('submits name, address, and contact changes without touching societyUsers/committees or the admin user', () => {
    const { component, societyServiceStub } = setup(makeSociety());
    component.form.patchValue({ name: 'Green Valley Updated', city: 'Pune', state: 'Maharashtra', postalCode: '411001' });

    component.save();

    expect(societyServiceStub.update).toHaveBeenCalledWith('s1', jasmine.objectContaining({
      name: 'Green Valley Updated',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
      totalBlocks: 2,
      totalApartments: 40,
      maintenanceOverdueThresholdDays: 7,
    }));
    const sentDto = societyServiceStub.update.calls.mostRecent().args[1];
    expect(sentDto.societyUsers).toBeUndefined();
    expect(sentDto.committees).toBeUndefined();
  });

  it('navigates back to the societies list after saving', () => {
    const { component, router } = setup(makeSociety());

    component.save();

    expect(router.navigate).toHaveBeenCalledWith(['/hq/societies']);
  });

  it('does not submit an invalid form', () => {
    const { component, societyServiceStub } = setup(makeSociety());
    component.form.controls.name.setValue('');

    component.save();

    expect(societyServiceStub.update).not.toHaveBeenCalled();
  });
});
