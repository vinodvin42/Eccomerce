import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login and store token', () => {
    const mockResponse = {
      access_token: 'test-token',
      token_type: 'bearer',
      expires_in: 3600,
    };

    service.login('testuser', 'password123').subscribe((response) => {
      expect(response).toEqual(mockResponse);
      expect(service.getToken()).toBe('test-token');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'testuser', password: 'password123' });
    req.flush(mockResponse);
  });

  it('should logout and remove token', () => {
    localStorage.setItem('access_token', 'test-token');
    service.logout();
    expect(service.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should check authentication status', () => {
    expect(service.isAuthenticated()).toBeFalse();
    localStorage.setItem('access_token', 'test-token');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('should register a new user', () => {
    const mockUser = {
      id: '123',
      email: 'newuser@example.com',
      username: 'newuser',
      full_name: 'New User',
      role: 'Customer',
      tenant_id: null,
    };

    service
      .register({
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        fullName: 'New User',
      })
      .subscribe((response) => {
        expect(response).toEqual(mockUser);
      });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'password123',
      full_name: 'New User',
    });
    req.flush(mockUser);
  });

  it('should get current user', () => {
    const mockUser = {
      id: '123',
      email: 'user@example.com',
      username: 'user',
      full_name: 'Test User',
      role: 'Customer',
      tenant_id: 'tenant-123',
    };

    service.getCurrentUser().subscribe((user) => {
      expect(user).toEqual(mockUser);
      expect(service.getStoredUser()).toEqual(mockUser);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/me`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });
});

