import { siswaDb } from '../repositories/siswa.db';

export async function getAcademicRegistrationStatsQuery(
  tenantId: string,
  yearId: string,
  semesterId: string,
  dataScope?: any,
): Promise<{ registered: number; total_active: number }> {
  // Build scoped where clause for siswa using dataScope.kelasIds
  const kelasIds = dataScope?.kelasIds;
  const tenantWide = dataScope?.tenantWide;
  
  const siswaWhere: any = { tenant_id: String(tenantId), status: 'AKTIF' };
  if (Array.isArray(kelasIds) && kelasIds.length > 0 && !tenantWide) {
    siswaWhere.kelas_id = { in: kelasIds };
  }

  const totalActive = await siswaDb.siswa.count({
    where: siswaWhere as any,
  });

  const registered = await siswaDb.siswaAkademik.count({
    where: {
      tahun_pelajaran_id: String(yearId),
      semester_id: String(semesterId),
      siswa: {
        ...siswaWhere,
        tahun_pelajaran_id: String(yearId),
        semester_id: String(semesterId),
      },
    } as any,
  });

  return { registered, total_active: totalActive };
}
