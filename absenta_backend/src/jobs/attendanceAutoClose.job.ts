import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';
import { prisma } from '../utils/prisma';
import { emitDomainEvent } from '../infra/event-bus';
import { ATTENDANCE_POINTS } from '../constants/attendance-points';
import { systemConfigService } from '../modules/system-config/services/system-config.service';

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
      status: { in: ['OPEN', 'BERLANGSUNG'] }
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
 * Finalisasi sesi dan isi absen ALPA untuk siswa dan guru yang tidak hadir (Hanya yang berstatus AKTIF)
 */
async function finalizeSessionAndNotify(sessionId: string, tenantId: string) {
  return await prisma.$transaction(async (tx) => {
    const session = await tx.sesiAbsensi.findUnique({
      where: { id: sessionId },
      include: {
        Kelas: true,
        Guru: {
          select: {
            id: true,
            User: { select: { status: true } }
          }
        }
      }
    });

    if (!session || session.status === 'SELESAI') return;

    // 1. Update status sesi
    await tx.sesiAbsensi.update({
      where: { id: sessionId },
      data: { status: 'SELESAI', is_auto_closed: true, updated_at: new Date() }
    });

    // 2. Query HANYA siswa yang AKTIF di rombel kelas, tahun ajaran, dan semester terkait
    const saWhere: any = {
      kelas_id: session.kelas_id,
      status: 'AKTIF',
      siswa: {
        status: 'AKTIF'
      }
    };
    if (session.tahun_pelajaran_id && session.tahun_pelajaran_id !== 'default-tp') {
      saWhere.tahun_pelajaran_id = session.tahun_pelajaran_id;
    }
    if (session.semester_id && session.semester_id !== 'default-sem') {
      saWhere.semester_id = session.semester_id;
    }

    let rawStudents = await tx.siswaAkademik.findMany({
      where: saWhere,
      select: { id: true, siswa_id: true }
    });

    if (rawStudents.length === 0) {
      rawStudents = await tx.siswaAkademik.findMany({
        where: {
          kelas_id: session.kelas_id,
          status: 'AKTIF',
          siswa: {
            status: 'AKTIF'
          }
        },
        select: { id: true, siswa_id: true }
      });
    }

    // Deduplicate by siswa_id agar riwayat multi-tahun tidak melipatgandakan data siswa
    const uniqueMap = new Map<string, typeof rawStudents[0]>();
    rawStudents.forEach(s => {
      if (s.siswa_id && !uniqueMap.has(s.siswa_id)) {
        uniqueMap.set(s.siswa_id, s);
      }
    });
    const students = Array.from(uniqueMap.values());

    // 3. Cari siswa yang sudah punya record absen (HADIR/IZIN/SAKIT/dll)
    const existingAbsents = await tx.absenSiswa.findMany({
      where: { sesi_id: sessionId },
      select: { siswa_akademik_id: true }
    });
    const existingIds = new Set(existingAbsents.map(a => a.siswa_akademik_id));

    // 4. Sisanya tandai ALPA atau IZIN (Jika ada izin keluar piket)
    const missingStudents = students.filter(s => !existingIds.has(s.id));

    if (missingStudents.length > 0) {
      const missingIds = missingStudents.map(s => s.id);

      // Cek Izin Keluar yang aktif selama sesi berlangsung
      const activePermits = await tx.izinKeluarSiswa.findMany({
        where: {
          siswa_akademik_id: { in: missingIds },
          tenant_id: tenantId,
          jam_keluar: { lt: session.waktu_selesai || new Date() },
          OR: [
            { jam_kembali: null },
            { jam_kembali: { gt: session.waktu_mulai } }
          ]
        },
        select: { 
          siswa_akademik_id: true, 
          alasan: true,
          tipe_izin: true,
          jam_keluar: true,
          jam_kembali: true
        }
      });

      const sysCfg = await systemConfigService.getActive(tenantId);
      const maxIzinMenit = sysCfg?.max_izin_sementara_menit ?? 45;

      const studentPermitMap = new Map(activePermits.map(p => [p.siswa_akademik_id, p]));

      const autoAttendanceData = missingStudents.map(s => {
         const permit = studentPermitMap.get(s.id);
         let isIzin = !!permit;
         let finalCatatan = permit ? `[PIKET] ${permit.alasan}` : 'Auto-marked ALPA on session close';
         let finalStatus = isIzin ? 'IZIN' : 'ALPA';

         // SMART TIMEOUT LOGIC
         if (permit && permit.tipe_izin === 'IZIN_KELUAR' && !permit.jam_kembali) {
           const waktuSelesaiSesi = session.waktu_selesai || new Date();
           const diffMenit = Math.floor((waktuSelesaiSesi.getTime() - permit.jam_keluar.getTime()) / (1000 * 60));
           
           if (diffMenit > maxIzinMenit) {
             isIzin = false;
             finalStatus = 'ALPA';
             finalCatatan = `[BOLOS] Izin keluar sementara melebihi batas ${maxIzinMenit} menit (Durasi: ${diffMenit}m)`;
           }
         }

         return {
           tenant_id: tenantId,
           sesi_id: sessionId,
           siswa_id: s.siswa_id || null,
           siswa_akademik_id: s.id,
           status: finalStatus,
           waktu_tap: null,
           asal_gerbang: false,
           poin_kehadiran: isIzin ? ATTENDANCE_POINTS.IZIN : ATTENDANCE_POINTS.ALPA,
           kelas_id_snapshot: session.kelas_id,
           kelas_nama_snapshot: session.Kelas?.nama_kelas || null,
           tingkat_snapshot: session.Kelas?.tingkat || null,
           tahun_pelajaran_id_snapshot: session.tahun_pelajaran_id,
           catatan: finalCatatan
         };
       });

      await tx.absenSiswa.createMany({ data: autoAttendanceData });
    }

    // 5. Update AbsenGuru jika belum hadir — HANYA JIKA GURU BERSTATUS AKTIF!
    if (session.guru_id) {
      const isGuruActive = !session.Guru?.User || session.Guru.User.status === 'ACTIVE';
      if (isGuruActive) {
        await tx.absenGuru.updateMany({
          where: { 
            sesi_id: sessionId, 
            status: { in: ['Belum Hadir', 'BELUM_HADIR'] } 
          },
          data: { status: 'ALPA' }
        });
      }
    }

    // 6. Emit Event untuk notifikasi
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
