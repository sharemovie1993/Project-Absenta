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


export class SiswaRekapCalculator {
  async getSiswaIdFromUser(tenantId: string, userId: string): Promise<string | null> {
    const siswa = await prisma.siswa.findFirst({
      where: {
        tenant_id: tenantId,
        user_id: userId,
      },
      select: { id: true },
    });
    return (siswa as any)?.id ?? null;
  }

  // ... existing methods ...


  async getRekapBulananSiswa(siswaId: string, bulan: string, tenantId: string, tahunPelajaranId?: string, forceGateOnly: boolean = false): Promise<RekapBulananSiswaResponse> {
    const cacheKey = CACHE_KEYS.ACADEMIC.REKAP_SISWA_INDIVIDUAL(tenantId, siswaId, bulan);
    const cached = await cacheService.get<RekapBulananSiswaResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    // Validasi siswa
    const siswa = await prisma.siswa.findFirst({
      where: {
        id: siswaId,
        tenant_id: tenantId,
      },
    });

    if (!siswa) {
      throw new Error('Siswa not found');
    }

    // Parse bulan
    const [yearStr, monthStr] = bulan.split('-');
    
    if (!yearStr || !monthStr) {
      throw new Error('Invalid month format. Use YYYY-MM');
    }
    
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      throw new Error('Invalid month format. Use YYYY-MM');
    }
    
    const timeZone = await getTenantTimezone(tenantId);
    const offsetStr = getTenantOffsetString(timeZone);

    const startOfMonth = new Date(`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-01T00:00:00.000${offsetStr}`);
    const lastDay = new Date(year, month, 0);
    const lastDayStr = `${String(lastDay.getFullYear()).padStart(4,'0')}-${String(lastDay.getMonth()+1).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`;
    const endOfMonth = new Date(`${lastDayStr}T23:59:59.999${offsetStr}`);

    // Get tenant mode
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { absensi_mode: true },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const formatDateKey = (date: Date) => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const [{ value: month }, , { value: day }, , { value: year }] = formatter.formatToParts(date);
      return `${year}-${month}-${day}`;
    };

    const statistik: any = {
      HADIR: 0,
      IZIN: 0,
      SAKIT: 0,
      ALPA: 0,
      TERLAMBAT: 0,
      DISPEN: 0,
    };
    let total_poin = 0;

    let detail: Array<{
      id?: string;
      sesi_id?: string | null;
      sesi_absensi_id?: string | null;
      tanggal: string;
      status: string;
      waktu_tap?: string | null;
      waktu?: string | null;
      jenis_kegiatan?: string;
      sesi_nama?: string;
      nama_mapel?: string | null;
      nama_guru?: string | null;
    }> = [];

    if (forceGateOnly || tenant.absensi_mode === AbsensiMode.SIMPLE) {
      const whereAbsen: any = {
        siswa_id: siswaId,
        tenant_id: tenantId,
        created_at: { gte: startOfMonth, lte: endOfMonth },
        waktu_tap: { gte: startOfMonth, lte: endOfMonth },
      };
      if (tahunPelajaranId) whereAbsen.tahun_pelajaran_id_snapshot = tahunPelajaranId;
      const absenGerbang = await prisma.absenGerbangSiswa.findMany({
        where: whereAbsen,
        orderBy: { waktu_tap: 'asc' },
      });

      // Group by date
      const attendanceByDate = new Map<string, any>();
      absenGerbang.forEach(absen => {
        if (!absen.waktu_tap) return; // Skip if null
        const dateKey = formatDateKey(absen.waktu_tap);
        if (!attendanceByDate.has(dateKey)) {
          attendanceByDate.set(dateKey, absen);
        }
      });

      attendanceByDate.forEach(absen => {
        const status = (absen.status === 'HADIR' && absen.is_terlambat) ? 'TERLAMBAT' : absen.status;
        if (statistik[status] !== undefined) statistik[status]++;
        
        detail.push({
          id: absen.id,
          tanggal: formatDateKey(absen.waktu_tap),
          status: status,
          waktu_tap: absen.waktu_tap ? absen.waktu_tap.toISOString() : null,
          waktu: absen.waktu_tap ? absen.waktu_tap.toISOString() : null,
          jenis_kegiatan: 'Presensi Gerbang'
        });

        // Poin calculation: Prioritize DB value
        if (absen.poin_kehadiran && absen.poin_kehadiran > 0) {
          total_poin += absen.poin_kehadiran;
        } else {
          // Fallback using constants
          if (status === 'HADIR') total_poin += ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;
          else if (status === 'TERLAMBAT') total_poin += ATTENDANCE_POINTS.HADIR_TERLAMBAT;
          else if (status === 'SAKIT') total_poin += ATTENDANCE_POINTS.SAKIT;
          else if (status === 'IZIN') total_poin += ATTENDANCE_POINTS.IZIN;
          else if (status === 'DISPEN') total_poin += ATTENDANCE_POINTS.DISPEN;
        }
      });

    } else {
      // MULTI_SESI logic: Aggregates both Gate and Class data (Hybrid)
      
      // 1. Fetch Class Data
      const sesiWhere: any = { tanggal: { gte: startOfMonth, lte: endOfMonth } };
      if (tahunPelajaranId) sesiWhere.tahun_pelajaran_id = tahunPelajaranId;

      const absenSiswa = await prisma.absenSiswa.findMany({
        where: {
          tenant_id: tenantId,
          SiswaAkademik: { siswa_id: siswaId },
          SesiAbsensi: sesiWhere,
        },
        include: {
          SesiAbsensi: {
            include: {
              Mapel: true,
              Guru: true
            }
          }
        }
      });

      // 2. Fetch Gate Data
      const gateWhere: any = {
        siswa_id: siswaId,
        tenant_id: tenantId,
        waktu_tap: { gte: startOfMonth, lte: endOfMonth },
      };
      if (tahunPelajaranId) gateWhere.tahun_pelajaran_id_snapshot = tahunPelajaranId;

      const absenGerbang = await prisma.absenGerbangSiswa.findMany({
        where: gateWhere,
        select: { status: true, is_terlambat: true, poin_kehadiran: true, waktu_tap: true }
      });

      // 2b. Fetch PKL Data
      const absenPkl = await prisma.absensiPkl.findMany({
        where: {
          tenant_id: tenantId,
          SiswaPkl: { siswa_id: siswaId },
          tanggal: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { status: true, tanggal: true }
      });

      // 3. Group by Date
      const byDate = new Map<string, { class: any[], gate: any[], pkl: any | null }>();
      
      const getDayRecord = (date: string) => {
          if (!byDate.has(date)) byDate.set(date, { class: [], gate: [], pkl: null });
          return byDate.get(date)!;
      };

      // Populate Class
      absenSiswa.forEach(absen => {
        if (absen.SesiAbsensi?.tanggal) {
          const d = formatDateKey(absen.SesiAbsensi.tanggal);
          getDayRecord(d).class.push(absen);
        }
      });

      // Populate Gate
      absenGerbang.forEach(absen => {
          if (absen.waktu_tap) {
              const d = formatDateKey(absen.waktu_tap);
              getDayRecord(d).gate.push(absen);
          }
      });

      // Populate PKL
      absenPkl.forEach(absen => {
          const d = formatDateKey(absen.tanggal);
          getDayRecord(d).pkl = absen;
      });

      // 4. Calculate Daily Status & Points
      byDate.forEach((data, date) => {
        const classTaps = data.class;
        const gateTaps = data.gate;

        let finalStatus = 'ALPA';
        let isLate = false;
        let dbPoin = 0;

        const gateStatus = gateTaps.find(t => t.status === 'HADIR')?.status || gateTaps[0]?.status;
        const gateLate = gateTaps.some(t => t.is_terlambat);
        
        const classHasHadir = classTaps.some(c => c.status === 'HADIR' || c.status === 'TERLAMBAT');
        const classHasLate = classTaps.some(c => c.is_terlambat || c.status === 'TERLAMBAT');
        const classHasSakit = classTaps.some(c => c.status === 'SAKIT');
        const classHasIzin = classTaps.some(c => c.status === 'IZIN' || c.status === 'DISPEN');
        const classHasDispen = classTaps.some(c => c.status === 'DISPEN');
        
        // DB Poin Priority: Class > Gate
        if (classTaps.length > 0) {
            dbPoin = Math.max(...classTaps.map(c => c.poin_kehadiran || 0));
        } else if (gateTaps.length > 0) {
            dbPoin = Math.max(...gateTaps.map(c => c.poin_kehadiran || 0));
        }

        // Logic
        if ((gateStatus === 'HADIR') || classHasHadir || (data.pkl?.status === 'HADIR')) {
            finalStatus = 'HADIR';
            if (gateLate || classHasLate) isLate = true;
        } else if (gateStatus === 'SAKIT' || classHasSakit) {
            finalStatus = 'SAKIT';
        } else if (gateStatus === 'IZIN' || classHasIzin) {
            finalStatus = 'IZIN';
        } else if (gateStatus === 'DISPEN' || classHasDispen) {
            finalStatus = 'DISPEN';
        }

        const firstClass = classTaps[0];
        const firstGate = gateTaps[0];
        const sesiId = firstClass?.sesi_id || firstClass?.SesiAbsensi?.id || null;
        const rawWaktu = firstClass?.waktu_tap ? firstClass.waktu_tap.toISOString() : (firstGate?.waktu_tap ? firstGate.waktu_tap.toISOString() : null);
        const mapelName = firstClass?.SesiAbsensi?.Mapel?.nama_mapel || null;
        const guruName = firstClass?.SesiAbsensi?.Guru?.nama_guru || null;
        const rawJenis = firstClass?.SesiAbsensi?.jenis_kegiatan || 'KBM';

        // Add to Stats
        const calculatedStatus = isLate && finalStatus === 'HADIR' ? 'TERLAMBAT' : finalStatus;
        if (calculatedStatus === 'TERLAMBAT') {
          if (statistik['TERLAMBAT'] !== undefined) statistik['TERLAMBAT']++;
        } else if (statistik[calculatedStatus] !== undefined) {
          statistik[calculatedStatus]++;
        }

        detail.push({
          id: sesiId || `rekap-${date}`,
          sesi_id: sesiId,
          sesi_absensi_id: sesiId,
          tanggal: date,
          status: calculatedStatus,
          waktu_tap: rawWaktu,
          waktu: rawWaktu,
          jenis_kegiatan: mapelName ? `KBM - ${mapelName}` : rawJenis,
          sesi_nama: mapelName ? `KBM - ${mapelName}` : rawJenis,
          nama_mapel: mapelName,
          nama_guru: guruName
        });
        
        // Calculate Poin
        let calculatedPoin = 0;
        if (finalStatus === 'HADIR') {
            calculatedPoin = isLate ? ATTENDANCE_POINTS.HADIR_TERLAMBAT : ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;
        } else if (finalStatus === 'SAKIT') {
            calculatedPoin = ATTENDANCE_POINTS.SAKIT;
        } else if (finalStatus === 'IZIN') {
            calculatedPoin = ATTENDANCE_POINTS.IZIN;
        } else if (finalStatus === 'DISPEN') {
            calculatedPoin = ATTENDANCE_POINTS.DISPEN;
        } else {
            calculatedPoin = ATTENDANCE_POINTS.ALPA;
        }

        const totalDayPoin = dbPoin > 0 ? dbPoin : calculatedPoin;
        total_poin += totalDayPoin;
      });
    }

    // Calculate overall statistics
    const totalEffectiveDays = statistik.HADIR + statistik.IZIN + statistik.SAKIT + statistik.ALPA + statistik.TERLAMBAT + statistik.DISPEN;
    const persentase_kehadiran = totalEffectiveDays > 0 ? Math.round(((statistik.HADIR + statistik.TERLAMBAT) / totalEffectiveDays) * 100) : 0;

    const result: RekapBulananSiswaResponse = {
      nama_siswa: siswa.nama_siswa,
      bulan,
      statistik,
      persentase_kehadiran,
      total_hadir: statistik.HADIR + statistik.TERLAMBAT,
      total_izin: statistik.IZIN,
      total_sakit: statistik.SAKIT,
      total_alpa: statistik.ALPA,
      total_terlambat: statistik.TERLAMBAT,
      total_poin,
      detail
    };

    await cacheService.set(cacheKey, result, 300);
    return result;
  }




  async getTrackingHarianSiswa(siswaId: string, tanggal: string, tenantId: string): Promise<TrackingHarianSiswaResponse> {
    // Validasi siswa
    const siswa = await prisma.siswa.findFirst({
      where: {
        id: siswaId,
        tenant_id: tenantId,
      },
    });

    if (!siswa) {
      throw new Error('Siswa not found');
    }

    // Check tenant mode
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { absensi_mode: true },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get Tenant Timezone
    const tzConfig = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'TIMEZONE' }
    });
    const timeZone = tzConfig?.value || 'Asia/Jakarta';

    // Calculate Offset in Hours (Simple map for Indonesia)
    const TZ_OFFSET: Record<string, number> = {
      'Asia/Jakarta': 7,
      'Asia/Makassar': 8,
      'Asia/Jayapura': 9
    };
    const offset = TZ_OFFSET[timeZone] ?? 7;

    const dayStr = String(tanggal);
    // Construct Start of Day in UTC by subtracting offset
    const startOfDay = new Date(new Date(`${dayStr}T00:00:00.000Z`).getTime() - (offset * 60 * 60 * 1000));
    const endOfDay = new Date(new Date(`${dayStr}T23:59:59.999Z`).getTime() - (offset * 60 * 60 * 1000));

    let kegiatan: { waktu: string; timestamp?: Date | null; jenis_kegiatan: string; status: any }[] = [];

    // Helper to format time in Tenant Timezone
    const formatTime = (date: Date) => {
      // Debug log
      console.log(`[Tracking] Formatting ${date.toISOString()} with TZ ${timeZone}`);
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date).replace('.', ':');
    };

    // 1. Get Gate Taps (Common for all modes)
    const gerbangTaps = await prisma.absenGerbangSiswa.findMany({
      where: {
        siswa_id: siswaId,
        tenant_id: tenantId,
        waktu_tap: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { waktu_tap: 'asc' },
    });

    kegiatan = kegiatan.concat(gerbangTaps.map(tap => ({
      waktu: tap.waktu_tap ? formatTime(tap.waktu_tap) : '-',
      timestamp: tap.waktu_tap,
      jenis_kegiatan: tap.arah === 'GERBANG_DATANG' ? 'Datang (Gerbang)' : 'Pulang (Gerbang)',
      status: (tap.status === 'HADIR' && tap.is_terlambat) ? 'TERLAMBAT' : tap.status,
      keterangan: (tap as any).keterangan || (tap as any).catatan_khusus || null,
    })));

    // 2. Get Class Sessions (Only MULTI_SESI)
    let sessionTaps: any[] = [];
    if (tenant.absensi_mode === AbsensiMode.MULTI_SESI) {
      sessionTaps = await prisma.absenSiswa.findMany({
        where: {
          tenant_id: tenantId,
          SiswaAkademik: { siswa_id: siswaId },
          SesiAbsensi: {
            tanggal: { gte: startOfDay, lte: endOfDay }
          }
        },
        include: {
          SesiAbsensi: {
            include: {
              Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
              Guru: { select: { id: true, nama_guru: true, User: { select: { full_name: true } } } },
              AbsenGuru: { select: { id: true, status: true, created_at: true } }
            }
          }
        },
        orderBy: { SesiAbsensi: { waktu_mulai: 'asc' } }
      });

      kegiatan = kegiatan.concat(sessionTaps.map(tap => {
        // Use tap time if available, otherwise fall back to session start time
        const effectiveTime = tap.waktu_tap || tap.SesiAbsensi?.waktu_mulai;
        const mapelName = tap.SesiAbsensi?.Mapel?.nama_mapel;
        const kodeMapel = tap.SesiAbsensi?.Mapel?.kode_mapel;
        const guruName = tap.SesiAbsensi?.Guru?.User?.full_name || tap.SesiAbsensi?.Guru?.nama_guru || null;
        
        const teacherAbsenList = Array.isArray(tap.SesiAbsensi?.AbsenGuru) ? tap.SesiAbsensi.AbsenGuru : [];
        const isGuruHadir = teacherAbsenList.some((ag: any) => 
          ag.status === 'HADIR' || ag.status === 'TEPAT_WAKTU' || ag.status === 'TERLAMBAT'
        );
        const statusGuru = teacherAbsenList.length > 0
          ? (isGuruHadir ? 'HADIR' : (teacherAbsenList[0]?.status || 'IZIN'))
          : (tap.SesiAbsensi?.guru_id ? 'BELUM_ABSEN' : 'TIDAK_ADA');
        
        // Helper to check if string is UUID
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        const rawJenis = tap.SesiAbsensi?.jenis_kegiatan || 'KBM';
        const cleanJenis = isUUID(rawJenis) ? 'KBM' : rawJenis;
        
        const activityName = mapelName ? `${cleanJenis} - ${mapelName}` : (isUUID(rawJenis) ? 'Sesi Kelas' : rawJenis);
        
        return {
          waktu: effectiveTime ? formatTime(effectiveTime) : '-',
          timestamp: effectiveTime,
          jenis_kegiatan: activityName,
          kode_mapel: kodeMapel,
          nama_mapel: mapelName,
          nama_guru: guruName,
          status_guru: statusGuru,
          is_guru_hadir: isGuruHadir,
          status: (tap.status === 'HADIR' && tap.is_terlambat) ? 'TERLAMBAT' : tap.status,
          metode: tap.metode_absen || (tap.waktu_tap ? 'RFID' : 'Manual'),
          keterangan: tap.keterangan || null,
        };
      }));
    }

    // Sort by timestamp if available, otherwise keep order
    kegiatan.sort((a, b) => {
      if (!a.timestamp && !b.timestamp) return 0;
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    // Calculate final daily status
    let finalStatus = 'ALPA';
    let isLate = false;

    // Gate status
    const gateStatus = gerbangTaps.find(t => t.status === 'HADIR')?.status || gerbangTaps[0]?.status;
    const gateLate = gerbangTaps.some(t => t.is_terlambat);

    // Class status
    let classHasHadir = false;
    let classHasLate = false;
    let classHasSakit = false;
    let classHasIzin = false;

    if (tenant.absensi_mode === AbsensiMode.MULTI_SESI && typeof sessionTaps !== 'undefined') {
      classHasHadir = sessionTaps.some((c: any) => c.status === 'HADIR' || c.status === 'TERLAMBAT');
      classHasLate = sessionTaps.some((c: any) => c.is_terlambat || c.status === 'TERLAMBAT');
      classHasSakit = sessionTaps.some((c: any) => c.status === 'SAKIT');
      classHasIzin = sessionTaps.some((c: any) => c.status === 'IZIN' || c.status === 'DISPEN');
    }

    // PKL status
    const pklAbsen = await prisma.absensiPkl.findFirst({
      where: {
        tenant_id: tenantId,
        SiswaPkl: { siswa_id: siswaId },
        tanggal: { gte: startOfDay, lte: endOfDay },
      },
      select: { status: true }
    });
    const pklStatus = pklAbsen?.status;

    if (gateStatus === 'HADIR' || classHasHadir || pklStatus === 'HADIR') {
      finalStatus = 'HADIR';
      if (gateLate || classHasLate) isLate = true;
    } else if (gateStatus === 'SAKIT' || classHasSakit) {
      finalStatus = 'SAKIT';
    } else if (gateStatus === 'IZIN' || classHasIzin) {
      finalStatus = 'IZIN';
    }

    // If there are no activities logged at all, check if they are ALPA
    const overallStatus = kegiatan.length > 0 ? (isLate && finalStatus === 'HADIR' ? 'TERLAMBAT' : finalStatus) : 'ALPA';

    return {
      nama: siswa.nama_siswa,
      nis: siswa.nis || '',
      tanggal: tanggal,
      status: overallStatus,
      kegiatan
    };
  }


  async getRekapHarianSiswa(siswaId: string, tanggal: string, tenantId: string, tahunPelajaranId?: string): Promise<RekapHarianSiswaResponse & { total_poin: number; poin: number }> {
    // 1. Validate Siswa & Tenant
    const siswa = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId },
    });
    if (!siswa) throw new Error('Siswa not found');

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { absensi_mode: true },
    });
    if (!tenant) throw new Error('Tenant not found');

    // 2. Determine Time Range (Start/End of Day)
    const tzConfig = await prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'TIMEZONE' } });
    const timeZone = tzConfig?.value || 'Asia/Jakarta';
    const TZ_OFFSET: Record<string, number> = { 'Asia/Jakarta': 7, 'Asia/Makassar': 8, 'Asia/Jayapura': 9 };
    const offset = TZ_OFFSET[timeZone] ?? 7;
    const dayStr = String(tanggal);
    const startOfDay = new Date(new Date(`${dayStr}T00:00:00.000Z`).getTime() - (offset * 60 * 60 * 1000));
    const endOfDay = new Date(new Date(`${dayStr}T23:59:59.999Z`).getTime() - (offset * 60 * 60 * 1000));

    // 3. Fetch Data
    // Gate (all modes)
    const gateWhere: any = {
      siswa_id: siswaId,
      tenant_id: tenantId,
      waktu_tap: { gte: startOfDay, lte: endOfDay },
    };
    if (tahunPelajaranId) gateWhere.tahun_pelajaran_id_snapshot = tahunPelajaranId;

    const gateTaps = await prisma.absenGerbangSiswa.findMany({
      where: gateWhere,
      select: { status: true, is_terlambat: true, poin_kehadiran: true, waktu_tap: true, arah: true }
    });

    // Class (MULTI_SESI only, untuk poin & rincian)
    let classTaps: any[] = [];
    if (tenant.absensi_mode === AbsensiMode.MULTI_SESI) {
      const sesiWhere: any = { tanggal: { gte: startOfDay, lte: endOfDay } };
      if (tahunPelajaranId) sesiWhere.tahun_pelajaran_id = tahunPelajaranId;

      classTaps = await prisma.absenSiswa.findMany({
        where: {
          tenant_id: tenantId,
          SiswaAkademik: { siswa_id: siswaId },
          SesiAbsensi: sesiWhere
        },
        select: {
          sesi_id: true,
          status: true,
          is_terlambat: true,
          poin_kehadiran: true,
          waktu_tap: true,
          SesiAbsensi: {
            select: {
              id: true,
              waktu_mulai: true,
              jenis_kegiatan: true,
              Guru: {
                select: {
                  nama_guru: true
                }
              },
              Mapel: {
                select: {
                  nama_mapel: true,
                  kode_mapel: true
                }
              },
              AbsenGuru: {
                take: 1,
                select: {
                  status: true
                }
              }
            }
          }
        }
      });
    }

    // PKL Data
    const pklAbsen = await prisma.absensiPkl.findFirst({
      where: {
        tenant_id: tenantId,
        SiswaPkl: { siswa_id: siswaId },
        tanggal: { gte: startOfDay, lte: endOfDay },
      },
      select: { status: true }
    });

    const pklPoin = pklAbsen?.status === 'HADIR' ? ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU : 0;

    // Gate Status Logic
    const gateStatus = gateTaps.find(t => t.status === 'HADIR')?.status || gateTaps[0]?.status;
    const gateLate = gateTaps.some(t => t.is_terlambat);

    // Class Status Logic
    const classHasHadir = classTaps.some(c => c.status === 'HADIR' || c.status === 'TERLAMBAT');
    const classHasLate = classTaps.some(c => c.is_terlambat || c.status === 'TERLAMBAT');
    const classHasSakit = classTaps.some(c => c.status === 'SAKIT');
    const classHasIzin = classTaps.some(c => c.status === 'IZIN' || c.status === 'DISPEN');
    const classHasDispen = classTaps.some(c => c.status === 'DISPEN');

    const gatePoin = gateTaps.reduce((acc, t) => acc + (t.poin_kehadiran || 0), 0);
    const classPoinSum = classTaps.reduce((sum, c) => sum + (c.poin_kehadiran || 0), 0);
    let dbPoin = 0;

    // Combined Status
    let finalStatus = 'ALPA';
    let isLate = false;

    if ((gateStatus === 'HADIR') || classHasHadir || (pklAbsen?.status === 'HADIR')) {
        finalStatus = 'HADIR';
        if (gateLate || classHasLate) isLate = true;
    } else if (gateStatus === 'SAKIT' || classHasSakit) {
        finalStatus = 'SAKIT';
    } else if (gateStatus === 'IZIN' || classHasIzin) {
        finalStatus = 'IZIN';
    } else if (gateStatus === 'DISPEN' || classHasDispen) {
        finalStatus = 'DISPEN';
    }

    // DB Poin: Accumulation (Gate + Class + PKL)
    if (gateTaps.length > 0 || classTaps.length > 0 || pklAbsen) {
        dbPoin = gatePoin + classPoinSum + pklPoin;
    }

    // Calculate Poin
    let calculatedPoin = 0;
    if (finalStatus === 'HADIR') {
        calculatedPoin = isLate ? ATTENDANCE_POINTS.HADIR_TERLAMBAT : ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;
    } else if (finalStatus === 'SAKIT') {
        calculatedPoin = ATTENDANCE_POINTS.SAKIT;
    } else if (finalStatus === 'IZIN') {
        calculatedPoin = ATTENDANCE_POINTS.IZIN;
    } else if (finalStatus === 'DISPEN') {
        calculatedPoin = ATTENDANCE_POINTS.DISPEN;
    } else {
        calculatedPoin = ATTENDANCE_POINTS.ALPA;
    }

    const totalPoin = dbPoin > 0 ? dbPoin : calculatedPoin;

    // 5. Construct Rincian Array
    const rincian: Array<{ sesi_id?: string; sesi_absensi_id?: string; id?: string; nama_mapel?: string; nama_guru?: string | null; status_guru?: string; kode_mapel?: string; jenis_kegiatan: string; status: string; waktu_tap: string | null; waktu?: string | null }> = [];

    gateTaps.forEach(tap => {
      rincian.push({
        jenis_kegiatan: tap.arah === 'GERBANG_DATANG' ? 'Datang (Gerbang)' : 'Pulang (Gerbang)',
        status: tap.is_terlambat && tap.status === 'HADIR' ? 'TERLAMBAT' : tap.status,
        waktu_tap: tap.waktu_tap ? tap.waktu_tap.toISOString() : null,
        waktu: tap.waktu_tap ? tap.waktu_tap.toISOString() : null
      });
    });

    classTaps.forEach(tap => {
      const mapelName = tap.SesiAbsensi?.Mapel?.nama_mapel;
      const guruName = tap.SesiAbsensi?.Guru?.nama_guru || null;
      const statusGuru = tap.SesiAbsensi?.AbsenGuru?.[0]?.status || (tap.SesiAbsensi?.status === 'SELESAI' ? 'ALPA' : 'BELUM_HADIR');
      const rawJenis = tap.SesiAbsensi?.jenis_kegiatan || 'KBM';
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const cleanJenis = isUUID(rawJenis) ? 'KBM' : rawJenis;
      const activityName = mapelName ? `${cleanJenis} - ${mapelName}` : (isUUID(rawJenis) ? 'Sesi Kelas' : rawJenis);
      
      const effectiveTime = tap.waktu_tap || tap.SesiAbsensi?.waktu_mulai;

      rincian.push({
        id: tap.SesiAbsensi?.id || tap.sesi_id,
        sesi_id: tap.sesi_id || tap.SesiAbsensi?.id,
        sesi_absensi_id: tap.sesi_id || tap.SesiAbsensi?.id,
        nama_mapel: mapelName,
        nama_guru: guruName,
        status_guru: statusGuru,
        kode_mapel: tap.SesiAbsensi?.Mapel?.kode_mapel,
        jenis_kegiatan: activityName,
        status: tap.is_terlambat && tap.status === 'HADIR' ? 'TERLAMBAT' : tap.status,
        waktu_tap: effectiveTime ? effectiveTime.toISOString() : null,
        waktu: effectiveTime ? effectiveTime.toISOString() : null
      });
    });

    rincian.sort((a, b) => {
      if (!a.waktu_tap && !b.waktu_tap) return 0;
      if (!a.waktu_tap) return 1;
      if (!b.waktu_tap) return -1;
      return new Date(a.waktu_tap).getTime() - new Date(b.waktu_tap).getTime();
    });

    return {
        nama_siswa: siswa.nama_siswa,
        tanggal: tanggal,
        status: isLate && finalStatus === 'HADIR' ? 'TERLAMBAT' : finalStatus,
        total_poin: totalPoin,
        poin: totalPoin,
        rincian
    };
  }
}
