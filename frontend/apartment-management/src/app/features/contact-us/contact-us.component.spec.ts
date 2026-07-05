import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ContactUsComponent } from './contact-us.component';
import { SocietyService } from '../../core/services/society.service';
import { AuthService } from '../../core/services/auth.service';
import { Society } from '../../core/models/society.model';

describe('ContactUsComponent', () => {
  function setup(society: Partial<Society> | null) {
    const societyServiceStub = {
      get: jasmine.createSpy().and.returnValue(of(society)),
    };
    const authServiceStub = { societyId: () => 'soc-1' };

    TestBed.configureTestingModule({
      imports: [ContactUsComponent],
      providers: [
        { provide: SocietyService, useValue: societyServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    });

    const fixture = TestBed.createComponent(ContactUsComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture };
  }

  it('renders society contact info and committees without any edit controls', () => {
    const { component, fixture } = setup({
      name: 'Green Valley',
      contactEmail: 'admin@gv.com',
      contactPhone: '+91-9876543210',
      committees: [
        { name: 'Managing Committee', members: [{ userId: 'u1', fullName: 'Bob Jones', email: 'bob@example.com', roleTitle: 'Chairman' }] },
      ],
    });

    expect(component.society()?.name).toBe('Green Valley');
    const html: string = fixture.nativeElement.textContent;
    expect(html).toContain('admin@gv.com');
    expect(html).toContain('+91-9876543210');
    expect(html).toContain('Managing Committee');
    expect(html).toContain('Bob Jones');
    expect(html).toContain('Chairman');

    // Read-only page: no edit/save affordances anywhere in the template.
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
  });

  it('shows an empty state when the society could not be loaded', () => {
    const { fixture } = setup(null);
    const html: string = fixture.nativeElement.textContent;
    expect(html).toContain('Society contact information is not available');
  });
});
