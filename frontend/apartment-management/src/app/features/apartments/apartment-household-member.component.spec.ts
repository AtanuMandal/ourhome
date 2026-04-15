import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ApartmentHouseholdMemberComponent } from './apartment-household-member.component';
import { UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';

describe('ApartmentHouseholdMemberComponent', () => {
  function setup(user: { role: string; residentType: string } | null) {
    const routerStub = { navigate: jasmine.createSpy() };
    const userServiceStub = { addHouseholdMember: jasmine.createSpy().and.returnValue(of({})) };
    const authStub = { user: () => user, societyId: () => 'soc-1' };

    TestBed.configureTestingModule({
      imports: [ApartmentHouseholdMemberComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerStub },
        { provide: UserService, useValue: userServiceStub },
        { provide: AuthService, useValue: authStub },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'apt-1' }) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(ApartmentHouseholdMemberComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, routerStub };
  }

  it('allows owners to add only family members', () => {
    const { component } = setup({ role: 'SUUser', residentType: 'Owner' });

    expect(component.residentTypes()).toEqual([{ value: 'FamilyMember', label: 'Family Member' }]);
    expect(component.form.controls.residentType.value).toBe('FamilyMember');
  });

  it('allows tenants to add only co-occupants', () => {
    const { component } = setup({ role: 'SUUser', residentType: 'Tenant' });

    expect(component.residentTypes()).toEqual([{ value: 'CoOccupant', label: 'Co-Occupant' }]);
    expect(component.form.controls.residentType.value).toBe('CoOccupant');
  });

  it('redirects non-owner and non-tenant users', () => {
    const { routerStub } = setup({ role: 'SUAdmin', residentType: 'SocietyAdmin' });

    expect(routerStub.navigate).toHaveBeenCalledWith(['/apartments', 'apt-1']);
  });
});
