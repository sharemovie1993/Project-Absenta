import { requestWithFallback } from "./apiUtils";

// Types based on AUTH_MODULE_API.md
export interface LoginRequest {
  email: string;
  password: string;
  tenant_id?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      email: string;
      full_name: string;
      role: {
        id: string;
        name: string;
        permissions?: string | null;
      };
      tenant_id: string;
      tenant?: {
        id: string;
        name: string;
        absensi_mode: 'SIMPLE' | 'MULTI_SESI';
      } | null;
      has_completed_onboarding?: boolean;
      capabilities?: string[];
      created_at: string;
      updated_at: string;
    };
    token: string;
    refreshToken: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
  };
}

export interface UserProfileResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    email: string;
    full_name: string;
    role: {
      id: string;
      name: string;
      permissions?: string | null;
    };
    tenant_id: string;
    tenant?: {
      id: string;
      name: string;
      absensi_mode: 'SIMPLE' | 'MULTI_SESI';
    } | null;
    has_completed_onboarding?: boolean;
    capabilities?: string[];
    created_at: string;
    updated_at: string;
  };
}

// API Functions

export async function login(email: string, password: string, tenant_id?: string): Promise<LoginResponse> {
  const data: LoginRequest = { email, password };
  if (tenant_id) data.tenant_id = tenant_id;
  return requestWithFallback<LoginResponse>('post', '/auth/login', { data });
}

export async function getCurrentUser(): Promise<UserProfileResponse> {
  return requestWithFallback<UserProfileResponse>('get', '/auth/me');
}

export async function resendVerification(email: string): Promise<{ success: boolean; message: string } > {
  return requestWithFallback<{ success: boolean; message: string }>('post', '/auth/resend-verification', { data: { email } });
}

export async function refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
  return requestWithFallback<RefreshTokenResponse>('post', '/auth/refresh', { data: { refreshToken } });
}

// Register User
// Catatan: Sistem tidak menyediakan pendaftaran user biasa.
// Flow registrasi adalah "register tenant" (menciptakan tenant baru + admin).

// Change Password
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export async function changePassword(payload: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  return requestWithFallback<ChangePasswordResponse>('post', '/auth/change-password', { data: payload });
}

// Register Tenant
export interface RegisterTenantInput {
  tenant_name: string;
  tenant_domain: string;
  npsn?: string;
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
  admin_phone: string;
  plan_id?: string;
  alamat?: string;
  billing_cycle_months?: number; // 1, 3, 6, 12
  custom_price?: number;
  sim_model?: string;
  sim_students?: number;
  sim_desc?: string;
}

export interface RegisterTenantResponse {
  success: boolean;
  message: string;
}

export async function registerTenant(payload: RegisterTenantInput): Promise<RegisterTenantResponse> {
  return requestWithFallback<RegisterTenantResponse>('post', '/auth/register-tenant', { data: payload });
}

export interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
}

export interface ConfirmPasswordResetResponse {
  success: boolean;
  message: string;
}

export async function requestPasswordReset(email: string, tenant_id?: string): Promise<RequestPasswordResetResponse> {
  const data: any = { email };
  if (tenant_id) data.tenant_id = tenant_id;
  return requestWithFallback<RequestPasswordResetResponse>('post', '/auth/request-password-reset', { data });
}

export async function confirmPasswordReset(token: string, new_password: string): Promise<ConfirmPasswordResetResponse> {
  return requestWithFallback<ConfirmPasswordResetResponse>('post', '/auth/confirm-password-reset', { data: { token, new_password } });
}
