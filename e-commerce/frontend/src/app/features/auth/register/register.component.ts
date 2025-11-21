import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="register-container">
      <div class="register-card">
        <h1>Create Account</h1>
        <p class="subtitle">Join Premium Commerce today</p>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              formControlName="fullName"
              placeholder="Enter your full name"
              [class.error]="registerForm.get('fullName')?.invalid && registerForm.get('fullName')?.touched"
            />
            <span
              *ngIf="registerForm.get('fullName')?.invalid && registerForm.get('fullName')?.touched"
              class="error-message"
            >
              Full name is required
            </span>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="Enter your email"
              [class.error]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
            />
            <span *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched" class="error-message">
              Valid email is required
            </span>
          </div>

          <div class="form-group">
            <label for="username">Username</label>
            <input
              id="username"
              type="text"
              formControlName="username"
              placeholder="Choose a username"
              [class.error]="registerForm.get('username')?.invalid && registerForm.get('username')?.touched"
            />
            <span
              *ngIf="registerForm.get('username')?.invalid && registerForm.get('username')?.touched"
              class="error-message"
            >
              Username is required (min 3 characters)
            </span>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              placeholder="Create a password (min 8 characters)"
              [class.error]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched"
            />
            <span
              *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched"
              class="error-message"
            >
              Password must be at least 8 characters
            </span>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              formControlName="confirmPassword"
              placeholder="Confirm your password"
              [class.error]="registerForm.get('confirmPassword')?.invalid && registerForm.get('confirmPassword')?.touched"
            />
            <span
              *ngIf="registerForm.get('confirmPassword')?.invalid && registerForm.get('confirmPassword')?.touched"
              class="error-message"
            >
              Passwords must match
            </span>
          </div>

          <div *ngIf="errorMessage()" class="alert-error">
            {{ errorMessage() }}
          </div>

          <button type="submit" class="btn-register" [disabled]="registerForm.invalid || submitting()">
            {{ submitting() ? 'Creating Account...' : 'Create Account' }}
          </button>
        </form>

        <div class="register-footer">
          <p>
            Already have an account?
            <a routerLink="/login" class="link">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .register-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0f172a;
        padding: 2rem;
      }
      .register-card {
        width: 100%;
        max-width: 500px;
        background: #1e1b4b;
        padding: 2.5rem;
        border-radius: 1rem;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.9);
      }
      h1 {
        margin: 0 0 0.5rem 0;
        font-size: 2rem;
        font-weight: 700;
        color: #f8fafc;
      }
      .subtitle {
        margin: 0 0 2rem 0;
        color: #94a3b8;
      }
      .form-group {
        margin-bottom: 1.5rem;
      }
      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #c4b5fd;
      }
      input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #1e293b;
        border-radius: 0.5rem;
        background: #020617;
        color: #f8fafc;
        font-size: 1rem;
        box-sizing: border-box;
      }
      input:focus {
        outline: none;
        border-color: #38bdf8;
      }
      input.error {
        border-color: #ef4444;
      }
      .error-message {
        display: block;
        margin-top: 0.25rem;
        font-size: 0.875rem;
        color: #ef4444;
      }
      .alert-error {
        padding: 0.75rem;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid #ef4444;
        border-radius: 0.5rem;
        color: #ef4444;
        margin-bottom: 1rem;
        font-size: 0.875rem;
      }
      .btn-register {
        width: 100%;
        padding: 0.75rem;
        background: #38bdf8;
        color: #0f172a;
        border: none;
        border-radius: 0.5rem;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.2s;
      }
      .btn-register:hover:not(:disabled) {
        background: #0ea5e9;
      }
      .btn-register:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .register-footer {
        margin-top: 2rem;
        text-align: center;
        color: #94a3b8;
      }
      .link {
        color: #38bdf8;
        text-decoration: none;
        font-weight: 600;
      }
      .link:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class RegisterComponent {
  registerForm: FormGroup;
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.registerForm = this.fb.group(
      {
        fullName: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        username: ['', [Validators.required, Validators.minLength(3)]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService
      .register({
        email: this.registerForm.value.email,
        username: this.registerForm.value.username,
        password: this.registerForm.value.password,
        fullName: this.registerForm.value.fullName,
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
        },
        error: (error) => {
          this.errorMessage.set(error.error?.detail || 'Registration failed. Please try again.');
          this.submitting.set(false);
        },
      });
  }
}

