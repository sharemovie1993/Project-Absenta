import { siswaDb } from '../repositories/siswa.db';

export async function getSiswaHistoryQuery(
  siswaId: string,
  scope: { tenantId: string; org?: any }
): Promise<any[]> {
  const { tenantId, org } = scope;
  if (!siswaId || !tenantId) return [];

  // 1. Verify student exists in tenant
  const student = await siswaDb.siswa.findFirst({
    where: { id: siswaId, tenant_id: tenantId },
    select: { id: true, kelas_id: true, status: true },
  });

  if (!student) {
    return [];
  }

  // 2. Apply Organizational Scoping (skip if tenant_wide or siswa self)
  if (org && org.tenant_wide !== true && org.is_siswa !== true) {
    if (org.is_unit_restricted === true && Array.isArray(org.unit_ids) && org.unit_ids.length > 0) {
      const allowedUnits: string[] = org.unit_ids.map(String);
      const isCurrentlyInUnit = student.kelas_id ? await siswaDb.kelas.findFirst({
        where: { id: student.kelas_id, jurusan_id: { in: allowedUnits } },
        select: { id: true }
      }) : null;
      if (!isCurrentlyInUnit) {
        // Check historical unit enrollment
        const hadUnitHistory = await siswaDb.siswaAkademik.findFirst({
          where: {
            siswa_id: siswaId,
            kelas: { jurusan_id: { in: allowedUnits } }
          },
          select: { id: true }
        });
        if (!hadUnitHistory && !org.is_elevated_context) {
          return [];
        }
      }
    } else {
      const allowedKelasIds: string[] = Array.isArray(org.kelas_ids) ? org.kelas_ids.map((x: any) => String(x)) : [];
      const isCurrentlyAllowed = student.kelas_id && allowedKelasIds.includes(student.kelas_id);
      if (!isCurrentlyAllowed && allowedKelasIds.length > 0) {
        // Check historical class enrollment
        const hadClassHistory = await siswaDb.siswaAkademik.findFirst({
          where: {
            siswa_id: siswaId,
            kelas_id: { in: allowedKelasIds }
          },
          select: { id: true }
        });
        if (!hadClassHistory && !org.is_elevated_context) {
          return [];
        }
      }
    }
  }

  // 3. Fetch academic history with relational data safely
  try {
    const history = await siswaDb.siswaAkademik.findMany({
      where: { siswa_id: siswaId },
      include: {
        kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
        tahunPelajaran: { select: { id: true, tahun: true } },
        semester: { select: { id: true, nama_semester: true } },
      },
      orderBy: [{ tahunPelajaran: { tahun: 'desc' } }, { semester: { nama_semester: 'desc' } }],
    });

    return history || [];
  } catch (error) {
    console.error(`Failed to query siswaAkademik for siswaId ${siswaId}:`, error);
    return [];
  }
}
