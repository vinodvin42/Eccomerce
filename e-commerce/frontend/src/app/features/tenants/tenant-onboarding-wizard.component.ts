import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef, inject } from '@angular/core';

import { TenantService } from '../../core/services/tenant.service';
import type { Tenant } from '../../shared/models/tenant';

interface TenantOnboardingResponse {
  tenant: Tenant;
  adminUserId: string;
  adminEmail: string;
  message: string;
}

@Component({
  selector: 'app-tenant-onboarding-wizard',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule, AsyncPipe],
  template: `
    <div class="wizard-overlay" *ngIf="isOpen()">
      <div class="overlay-backdrop" (click)="closeWizard()"></div>
      <div class="wizard-container">
        <header class="wizard-header">
          <h2>Onboard New Tenant</h2>
          <button class="wizard-close" type="button" (click)="closeWizard()" aria-label="Close wizard">✕</button>
        </header>

        <div class="wizard-progress">
          <div class="progress-steps">
            <div class="step" [class.active]="currentStep() === 1" [class.completed]="currentStep() > 1">
              <span class="step-number">1</span>
              <span class="step-label">Tenant Details</span>
            </div>
            <div class="step-indicator"></div>
            <div class="step" [class.active]="currentStep() === 2" [class.completed]="currentStep() > 2">
              <span class="step-number">2</span>
              <span class="step-label">Admin User</span>
            </div>
            <div class="step-indicator"></div>
            <div class="step" [class.active]="currentStep() === 3" [class.completed]="currentStep() > 3">
              <span class="step-number">3</span>
              <span class="step-label">Initial Setup</span>
            </div>
          </div>
        </div>

        <form [formGroup]="wizardForm" class="wizard-form">
          <!-- Step 1: Tenant Details -->
          <div class="wizard-step" *ngIf="currentStep() === 1">
            <h3>Tenant Information</h3>
            <p class="step-description">Enter the basic information for the new tenant organization.</p>

            <label>
              <span>Tenant Name <span class="required">*</span></span>
              <input formControlName="tenantName" type="text" placeholder="Acme Corporation" />
              <small *ngIf="wizardForm.get('tenantName')?.invalid && wizardForm.get('tenantName')?.touched">
                Tenant name is required (min 3 characters).
              </small>
            </label>

            <label>
              <span>Tenant Slug <span class="required">*</span></span>
              <input formControlName="tenantSlug" type="text" placeholder="acme-corp" />
              <small>URL-friendly identifier (lowercase, hyphens only)</small>
              <small *ngIf="wizardForm.get('tenantSlug')?.invalid && wizardForm.get('tenantSlug')?.touched">
                Slug is required and must be lowercase with hyphens only.
              </small>
            </label>

            <label>
              <span>Primary Contact Email <span class="required">*</span></span>
              <input formControlName="primaryContact" type="email" placeholder="contact@acme.com" />
              <small *ngIf="wizardForm.get('primaryContact')?.invalid && wizardForm.get('primaryContact')?.touched">
                Valid email address is required.
              </small>
            </label>
          </div>

          <!-- Step 2: Admin User -->
          <div class="wizard-step" *ngIf="currentStep() === 2">
            <h3>Admin User Account</h3>
            <p class="step-description">Create the administrator account for this tenant.</p>

            <label>
              <span>Full Name <span class="required">*</span></span>
              <input formControlName="adminFullName" type="text" placeholder="John Doe" />
              <small *ngIf="wizardForm.get('adminFullName')?.invalid && wizardForm.get('adminFullName')?.touched">
                Full name is required (min 3 characters).
              </small>
            </label>

            <label>
              <span>Email <span class="required">*</span></span>
              <input formControlName="adminEmail" type="email" placeholder="admin@acme.com" />
              <small *ngIf="wizardForm.get('adminEmail')?.invalid && wizardForm.get('adminEmail')?.touched">
                Valid email address is required.
              </small>
            </label>

            <label>
              <span>Username <span class="required">*</span></span>
              <input formControlName="adminUsername" type="text" placeholder="admin" />
              <small *ngIf="wizardForm.get('adminUsername')?.invalid && wizardForm.get('adminUsername')?.touched">
                Username is required (min 3 characters).
              </small>
            </label>

            <label>
              <span>Password <span class="required">*</span></span>
              <input formControlName="adminPassword" type="password" placeholder="••••••••" />
              <small *ngIf="wizardForm.get('adminPassword')?.invalid && wizardForm.get('adminPassword')?.touched">
                Password must be at least 8 characters long.
              </small>
            </label>

            <label>
              <span>Confirm Password <span class="required">*</span></span>
              <input formControlName="confirmPassword" type="password" placeholder="••••••••" />
              <small
                *ngIf="
                  wizardForm.get('confirmPassword')?.invalid &&
                  wizardForm.get('confirmPassword')?.touched &&
                  wizardForm.get('confirmPassword')?.errors?.['passwordMismatch']
                "
              >
                Passwords do not match.
              </small>
            </label>
          </div>

          <!-- Step 3: Initial Setup -->
          <div class="wizard-step" *ngIf="currentStep() === 3">
            <h3>Initial Setup Options</h3>
            <p class="step-description">Choose what to set up automatically for the new tenant.</p>

            <div class="setup-options">
              <label class="option-card">
                <input type="checkbox" formControlName="setupDefaultCatalog" />
                <div>
                  <strong>Default Catalog</strong>
                  <p>Create default product categories (Rings, Necklaces, Earrings, etc.)</p>
                </div>
              </label>

              <label class="option-card">
                <input type="checkbox" formControlName="setupDefaultPaymentMethods" />
                <div>
                  <strong>Payment Methods</strong>
                  <p>Set up default payment methods (Credit Card, Debit Card, Cash on Delivery)</p>
                </div>
              </label>

              <label class="option-card">
                <input type="checkbox" formControlName="setupDefaultShippingMethods" />
                <div>
                  <strong>Shipping Methods</strong>
                  <p>Configure default shipping options (Standard, Express)</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Success Message -->
          <div class="wizard-success" *ngIf="onboardingSuccess()">
            <div class="success-icon">✓</div>
            <h3>Tenant Onboarded Successfully!</h3>
            <p>{{ onboardingSuccess()?.message }}</p>
            <div class="success-details">
              <p><strong>Tenant:</strong> {{ onboardingSuccess()?.tenant.name }}</p>
              <p><strong>Admin Email:</strong> {{ onboardingSuccess()?.adminEmail }}</p>
            </div>
          </div>

          <!-- Error Message -->
          <div class="wizard-error" *ngIf="onboardingError()">
            <p>{{ onboardingError() }}</p>
            <button class="btn-secondary" type="button" (click)="onboardingError.set(null)">Dismiss</button>
          </div>

          <!-- Loading State -->
          <div class="wizard-loading" *ngIf="isSubmitting()">
            <div class="spinner"></div>
            <p>Onboarding tenant...</p>
          </div>

          <!-- Navigation Buttons -->
          <div class="wizard-actions" *ngIf="!onboardingSuccess() && !isSubmitting()">
            <button
              class="btn-secondary"
              type="button"
              (click)="previousStep()"
              [disabled]="currentStep() === 1"
            >
              Previous
            </button>
            <button
              class="btn-primary"
              type="button"
              (click)="nextStep()"
              *ngIf="currentStep() < 3"
              [disabled]="!isCurrentStepValid()"
            >
              Next
            </button>
            <button
              class="btn-primary"
              type="button"
              (click)="submitOnboarding()"
              *ngIf="currentStep() === 3"
              [disabled]="!wizardForm.valid"
            >
              Complete Onboarding
            </button>
          </div>

          <div class="wizard-actions" *ngIf="onboardingSuccess()">
            <button class="btn-primary" type="button" (click)="closeWizard()">Done</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .wizard-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
      }

      .overlay-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
      }

      .wizard-container {
        position: relative;
        background: #1e1b4b;
        border-radius: 1rem;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        width: 100%;
        max-width: 700px;
        max-height: 90vh;
        overflow-y: auto;
        z-index: 1001;
      }

      .wizard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      }

      .wizard-header h2 {
        margin: 0;
        color: #f8fafc;
      }

      .wizard-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.5rem;
        line-height: 1;
      }

      .wizard-close:hover {
        color: #f8fafc;
      }

      .wizard-progress {
        padding: 1.5rem;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      }

      .progress-steps {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
      }

      .step-number {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        background: rgba(148, 163, 184, 0.2);
        color: #94a3b8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        transition: all 0.3s;
      }

      .step.active .step-number {
        background: #38bdf8;
        color: #0f172a;
      }

      .step.completed .step-number {
        background: #10b981;
        color: #0f172a;
      }

      .step-label {
        font-size: 0.75rem;
        color: #94a3b8;
        text-align: center;
      }

      .step.active .step-label {
        color: #38bdf8;
        font-weight: 600;
      }

      .step-indicator {
        flex: 1;
        height: 2px;
        background: rgba(148, 163, 184, 0.2);
        margin: 0 0.5rem;
      }

      .wizard-form {
        padding: 1.5rem;
      }

      .wizard-step {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .wizard-step h3 {
        margin: 0;
        color: #f8fafc;
      }

      .step-description {
        color: #94a3b8;
        margin: 0;
      }

      .wizard-form label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .wizard-form label span {
        color: #f8fafc;
        font-weight: 500;
      }

      .required {
        color: #ef4444;
      }

      .wizard-form input[type='text'],
      .wizard-form input[type='email'],
      .wizard-form input[type='password'] {
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid #334155;
        background: #020617;
        color: #f8fafc;
        font-size: 1rem;
      }

      .wizard-form input:focus {
        outline: none;
        border-color: #38bdf8;
        box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1);
      }

      .wizard-form small {
        color: #ef4444;
        font-size: 0.875rem;
      }

      .setup-options {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .option-card {
        display: flex;
        gap: 1rem;
        padding: 1rem;
        border: 1px solid #334155;
        border-radius: 0.5rem;
        background: rgba(2, 6, 23, 0.4);
        cursor: pointer;
        transition: all 0.2s;
      }

      .option-card:hover {
        border-color: #38bdf8;
        background: rgba(56, 189, 248, 0.05);
      }

      .option-card input[type='checkbox'] {
        width: 1.25rem;
        height: 1.25rem;
        cursor: pointer;
      }

      .option-card div {
        flex: 1;
      }

      .option-card strong {
        display: block;
        color: #f8fafc;
        margin-bottom: 0.25rem;
      }

      .option-card p {
        margin: 0;
        color: #94a3b8;
        font-size: 0.875rem;
      }

      .wizard-actions {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid rgba(148, 163, 184, 0.2);
      }

      .wizard-success {
        text-align: center;
        padding: 2rem;
      }

      .success-icon {
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        background: #10b981;
        color: #0f172a;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        font-weight: bold;
        margin: 0 auto 1rem;
      }

      .wizard-success h3 {
        color: #f8fafc;
        margin: 0 0 0.5rem;
      }

      .wizard-success p {
        color: #94a3b8;
        margin: 0 0 1.5rem;
      }

      .success-details {
        background: rgba(2, 6, 23, 0.4);
        border-radius: 0.5rem;
        padding: 1rem;
        text-align: left;
      }

      .success-details p {
        margin: 0.5rem 0;
        color: #f8fafc;
      }

      .wizard-error {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid #ef4444;
        border-radius: 0.5rem;
        padding: 1rem;
        color: #fca5a5;
        margin-bottom: 1rem;
      }

      .wizard-loading {
        text-align: center;
        padding: 2rem;
      }

      .spinner {
        width: 3rem;
        height: 3rem;
        border: 3px solid rgba(148, 163, 184, 0.2);
        border-top-color: #38bdf8;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 1rem;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .btn-primary,
      .btn-secondary {
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: #38bdf8;
        color: #0f172a;
      }

      .btn-primary:hover:not(:disabled) {
        background: #0ea5e9;
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-secondary {
        background: rgba(148, 163, 184, 0.2);
        color: #f8fafc;
      }

      .btn-secondary:hover:not(:disabled) {
        background: rgba(148, 163, 184, 0.3);
      }

      .btn-secondary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
})
export class TenantOnboardingWizardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tenantService = inject(TenantService);
  private readonly destroyRef = inject(DestroyRef);

  @Output() closed = new EventEmitter<void>();
  @Output() tenantCreated = new EventEmitter<Tenant>();

  isOpen = signal(false);
  currentStep = signal(1);
  isSubmitting = signal(false);
  onboardingSuccess = signal<TenantOnboardingResponse | null>(null);
  onboardingError = signal<string | null>(null);

  wizardForm!: FormGroup;

  ngOnInit(): void {
    this.initializeForm();
  }

  openWizard(): void {
    this.isOpen.set(true);
    this.currentStep.set(1);
    this.onboardingSuccess.set(null);
    this.onboardingError.set(null);
    this.wizardForm.reset();
    this.wizardForm.patchValue({
      setupDefaultCatalog: true,
      setupDefaultPaymentMethods: true,
      setupDefaultShippingMethods: true,
    });
  }

  closeWizard(): void {
    this.isOpen.set(false);
    this.currentStep.set(1);
    this.onboardingSuccess.set(null);
    this.onboardingError.set(null);
    this.closed.emit();
  }

  nextStep(): void {
    if (this.isCurrentStepValid()) {
      this.currentStep.update((step) => Math.min(step + 1, 3));
    }
  }

  previousStep(): void {
    this.currentStep.update((step) => Math.max(step - 1, 1));
  }

  isCurrentStepValid(): boolean {
    const step = this.currentStep();
    if (step === 1) {
      return !!(
        this.wizardForm.get('tenantName')?.valid &&
        this.wizardForm.get('tenantSlug')?.valid &&
        this.wizardForm.get('primaryContact')?.valid
      );
    }
    if (step === 2) {
      return !!(
        this.wizardForm.get('adminFullName')?.valid &&
        this.wizardForm.get('adminEmail')?.valid &&
        this.wizardForm.get('adminUsername')?.valid &&
        this.wizardForm.get('adminPassword')?.valid &&
        this.wizardForm.get('confirmPassword')?.valid &&
        !this.wizardForm.get('confirmPassword')?.errors?.['passwordMismatch']
      );
    }
    return true;
  }

  submitOnboarding(): void {
    if (!this.wizardForm.valid) {
      return;
    }

    this.isSubmitting.set(true);
    this.onboardingError.set(null);

    const formValue = this.wizardForm.value;
    const payload = {
      tenantName: formValue.tenantName,
      tenantSlug: formValue.tenantSlug,
      primaryContact: formValue.primaryContact,
      adminEmail: formValue.adminEmail,
      adminUsername: formValue.adminUsername,
      adminPassword: formValue.adminPassword,
      adminFullName: formValue.adminFullName,
      setupDefaultCatalog: formValue.setupDefaultCatalog ?? true,
      setupDefaultPaymentMethods: formValue.setupDefaultPaymentMethods ?? true,
      setupDefaultShippingMethods: formValue.setupDefaultShippingMethods ?? true,
    };

    this.tenantService.onboardTenant(payload).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.onboardingSuccess.set(response);
        this.tenantCreated.emit(response.tenant);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.onboardingError.set(error.error?.detail || 'Failed to onboard tenant. Please try again.');
      },
    });
  }

  private initializeForm(): void {
    this.wizardForm = this.fb.group(
      {
        tenantName: ['', [Validators.required, Validators.minLength(3)]],
        tenantSlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
        primaryContact: ['', [Validators.required, Validators.email]],
        adminFullName: ['', [Validators.required, Validators.minLength(3)]],
        adminEmail: ['', [Validators.required, Validators.email]],
        adminUsername: ['', [Validators.required, Validators.minLength(3)]],
        adminPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
        setupDefaultCatalog: [true],
        setupDefaultPaymentMethods: [true],
        setupDefaultShippingMethods: [true],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('adminPassword');
    const confirmPassword = control.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }
}

