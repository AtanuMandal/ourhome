import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ResidentProfileComponent } from './resident-profile.component';
import { ApartmentService, UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

describe('ResidentProfileComponent', () => {
  function baseUser(overrides: Partial<User>): User {
    return {
      id: overrides.id ?? 'u1',
      societyId: 'soc-1',
      fullName: overrides.fullName ?? 'Bob Jones',
      email: overrides.email ?? 'bob@example.com',
      phone: overrides.phone ?? '9876543210',
      role: overrides.role ?? 'SUUser',
      residentType: overrides.residentType ?? 'Owner',
      apartments: overrides.apartments ?? [],
      isActive: true,
      isVerified: true,
      ...overrides,
    } as User;
  }

  function setup(user: User, isAdmin = false) {
    const userServiceStub = { get: jasmine.createSpy().and.returnValue(of(user)) };
    const apartmentServiceStub = { list: jasmine.createSpy().and.returnValue(of({ items: [] })) };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => isAdmin, user: () => ({ role: isAdmin ? 'SUAdmin' : 'SUUser' }) };
    const snackBarStub = { open: jasmine.createSpy() };
    const activatedRouteStub = {
      snapshot: {
        paramMap: convertToParamMap({ id: user.id }),
        queryParamMap: convertToParamMap({}),
      },
    };

    TestBed.configureTestingModule({
      imports: [ResidentProfileComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userServiceStub },
        { provide: ApartmentService, useValue: apartmentServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    });

    const fixture = TestBed.createComponent(ResidentProfileComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture };
  }

  it('renders the masked contact info the backend returns for a non-admin viewer', () => {
    // Masking is enforced server-side; the profile page must display whatever
    // the API returns rather than hiding contact fields by role client-side.
    const { fixture } = setup(baseUser({ email: 'bo***@***.com', phone: '+91-98XXXXXX10' }), false);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('bo***@***.com');
    expect(text).toContain('+91-98XXXXXX10');
  });

  it('renders unmasked contact info as returned for an admin viewer', () => {
    const { fixture } = setup(baseUser({ email: 'bob@example.com', phone: '9876543210' }), true);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('bob@example.com');
    expect(text).toContain('9876543210');
  });
});
