// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { AbsensiMode } from '@/constants/enums';
import { ATTENDANCE_POINTS } from '@/constants/attendance-points';
import { AttendanceRuleEngine } from '@/domain/attendance/AttendanceRuleEngine';
import { DataScope } from '@/types/fastify';
import { CacheService } from '@/utils/cache.service';
import { CACHE_KEYS } from '@/constants/cache-keys';
import { formatTenantTime, getTenantTimezone, getTenantOffsetString } from '@/utils/timezone.utils';

const cacheService = CacheService.getInstance();

export interface RekapHarianSiswaResponse {
  nama_siswa: string;
  tanggal: string;
  status: string;
  rincian: Array<{
    jenis_kegiatan: string;
    status: string;
    waktu_tap: string | null;
  }>;
}

export interface RekapBulananSiswaResponse {
  nama_siswa: string;
  bulan: string;
  statistik: {
    HADIR: number;
    IZIN: number;
    SAKIT: number;
    ALPA: number;
    TERLAMBAT: number;
    DISPEN: number;
  };
  persentase_kehadiran: number;
  total_hadir: number;
  total_izin: number;
  total_sakit: number;
  total_alpa: number;
  total_terlambat: number;
  total_poin: number;
  detail: Array<{
    tanggal: string;
    status: string;
  }>;
}

export interface RekapKelasBulananData {
  kelas_id: string;
  bulan: string;
  total_hadir: number;
  total_sakit: number;
  total_izin: number;
  total_alpa: number;
  total_telat: number;
  persentase_kehadiran: number;
  wali_kelas?: { nama_guru: string; nip?: string | null } | null;
  students: Array<{
    id: string;
    siswa_id?: string;
    nama: string;
    nama_siswa?: string;
    nis?: string | null;
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    HADIR?: number;
    IZIN?: number;
    SAKIT?: number;
    ALPA?: number;
    TERLAMBAT?: number;
    persentase: number;
    total_poin: number;
  }>;
}

export interface RekapMapelBulananData {
  kelas_id: string;
  mapel_id: string;
  bulan: string;
  total_sesi: number;
  mapel: {
    id: string;
    nama_mapel: string;
    kode_mapel?: string | null;
  } | null;
  guru_mapel: {
    nama_guru: string;
    nip?: string | null;
  } | null;
  wali_kelas: {
    nama_guru: string;
    nip?: string | null;
  } | null;
  students: Array<{
    id: string;
    siswa_id: string;
    nama_siswa: string;
    nis?: string | null;
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    HADIR: number;
    IZIN: number;
    SAKIT: number;
    ALPA: number;
    TERLAMBAT: number;
    persentase: number;
    total_poin: number;
    dailyMap: Record<string, string>;
  }>;
}

export interface TrackingHarianSiswaResponse {
  nama: string;
  nis?: string;
  tanggal: string;
  status?: string;
  kegiatan: Array<{
    waktu: string;
    timestamp?: Date | null;
    jenis_kegiatan: string;
    status: string;
    keterangan?: string | null;  // Catatan dari tap gerbang atau sesi — termasuk warisan kegiatan pembiasaan overtime
  }>;
}

export interface RekapHarianGuruResponse {
  nama_guru: string;
  mapel: string;
  kelas: string;
  status: string;
}

export interface StatistikHarianResponse {
  kelas: string;
  HADIR: number;
  IZIN: number;
  SAKIT: number;
  ALPA: number;
  TERLAMBAT: number;
  DISPEN: number;
}

export interface GuruPresensiSummaryResult {
  guruId: string;
  namaGuru: string;
  hariTglStr: string;
  bulanStr: string;
  statusMasukText: string;
  statusPulangText: string;
  statusKbmTodayText: string;
  rekapBulan: {
    totalHadirTepat: number;
    totalTerlambat: number;
    totalIzinSakit: number;
    totalAlpa: number;
    totalSesiMonth: number;
    totalKbmHadirMonth: number;
    rateKbm: number;
  };
}


export class StatsRekapCalculator {
  async getStatistikHarian(tanggal: string, tenantId: string, tahunPelajaranId?: string, scope?: DataScope): Promise<StatistikHarianResponse[]> {
    // Get tenant mode
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { absensi_mode: true },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Determine target classes
    let targetClassIds: string[] | undefined = undefined;
    if (scope && Array.isArray(scope.kelasIds) && scope.kelasIds.length > 0 && scope.tenantWide !== true) {
      targetClassIds = scope.kelasIds.map(id => String(id));
    }

    // Get classes
    const whereKelas: any = { tenant_id: tenantId };
    if (targetClassIds) {
      whereKelas.id = { in: targetClassIds };
    }

    const kelasList = await prisma.kelas.findMany({
      where: whereKelas,
      include: { Siswa: { select: { id: true, nama_siswa: true } } },
    });

    const studentIds = kelasList.flatMap(k => k.Siswa.map(s => s.id));
    if (studentIds.length === 0) return [];

    // Determine Time Range (Start/End of Day)
    const tzConfig = await prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'TIMEZONE' } });
    const timeZone = tzConfig?.value || 'Asia/Jakarta';
    const TZ_OFFSET: Record<string, number> = { 'Asia/Jakarta': 7, 'Asia/Makassar': 8, 'Asia/Jayapura': 9 };
    const offset = TZ_OFFSET[timeZone] ?? 7;
    const dayStr = String(tanggal);
    const startOfDay = new Date(new Date(`${dayStr}T00:00:00.000Z`).getTime() - (offset * 60 * 60 * 1000));
    const endOfDay = new Date(new Date(`${dayStr}T23:59:59.999Z`).getTime() - (offset * 60 * 60 * 1000));

    // Fetch Gate Taps in bulk
    const gateWhere: any = {
      siswa_id: { in: studentIds },
      tenant_id: tenantId,
      waktu_tap: { gte: startOfDay, lte: endOfDay },
    };
    if (tahunPelajaranId) gateWhere.tahun_pelajaran_id_snapshot = tahunPelajaranId;

    const gateTaps = await prisma.absenGerbangSiswa.findMany({
      where: gateWhere,
      select: { siswa_id: true, status: true, is_terlambat: true }
    });

    // Fetch Class KBM Sessions in bulk (only for MULTI_SESI)
    let classTaps: any[] = [];
    if (tenant.absensi_mode === AbsensiMode.MULTI_SESI) {
      const sesiWhere: any = { tanggal: { gte: startOfDay, lte: endOfDay } };
      if (tahunPelajaranId) sesiWhere.tahun_pelajaran_id = tahunPelajaranId;

      classTaps = await prisma.absenSiswa.findMany({
        where: {
          tenant_id: tenantId,
          SiswaAkademik: { siswa_id: { in: studentIds } },
          SesiAbsensi: sesiWhere
        },
        select: { SiswaAkademik: { select: { siswa_id: true } }, status: true, is_terlambat: true }
      });
    }

    // Fetch PKL Absences in bulk
    const pklAbsens = await prisma.absensiPkl.findMany({
      where: {
        tenant_id: tenantId,
        SiswaPkl: { siswa_id: { in: studentIds } },
        tanggal: { gte: startOfDay, lte: endOfDay },
      },
      select: { SiswaPkl: { select: { siswa_id: true } }, status: true }
    });

    // Map for fast lookup
    const gateTapsMap = new Map<string, any[]>();
    gateTaps.forEach(tap => {
      if (!gateTapsMap.has(tap.siswa_id)) gateTapsMap.set(tap.siswa_id, []);
      gateTapsMap.get(tap.siswa_id)!.push(tap);
    });

    const classTapsMap = new Map<string, any[]>();
    classTaps.forEach(tap => {
      const sId = tap.SiswaAkademik?.siswa_id;
      if (sId) {
        if (!classTapsMap.has(sId)) classTapsMap.set(sId, []);
        classTapsMap.get(sId)!.push(tap);
      }
    });

    const pklAbsensMap = new Map<string, any>();
    pklAbsens.forEach(absen => {
      const sId = absen.SiswaPkl?.siswa_id;
      if (sId) {
        pklAbsensMap.set(sId, absen);
      }
    });

    const result: StatistikHarianResponse[] = [];

    for (const kelas of kelasList) {
      let statistik = {
        HADIR: 0,
        IZIN: 0,
        SAKIT: 0,
        ALPA: 0,
        TERLAMBAT: 0,
        DISPEN: 0,
      };

      for (const siswa of kelas.Siswa) {
        const sGateTaps = gateTapsMap.get(siswa.id) || [];
        const sClassTaps = classTapsMap.get(siswa.id) || [];
        const sPklAbsen = pklAbsensMap.get(siswa.id) || null;

        let finalStatus = 'ALPA';
        let isLate = false;

        const gateStatus = sGateTaps.find(t => t.status === 'HADIR')?.status || sGateTaps[0]?.status;
        const gateLate = sGateTaps.some(t => t.is_terlambat);

        const pklStatus = sPklAbsen?.status;

        const classHasHadir = sClassTaps.some(c => c.status === 'HADIR' || c.status === 'TERLAMBAT');
        const classHasLate = sClassTaps.some(c => c.is_terlambat || c.status === 'TERLAMBAT');
        const classHasSakit = sClassTaps.some(c => c.status === 'SAKIT');
        const classHasIzin = sClassTaps.some(c => c.status === 'IZIN' || c.status === 'DISPEN');
        const classHasDispen = sClassTaps.some(c => c.status === 'DISPEN');

        if (gateStatus === 'HADIR' || classHasHadir || pklStatus === 'HADIR') {
            finalStatus = 'HADIR';
            if (gateLate || classHasLate) isLate = true;
        } else if (gateStatus === 'SAKIT' || classHasSakit) {
            finalStatus = 'SAKIT';
        } else if (gateStatus === 'IZIN' || classHasIzin) {
            finalStatus = 'IZIN';
        } else if (gateStatus === 'DISPEN' || classHasDispen) {
            finalStatus = 'DISPEN';
        }

        const resolvedStatus = isLate && finalStatus === 'HADIR' ? 'TERLAMBAT' : finalStatus;

        if (statistik[resolvedStatus as keyof typeof statistik] !== undefined) {
          statistik[resolvedStatus as keyof typeof statistik]++;
        }
      }

      result.push({
        kelas: kelas.nama_kelas,
        ...statistik,
      });
    }

    return result;
  }




  async logActivity(userId: string, tenantId: string, action: string, entityId?: string) {
    await prisma.activityLog.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        action,
        entity: 'RekapAbsensi',
        entity_id: entityId || null,
        metadata: JSON.stringify({
          description: `User accessed ${action}`,
          timestamp: new Date().toISOString(),
        }),
      },
    });
  }

  async getLeaderboard(tenantId: string, limit: number = 10) {
    const students = await prisma.siswa.findMany({
      where: { tenant_id: tenantId, status: 'AKTIF' },
      select: {
        id: true,
        nama_siswa: true,
        Kelas: { select: { nama_kelas: true } },
        _count: {
          select: {
            AbsenGerbangSiswa: {
              where: { status: 'HADIR' }
            }
          }
        }
      },
      take: limit * 2 // Fetch more to calculate points accurately in memory if needed
    });

    // Calculate points (Simplified for this task)
    const leaderboard = students.map(s => ({
      id: s.id,
      nama: s.nama_siswa,
      kelas: s.Kelas?.nama_kelas,
      hadir_count: s._count.AbsenGerbangSiswa,
      points: s._count.AbsenGerbangSiswa * 10 // 10 points per presence
    })).sort((a, b) => b.points - a.points).slice(0, limit);

    return leaderboard;
  }
}
