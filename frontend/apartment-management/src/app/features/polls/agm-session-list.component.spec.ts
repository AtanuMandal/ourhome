import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AgmSessionListComponent } from './agm-session-list.component';
import { AgmSessionService } from '../../core/services/agm-session.service';
import { AuthService } from '../../core/services/auth.service';
import { AgmSessionSummary } from '../../core/models/poll.model';

describe('AgmSessionListComponent', () => {
  function summary(overrides: Partial<AgmSessionSummary>): AgmSessionSummary {
    return {
      id: overrides.id ?? 's1',
      title: overrides.title ?? 'AGM 2026',
      sessionDate: '2026-04-15T10:00:00Z',
      resolutionCount: overrides.resolutionCount ?? 3,
      ...overrides,
    };
  }

  function setup(sessions: AgmSessionSummary[], isAdmin = false) {
    const agmSessionServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: sessions, total: sessions.length, page: 1, pageSize: 50 })),
    };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => isAdmin };

    TestBed.configureTestingModule({
      imports: [AgmSessionListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AgmSessionService, useValue: agmSessionServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(AgmSessionListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, agmSessionServiceStub, fixture };
  }

  it('loads AGM sessions on init', () => {
    const { component, agmSessionServiceStub } = setup([summary({ id: '1' }), summary({ id: '2' })]);

    expect(agmSessionServiceStub.list).toHaveBeenCalledWith('soc-1', 1, 50);
    expect(component.items().length).toBe(2);
  });

  it('shows the New Session action for SUAdmin', () => {
    const { fixture } = setup([summary({ id: '1' })], true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('New Session');
  });

  it('does not show the New Session action for non-admins', () => {
    const { fixture } = setup([summary({ id: '1' })], false);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('New Session');
  });
});
