import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MyApartmentComponent } from './my-apartment.component';
import { UserService, ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

describe('MyApartmentComponent', () => {
  function setup(userOverrides: Partial<User> = {}, userServiceOverrides: Partial<Record<string, unknown>> = {}) {
    const currentUser: User = {
      id: 'u1',
      sid: 'soc-1',
      fn: 'Alice Smith',
      em: 'alice@example.com',
      ph: '9876543210',
      rl: 'SUUser',
      apts: [{ aid: 'apt-1', nm: 'A-101', rt: 'Owner' }],
      ac: true,
      vf: true,
      ...userOverrides,
    } as User;

    const userServiceStub = {
      get: jasmine.createSpy().and.returnValue(of(currentUser)),
      requestApartmentJoin: jasmine.createSpy().and.returnValue(of(currentUser)),
      shareInviteLink: jasmine.createSpy().and.returnValue(of(undefined)),
      ...userServiceOverrides,
    };
    const apartmentServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 500 })),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      user: () => ({ id: 'u1' }),
    };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [MyApartmentComponent, NoopAnimationsModule],
      providers: [
        { provide: UserService, useValue: userServiceStub },
        { provide: ApartmentService, useValue: apartmentServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    const fixture = TestBed.createComponent(MyApartmentComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, userServiceStub, fixture };
  }

  it('sends the registration link by email rather than displaying it on screen', () => {
    const { component, userServiceStub, fixture } = setup();

    component.shareEmail.set('newresident@example.com');
    component.sendInviteLink('apt-1');

    expect(userServiceStub.shareInviteLink).toHaveBeenCalledWith('soc-1', 'newresident@example.com', 'apt-1');
    expect(component.shareEmail()).toBe('');
    expect(component.sendingLink()).toBeFalse();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('/auth/register?token=');
  });

  it('does not attempt to send when the email field is empty', () => {
    const { component, userServiceStub } = setup();

    component.shareEmail.set('');
    component.sendInviteLink('apt-1');

    expect(userServiceStub.shareInviteLink).not.toHaveBeenCalled();
  });

  it('resets the sending flag without clearing the email when sending fails', () => {
    const { component } = setup({}, {
      shareInviteLink: jasmine.createSpy().and.returnValue(throwError(() => new Error('failed'))),
    });

    component.shareEmail.set('newresident@example.com');
    component.sendInviteLink('apt-1');

    expect(component.sendingLink()).toBeFalse();
    expect(component.shareEmail()).toBe('newresident@example.com');
  });
});
