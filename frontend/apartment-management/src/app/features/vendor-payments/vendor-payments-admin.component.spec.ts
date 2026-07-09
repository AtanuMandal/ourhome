import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { VendorPaymentsAdminComponent } from './vendor-payments-admin.component';
import { VendorPaymentService } from '../../core/services/vendor-payment.service';
import { AuthService } from '../../core/services/auth.service';

describe('VendorPaymentsAdminComponent', () => {
  function setup(serviceOverrides: Partial<Record<string, unknown>> = {}) {
    const vendorPaymentsStub = {
      listVendors: jasmine.createSpy().and.returnValue(of([])),
      listSchedules: jasmine.createSpy().and.returnValue(of([])),
      listCharges: jasmine.createSpy().and.returnValue(of([])),
      ...serviceOverrides,
    };
    const authServiceStub = { societyId: () => 'soc-1' };

    TestBed.configureTestingModule({
      imports: [VendorPaymentsAdminComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: VendorPaymentService, useValue: vendorPaymentsStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(VendorPaymentsAdminComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, vendorPaymentsStub, fixture };
  }

  it('loads vendors once on creation', () => {
    const { vendorPaymentsStub } = setup();
    expect(vendorPaymentsStub.listVendors).toHaveBeenCalledTimes(1);
  });

  it('debounces rapid search input into a single request instead of one per keystroke', fakeAsync(() => {
    const { component, vendorPaymentsStub } = setup();
    vendorPaymentsStub.listVendors.calls.reset();

    // Simulate typing "vendor" one character at a time.
    for (const partial of ['v', 've', 'ven', 'vend', 'vendo', 'vendor']) {
      component.vendorSearch = partial;
      component.onVendorSearchChange();
      tick(50); // less than the debounce window — no request should fire yet
    }

    expect(vendorPaymentsStub.listVendors).not.toHaveBeenCalled();

    tick(300); // debounce window elapses after the last keystroke

    expect(vendorPaymentsStub.listVendors).toHaveBeenCalledTimes(1);
    expect(vendorPaymentsStub.listVendors).toHaveBeenCalledWith('soc-1', 'vendor');
  }));

  it('does not fire a new search request while still within the debounce window', fakeAsync(() => {
    const { component, vendorPaymentsStub } = setup();
    vendorPaymentsStub.listVendors.calls.reset();

    component.vendorSearch = 'a';
    component.onVendorSearchChange();
    tick(100);
    component.vendorSearch = 'ab';
    component.onVendorSearchChange();
    tick(100);

    expect(vendorPaymentsStub.listVendors).not.toHaveBeenCalled();

    tick(300);
    expect(vendorPaymentsStub.listVendors).toHaveBeenCalledTimes(1);
  }));
});
