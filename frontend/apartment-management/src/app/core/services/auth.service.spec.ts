import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';

describe('AuthService.isTenant', () => {
  function makeUser(residentType: User['residentType']): User {
    return {
      id: 'u1', societyId: 's1', email: 'r@test.com',
      role: 'SUUser', residentType, isVerified: true, permissions: [],
    };
  }

  function setup(residentType: User['residentType'] | null) {
    localStorage.clear();
    if (residentType) {
      localStorage.setItem('am_token', 'fake.token.value');
      localStorage.setItem('am_user', JSON.stringify(makeUser(residentType)));
      localStorage.setItem('am_society', 's1');
    }

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    return TestBed.inject(AuthService);
  }

  afterEach(() => localStorage.clear());

  it('is true for a resident whose residentType is Tenant', () => {
    const auth = setup('Tenant');
    expect(auth.isTenant()).toBeTrue();
  });

  it('is false for an Owner', () => {
    const auth = setup('Owner');
    expect(auth.isTenant()).toBeFalse();
  });

  it('is false when no user is loaded', () => {
    const auth = setup(null);
    expect(auth.isTenant()).toBeFalse();
  });
});
