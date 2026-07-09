import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoticeListComponent } from './notice-list.component';
import { NoticeService } from '../../core/services/notice.service';
import { AuthService } from '../../core/services/auth.service';

describe('NoticeListComponent', () => {
  it('requests a large page size so societies with more than 20 notices are not silently truncated', () => {
    const noticeServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], totalCount: 0, page: 1, pageSize: 500 })),
    };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => false };

    TestBed.configureTestingModule({
      imports: [NoticeListComponent],
      providers: [
        provideRouter([]),
        { provide: NoticeService, useValue: noticeServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });
    TestBed.createComponent(NoticeListComponent).detectChanges();

    expect(noticeServiceStub.list).toHaveBeenCalledWith('soc-1', 1, 500);
  });
});
