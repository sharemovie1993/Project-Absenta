/**
 * Standard Prisma User select block for Guru queries to prevent duplicate schema definitions.
 */
export const PRISMA_GURU_USER_SELECT = {
  select: {
    id: true,
    email: true,
    full_name: true,
    status: true,
    no_hp: true,
    last_login: true,
    Role: {
      select: {
        id: true,
        name: true,
      },
    },
    organizationalAssigns: {
      where: {
        is_active: true,
      },
      select: {
        id: true,
        is_active: true,
        custom_title: true,
        tahun_pelajaran_id: true,
        Position: {
          select: {
            id: true,
            code: true,
            name: true,
            scope_type: true,
          },
        },
        Kelas: {
          select: {
            id: true,
            nama_kelas: true,
          },
        },
        Unit: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
      },
    },
  },
} as const;

/**
 * Reusable helper to enrich Guru entity with fallback User email and no_hp properties.
 */
export function enrichGuruWithUser(guru: any, filterTpId?: string): any {
  if (!guru) return null;
  if (guru.User) {
    guru.email = guru.email || guru.User.email || null;
    guru.no_hp = guru.no_hp || guru.User.no_hp || null;
    guru.last_login = guru.last_login || guru.User.last_login || null;

    if (Array.isArray(guru.User.organizationalAssigns)) {
      guru.organizational_assignments = guru.User.organizationalAssigns;
      const relevantAssigns = (filterTpId && filterTpId !== 'ALL')
        ? guru.User.organizationalAssigns.filter((oa: any) => !oa.tahun_pelajaran_id || oa.tahun_pelajaran_id === filterTpId)
        : guru.User.organizationalAssigns;

      guru.active_positions = relevantAssigns.map((oa: any) => {
        const posName = oa.Position?.name || oa.Position?.code || 'Jabatan';
        if (oa.Kelas?.nama_kelas) {
          return `${posName} ${oa.Kelas.nama_kelas}`;
        }
        if (oa.Unit?.nama || oa.Unit?.kode) {
          return `${posName} ${oa.Unit.kode || oa.Unit.nama}`;
        }
        if (oa.custom_title) {
          return oa.custom_title;
        }
        return posName;
      });
    } else {
      guru.organizational_assignments = [];
      guru.active_positions = [];
    }
  }
  return guru;
}

/**
 * Helper to safely extract YYYY-MM-DD from ISO Date string or Date object.
 */
export function formatDateForStorage(date?: Date | string | null): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}
