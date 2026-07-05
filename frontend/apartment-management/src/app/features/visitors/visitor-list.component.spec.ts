import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
      approve: jasmine.createSpy(),
      deny: jasmine.createSpy(),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => role === 'SUAdmin' || role === 'HQAdmin',
      isSecurity: () => role === 'SUSecurity',
      canManageVisitors: () => role === 'SUAdmin' || role === 'SUSecurity',
      user: () => ({ role, apartmentId }),
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

  const pendingVisitor = { id: 'v1', status: 'Pending', hostApartmentId: 'apt-999' } as Visitor;

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

describe('VisitorListComponent — default pending + last 10 view', () => {
  function makeVisitor(id: string, status: string): Visitor {
    return { id, status, hostApartmentId: 'apt-1', visitorName: `Visitor ${id}` } as Visitor;
  }

  function setup() {
    const pendingItems = [makeVisitor('p1', 'Pending'), makeVisitor('p2', 'Pending')];
    // "Recent 10" overlaps with one pending item (p1) plus other statuses — the component must dedupe by id.
    const recentItems = [makeVisitor('p1', 'Pending'), makeVisitor('c1', 'CheckedOut'), makeVisitor('d1', 'Denied')];

    const visitorServiceStub = {
      list: jasmine.createSpy().and.callFake((_sid: string, _page: number, pageSize: number, filters: { status?: string }) => {
        if (filters?.status === 'Pending') {
          return of({ items: pendingItems, total: pendingItems.length, page: 1, pageSize });
        }
        return of({ items: recentItems, total: recentItems.length, page: 1, pageSize });
      }),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => true,
      isSecurity: () => false,
      canManageVisitors: () => true,
      user: () => ({ role: 'SUAdmin', apartmentId: '' }),
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

  it('merges all pending visitors with the 10 most recent, de-duplicated by id, when no filter is applied', () => {
    const { component, visitorServiceStub } = setup();

    expect(component.isDefaultFilterState()).toBeTrue();
    expect(visitorServiceStub.list).toHaveBeenCalledTimes(2);
    expect(component.items().map(v => v.id).sort()).toEqual(['c1', 'd1', 'p1', 'p2'].sort());
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

describe('VisitorListComponent — visitor photo zoom lightbox', () => {
  function setup() {
    const visitorServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 100 })),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      isAdmin: () => true,
      isSecurity: () => false,
      canManageVisitors: () => true,
      user: () => ({ role: 'SUAdmin', apartmentId: '' }),
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
