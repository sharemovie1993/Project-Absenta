import { rekapImplService } from './rekap-impl.service';
import { prisma } from '../../../../utils/prisma';
import { CacheService } from '../../../../utils/cache.service';
import { CACHE_KEYS } from '../../../../constants/cache-keys';
import { formatTenantTime, getTenantTimezone, getTenantDayRange } from '../../../../utils/timezone.utils';

const cacheService = CacheService.getInstance();

export class GuruRekapService {
  private static instance: GuruRekapService;

  public static getInstance(): GuruRekapService {
    if (!GuruRekapService.instance) {
      GuruRekapService.instance = new GuruRekapService();
    }
    return GuruRekapService.instance;
  }

  async getRekapPresensiGuruByGuruId(guruId: string, namaGuru: string) {
    return rekapImplService.getRekapPresensiGuruByGuruId(guruId, namaGuru);
  }

  async getRekapHarianGuru(tanggal: string, tenantId: string, guruId?: string) {
    const tenantTimezone = await getTenantTimezone(tenantId);
    const { startOfDay, endOfDay } = getTenantDayRange(tanggal, tenantTimezone);

    const where: any = {
      tenant_id: tenantId,
      created_at: { gte: startOfDay, lte: endOfDay }
    };
    if (guruId) where.guru_id = guruId;

    const absenList = await prisma.absenGuru.findMany({
      where,
      select: {
        id: true,
        guru_id: true,
        status: true,
        waktu_tap: true,
        catatan: true,
        Guru: { select: { nama_guru: true, nip: true } },
        SesiAbsensi: {
          select: {
            jenis_kegiatan: true,
            Mapel: { select: { nama_mapel: true } },
            Kelas: { select: { nama_kelas: true } }
          }
        }
      },
      orderBy: { waktu_tap: 'asc' }
    });

    return absenList.map(absen => ({
      id: absen.id,
      guru_id: absen.guru_id,
      nama_guru: absen.Guru?.nama_guru || '-',
      nip: absen.Guru?.nip || '-',
      status: absen.status,
      waktu_tap: absen.waktu_tap ? formatTenantTime(absen.waktu_tap, tenantTimezone) : null,
      waktu_tap_iso: absen.waktu_tap ? absen.waktu_tap.toISOString() : null,
      kegiatan: absen.SesiAbsensi?.Mapel?.nama_mapel || absen.SesiAbsensi?.jenis_kegiatan || 'Sesi Mengajar',
      kelas: absen.SesiAbsensi?.Kelas?.nama_kelas || '-',
      catatan: absen.catatan
    }));
  }

  async getTrackingHarianGuru(guruId: string, tanggal: string, tenantId: string) {
    const tenantTimezone = await getTenantTimezone(tenantId);

    const guru = await prisma.guru.findFirst({
      where: {
        tenant_id: tenantId,
        OR: [
          { id: guruId },
          { user_id: guruId }
        ]
      },
      select: { id: true, nama_guru: true, nip: true }
    });

    if (!guru) {
      return {
        success: true,
        data: {
          guru_id: guruId,
          nama_guru: 'Pengajar',
          status: 'BELUM_HADIR',
          timeline: []
        }
      };
    }

    const realGuruId = guru.id;
    const { startOfDay, endOfDay } = getTenantDayRange(tanggal, tenantTimezone);

    const gateTaps = await prisma.absenGerbangGuru.findMany({
      where: {
        guru_id: realGuruId,
        tenant_id: tenantId,
        waktu_tap: { gte: startOfDay, lte: endOfDay }
      },
      select: { id: true, arah: true, status: true, is_terlambat: true, waktu_tap: true },
      orderBy: { waktu_tap: 'asc' }
    });

    const classTaps = await prisma.absenGuru.findMany({
      where: {
        guru_id: realGuruId,
        tenant_id: tenantId,
        waktu_tap: { gte: startOfDay, lte: endOfDay }
      },
      select: {
        id: true,
        status: true,
        waktu_tap: true,
        catatan: true,
        SesiAbsensi: {
          select: {
            id: true,
            jenis_kegiatan: true,
            Mapel: { select: { nama_mapel: true } },
            Kelas: { select: { nama_kelas: true } }
          }
        }
      },
      orderBy: { waktu_tap: 'asc' }
    });

    const timeline: any[] = [];

    gateTaps.forEach(gate => {
      if (gate.waktu_tap) {
        timeline.push({
          type: 'GERBANG',
          title: gate.arah === 'GERBANG_DATANG' ? 'Datang Gerbang' : 'Pulang Gerbang',
          subtitle: gate.arah === 'GERBANG_DATANG' ? 'Masuk sekolah' : 'Keluar sekolah',
          status: gate.is_terlambat ? 'TERLAMBAT' : gate.status,
          waktu: formatTenantTime(gate.waktu_tap, tenantTimezone),
          waktu_iso: gate.waktu_tap.toISOString()
        });
      }
    });

    classTaps.forEach(cls => {
      if (cls.waktu_tap) {
        timeline.push({
          type: 'KELAS',
          title: cls.SesiAbsensi?.Mapel?.nama_mapel || cls.SesiAbsensi?.jenis_kegiatan || 'Sesi Mengajar',
          subtitle: `Kelas: ${cls.SesiAbsensi?.Kelas?.nama_kelas || '-'}`,
          status: cls.status,
          waktu: formatTenantTime(cls.waktu_tap, tenantTimezone),
          waktu_iso: cls.waktu_tap.toISOString(),
          catatan: cls.catatan
        });
      }
    });

    timeline.sort((a, b) => new Date(a.waktu_iso).getTime() - new Date(b.waktu_iso).getTime());

    return {
      guru: {
        id: guru.id,
        nama: guru.nama_guru,
        nip: guru.nip
      },
      tanggal,
      timeline
    };
  }

  async getRekapBulananGuruMe(userId: string, tenantId: string, bulan: string) {
    const guru = await prisma.guru.findFirst({
      where: { user_id: userId, tenant_id: tenantId },
      select: { id: true, nama_guru: true }
    });

    if (!guru) throw new Error('Profil Guru tidak ditemukan');

    const cacheKey = CACHE_KEYS.ACADEMIC?.REKAP_SISWA_INDIVIDUAL ? CACHE_KEYS.ACADEMIC.REKAP_SISWA_INDIVIDUAL(tenantId, guru.id, bulan) : `rekap:guru:${tenantId}:${guru.id}:${bulan}`;
    return cacheService.getOrSet(cacheKey, async () => {
      const [yearStr, monthStr] = bulan.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      const daysInMonth = new Date(year, month, 0).getDate();
      const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

      const [absenGuruList, gateLogs, approvedLeaves] = await Promise.all([
        prisma.absenGuru.findMany({
          where: {
            guru_id: guru.id,
            tenant_id: tenantId,
            OR: [
              { created_at: { gte: startOfMonth, lte: endOfMonth } },
              { SesiAbsensi: { tanggal: { gte: startOfMonth, lte: endOfMonth } } }
            ]
          },
          select: {
            id: true,
            status: true,
            waktu_tap: true,
            created_at: true,
            SesiAbsensi: {
              select: {
                id: true,
                tanggal: true,
                waktu_mulai: true,
                jenis_kegiatan: true,
                Mapel: { select: { nama_mapel: true } },
                Kelas: { select: { nama_kelas: true } }
              }
            }
          },
          orderBy: { created_at: 'asc' }
        }),
        prisma.absenGerbangGuru.findMany({
          where: {
            guru_id: guru.id,
            tenant_id: tenantId,
            waktu_tap: { gte: startOfMonth, lte: endOfMonth }
          },
          orderBy: { waktu_tap: 'asc' }
        }),
        prisma.permohonanIzinGuru.findMany({
          where: {
            guru_id: guru.id,
            tenant_id: tenantId,
            status: 'DISETUJUI',
            OR: [
              { tanggal_mulai: { lte: endOfMonth }, tanggal_selesai: { gte: startOfMonth } }
            ]
          }
        })
      ]);

      const statistik_kbm = {
        TOTAL_SESI: absenGuruList.length,
        HADIR: 0,
        TERLAMBAT: 0,
        DINAS_LUAR: 0,
        IZIN: 0,
        SAKIT: 0,
        ALPA: 0
      };

      const dailyKbmMap = new Map<string, any[]>();

      absenGuruList.forEach(absen => {
        const rawDate = absen.waktu_tap || absen.SesiAbsensi?.waktu_mulai || absen.SesiAbsensi?.tanggal || absen.created_at;
        const dateStr = rawDate ? new Date(rawDate).toISOString().split('T')[0] : 'Lainnya';
        const s = String(absen.status || '').toUpperCase();

        if (s === 'HADIR' || s === 'TEPAT_WAKTU') {
          statistik_kbm.HADIR++;
        } else if (s === 'TERLAMBAT') {
          statistik_kbm.TERLAMBAT++;
        } else if (s === 'SAKIT') {
          statistik_kbm.SAKIT++;
        } else if (s === 'IZIN') {
          statistik_kbm.IZIN++;
        } else if (s === 'PENUGASAN' || s === 'DINAS_LUAR' || s === 'DISPEN') {
          statistik_kbm.DINAS_LUAR++;
        } else if (s === 'ALPA') {
          statistik_kbm.ALPA++;
        }

        const item = {
          id: absen.id,
          sesi_id: absen.SesiAbsensi?.id,
          status: absen.status,
          waktu_tap: absen.waktu_tap ? absen.waktu_tap.toISOString() : null,
          mapel: absen.SesiAbsensi?.Mapel?.nama_mapel || absen.SesiAbsensi?.jenis_kegiatan || 'Mengajar',
          kelas: absen.SesiAbsensi?.Kelas?.nama_kelas || '-'
        };

        if (!dailyKbmMap.has(dateStr)) dailyKbmMap.set(dateStr, []);
        dailyKbmMap.get(dateStr)!.push(item);
      });

      // Compute True 1-Per-Day Statistics for Hari Kerja
      const uniqueDays = new Set<string>();
      gateLogs.forEach(g => {
        if (g.waktu_tap) uniqueDays.add(new Date(g.waktu_tap).toISOString().split('T')[0]);
      });
      dailyKbmMap.forEach((_, dateKey) => {
        if (dateKey !== 'Lainnya') uniqueDays.add(dateKey);
      });

      const statistik_harian: Record<string, number> = {
        HADIR: 0,
        TERLAMBAT: 0,
        DINAS_LUAR: 0,
        IZIN: 0,
        SAKIT: 0,
        ALPA: 0
      };

      uniqueDays.forEach(dateStr => {
        // 1. Check if gate log has check-in
        const dayGateLogs = gateLogs.filter(g => g.waktu_tap && new Date(g.waktu_tap).toISOString().startsWith(dateStr));
        const checkIn = dayGateLogs.find(g => g.arah === 'GERBANG_DATANG');

        // 2. Check if approved leave applies to this date
        const dayDate = new Date(`${dateStr}T00:00:00.000Z`);
        const leave = approvedLeaves.find(l => l.tanggal_mulai <= dayDate && l.tanggal_selesai >= dayDate);

        // 3. Check KBM statuses on this date
        const kbmOnDate = dailyKbmMap.get(dateStr) || [];
        const kbmStatuses = kbmOnDate.map(k => String(k.status || '').toUpperCase());

        if (checkIn) {
          if (checkIn.is_terlambat) statistik_harian.TERLAMBAT++;
          else statistik_harian.HADIR++;
        } else if (kbmStatuses.some(s => s === 'HADIR' || s === 'TEPAT_WAKTU')) {
          statistik_harian.HADIR++;
        } else if (kbmStatuses.some(s => s === 'TERLAMBAT')) {
          statistik_harian.TERLAMBAT++;
        } else if (leave) {
          if (leave.tipe_izin === 'DINAS_LUAR') statistik_harian.DINAS_LUAR++;
          else if (leave.tipe_izin === 'SAKIT') statistik_harian.SAKIT++;
          else statistik_harian.IZIN++;
        } else if (kbmStatuses.some(s => s === 'PENUGASAN' || s === 'DINAS_LUAR' || s === 'DISPEN')) {
          statistik_harian.DINAS_LUAR++;
        } else if (kbmStatuses.some(s => s === 'IZIN')) {
          statistik_harian.IZIN++;
        } else if (kbmStatuses.some(s => s === 'SAKIT')) {
          statistik_harian.SAKIT++;
        } else if (kbmStatuses.some(s => s === 'ALPA')) {
          statistik_harian.ALPA++;
        }
      });

      const detailFormatted = Array.from(dailyKbmMap.entries()).map(([tanggal, items]) => ({
        tanggal,
        items
      }));

      const statistikLegacy: Record<string, number> = {
        HADIR: statistik_harian.HADIR,
        TERLAMBAT: statistik_harian.TERLAMBAT,
        DINAS_LUAR: statistik_harian.DINAS_LUAR,
        DISPEN: statistik_harian.DINAS_LUAR,
        PENUGASAN: statistik_harian.DINAS_LUAR,
        IZIN: statistik_harian.IZIN,
        SAKIT: statistik_harian.SAKIT,
        ALPA: statistik_harian.ALPA
      };

      return {
        guru: { id: guru.id, nama: guru.nama_guru },
        bulan,
        total_sesi: absenGuruList.length,
        statistik: statistikLegacy,
        statistik_harian,
        statistik_kbm,
        detail: detailFormatted
      };
    }, 60);
  }
}

export const guruRekapService = GuruRekapService.getInstance();
