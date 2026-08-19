import { defineCronJob, PLATFORM_TIMEZONE } from '../infra/jobEngine';
import { appLogger } from '../utils/app-logger';
import { prisma } from '../utils/prisma';
import { Hari } from '@prisma/client';
import { getTenantTimezone, TZ_OFFSET } from '../utils/timezone.utils';

/**
 * Helper: dapatkan waktu lokal tenant berdasarkan timezone config.
 * Diekspor untuk dipakai sesi-absensi.controller.ts
 */
export function getTenantLocalTime(timezone: string | null | undefined, now: Date): { dateStr: string; timeZone: string } {
  const tz = timezone || PLATFORM_TIMEZONE;
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
 * Logika Inti: Menghasilkan Sesi Absensi dari Jadwal KBM (JadwalKBM) riil ke Database.
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

    // 1.5. Ambil konfigurasi tenant (termasuk hari sekolah)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { hari_sekolah: true, name: true }
    });

    if (!tenant) {
      return { success: false, message: `Tenant ${tenantId} tidak ditemukan.` };
    }

    // Cek Kejadian Khusus (Bencana/Libur Darurat)
    const specialEvents = await prisma.absensiKejadianKhusus.findMany({
      where: { tenant_id: tenantId, tanggal: today }
    });

    // Jika ada kejadian khusus GLOBAL dengan mode LIBUR, skip seluruh sekolah
    const globalLibur = specialEvents.find(e => !e.kelas_id && e.mode_kejadian === 'LIBUR');
    if (globalLibur) {
      return { success: true, message: `Sekolah diliburkan secara GLOBAL (Kejadian Khusus: ${globalLibur.keterangan}), skip pembuatan sesi.`, count: 0 };
    }

    // Buat map untuk pengecekan cepat kejadian khusus per kelas
    const classEventsMap = new Map<string, any>();
    specialEvents.forEach(e => {
      if (e.kelas_id) classEventsMap.set(e.kelas_id, e);
    });

    // Cek Kalender Akademik (Libur Terjadwal)
    const academicHoliday = await prisma.kalenderAkademik.findFirst({
      where: {
        tenant_id: tenantId,
        tanggal_mulai: { lte: today },
        tanggal_selesai: { gte: today },
        jenis: { startsWith: 'LIBUR' }
      }
    });

    if (academicHoliday) {
      return { success: true, message: `Hari libur terjadwal (${academicHoliday.judul}), skip pembuatan sesi otomatis.`, count: 0 };
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

    // Offset timezone lokal
    const offset = TZ_OFFSET[timeZone] ?? 7;

    let createdCount = 0;

    // --- KBM GENERATION SECTION ---
    // Hanya generate KBM jika hari ini adalah Hari Sekolah/Operasional Tenant
    if (tenant.hari_sekolah.includes(hariEnum)) {
      // 3. Cari semua jadwal pelajaran (Jadwal KBM) untuk hari ini (Hanya jenis_kegiatan = KBM)
      const schedules = await prisma.jadwalKBM.findMany({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: activeYear.id,
          semester_id: activeSemester.id,
          hari: hariEnum,
          jenis_kegiatan: 'KBM'
        }
      });

      if (schedules.length > 0) {
        // Group and merge consecutive slots for the same class + guru + mapel + jenis_kegiatan
        const grouped: Record<string, typeof schedules> = {};
        for (const s of schedules) {
          if (!s.mapel_id && !s.guru_id) continue;
          const key = `${s.kelas_id}-${s.guru_id || 'none'}-${s.mapel_id || 'none'}-${s.jenis_kegiatan || 'KBM'}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(s);
        }

        const mergedSchedules: typeof schedules = [];

        for (const key in grouped) {
          const slots = grouped[key];
          slots.sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));

          let current = { ...slots[0] };

          for (let i = 1; i < slots.length; i++) {
            const next = slots[i];
            const [currH, currM] = current.jam_selesai.split(':').map(Number);
            const [nextH, nextM] = next.jam_mulai.split(':').map(Number);
            const currMins = (currH || 0) * 60 + (currM || 0);
            const nextMins = (nextH || 0) * 60 + (nextM || 0);
            const gap = nextMins - currMins;

            if (gap <= 35) {
              current.jam_selesai = next.jam_selesai;
            } else {
              mergedSchedules.push(current);
              current = { ...next };
            }
          }
          mergedSchedules.push(current);
        }

        for (const schedule of mergedSchedules) {
          const classEvent = classEventsMap.get(schedule.kelas_id);
          if (classEvent && classEvent.mode_kejadian === 'LIBUR') {
            continue;
          }

          const startMulai = new Date(new Date(`${dateStr}T${schedule.jam_mulai}:00.000Z`).getTime() - (offset * 60 * 60 * 1000));
          const startSelesai = new Date(new Date(`${dateStr}T${schedule.jam_selesai}:00.000Z`).getTime() - (offset * 60 * 60 * 1000));
          const tanggalTgl = new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - (offset * 60 * 60 * 1000));

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
                jadwal_kbm_id: schedule.id,
                status: 'MENDATANG',
              }
            });

            if (schedule.guru_id) {
              // Cek apakah guru memiliki izin yang sudah disetujui (Approved) untuk hari ini
              const approvedIzin = await prisma.permohonanIzinGuru.findFirst({
                where: {
                  tenant_id: tenantId,
                  guru_id: schedule.guru_id,
                  status: 'DISETUJUI',
                  tanggal_mulai: { lte: tanggalTgl },
                  tanggal_selesai: { gte: tanggalTgl }
                }
              });

              let initialStatus = 'Belum Hadir';
              let catatanIzin: string | null = null;

              if (approvedIzin) {
                if (approvedIzin.tipe_durasi === 'SEBAGIAN_SESI' && approvedIzin.jam_mulai && approvedIzin.jam_selesai) {
                  if (schedule.jam_mulai < approvedIzin.jam_selesai && schedule.jam_selesai > approvedIzin.jam_mulai) {
                    initialStatus = approvedIzin.tipe_izin === 'SAKIT' ? 'SAKIT' : (approvedIzin.tipe_izin === 'DINAS_LUAR' ? 'PENUGASAN' : 'IZIN');
                    catatanIzin = `Izin Disetujui: ${approvedIzin.alasan}`;
                  }
                } else {
                  initialStatus = approvedIzin.tipe_izin === 'SAKIT' ? 'SAKIT' : (approvedIzin.tipe_izin === 'DINAS_LUAR' ? 'PENUGASAN' : 'IZIN');
                  catatanIzin = `Izin Disetujui: ${approvedIzin.alasan}`;
                }
              }

              await prisma.absenGuru.create({
                data: {
                  tenant_id: tenantId,
                  sesi_id: created.id,
                  guru_id: schedule.guru_id,
                  status: initialStatus,
                  catatan: catatanIzin,
                  tahun_pelajaran_id: schedule.tahun_pelajaran_id,
                  semester_id: schedule.semester_id
                }
              });
            }
            createdCount++;
          } else if (existing.waktu_selesai?.getTime() !== startSelesai.getTime()) {
            await prisma.sesiAbsensi.update({
              where: { id: existing.id },
              data: { waktu_selesai: startSelesai }
            });
          }
        }
      }
    }

    // 4. Cari dan generate sesi dari JadwalKegiatan untuk hari ini
    const activeKegiatans = await prisma.jadwalKegiatan.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: activeYear.id,
        aktif: true,
        berlaku_mulai: { lte: today },
        OR: [
          { berlaku_sampai: null },
          { berlaku_sampai: { gte: today } }
        ],
        hari: { has: hariEnum }
      }
    });

    for (const kegiatan of activeKegiatans) {
      let targetKelasIds: string[] = [];
      if (kegiatan.target_semua_kelas) {
        const allKelas = await prisma.kelas.findMany({
          where: { tenant_id: tenantId, is_active: true },
          select: { id: true }
        });
        targetKelasIds = allKelas.map(k => k.id);
      } else {
        targetKelasIds = kegiatan.target_kelas_ids;
      }

      const startMulai = new Date(new Date(`${dateStr}T${kegiatan.waktu_mulai}:00.000Z`).getTime() - (offset * 60 * 60 * 1000));
      const startSelesai = kegiatan.waktu_selesai 
        ? new Date(new Date(`${dateStr}T${kegiatan.waktu_selesai}:00.000Z`).getTime() - (offset * 60 * 60 * 1000))
        : new Date(startMulai.getTime() + 60 * 60 * 1000);

      const tanggalTgl = new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() - (offset * 60 * 60 * 1000));

      for (const kelasId of targetKelasIds) {
        const classEvent = classEventsMap.get(kelasId);
        if (classEvent && classEvent.mode_kejadian === 'LIBUR') {
          continue;
        }

        const existing = await prisma.sesiAbsensi.findFirst({
          where: {
            tenant_id: tenantId,
            kelas_id: kelasId,
            waktu_mulai: startMulai,
            tanggal: tanggalTgl,
            jadwal_kegiatan_id: kegiatan.id
          }
        });

        if (!existing) {
          await prisma.sesiAbsensi.create({
            data: {
              tenant_id: tenantId,
              kelas_id: kelasId,
              semester_id: activeSemester.id,
              tahun_pelajaran_id: activeYear.id,
              tanggal: tanggalTgl,
              waktu_mulai: startMulai,
              waktu_selesai: startSelesai,
              jenis_kegiatan: kegiatan.nama,
              sumber_sesi: 'TEMPLATE',
              jadwal_kegiatan_id: kegiatan.id,
              status: 'MENDATANG'
            }
          });
          createdCount++;
        }
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
  const activeTenants = await prisma.tenant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true }
  });

  for (const tenant of activeTenants) {
    const tz = await getTenantTimezone(tenant.id);
    const { dateStr, timeZone } = getTenantLocalTime(tz, new Date());
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
