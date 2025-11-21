import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import type { User, UserProfile } from '../../shared/models/user';
import type { UserResponse } from '../../shared/models/auth';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-page">
      <div class="profile-container">
        <div class="profile-header">
          <h1>My Profile</h1>
          <p class="profile-subtitle">Manage your account information and preferences</p>
        </div>

        <div class="profile-content">
          <!-- Profile Information Card -->
          <div class="profile-card">
            <div class="card-header">
              <h2>Profile Information</h2>
            </div>
            <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" class="profile-form">
              <div class="form-group">
                <label for="full_name">Full Name</label>
                <input
                  id="full_name"
                  type="text"
                  formControlName="full_name"
                  class="form-input"
                  placeholder="Enter your full name"
                />
                <span class="error-message" *ngIf="profileForm.get('full_name')?.hasError('required') && profileForm.get('full_name')?.touched">
                  Full name is required
                </span>
              </div>

              <div class="form-group">
                <label for="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  class="form-input"
                  placeholder="Enter your email"
                  [readonly]="true"
                />
                <small class="form-hint">Email cannot be changed</small>
              </div>

              <div class="form-group">
                <label for="username">Username</label>
                <input
                  id="username"
                  type="text"
                  formControlName="username"
                  class="form-input"
                  placeholder="Enter your username"
                />
                <span class="error-message" *ngIf="profileForm.get('username')?.hasError('required') && profileForm.get('username')?.touched">
                  Username is required
                </span>
              </div>

              <div class="form-group">
                <label for="role">Role</label>
                <input
                  id="role"
                  type="text"
                  [value]="getRoleDisplay()"
                  class="form-input"
                  readonly
                />
                <small class="form-hint">Role cannot be changed</small>
              </div>

              <div class="form-actions">
                <button type="button" class="btn-secondary" (click)="onCancel()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="profileForm.invalid || saving()">
                  <span *ngIf="saving()">Saving...</span>
                  <span *ngIf="!saving()">Save Changes</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Account Security Card -->
          <div class="profile-card">
            <div class="card-header">
              <h2>Account Security</h2>
            </div>
            <div class="security-info">
              <div class="info-item">
                <div class="info-label">
                  <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="M9 12l2 2 4-4"></path>
                  </svg>
                  <span>Two-Factor Authentication</span>
                </div>
                <div class="info-value">
                  <span class="status-badge" [class.active]="getMfaEnabled()">
                    {{ getMfaEnabled() ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">
                  <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>Last Login</span>
                </div>
                <div class="info-value">
                  <span>{{ getLastLogin() }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact Information Card -->
          <div class="profile-card">
            <div class="card-header">
              <h2>Contact Information</h2>
            </div>
            <form [formGroup]="contactForm" (ngSubmit)="onSubmitContact()" class="profile-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="phone">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    formControlName="phone"
                    class="form-input"
                    placeholder="Enter your phone number"
                  />
                  <span class="error-message" *ngIf="contactForm.get('phone')?.hasError('required') && contactForm.get('phone')?.touched">
                    Phone number is required
                  </span>
                  <span class="error-message" *ngIf="contactForm.get('phone')?.hasError('pattern') && contactForm.get('phone')?.touched">
                    Please enter a valid phone number
                  </span>
                </div>
                <div class="form-group">
                  <label for="alternatePhone">Alternate Phone (Optional)</label>
                  <input
                    id="alternatePhone"
                    type="tel"
                    formControlName="alternatePhone"
                    class="form-input"
                    placeholder="Enter alternate phone number"
                  />
                </div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn-secondary" (click)="onCancelContact()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="contactForm.invalid || savingContact()">
                  <span *ngIf="savingContact()">Saving...</span>
                  <span *ngIf="!savingContact()">Save Contact</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Address Information Card -->
          <div class="profile-card">
            <div class="card-header">
              <h2>Address Information</h2>
            </div>
            <form [formGroup]="addressForm" (ngSubmit)="onSubmitAddress()" class="profile-form">
              <div class="form-group">
                <label for="addressLine1">Address Line 1</label>
                <input
                  id="addressLine1"
                  type="text"
                  formControlName="addressLine1"
                  class="form-input"
                  placeholder="Street address, P.O. box"
                />
                <span class="error-message" *ngIf="addressForm.get('addressLine1')?.hasError('required') && addressForm.get('addressLine1')?.touched">
                  Address line 1 is required
                </span>
              </div>
              <div class="form-group">
                <label for="addressLine2">Address Line 2 (Optional)</label>
                <input
                  id="addressLine2"
                  type="text"
                  formControlName="addressLine2"
                  class="form-input"
                  placeholder="Apartment, suite, unit, building, floor, etc."
                />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="city">City</label>
                  <input
                    id="city"
                    type="text"
                    formControlName="city"
                    class="form-input"
                    placeholder="Enter city"
                  />
                  <span class="error-message" *ngIf="addressForm.get('city')?.hasError('required') && addressForm.get('city')?.touched">
                    City is required
                  </span>
                </div>
                <div class="form-group">
                  <label for="state">State/Province</label>
                  <input
                    id="state"
                    type="text"
                    formControlName="state"
                    class="form-input"
                    placeholder="Enter state or province"
                  />
                  <span class="error-message" *ngIf="addressForm.get('state')?.hasError('required') && addressForm.get('state')?.touched">
                    State is required
                  </span>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="postalCode">Postal/ZIP Code</label>
                  <input
                    id="postalCode"
                    type="text"
                    formControlName="postalCode"
                    class="form-input"
                    placeholder="Enter postal code"
                  />
                  <span class="error-message" *ngIf="addressForm.get('postalCode')?.hasError('required') && addressForm.get('postalCode')?.touched">
                    Postal code is required
                  </span>
                </div>
                <div class="form-group">
                  <label for="country">Country</label>
                  <input
                    id="country"
                    type="text"
                    formControlName="country"
                    class="form-input"
                    placeholder="Enter country"
                  />
                  <span class="error-message" *ngIf="addressForm.get('country')?.hasError('required') && addressForm.get('country')?.touched">
                    Country is required
                  </span>
                </div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn-secondary" (click)="onCancelAddress()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="addressForm.invalid || savingAddress()">
                  <span *ngIf="savingAddress()">Saving...</span>
                  <span *ngIf="!savingAddress()">Save Address</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Account Details Card -->
          <div class="profile-card">
            <div class="card-header">
              <h2>Account Details</h2>
            </div>
            <div class="account-details">
              <div class="detail-row">
                <span class="detail-label">Account Status</span>
                <span class="detail-value">
                  <span class="status-badge" [class.active]="getAccountStatus() === 'Active'">
                    {{ getAccountStatus() }}
                  </span>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Account ID</span>
                <span class="detail-value">{{ user()?.id || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Tenant ID</span>
                <span class="detail-value">{{ user()?.tenant_id || 'N/A' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .profile-page {
        min-height: 100vh;
        background: var(--premium-pearl);
        padding: 2rem 0;
      }

      .profile-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
      }

      .profile-header {
        margin-bottom: 2.5rem;
      }

      .profile-header h1 {
        font-size: 2.5rem;
        font-weight: 800;
        color: var(--premium-onyx);
        margin: 0 0 0.5rem 0;
        letter-spacing: -0.02em;
      }

      .profile-subtitle {
        font-size: 1.125rem;
        color: var(--premium-titanium);
        margin: 0;
      }

      .profile-content {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
      }

      .profile-card {
        background: #ffffff;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border: 1px solid #e5e5e5;
      }

      .card-header {
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #f0f0f0;
      }

      .card-header h2 {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--premium-onyx);
        margin: 0;
      }

      .profile-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .form-group label {
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--premium-onyx);
      }

      .form-input {
        padding: 0.875rem 1rem;
        border: 2px solid #e5e5e5;
        border-radius: 8px;
        font-size: 1rem;
        transition: all 0.3s ease;
        background: #ffffff;
        color: var(--premium-onyx);
      }

      .form-input:focus {
        outline: none;
        border-color: #d4af37;
        box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
      }

      .form-input[readonly] {
        background: #f8f9fa;
        color: var(--premium-titanium);
        cursor: not-allowed;
      }

      .form-hint {
        font-size: 0.875rem;
        color: var(--premium-titanium);
      }

      .error-message {
        font-size: 0.875rem;
        color: #ef4444;
      }

      .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
        padding-top: 1.5rem;
        border-top: 1px solid #f0f0f0;
      }

      .security-info,
      .account-details {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .info-item,
      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
      }

      .info-label {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 500;
        color: var(--premium-onyx);
      }

      .info-icon {
        width: 20px;
        height: 20px;
        stroke: currentColor;
        stroke-width: 2;
        color: var(--premium-titanium);
      }

      .info-value {
        font-weight: 600;
        color: var(--premium-onyx);
      }

      .detail-label {
        font-weight: 500;
        color: var(--premium-titanium);
      }

      .detail-value {
        font-weight: 600;
        color: var(--premium-onyx);
      }

      .status-badge {
        padding: 0.375rem 0.875rem;
        border-radius: 20px;
        font-size: 0.875rem;
        font-weight: 600;
        background: #f0f0f0;
        color: var(--premium-titanium);
      }

      .status-badge.active {
        background: #10b981;
        color: #ffffff;
      }

      @media (max-width: 768px) {
        .profile-container {
          padding: 0 1rem;
        }

        .profile-header h1 {
          font-size: 2rem;
        }

        .profile-card {
          padding: 1.5rem;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .form-actions {
          flex-direction: column;
        }

        .form-actions button {
          width: 100%;
        }

        .info-item,
        .detail-row {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  contactForm!: FormGroup;
  addressForm!: FormGroup;
  user = signal<UserResponse | null>(null);
  userProfile = signal<UserProfile | null>(null);
  saving = signal(false);
  savingContact = signal(false);
  savingAddress = signal(false);

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadUserProfileData();
    this.initForm();
    this.initContactForm();
    this.initAddressForm();
  }

  private loadUserProfile(): void {
    const storedUser = this.authService.getStoredUser();
    if (storedUser) {
      this.user.set(storedUser);
      this.updateForm(storedUser);
      // Optionally load full user details from API
      if (storedUser.id) {
        this.userService.getUser(storedUser.id).subscribe({
          next: (user) => {
            // Merge User data with UserResponse
            const userResponse: UserResponse & { status?: string; mfa_enabled?: boolean; last_login?: string | null } = {
              ...storedUser,
              full_name: user.full_name,
              username: user.username,
              email: user.email,
              status: user.status,
              mfa_enabled: user.mfa_enabled,
              last_login: user.last_login,
            };
            this.user.set(userResponse as UserResponse);
            this.updateForm(userResponse as UserResponse);
            // Reload profile data after user is loaded
            this.loadUserProfileData();
            this.updateContactForm(this.userProfile() || {});
            this.updateAddressForm(this.userProfile() || {});
          },
          error: (err) => {
            console.error('Error loading user profile:', err);
            // Continue with stored user if API call fails
          },
        });
      }
      // Load profile data after user is set
      setTimeout(() => {
        this.loadUserProfileData();
        this.updateContactForm(this.userProfile() || {});
        this.updateAddressForm(this.userProfile() || {});
      }, 100);
    } else {
      this.router.navigate(['/login']);
    }
  }

  private loadUserProfileData(): void {
    const userId = this.user()?.id;
    if (userId) {
      const storedProfile = localStorage.getItem(`user_profile_${userId}`);
      if (storedProfile) {
        try {
          this.userProfile.set(JSON.parse(storedProfile));
        } catch (err) {
          console.error('Error parsing stored profile:', err);
        }
      }
    }
  }

  private saveUserProfileData(profile: UserProfile): void {
    const userId = this.user()?.id;
    if (userId) {
      localStorage.setItem(`user_profile_${userId}`, JSON.stringify(profile));
      this.userProfile.set(profile);
    }
  }

  private initForm(): void {
    const currentUser = this.user();
    this.profileForm = this.fb.group({
      full_name: [currentUser?.full_name || '', [Validators.required]],
      email: [{ value: currentUser?.email || '', disabled: true }],
      username: [currentUser?.username || '', [Validators.required]],
    });
  }

  private initContactForm(): void {
    const profile = this.userProfile();
    this.contactForm = this.fb.group({
      phone: [
        profile?.phone || '',
        [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)],
      ],
      alternatePhone: [profile?.alternatePhone || '', [Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)]],
    });
  }

  private initAddressForm(): void {
    const profile = this.userProfile();
    this.addressForm = this.fb.group({
      addressLine1: [profile?.addressLine1 || '', [Validators.required]],
      addressLine2: [profile?.addressLine2 || ''],
      city: [profile?.city || '', [Validators.required]],
      state: [profile?.state || '', [Validators.required]],
      postalCode: [profile?.postalCode || '', [Validators.required]],
      country: [profile?.country || 'India', [Validators.required]],
    });
  }

  private updateForm(user: UserResponse): void {
    this.profileForm.patchValue({
      full_name: user.full_name,
      email: user.email,
      username: user.username,
    });
  }

  private updateContactForm(profile: UserProfile): void {
    this.contactForm.patchValue({
      phone: profile.phone || '',
      alternatePhone: profile.alternatePhone || '',
    });
  }

  private updateAddressForm(profile: UserProfile): void {
    this.addressForm.patchValue({
      addressLine1: profile.addressLine1 || '',
      addressLine2: profile.addressLine2 || '',
      city: profile.city || '',
      state: profile.state || '',
      postalCode: profile.postalCode || '',
      country: profile.country || 'India',
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid || !this.user()) {
      return;
    }

    this.saving.set(true);
    const formValue = this.profileForm.getRawValue();
    const updateRequest = {
      full_name: formValue.full_name,
      username: formValue.username,
    };

    this.userService.updateUser(this.user()!.id, updateRequest).subscribe({
      next: (updatedUser) => {
        // Merge updated user data with existing UserResponse
        const currentUser = this.user()!;
        const userResponse: UserResponse = {
          id: currentUser.id,
          email: currentUser.email,
          username: updatedUser.username,
          full_name: updatedUser.full_name,
          role: currentUser.role,
          tenant_id: currentUser.tenant_id,
        };
        this.user.set(userResponse);
        // Update stored user
        localStorage.setItem('current_user', JSON.stringify(userResponse));
        this.saving.set(false);
        alert('Profile updated successfully!');
      },
      error: (err) => {
        console.error('Error updating profile:', err);
        this.saving.set(false);
        alert('Failed to update profile. Please try again.');
      },
    });
  }

  getMfaEnabled(): boolean {
    const user = this.user();
    return (user as any)?.mfa_enabled || false;
  }

  getLastLogin(): string {
    const user = this.user();
    const lastLogin = (user as any)?.last_login;
    if (!lastLogin) return 'Never';
    try {
      return new Date(lastLogin).toLocaleString();
    } catch {
      return 'Never';
    }
  }

  getRoleDisplay(): string {
    const user = this.user();
    if (!user?.role) return 'Customer';
    return user.role;
  }

  onSubmitContact(): void {
    if (this.contactForm.invalid) {
      return;
    }

    this.savingContact.set(true);
    const formValue = this.contactForm.getRawValue();
    const currentProfile = this.userProfile() || {};
    const updatedProfile: UserProfile = {
      ...currentProfile,
      phone: formValue.phone,
      alternatePhone: formValue.alternatePhone || undefined,
    };

    this.saveUserProfileData(updatedProfile);
    this.savingContact.set(false);
    alert('Contact information saved successfully!');
  }

  onSubmitAddress(): void {
    if (this.addressForm.invalid) {
      return;
    }

    this.savingAddress.set(true);
    const formValue = this.addressForm.getRawValue();
    const currentProfile = this.userProfile() || {};
    const updatedProfile: UserProfile = {
      ...currentProfile,
      addressLine1: formValue.addressLine1,
      addressLine2: formValue.addressLine2 || undefined,
      city: formValue.city,
      state: formValue.state,
      postalCode: formValue.postalCode,
      country: formValue.country,
    };

    this.saveUserProfileData(updatedProfile);
    this.savingAddress.set(false);
    alert('Address information saved successfully!');
  }

  onCancel(): void {
    const currentUser = this.user();
    if (currentUser) {
      this.updateForm(currentUser);
    }
  }

  onCancelContact(): void {
    const profile = this.userProfile();
    if (profile) {
      this.updateContactForm(profile);
    } else {
      this.contactForm.reset();
    }
  }

  onCancelAddress(): void {
    const profile = this.userProfile();
    if (profile) {
      this.updateAddressForm(profile);
    } else {
      this.addressForm.reset();
      this.addressForm.patchValue({ country: 'India' });
    }
  }

  getAccountStatus(): string {
    const user = this.user();
    return (user as any)?.status || 'Active';
  }
}

