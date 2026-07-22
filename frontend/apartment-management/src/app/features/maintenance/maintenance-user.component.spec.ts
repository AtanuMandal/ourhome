import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaintenanceUserComponent } from './maintenance-user.component';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { MaintenanceCharge } from '../../core/models/maintenance.model';

describe('MaintenanceUserComponent — resident view (denial reason, resubmission, background refresh)', () => {
  function makeCharge(overrides: Partial<MaintenanceCharge> = {}): MaintenanceCharge {
    return {
      id: 'charge-1',
      aid: 'apt-1',
      anm: 'A-101',
      sid: 'sched-1',
      snm: 'Monthly Maintenance',
      cy: 2026,
      cm: 7,
      amt: 5000,
      st: 'Pending',
      dd: '2026-07-05T00:00:00Z',
      ov: false,
      pf: [],
      ...overrides,
    };
  }

  function setup(charges: MaintenanceCharge[]) {
    const maintenanceServiceStub = {
      listSchedules: jasmine.createSpy().and.returnValue(of([])),
      getApartmentHistory: jasmine.createSpy().and.returnValue(of({ items: charges, total: charges.length, page: 1, pageSize: 100 })),
      submitProof: jasmine.createSpy().and.returnValue(of(true)),
      uploadProof: jasmine.createSpy().and.returnValue(of({ fn: 'proof.png', fu: 'https://proofs.example.com/proof.png' })),
    };
    const apartmentServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 500 })),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      user: () => ({ rl: 'SUUser', aid: 'apt-1' }),
    };

    TestBed.configureTestingModule({
      imports: [MaintenanceUserComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: MaintenanceService, useValue: maintenanceServiceStub },
        { provide: ApartmentService, useValue: apartmentServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(MaintenanceUserComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, maintenanceServiceStub };
  }

  it('a Rejected charge with a rejection reason is visible to the resident so they can see why it was denied', () => {
    const denied = makeCharge({ id: 'charge-denied', st: 'Rejected', rr: 'Amount does not match the receipt.' });
    const { component } = setup([denied]);

    const charge = component.charges().find(c => c.id === 'charge-denied');
    expect(charge?.rr).toBe('Amount does not match the receipt.');
  });

  it('a Rejected charge is still selectable for resubmission', () => {
    const denied = makeCharge({ id: 'charge-denied', st: 'Rejected', rr: 'Bad receipt.' });
    const { component } = setup([denied]);

    expect(component.isSelectableCharge(denied)).toBeTrue();
    expect(component.selectableCharges().map(c => c.id)).toContain('charge-denied');
  });

  it('a background auto-refresh does NOT clear an in-progress charge selection or uploaded proof', () => {
    // Regression: refreshCharges() used to unconditionally reset selectedChargeIds/uploadedProof,
    // which would silently discard a resident's in-progress resubmission every 10s poll tick.
    const { component, maintenanceServiceStub } = setup([makeCharge({ st: 'Pending' })]);
    component.selectedChargeIds.set(['charge-1']);
    component.uploadedProof.set({ fn: 'receipt.png', fu: 'https://proofs.example.com/receipt.png' });

    maintenanceServiceStub.getApartmentHistory.and.returnValue(of({
      items: [makeCharge({ st: 'Pending' })], total: 1, page: 1, pageSize: 100,
    }));
    component.refreshCharges(true);

    expect(component.selectedChargeIds()).toEqual(['charge-1']);
    expect(component.uploadedProof()).toEqual({ fn: 'receipt.png', fu: 'https://proofs.example.com/receipt.png' });
  });

  it('an explicit (manual) refresh clears the selection and uploaded proof', () => {
    const { component } = setup([makeCharge({ st: 'Pending' })]);
    component.selectedChargeIds.set(['charge-1']);
    component.uploadedProof.set({ fn: 'receipt.png', fu: 'https://proofs.example.com/receipt.png' });

    component.refreshCharges(false);

    expect(component.selectedChargeIds()).toEqual([]);
    expect(component.uploadedProof()).toBeNull();
  });

  it('submitting proof calls submitProof with the selected charge ids and uploaded proof url', () => {
    const { component, maintenanceServiceStub } = setup([makeCharge({ st: 'Pending' })]);
    component.selectedChargeIds.set(['charge-1']);
    component.uploadedProof.set({ fn: 'receipt.png', fu: 'https://proofs.example.com/receipt.png' });

    component.submitProof();

    expect(maintenanceServiceStub.submitProof).toHaveBeenCalledWith('soc-1', jasmine.objectContaining({
      chargeIds: ['charge-1'],
      proofUrl: 'https://proofs.example.com/receipt.png',
    }));
  });

  it('a resubmitted charge (Rejected → ProofSubmitted) drops out of the selectable set once resubmitted', () => {
    const resubmitted = makeCharge({ id: 'charge-resubmitted', st: 'ProofSubmitted', rr: null });
    const { component } = setup([resubmitted]);

    expect(component.isSelectableCharge(resubmitted)).toBeFalse();
    expect(component.selectableCharges().map(c => c.id)).not.toContain('charge-resubmitted');
  });
});
