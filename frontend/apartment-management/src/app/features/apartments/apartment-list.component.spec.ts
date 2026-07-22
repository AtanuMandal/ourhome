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
      id: overrides.num ?? 'apt',
      num: 'A100',
      blk: 'A',
      flr: 1,
      rms: 2,
      pks: [],
      ca: 500,
      ba: 600,
      sba: 700,
      st: 'Available',
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
      makeApartment({ num: 'A101', flr: 1 }),
      makeApartment({ num: 'A305', flr: 3 }),
      makeApartment({ num: 'A202', flr: 2 }),
      makeApartment({ num: 'A301', flr: 3 }),
    ]);

    expect(component.filtered().map(a => a.num)).toEqual(['A301', 'A305', 'A202', 'A101']);
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
