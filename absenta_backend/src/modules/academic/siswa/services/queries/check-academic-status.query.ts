import { siswaDb } from '../repositories/siswa.db';

export async function checkAcademicStatusQuery(
  tenantId: string,
  studentIds: string[],
  yearId: string,
  semesterId: string,
): Promise<Record<string, string | null>> {
  const map: Record<string, string | null> = {};
  for (const id of studentIds || []) map[String(id)] = null;
  if (!tenantId || !yearId || !semesterId || !studentIds || studentIds.length === 0) return map;

  const rows = await siswaDb.siswaAkademik.findMany({
    where: {
      tahun_pelajaran_id: String(yearId),
      semester_id: String(semesterId),
      siswa: {
        tenant_id: String(tenantId),
        id: { in: studentIds.map(String) },
      },
    } as any,
    select: { siswa_id: true, status: true } as any,
  });

  for (const r of rows as any) {
    map[String(r.siswa_id)] = r.status ? String(r.status) : null;
  }
  return map;
}

