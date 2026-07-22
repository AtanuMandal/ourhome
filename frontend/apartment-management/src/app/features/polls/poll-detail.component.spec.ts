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
      id: 'p1', tt: 'Repaint the gate?', ds: 'desc',
      ty: 'SingleChoice', op: [{ id: 'o1', tx: 'Yes' }, { id: 'o2', tx: 'No' }],
      oa: '2026-01-01T00:00:00Z', ca: '2026-01-10T00:00:00Z',
      ta: 'FullSociety', tbn: [],
      agm: false, avc: true, st: 'Open',
      rp: false,
      hv: false,
      ...overrides,
    };
  }

  function setup(poll: Poll, role: string, serviceOverrides: Partial<Record<string, unknown>> = {}) {
    const pollServiceStub = {
      get: jasmine.createSpy().and.returnValue(of(poll)),
      vote: jasmine.createSpy().and.returnValue(of({ pollId: poll.id, selectedOptionIds: ['o1'], votedAt: '2026-01-01T00:00:00Z' })),
      close: jasmine.createSpy().and.returnValue(of({ ...poll, st: 'Closed' })),
      publishResults: jasmine.createSpy().and.returnValue(of({ ...poll, rp: true })),
      ...serviceOverrides,
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => role === 'SUAdmin',
      user: () => ({ rl: role }),
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
    expect(component.poll()?.tt).toBe('Repaint the gate?');
  });

  it('allows a resident to vote on an open poll', () => {
    const { component } = setup(makePoll(), 'SUUser');
    expect(component.canVote()).toBeTrue();
  });

  it('does not allow voting once the poll is closed', () => {
    const { component } = setup(makePoll({ st: 'Closed' }), 'SUUser');
    expect(component.canVote()).toBeFalse();
  });

  it('submits a single-choice vote with the selected option', () => {
    const { component, pollServiceStub } = setup(makePoll(), 'SUUser');
    component.singleSelection.set('o1');

    component.submitVote();

    expect(pollServiceStub.vote).toHaveBeenCalledWith('soc-1', 'p1', { selectedOptionIds: ['o1'] });
  });

  it('submits a multiple-choice vote with all toggled options', () => {
    const poll = makePoll({ ty: 'MultipleChoice' });
    const { component, pollServiceStub } = setup(poll, 'SUUser');

    component.toggleOption('o1');
    component.toggleOption('o2');
    component.submitVote();

    expect(pollServiceStub.vote).toHaveBeenCalledWith('soc-1', 'p1', { selectedOptionIds: jasmine.arrayContaining(['o1', 'o2']) });
  });

  it('shows the read-only vote label when the resident already voted and cannot change it', () => {
    const poll = makePoll({ hv: true, avc: false, mso: ['o1'] });
    const { component } = setup(poll, 'SUUser');
    expect(component.myVoteLabels()).toBe('Yes');
  });

  it('SUAdmin can close an open poll', () => {
    const { component, pollServiceStub } = setup(makePoll(), 'SUAdmin');

    component.closePoll();

    expect(pollServiceStub.close).toHaveBeenCalledWith('soc-1', 'p1');
    expect(component.poll()?.st).toBe('Closed');
  });

  it('SUAdmin can publish results for a closed, unpublished poll', () => {
    const { component, pollServiceStub } = setup(makePoll({ st: 'Closed', rp: false }), 'SUAdmin');

    component.publishResults();

    expect(pollServiceStub.publishResults).toHaveBeenCalledWith('soc-1', 'p1');
    expect(component.poll()?.rp).toBeTrue();
  });

  it('does not permit voting for SUSecurity', () => {
    const { component } = setup(makePoll(), 'SUSecurity');
    expect(component.canVote()).toBeFalse();
  });

  it('labels a FullSociety poll target audience', () => {
    const { component } = setup(makePoll({ ta: 'FullSociety', tbn: [] }), 'SUUser');
    expect(component.targetAudienceLabel(component.poll()!)).toBe('Full Society');
  });

  it('labels a PerBlock poll target audience with the block name', () => {
    const { component } = setup(makePoll({ ta: 'PerBlock', tbn: ['BLOCK A'] }), 'SUUser');
    expect(component.targetAudienceLabel(component.poll()!)).toBe('Block: BLOCK A');
  });

  it('labels a MultipleBlock poll target audience with all block names', () => {
    const { component } = setup(makePoll({ ta: 'MultipleBlock', tbn: ['BLOCK A', 'BLOCK B'] }), 'SUUser');
    expect(component.targetAudienceLabel(component.poll()!)).toBe('Blocks: BLOCK A, BLOCK B');
  });
});
