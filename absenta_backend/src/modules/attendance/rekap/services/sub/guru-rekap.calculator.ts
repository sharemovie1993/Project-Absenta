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


export class GuruRekapCalculator {
  async getRekapPresensiGuruByGuruId(guruId: string, namaGuru: string): Promise<GuruPresensiSummaryResult> {
    const now = new Date();
    const wibMs = now.getTime() + (7 * 60 * 60 * 1000);
    const nowWib = new Date(wibMs);

    const y = nowWib.getFullYear();
    const m = nowWib.getMonth();
    const d = nowWib.getDate();

    const startToday = new Date(Date.UTC(y, m, d, -7, 0, 0, 0));
    const endToday = new Date(Date.UTC(y, m, d, 16, 59, 59, 999));
    const firstDayMonth = new Date(Date.UTC(y, m, 1, -7, 0, 0, 0));

    const bulanStr = nowWib.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const hariTglStr = nowWib.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    const [gerbangToday, sesiTodayList, gerbangMonthList, sesiMonthList] = await Promise.all([
      prisma.absenGerbangGuru.findMany({
        where: {
          guru_id: guruId,
          created_at: { gte: startToday, lte: endToday }
        },
        orderBy: { created_at: 'asc' }
      }).catch(() => []),
      prisma.sesiAbsensi.findMany({
        where: {
          guru_id: guruId,
          tanggal: { gte: startToday, lte: endToday }
        },
        include: { AbsenGuru: { where: { guru_id: guruId } } },
        orderBy: { waktu_mulai: 'asc' }
      }).catch(() => []),
      prisma.absenGerbangGuru.findMany({
        where: {
          guru_id: guruId,
          created_at: { gte: firstDayMonth }
        }
      }).catch(() => []),
      prisma.sesiAbsensi.findMany({
        where: {
          guru_id: guruId,
          tanggal: { gte: firstDayMonth }
        },
        include: { AbsenGuru: { where: { guru_id: guruId } } },
        orderBy: { waktu_mulai: 'asc' }
      }).catch(() => [])
    ]);

    const tapMasuk = gerbangToday.find(g => String(g.arah || '').toUpperCase().includes('DATANG') || String(g.arah || '').toUpperCase().includes('MASUK'));
    const tapPulang = gerbangToday.find(g => String(g.arah || '').toUpperCase().includes('PULANG'));

    const guruProfile = await prisma.guru.findUnique({
      where: { id: guruId },
      select: { tenant_id: true }
    });
    const tz = await getTenantTimezone(guruProfile?.tenant_id);

    const formatWaktu = (dt?: Date | null) => {
      if (!dt) return null;
      return formatTenantTime(dt, tz, true);
    };

    let statusMasukText = '⚪ Belum Tap Masuk';
    if (tapMasuk && tapMasuk.waktu_tap) {
      const jam = formatWaktu(tapMasuk.waktu_tap);
      const isLate = tapMasuk.is_terlambat || String(tapMasuk.status || '').toUpperCase() === 'TERLAMBAT';
      statusMasukText = isLate ? `⚠️ ${jam} (Terlambat)` : `🟢 ${jam} (Tepat Waktu)`;
    }

    let statusPulangText = '⚪ Belum Tap Pulang';
    if (tapPulang && tapPulang.waktu_tap) {
      const jam = formatWaktu(tapPulang.waktu_tap);
      statusPulangText = `🟢 ${jam} (Sudah Tap Pulang)`;
    }

    const totalSesiToday = sesiTodayList.length;
    const sesiHadirCount = sesiTodayList.filter(s => {
      const ag = s.AbsenGuru?.[0];
      const st = String(ag?.status || '').toUpperCase();
      return !!ag?.waktu_tap || (st !== '' && !st.includes('BELUM') && (st === 'HADIR' || st.includes('HADIR')));
    }).length;

    let statusKbmTodayText = '-';
    if (totalSesiToday === 0) {
      statusKbmTodayText = '☕ Tidak ada jadwal mengajar KBM hari ini';
    } else {
      statusKbmTodayText = `📖 ${sesiHadirCount} dari ${totalSesiToday} Sesi Terkonfirmasi Hadir`;
    }

    const datangsMonth = gerbangMonthList.filter(g => String(g.arah || '').toUpperCase().includes('DATANG') || String(g.arah || '').toUpperCase().includes('MASUK'));
    const totalHadirTepat = datangsMonth.filter(g => !g.is_terlambat && String(g.status || '').toUpperCase() === 'HADIR').length;
    const totalTerlambat = datangsMonth.filter(g => g.is_terlambat || String(g.status || '').toUpperCase() === 'TERLAMBAT').length;
    const totalIzinSakit = datangsMonth.filter(g => ['IZIN', 'SAKIT'].includes(String(g.status || '').toUpperCase())).length;
    const totalAlpa = datangsMonth.filter(g => String(g.status || '').toUpperCase() === 'ALPA').length;

    const totalSesiMonth = sesiMonthList.length;
    const totalKbmHadirMonth = (sesiMonthList as any[]).filter(s => {
      const ag = s.AbsenGuru?.[0];
      const st = String(ag?.status || s.status || '').toUpperCase();
      return !!ag?.waktu_tap || !!s.waktu_tap || (st !== '' && !st.includes('BELUM') && (st === 'HADIR' || st.includes('HADIR')));
    }).length;
    const rateKbm = totalSesiMonth > 0 ? Math.round((totalKbmHadirMonth / totalSesiMonth) * 100) : 0;

    return {
      guruId,
      namaGuru,
      hariTglStr,
      bulanStr,
      statusMasukText,
      statusPulangText,
      statusKbmTodayText,
      rekapBulan: {
        totalHadirTepat,
        totalTerlambat,
        totalIzinSakit,
        totalAlpa,
        totalSesiMonth,
        totalKbmHadirMonth,
        rateKbm,
      }
    };
  }

  async getRekapHarianGuru(tanggal: string, tenantId: string, guruId?: string): Promise<RekapHarianGuruResponse[]> {
    const timeZone = await getTenantTimezone(tenantId);
    const offsetStr = getTenantOffsetString(timeZone);
    const startOfDay = new Date(`${tanggal}T00:00:00.000${offsetStr}`);
    const endOfDay = new Date(`${tanggal}T23:59:59.999${offsetStr}`);

    const whereClause: any = {
      tenant_id: tenantId,
      SesiAbsensi: {
        tanggal: { gte: startOfDay, lte: endOfDay }
      }
    };

    if (guruId) {
      whereClause.guru_id = guruId;
    }

    const absenGuru = await prisma.absenGuru.findMany({
      where: whereClause,
      include: {
        SesiAbsensi: {
          include: { Mapel: true, Kelas: true }
        },
        Guru: true
      },
      orderBy: { SesiAbsensi: { waktu_mulai: 'asc' } },
    });

    return absenGuru.map(absen => ({
      nama_guru: absen.Guru.nama_guru,
      mapel: absen.SesiAbsensi?.Mapel?.nama_mapel || 'Unknown',
      kelas: absen.SesiAbsensi?.Kelas?.nama_kelas || 'Unknown',
      status: (absen.status === 'HADIR' && absen.is_terlambat) ? 'TERLAMBAT' : absen.status,
    }));
  }


  async getTrackingHarianGuru(guruId: string, tanggal: string, tenantId: string) {
    const guru = await prisma.guru.findFirst({
      where: {
        tenant_id: tenantId,
        OR: [{ id: guruId }, { user_id: guruId }]
      }
    });

    if (!guru) {
      throw new Error('Guru not found');
    }

    const tzConfig = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'TIMEZONE' }
    });
    const timeZone = tzConfig?.value || 'Asia/Jakarta';
    const TZ_OFFSET: Record<string, number> = {
      'Asia/Jakarta': 7,
      'Asia/Makassar': 8,
      'Asia/Jayapura': 9
    };
    const offset = TZ_OFFSET[timeZone] ?? 7;

    const dayStr = String(tanggal);
    const startOfDay = new Date(new Date(`${dayStr}T00:00:00.000Z`).getTime() - (offset * 3600 * 1000));
    const endOfDay = new Date(new Date(`${dayStr}T23:59:59.999Z`).getTime() - (offset * 3600 * 1000));

    const formatTime = (date: Date) => {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date).replace('.', ':');
    };

    let kegiatan: { waktu: string; timestamp?: Date | null; jenis_kegiatan: string; status: any; keterangan?: string | null }[] = [];

    // 1. Get Gate Taps from AbsenGerbangGuru
    const gerbangTaps = await prisma.absenGerbangGuru.findMany({
      where: {
        guru_id: guru.id,
        tenant_id: tenantId,
        waktu_tap: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { waktu_tap: 'asc' }
    });

    kegiatan = kegiatan.concat(gerbangTaps.map(tap => ({
      waktu: tap.waktu_tap ? formatTime(tap.waktu_tap) : '-',
      timestamp: tap.waktu_tap,
      jenis_kegiatan: tap.arah === 'GERBANG_DATANG' ? 'Datang (Gerbang)' : 'Pulang (Gerbang)',
      status: (tap.status === 'HADIR' && tap.is_terlambat) ? 'TERLAMBAT' : tap.status,
      keterangan: tap.catatan || null
    })));

    // 2. Get Teaching Sessions from AbsenGuru
    const sessionTaps = await prisma.absenGuru.findMany({
      where: {
        guru_id: guru.id,
        tenant_id: tenantId,
        SesiAbsensi: {
          tanggal: { gte: startOfDay, lte: endOfDay }
        }
      },
      include: {
        SesiAbsensi: {
          include: { Mapel: true, Kelas: true }
        }
      },
      orderBy: { SesiAbsensi: { waktu_mulai: 'asc' } }
    });

    kegiatan = kegiatan.concat(sessionTaps.map(tap => {
      const effectiveTime = tap.waktu_tap || tap.SesiAbsensi?.waktu_mulai;
      const mapelName = tap.SesiAbsensi?.Mapel?.nama_mapel || tap.SesiAbsensi?.jenis_kegiatan || 'KBM';
      const kelasName = tap.SesiAbsensi?.Kelas?.nama_kelas ? ` (${tap.SesiAbsensi.Kelas.nama_kelas})` : '';
      const activityName = `KBM – ${mapelName}${kelasName}`;

      return {
        waktu: effectiveTime ? formatTime(effectiveTime) : '-',
        timestamp: effectiveTime,
        jenis_kegiatan: activityName,
        status: (tap.status === 'HADIR' && tap.is_terlambat) ? 'TERLAMBAT' : (tap.status || 'BELUM_TAP'),
        keterangan: tap.catatan || null
      };
    }));

    // Sort events chronologically
    kegiatan.sort((a, b) => {
      if (!a.timestamp && !b.timestamp) return 0;
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    let finalStatus = 'ALPA';
    if (kegiatan.some(k => k.status === 'HADIR')) finalStatus = 'HADIR';
    else if (kegiatan.some(k => k.status === 'TERLAMBAT')) finalStatus = 'TERLAMBAT';

    return {
      success: true,
      message: 'Tracking harian guru retrieved',
      data: {
        guru_id: guru.id,
        nama_guru: guru.nama_guru,
        tanggal,
        status: finalStatus,
        kegiatan
      }
    };
  }


  async getRekapBulananGuruMe(userId: string, tenantId: string, bulan: string): Promise<any> {
    const guru = await prisma.guru.findFirst({
      where: {
        tenant_id: tenantId,
        OR: [
          { user_id: userId },
          { id: userId }
        ]
      },
      select: { id: true, nama_guru: true, jenis_ptk: true }
    });

    if (!guru) throw new Error('Profil Guru tidak ditemukan');

    // 2. Resolve Tenant Configured Timezone & Date Range
    const tzConfig = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'TIMEZONE' }
    });
    const timeZone = tzConfig?.value || 'Asia/Jakarta';

    const TZ_OFFSET: Record<string, number> = {
      'Asia/Jakarta': 7,
      'Asia/Makassar': 8,
      'Asia/Jayapura': 9
    };
    const offsetHours = TZ_OFFSET[timeZone] ?? 7;
    const offsetSign = offsetHours >= 0 ? '+' : '-';
    const offsetStr = `${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;

    const [yearStr, monthStr] = bulan.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const startOfMonth = new Date(`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-01T00:00:00.000${offsetStr}`);
    const lastDay = new Date(year, month, 0);
    const lastDayStr = `${String(lastDay.getFullYear()).padStart(4,'0')}-${String(lastDay.getMonth()+1).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`;
    const endOfMonth = new Date(`${lastDayStr}T23:59:59.999${offsetStr}`);

    const formatLocalDateKey = (d: Date) => {
      return new Intl.DateTimeFormat('sv-SE', { timeZone }).format(new Date(d));
    };

    const formatTime = (d: Date | null) => {
      if (!d) return undefined;
      return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(d)).replace('.', ':');
    };

    // 1. Fetch Gate Logs from AbsenGerbangGuru
    const gateLogs = await prisma.absenGerbangGuru.findMany({
      where: {
        guru_id: guru.id,
        tenant_id: tenantId,
        waktu_tap: { gte: startOfMonth, lte: endOfMonth }
      },
      orderBy: { waktu_tap: 'asc' }
    });

    // 2. Fetch KBM Logs from AbsenGuru
    const attendanceLogs = await prisma.absenGuru.findMany({
      where: {
        guru_id: guru.id,
        tenant_id: tenantId,
        SesiAbsensi: {
          tanggal: { gte: startOfMonth, lte: endOfMonth }
        }
      },
      include: {
        SesiAbsensi: {
          select: { tanggal: true, waktu_mulai: true, jenis_kegiatan: true, Mapel: { select: { nama_mapel: true } } }
        }
      },
      orderBy: { SesiAbsensi: { tanggal: 'asc' } }
    });

    const dailyMap = new Map<string, { datangLog?: any; pulangLog?: any; kbmLogs: any[] }>();

    // Group gate logs by day (Tenant Timezone)
    gateLogs.forEach(log => {
      if (!log.waktu_tap) return;
      const dateKey = formatLocalDateKey(log.waktu_tap);
      if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { kbmLogs: [] });
      const entry = dailyMap.get(dateKey)!;
      if (log.arah === 'GERBANG_DATANG') entry.datangLog = log;
      else if (log.arah === 'GERBANG_PULANG') entry.pulangLog = log;
    });

    // Group KBM logs by day (Tenant Timezone)
    attendanceLogs.forEach(log => {
      const rawDate = log.waktu_tap || log.SesiAbsensi?.waktu_mulai || log.SesiAbsensi?.tanggal;
      if (!rawDate) return;
      const dateKey = formatLocalDateKey(rawDate);
      if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { kbmLogs: [] });
      dailyMap.get(dateKey)!.kbmLogs.push(log);
    });

    const statistik = { HADIR: 0, TERLAMBAT: 0, ALPA: 0, IZIN: 0, SAKIT: 0, DISPEN: 0 };
    let totalPoin = 0;

    // Calculate Stats & Detail per Day
    const detail = Array.from(dailyMap.entries()).map(([date, entry]) => {
      const checkInLog = entry.datangLog;
      const checkOutLog = entry.pulangLog;
      const kbmLogs = entry.kbmLogs;

      let primaryStatus = 'BELUM';
      let poin = 0;
      let jamMasuk: string | undefined = checkInLog?.waktu_tap ? formatTime(checkInLog.waktu_tap) : undefined;
      let jamPulang: string | undefined = checkOutLog?.waktu_tap ? formatTime(checkOutLog.waktu_tap) : undefined;

      if (!jamMasuk && kbmLogs.length > 0) {
        const firstKbmTap = kbmLogs.find(k => k.waktu_tap);
        if (firstKbmTap?.waktu_tap) jamMasuk = formatTime(firstKbmTap.waktu_tap);
      }

      if (checkInLog) {
        const rawStatus = (checkInLog.status || '').toUpperCase();
        if (rawStatus === 'HADIR' || rawStatus === 'TERLAMBAT' || rawStatus === 'TEPAT_WAKTU') {
          primaryStatus = checkInLog.is_terlambat ? 'TERLAMBAT' : 'HADIR';
        } else if (!rawStatus.includes('BELUM')) {
          primaryStatus = rawStatus;
        }
        poin += checkInLog.poin_kehadiran || 0;
      } else if (kbmLogs.length > 0) {
        const validKbmLogs = kbmLogs.filter(k => {
          const st = String(k.status || '').toUpperCase();
          return !!k.waktu_tap || (st !== '' && !st.includes('BELUM'));
        });

        if (validKbmLogs.length > 0) {
          const statuses = validKbmLogs.map(k => String(k.status || '').toUpperCase());
          if (statuses.some(s => s === 'HADIR' || s === 'TEPAT_WAKTU' || s === 'MENGAJAR' || s === 'HADIR_/_MENGAJAR' || (s.includes('HADIR') && !s.includes('BELUM')))) {
            const hasTerlambat = validKbmLogs.some(k => k.is_terlambat);
            primaryStatus = hasTerlambat ? 'TERLAMBAT' : 'HADIR';
          } else if (statuses.some(s => s.includes('DISPEN') || s.includes('PENUGASAN') || s.includes('DINAS'))) {
            primaryStatus = 'DISPEN';
          } else if (statuses.some(s => s.includes('IZIN'))) {
            primaryStatus = 'IZIN';
          } else if (statuses.some(s => s.includes('SAKIT'))) {
            primaryStatus = 'SAKIT';
          } else {
            primaryStatus = 'ALPA';
          }

          validKbmLogs.forEach(k => { poin += k.poin_kehadiran || 0; });
        } else {
          const dateOnlyStr = date.slice(0, 10);
          const todayOnlyStr = new Date().toISOString().slice(0, 10);
          primaryStatus = dateOnlyStr < todayOnlyStr ? 'ALPA' : 'BELUM';
        }
      }

      if (checkOutLog) {
        poin += checkOutLog.poin_kehadiran || 0;
      }

      if (primaryStatus !== 'BELUM' && (statistik as any)[primaryStatus] !== undefined) {
        (statistik as any)[primaryStatus]++;
      }
      totalPoin += poin;

      return {
        tanggal: date,
        status: primaryStatus,
        jam_masuk: jamMasuk,
        jam_pulang: jamPulang,
        count: (checkInLog ? 1 : 0) + (checkOutLog ? 1 : 0) + kbmLogs.length
      };
    });

    const totalDaysRecorded = detail.length;
    const presentDays = statistik.HADIR + statistik.TERLAMBAT;
    const persentase_kehadiran = totalDaysRecorded > 0 ? Math.round((presentDays / totalDaysRecorded) * 100) : 100;

    return {
      nama_guru: guru.nama_guru,
      bulan,
      statistik,
      total_poin: totalPoin,
      persentase_kehadiran: persentase_kehadiran > 100 ? 100 : persentase_kehadiran,
      detail
    };

  }

  /**
   * Get Attendance Leaderboard
   * Ranks students based on attendance points
   */
  async getLeaderboardGuru(tenantId: string, limit: number = 50, jenisPtk: string = 'PENDIDIK') {
    const isTu = jenisPtk.toUpperCase() === 'TENAGA_KEPENDIDIKAN' || jenisPtk.toUpperCase() === 'TU';
    const ptkFilter = isTu
      ? { jenis_ptk: { in: ['TENAGA_KEPENDIDIKAN', 'TU'] } }
      : {
          OR: [
            { jenis_ptk: 'PENDIDIK' },
            { jenis_ptk: null },
            { jenis_ptk: '' }
          ]
        };

    const teachers = await prisma.guru.findMany({
      where: {
        tenant_id: tenantId,
        ...ptkFilter
      },
      select: {
        id: true,
        nama_guru: true,
        nip: true,
        jenis_ptk: true,
      }
    });

    const teacherIds = teachers.map(t => t.id);

    // 1. Total & Tepat Waktu Datang Gerbang per Guru
    const gerbangTotalCounts = await prisma.absenGerbangGuru.groupBy({
      by: ['guru_id'],
      where: {
        tenant_id: tenantId,
        guru_id: { in: teacherIds }
      },
      _count: { id: true }
    });

    const gerbangTepatCounts = await prisma.absenGerbangGuru.groupBy({
      by: ['guru_id'],
      where: {
        tenant_id: tenantId,
        guru_id: { in: teacherIds },
        is_terlambat: false,
        status: 'HADIR'
      },
      _count: { id: true }
    });

    // 2. Total & Tepat Waktu Sesi KBM per Guru
    const kbmTotalCounts = await prisma.sesiAbsensi.groupBy({
      by: ['guru_id'],
      where: {
        tenant_id: tenantId,
        guru_id: { in: teacherIds }
      },
      _count: { id: true }
    });

    const kbmTepatCounts = await prisma.absenGuru.groupBy({
      by: ['guru_id'],
      where: {
        tenant_id: tenantId,
        guru_id: { in: teacherIds },
        is_terlambat: false,
        status: { in: ['HADIR', 'TEPAT_WAKTU', 'Hadir / Mengajar'] }
      },
      _count: { id: true }
    });

    const gerbangTotalMap = new Map<string, number>();
    gerbangTotalCounts.forEach(g => gerbangTotalMap.set(g.guru_id, g._count.id));

    const gerbangTepatMap = new Map<string, number>();
    gerbangTepatCounts.forEach(g => gerbangTepatMap.set(g.guru_id, g._count.id));

    const kbmTotalMap = new Map<string, number>();
    kbmTotalCounts.forEach(k => { if (k.guru_id) kbmTotalMap.set(k.guru_id, k._count.id); });

    const kbmTepatMap = new Map<string, number>();
    kbmTepatCounts.forEach(k => kbmTepatMap.set(k.guru_id, k._count.id));

    const leaderboard = teachers.map(t => {
      const gTotal = gerbangTotalMap.get(t.id) || 0;
      const gTepat = gerbangTepatMap.get(t.id) || 0;
      const gerbangRate = gTotal > 0 ? Math.round((gTepat / gTotal) * 100) : 100;

      const kTotal = kbmTotalMap.get(t.id) || 0;
      const kTepat = kbmTepatMap.get(t.id) || 0;
      const kbmRate = kTotal > 0 ? Math.round((kTepat / kTotal) * 100) : 100;

      // Fair Punctuality Score (0 - 100%)
      const score = Math.round((gerbangRate + kbmRate) / 2);

      return {
        id: t.id,
        nama: t.nama_guru,
        nip: t.nip || '-',
        jenis_ptk: t.jenis_ptk || 'PENDIDIK',
        gerbang_count: gTepat,
        gerbang_total: gTotal,
        gerbang_rate: gerbangRate,
        kbm_count: kTepat,
        kbm_total: kTotal,
        kbm_rate: kbmRate,
        hadir_count: gTepat + kTepat,
        points: score, // Skor Persentase Ketepatan Waktu Adil (0-100%)
        score: score
      };
    }).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.kbm_rate !== a.kbm_rate) return b.kbm_rate - a.kbm_rate;
      return a.nama.localeCompare(b.nama);
    }).slice(0, limit);

    return leaderboard;
  }
}
