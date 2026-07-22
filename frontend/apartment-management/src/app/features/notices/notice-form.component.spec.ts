import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NoticeFormComponent } from './notice-form.component';
import { NoticeService } from '../../core/services/notice.service';
import { AuthService } from '../../core/services/auth.service';
import { Notice } from '../../core/models/notice.model';

describe('NoticeFormComponent', () => {
  function makeNotice(): Notice {
    return {
      id: 'n1', tt: 'Old Title', ct: 'Old Content',
      cat: 'General', pid: 'admin-1',
      pa: '2026-01-01T00:00:00Z', ea: '2026-02-01T00:00:00Z',
      rd: true,
    };
  }

  function setup(noticeId: string | null) {
    const noticeServiceStub = {
      get: jasmine.createSpy().and.returnValue(of(makeNotice())),
      update: jasmine.createSpy().and.returnValue(of(makeNotice())),
      post: jasmine.createSpy().and.returnValue(of(makeNotice())),
    };
    const authServiceStub = {
      societyId: () => 'soc-1',
      user: () => ({ id: 'admin-1' }),
    };
    const navigateSpy = jasmine.createSpy('navigate');

    TestBed.configureTestingModule({
      imports: [NoticeFormComponent, NoopAnimationsModule],
      providers: [
        { provide: NoticeService, useValue: noticeServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: Router, useValue: { navigate: navigateSpy } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(noticeId ? { id: noticeId } : {}) } } },
      ],
    });

    const fixture = TestBed.createComponent(NoticeFormComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, noticeServiceStub, navigateSpy, fixture };
  }

  it('loads the existing notice and pre-fills the form in edit mode', () => {
    const { component, noticeServiceStub } = setup('n1');

    expect(component.isEditMode()).toBeTrue();
    expect(noticeServiceStub.get).toHaveBeenCalledWith('soc-1', 'n1');
    expect(component.form.value.title).toBe('Old Title');
    expect(component.form.value.content).toBe('Old Content');
  });

  it('calls update (not post) and navigates to the detail page when saving in edit mode', () => {
    const { component, noticeServiceStub, navigateSpy } = setup('n1');

    component.form.patchValue({ title: 'New Title', content: 'New Content' });
    component.submit();

    expect(noticeServiceStub.update).toHaveBeenCalledWith('soc-1', 'n1', {
      title: 'New Title', content: 'New Content', expiresAt: jasmine.any(String),
    });
    expect(navigateSpy).toHaveBeenCalledWith(['/notices', 'n1']);
  });

  it('is in create mode with no route id, and calls post on submit', () => {
    const { component, noticeServiceStub, navigateSpy } = setup(null);

    expect(component.isEditMode()).toBeFalse();
    component.form.patchValue({ title: 'Brand New', content: 'Content here' });
    component.submit();

    expect(noticeServiceStub.post).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/notices']);
  });
});
