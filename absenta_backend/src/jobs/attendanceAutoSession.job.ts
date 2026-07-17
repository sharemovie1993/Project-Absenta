import { defineCronJob } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';
import { prisma } from '../utils/prisma';
import { Hari } from '@prisma/client';

/**
 * Helper: dapatkan waktu lokal tenant berdasarkan timezone config.
 * Diekspor untuk dipakai sesi-absensi.controller.ts
 */
export function getTenantLocalTime(timezone: string | null | undefined, now: Date): { dateStr: string; timeZone: string } {
  const tz = timezone || 'Asia/Jakarta';
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const dateStr = formatter.format(now);
  return { dateStr, timeZone: tz };
}

/**
 * Trigger pembuatan sesi untuk satu tenant (dengan menaruhnya di antrean Queue).
 * Diekspor untuk dipakai sesi-absensi.controller.ts dan adhoc scripts.
 */
export async function generateSessionsForTenant(
  tenantId: string,
  dateStr: string,
  timeZone: string
): Promise<{ success: boolean; message: string; [key: string]: any }> {
  const { getAttendanceQueue } = await import('../queues/attendance.queue');
  const q = getAttendanceQueue();
  await q.add('attendance-auto-session-tenant', { tenantId, dateStr, timeZone, ts: Date.now() }, {
    jobId: `attendance-auto-session-${tenantId}-${dateStr}`,
  });
  return { success: true, message: `Sesi untuk tenant ${tenantId} berhasil di-enqueue` };
}

/**
 * Logika Inti: Menghasilkan Sesi Absensi dari Jadwal KBM (JadwalTemplate) riil ke Database.
 * Dipanggil secara asynchronous oleh worker untuk satu tenant.
 */
export async function generateSessionsForTenantDirect(
  tenantId: string,
  dateStr: string,
  timeZone: string
): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    // 1. Dapatkan Hari dalam format enum Hari
    const dayIndexToHari = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const today = new Date(dateStr);
    const hariEnum = dayIndexToHari[today.getDay()] as Hari;

    // Hari Sabtu dan Minggu tidak menghasilkan sesi presensi KBM otomatis
    if (hariEnum === 'SABTU' || hariEnum === 'MINGGU') {
      return { success: true, message: `Hari libur (${hariEnum}), skip pembuatan sesi otomatis.`, count: 0 };
    }

    // 2. Ambil konteks akademik aktif (Tahun Pelajaran & Semester)
    const activeYear = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    if (!activeYear) {
      return { success: false, message: 'Tahun Pelajaran aktif tidak ditemukan.' };
    }

    const activeSemester = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, is_active: true, tahun_pelajaran_id: activeYear.id }
    });
    if (!activeSemester) {
      return { success: false, message: 'Semester aktif tidak ditemukan.' };
    }

    // 3. Cari semua jadwal pelajaran (Jadwal KBM) untuk hari ini
    const schedules = await prisma.jadwalTemplate.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
        hari: hariEnum,
        // Filter guru_id dan mapel_id dihapus agar kegiatan seperti Pembiasaan/Ketarunaan tetap dibuatkan sesinya
      }
    });

    if (schedules.length === 0) {
      return { success: true, message: 'Tidak ada jadwal pelajaran terdaftar untuk hari ini.', count: 0 };
    }

    // Offset timezone lokal
    const TZ_OFFSET: Record<string, number> = {
      'Asia/Jakarta': 7,
      'Asia/Makassar': 8,
      'Asia/Jayapura': 9
    };
    const offset = TZ_OFFSET[timeZone] ?? 7;

    let createdCount = 0;

    for (const schedule of schedules) {
      // Kombinasikan string tanggal dan waktu ke Date UTC
      const startMulai = new Date(new Date(`${dateStr}T${schedule.jam_mulai}:00.000Z`).getTime() - (offset * 60 * 60 * 1000));
      const startSelesai = new Date(new Date(`${dateStr}T${schedule.jam_selesai}:00.000Z`).getTime() - (offset * 60 * 60 * 1000));
      const tanggalTgl = new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - (offset * 60 * 60 * 1000));

      // Hindari pembuatan sesi ganda (idempotency check)
      const existing = await prisma.sesiAbsensi.findFirst({
        where: {
          tenant_id: tenantId,
          kelas_id: schedule.kelas_id,
          guru_id: schedule.guru_id,
          mapel_id: schedule.mapel_id,
          waktu_mulai: startMulai,
          tanggal: tanggalTgl
        }
      });

      if (!existing) {
        // Buat sesi absensi
        const created = await prisma.sesiAbsensi.create({
          data: {
            tenant_id: tenantId,
            kelas_id: schedule.kelas_id,
            guru_id: schedule.guru_id,
            mapel_id: schedule.mapel_id,
            semester_id: schedule.semester_id,
            tahun_pelajaran_id: schedule.tahun_pelajaran_id,
            tanggal: tanggalTgl,
            waktu_mulai: startMulai,
            waktu_selesai: startSelesai,
            jenis_kegiatan: schedule.jenis_kegiatan || 'KBM',
            sumber_sesi: 'TEMPLATE',
            jadwal_template_id: schedule.id,
            status: 'BERLANGSUNG',
          }
        });

        // Inisialisasi daftar hadir guru (AbsenGuru)
        if (schedule.guru_id) {
          await prisma.absenGuru.create({
            data: {
              tenant_id: tenantId,
              sesi_id: created.id,
              guru_id: schedule.guru_id,
              status: 'Belum Hadir',
              tahun_pelajaran_id: schedule.tahun_pelajaran_id,
              semester_id: schedule.semester_id
            }
          });
        }

        createdCount++;
      }
    }

    return { success: true, message: `Sesi otomatis berhasil dibuat. Total: ${createdCount}`, count: createdCount };
  } catch (err: any) {
    appLogger.error({ err, tenantId }, 'Gagal menjalankan generateSessionsForTenantDirect');
    return { success: false, message: err.message || 'Internal error saat membuat sesi' };
  }
}

/**
 * Jalankan satu siklus pembuatan sesi otomatis untuk semua tenant aktif.
 * Meng-query seluruh tenant dan mengantrekan proses per-tenant.
 */
export async function runAttendanceAutoSessionCycle(): Promise<void> {
  const { systemConfigService } = await import('../modules/system-config/services/system-config.service');

  const activeTenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true }
  });

  for (const tenant of activeTenants) {
    const cfg = await systemConfigService.getActive(tenant.id);
    const { dateStr, timeZone } = getTenantLocalTime(cfg?.timezone, new Date());
    await generateSessionsForTenant(tenant.id, dateStr, timeZone);
  }
  
  appLogger.info({ tenantsCount: activeTenants.length }, 'Siklus pembuatan sesi otomatis telah di-enqueue untuk seluruh tenant aktif.');
}

export default defineCronJob({
  name: 'attendanceAutoSession',
  schedule: '0 1 * * *', // Dijalankan pukul 01:00 pagi setiap hari
  lockTtlSeconds: 300,
  async run() {
    await runAttendanceAutoSessionCycle();
    appLogger.debug({ job: 'attendanceAutoSession' }, 'attendanceAutoSession: cron cycle executed');
  },
});
