import { sesiDb as prisma } from '../repositories/sesi.db';

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
    const gateAbsences = await prisma.absenGerbangSiswa.findMany({
      where: {
        tenant_id: tenantId,
        created_at: { gte: startDay, lte: endDay },
        status: { in: ['SAKIT', 'IZIN', 'ALPA', 'ALFA', 'DISPEN'] },
        OR: [{ kelas_id_snapshot: kelasId }, { Siswa: { kelas_id: kelasId } }],
      },
      select: {
        siswa_id: true,
        status: true,
        waktu_tap: true,
        catatan: true,
      },
    });

    for (const a of gateAbsences) {
      const sa = await prisma.siswaAkademik.findFirst({
        where: {
          siswa_id: a.siswa_id,
          kelas_id: kelasId,
          status: 'AKTIF',
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
            status: normalizedStatus as any,
            siswa_id: a.siswa_id,
            waktu_tap: a.waktu_tap || waktuMulaiFallback,
            asal_gerbang: true,
            catatan: a.catatan || `Tercatat ${normalizedStatus} dari Presensi Gerbang`,
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
            catatan: a.catatan || `Tercatat ${normalizedStatus} dari Presensi Gerbang`,
          },
        });
      }
    }
  } catch (e) {
    console.warn('Auto-propagate gate absences failed', e);
  }
}
