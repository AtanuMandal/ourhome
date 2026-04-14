import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { SocietyDetailComponent } from './society-detail.component';
import { SocietyService } from '../../core/services/society.service';
import { AuthService } from '../../core/services/auth.service';

describe('SocietyDetailComponent', () => {
  let fixture: ComponentFixture<SocietyDetailComponent>;
  let component: SocietyDetailComponent;

  beforeEach(async () => {
    const mockSociety = {
      id: 'soc-1',
      name: 'TestSoc',
      address: { street: 's', city: 'c', state: 'st', postalCode: 'p', country: 'cn' },
      contactEmail: 'a@b.com',
      contactPhone: '+1',
      totalBlocks: 1,
      totalApartments: 1,
      status: 'Active',
      overdueThresholdDays: 14,
      adminUserIds: [],
      createdAt: new Date().toISOString()
    };

    const mockSocietyService = {
      get: jasmine.createSpy('get').and.returnValue(of(mockSociety)),
      update: jasmine.createSpy('update').and.returnValue(of(mockSociety))
    } as any as SocietyService;

    const mockAuthService = {
      societyId: () => 'soc-1',
      user: () => ({ id: 'user-1', role: 'SUAdmin' }),
      isAdmin: () => true
    } as any as AuthService;

    await TestBed.configureTestingModule({
      imports: [SocietyDetailComponent],
      providers: [
        { provide: SocietyService, useValue: mockSocietyService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SocietyDetailComponent as any);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should have overdueThresholdDays control populated from society settings', () => {
    const ctl = (component as any).form.get('overdueThresholdDays');
    expect(ctl).toBeTruthy();
    expect(ctl.value).toBe(14);
  });
});
