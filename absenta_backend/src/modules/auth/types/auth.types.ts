export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
  role: string;
  tenant_id: string;
}

export interface LoginInput {
  email: string;
  password: string;
  tenant_id: string;
}

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
  billing_cycle_months?: number; // allowed: 1, 3, 6, 12
  custom_price?: number;
  sim_model?: string;
  sim_students?: number;
  sim_desc?: string;
  academic_tier?: string;
  absensi_mode?: 'SIMPLE' | 'MULTI_SESI';
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: {
    id: string;
    name: string;
    permissions?: string[];
  };
  tenant_id: string;
  capabilities?: string[];
  features?: string[];
  has_completed_onboarding?: boolean;
  siswa_id?: string;
  guru_profile?: any;
  tenant?: {
    id: string;
    name: string;
    domain?: string | null;
    subdomain?: string | null;
    custom_domain?: string | null;
    absensi_mode: string;
  } | null;
  position_codes?: string[];
  created_at: Date;
  updated_at: Date;
}
