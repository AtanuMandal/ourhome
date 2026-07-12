import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoticeDetailComponent } from './notice-detail.component';
import { NoticeService } from '../../core/services/notice.service';
import { PollService } from '../../core/services/poll.service';
import { AuthService } from '../../core/services/auth.service';
import { Notice, NoticeReadReceipts } from '../../core/models/notice.model';
import { PollSummary } from '../../core/models/poll.model';

describe('NoticeDetailComponent', () => {
  function makeNotice(overrides: Partial<Notice> = {}): Notice {
    return {
      id: 'n1', societyId: 'soc-1', title: 'AGM Announcement', content: 'Please review the resolutions.',
      category: 'General', postedByUserId: 'admin-1', isArchived: false, isActive: true,
      publishAt: '2026-01-01T00:00:00Z', targetApartmentIds: [], createdAt: '2026-01-01T00:00:00Z',
      isReadByCurrentUser: true,
      ...overrides,
    } as Notice;
  }

  function makeReceipts(): NoticeReadReceipts {
    return {
      read: [{ userId: 'u1', fullName: 'Alice Resident' }],
      unread: [{ userId: 'u2', fullName: 'Bob Resident' }],
    };
  }

  function setup(linkedPolls: PollSummary[], isAdmin = false, receipts: NoticeReadReceipts = makeReceipts()) {
    const noticeServiceStub = {
      get: jasmine.createSpy().and.returnValue(of(makeNotice())),
      markRead: jasmine.createSpy().and.returnValue(of(undefined)),
      getReadReceipts: jasmine.createSpy().and.returnValue(of(receipts)),
    };
    const pollServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: linkedPolls, total: linkedPolls.length, page: 1, pageSize: 1 })),
    };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => isAdmin };

    TestBed.configureTestingModule({
      imports: [NoticeDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: NoticeService, useValue: noticeServiceStub },
        { provide: PollService, useValue: pollServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'n1' }) } } },
      ],
    });

    const fixture = TestBed.createComponent(NoticeDetailComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, pollServiceStub, noticeServiceStub, fixture };
  }

  it('queries for a poll linked to this notice', () => {
    const { pollServiceStub } = setup([]);
    expect(pollServiceStub.list).toHaveBeenCalledWith('soc-1', 1, 1, 'n1');
  });

  it('shows a linked-poll banner when a poll references this notice', () => {
    const { component, fixture } = setup([
      { id: 'poll-1', title: 'AGM Resolution Vote', type: 'SingleChoice', opensAt: '2026-01-01T00:00:00Z', closesAt: '2026-01-10T00:00:00Z', status: 'Open', isAgmResolution: true, resultsPublished: false },
    ]);

    expect(component.linkedPoll()?.id).toBe('poll-1');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('AGM Resolution Vote');
  });

  it('shows no banner when no poll is linked to this notice', () => {
    const { component, fixture } = setup([]);

    expect(component.linkedPoll()).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('associated poll');
  });

  it('shows an edit button for an admin', () => {
    const { fixture } = setup([], true);
    const editLink = (fixture.nativeElement as HTMLElement).querySelector('[aria-label="Edit notice"]');
    expect(editLink).toBeTruthy();
  });

  it('hides the edit button for a non-admin', () => {
    const { fixture } = setup([], false);
    const editLink = (fixture.nativeElement as HTMLElement).querySelector('[aria-label="Edit notice"]');
    expect(editLink).toBeFalsy();
  });

  it('hides the read-report button for a non-admin', () => {
    const { fixture } = setup([], false);
    const reportBtn = (fixture.nativeElement as HTMLElement).querySelector('[aria-label="Read report"]');
    expect(reportBtn).toBeFalsy();
  });

  it('fetches and displays the read report when toggled by an admin', () => {
    const { component, noticeServiceStub, fixture } = setup([], true);

    expect(noticeServiceStub.getReadReceipts).not.toHaveBeenCalled();

    component.toggleReadReceipts();
    fixture.detectChanges();

    expect(noticeServiceStub.getReadReceipts).toHaveBeenCalledWith('soc-1', 'n1');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Alice Resident');
    expect(text).toContain('Bob Resident');
  });

  it('does not refetch read receipts on a second toggle', () => {
    const { component, noticeServiceStub } = setup([], true);

    component.toggleReadReceipts();
    component.toggleReadReceipts();
    component.toggleReadReceipts();

    expect(noticeServiceStub.getReadReceipts).toHaveBeenCalledTimes(1);
  });
});
