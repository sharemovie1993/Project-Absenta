export interface DataScope {
  tenantId?: string;
  userId?: string;
  kelasIds?: string[];
  unitIds?: string[];
  tenantWide?: boolean;
  
  // Snake case support for Enterprise Standard
  tenant_wide?: boolean;
  kelas_ids?: string[];
  unit_ids?: string[];
}

export interface UserPayload {
  id: string;
  email: string;
  roleName: string;
  tenantId?: string;
  full_name?: string;
  [key: string]: any;
}
