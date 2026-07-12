import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoticeListComponent } from './notice-list.component';
import { NoticeService } from '../../core/services/notice.service';
import { AuthService } from '../../core/services/auth.service';
import { Notice } from '../../core/models/notice.model';

describe('NoticeListComponent', () => {
  function makeNotice(overrides: Partial<Notice> = {}): Notice {
    return {
      id: 'n1', societyId: 'soc-1', title: 'AGM Announcement', content: 'Please review the resolutions.',
      category: 'General', postedByUserId: 'admin-1', isArchived: false, isActive: true,
      publishAt: '2026-01-01T00:00:00Z', targetApartmentIds: [], createdAt: '2026-01-01T00:00:00Z',
      isReadByCurrentUser: false,
      ...overrides,
    } as Notice;
  }

  function setup(items: Notice[]) {
    const noticeServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items, totalCount: items.length, page: 1, pageSize: 500 })),
      markRead: jasmine.createSpy().and.returnValue(of(true)),
    };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => false };

    TestBed.configureTestingModule({
      imports: [NoticeListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: NoticeService, useValue: noticeServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(NoticeListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, noticeServiceStub, fixture };
  }

  it('requests a large page size so societies with more than 20 notices are not silently truncated', () => {
    const { noticeServiceStub } = setup([]);
    expect(noticeServiceStub.list).toHaveBeenCalledWith('soc-1', 1, 500);
  });

  it('shows a green read tick and no mark-read button for a read notice', () => {
    const { fixture } = setup([makeNotice({ isReadByCurrentUser: true })]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.nc-read-tick')).toBeTruthy();
    expect(el.querySelector('.nc-read-toggle')).toBeFalsy();
  });

  it('shows a mark-read button (no unmark option) for an unread notice', () => {
    const { fixture } = setup([makeNotice({ isReadByCurrentUser: false })]);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.nc-read-toggle')).toBeTruthy();
    expect(el.querySelector('.nc-read-tick')).toBeFalsy();
  });

  it('marks a notice read and swaps in the green tick, with no way to undo it', () => {
    const { component, noticeServiceStub, fixture } = setup([makeNotice({ isReadByCurrentUser: false })]);

    component.markRead(component.items()[0], new MouseEvent('click'));
    fixture.detectChanges();

    expect(noticeServiceStub.markRead).toHaveBeenCalledWith('soc-1', 'n1');
    expect(component.items()[0].isReadByCurrentUser).toBeTrue();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.nc-read-tick')).toBeTruthy();
    expect(el.querySelector('.nc-read-toggle')).toBeFalsy();
  });
});
