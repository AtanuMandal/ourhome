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

  it('starts at 100% (scale 1) whenever opened', () => {
    const { component } = setup();
    component.open = true;
    component.src = 'files/maintenance-proofs/soc-1/x.jpg';
    component.ngOnChanges();

    expect(component.scale()).toBe(1);
  });

  it('zoomIn increases scale up to the configured maximum', () => {
    const { component } = setup();
    for (let i = 0; i < 20; i++) component.zoomIn();
    expect(component.scale()).toBe(component.maxScale);
  });

  it('zoomOut decreases scale down to the configured minimum', () => {
    const { component } = setup();
    component.zoomIn();
    component.zoomIn();
    for (let i = 0; i < 20; i++) component.zoomOut();
    expect(component.scale()).toBe(component.minScale);
  });

  it('close resets the scale and emits the closed event', () => {
    const { component } = setup();
    component.zoomIn();
    component.zoomIn();

    const spy = jasmine.createSpy();
    component.closed.subscribe(spy);
    component.close();

    expect(component.scale()).toBe(component.minScale);
    expect(spy).toHaveBeenCalled();
  });
});
