import { sesiDb as prisma } from '../repositories/sesi.db';
import { JenisTap } from '@/constants/enums';

export async function propagateGateAbsencesForNewSessionCommand(input: {
  tenantId: string;
  startDay: Date;
  endDay: Date;
  kelasId: string;
  session: any;
  waktuMulaiFallback: Date;
}) {
  const { tenantId, startDay, endDay, kelasId, session, waktuMulaiFallback } = input;

  try {
    const gateSession = await prisma.sesiGerbang.findFirst({
      where: { tenant_id: tenantId, tanggal: { gte: startDay, lte: endDay } },
      select: { id: true },
    });

    if (!gateSession) return;

    const gateAbsences = await prisma.absenGerbangSiswa.findMany({
      where: {
        tenant_id: tenantId,
        sesi_gerbang_id: gateSession.id,
        arah: { in: [JenisTap.GERBANG_DATANG, 'MASUK'] },
        status: { in: ['SAKIT', 'IZIN', 'ALPA', 'ALFA', 'DISPEN'] },
        OR: [{ kelas_id_snapshot: kelasId }, { Siswa: { kelas_id: kelasId } }],
      },
      select: {
        siswa_id: true,
        status: true,
        waktu_tap: true,
      },
    });

    for (const a of gateAbsences) {
      const sa = await prisma.siswaAkademik.findFirst({
        where: {
          siswa_id: a.siswa_id,
          tahun_pelajaran_id: session.tahun_pelajaran_id,
          semester_id: session.semester_id,
        },
        select: { id: true },
      });
      if (!sa) continue;

      const normalizedStatus = String(a.status || '').toUpperCase() === 'ALFA' ? 'ALPA' : a.status;

      const existing = await prisma.absenSiswa.findFirst({
        where: { tenant_id: tenantId, sesi_id: session.id, siswa_akademik_id: sa.id },
        select: { id: true, created_at: true },
      });

      if (existing) {
        await prisma.absenSiswa.update({
          where: { id_created_at: { id: existing.id, created_at: (existing as any).created_at } },
          data: {
            status: normalizedStatus,
            siswa_id: a.siswa_id,
            waktu_tap: a.waktu_tap || waktuMulaiFallback,
            asal_gerbang: true,
            updated_at: new Date(),
          },
        });
      } else {
        await prisma.absenSiswa.create({
          data: {
            tenant_id: tenantId,
            sesi_id: session.id,
            siswa_id: a.siswa_id,
            siswa_akademik_id: sa.id,
            status: normalizedStatus as any,
            waktu_tap: a.waktu_tap || waktuMulaiFallback,
            asal_gerbang: true,
            kelas_id_snapshot: kelasId,
            tahun_pelajaran_id_snapshot: session.tahun_pelajaran_id || null,
          },
        });
      }
    }
  } catch (e) {
    console.warn('Auto-propagate gate absences failed', e);
  }
}
