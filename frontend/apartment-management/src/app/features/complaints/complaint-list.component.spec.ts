import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { ComplaintListComponent } from './complaint-list.component';
import { ComplaintService } from '../../core/services/complaint.service';
import { AuthService } from '../../core/services/auth.service';

describe('ComplaintListComponent', () => {
  it('requests a large page size so societies with more than 20 complaints are not silently truncated', () => {
    const complaintServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], totalCount: 0, page: 1, pageSize: 500 })),
    };
    const authServiceStub = { societyId: () => 'soc-1' };

    TestBed.configureTestingModule({
      imports: [ComplaintListComponent],
      providers: [
        provideRouter([]),
        { provide: ComplaintService, useValue: complaintServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });
    TestBed.createComponent(ComplaintListComponent).detectChanges();

    expect(complaintServiceStub.list).toHaveBeenCalledWith('soc-1', 1, 500);
  });
});
