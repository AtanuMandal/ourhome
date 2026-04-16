import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ResidentFormComponent } from './resident-form.component';
import { ApartmentService, UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';

describe('ResidentFormComponent', () => {
  function setup(user: { role: string; residentType: string }) {
    const apartmentServiceStub = { list: jasmine.createSpy().and.returnValue(of({ items: [] })) };
    const userServiceStub = { findByEmail: jasmine.createSpy(), register: jasmine.createSpy() };
    const authServiceStub = { societyId: () => 'soc-1', user: () => user };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [ResidentFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ApartmentService, useValue: apartmentServiceStub },
        { provide: UserService, useValue: userServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    const fixture = TestBed.createComponent(ResidentFormComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('shows only owner option for SUAdmin', () => {
    const component = setup({ role: 'SUAdmin', residentType: 'SocietyAdmin' });

    expect(component.residentTypes()).toEqual([{ value: 'Owner', label: 'Owner' }]);
    expect(component.form.controls.residentType.value).toBe('Owner');
  });

  it('shows tenant and family member options for owners', () => {
    const component = setup({ role: 'SUUser', residentType: 'Owner' });

    expect(component.residentTypes().map(x => x.value)).toEqual(['Tenant', 'FamilyMember']);
  });

  it('validates phone as exactly 10 digits', () => {
    const component = setup({ role: 'SUAdmin', residentType: 'SocietyAdmin' });

    component.form.controls.phone.setValue('12345AB789');
    expect(component.form.controls.phone.hasError('pattern')).toBeTrue();

    component.form.controls.phone.setValue('9876543210');
    expect(component.form.controls.phone.valid).toBeTrue();
  });
});
