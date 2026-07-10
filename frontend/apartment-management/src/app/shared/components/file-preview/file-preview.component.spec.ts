import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { FilePreviewComponent } from './file-preview.component';
import { ApiService } from '../../../core/services/api.service';

describe('FilePreviewComponent', () => {
  function setup(apiOverrides: Partial<Record<string, unknown>> = {}) {
    const apiServiceStub = {
      download: jasmine.createSpy().and.returnValue(
        of(new HttpResponse({ body: new Blob(['fake-file-bytes'], { type: 'application/pdf' }) }))
      ),
      ...apiOverrides,
    };

    TestBed.configureTestingModule({
      imports: [FilePreviewComponent],
      providers: [{ provide: ApiService, useValue: apiServiceStub }],
    });

    const fixture = TestBed.createComponent(FilePreviewComponent);
    return { component: fixture.componentInstance, fixture, apiServiceStub };
  }

  it('treats image extensions as images', () => {
    const { component } = setup();
    component.src = 'files/maintenance-proofs/soc-1/abc.jpg';
    expect(component.isImage()).toBeTrue();

    component.src = 'files/maintenance-proofs/soc-1/abc.PNG';
    expect(component.isImage()).toBeTrue();
  });

  it('treats pdf/word/excel extensions as non-images', () => {
    const { component } = setup();
    for (const ext of ['pdf', 'doc', 'docx', 'xls', 'xlsx']) {
      component.src = `files/maintenance-proofs/soc-1/abc.${ext}`;
      expect(component.isImage()).withContext(ext).toBeFalse();
    }
  });

  it('picks a distinct icon per document type and falls back to a generic icon otherwise', () => {
    const { component } = setup();
    component.src = 'files/maintenance-proofs/soc-1/abc.pdf';
    expect(component.fileIcon()).toBe('picture_as_pdf');

    component.src = 'files/maintenance-proofs/soc-1/abc.docx';
    expect(component.fileIcon()).toBe('description');

    component.src = 'files/maintenance-proofs/soc-1/abc.xlsx';
    expect(component.fileIcon()).toBe('table_chart');

    component.src = 'files/maintenance-proofs/soc-1/abc.txt';
    expect(component.fileIcon()).toBe('insert_drive_file');
  });

  it('downloads via the authenticated ApiService and opens the blob in a new tab when a non-image tile is clicked', () => {
    const { component, apiServiceStub } = setup();
    component.src = 'files/maintenance-proofs/soc-1/receipt.pdf';
    spyOn(window, 'open');

    component.viewFile();

    expect(apiServiceStub.download).toHaveBeenCalledWith('files/maintenance-proofs/soc-1/receipt.pdf');
    expect(window.open).toHaveBeenCalledWith(jasmine.stringMatching(/^blob:/), '_blank');
    expect(component.opening()).toBeFalse();
  });

  it('resets the opening flag without opening a tab when the download fails', () => {
    const { component } = setup({
      download: jasmine.createSpy().and.returnValue(throwError(() => new Error('403'))),
    });
    component.src = 'files/maintenance-proofs/soc-1/receipt.pdf';
    spyOn(window, 'open');

    component.viewFile();

    expect(window.open).not.toHaveBeenCalled();
    expect(component.opening()).toBeFalse();
  });

  it('ignores repeated clicks while a download is already in flight', () => {
    const { component, apiServiceStub } = setup();
    component.src = 'files/maintenance-proofs/soc-1/receipt.pdf';
    component.opening.set(true);

    component.viewFile();

    expect(apiServiceStub.download).not.toHaveBeenCalled();
  });
});
