import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PollListComponent } from './poll-list.component';
import { PollService } from '../../core/services/poll.service';
import { AuthService } from '../../core/services/auth.service';
import { PollSummary } from '../../core/models/poll.model';

describe('PollListComponent', () => {
  function summary(overrides: Partial<PollSummary>): PollSummary {
    return {
      id: overrides.id ?? 'p1',
      title: overrides.title ?? 'Repaint the gate?',
      type: overrides.type ?? 'SingleChoice',
      opensAt: '2026-01-01T00:00:00Z',
      closesAt: '2026-01-10T00:00:00Z',
      status: overrides.status ?? 'Open',
      isAgmResolution: overrides.isAgmResolution ?? false,
      resultsPublished: overrides.resultsPublished ?? false,
      ...overrides,
    };
  }

  function setup(polls: PollSummary[], isAdmin = false) {
    const pollServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: polls, total: polls.length, page: 1, pageSize: 50 })),
    };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => isAdmin };

    TestBed.configureTestingModule({
      imports: [PollListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: PollService, useValue: pollServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(PollListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, pollServiceStub, fixture };
  }

  it('loads polls on init', () => {
    const { component, pollServiceStub } = setup([summary({ id: '1' }), summary({ id: '2', status: 'Closed' })]);

    expect(pollServiceStub.list).toHaveBeenCalledWith('soc-1', 1, 50);
    expect(component.items().length).toBe(2);
  });

  it('shows the New Poll action for SUAdmin', () => {
    const { fixture } = setup([summary({ id: '1' })], true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('New Poll');
  });

  it('does not show the New Poll action for non-admins', () => {
    const { fixture } = setup([summary({ id: '1' })], false);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('New Poll');
  });
});
