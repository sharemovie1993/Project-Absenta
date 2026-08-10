import type { DataScope } from '@/types/fastify';

export function applyOrganizationalScope(
  baseWhere: any,
  scope: DataScope,
  opts?: { kelasField?: string; unitField?: string }
) {
  const where = { ...(baseWhere || {}) };
  if (scope?.tenantWide === true) return where;

  const kelasField = opts?.kelasField ?? 'kelas_id';
  const unitField = opts?.unitField ?? 'jurusan_id';

  if (Array.isArray(scope?.kelasIds) && scope.kelasIds.length > 0) {
    const allowed = scope.kelasIds.map((x) => String(x));
    const current = (where as any)[kelasField];
    if (current && typeof current === 'string') {
      if (!allowed.includes(String(current))) {
        (where as any)[kelasField] = '00000000-0000-4000-8000-000000000000';
      }
    } else if (current && typeof current === 'object' && Array.isArray((current as any)?.in)) {
      (where as any)[kelasField] = { in: (current as any).in.filter((x: any) => allowed.includes(String(x))) };
    } else {
      (where as any)[kelasField] = { in: allowed };
    }
  }

  if (Array.isArray(scope?.unitIds) && scope.unitIds.length > 0) {
    const allowed = scope.unitIds.map((x) => String(x));
    const current = (where as any)[unitField];
    if (current && typeof current === 'string') {
      if (!allowed.includes(String(current))) {
        (where as any)[unitField] = '00000000-0000-4000-8000-000000000000';
      }
    } else if (current && typeof current === 'object' && Array.isArray((current as any)?.in)) {
      (where as any)[unitField] = { in: (current as any).in.filter((x: any) => allowed.includes(String(x))) };
    } else {
      (where as any)[unitField] = { in: allowed };
    }
  }

  return where;
}

