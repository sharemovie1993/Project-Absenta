import { DataScope } from '@/types/fastify';

/**
 * ENTERPRISE DATA SCOPE APPLIER
 * Membantu mengamankan query database (Prisma Where Clause) berdasarkan konteks pengguna.
 * @param baseWhere Objek kriteria pencarian awal.
 * @param scope Objek scope yang dihasilkan oleh middleware (DataScope).
 * @param options Konfigurasi tambahan untuk mapping field.
 */
export function applyDataScope(
  baseWhere: any, 
  scope: DataScope, 
  optionsOrClassField: { 
    classField?: string; 
    unitField?: string;
    tenantField?: string;
    userField?: string;
  } | string = {}
) {
  const where = { ...baseWhere };
  
  // Handle Legacy Signature: applyDataScope(where, scope, 'kelas_id')
  const options = typeof optionsOrClassField === 'string' 
    ? { classField: optionsOrClassField } 
    : optionsOrClassField;

  const { 
    classField = 'kelas_id', 
    unitField = 'unit_id',
    tenantField = 'tenant_id',
    userField = 'user_id'
  } = options;

  // 1. Mandatory Tenant Isolation (SaaS Multi-tenant)
  if (scope?.tenantId !== undefined) {
    where[tenantField] = scope.tenantId;
  }

  // 2. Personal Row-Level Security (Siswa/Personal Data)
  if (scope?.userId !== undefined) {
    where[userField] = scope.userId;
    // Jika data pribadi, biasanya tidak perlu dibatasi unit lagi
    return where;
  }

  // 3. Organizational Unit Scoping (Wali Kelas, Kaprog, Toolman, etc)
  // Support both camelCase (legacy) and snake_case (Enterprise Standard)
  const isTenantWide = scope?.tenant_wide ?? scope?.tenantWide;
  
  if (isTenantWide !== true) {
    const allowedKelas = Array.isArray(scope?.kelas_ids) ? scope.kelas_ids.map((id: string) => String(id)) : 
                        (Array.isArray(scope?.kelasIds) ? scope.kelasIds.map((id: string) => String(id)) : []);
    
    const allowedUnits = Array.isArray(scope?.unit_ids) ? scope.unit_ids.map((id: string) => String(id)) : 
                        (Array.isArray(scope?.unitIds) ? scope.unitIds.map((id: string) => String(id)) : []);

    const hasRestrictedAccess = allowedKelas.length > 0 || allowedUnits.length > 0;

    if (hasRestrictedAccess) {
      const filters: any[] = [];

      // Filter by Class IDs if applicable
      if (allowedKelas.length > 0) {
        filters.push({ [classField]: { in: allowedKelas } });
      }

      // Filter by Unit IDs (Enterprise OU) if applicable
      if (allowedUnits.length > 0) {
        filters.push({ [unitField]: { in: allowedUnits } });
      }

      if (filters.length > 0) {
        // Gabungkan filter unit dengan kriteria pencarian yang sudah ada
        if (where.OR) {
          // Jika sudah ada OR, kita harus membungkus kriteria unit dalam AND
          // Namun untuk kesederhanaan SaaS, kita gunakan pendekatan top-level AND
          where.AND = [
            ...(where.AND || []),
            { OR: filters }
          ];
        } else {
          where.OR = filters;
        }
      } else {
        // User restricted but has no units assigned? Hard reject!
        where.id = '00000000-0000-4000-8000-000000000000';
      }
    }
  }

  return where;
}
