import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HqSocietyFormComponent } from './hq-society-form.component';
import { SocietyService } from '../../core/services/society.service';
import { CreateSocietyResponse } from '../../core/models/society.model';

describe('HqSocietyFormComponent', () => {
  function makeResponse(): CreateSocietyResponse {
    return {
      society: {
        id: 's1', name: 'Green Valley',
        address: { street: '1 Main St', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
        totalBlocks: 2, totalApartments: 40, maintenanceOverdueThresholdDays: 7,
        status: 'Draft', adminUserIds: [], societyUsers: [], committees: [], themeId: 'ocean', createdAt: '2026-01-01T00:00:00Z',
      },
      admin: { id: 'a1', fullName: 'Raj Kumar', email: 'raj@gv.com', role: 'SUAdmin' },
    };
  }

  function setup() {
    const societyServiceStub = {
      create: jasmine.createSpy().and.returnValue(of(makeResponse())),
    };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [HqSocietyFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: SocietyService, useValue: societyServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    const fixture = TestBed.createComponent(HqSocietyFormComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    return { component: fixture.componentInstance, societyServiceStub, router };
  }

  it('does not submit an invalid form', () => {
    const { component, societyServiceStub } = setup();
    component.save();
    expect(societyServiceStub.create).not.toHaveBeenCalled();
  });

  it('submits a valid form and navigates back to the society list', () => {
    const { component, societyServiceStub, router } = setup();
    component.form.setValue({
      name: 'Green Valley', street: '1 Main St', city: 'Bengaluru', state: 'Karnataka',
      postalCode: '560001', country: 'India', contactEmail: 'admin@gv.com', contactPhone: '9876543210',
      totalBlocks: 2, totalApartments: 40,
      adminFullName: 'Raj Kumar', adminEmail: 'raj@gv.com', adminPhone: '9000000001',
    });

    component.save();

    expect(societyServiceStub.create).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'Green Valley', adminEmail: 'raj@gv.com',
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/hq/societies']);
  });
});
