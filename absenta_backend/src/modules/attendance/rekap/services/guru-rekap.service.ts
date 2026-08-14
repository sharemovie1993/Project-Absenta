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

      const absenGuruList = await prisma.absenGuru.findMany({
        where: {
          guru_id: guru.id,
          tenant_id: tenantId,
          created_at: { gte: startOfMonth, lte: endOfMonth }
        },
        select: {
          id: true,
          status: true,
          waktu_tap: true,
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

      const statistik: Record<string, number> = { HADIR: 0, TERLAMBAT: 0, SAKIT: 0, IZIN: 0, ALPA: 0 };
      const detailMap = new Map<string, any[]>();

      absenGuruList.forEach(absen => {
        const dateStr = absen.waktu_tap ? absen.waktu_tap.toISOString().split('T')[0] : 'Lainnya';
        if (statistik[absen.status] !== undefined) statistik[absen.status]++;

        const item = {
          id: absen.id,
          sesi_id: absen.SesiAbsensi?.id,
          status: absen.status,
          waktu_tap: absen.waktu_tap ? absen.waktu_tap.toISOString() : null,
          mapel: absen.SesiAbsensi?.Mapel?.nama_mapel || absen.SesiAbsensi?.jenis_kegiatan || 'Mengajar',
          kelas: absen.SesiAbsensi?.Kelas?.nama_kelas || '-'
        };

        if (!detailMap.has(dateStr)) detailMap.set(dateStr, []);
        detailMap.get(dateStr)!.push(item);
      });

      const detailFormatted = Array.from(detailMap.entries()).map(([tanggal, items]) => ({
        tanggal,
        items
      }));

      return {
        guru: { id: guru.id, nama: guru.nama_guru },
        bulan,
        total_sesi: absenGuruList.length,
        statistik,
        detail: detailFormatted
      };
    }, 300);
  }
}

export const guruRekapService = GuruRekapService.getInstance();
