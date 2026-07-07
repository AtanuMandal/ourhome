import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ResidentListComponent } from './resident-list.component';
import { UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

describe('ResidentListComponent', () => {
  function user(overrides: Partial<User>): User {
    return {
      id: overrides.id ?? 'u1',
      societyId: 'soc-1',
      fullName: overrides.fullName ?? 'Test User',
      email: overrides.email ?? 'test@example.com',
      phone: overrides.phone ?? '9876543210',
      role: overrides.role ?? 'SUUser',
      residentType: 'Owner',
      apartments: overrides.apartments ?? [],
      isActive: true,
      isVerified: true,
      ...overrides,
    } as User;
  }

  function setup(users: User[], userServiceOverrides: Partial<Record<string, unknown>> = {}) {
    const userServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: users, total: users.length, page: 1, pageSize: 500 })),
      getPendingJoinRequests: jasmine.createSpy().and.returnValue(of([])),
      delete: jasmine.createSpy().and.returnValue(of(undefined)),
      generateInviteLink: jasmine.createSpy(),
      ...userServiceOverrides,
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => true,
    };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [ResidentListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: userServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    const fixture = TestBed.createComponent(ResidentListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, userServiceStub, fixture };
  }

  it('groups users by role, admins first', () => {
    const { component } = setup([
      user({ id: '1', fullName: 'Resident One', role: 'SUUser' }),
      user({ id: '2', fullName: 'Admin One', role: 'SUAdmin' }),
      user({ id: '3', fullName: 'Guard One', role: 'SUSecurity' }),
    ]);

    const groups = component.groupedByRole();
    expect(groups.map(g => g.role)).toEqual(['SUAdmin', 'SUSecurity', 'SUUser']);
    expect(groups.find(g => g.role === 'SUAdmin')?.users.length).toBe(1);
  });

  it('filters users across name, email, phone and apartment by search term', () => {
    const { component } = setup([
      user({ id: '1', fullName: 'Alice Smith', email: 'alice@example.com', phone: '1112223333' }),
      user({ id: '2', fullName: 'Bob Jones', email: 'bob@example.com', phone: '4445556666', apartments: [{ apartmentId: 'a1', name: 'A-101', residentType: 'Owner' }] }),
    ]);

    component.search.set('a-101');
    expect(component.filtered().map(u => u.id)).toEqual(['2']);

    component.search.set('alice');
    expect(component.filtered().map(u => u.id)).toEqual(['1']);
  });

  it('removes the user from the list after a successful delete', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const { component, userServiceStub } = setup([
      user({ id: '1', fullName: 'Alice Smith' }),
    ]);

    component.deleteUser(component.items()[0]);

    expect(userServiceStub.delete).toHaveBeenCalledWith('soc-1', '1');
    expect(component.items().length).toBe(0);
    expect(component.deleting()).toBeNull();
  });

  it('resets the deleting flag without removing the user when delete fails', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const { component } = setup(
      [user({ id: '1', fullName: 'Alice Smith' })],
      { delete: jasmine.createSpy().and.returnValue(throwError(() => ({ error: { error: 'This user is still mapped to an apartment.' } }))) }
    );

    component.deleteUser(component.items()[0]);

    expect(component.items().length).toBe(1);
    expect(component.deleting()).toBeNull();
  });

  it('does not call delete when the user cancels the confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const { component, userServiceStub } = setup([user({ id: '1' })]);

    component.deleteUser(component.items()[0]);

    expect(userServiceStub.delete).not.toHaveBeenCalled();
  });

  it('renders whatever contact info the backend returns, including a masked value, without hiding it client-side', () => {
    // Contact masking is enforced server-side (see UserAndAccess.md); the component must not
    // additionally gate email/phone display by role, or a masked value would never reach the user.
    const { fixture } = setup([
      user({ id: '1', fullName: 'Bob Jones', email: 'bo***@***.com', phone: '+91-98XXXXXX10' }),
    ]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('bo***@***.com');
    expect(text).toContain('+91-98XXXXXX10');
  });
});
