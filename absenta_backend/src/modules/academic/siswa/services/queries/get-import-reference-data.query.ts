import { siswaDb } from '../repositories/siswa.db';

export async function getImportReferenceDataQuery(tenantId: string) {
  const [kelasList, activeYear, activeSemester] = await Promise.all([
    siswaDb.kelas.findMany({
      where: { tenant_id: tenantId } as any,
      select: {
        id: true,
        nama_kelas: true,
        jurusan_id: true,
        Jurusan: { select: { nama: true } }
      } as any,
    }),
    siswaDb.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true } as any,
      select: { id: true } as any,
    }),
    siswaDb.semester.findFirst({
      where: { tenant_id: tenantId, is_active: true } as any,
      select: { id: true } as any,
    }),
  ]);

  return { kelasList, activeYear, activeSemester };
}
