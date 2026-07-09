import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ApartmentListComponent } from './apartment-list.component';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { Apartment } from '../../core/models/apartment.model';

describe('ApartmentListComponent', () => {
  function makeApartment(overrides: Partial<Apartment>): Apartment {
    return {
      id: overrides.apartmentNumber ?? 'apt',
      societyId: 'soc-1',
      apartmentNumber: 'A100',
      blockName: 'A',
      floorNumber: 1,
      numberOfRooms: 2,
      parkingSlots: [],
      carpetArea: 500,
      buildUpArea: 600,
      superBuildArea: 700,
      status: 'Available',
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  function setup(items: Apartment[]) {
    const apartmentServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items, totalCount: items.length, page: 1, pageSize: 20 })),
    };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => false };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [ApartmentListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ApartmentService, useValue: apartmentServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    const fixture = TestBed.createComponent(ApartmentListComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('lists apartments ordered by floor number descending', () => {
    const component = setup([
      makeApartment({ apartmentNumber: 'A101', floorNumber: 1 }),
      makeApartment({ apartmentNumber: 'A305', floorNumber: 3 }),
      makeApartment({ apartmentNumber: 'A202', floorNumber: 2 }),
      makeApartment({ apartmentNumber: 'A301', floorNumber: 3 }),
    ]);

    expect(component.filtered().map(a => a.apartmentNumber)).toEqual(['A301', 'A305', 'A202', 'A101']);
  });

  it('requests a large page size so societies with more than 20 apartments are not silently truncated', () => {
    const apartmentServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], totalCount: 0, page: 1, pageSize: 500 })),
    };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => false };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [ApartmentListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ApartmentService, useValue: apartmentServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });
    TestBed.createComponent(ApartmentListComponent).detectChanges();

    expect(apartmentServiceStub.list).toHaveBeenCalledWith('soc-1', 1, 500);
  });
});
