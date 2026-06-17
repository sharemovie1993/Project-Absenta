import { activityLogService } from '@/modules/activity/services/activity-log.service';
import { siswaDb } from '../repositories/siswa.db';

export async function syncSiswaAkademikCommand(
  tenantId: string,
  yearId: string,
  semesterId: string,
  kelasId?: string,
  userId?: string,
): Promise<any> {
  const errors: Array<{ siswa_id: string; reason: string }> = [];

  const siswaList = await siswaDb.siswa.findMany({
    where: {
      tenant_id: tenantId,
      status: 'AKTIF',
      ...(kelasId ? { kelas_id: String(kelasId) } : {}),
    } as any,
    select: { id: true, kelas_id: true } as any,
  });

  if (siswaList.length === 0) {
    return {
      tenant_id: tenantId,
      tahun_pelajaran_id: yearId,
      semester_id: semesterId,
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors,
    };
  }

  const siswaIds = (siswaList as any[]).map((s) => s.id);
  const existingList = await siswaDb.siswaAkademik.findMany({
    where: {
      siswa_id: { in: siswaIds },
      tahun_pelajaran_id: yearId,
      semester_id: semesterId,
    } as any,
    select: { id: true, siswa_id: true, kelas_id: true, status: true } as any,
  });

  const existingBySiswaId = new Map<string, { id: string; kelas_id: string; status: string }>();
  for (const e of existingList as any[]) {
    existingBySiswaId.set(String(e.siswa_id), { id: e.id, kelas_id: String(e.kelas_id), status: String(e.status || '') });
  }

  const createRows: Array<{ siswa_id: string; kelas_id: string; tahun_pelajaran_id: string; semester_id: string; status: any }> = [];
  const updateKelasTargets: Array<{ id: string; kelas_id: string }> = [];
  const updateStatusTargets: Array<{ id: string }> = [];

  for (const s of siswaList as any[]) {
    const sid = String(s.id);
    const kid = String(s.kelas_id || '');
    if (!kid) {
      errors.push({ siswa_id: sid, reason: 'kelas_id kosong' });
      continue;
    }

    const ex = existingBySiswaId.get(sid);
    if (!ex) {
      createRows.push({
        siswa_id: sid,
        kelas_id: kid,
        tahun_pelajaran_id: String(yearId),
        semester_id: String(semesterId),
        status: 'AKTIF',
      });
      continue;
    }

    if (String(ex.kelas_id) !== kid) {
      updateKelasTargets.push({ id: ex.id, kelas_id: kid });
    }
    if (String(ex.status || '').toUpperCase() !== 'AKTIF') {
      updateStatusTargets.push({ id: ex.id });
    }
  }

  let created = 0;
  if (createRows.length > 0) {
    const res = await siswaDb.siswaAkademik.createMany({
      data: createRows as any,
      skipDuplicates: true,
    });
    created = Number((res as any).count || 0);
  }

  let updated = 0;
  for (const t of updateKelasTargets) {
    await siswaDb.siswaAkademik.update({ where: { id: t.id } as any, data: { kelas_id: t.kelas_id } as any });
    updated += 1;
  }
  for (const t of updateStatusTargets) {
    await siswaDb.siswaAkademik.update({ where: { id: t.id } as any, data: { status: 'AKTIF' as any } as any });
    updated += 1;
  }

  // Auto-sync current active academic state (tahun_pelajaran_id & semester_id) to the master Siswa table
  if (siswaIds.length > 0) {
    await siswaDb.siswa.updateMany({
      where: {
        id: { in: siswaIds },
        tenant_id: tenantId,
      } as any,
      data: {
        tahun_pelajaran_id: String(yearId),
        semester_id: String(semesterId),
      } as any,
    });
  }

  const skipped = errors.length;

  if (userId) {
    try {
      const year = await siswaDb.tahunPelajaran.findUnique({ where: { id: yearId }, select: { tahun: true } });
      const semester = await siswaDb.semester.findUnique({ where: { id: semesterId }, select: { nama_semester: true } });
      const kelas = kelasId ? await siswaDb.kelas.findUnique({ where: { id: kelasId }, select: { nama_kelas: true } }) : null;

      activityLogService.logEvent({
        event_type: 'ACADEMIC_STUDENT_SYNC',
        tenant_id: tenantId,
        user_id: userId,
        entity: 'SiswaAkademik',
        entity_id: yearId,
        metadata: {
          tahun_pelajaran_id: yearId,
          tahun_pelajaran_name: year?.tahun || null,
          semester_id: semesterId,
          semester_name: semester?.nama_semester || null,
          kelas_id: kelasId || null,
          kelas_name: kelas?.nama_kelas || null,
          total_synced: created + updated,
          created,
          updated,
          skipped,
        }
      });
    } catch (err) {
      console.error('Failed to log sync-siswa-akademik event:', err);
    }
  }

  return {
    tenant_id: tenantId,
    tahun_pelajaran_id: yearId,
    semester_id: semesterId,
    total: siswaList.length,
    created,
    updated,
    skipped,
    errors,
  };
}

