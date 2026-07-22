import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PollFormComponent } from './poll-form.component';
import { PollService } from '../../core/services/poll.service';
import { AgmSessionService } from '../../core/services/agm-session.service';
import { ApartmentService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { Poll } from '../../core/models/poll.model';

describe('PollFormComponent', () => {
  function makePoll(): Poll {
    return {
      id: 'p1', tt: 'Repaint the gate?', ds: 'desc',
      ty: 'SingleChoice', op: [{ id: 'o1', tx: 'Yes' }, { id: 'o2', tx: 'No' }],
      oa: '2026-01-01T00:00:00Z', ca: '2026-01-10T00:00:00Z',
      ta: 'FullSociety', tbn: [],
      agm: false, avc: true, st: 'Scheduled',
      rp: false,
      hv: false,
    };
  }

  function setup(queryParams: Record<string, string> = {}) {
    const pollServiceStub = { create: jasmine.createSpy().and.returnValue(of(makePoll())) };
    const agmSessionServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({
        items: [{ id: 'agm-1', tt: 'AGM 2026', sd: '2026-04-15T10:00:00Z', rc: 1 }],
        total: 1, page: 1, pageSize: 100,
      })),
    };
    const apartmentServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({
        items: [
          { blk: 'Block A' }, { blk: 'Block B' }, { blk: 'Block A' },
        ],
        total: 3, page: 1, pageSize: 500,
      })),
    };
    const authServiceStub = { societyId: () => 'soc-1' };

    TestBed.configureTestingModule({
      imports: [PollFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: PollService, useValue: pollServiceStub },
        { provide: AgmSessionService, useValue: agmSessionServiceStub },
        { provide: ApartmentService, useValue: apartmentServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ],
    });

    const fixture = TestBed.createComponent(PollFormComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    return { component: fixture.componentInstance, pollServiceStub, agmSessionServiceStub, apartmentServiceStub, router };
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
    expect(component.agmSessions()).toEqual([{ id: 'agm-1', tt: 'AGM 2026', sd: '2026-04-15T10:00:00Z', rc: 1 }]);
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

  it('loads distinct sorted block names for the picker on init', () => {
    const { component, apartmentServiceStub } = setup();

    expect(apartmentServiceStub.list).toHaveBeenCalledWith('soc-1', 1, 500);
    expect(component.blockOptions()).toEqual(['Block A', 'Block B']);
  });

  it('defaults to FullSociety with no target-block error', () => {
    const { component } = setup();
    expect(component.form.controls.targetAudience.value).toBe('FullSociety');
    expect(component.targetBlockError()).toBeNull();
  });

  it('requires exactly one block for PerBlock target audience', () => {
    const { component } = setup();
    component.form.patchValue({ targetAudience: 'PerBlock', targetBlockNames: [] });
    expect(component.targetBlockError()).toContain('exactly one block');

    component.form.patchValue({ targetBlockNames: ['Block A'] });
    expect(component.targetBlockError()).toBeNull();

    component.form.patchValue({ targetBlockNames: ['Block A', 'Block B'] });
    expect(component.targetBlockError()).toContain('exactly one block');
  });

  it('requires at least one block for MultipleBlock target audience', () => {
    const { component } = setup();
    component.form.patchValue({ targetAudience: 'MultipleBlock', targetBlockNames: [] });
    expect(component.targetBlockError()).toContain('at least one block');

    component.form.patchValue({ targetBlockNames: ['Block A', 'Block B'] });
    expect(component.targetBlockError()).toBeNull();
  });

  it('does not submit when the target-block selection is invalid', () => {
    const { component, pollServiceStub } = setup();
    component.form.patchValue({
      title: 'Repaint the gate?',
      opensAt: '2026-01-01T00:00',
      closesAt: '2026-01-10T00:00',
      targetAudience: 'PerBlock',
      targetBlockNames: [],
    });

    component.submit();

    expect(pollServiceStub.create).not.toHaveBeenCalled();
  });

  it('submits the selected target audience and block names', () => {
    const { component, pollServiceStub } = setup();
    component.form.patchValue({
      title: 'Repaint the gate?',
      opensAt: '2026-01-01T00:00',
      closesAt: '2026-01-10T00:00',
      targetAudience: 'MultipleBlock',
      targetBlockNames: ['Block A', 'Block B'],
    });

    component.submit();

    expect(pollServiceStub.create).toHaveBeenCalledWith('soc-1', jasmine.objectContaining({
      targetAudience: 'MultipleBlock',
      targetBlockNames: ['Block A', 'Block B'],
    }));
  });

  it('omits target block names when submitting a FullSociety poll', () => {
    const { component, pollServiceStub } = setup();
    component.form.patchValue({
      title: 'Repaint the gate?',
      opensAt: '2026-01-01T00:00',
      closesAt: '2026-01-10T00:00',
    });

    component.submit();

    expect(pollServiceStub.create).toHaveBeenCalledWith('soc-1', jasmine.objectContaining({
      targetAudience: 'FullSociety',
      targetBlockNames: undefined,
    }));
  });
});
