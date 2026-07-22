import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HqUsersListComponent } from './hq-users-list.component';
import { HqUserService } from '../../core/services/hq-user.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

describe('HqUsersListComponent', () => {
  function makeUser(overrides: Partial<User> = {}): User {
    return {
      id: 'u1', sid: 'hq', em: 'admin@platform.com', rl: 'HQAdmin',
      rt: 'SocietyAdmin', ac: true, vf: true,
      fn: 'Platform Admin',
      ...overrides,
    };
  }

  function setup(users: User[], isHqAdmin = true) {
    const hqUserServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: users, total: users.length, page: 1, pageSize: 100 })),
      create: jasmine.createSpy().and.returnValue(of(makeUser({ id: 'u2', rl: 'HQUser', ac: true }))),
      activate: jasmine.createSpy().and.returnValue(of(true)),
      deactivate: jasmine.createSpy().and.returnValue(of(true)),
    };
    const authServiceStub = { isHqAdmin: () => isHqAdmin };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [HqUsersListComponent, NoopAnimationsModule],
      providers: [
        { provide: HqUserService, useValue: hqUserServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    const fixture = TestBed.createComponent(HqUsersListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, hqUserServiceStub, fixture };
  }

  it('loads existing HQ users', () => {
    const { component } = setup([makeUser()]);
    expect(component.users().length).toBe(1);
  });

  it('creates a new HQ user with the form values', () => {
    const { component, hqUserServiceStub } = setup([]);
    component.form.setValue({ fullName: 'New Viewer', email: 'viewer@platform.com', phone: '9000000000', role: 'HQUser' });

    component.create();

    expect(hqUserServiceStub.create).toHaveBeenCalledWith({
      fullName: 'New Viewer', email: 'viewer@platform.com', phone: '9000000000', role: 'HQUser',
    });
  });

  it('does not submit an invalid form', () => {
    const { component, hqUserServiceStub } = setup([]);
    component.form.setValue({ fullName: '', email: '', phone: '', role: 'HQUser' });

    component.create();

    expect(hqUserServiceStub.create).not.toHaveBeenCalled();
  });

  it('activates and deactivates a user', () => {
    const { component, hqUserServiceStub } = setup([makeUser({ ac: false })]);
    component.activate(component.users()[0]);
    expect(hqUserServiceStub.activate).toHaveBeenCalledWith('u1');

    component.deactivate(component.users()[0]);
    expect(hqUserServiceStub.deactivate).toHaveBeenCalledWith('u1');
  });
});
