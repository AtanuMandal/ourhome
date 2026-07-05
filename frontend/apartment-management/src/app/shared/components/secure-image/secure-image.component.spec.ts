import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { SecureImageComponent } from './secure-image.component';
import { ApiService } from '../../../core/services/api.service';

describe('SecureImageComponent', () => {
  function setup(apiOverrides: Partial<Record<string, unknown>> = {}) {
    const apiServiceStub = {
      download: jasmine.createSpy().and.returnValue(
        of(new HttpResponse({ body: new Blob(['fake-image-bytes'], { type: 'image/jpeg' }) }))
      ),
      ...apiOverrides,
    };

    TestBed.configureTestingModule({
      imports: [SecureImageComponent],
      providers: [{ provide: ApiService, useValue: apiServiceStub }],
    });

    const fixture = TestBed.createComponent(SecureImageComponent);
    return { component: fixture.componentInstance, fixture, apiServiceStub };
  }

  it('fetches the app-relative path via the authenticated ApiService and exposes an object URL', () => {
    const { component, apiServiceStub } = setup();
    component.src = 'files/visitor-images/soc-1/abc.jpg';
    component.ngOnChanges();

    expect(apiServiceStub.download).toHaveBeenCalledWith('files/visitor-images/soc-1/abc.jpg');
    expect(component.loading()).toBeFalse();
    expect(component.objectUrl()).toMatch(/^blob:/);
  });

  it('falls back to the error state when the fetch fails', () => {
    const { component } = setup({
      download: jasmine.createSpy().and.returnValue(throwError(() => new Error('403'))),
    });
    component.src = 'files/maintenance-proofs/soc-1/x.jpg';
    component.ngOnChanges();

    expect(component.loading()).toBeFalse();
    expect(component.objectUrl()).toBeNull();
  });

  it('revokes the object URL on destroy to avoid leaking memory', () => {
    const { component } = setup();
    component.src = 'files/visitor-images/soc-1/abc.jpg';
    component.ngOnChanges();

    const url = component.objectUrl();
    expect(url).toBeTruthy();
    spyOn(URL, 'revokeObjectURL');

    component.ngOnDestroy();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url!);
  });

  it('only emits imageClick when clickable is true', () => {
    const { component } = setup();
    component.clickable = false;
    const spy = jasmine.createSpy();
    component.imageClick.subscribe(spy);

    component.onClick();
    expect(spy).not.toHaveBeenCalled();

    component.clickable = true;
    component.onClick();
    expect(spy).toHaveBeenCalled();
  });

  it('reflects imgClass onto its own host element, not an inner element, so the caller\'s encapsulated CSS actually applies', () => {
    // Regression test: passing a class as an @Input to a child component only styles it if the
    // class ends up on that child's HOST element — a class applied to a node inside the child's
    // own template is invisible to the parent's (Emulated-encapsulation-scoped) stylesheet.
    const { component, fixture } = setup();
    component.imgClass = 'vc-avatar-img';
    component.src = 'files/visitor-images/soc-1/abc.jpg';
    component.ngOnChanges();
    fixture.detectChanges();

    expect(fixture.nativeElement.classList.contains('vc-avatar-img')).toBeTrue();
  });

  it('renders without a host class when imgClass is not provided', () => {
    const { component, fixture } = setup();
    component.src = 'files/visitor-images/soc-1/abc.jpg';
    component.ngOnChanges();
    fixture.detectChanges();

    expect(fixture.nativeElement.className).toBe('');
  });
});
