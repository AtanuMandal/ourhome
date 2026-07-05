import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
