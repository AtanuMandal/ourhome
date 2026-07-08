import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PollDetailComponent } from './poll-detail.component';
import { PollService } from '../../core/services/poll.service';
import { AuthService } from '../../core/services/auth.service';
import { Poll } from '../../core/models/poll.model';

describe('PollDetailComponent', () => {
  function makePoll(overrides: Partial<Poll> = {}): Poll {
    return {
      id: 'p1', societyId: 'soc-1', title: 'Repaint the gate?', description: 'desc',
      type: 'SingleChoice', options: [{ id: 'o1', text: 'Yes' }, { id: 'o2', text: 'No' }],
      opensAt: '2026-01-01T00:00:00Z', closesAt: '2026-01-10T00:00:00Z',
      eligibilityUnit: 'PerResident', anonymity: 'Anonymous', visibility: 'Immediately',
      isAgmResolution: false, allowVoteChange: true, status: 'Open',
      resultsPublished: false, createdByUserId: 'admin-1', createdAt: '2026-01-01T00:00:00Z',
      hasVoted: false,
      ...overrides,
    };
  }

  function setup(poll: Poll, role: string, serviceOverrides: Partial<Record<string, unknown>> = {}) {
    const pollServiceStub = {
      get: jasmine.createSpy().and.returnValue(of(poll)),
      vote: jasmine.createSpy().and.returnValue(of({ pollId: poll.id, selectedOptionIds: ['o1'], votedAt: '2026-01-01T00:00:00Z' })),
      close: jasmine.createSpy().and.returnValue(of({ ...poll, status: 'Closed' })),
      publishResults: jasmine.createSpy().and.returnValue(of({ ...poll, resultsPublished: true })),
      ...serviceOverrides,
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => role === 'SUAdmin',
      user: () => ({ role }),
    };

    TestBed.configureTestingModule({
      imports: [PollDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: PollService, useValue: pollServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: poll.id }) } } },
      ],
    });

    const fixture = TestBed.createComponent(PollDetailComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, pollServiceStub, fixture };
  }

  it('loads the poll on init', () => {
    const { component, pollServiceStub } = setup(makePoll(), 'SUUser');
    expect(pollServiceStub.get).toHaveBeenCalledWith('soc-1', 'p1');
    expect(component.poll()?.title).toBe('Repaint the gate?');
  });

  it('allows a resident to vote on an open poll', () => {
    const { component } = setup(makePoll(), 'SUUser');
    expect(component.canVote()).toBeTrue();
  });

  it('does not allow voting once the poll is closed', () => {
    const { component } = setup(makePoll({ status: 'Closed' }), 'SUUser');
    expect(component.canVote()).toBeFalse();
  });

  it('submits a single-choice vote with the selected option', () => {
    const { component, pollServiceStub } = setup(makePoll(), 'SUUser');
    component.singleSelection.set('o1');

    component.submitVote();

    expect(pollServiceStub.vote).toHaveBeenCalledWith('soc-1', 'p1', { selectedOptionIds: ['o1'] });
  });

  it('submits a multiple-choice vote with all toggled options', () => {
    const poll = makePoll({ type: 'MultipleChoice' });
    const { component, pollServiceStub } = setup(poll, 'SUUser');

    component.toggleOption('o1');
    component.toggleOption('o2');
    component.submitVote();

    expect(pollServiceStub.vote).toHaveBeenCalledWith('soc-1', 'p1', { selectedOptionIds: jasmine.arrayContaining(['o1', 'o2']) });
  });

  it('shows the read-only vote label when the resident already voted and cannot change it', () => {
    const poll = makePoll({ hasVoted: true, allowVoteChange: false, mySelectedOptionIds: ['o1'] });
    const { component } = setup(poll, 'SUUser');
    expect(component.myVoteLabels()).toBe('Yes');
  });

  it('SUAdmin can close an open poll', () => {
    const { component, pollServiceStub } = setup(makePoll(), 'SUAdmin');

    component.closePoll();

    expect(pollServiceStub.close).toHaveBeenCalledWith('soc-1', 'p1');
    expect(component.poll()?.status).toBe('Closed');
  });

  it('SUAdmin can publish results for a closed, unpublished poll', () => {
    const { component, pollServiceStub } = setup(makePoll({ status: 'Closed', resultsPublished: false }), 'SUAdmin');

    component.publishResults();

    expect(pollServiceStub.publishResults).toHaveBeenCalledWith('soc-1', 'p1');
    expect(component.poll()?.resultsPublished).toBeTrue();
  });

  it('does not permit voting for SUSecurity', () => {
    const { component } = setup(makePoll(), 'SUSecurity');
    expect(component.canVote()).toBeFalse();
  });
});
