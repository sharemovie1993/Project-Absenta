import { siswaDb } from '../repositories/siswa.db';

export async function getSiswaHistoryQuery(
  siswaId: string,
  scope: { tenantId: string; org: any }
): Promise<any[]> {
  const { tenantId, org } = scope;
  let whereClause: any = { siswa_id: siswaId };

  let siswaWhere: any = { id: siswaId, tenant_id: tenantId };

  // Apply Isolate/Scope filter from Organization Engine
  if (org && org.tenant_wide !== true) {
    const allowed = Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
    if (allowed.length > 0) {
      siswaWhere.kelas_id = { in: allowed };
    } else {
        // No assigned classes, deny access to specific siswa history
        throw new Error('Siswa not found');
    }
  }

  const siswa = await siswaDb.siswa.findFirst({
    where: siswaWhere,
    select: { id: true },
  });

  if (!siswa) {
    throw new Error('Siswa not found');
  }

  const history = await siswaDb.siswaAkademik.findMany({
    where: whereClause,
    include: {
      kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
      tahunPelajaran: { select: { id: true, tahun: true } },
      semester: { select: { id: true, nama_semester: true } },
    },
    orderBy: [{ tahunPelajaran: { tahun: 'desc' } }, { semester: { nama_semester: 'desc' } }],
  });

  return history;
}

