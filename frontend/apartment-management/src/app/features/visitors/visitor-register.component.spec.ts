import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { VisitorRegisterComponent } from './visitor-register.component';
import { VisitorService } from '../../core/services/visitor.service';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';

describe('VisitorRegisterComponent — company/purpose lookups', () => {
  function setup(role: string) {
    const visitorServiceStub = {
      getLookups: jasmine.createSpy().and.returnValue(of({
        companies: ['Amazon', 'Swiggy', 'Zomato'],
        purposes: ['Delivery', 'Guest visit', 'Electrician'],
      })),
    };
    const apartmentServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [] })),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => role === 'SUAdmin',
      canManageVisitors: () => role === 'SUAdmin' || role === 'SUSecurity',
      user: () => ({ role, apartmentId: 'apt-1', apartments: [{ apartmentId: 'apt-1', name: 'A-101' }] }),
    };

    TestBed.configureTestingModule({
      imports: [VisitorRegisterComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: VisitorService, useValue: visitorServiceStub },
        { provide: ApartmentService, useValue: apartmentServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(VisitorRegisterComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, visitorServiceStub };
  }

  it('loads company and purpose lookups for the current society on init', () => {
    const { visitorServiceStub } = setup('SUUser');
    expect(visitorServiceStub.getLookups).toHaveBeenCalledWith('soc-1');
  });

  it('filters companies as the user types, but keeps free text acceptable', () => {
    const { component } = setup('SUUser');

    component.form.controls.companyName.setValue('swi');
    expect(component.filteredCompanies()).toEqual(['Swiggy']);

    component.form.controls.companyName.setValue('BrandNewCourierCo');
    expect(component.filteredCompanies()).toEqual([]);
    // Free text is still a valid, submittable value — no validator blocks it.
    expect(component.form.controls.companyName.valid).toBeTrue();
  });

  it('filters purposes as the user types', () => {
    const { component } = setup('SUSecurity');

    component.form.controls.purpose.setValue('deliv');
    expect(component.filteredPurposes()).toEqual(['Delivery']);

    component.form.controls.purpose.setValue('');
    expect(component.filteredPurposes()).toEqual(['Delivery', 'Guest visit', 'Electrician']);
  });
});
