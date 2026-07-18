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
      societyId: 'soc-1',
      apartmentId: 'apt-1',
      apartmentNumber: 'A-101',
      scheduleId: 'sched-1',
      scheduleName: 'Monthly Maintenance',
      chargeYear: 2026,
      chargeMonth: 7,
      amount: 5000,
      status: 'Pending',
      dueDate: '2026-07-05T00:00:00Z',
      isOverdue: false,
      proofs: [],
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
      ...overrides,
    };
  }

  function setup(charges: MaintenanceCharge[]) {
    const maintenanceServiceStub = {
      listSchedules: jasmine.createSpy().and.returnValue(of([])),
      getApartmentHistory: jasmine.createSpy().and.returnValue(of({ items: charges, total: charges.length, page: 1, pageSize: 100 })),
      submitProof: jasmine.createSpy().and.returnValue(of(true)),
      uploadProof: jasmine.createSpy().and.returnValue(of({ fileName: 'proof.png', fileUrl: 'https://proofs.example.com/proof.png' })),
    };
    const apartmentServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 500 })),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      user: () => ({ role: 'SUUser', apartmentId: 'apt-1' }),
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
    const denied = makeCharge({ id: 'charge-denied', status: 'Rejected', rejectionReason: 'Amount does not match the receipt.' });
    const { component } = setup([denied]);

    const charge = component.charges().find(c => c.id === 'charge-denied');
    expect(charge?.rejectionReason).toBe('Amount does not match the receipt.');
  });

  it('a Rejected charge is still selectable for resubmission', () => {
    const denied = makeCharge({ id: 'charge-denied', status: 'Rejected', rejectionReason: 'Bad receipt.' });
    const { component } = setup([denied]);

    expect(component.isSelectableCharge(denied)).toBeTrue();
    expect(component.selectableCharges().map(c => c.id)).toContain('charge-denied');
  });

  it('a background auto-refresh does NOT clear an in-progress charge selection or uploaded proof', () => {
    // Regression: refreshCharges() used to unconditionally reset selectedChargeIds/uploadedProof,
    // which would silently discard a resident's in-progress resubmission every 10s poll tick.
    const { component, maintenanceServiceStub } = setup([makeCharge({ status: 'Pending' })]);
    component.selectedChargeIds.set(['charge-1']);
    component.uploadedProof.set({ fileName: 'receipt.png', fileUrl: 'https://proofs.example.com/receipt.png' });

    maintenanceServiceStub.getApartmentHistory.and.returnValue(of({
      items: [makeCharge({ status: 'Pending' })], total: 1, page: 1, pageSize: 100,
    }));
    component.refreshCharges(true);

    expect(component.selectedChargeIds()).toEqual(['charge-1']);
    expect(component.uploadedProof()).toEqual({ fileName: 'receipt.png', fileUrl: 'https://proofs.example.com/receipt.png' });
  });

  it('an explicit (manual) refresh clears the selection and uploaded proof', () => {
    const { component } = setup([makeCharge({ status: 'Pending' })]);
    component.selectedChargeIds.set(['charge-1']);
    component.uploadedProof.set({ fileName: 'receipt.png', fileUrl: 'https://proofs.example.com/receipt.png' });

    component.refreshCharges(false);

    expect(component.selectedChargeIds()).toEqual([]);
    expect(component.uploadedProof()).toBeNull();
  });

  it('submitting proof calls submitProof with the selected charge ids and uploaded proof url', () => {
    const { component, maintenanceServiceStub } = setup([makeCharge({ status: 'Pending' })]);
    component.selectedChargeIds.set(['charge-1']);
    component.uploadedProof.set({ fileName: 'receipt.png', fileUrl: 'https://proofs.example.com/receipt.png' });

    component.submitProof();

    expect(maintenanceServiceStub.submitProof).toHaveBeenCalledWith('soc-1', jasmine.objectContaining({
      chargeIds: ['charge-1'],
      proofUrl: 'https://proofs.example.com/receipt.png',
    }));
  });

  it('a resubmitted charge (Rejected → ProofSubmitted) drops out of the selectable set once resubmitted', () => {
    const resubmitted = makeCharge({ id: 'charge-resubmitted', status: 'ProofSubmitted', rejectionReason: null });
    const { component } = setup([resubmitted]);

    expect(component.isSelectableCharge(resubmitted)).toBeFalse();
    expect(component.selectableCharges().map(c => c.id)).not.toContain('charge-resubmitted');
  });
});
