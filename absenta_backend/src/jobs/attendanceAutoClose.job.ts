import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';
import { prisma } from '../utils/prisma';
import { emitDomainEvent } from '../infra/event-bus';

/**
 * Jalankan satu siklus auto-close sesi kehadiran.
 * Diekspor untuk backward compatibility dengan attendance.worker.ts
 */
export async function runAttendanceAutoCloseCycle(): Promise<void> {
  const now = new Date();
  appLogger.info({ job: 'attendanceAutoClose' }, 'Memulai siklus auto-close sesi...');

  // 1. Cari SesiAbsensi yang masih BERLANGSUNG dan sudah melewati waktu_selesai
  const hangingSessions = await prisma.sesiAbsensi.findMany({
    where: {
      status: 'BERLANGSUNG',
      waktu_selesai: { lt: now }
    },
    include: {
      Kelas: { select: { id: true, nama_kelas: true } },
      Tenant: { select: { id: true } }
    }
  });

  appLogger.info({ job: 'attendanceAutoClose', count: hangingSessions.length }, `Ditemukan ${hangingSessions.length} sesi absensi menggantung`);

  for (const session of hangingSessions) {
    try {
      await finalizeSessionAndNotify(session.id, session.tenant_id);
      appLogger.info({ job: 'attendanceAutoClose', sessionId: session.id }, `Sesi ${session.id} berhasil ditutup otomatis`);
    } catch (err) {
      appLogger.error({ job: 'attendanceAutoClose', sessionId: session.id, error: err }, `Gagal menutup sesi ${session.id}`);
    }
  }

  // 2. Cari SesiGerbang yang belum ditutup (biasanya di akhir hari)
  // SesiGerbang biasanya ditutup jika sudah lewat jam operasional gerbang (misal 18:00)
  const hangingGates = await prisma.sesiGerbang.findMany({
    where: {
      status: 'OPEN'
    }
  });

  for (const gate of hangingGates) {
    // Check updated_at if it's more than 12 hours ago
    const updatedAt = new Date((gate as any).updated_at || (gate as any).created_at || gate.tanggal);
    if (now.getTime() - updatedAt.getTime() > 12 * 60 * 60 * 1000) {
      await prisma.sesiGerbang.update({
        where: { id: gate.id },
        data: { status: 'CLOSED' }
      });
    }
  }
}

/**
 * Finalisasi sesi dan isi absen ALPA untuk siswa yang tidak hadir
 */
async function finalizeSessionAndNotify(sessionId: string, tenantId: string) {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.sesiAbsensi.findUnique({
      where: { id: sessionId },
      include: {
        Kelas: { include: { SiswaAkademik: { where: { status: 'AKTIF' } } } }
      }
    });

    if (!session || session.status === 'SELESAI') return;

    // 1. Update status sesi
    await tx.sesiAbsensi.update({
      where: { id: sessionId },
      data: { status: 'SELESAI', is_auto_closed: true }
    });

    // 2. Cari siswa yang sudah punya record absen (HADIR/IZIN/SAKIT/dll)
    const existingAbsents = await tx.absenSiswa.findMany({
      where: { sesi_id: sessionId },
      select: { siswa_akademik_id: true }
    });
    const existingIds = new Set(existingAbsents.map(a => a.siswa_akademik_id));

    // 3. Sisanya tandai ALPA
    const students = session.Kelas.SiswaAkademik || [];
    const alpaData = students
      .filter(s => !existingIds.has(s.id))
      .map(s => ({
        tenant_id: tenantId,
        sesi_id: sessionId,
        siswa_akademik_id: s.id,
        status: 'ALPA',
        waktu_tap: null,
        tahun_pelajaran_id: session.tahun_pelajaran_id,
        semester_id: session.semester_id,
        keterangan: 'Auto-closed by system'
      }));

    if (alpaData.length > 0) {
      await tx.absenSiswa.createMany({ data: alpaData });
    }

    // 4. Update AbsenGuru jika belum hadir
    if (session.guru_id) {
      await tx.absenGuru.updateMany({
        where: { sesi_id: sessionId, status: 'Belum Hadir' },
        data: { status: 'ALPA' }
      });
    }

    // 5. Emit Event untuk notifikasi
    await emitDomainEvent({
      event_type: 'attendance.session.auto_closed',
      tenant_id: tenantId,
      source_service: 'attendance',
      payload: { sessionId, tenantId }
    });
  });
}

export default defineCronJob({
  name: 'attendanceAutoClose',
  schedule: '*/15 * * * *', // Setiap 15 menit
  lockTtlSeconds: 60,
  async run() {
    await runAttendanceAutoCloseCycle();
  },
});
