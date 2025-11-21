export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: 'Customer' | 'Staff' | 'TenantAdmin' | 'SuperAdmin';
  status: 'Active' | 'Inactive' | 'Suspended';
  tenant_id: string | null;
  auth_provider: 'Local' | 'Okta' | 'Google';
  mfa_enabled: boolean;
  last_login: string | null;
  audit: {
    created_by: string;
    created_date: string;
    modified_by: string;
    modified_date: string;
  };
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  full_name: string;
  role?: 'Customer' | 'Staff' | 'TenantAdmin' | 'SuperAdmin';
  tenant_id?: string | null;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
  full_name?: string;
  role?: 'Customer' | 'Staff' | 'TenantAdmin' | 'SuperAdmin';
  status?: 'Active' | 'Inactive' | 'Suspended';
  mfa_enabled?: boolean;
}

export interface UserProfile {
  phone?: string;
  alternatePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

