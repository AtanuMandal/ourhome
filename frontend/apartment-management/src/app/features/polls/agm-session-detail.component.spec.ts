import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AgmSessionDetailComponent } from './agm-session-detail.component';
import { AgmSessionService } from '../../core/services/agm-session.service';
import { PollService } from '../../core/services/poll.service';
import { AuthService } from '../../core/services/auth.service';
import { AgmSessionDetail, Poll } from '../../core/models/poll.model';

describe('AgmSessionDetailComponent', () => {
  function makeResolution(overrides: Partial<Poll>): Poll {
    return {
      id: overrides.id ?? 'r1',
      tt: 'Resolution 1',
      ds: 'desc',
      ty: 'SingleChoice',
      op: [{ id: 'o1', tx: 'Yes' }, { id: 'o2', tx: 'No' }],
      oa: '2026-01-01T00:00:00Z',
      ca: '2026-01-10T00:00:00Z',
      ta: 'FullSociety',
      tbn: [],
      agm: true,
      avc: true,
      st: 'Open',
      rp: false,
      hv: false,
      ...overrides,
    };
  }

  function makeSession(resolutions: Poll[]): AgmSessionDetail {
    return {
      id: 's1', tt: 'AGM 2026', ds: 'Yearly resolutions',
      sd: '2026-04-15T10:00:00Z',
      r: resolutions,
    };
  }

  function setup(session: AgmSessionDetail, role: string, serviceOverrides: Partial<Record<string, unknown>> = {}) {
    const agmSessionServiceStub = { get: jasmine.createSpy().and.returnValue(of(session)) };
    const pollServiceStub = {
      vote: jasmine.createSpy().and.returnValue(of({ pollId: 'r1', selectedOptionIds: ['o1'], votedAt: '2026-01-01T00:00:00Z' })),
      close: jasmine.createSpy().and.returnValue(of({})),
      publishResults: jasmine.createSpy().and.returnValue(of({})),
      ...serviceOverrides,
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => role === 'SUAdmin',
      user: () => ({ rl: role }),
    };

    TestBed.configureTestingModule({
      imports: [AgmSessionDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: AgmSessionService, useValue: agmSessionServiceStub },
        { provide: PollService, useValue: pollServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 's1' }) } } },
      ],
    });

    const fixture = TestBed.createComponent(AgmSessionDetailComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, pollServiceStub, fixture };
  }

  it('loads the session and its resolutions', () => {
    const { component } = setup(makeSession([makeResolution({ id: 'r1' })]), 'SUUser');

    expect(component.session()?.r.length).toBe(1);
  });

  it('allows a resident to vote on an open resolution', () => {
    const { component, pollServiceStub } = setup(makeSession([makeResolution({ id: 'r1' })]), 'SUUser');

    component.setSingleSelection('r1', 'o1');
    component.submitVote(component.session()!.r[0]);

    expect(pollServiceStub.vote).toHaveBeenCalledWith('soc-1', 'r1', { selectedOptionIds: ['o1'] });
  });

  it('tracks selections independently per resolution', () => {
    const { component } = setup(
      makeSession([makeResolution({ id: 'r1' }), makeResolution({ id: 'r2', tt: 'Resolution 2' })]),
      'SUUser',
    );

    component.setSingleSelection('r1', 'o1');
    component.setSingleSelection('r2', 'o2');

    expect(component.singleSelection('r1')).toBe('o1');
    expect(component.singleSelection('r2')).toBe('o2');
  });

  it('SUAdmin can close a resolution early', () => {
    const { component, pollServiceStub } = setup(makeSession([makeResolution({ id: 'r1' })]), 'SUAdmin');

    component.closeResolution(component.session()!.r[0]);

    expect(pollServiceStub.close).toHaveBeenCalledWith('soc-1', 'r1');
  });

  it('SUAdmin can publish results for a closed, unpublished resolution', () => {
    const { component, pollServiceStub } = setup(
      makeSession([makeResolution({ id: 'r1', st: 'Closed', rp: false })]),
      'SUAdmin',
    );

    component.publishResolution(component.session()!.r[0]);

    expect(pollServiceStub.publishResults).toHaveBeenCalledWith('soc-1', 'r1');
  });

  it('labels a block-targeted resolution', () => {
    const { component } = setup(
      makeSession([makeResolution({ id: 'r1', ta: 'PerBlock', tbn: ['BLOCK A'] })]),
      'SUUser',
    );

    expect(component.targetAudienceLabel(component.session()!.r[0])).toBe('Block: BLOCK A');
  });
});
