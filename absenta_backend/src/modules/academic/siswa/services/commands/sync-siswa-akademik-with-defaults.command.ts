import { siswaDb } from '../repositories/siswa.db';
import { syncSiswaAkademikCommand } from './sync-siswa-akademik.command';

export async function syncSiswaAkademikWithDefaultsCommand(input: {
  tenantId: string;
  tahun_pelajaran_id?: string;
  semester_id?: string;
  kelas_id?: string;
  userId?: string;
}) {
  const tenantId = input.tenantId;
  const kelasId = input.kelas_id ? String(input.kelas_id) : undefined;

  let yearId = input.tahun_pelajaran_id ? String(input.tahun_pelajaran_id) : '';
  if (yearId) {
    const exists = await siswaDb.tahunPelajaran.findFirst({
      where: { id: yearId, tenant_id: tenantId } as any,
      select: { id: true } as any,
    });
    if (!exists) {
      throw new Error('Tahun Pelajaran tidak valid');
    }
  } else {
    const activeYear = await siswaDb.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true } as any,
      select: { id: true } as any,
    });
    if (!activeYear) {
      throw new Error('Tahun Pelajaran aktif tidak ditemukan');
    }
    yearId = String((activeYear as any).id);
  }

  let semId = input.semester_id ? String(input.semester_id) : '';
  if (semId) {
    const exists = await siswaDb.semester.findFirst({
      where: { id: semId, tenant_id: tenantId, tahun_pelajaran_id: yearId } as any,
      select: { id: true } as any,
    });
    if (!exists) {
      throw new Error('Semester tidak valid');
    }
  } else {
    const activeSem = await siswaDb.semester.findFirst({
      where: { tenant_id: tenantId, tahun_pelajaran_id: yearId, is_active: true } as any,
      select: { id: true } as any,
    });
    if (!activeSem) {
      throw new Error('Semester aktif tidak ditemukan');
    }
    semId = String((activeSem as any).id);
  }

  return syncSiswaAkademikCommand(tenantId, yearId, semId, kelasId, input.userId);
}
