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
    channel_summary?: {
      gerbang: { total_hadir: number; total_terlambat: number; total_tidak_tap: number; total_tap_gantung: number };
      pembiasaan: { total_hadir: number; total_alpa: number };
      kbm: { total_sesi: number; hadir_sesi: number; alpa_sesi: number; persentase: number };
      pkl: { is_active: boolean; total_hadir: number; total_alpa: number; mitra_nama?: string };
      anomali_count: number;
    };
  };
  persentase_kehadiran: number;
  total_hadir: number;
  total_izin: number;
  total_sakit: number;
  total_alpa: number;
  total_terlambat: number;
  total_poin: number;
  detail: Array<{
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
    channels?: {
      gerbang?: {
        status: string;
        waktu_masuk?: string | null;
        waktu_pulang?: string | null;
        is_terlambat?: boolean;
        is_tap_gantung?: boolean;
      };
      pembiasaan?: {
        status: string;
        nama?: string | null;
      };
      kbm?: {
        status: string;
        total_sesi: number;
        hadir_sesi: number;
        alpa_sesi: number;
        daftar_mapel?: Array<{ mapel: string; status: string; jam?: string }>;
      };
      pkl?: {
        status: string;
        mitra?: string | null;
        waktu_masuk?: string | null;
        waktu_pulang?: string | null;
      };
    };
    anomali?: {
      is_anomali: boolean;
      tipe?: string;
      pesan?: string;
    };
  }>;
  mapel_matrix?: {
    mapel_list: Array<{ id: string; nama_mapel: string; kode_mapel?: string }>;
    dates: string[];
    records: Array<{
      date: string;
      day: number;
      day_name: string;
      is_weekend: boolean;
      gerbang?: {
        datang_waktu?: string | null;
        datang_status?: string | null;
        pulang_waktu?: string | null;
        pulang_status?: string | null;
        is_terlambat?: boolean;
        is_tap_gantung?: boolean;
      };
      pembiasaan?: {
        status?: string | null;
        nama?: string | null;
      };
      mapel_sessions: Record<string, {
        status: string;
        waktu?: string | null;
        guru?: string | null;
        jp?: number;
      } | null>;
      pkl?: {
        status?: string | null;
        mitra?: string | null;
      };
      final_status: string;
      anomali?: {
        is_anomali: boolean;
        tipe?: string;
        pesan?: string;
      };
    }>;
    summary_per_mapel: Record<string, {
      nama_mapel: string;
      total_sesi: number;
      hadir: number;
      alpa: number;
      persentase: number;
    }>;
  };
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

    const formatTime = (date: Date) => {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date).replace('.', ':');
    };

    const todayDateKey = formatDateKey(new Date());

    const statistik: any = {
      HADIR: 0,
      IZIN: 0,
      SAKIT: 0,
      ALPA: 0,
      TERLAMBAT: 0,
      DISPEN: 0,
    };
    let total_poin = 0;

    // Track Multi-Channel Aggregates
    let totalGateHadir = 0;
    let totalGateTerlambat = 0;
    let totalGateTidakTap = 0;
    let totalGateTapGantung = 0;

    let totalPembiasaanHadir = 0;
    let totalPembiasaanAlpa = 0;

    let totalKbmSesi = 0;
    let totalKbmHadir = 0;
    let totalKbmAlpa = 0;

    let totalPklHadir = 0;
    let totalPklAlpa = 0;
    let isPklActive = false;
    let pklMitraName: string | undefined = undefined;

    let anomaliCount = 0;

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
        select: { status: true, is_terlambat: true, poin_kehadiran: true, waktu_tap: true, arah: true },
        orderBy: { waktu_tap: 'asc' }
      });

      // 2b. Fetch PKL Data
      const absenPkl = await prisma.absensiPkl.findMany({
        where: {
          tenant_id: tenantId,
          SiswaPkl: { siswa_id: siswaId },
          tanggal: { gte: startOfMonth, lte: endOfMonth },
        },
        include: {
          SiswaPkl: {
            select: {
              Mitra: { select: { nama: true } }
            }
          }
        }
      });

      if (absenPkl.length > 0) {
        isPklActive = true;
      }

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
          if (!pklMitraName && (absen as any)?.SiswaPkl?.Mitra?.nama) {
            pklMitraName = (absen as any).SiswaPkl.Mitra.nama;
          }
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

        // ─── Channel Breakdown Extraction ───
        // 1. Gerbang
        const datangTap = gateTaps.find(t => t.arah === 'GERBANG_DATANG') || gateTaps[0];
        const pulangTap = gateTaps.find(t => t.arah === 'GERBANG_PULANG');
        const isToday = date === todayDateKey;
        const hasGateTap = gateTaps.length > 0;
        const isTapGantung = Boolean(datangTap && !pulangTap && !isToday && gateTaps.length === 1);
        
        let gateChanStatus = 'TIDAK_TAP';
        if (hasGateTap) {
          if (gateLate) {
            gateChanStatus = 'TERLAMBAT';
            totalGateTerlambat++;
          } else {
            gateChanStatus = datangTap?.status || 'HADIR';
            totalGateHadir++;
          }
          if (isTapGantung) {
            totalGateTapGantung++;
          }
        } else {
          totalGateTidakTap++;
        }

        const channelGerbang = {
          status: gateChanStatus,
          waktu_masuk: datangTap?.waktu_tap ? formatTime(datangTap.waktu_tap) : null,
          waktu_pulang: pulangTap?.waktu_tap ? formatTime(pulangTap.waktu_tap) : null,
          is_terlambat: gateLate,
          is_tap_gantung: isTapGantung,
        };

        // 2. Pembiasaan
        const pembiasaanItems = classTaps.filter(c => {
          const jk = (c.SesiAbsensi?.jenis_kegiatan || '').toUpperCase();
          const nm = (c.SesiAbsensi?.Mapel?.nama_mapel || '').toUpperCase();
          return jk.includes('PEMBIASAAN') || jk.includes('DHUHA') || jk.includes('UPACARA') || jk.includes('APEL') || jk.includes('LITERASI') ||
                 nm.includes('PEMBIASAAN') || nm.includes('DHUHA') || nm.includes('UPACARA') || nm.includes('APEL');
        });

        let channelPembiasaan: { status: string; nama?: string | null } = { status: 'TIDAK_ADA', nama: null };
        if (pembiasaanItems.length > 0) {
          const isHadir = pembiasaanItems.some(p => p.status === 'HADIR' || p.status === 'TEPAT_WAKTU');
          const isAlpa = pembiasaanItems.some(p => p.status === 'ALPA');
          const namaKegiatan = pembiasaanItems.map(p => p.SesiAbsensi?.Mapel?.nama_mapel || p.SesiAbsensi?.jenis_kegiatan || 'Pembiasaan').join(', ');
          channelPembiasaan = {
            status: isHadir ? 'HADIR' : (isAlpa ? 'ALPA' : (pembiasaanItems[0]?.status || 'HADIR')),
            nama: namaKegiatan,
          };
          if (channelPembiasaan.status === 'HADIR') totalPembiasaanHadir++;
          else if (channelPembiasaan.status === 'ALPA') totalPembiasaanAlpa++;
        }

        // 3. KBM (Multi Sesi Mapel)
        const kbmItems = classTaps.filter(c => !pembiasaanItems.includes(c));
        let channelKbm: {
          status: string;
          total_sesi: number;
          hadir_sesi: number;
          alpa_sesi: number;
          daftar_mapel?: Array<{ mapel: string; status: string; jam?: string }>;
        } = { status: 'TIDAK_ADA', total_sesi: 0, hadir_sesi: 0, alpa_sesi: 0 };

        if (kbmItems.length > 0) {
          const hadirCount = kbmItems.filter(k => k.status === 'HADIR' || k.status === 'TERLAMBAT' || k.status === 'TEPAT_WAKTU').length;
          const alpaCount = kbmItems.filter(k => k.status === 'ALPA').length;
          totalKbmSesi += kbmItems.length;
          totalKbmHadir += hadirCount;
          totalKbmAlpa += alpaCount;

          channelKbm = {
            status: alpaCount === 0 ? 'FULL' : (hadirCount > 0 ? 'PARTIAL' : 'ALPA'),
            total_sesi: kbmItems.length,
            hadir_sesi: hadirCount,
            alpa_sesi: alpaCount,
            daftar_mapel: kbmItems.map(k => ({
              mapel: k.SesiAbsensi?.Mapel?.nama_mapel || 'Sesi Pelajaran',
              status: k.status,
              jam: k.SesiAbsensi?.waktu_mulai ? formatTime(k.SesiAbsensi.waktu_mulai) : undefined,
            })),
          };
        }

        // 4. PKL (DU/DI)
        let channelPkl: {
          status: string;
          mitra?: string | null;
          waktu_masuk?: string | null;
          waktu_pulang?: string | null;
        } = { status: 'NON_PKL', mitra: null };

        if (data.pkl) {
          const pklMitra = data.pkl.SiswaPkl?.Mitra?.nama || 'DU/DI';
          channelPkl = {
            status: data.pkl.status || 'HADIR',
            mitra: pklMitra,
            waktu_masuk: data.pkl.jam_masuk ? formatTime(data.pkl.jam_masuk) : null,
            waktu_pulang: data.pkl.jam_pulang ? formatTime(data.pkl.jam_pulang) : null,
          };
          if (channelPkl.status === 'HADIR') totalPklHadir++;
          else if (channelPkl.status === 'ALPA') totalPklAlpa++;
        }

        // 5. Anomali Detection
        let isAnomali = false;
        let anomaliTipe: string | undefined = undefined;
        let anomaliPesan: string | undefined = undefined;

        if (hasGateTap && channelKbm.alpa_sesi > 0) {
          isAnomali = true;
          anomaliTipe = 'CABUT_KBM';
          anomaliPesan = `Tap gerbang (${channelGerbang.waktu_masuk || 'Pagi'}), tapi Alpa di ${channelKbm.alpa_sesi} sesi KBM`;
        } else if (channelGerbang.is_terlambat) {
          isAnomali = true;
          anomaliTipe = 'TERLAMBAT_GERBANG';
          anomaliPesan = `Terlambat tiba di gerbang sekolah (${channelGerbang.waktu_masuk})`;
        } else if (channelGerbang.is_tap_gantung) {
          isAnomali = true;
          anomaliTipe = 'TAP_GANTUNG';
          anomaliPesan = `Masuk gerbang (${channelGerbang.waktu_masuk}) tanpa rekam tap pulang`;
        } else if (hasGateTap && channelPembiasaan.status === 'ALPA') {
          isAnomali = true;
          anomaliTipe = 'LEWAT_PEMBIASAAN';
          anomaliPesan = `Hadir di sekolah tapi tidak mengikuti ${channelPembiasaan.nama || 'pembiasaan'}`;
        } else if (calculatedStatus === 'ALPA' && (hasGateTap || kbmItems.length > 0)) {
          isAnomali = true;
          anomaliTipe = 'ALPA_TOTAL';
          anomaliPesan = 'Tidak hadir di seluruh channel kegiatan belajar';
        }

        if (isAnomali) {
          anomaliCount++;
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
          nama_guru: guruName,
          channels: {
            gerbang: channelGerbang,
            pembiasaan: channelPembiasaan,
            kbm: channelKbm,
            pkl: channelPkl,
          },
          anomali: {
            is_anomali: isAnomali,
            tipe: anomaliTipe,
            pesan: anomaliPesan,
          },
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

    statistik.channel_summary = {
      gerbang: {
        total_hadir: totalGateHadir,
        total_terlambat: totalGateTerlambat,
        total_tidak_tap: totalGateTidakTap,
        total_tap_gantung: totalGateTapGantung,
      },
      pembiasaan: {
        total_hadir: totalPembiasaanHadir,
        total_alpa: totalPembiasaanAlpa,
      },
      kbm: {
        total_sesi: totalKbmSesi,
        hadir_sesi: totalKbmHadir,
        alpa_sesi: totalKbmAlpa,
        persentase: totalKbmSesi > 0 ? Math.round((totalKbmHadir / totalKbmSesi) * 100) : 100,
      },
      pkl: {
        is_active: isPklActive,
        total_hadir: totalPklHadir,
        total_alpa: totalPklAlpa,
        mitra_nama: pklMitraName,
      },
      anomali_count: anomaliCount,
    };

    // ─── Construct Mapel-Centric 30-Day Multi-Channel Matrix ───
    const mapelMap = new Map<string, { id: string; nama_mapel: string; kode_mapel?: string }>();

    // 1. Gather mapels from student's attended sessions
    if (typeof absenSiswa !== 'undefined') {
      absenSiswa.forEach(a => {
        const m = a.SesiAbsensi?.Mapel;
        if (m && m.id) {
          mapelMap.set(m.id, { id: m.id, nama_mapel: m.nama_mapel, kode_mapel: m.kode_mapel || undefined });
        }
      });
    }

    // 2. Also query all mapels taught in this class during the month
    if (siswa.kelas_id) {
      try {
        const classSessions = await prisma.sesiAbsensi.findMany({
          where: {
            kelas_id: siswa.kelas_id,
            tenant_id: tenantId,
            tanggal: { gte: startOfMonth, lte: endOfMonth }
          },
          select: {
            mapel_id: true,
            Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } }
          }
        });
        classSessions.forEach(cs => {
          if (cs.Mapel && cs.Mapel.id) {
            mapelMap.set(cs.Mapel.id, { id: cs.Mapel.id, nama_mapel: cs.Mapel.nama_mapel, kode_mapel: cs.Mapel.kode_mapel || undefined });
          }
        });
      } catch {}
    }

    const mapelList = Array.from(mapelMap.values()).sort((a, b) => a.nama_mapel.localeCompare(b.nama_mapel));

    // Summary per mapel accumulators
    const summaryPerMapel: Record<string, { nama_mapel: string; total_sesi: number; hadir: number; alpa: number; persentase: number }> = {};
    mapelList.forEach(m => {
      summaryPerMapel[m.id] = { nama_mapel: m.nama_mapel, total_sesi: 0, hadir: 0, alpa: 0, persentase: 100 };
    });

    const dates: string[] = [];
    const matrixRecords: Array<{
      date: string;
      day: number;
      day_name: string;
      is_weekend: boolean;
      gerbang?: {
        datang_waktu?: string | null;
        datang_status?: string | null;
        pulang_waktu?: string | null;
        pulang_status?: string | null;
        is_terlambat?: boolean;
        is_tap_gantung?: boolean;
      };
      pembiasaan?: {
        status?: string | null;
        nama?: string | null;
      };
      mapel_sessions: Record<string, {
        status: string;
        waktu?: string | null;
        guru?: string | null;
        jp?: number;
      } | null>;
      pkl?: {
        status?: string | null;
        mitra?: string | null;
      };
      final_status: string;
      anomali?: {
        is_anomali: boolean;
        tipe?: string;
        pesan?: string;
      };
    }> = [];

    // Map existing detail by date
    const detailByDate = new Map<string, any>();
    detail.forEach(d => {
      if (d.tanggal) detailByDate.set(d.tanggal, d);
    });

    // Populate every day from 1 to lastDay.getDate()
    const totalDaysInMonth = lastDay.getDate();
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayDate = new Date(year, month - 1, day);
      const jsDay = dayDate.getDay();
      const isWeekend = jsDay === 0 || jsDay === 6;
      const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(dayDate);
      const dayDateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dates.push(dayDateKey);

      const d = detailByDate.get(dayDateKey);
      const channels = d?.channels;
      const anomali = d?.anomali;

      // Extract sessions per mapel for this day
      const dayMapelSessions: Record<string, any> = {};
      mapelList.forEach(m => {
        dayMapelSessions[m.id] = null; // default null = non-jadwal (·)
      });

      if (channels?.kbm?.daftar_mapel && Array.isArray(channels.kbm.daftar_mapel)) {
        channels.kbm.daftar_mapel.forEach((ms: any) => {
          const matched = mapelList.find(m => m.nama_mapel.toLowerCase() === (ms.mapel || '').toLowerCase());
          const mapelKey = matched ? matched.id : ms.mapel;
          dayMapelSessions[mapelKey] = {
            status: ms.status || 'HADIR',
            waktu: ms.jam || null,
            guru: ms.guru || null,
          };

          if (matched && summaryPerMapel[matched.id]) {
            summaryPerMapel[matched.id].total_sesi++;
            if (ms.status === 'HADIR' || ms.status === 'TERLAMBAT' || ms.status === 'TEPAT_WAKTU') {
              summaryPerMapel[matched.id].hadir++;
            } else if (ms.status === 'ALPA') {
              summaryPerMapel[matched.id].alpa++;
            }
          }
        });
      }

      matrixRecords.push({
        date: dayDateKey,
        day,
        day_name: dayName,
        is_weekend: isWeekend,
        gerbang: channels?.gerbang ? {
          datang_waktu: channels.gerbang.waktu_masuk,
          datang_status: channels.gerbang.status,
          pulang_waktu: channels.gerbang.waktu_pulang,
          pulang_status: channels.gerbang.waktu_pulang ? 'HADIR' : (channels.gerbang.is_tap_gantung ? 'BELUM_TAP' : null),
          is_terlambat: channels.gerbang.is_terlambat,
          is_tap_gantung: channels.gerbang.is_tap_gantung,
        } : undefined,
        pembiasaan: channels?.pembiasaan?.status !== 'TIDAK_ADA' ? {
          status: channels?.pembiasaan?.status,
          nama: channels?.pembiasaan?.nama,
        } : undefined,
        mapel_sessions: dayMapelSessions,
        pkl: channels?.pkl?.status !== 'NON_PKL' ? {
          status: channels?.pkl?.status,
          mitra: channels?.pkl?.mitra,
        } : undefined,
        final_status: d?.status || (isWeekend ? 'LIBUR' : 'TIDAK_ADA'),
        anomali: anomali?.is_anomali ? anomali : undefined,
      });
    }

    mapelList.forEach(m => {
      const s = summaryPerMapel[m.id];
      if (s) {
        s.persentase = s.total_sesi > 0 ? Math.round((s.hadir / s.total_sesi) * 100) : 100;
      }
    });

    const mapelMatrix = {
      mapel_list: mapelList,
      dates,
      records: matrixRecords,
      summary_per_mapel: summaryPerMapel,
    };

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
      detail,
      mapel_matrix: mapelMatrix
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

    // 3. PKL status & activities
    const pklAbsenList = await prisma.absensiPkl.findMany({
      where: {
        tenant_id: tenantId,
        SiswaPkl: { siswa_id: siswaId },
        tanggal: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        SiswaPkl: {
          select: {
            Mitra: { select: { nama: true } }
          }
        }
      }
    });

    for (const pkl of pklAbsenList) {
      const mitraNama = pkl.SiswaPkl?.Mitra?.nama || 'DU/DI';
      if (pkl.jam_masuk) {
        kegiatan.push({
          waktu: formatTime(pkl.jam_masuk),
          timestamp: pkl.jam_masuk,
          jenis_kegiatan: `PKL Masuk - ${mitraNama}`,
          status: pkl.status,
          keterangan: pkl.kegiatan || (pkl.is_outside_radius ? 'Presensi di luar radius mitra' : null)
        });
      }
      if (pkl.jam_pulang) {
        kegiatan.push({
          waktu: formatTime(pkl.jam_pulang),
          timestamp: pkl.jam_pulang,
          jenis_kegiatan: `PKL Pulang - ${mitraNama}`,
          status: pkl.status,
          keterangan: pkl.kegiatan || null
        });
      }
      if (!pkl.jam_masuk && !pkl.jam_pulang) {
        kegiatan.push({
          waktu: '-',
          timestamp: null,
          jenis_kegiatan: `PKL - ${mitraNama}`,
          status: pkl.status,
          keterangan: pkl.kegiatan || null
        });
      }
    }

    // Sort by timestamp if available, otherwise keep order
    kegiatan.sort((a, b) => {
      if (!a.timestamp && !b.timestamp) return 0;
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    const pklAbsen = pklAbsenList[0] || null;
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
