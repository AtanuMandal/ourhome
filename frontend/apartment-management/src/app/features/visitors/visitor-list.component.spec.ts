import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { VisitorListComponent } from './visitor-list.component';
import { VisitorService } from '../../core/services/visitor.service';
import { AuthService } from '../../core/services/auth.service';
import { Visitor } from '../../core/models/visitor.model';

describe('VisitorListComponent — approve/deny visibility', () => {
  function setup(role: string, apartmentId = '') {
    const visitorServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 100 })),
      defaultView: jasmine.createSpy().and.returnValue(of([])),
      approve: jasmine.createSpy(),
      deny: jasmine.createSpy(),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => role === 'SUAdmin' || role === 'HQAdmin',
      isSecurity: () => role === 'SUSecurity',
      canManageVisitors: () => role === 'SUAdmin' || role === 'SUSecurity',
      user: () => ({ rl: role, aid: apartmentId }),
    };
    const activatedRouteStub = {
      snapshot: { queryParamMap: convertToParamMap({}) },
    };

    TestBed.configureTestingModule({
      imports: [VisitorListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: VisitorService, useValue: visitorServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    });

    const fixture = TestBed.createComponent(VisitorListComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  const pendingVisitor = { id: 'v1', st: 'Pending', aid: 'apt-999' } as Visitor;

  it('SUAdmin can moderate (deny) a pending visitor but cannot approve it', () => {
    const component = setup('SUAdmin');
    expect(component.canModerate(pendingVisitor)).toBeTrue();
    expect(component.canApprove(pendingVisitor)).toBeFalse();
  });

  it('SUSecurity can moderate (deny) a pending visitor but cannot approve it either', () => {
    const component = setup('SUSecurity');
    expect(component.canModerate(pendingVisitor)).toBeTrue();
    expect(component.canApprove(pendingVisitor)).toBeFalse();
  });

  it('the host resident can approve their own visitor even though they are not an admin', () => {
    const component = setup('SUUser', 'apt-999');
    expect(component.canModerate(pendingVisitor)).toBeTrue();
    expect(component.canApprove(pendingVisitor)).toBeTrue();
  });

  it('a non-host, non-admin resident can neither approve nor deny', () => {
    const component = setup('SUUser', 'apt-111');
    expect(component.canModerate(pendingVisitor)).toBeFalse();
    expect(component.canApprove(pendingVisitor)).toBeFalse();
  });
});

describe('VisitorListComponent — pass verification doubles as check-in', () => {
  function setup(verifyResult: Partial<Visitor>) {
    const visitorServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 100 })),
      defaultView: jasmine.createSpy().and.returnValue(of([])),
      verify: jasmine.createSpy().and.returnValue(of(verifyResult as Visitor)),
      checkin: jasmine.createSpy().and.returnValue(
        of({ ...verifyResult, st: 'CheckedIn', vn: verifyResult.vn } as Visitor)),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => false,
      isSecurity: () => true,
      canManageVisitors: () => true,
      user: () => ({ rl: 'SUSecurity', aid: '' }),
    };
    const activatedRouteStub = { snapshot: { queryParamMap: convertToParamMap({}) } };

    TestBed.configureTestingModule({
      imports: [VisitorListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: VisitorService, useValue: visitorServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    });

    const fixture = TestBed.createComponent(VisitorListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, visitorServiceStub };
  }

  it('verifying an approved pass automatically checks the visitor in', () => {
    const { component, visitorServiceStub } = setup({ id: 'v1', st: 'Approved', vn: 'Jane', ipe: false });
    component.verifyForm.patchValue({ passCode: '123456' });

    component.verifyPass();

    expect(visitorServiceStub.checkin).toHaveBeenCalledWith('soc-1', '123456');
    expect(component.verifiedVisitor()?.st).toBe('CheckedIn');
    expect(component.successMessage()).toContain('checked in');
  });

  it('verifying an already checked-in pass shows the visitor without re-checking-in (exit flow)', () => {
    const { component, visitorServiceStub } = setup({ id: 'v1', st: 'CheckedIn', vn: 'Jane' });
    component.verifyForm.patchValue({ passCode: '123456' });

    component.verifyPass();

    expect(visitorServiceStub.checkin).not.toHaveBeenCalled();
    expect(component.verifiedVisitor()?.st).toBe('CheckedIn');
  });

  it('verifying an expired approved pass does not attempt check-in', () => {
    const { component, visitorServiceStub } = setup({ id: 'v1', st: 'Approved', vn: 'Jane', ipe: true });
    component.verifyForm.patchValue({ passCode: '123456' });

    component.verifyPass();

    expect(visitorServiceStub.checkin).not.toHaveBeenCalled();
    expect(component.verifiedVisitor()?.st).toBe('Approved');
  });
});

describe('VisitorListComponent — default pending + recent approved/denied view', () => {
  function makeVisitor(id: string, status: string, createdAt = '2026-01-01T00:00:00Z'): Visitor {
    return { id, st: status, aid: 'apt-1', vn: `Visitor ${id}`, ca: createdAt } as Visitor;
  }

  function setup() {
    // The backend computes the whole landing view in one call: pending + checked-in + recent.
    const defaultViewItems = [
      makeVisitor('p1', 'Pending'), makeVisitor('p2', 'Pending'),
      makeVisitor('c1', 'CheckedIn', '2026-01-04T00:00:00Z'),
      makeVisitor('a1', 'Approved', '2026-01-02T00:00:00Z'),
      makeVisitor('d1', 'Denied', '2026-01-03T00:00:00Z'),
    ];

    const visitorServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 100 })),
      defaultView: jasmine.createSpy().and.returnValue(of(defaultViewItems)),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => true,
      isSecurity: () => false,
      canManageVisitors: () => true,
      user: () => ({ rl: 'SUAdmin', aid: '' }),
    };
    const activatedRouteStub = { snapshot: { queryParamMap: convertToParamMap({}) } };

    TestBed.configureTestingModule({
      imports: [VisitorListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: VisitorService, useValue: visitorServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    });

    const fixture = TestBed.createComponent(VisitorListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, visitorServiceStub };
  }

  it('loads the whole default view with a single backend call — no per-status fan-out', () => {
    const { component, visitorServiceStub } = setup();

    expect(component.isDefaultFilterState()).toBeTrue();
    expect(visitorServiceStub.defaultView).toHaveBeenCalledTimes(1);
    expect(visitorServiceStub.defaultView).toHaveBeenCalledWith('soc-1', component.recordCount());
    expect(visitorServiceStub.list).not.toHaveBeenCalled();
    expect(component.items().map(v => v.id).sort()).toEqual(['a1', 'c1', 'd1', 'p1', 'p2'].sort());
  });

  it('passes the chosen record count through to the backend when it changes', () => {
    const { component, visitorServiceStub } = setup();
    visitorServiceStub.defaultView.calls.reset();

    component.onRecordCountChange(50);

    expect(visitorServiceStub.defaultView).toHaveBeenCalledWith('soc-1', 50);
    localStorage.removeItem('ourhome-visitor-list-record-count');
  });

  it('defaults the record count to 25 and persists a change to localStorage', () => {
    localStorage.removeItem('ourhome-visitor-list-record-count');
    const { component } = setup();

    expect(component.recordCount()).toBe(25);

    component.onRecordCountChange(50);

    expect(component.recordCount()).toBe(50);
    expect(localStorage.getItem('ourhome-visitor-list-record-count')).toBe('50');
    localStorage.removeItem('ourhome-visitor-list-record-count');
  });

  it('reads a previously-persisted record count preference on load', () => {
    localStorage.setItem('ourhome-visitor-list-record-count', '100');
    const { component } = setup();

    expect(component.recordCount()).toBe(100);
    localStorage.removeItem('ourhome-visitor-list-record-count');
  });

  it('falls back to the single filtered call once any filter is applied', () => {
    const { component, visitorServiceStub } = setup();
    visitorServiceStub.list.calls.reset();

    component.filtersForm.patchValue({ status: 'Denied' });
    component.loadVisitors();

    expect(component.isDefaultFilterState()).toBeFalse();
    expect(visitorServiceStub.list).toHaveBeenCalledTimes(1);
  });
});

describe('VisitorListComponent — silent background auto-refresh', () => {
  function makeVisitor(id: string, status: string): Visitor {
    return { id, st: status, aid: 'apt-1', vn: `Visitor ${id}`, ca: '2026-01-01T00:00:00Z' } as Visitor;
  }

  function setup() {
    const visitorServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 100 })),
      defaultView: jasmine.createSpy().and.returnValue(of([makeVisitor('v1', 'Pending')])),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => true,
      isSecurity: () => false,
      canManageVisitors: () => true,
      user: () => ({ rl: 'SUAdmin', aid: '' }),
    };
    const activatedRouteStub = { snapshot: { queryParamMap: convertToParamMap({}) } };

    TestBed.configureTestingModule({
      imports: [VisitorListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: VisitorService, useValue: visitorServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    });

    const fixture = TestBed.createComponent(VisitorListComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, visitorServiceStub };
  }

  function setupWithHangingRefetch() {
    // Resolves instantly for the initial ngOnInit load, then is swapped to a Subject that never
    // emits so the *next* call to loadVisitors() can be observed mid-flight.
    const { component, visitorServiceStub } = setup();

    const hanging$ = new Subject<Visitor[]>();
    visitorServiceStub.defaultView.and.returnValue(hanging$);

    return component;
  }

  it('a background refresh does not toggle the main loading flag, keeping existing rows visible', () => {
    const component = setupWithHangingRefetch();
    expect(component.items().length).toBeGreaterThan(0);

    component.loadVisitors(true);

    // Still mid-flight (the Subject hasn't emitted yet) — background flag set, main flag untouched.
    expect(component.loading()).toBeFalse();
    expect(component.backgroundRefreshing()).toBeTrue();
  });

  it('a manual (non-background) load still uses the full loading flag', () => {
    const component = setupWithHangingRefetch();

    component.loadVisitors(false);

    expect(component.loading()).toBeTrue();
    expect(component.backgroundRefreshing()).toBeFalse();
  });

  it('a background refresh returning identical data leaves the rendered list untouched (no flicker)', () => {
    const { component } = setup();
    const itemsBefore = component.items();

    component.loadVisitors(true);

    // Same payload — the signal is never written, so Angular re-renders nothing.
    expect(component.items()).toBe(itemsBefore);
    expect(component.recentlyUpdatedIds().size).toBe(0);
  });

  it('a background refresh highlights only the rows that changed, not the unchanged ones', () => {
    const { component, visitorServiceStub } = setup();

    // v1 is unchanged; v2 is a new arrival.
    visitorServiceStub.defaultView.and.returnValue(of([makeVisitor('v1', 'Pending'), makeVisitor('v2', 'Pending')]));
    component.loadVisitors(true);

    expect(component.items().length).toBe(2);
    expect(component.recentlyUpdatedIds().has('v1')).toBeFalse();
    expect(component.recentlyUpdatedIds().has('v2')).toBeTrue();
  });

  it('the ease-in highlight clears shortly after a background refresh applies changes', () => {
    const { component, visitorServiceStub } = setup();
    jasmine.clock().install();
    try {
      visitorServiceStub.defaultView.and.returnValue(of([makeVisitor('v1', 'CheckedIn')]));
      component.loadVisitors(true);
      expect(component.recentlyUpdatedIds().has('v1')).toBeTrue();

      jasmine.clock().tick(1600);
      expect(component.recentlyUpdatedIds().size).toBe(0);
    } finally {
      jasmine.clock().uninstall();
    }
  });
});

describe('VisitorListComponent — overstay warning', () => {
  function makeVisitor(id: string, isOverstay = false): Visitor {
    return { id, st: 'CheckedIn', aid: 'apt-1', vn: `Visitor ${id}`, ca: '2026-01-01T00:00:00Z', ov: isOverstay } as Visitor;
  }

  function setup(items: Visitor[]) {
    const visitorServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 100 })),
      defaultView: jasmine.createSpy().and.returnValue(of(items)),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => true,
      isSecurity: () => false,
      canManageVisitors: () => true,
      user: () => ({ rl: 'SUAdmin', aid: '' }),
    };
    const activatedRouteStub = { snapshot: { queryParamMap: convertToParamMap({}) } };

    TestBed.configureTestingModule({
      imports: [VisitorListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: VisitorService, useValue: visitorServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    });

    const fixture = TestBed.createComponent(VisitorListComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('counts zero overstaying visitors when none are flagged', () => {
    const component = setup([makeVisitor('v1'), makeVisitor('v2')]);
    expect(component.overstayCount()).toBe(0);
  });

  it('counts only the visitors flagged as overstaying — no auto-checkout involved', () => {
    const component = setup([makeVisitor('v1', true), makeVisitor('v2'), makeVisitor('v3', true)]);
    expect(component.overstayCount()).toBe(2);
  });
});

describe('VisitorListComponent — visitor photo zoom lightbox', () => {
  function setup() {
    const visitorServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 100 })),
      defaultView: jasmine.createSpy().and.returnValue(of([])),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => true,
      isSecurity: () => false,
      canManageVisitors: () => true,
      user: () => ({ rl: 'SUAdmin', aid: '' }),
    };
    const activatedRouteStub = { snapshot: { queryParamMap: convertToParamMap({}) } };

    TestBed.configureTestingModule({
      imports: [VisitorListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: VisitorService, useValue: visitorServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    });

    const fixture = TestBed.createComponent(VisitorListComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('has no lightbox open by default', () => {
    const component = setup();
    expect(component.lightboxSrc()).toBeNull();
  });

  it('opens the lightbox with the clicked visitor photo path', () => {
    const component = setup();
    component.lightboxSrc.set('files/visitor-images/soc-1/abc.jpg');
    expect(component.lightboxSrc()).toBe('files/visitor-images/soc-1/abc.jpg');
  });

  it('closes the lightbox by clearing the source', () => {
    const component = setup();
    component.lightboxSrc.set('files/visitor-images/soc-1/abc.jpg');
    component.lightboxSrc.set(null);
    expect(component.lightboxSrc()).toBeNull();
  });
});
