import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { ProviderListComponent } from './provider-list.component';
import { ServiceProviderService } from '../../core/services/service-provider.service';
import { AuthService } from '../../core/services/auth.service';

describe('ProviderListComponent', () => {
  it('requests a large page size so societies with more than 20 providers are not silently truncated', () => {
    const serviceProviderStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], totalCount: 0, page: 1, pageSize: 500 })),
    };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => false };

    TestBed.configureTestingModule({
      imports: [ProviderListComponent],
      providers: [
        provideRouter([]),
        { provide: ServiceProviderService, useValue: serviceProviderStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });
    TestBed.createComponent(ProviderListComponent).detectChanges();

    expect(serviceProviderStub.list).toHaveBeenCalledWith('soc-1', 1, 500);
  });
});
