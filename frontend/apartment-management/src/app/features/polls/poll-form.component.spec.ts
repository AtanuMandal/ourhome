import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PollFormComponent } from './poll-form.component';
import { PollService } from '../../core/services/poll.service';
import { AgmSessionService } from '../../core/services/agm-session.service';
import { AuthService } from '../../core/services/auth.service';
import { Poll } from '../../core/models/poll.model';

describe('PollFormComponent', () => {
  function makePoll(): Poll {
    return {
      id: 'p1', societyId: 'soc-1', title: 'Repaint the gate?', description: 'desc',
      type: 'SingleChoice', options: [{ id: 'o1', text: 'Yes' }, { id: 'o2', text: 'No' }],
      opensAt: '2026-01-01T00:00:00Z', closesAt: '2026-01-10T00:00:00Z',
      eligibilityUnit: 'PerResident', anonymity: 'Anonymous', visibility: 'Immediately',
      isAgmResolution: false, allowVoteChange: true, status: 'Scheduled',
      resultsPublished: false, createdByUserId: 'admin-1', createdAt: '2026-01-01T00:00:00Z',
      hasVoted: false,
    };
  }

  function setup(queryParams: Record<string, string> = {}) {
    const pollServiceStub = { create: jasmine.createSpy().and.returnValue(of(makePoll())) };
    const agmSessionServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({
        items: [{ id: 'agm-1', title: 'AGM 2026', sessionDate: '2026-04-15T10:00:00Z', resolutionCount: 1 }],
        total: 1, page: 1, pageSize: 100,
      })),
    };
    const authServiceStub = { societyId: () => 'soc-1' };

    TestBed.configureTestingModule({
      imports: [PollFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: PollService, useValue: pollServiceStub },
        { provide: AgmSessionService, useValue: agmSessionServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ],
    });

    const fixture = TestBed.createComponent(PollFormComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    return { component: fixture.componentInstance, pollServiceStub, agmSessionServiceStub, router };
  }

  it('reports an option-count error when fewer than 2 options are entered', () => {
    const { component } = setup();
    component.form.controls.optionsText.setValue('Only one option');
    expect(component.optionCountError()).toContain('At least 2 options');
  });

  it('has no option-count error with the default Yes/No options', () => {
    const { component } = setup();
    expect(component.optionCountError()).toBeNull();
  });

  it('submits a poll with parsed options and ISO date strings', () => {
    const { component, pollServiceStub, router } = setup();
    component.form.patchValue({
      title: 'Repaint the gate?',
      opensAt: '2026-01-01T00:00',
      closesAt: '2026-01-10T00:00',
    });

    component.submit();

    expect(pollServiceStub.create).toHaveBeenCalledWith('soc-1', jasmine.objectContaining({
      title: 'Repaint the gate?',
      options: ['Yes', 'No'],
    }));
    expect(router.navigate).toHaveBeenCalledWith(['/polls']);
  });

  it('does not submit when closesAt is before opensAt', () => {
    const { component, pollServiceStub } = setup();
    component.form.patchValue({
      title: 'Bad dates',
      opensAt: '2026-01-10T00:00',
      closesAt: '2026-01-01T00:00',
    });

    expect(component.form.invalid).toBeTrue();
    component.submit();

    expect(pollServiceStub.create).not.toHaveBeenCalled();
  });

  it('loads AGM sessions for the picker on init', () => {
    const { component, agmSessionServiceStub } = setup();

    expect(agmSessionServiceStub.list).toHaveBeenCalledWith('soc-1', 1, 100);
    expect(component.agmSessions()).toEqual([{ id: 'agm-1', title: 'AGM 2026', sessionDate: '2026-04-15T10:00:00Z', resolutionCount: 1 }]);
  });

  it('pre-fills the AGM session from a query param and marks the poll as an AGM resolution', () => {
    const { component } = setup({ agmSessionId: 'agm-1' });

    expect(component.form.controls.agmSessionId.value).toBe('agm-1');
    expect(component.form.controls.isAgmResolution.value).toBeTrue();
  });

  it('submits the selected AGM session id and navigates back to the session detail page', () => {
    const { component, pollServiceStub, router } = setup({ agmSessionId: 'agm-1' });
    component.form.patchValue({
      title: 'Repaint the gate?',
      opensAt: '2026-01-01T00:00',
      closesAt: '2026-01-10T00:00',
    });

    component.submit();

    expect(pollServiceStub.create).toHaveBeenCalledWith('soc-1', jasmine.objectContaining({ agmSessionId: 'agm-1' }));
    expect(router.navigate).toHaveBeenCalledWith(['/agm-sessions', 'agm-1']);
  });
});
