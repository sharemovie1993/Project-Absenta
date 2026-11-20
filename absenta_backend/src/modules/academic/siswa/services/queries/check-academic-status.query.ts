import { siswaDb } from '../repositories/siswa.db';

export async function checkAcademicStatusQuery(
  tenantId: string,
  studentIds: string[],
  yearId: string,
  semesterId: string,
): Promise<Record<string, { status: string; kelas_id: string; nama_kelas: string | null } | null>> {
  const map: Record<string, any> = {};
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
    select: { 
      siswa_id: true, 
      status: true,
      kelas_id: true,
      kelas: {
        select: {
          id: true,
          nama_kelas: true,
        }
      }
    } as any,
  });

  for (const r of rows as any) {
    map[String(r.siswa_id)] = {
      status: r.status ? String(r.status) : 'AKTIF',
      kelas_id: String(r.kelas_id),
      nama_kelas: r.kelas?.nama_kelas || null,
    };
  }
  return map;
}

