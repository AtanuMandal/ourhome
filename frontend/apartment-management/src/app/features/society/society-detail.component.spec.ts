import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SocietyDetailComponent } from './society-detail.component';
import { SocietyService } from '../../core/services/society.service';
import { UserService } from '../../core/services/apartment.service';
import { AuthService } from '../../core/services/auth.service';
import { Society } from '../../core/models/society.model';

describe('SocietyDetailComponent — committee member dropdown', () => {
  function setup(society: Partial<Society>) {
    const societyServiceStub = {
      get: jasmine.createSpy().and.returnValue(of(society)),
      update: jasmine.createSpy(),
    };
    const userServiceStub = {
      list: jasmine.createSpy().and.returnValue(of({
        items: [
          { email: 'bob@example.com', fullName: 'Bob Jones' },
          { email: 'carol@example.com', fullName: 'Carol White' },
        ],
        total: 2, page: 1, pageSize: 500,
      })),
    };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => true };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [SocietyDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: SocietyService, useValue: societyServiceStub },
        { provide: UserService, useValue: userServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    const fixture = TestBed.createComponent(SocietyDetailComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('offers all society users when no one is assigned yet', () => {
    const component = setup({ committees: [] });
    const options = component.optionsForMember(null);
    expect(options.map(o => o.value).sort()).toEqual(['bob@example.com', 'carol@example.com']);
  });

  it('excludes a user already assigned to another committee role', () => {
    const component = setup({
      committees: [
        { name: 'Managing Committee', members: [{ userId: 'u1', fullName: 'Bob Jones', email: 'bob@example.com', roleTitle: 'Chairman' }] },
      ],
    });

    const optionsForNewRow = component.optionsForMember(null);
    expect(optionsForNewRow.map(o => o.value)).not.toContain('bob@example.com');
    expect(optionsForNewRow.map(o => o.value)).toContain('carol@example.com');
  });

  it('still includes the currently selected user in their own row (does not exclude self)', () => {
    const component = setup({
      committees: [
        { name: 'Managing Committee', members: [{ userId: 'u1', fullName: 'Bob Jones', email: 'bob@example.com', roleTitle: 'Chairman' }] },
      ],
    });

    const optionsForOwnRow = component.optionsForMember('bob@example.com');
    expect(optionsForOwnRow.map(o => o.value)).toContain('bob@example.com');
  });
});

describe('SocietyDetailComponent — branding upload', () => {
  function fileSelectEvent(file: File): Event {
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file] });
    return { target: input } as unknown as Event;
  }

  function setup(societyServiceOverrides: Partial<Record<string, unknown>> = {}) {
    const society: Partial<Society> = { id: 'soc-1', name: 'Green Valley', committees: [] };
    const societyServiceStub = {
      get: jasmine.createSpy().and.returnValue(of(society)),
      update: jasmine.createSpy(),
      uploadLogo: jasmine.createSpy(),
      uploadBackgroundImage: jasmine.createSpy(),
      removeLogo: jasmine.createSpy(),
      removeBackgroundImage: jasmine.createSpy(),
      ...societyServiceOverrides,
    };
    const userServiceStub = { list: jasmine.createSpy().and.returnValue(of({ items: [], total: 0, page: 1, pageSize: 500 })) };
    const authServiceStub = { societyId: () => 'soc-1', isAdmin: () => true };
    const snackBarStub = { open: jasmine.createSpy() };

    TestBed.configureTestingModule({
      imports: [SocietyDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: SocietyService, useValue: societyServiceStub },
        { provide: UserService, useValue: userServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: MatSnackBar, useValue: snackBarStub },
      ],
    });

    const fixture = TestBed.createComponent(SocietyDetailComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, societyServiceStub, snackBarStub };
  }

  it('uploads the selected file and updates the displayed logo on success', () => {
    const { component, societyServiceStub, snackBarStub } = setup({
      uploadLogo: jasmine.createSpy().and.returnValue(of({ logoUrl: 'files/society-logos/soc-1/new.png' })),
    });

    component.onLogoSelected(fileSelectEvent(new File(['x'], 'logo.png', { type: 'image/png' })));

    expect(societyServiceStub.uploadLogo).toHaveBeenCalledWith('soc-1', jasmine.any(File), 'logo.png');
    expect(component.society()?.logoUrl).toBe('files/society-logos/soc-1/new.png');
    expect(component.uploadingLogo()).toBeFalse();
    expect(snackBarStub.open).toHaveBeenCalled();
  });

  it('uploads the selected background image and updates the displayed background on success', () => {
    const { component, societyServiceStub } = setup({
      uploadBackgroundImage: jasmine.createSpy().and.returnValue(of({ sidenavBackgroundUrl: 'files/society-backgrounds/soc-1/new.jpg' })),
    });

    component.onBackgroundSelected(fileSelectEvent(new File(['x'], 'bg.jpg', { type: 'image/jpeg' })));

    expect(societyServiceStub.uploadBackgroundImage).toHaveBeenCalledWith('soc-1', jasmine.any(File), 'bg.jpg');
    expect(component.society()?.sidenavBackgroundUrl).toBe('files/society-backgrounds/soc-1/new.jpg');
    expect(component.uploadingBackground()).toBeFalse();
  });

  it('stops the uploading flag and shows an error snackbar when the logo upload fails', () => {
    const { component, snackBarStub } = setup({
      uploadLogo: jasmine.createSpy().and.returnValue(throwError(() => new Error('network error'))),
    });

    component.onLogoSelected(fileSelectEvent(new File(['x'], 'logo.png', { type: 'image/png' })));

    expect(component.uploadingLogo()).toBeFalse();
    expect(snackBarStub.open).toHaveBeenCalledWith('Unable to upload the logo. Try again.', 'Dismiss', { duration: 4000 });
  });

  it('does nothing when the file input change event has no selected file', () => {
    const { component, societyServiceStub } = setup();
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [] });

    component.onLogoSelected({ target: input } as unknown as Event);

    expect(societyServiceStub.uploadLogo).not.toHaveBeenCalled();
  });

  it('resolves app-relative branding paths against the API origin', () => {
    const { component } = setup();

    expect(component.absoluteUrl('files/society-logos/soc-1/abc.png'))
      .toBe('http://localhost:7071/api/files/society-logos/soc-1/abc.png');
  });

  it('removes the logo and clears the displayed thumbnail on success', () => {
    const { component, societyServiceStub, snackBarStub } = setup({
      removeLogo: jasmine.createSpy().and.returnValue(of({ id: 'soc-1', logoUrl: null })),
    });
    component.society.update(current => current ? { ...current, logoUrl: 'files/society-logos/soc-1/old.png' } : current);

    component.removeLogo();

    expect(societyServiceStub.removeLogo).toHaveBeenCalledWith('soc-1');
    expect(component.society()?.logoUrl).toBeNull();
    expect(component.uploadingLogo()).toBeFalse();
    expect(snackBarStub.open).toHaveBeenCalledWith('Logo removed.', 'Dismiss', { duration: 3000 });
  });

  it('removes the background image and clears the displayed thumbnail on success', () => {
    const { component, societyServiceStub } = setup({
      removeBackgroundImage: jasmine.createSpy().and.returnValue(of({ id: 'soc-1', sidenavBackgroundUrl: null })),
    });
    component.society.update(current => current ? { ...current, sidenavBackgroundUrl: 'files/society-backgrounds/soc-1/old.jpg' } : current);

    component.removeBackgroundImage();

    expect(societyServiceStub.removeBackgroundImage).toHaveBeenCalledWith('soc-1');
    expect(component.society()?.sidenavBackgroundUrl).toBeNull();
    expect(component.uploadingBackground()).toBeFalse();
  });

  it('stops the uploading flag and shows an error snackbar when removing the logo fails', () => {
    const { component, snackBarStub } = setup({
      removeLogo: jasmine.createSpy().and.returnValue(throwError(() => new Error('network error'))),
    });

    component.removeLogo();

    expect(component.uploadingLogo()).toBeFalse();
    expect(snackBarStub.open).toHaveBeenCalledWith('Unable to remove the logo. Try again.', 'Dismiss', { duration: 4000 });
  });

  it('stops the uploading flag and shows an error snackbar when removing the background image fails', () => {
    const { component, snackBarStub } = setup({
      removeBackgroundImage: jasmine.createSpy().and.returnValue(throwError(() => new Error('network error'))),
    });

    component.removeBackgroundImage();

    expect(component.uploadingBackground()).toBeFalse();
    expect(snackBarStub.open).toHaveBeenCalledWith('Unable to remove the background image. Try again.', 'Dismiss', { duration: 4000 });
  });
});
