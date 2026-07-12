import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { ImageLightboxComponent } from './image-lightbox.component';
import { ApiService } from '../../../core/services/api.service';

describe('ImageLightboxComponent', () => {
  function setup() {
    const apiServiceStub = {
      download: jasmine.createSpy().and.returnValue(
        of(new HttpResponse({ body: new Blob(['x'], { type: 'image/jpeg' }) }))
      ),
    };

    TestBed.configureTestingModule({
      imports: [ImageLightboxComponent],
      providers: [{ provide: ApiService, useValue: apiServiceStub }],
    });

    const fixture = TestBed.createComponent(ImageLightboxComponent);
    return { component: fixture.componentInstance, fixture };
  }

  it('starts at 80% (scale 0.8) whenever opened', () => {
    const { component } = setup();
    component.open = true;
    component.src = 'files/maintenance-proofs/soc-1/x.jpg';
    component.ngOnChanges();

    expect(component.scale()).toBe(0.8);
  });

  it('allows zooming out below the old 100% floor down to 20%', () => {
    const { component } = setup();
    expect(component.minScale).toBe(0.2);
    for (let i = 0; i < 20; i++) component.zoomOut();
    expect(component.scale()).toBe(component.minScale);
    expect(component.scale()).toBeLessThan(1);
  });

  it('zoomIn increases scale up to the configured maximum of 250%', () => {
    const { component } = setup();
    expect(component.maxScale).toBe(2.5);
    for (let i = 0; i < 20; i++) component.zoomIn();
    expect(component.scale()).toBe(component.maxScale);
  });

  it('close resets the scale to the default 80% and emits the closed event', () => {
    const { component } = setup();
    component.zoomIn();
    component.zoomIn();

    const spy = jasmine.createSpy();
    component.closed.subscribe(spy);
    component.close();

    expect(component.scale()).toBe(0.8);
    expect(spy).toHaveBeenCalled();
  });
});
