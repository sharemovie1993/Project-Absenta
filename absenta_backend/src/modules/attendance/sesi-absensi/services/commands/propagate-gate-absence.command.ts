import { sesiDb } from '../repositories/sesi.db';

export async function propagateGateAbsenceToSessions(params: {
  tenantId: string;
  siswaId: string;
  status: string;
  waktuTap: Date;
  tahunPelajaranId?: string;
  semesterId?: string;
}): Promise<void> {
  const { tenantId, siswaId, status, waktuTap, tahunPelajaranId, semesterId } = params;

  try {
    const siswa = await sesiDb.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId } as any,
      select: { kelas_id: true } as any,
    });
    if (!siswa?.kelas_id) return;

    let tpId = tahunPelajaranId;
    let semId = semesterId;
    if (!tpId || !semId) {
      const activeYear = await sesiDb.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } } as any);
      if (!activeYear) return;
      tpId = (activeYear as any).id;

      const activeSem = await sesiDb.semester.findFirst({ where: { tenant_id: tenantId, tahun_pelajaran_id: tpId, is_active: true } } as any);
      if (!activeSem) return;
      semId = (activeSem as any).id;
    }

    const sa = await sesiDb.siswaAkademik.findFirst({
      where: {
        siswa_id: siswaId,
        tahun_pelajaran_id: tpId,
        semester_id: semId,
      } as any,
      select: { id: true } as any,
    });
    if (!sa) return;

    const dayStart = new Date(waktuTap);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(waktuTap);
    dayEnd.setHours(23, 59, 59, 999);

    const sessions = await sesiDb.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: siswa.kelas_id,
        tanggal: {
          gte: new Date(dayStart.getTime() - 12 * 3600 * 1000),
          lte: new Date(dayEnd.getTime() + 12 * 3600 * 1000),
        },
        status: 'BERLANGSUNG',
      } as any,
      select: { id: true, waktu_mulai: true, tahun_pelajaran_id: true, semester_id: true } as any,
    });

    for (const sess of sessions as any) {
      if (sess.tahun_pelajaran_id !== tpId || sess.semester_id !== semId) continue;

      const normalizedStatus = String(status || '').toUpperCase() === 'ALFA' ? 'ALPA' : status;

      const existing = await sesiDb.absenSiswa.findFirst({
        where: { tenant_id: tenantId, sesi_id: sess.id, siswa_akademik_id: (sa as any).id } as any,
        select: { id: true, created_at: true } as any,
      });

      if (existing) {
        await sesiDb.absenSiswa.update({
          where: { id_created_at: { id: (existing as any).id, created_at: (existing as any).created_at } } as any,
          data: {
            status: normalizedStatus as any,
            waktu_tap: waktuTap,
            asal_gerbang: true,
            updated_at: new Date(),
          } as any,
        });
      } else {
        await sesiDb.absenSiswa.create({
          data: {
            tenant_id: tenantId,
            sesi_id: sess.id,
            siswa_akademik_id: (sa as any).id,
            status: normalizedStatus as any,
            waktu_tap: waktuTap,
            asal_gerbang: true,
            kelas_id_snapshot: siswa.kelas_id,
            tahun_pelajaran_id_snapshot: tpId,
          } as any,
        });
      }
    }
  } catch (e) {
    console.warn('Propagate gate absence granular failed', e);
  }
}

