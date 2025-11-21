import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'setToken']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.loginForm.valid).toBeFalsy();
    expect(component.loginForm.get('username')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should require username and password', () => {
    const usernameControl = component.loginForm.get('username');
    const passwordControl = component.loginForm.get('password');

    expect(usernameControl?.hasError('required')).toBeTruthy();
    expect(passwordControl?.hasError('required')).toBeTruthy();
  });

  it('should call authService.login on valid form submit', () => {
    const mockResponse = {
      access_token: 'test-token',
      token_type: 'bearer',
      expires_in: 3600,
    };

    authService.login.and.returnValue(of(mockResponse));
    component.loginForm.patchValue({
      username: 'testuser',
      password: 'password123',
    });

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
    expect(authService.setToken).toHaveBeenCalledWith('test-token');
    expect(router.navigate).toHaveBeenCalledWith(['/store']);
  });

  it('should not submit if form is invalid', () => {
    component.onSubmit();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('should handle login error', () => {
    authService.login.and.returnValue(throwError(() => ({ error: { detail: 'Invalid credentials' } })));
    component.loginForm.patchValue({
      username: 'testuser',
      password: 'wrongpass',
    });

    component.onSubmit();

    expect(component.errorMessage()).toBe('Invalid credentials');
    expect(component.submitting()).toBeFalse();
  });

  it('should set submitting flag during login', () => {
    const mockResponse = {
      access_token: 'test-token',
      token_type: 'bearer',
      expires_in: 3600,
    };

    authService.login.and.returnValue(of(mockResponse));
    component.loginForm.patchValue({
      username: 'testuser',
      password: 'password123',
    });

    component.onSubmit();
    expect(component.submitting()).toBeFalse(); // Should be false after completion
  });
});

