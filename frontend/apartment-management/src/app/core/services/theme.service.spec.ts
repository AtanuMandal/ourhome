import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ThemeService } from './theme.service';
import { AuthService } from './auth.service';
import { SocietyService } from './society.service';
import { Society } from '../models/society.model';

describe('ThemeService', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  function makeSociety(themeId: string): Society {
    return {
      id: 's1', name: 'Green Valley',
      address: { street: '1 Main St', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
      totalBlocks: 2, totalApartments: 40, maintenanceOverdueThresholdDays: 7, maxUsersPerApartment: 10, visitorOverstayThresholdHours: 5,
      status: 'Active', adminUserIds: [], societyUsers: [], committees: [],
      themeId, createdAt: '2026-01-01T00:00:00Z',
    };
  }

  function setup(societyId: string | null, societyServiceOverrides: Partial<Record<string, unknown>> = {}) {
    const authServiceStub = { societyId: () => societyId };
    const societyServiceStub = {
      get: jasmine.createSpy().and.returnValue(of(makeSociety('ocean'))),
      ...societyServiceOverrides,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceStub },
        { provide: SocietyService, useValue: societyServiceStub },
      ],
    });

    return { societyServiceStub };
  }

  it('applies the ocean default when no society is known', fakeAsync(() => {
    setup(null);
    TestBed.inject(ThemeService);
    tick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');
  }));

  it("applies the society's assigned theme once resolved", fakeAsync(() => {
    setup('s1', { get: jasmine.createSpy().and.returnValue(of(makeSociety('violet'))) });
    TestBed.inject(ThemeService);
    tick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('violet');
  }));

  it('falls back to ocean for an unrecognized theme id', fakeAsync(() => {
    setup('s1', { get: jasmine.createSpy().and.returnValue(of(makeSociety('some-retired-theme'))) });
    TestBed.inject(ThemeService);
    tick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');
  }));

  it('falls back to ocean when the society fetch fails', fakeAsync(() => {
    setup('s1', { get: jasmine.createSpy().and.returnValue(throwError(() => new Error('network error'))) });
    TestBed.inject(ThemeService);
    tick();

    expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');
  }));
});
