import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-shell">
      <div class="login-hero">
        <div class="glow"></div>
        <div class="hero-content">
          <p class="eyebrow">Premium Commerce</p>
          <h1>Welcome back<br />to your collection</h1>
          <p>Customers track purchases, while tenant admins curate the entire jewelry house.</p>
        </div>
      </div>
      <div class="login-panel">
        <div class="panel-header">
          <span class="badge">Secure Access</span>
          <h2>Sign in to continue</h2>
          <p>Admins land on the dashboard. Customers head straight to the Premium store.</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <label>
            Username
            <input
              type="text"
              formControlName="username"
              placeholder="superadmin"
              [class.error]="loginForm.get('username')?.invalid && loginForm.get('username')?.touched"
            />
            <span *ngIf="loginForm.get('username')?.invalid && loginForm.get('username')?.touched" class="error-message">
              Username is required
            </span>
          </label>

          <label>
            Password
            <input
              type="password"
              formControlName="password"
              placeholder="••••••••"
              [class.error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
            />
            <span *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" class="error-message">
              Password is required
            </span>
          </label>

          <div *ngIf="errorMessage()" class="alert-error">
            {{ errorMessage() }}
          </div>

          <button type="submit" class="btn-primary" [disabled]="loginForm.invalid || submitting()">
            {{ submitting() ? 'Signing in...' : 'Access Dashboard' }}
          </button>
        </form>

        <div class="panel-footer">
          <p>Need credentials? Admins use their tenant login. Customers use their store account.</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: linear-gradient(120deg, #050b18, #141124 45%, #050b18 100%);
        color: #f7f5ff;
      }
      .login-shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      }
      .login-hero {
        position: relative;
        padding: 4rem;
        overflow: hidden;
        display: flex;
        align-items: flex-end;
        color: #f4f2ff;
      }
      .glow {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 30% 30%, rgba(212, 175, 55, 0.3), transparent 55%);
        filter: blur(40px);
      }
      .hero-content {
        position: relative;
        max-width: 520px;
        z-index: 2;
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.4em;
        font-size: 0.75rem;
        margin: 0 0 1rem;
        color: rgba(255, 255, 255, 0.7);
      }
      .hero-content h1 {
        margin: 0;
        font-size: 3rem;
        line-height: 1.1;
        font-weight: 700;
      }
      .hero-content p {
        margin-top: 1rem;
        color: rgba(255, 255, 255, 0.8);
        font-size: 1rem;
      }

      .login-panel {
        background: #fefefe;
        padding: 4rem 3rem;
        border-top-left-radius: 32px;
        border-bottom-left-radius: 32px;
        box-shadow: -40px 0 120px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }
      .panel-header h2 {
        margin: 0.5rem 0;
        font-size: 2rem;
        color: #0f1111;
      }
      .panel-header p {
        margin: 0;
        color: #5d6169;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 0.3rem 0.9rem;
        border-radius: 999px;
        background: rgba(183, 110, 121, 0.12);
        color: #b76e79;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.75rem;
      }
      .login-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-weight: 600;
        color: #0f1111;
      }
      input {
        padding: 0.85rem;
        border-radius: 12px;
        border: 1px solid #d7dce2;
        font-size: 1rem;
        transition: border 0.2s, box-shadow 0.2s;
      }
      input:focus {
        outline: none;
        border-color: #d4af37;
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.2);
      }
      input.error {
        border-color: #e74646;
      }
      .error-message {
        font-size: 0.85rem;
        color: #b42318;
      }
      .login-form .btn-primary {
        width: 100%;
        padding: 0.95rem;
        border-radius: 999px;
        font-size: 1rem;
        font-weight: 700;
      }
      .panel-footer {
        text-align: center;
        color: #69707c;
        font-size: 0.95rem;
      }
      @media (max-width: 900px) {
        .login-shell {
          grid-template-columns: 1fr;
        }
        .login-hero {
          padding: 3rem 2rem;
        }
        .login-panel {
          border-radius: 32px 32px 0 0;
        }
      }
    `,
  ],
})
export class LoginComponent {
  loginForm: FormGroup;
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService
      .login(this.loginForm.value.username, this.loginForm.value.password)
      .subscribe({
        next: (response) => {
          this.authService.setToken(response.access_token);
          this.authService.getCurrentUser().subscribe({
            next: (user) => {
              const normalizedRole = user.role?.toLowerCase().replace(/[^a-z]/g, '');
              if (normalizedRole === 'superadmin' || normalizedRole === 'tenantadmin') {
                this.router.navigate(['/admin', 'dashboard']);
              } else {
                this.router.navigate(['/store']);
              }
              this.submitting.set(false);
            },
            error: () => {
              this.router.navigate(['/store']);
              this.submitting.set(false);
            },
          });
        },
        error: (error) => {
          this.errorMessage.set(error.error?.detail || 'Login failed. Please check your credentials.');
          this.submitting.set(false);
        },
      });
  }
}

