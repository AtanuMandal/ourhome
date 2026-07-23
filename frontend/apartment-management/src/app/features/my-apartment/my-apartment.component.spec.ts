import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MyApartmentComponent } from './my-apartment.component';
import { UserService, ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { Apartment } from '../../core/models/apartment.model';

describe('MyApartmentComponent', () => {
  function makeApartment(overrides: Partial<Apartment> = {}): Apartment {
    return {
      id: 'apt-1',
      societyId: 'soc-1',
      apartmentNumber: 'A-101',
      blockName: 'A',
      floorNumber: 1,
      numberOfRooms: 2,
      parkingSlots: [],
      carpetArea: 500,
      buildUpArea: 600,
      superBuildArea: 700,
      status: 'Occupied',
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  function setup(
    userOverrides: Partial<User> = {},
    userServiceOverrides: Partial<Record<string, unknown>> = {},
    apartments: Apartment[] = [],
    apartmentServiceOverrides: Partial<Record<string, unknown>> = {},
  ) {
    const currentUser: User = {
      id: 'u1',
      societyId: 'soc-1',
      fullName: 'Alice Smith',
      email: 'alice@example.com',
      phone: '9876543210',
      role: 'SUUser',
      apartments: [{ apartmentId: 'apt-1', name: 'A-101', residentType: 'Owner' }],
      isActive: true,
      isVerified: true,
      ...userOverrides,
    } as User;

    const userServiceStub = {
      get: jasmine.createSpy().and.returnValue(of(currentUser)),
      requestApartmentJoin: jasmine.createSpy().and.returnValue(of(currentUser)),
      shareInviteLink: jasmine.createSpy().and.returnValue(of(undefined)),
      ...userServiceOverrides,
    };
    const apartmentServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: apartments, total: apartments.length, page: 1, pageSize: 500 })),
      updateParking: jasmine.createSpy().and.returnValue(of(apartments[0] ?? makeApartment())),
      ...apartmentServiceOverrides,
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
    return { component: fixture.componentInstance, userServiceStub, apartmentServiceStub, fixture };
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

  it('shows one text box per parking slot for a linked apartment, pre-filled with the saved car number', () => {
    const apartment = makeApartment({
      parkingSlots: ['P1', 'P2'],
      parkingCarNumbers: [{ slotId: 'P1', carNumber: 'KA-01-AB-1234' }],
    });
    const { component } = setup({}, {}, [apartment]);

    expect(component.apartmentSlots('apt-1')).toEqual(['P1', 'P2']);
    expect(component.parkingValue('apt-1', 'P1')).toBe('KA-01-AB-1234');
    expect(component.parkingValue('apt-1', 'P2')).toBe('');
  });

  it('shows no parking section when the apartment has no parking slots', () => {
    const apartment = makeApartment({ parkingSlots: [] });
    const { component } = setup({}, {}, [apartment]);

    expect(component.apartmentSlots('apt-1')).toEqual([]);
  });

  it('saves the edited car numbers for every slot on the apartment', () => {
    const apartment = makeApartment({ parkingSlots: ['P1', 'P2'] });
    const updated = makeApartment({
      parkingSlots: ['P1', 'P2'],
      parkingCarNumbers: [{ slotId: 'P1', carNumber: 'KA-01-AB-1234' }],
    });
    const { component, apartmentServiceStub } = setup({}, {}, [apartment], {
      updateParking: jasmine.createSpy().and.returnValue(of(updated)),
    });

    component.setParkingValue('apt-1', 'P1', 'KA-01-AB-1234');
    component.saveParking('apt-1');

    expect(apartmentServiceStub.updateParking).toHaveBeenCalledWith('soc-1', 'apt-1', [
      { slotId: 'P1', carNumber: 'KA-01-AB-1234' },
      { slotId: 'P2', carNumber: '' },
    ]);
    expect(component.savingParking()).toBeNull();
    expect(component.apartmentSlots('apt-1')).toEqual(['P1', 'P2']);
  });

  it('resets the saving flag when updating parking fails', () => {
    const apartment = makeApartment({ parkingSlots: ['P1'] });
    const { component } = setup({}, {}, [apartment], {
      updateParking: jasmine.createSpy().and.returnValue(throwError(() => new Error('failed'))),
    });

    component.saveParking('apt-1');

    expect(component.savingParking()).toBeNull();
  });
});
