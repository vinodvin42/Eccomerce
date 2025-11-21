export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  tenant_id: string | null;
}

