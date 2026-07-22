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
      sid: 'soc-1',
      fn: overrides.fn ?? 'Test User',
      em: overrides.em ?? 'test@example.com',
      ph: overrides.ph ?? '9876543210',
      rl: overrides.rl ?? 'SUUser',
      rt: 'Owner',
      apts: overrides.apts ?? [],
      ac: true,
      vf: true,
      ...overrides,
    } as User;
  }

  function setup(users: User[], userServiceOverrides: Partial<Record<string, unknown>> = {}) {
    const userServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: users, total: users.length, page: 1, pageSize: 500 })),
      getPendingJoinRequests: jasmine.createSpy().and.returnValue(of([])),
      delete: jasmine.createSpy().and.returnValue(of(undefined)),
      shareInviteLink: jasmine.createSpy().and.returnValue(of(undefined)),
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
      user({ id: '1', fn: 'Resident One', rl: 'SUUser' }),
      user({ id: '2', fn: 'Admin One', rl: 'SUAdmin' }),
      user({ id: '3', fn: 'Guard One', rl: 'SUSecurity' }),
    ]);

    const groups = component.groupedByRole();
    expect(groups.map(g => g.role)).toEqual(['SUAdmin', 'SUSecurity', 'SUUser']);
    expect(groups.find(g => g.role === 'SUAdmin')?.users.length).toBe(1);
  });

  it('filters users across name, email, phone and apartment by search term', () => {
    const { component } = setup([
      user({ id: '1', fn: 'Alice Smith', em: 'alice@example.com', ph: '1112223333' }),
      user({ id: '2', fn: 'Bob Jones', em: 'bob@example.com', ph: '4445556666', apts: [{ aid: 'a1', nm: 'A-101', rt: 'Owner' }] }),
    ]);

    component.search.set('a-101');
    expect(component.filtered().map(u => u.id)).toEqual(['2']);

    component.search.set('alice');
    expect(component.filtered().map(u => u.id)).toEqual(['1']);
  });

  it('removes the user from the list after a successful delete', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const { component, userServiceStub } = setup([
      user({ id: '1', fn: 'Alice Smith' }),
    ]);

    component.deleteUser(component.items()[0]);

    expect(userServiceStub.delete).toHaveBeenCalledWith('soc-1', '1');
    expect(component.items().length).toBe(0);
    expect(component.deleting()).toBeNull();
  });

  it('resets the deleting flag without removing the user when delete fails', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const { component } = setup(
      [user({ id: '1', fn: 'Alice Smith' })],
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
      user({ id: '1', fn: 'Bob Jones', em: 'bo***@***.com', ph: '+91-98XXXXXX10' }),
    ]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('bo***@***.com');
    expect(text).toContain('+91-98XXXXXX10');
  });

  it('sends the registration link by email instead of displaying it on screen', () => {
    const { component, userServiceStub } = setup([]);

    component.shareEmail.set('newresident@example.com');
    component.sendInviteLink();

    expect(userServiceStub.shareInviteLink).toHaveBeenCalledWith('soc-1', 'newresident@example.com');
    expect(component.shareEmail()).toBe('');
    expect(component.sendingLink()).toBeFalse();
  });

  it('does not attempt to send when the email field is empty', () => {
    const { component, userServiceStub } = setup([]);

    component.shareEmail.set('');
    component.sendInviteLink();

    expect(userServiceStub.shareInviteLink).not.toHaveBeenCalled();
  });

  it('resets the sending flag without clearing the email when sending fails', () => {
    const { component } = setup([], {
      shareInviteLink: jasmine.createSpy().and.returnValue(throwError(() => new Error('failed'))),
    });

    component.shareEmail.set('newresident@example.com');
    component.sendInviteLink();

    expect(component.sendingLink()).toBeFalse();
    expect(component.shareEmail()).toBe('newresident@example.com');
  });
});
