import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AgmSessionFormComponent } from './agm-session-form.component';
import { AgmSessionService } from '../../core/services/agm-session.service';
import { AuthService } from '../../core/services/auth.service';
import { AgmSessionSummary } from '../../core/models/poll.model';

describe('AgmSessionFormComponent', () => {
  function setup() {
    const created: AgmSessionSummary = { id: 'new-session', title: 'AGM 2026', sessionDate: '2026-04-15T10:00:00Z', resolutionCount: 0 };
    const agmSessionServiceStub = { create: jasmine.createSpy().and.returnValue(of(created)) };
    const authServiceStub = { societyId: () => 'soc-1' };

    TestBed.configureTestingModule({
      imports: [AgmSessionFormComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AgmSessionService, useValue: agmSessionServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(AgmSessionFormComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    return { component: fixture.componentInstance, agmSessionServiceStub, router };
  }

  it('does not submit when the title is missing', () => {
    const { component, agmSessionServiceStub } = setup();
    component.form.patchValue({ sessionDate: '2026-04-15T10:00' });

    component.submit();

    expect(agmSessionServiceStub.create).not.toHaveBeenCalled();
  });

  it('creates a session and navigates to its detail page', () => {
    const { component, agmSessionServiceStub, router } = setup();
    component.form.patchValue({ title: 'AGM 2026', description: 'Yearly resolutions', sessionDate: '2026-04-15T10:00' });

    component.submit();

    expect(agmSessionServiceStub.create).toHaveBeenCalledWith('soc-1', jasmine.objectContaining({ title: 'AGM 2026' }));
    expect(router.navigate).toHaveBeenCalledWith(['/agm-sessions', 'new-session']);
  });
});
