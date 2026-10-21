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


export class KelasRekapCalculator {
  async getRekapBulananKelas(kelasId: string, bulan: string, tenantId: string, tahunPelajaranId?: string, scope?: DataScope): Promise<RekapKelasBulananData> {
    // Security check for DataScope
    if (scope && Array.isArray(scope.kelasIds) && scope.kelasIds.length > 0 && scope.tenantWide !== true) {
      if (!scope.kelasIds.map(id => String(id)).includes(String(kelasId))) {
        throw new Error('Forbidden: You do not have access to this class data.');
      }
    }

    const cacheKey = CACHE_KEYS.ACADEMIC.REKAP_KELAS_BULANAN(tenantId, kelasId, bulan, tahunPelajaranId);
    const cached = await cacheService.get<RekapKelasBulananData>(cacheKey);
    if (cached) return cached;

    const [yearStr, monthStr] = bulan.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    
    // Get Tenant Timezone
    const timeZone = await getTenantTimezone(tenantId);
    const offsetStr = getTenantOffsetString(timeZone);

    const startOfMonth = new Date(`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-01T00:00:00.000${offsetStr}`);
    const lastDay = new Date(year, month, 0);
    const lastDayStr = `${String(lastDay.getFullYear()).padStart(4,'0')}-${String(lastDay.getMonth()+1).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`;
    const endOfMonth = new Date(`${lastDayStr}T23:59:59.999${offsetStr}`);

    // 1. Get Students (Strict Academic Year Alignment)
    const students = await this.getStudentsForClass(kelasId, tenantId, tahunPelajaranId);

    // If no students enrolled in this class for the selected academic year, return clean empty result
    if (students.length === 0) {
      let waliKelasData: { nama_guru: string; nip: string | null } | null = null;
      try {
        const waliAssign = await prisma.organizationalAssignment.findFirst({
          where: { kelas_id: kelasId, tenant_id: tenantId, is_active: true },
          include: { User: { include: { Guru: true } } }
        });
        const g = Array.isArray(waliAssign?.User?.Guru) ? waliAssign?.User?.Guru[0] : waliAssign?.User?.Guru;
        if (g?.nama_guru) {
          waliKelasData = { nama_guru: g.nama_guru, nip: g.nip || null };
        }
      } catch (e) {}

      const emptyResult: RekapKelasBulananData = {
        kelas_id: kelasId,
        bulan,
        total_hadir: 0,
        total_sakit: 0,
        total_izin: 0,
        total_alpa: 0,
        total_telat: 0,
        persentase_kehadiran: 0,
        wali_kelas: waliKelasData,
        students: []
      };
      await cacheService.set(cacheKey, emptyResult, 300);
      return emptyResult;
    }

    const studentIds = students.map(s => s.id);

    // Get Tenant Mode
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { absensi_mode: true }
    });

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

    const studentStats = new Map<string, { hadir: number, sakit: number, izin: number, alpa: number, telat: number, poin: number, dailyMap: Record<string, string> }>();
    students.forEach(s => {
      studentStats.set(s.id, { hadir: 0, sakit: 0, izin: 0, alpa: 0, telat: 0, poin: 0, dailyMap: {} });
    });

    // --- MERGE STRATEGY: Fetch BOTH Gate and Class Data ---

    // 1. Fetch Gate Data (AbsenGerbangSiswa) - Valid for ALL modes
    const whereGerbang: any = {
      siswa_id: { in: studentIds },
      tenant_id: tenantId,
      waktu_tap: { gte: startOfMonth, lte: endOfMonth },
    };
    if (tahunPelajaranId) whereGerbang.tahun_pelajaran_id_snapshot = tahunPelajaranId;
    
    const absenGerbang = await prisma.absenGerbangSiswa.findMany({
      where: whereGerbang,
      select: { siswa_id: true, status: true, is_terlambat: true, waktu_tap: true, poin_kehadiran: true }
    });

    // 2. Fetch Class Data (AbsenSiswa) - Valid for MULTI_SESI
    let absenSiswa: any[] = [];
    if (tenant?.absensi_mode !== AbsensiMode.SIMPLE) {
        const sesiWhere: any = { tanggal: { gte: startOfMonth, lte: endOfMonth } };
        if (tahunPelajaranId) sesiWhere.tahun_pelajaran_id = tahunPelajaranId;

        absenSiswa = await prisma.absenSiswa.findMany({
            where: {
            tenant_id: tenantId,
            SiswaAkademik: { siswa_id: { in: studentIds } },
            SesiAbsensi: sesiWhere,
            },
            select: {
            status: true, is_terlambat: true, poin_kehadiran: true,
            SiswaAkademik: { select: { siswa_id: true } },
            SesiAbsensi: { select: { tanggal: true } }
            }
        });
    }

    // 2b. Fetch PKL Data (AbsensiPkl)
    const absenPkl = await prisma.absensiPkl.findMany({
      where: {
        tenant_id: tenantId,
        SiswaPkl: { siswa_id: { in: studentIds } },
        tanggal: { gte: startOfMonth, lte: endOfMonth },
      },
      select: {
        status: true,
        tanggal: true,
        SiswaPkl: { select: { siswa_id: true } }
      }
    });

    // 3. Process & Merge Data
    const dailyRecords = new Map<string, Map<string, { gate: any, class: { status: string, poin: number, is_terlambat: boolean }[], pkl: any | null }>>();

    // Helper to ensure record exists
    const getRecord = (sid: string, date: string) => {
        if (!dailyRecords.has(sid)) dailyRecords.set(sid, new Map());
        const studentMap = dailyRecords.get(sid)!;
        if (!studentMap.has(date)) studentMap.set(date, { gate: null, class: [], pkl: null });
        return studentMap.get(date)!;
    };

    // Populate from PKL
    absenPkl.forEach(absen => {
      const date = formatDateKey(absen.tanggal);
      const sid = absen.SiswaPkl?.siswa_id;
      if (date && sid) {
        const rec = getRecord(sid, date);
        rec.pkl = absen;
      }
    });

    // Populate from Gate
    absenGerbang.forEach(tap => {
        if (!tap.waktu_tap) return;
        const date = formatDateKey(tap.waktu_tap);
        const rec = getRecord(tap.siswa_id, date);
        if (!rec.gate || (tap.status === 'HADIR' && rec.gate.status !== 'HADIR')) {
            rec.gate = tap;
        }
    });

    // Populate from Class
    absenSiswa.forEach(absen => {
        if (absen.SesiAbsensi?.tanggal) {
            const date = formatDateKey(absen.SesiAbsensi.tanggal);
            const sid = absen.SiswaAkademik?.siswa_id;
            if (date && sid) {
                const rec = getRecord(sid, date);
                let s = absen.status;
                if (s === 'HADIR' && absen.is_terlambat) s = 'TERLAMBAT';
                rec.class.push({ 
                    status: s, 
                    poin: absen.poin_kehadiran || 0,
                    is_terlambat: absen.is_terlambat
                });
            }
        }
    });

    // 4. Calculate Final Stats
    dailyRecords.forEach((datesMap, sid) => {
        const stats = studentStats.get(sid);
        if (!stats) return;

        datesMap.forEach((rec, dateKey) => {
            let dbPoin = 0;
            const gatePoin = rec.gate?.poin_kehadiran || 0;

            if (rec.class.length > 0) {
                const maxClassPoin = Math.max(...rec.class.map(c => c.poin));
                dbPoin = maxClassPoin;
            } else if (rec.gate) {
                dbPoin = gatePoin;
            }

            const gateItems = rec.gate ? [{ arah: 'GERBANG', status: rec.gate.status, is_terlambat: rec.gate.is_terlambat }] : [];
            const classItems = rec.class.map(c => ({ status: c.status === 'TERLAMBAT' ? 'HADIR' : c.status, is_terlambat: c.is_terlambat || c.status === 'TERLAMBAT' }));
            const hybridRes = AttendanceRuleEngine.calculateHybridStatus(gateItems, classItems, rec.pkl);

            const finalStatus = hybridRes.status;
            const isLate = hybridRes.isLate;
            const calculatedPoin = hybridRes.points;

            let statusCode = 'A';
            if (finalStatus === 'HADIR') {
                stats.hadir++;
                if (isLate) {
                    stats.telat++;
                    statusCode = 'T';
                } else {
                    statusCode = 'H';
                }
            } else if (finalStatus === 'SAKIT') {
                stats.sakit++;
                statusCode = 'S';
            } else if (finalStatus === 'IZIN') {
                stats.izin++;
                statusCode = 'I';
            } else {
                stats.alpa++;
                statusCode = 'A';
            }

            const dayNum = parseInt(dateKey.split('-')[2] || '0', 10).toString();
            if (dayNum !== '0') {
              stats.dailyMap[dayNum] = statusCode;
            }

            if (dbPoin > 0) {
                stats.poin += dbPoin;
            } else {
                stats.poin += calculatedPoin;
            }
        });
    });

    // Aggregate Class Stats
    let totalHadir = 0, totalSakit = 0, totalIzin = 0, totalAlpa = 0, totalTelat = 0;
    const studentList: any[] = [];

    students.forEach(s => {
      const st = studentStats.get(s.id)!;
      totalHadir += st.hadir;
      totalSakit += st.sakit;
      totalIzin += st.izin;
      totalAlpa += st.alpa;
      totalTelat += st.telat;

      const totalDays = st.hadir + st.sakit + st.izin + st.alpa;
      const persentase = totalDays > 0 ? Math.round((st.hadir / totalDays) * 100) : 0;

      studentList.push({
        id: s.id,
        siswa_id: s.id,
        nama: s.nama_siswa,
        nama_siswa: s.nama_siswa,
        nis: s.nis || null,
        hadir: st.hadir,
        sakit: st.sakit,
        izin: st.izin,
        alpa: st.alpa,
        HADIR: st.hadir,
        IZIN: st.izin,
        SAKIT: st.sakit,
        ALPA: st.alpa,
        TERLAMBAT: st.telat,
        persentase,
        total_poin: st.poin,
        dailyMap: st.dailyMap
      });
    });
    
    // Sort students by Attendance Score (Total Poin descending, then Name)
    studentList.sort((a, b) => b.total_poin - a.total_poin || a.nama.localeCompare(b.nama));

    const grandTotal = totalHadir + totalSakit + totalIzin + totalAlpa;
    const classPersentase = grandTotal > 0 ? Math.round((totalHadir / grandTotal) * 100) : 0;

    let waliKelasData: { nama_guru: string; nip: string | null } | null = null;
    try {
      const waliAssign = await prisma.organizationalAssignment.findFirst({
        where: {
          kelas_id: kelasId,
          tenant_id: tenantId,
          is_active: true,
        },
        include: {
          User: {
            include: {
              Guru: true
            }
          }
        }
      });
      const g = Array.isArray(waliAssign?.User?.Guru) ? waliAssign?.User?.Guru[0] : waliAssign?.User?.Guru;
      if (g?.nama_guru) {
        waliKelasData = { nama_guru: g.nama_guru, nip: g.nip || null };
      } else {
        const fallbackAssign = await prisma.organizationalAssignment.findFirst({
          where: {
            kelas_id: kelasId,
            tenant_id: tenantId,
          },
          include: {
            User: {
              include: {
                Guru: true
              }
            }
          }
        });
        const fg = Array.isArray(fallbackAssign?.User?.Guru) ? fallbackAssign?.User?.Guru[0] : fallbackAssign?.User?.Guru;
        if (fg?.nama_guru) {
          waliKelasData = { nama_guru: fg.nama_guru, nip: fg.nip || null };
        }
      }
    } catch (e) {}

    const result: RekapKelasBulananData = {
      kelas_id: kelasId,
      bulan,
      total_hadir: totalHadir,
      total_sakit: totalSakit,
      total_izin: totalIzin,
      total_alpa: totalAlpa,
      total_telat: totalTelat,
      persentase_kehadiran: classPersentase,
      wali_kelas: waliKelasData,
      students: studentList
    };

    await cacheService.set(cacheKey, result, 300);
    return result;
  }


  async getRekapBulananMapel(
    kelasId: string,
    mapelId: string,
    bulan: string,
    tenantId: string,
    tahunPelajaranId?: string
  ): Promise<RekapMapelBulananData> {
    const cacheKey = CACHE_KEYS.ACADEMIC.REKAP_MAPEL_BULANAN(tenantId, kelasId, mapelId, bulan, tahunPelajaranId);
    const cached = await cacheService.get<RekapMapelBulananData>(cacheKey);
    if (cached) return cached;

    const [yearStr, monthStr] = bulan.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const timeZone = await getTenantTimezone(tenantId);
    const offsetStr = getTenantOffsetString(timeZone);

    const startOfMonth = new Date(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01T00:00:00.000${offsetStr}`);
    const lastDay = new Date(year, month, 0);
    const lastDayStr = `${String(lastDay.getFullYear()).padStart(4, '0')}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    const endOfMonth = new Date(`${lastDayStr}T23:59:59.999${offsetStr}`);

    // 1. Fetch Students in Class (Strict Academic Year Alignment)
    const students = await this.getStudentsForClass(kelasId, tenantId, tahunPelajaranId);

    // 2. Fetch Mapel details
    const mapelObj = await prisma.mapel.findFirst({
      where: { id: mapelId, tenant_id: tenantId },
      select: { id: true, nama_mapel: true, kode_mapel: true }
    });

    if (students.length === 0) {
      const emptyResult: RekapMapelBulananData = {
        kelas_id: kelasId,
        mapel_id: mapelId,
        nama_mapel: mapelObj?.nama_mapel || '',
        kode_mapel: mapelObj?.kode_mapel || '',
        bulan,
        total_sesi: 0,
        total_siswa: 0,
        rata_rata_kehadiran: 0,
        dates: [],
        students: []
      };
      await cacheService.set(cacheKey, emptyResult, 300);
      return emptyResult;
    }

    const studentIds = students.map(s => s.id);

    // 3. Fetch Sessions for this Mapel & Class in Month
    const sesis = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: kelasId,
        mapel_id: mapelId,
        tanggal: { gte: startOfMonth, lte: endOfMonth },
        ...(tahunPelajaranId ? { tahun_pelajaran_id: tahunPelajaranId } : {})
      },
      include: {
        AbsenSiswa: {
          where: { siswa_id: { in: studentIds } },
          select: { siswa_id: true, status: true, is_terlambat: true, poin_kehadiran: true }
        },
        AbsenGuru: {
          take: 1,
          include: { Guru: { select: { nama_guru: true, nip: true } } }
        }
      },
      orderBy: { tanggal: 'asc' }
    });

    // 4. Resolve Guru Mapel info from sessions or GuruMapel relation
    let guruMapelData: { nama_guru: string; nip: string | null } | null = null;
    const guruFromSesi = sesis.find(s => s.AbsenGuru?.[0]?.Guru?.nama_guru)?.AbsenGuru?.[0]?.Guru;
    if (guruFromSesi?.nama_guru) {
      guruMapelData = { nama_guru: guruFromSesi.nama_guru, nip: guruFromSesi.nip || null };
    } else {
      const guruMapelAssign = await prisma.guruMapel.findFirst({
        where: { mapel_id: mapelId, tenant_id: tenantId },
        include: { Guru: { select: { nama_guru: true, nip: true } } }
      });
      if (guruMapelAssign?.Guru?.nama_guru) {
        guruMapelData = { nama_guru: guruMapelAssign.Guru.nama_guru, nip: guruMapelAssign.Guru.nip || null };
      }
    }

    // 5. Resolve Wali Kelas
    let waliKelasData: { nama_guru: string; nip: string | null } | null = null;
    try {
      const waliAssign = await prisma.organizationalAssignment.findFirst({
        where: { kelas_id: kelasId, tenant_id: tenantId, is_active: true },
        include: { User: { include: { Guru: true } } }
      });
      const g = Array.isArray(waliAssign?.User?.Guru) ? waliAssign?.User?.Guru[0] : waliAssign?.User?.Guru;
      if (g?.nama_guru) {
        waliKelasData = { nama_guru: g.nama_guru, nip: g.nip || null };
      }
    } catch (_) {}

    // 6. Aggregate student stats per session
    const studentStats = new Map<string, {
      hadir: number; sakit: number; izin: number; alpa: number; telat: number; poin: number;
      dailyMap: Record<string, string>;
    }>();

    students.forEach(s => {
      studentStats.set(s.id, { hadir: 0, sakit: 0, izin: 0, alpa: 0, telat: 0, poin: 0, dailyMap: {} });
    });

    // Process each session
    sesis.forEach(sesi => {
      const dateObj = new Date(sesi.tanggal);
      const dayNum = dateObj.getDate().toString();

      sesi.AbsenSiswa.forEach(absen => {
        if (!absen.siswa_id) return;
        const st = studentStats.get(absen.siswa_id);
        if (!st) return;

        const statusUpper = (absen.status || '').toUpperCase();
        let code = 'A';

        const calculatedPoin = AttendanceRuleEngine.calculateAttendancePoints(statusUpper, absen.is_terlambat);
        st.poin += calculatedPoin;

        if (statusUpper === 'HADIR') {
          st.hadir++;
          if (absen.is_terlambat) {
            st.telat++;
            code = 'T';
          } else {
            code = 'H';
          }
        } else if (statusUpper === 'SAKIT') {
          st.sakit++;
          code = 'S';
        } else if (statusUpper === 'IZIN' || statusUpper === 'DISPEN') {
          st.izin++;
          code = 'I';
        } else {
          st.alpa++;
          code = 'A';
        }

        st.dailyMap[dayNum] = code;
        st.poin += (absen.poin_kehadiran || 0);
      });
    });

    const studentList = students.map(s => {
      const st = studentStats.get(s.id)!;
      const totalRecorded = st.hadir + st.sakit + st.izin + st.alpa;
      const persentase = totalRecorded > 0 ? Math.round(((st.hadir) / totalRecorded) * 100) : 0;

      return {
        id: s.id,
        siswa_id: s.id,
        nama_siswa: s.nama_siswa,
        nis: s.nis || null,
        hadir: st.hadir,
        sakit: st.sakit,
        izin: st.izin,
        alpa: st.alpa,
        HADIR: st.hadir,
        IZIN: st.izin,
        SAKIT: st.sakit,
        ALPA: st.alpa,
        TERLAMBAT: st.telat,
        persentase,
        total_poin: st.poin,
        dailyMap: st.dailyMap
      };
    });

    const result: RekapMapelBulananData = {
      kelas_id: kelasId,
      mapel_id: mapelId,
      bulan,
      total_sesi: sesis.length,
      mapel: mapelObj ? { id: mapelObj.id, nama_mapel: mapelObj.nama_mapel, kode_mapel: mapelObj.kode_mapel } : null,
      guru_mapel: guruMapelData,
      wali_kelas: waliKelasData,
      students: studentList
    };

    await cacheService.set(cacheKey, result, 300);
    return result;
  }

  async getRekapBulananSekolah(tenantId: string, bulan: string, jurusanId?: string): Promise<{ students: any[] }> {
    const cacheKey = `leaderboard:sekolah:${tenantId}:${bulan}:${jurusanId || 'ALL'}`;
    const cache = CacheService.getInstance();
    const cached = await cache.get<{ students: any[] }>(cacheKey);
    if (cached) {
      return cached;
    }

    const whereKelas: any = { tenant_id: tenantId };
    if (jurusanId) {
      whereKelas.jurusan_id = jurusanId;
    }

    const classes = await prisma.kelas.findMany({
      where: whereKelas,
      select: { id: true, nama_kelas: true }
    });

    const allStudents: any[] = [];
    for (const k of classes) {
      try {
        const rekapKelas = await this.getRekapBulananKelas(k.id, bulan, tenantId);
        if (rekapKelas?.students) {
          rekapKelas.students.forEach((s: any) => {
            allStudents.push({
              ...s,
              nama_kelas: k.nama_kelas
            });
          });
        }
      } catch (err) {
        // Ignore single class error
      }
    }

    allStudents.sort((a, b) => (b.total_poin || 0) - (a.total_poin || 0) || (a.nama || '').localeCompare(b.nama || ''));
    const result = { students: allStudents };
    await cache.set(cacheKey, result, 300); // 5 minutes cache
    return result;
  }


  async getRekapHarianKelas(kelasId: string, tanggal: string, tenantId: string, tahunPelajaranId?: string) {
    // 1. Get Kelas and validate access
    const kelas = await prisma.kelas.findFirst({
      where: { id: kelasId, tenant_id: tenantId }
    });
    if (!kelas) throw new Error('Kelas not found');

    // 2. Fetch all active students in this class for the academic year
    const students = await this.getStudentsForClass(kelasId, tenantId, tahunPelajaranId);
    if (!students.length) return [];

    // 3. Determine Time Range (Start/End of Day)
    const tzConfig = await prisma.config.findFirst({ where: { tenant_id: tenantId, key: 'TIMEZONE' } });
    const timeZone = tzConfig?.value || 'Asia/Jakarta';
    const TZ_OFFSET: Record<string, number> = { 'Asia/Jakarta': 7, 'Asia/Makassar': 8, 'Asia/Jayapura': 9 };
    const offset = TZ_OFFSET[timeZone] ?? 7;
    const dayStr = String(tanggal);
    const startOfDay = new Date(new Date(`${dayStr}T00:00:00.000Z`).getTime() - (offset * 60 * 60 * 1000));
    const endOfDay = new Date(new Date(`${dayStr}T23:59:59.999Z`).getTime() - (offset * 60 * 60 * 1000));

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { absensi_mode: true },
    });
    if (!tenant) throw new Error('Tenant not found');

    const studentIds = students.map(s => s.id);

    // 4. Fetch Gate Taps in bulk
    const gateWhere: any = {
      siswa_id: { in: studentIds },
      tenant_id: tenantId,
      waktu_tap: { gte: startOfDay, lte: endOfDay },
    };
    if (tahunPelajaranId) gateWhere.tahun_pelajaran_id_snapshot = tahunPelajaranId;

    const gateTaps = await prisma.absenGerbangSiswa.findMany({
      where: gateWhere,
      select: { siswa_id: true, status: true, is_terlambat: true, poin_kehadiran: true }
    });

    // 5. Fetch Class KBM Sessions in bulk (only for MULTI_SESI)
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
        select: { SiswaAkademik: { select: { siswa_id: true } }, status: true, is_terlambat: true, poin_kehadiran: true }
      });
    }

    // 6. Fetch PKL Absences in bulk
    const pklAbsens = await prisma.absensiPkl.findMany({
      where: {
        tenant_id: tenantId,
        SiswaPkl: { siswa_id: { in: studentIds } },
        tanggal: { gte: startOfDay, lte: endOfDay },
      },
      select: { SiswaPkl: { select: { siswa_id: true } }, status: true }
    });

    // 7. Map for fast lookup
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

    // 8. Process each student in memory
    return students.map(siswa => {
      const sGateTaps = gateTapsMap.get(siswa.id) || [];
      const sClassTaps = classTapsMap.get(siswa.id) || [];
      const sPklAbsen = pklAbsensMap.get(siswa.id) || null;

      let finalStatus = 'ALPA';
      let isLate = false;
      let dbPoin = 0;

      const gateStatus = sGateTaps.find(t => t.status === 'HADIR')?.status || sGateTaps[0]?.status;
      const gateLate = sGateTaps.some(t => t.is_terlambat);
      const gatePoin = sGateTaps.reduce((acc, t) => acc + (t.poin_kehadiran || 0), 0);
      
      const pklStatus = sPklAbsen?.status;
      const pklPoin = sPklAbsen?.status === 'HADIR' ? ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU : 0;
      
      const classPoinSum = sClassTaps.reduce((sum, c) => sum + (c.poin_kehadiran || 0), 0);

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

      if (sGateTaps.length > 0 || sClassTaps.length > 0 || sPklAbsen) {
          dbPoin = gatePoin + classPoinSum + pklPoin;
      }

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

      return {
        id: siswa.id,
        siswa_id: siswa.id,
        nama: siswa.nama_siswa,
        nama_siswa: siswa.nama_siswa,
        nis: siswa.nis ?? null,
        status: isLate && finalStatus === 'HADIR' ? 'TERLAMBAT' : finalStatus,
        poin: totalPoin
      };
    });
  }

  /**
   * Helper: Mengambil daftar siswa yang valid terdaftar di kelas untuk tahun pelajaran yang diminta.
   * Mengutamakan relasi historis resmi di tabel `SiswaAkademik`, lalu fallback ke pointer langsung `Siswa`.
   * Jika tahunPelajaranId disediakan namun kelas tidak memiliki siswa di periode tersebut, mengembalikan array kosong [].
   */
  private async getStudentsForClass(
    kelasId: string,
    tenantId: string,
    tahunPelajaranId?: string
  ): Promise<Array<{ id: string; nama_siswa: string; nis: string | null }>> {
    if (tahunPelajaranId) {
      // 1. Query SiswaAkademik (Official Academic Enrollment History)
      const saList = await prisma.siswaAkademik.findMany({
        where: {
          kelas_id: kelasId,
          tahun_pelajaran_id: tahunPelajaranId,
          status: { not: 'PINDAH' as any },
          siswa: {
            tenant_id: tenantId,
          },
        },
        select: {
          siswa: {
            select: { id: true, nama_siswa: true, nis: true },
          },
        },
      });

      const studentMap = new Map<string, { id: string; nama_siswa: string; nis: string | null }>();
      for (const item of saList) {
        if (item.siswa && !studentMap.has(item.siswa.id)) {
          studentMap.set(item.siswa.id, {
            id: item.siswa.id,
            nama_siswa: item.siswa.nama_siswa,
            nis: item.siswa.nis,
          });
        }
      }

      if (studentMap.size > 0) {
        return Array.from(studentMap.values()).sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));
      }

      // 2. Fallback: Check direct Siswa table match on kelas_id AND tahun_pelajaran_id
      const directSiswa = await prisma.siswa.findMany({
        where: {
          kelas_id: kelasId,
          tahun_pelajaran_id: tahunPelajaranId,
          tenant_id: tenantId,
          status: 'AKTIF',
        },
        select: { id: true, nama_siswa: true, nis: true },
        orderBy: { nama_siswa: 'asc' },
      });

      if (directSiswa.length > 0) {
        return directSiswa;
      }

      // If tahunPelajaranId was explicitly requested and no student was enrolled in this class during that year,
      // return empty array. DO NOT leak students from other academic years!
      return [];
    }

    // Default when no academic year is specified: active students currently in class
    return prisma.siswa.findMany({
      where: {
        kelas_id: kelasId,
        tenant_id: tenantId,
        status: 'AKTIF',
      },
      select: { id: true, nama_siswa: true, nis: true },
      orderBy: { nama_siswa: 'asc' },
    });
  }

  /**
   * Helper: Mengambil Linimasa Angkatan Rombel (Cohort Progression Lineage X, XI, XII).
   * Menganalisis jejak siswa riil di `SiswaAkademik` sehingga akurat 100% meskipun ada perubahan
   * nama program/konsentrasi keahlian di Kurikulum Merdeka (contoh: X TE 3 -> XI TOI 3 -> XII TOI 3).
   */
  async getKelasCohortLineage(kelasId: string, tenantId: string, tahunPelajaranId?: string) {
    const currentClass = await prisma.kelas.findUnique({
      where: { id: kelasId },
      select: {
        id: true,
        nama_kelas: true,
        tingkat: true,
        jurusan_id: true,
        Jurusan: {
          select: {
            id: true,
            nama: true,
            kode: true,
            program_keahlian_id: true
          }
        }
      }
    });
    if (!currentClass) {
      throw new Error('Kelas tidak ditemukan');
    }

    // 1. Ambil daftar siswa yang terikat pada kelas & tahun ajaran ini
    const saWhere: any = { kelas_id: kelasId, status: { not: 'PINDAH' as any } };
    if (tahunPelajaranId) saWhere.tahun_pelajaran_id = tahunPelajaranId;
    if (tenantId) saWhere.siswa = { tenant_id: tenantId };

    let saStudents = await prisma.siswaAkademik.findMany({
      where: saWhere,
      select: { siswa_id: true, tahunPelajaran: { select: { tahun: true } } },
      distinct: ['siswa_id']
    });

    if (saStudents.length === 0) {
      saStudents = await prisma.siswaAkademik.findMany({
        where: {
          kelas_id: kelasId,
          status: { not: 'PINDAH' as any },
          ...(tenantId ? { siswa: { tenant_id: tenantId } } : {})
        },
        select: { siswa_id: true, tahunPelajaran: { select: { tahun: true } } },
        distinct: ['siswa_id']
      });
    }

    const studentIds = saStudents.map(s => s.siswa_id);

    // Resolusi daftar tingkat adaptif multi-jenjang (SD: 1-6, SMP: 7-9, SMA/SMK: 10-12/13)
    let targetTingkatList: number[] = [10, 11, 12];
    if (currentClass.tingkat >= 1 && currentClass.tingkat <= 6) {
      targetTingkatList = [1, 2, 3, 4, 5, 6];
    } else if (currentClass.tingkat >= 7 && currentClass.tingkat <= 9) {
      targetTingkatList = [7, 8, 9];
    } else if (currentClass.tingkat >= 10) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { durasi_smk: true }
      });
      const is4Tahun = tenant?.durasi_smk === '4_TAHUN' || currentClass.tingkat === 13;
      targetTingkatList = is4Tahun ? [10, 11, 12, 13] : [10, 11, 12];
    }

    const ROMAN_MAP: Record<number, string> = {
      1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
      7: 'VII', 8: 'VIII', 9: 'IX',
      10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII'
    };

    if (studentIds.length === 0) {
      return {
        currentClass,
        stages: targetTingkatList.map(tingkat => ({
          tingkat,
          label: ROMAN_MAP[tingkat] ? `Kelas ${ROMAN_MAP[tingkat]}` : `Tingkat ${tingkat}`,
          is_current: tingkat === currentClass.tingkat,
          is_available: tingkat === currentClass.tingkat,
          kelas_id: tingkat === currentClass.tingkat ? currentClass.id : null,
          nama_kelas: tingkat === currentClass.tingkat ? currentClass.nama_kelas : null,
          tahun_pelajaran_id: tingkat === currentClass.tingkat ? (tahunPelajaranId || null) : null,
          tahun: null,
          count: 0
        }))
      };
    }

    // Resolusi tahun dasar (baseStartYear) untuk validasi kronologi akademik angkatan (+1 tingkat = +1 tahun)
    let currentTpYear = saStudents[0]?.tahunPelajaran?.tahun || '';
    if (tahunPelajaranId) {
      const tpObj = await prisma.tahunPelajaran.findUnique({
        where: { id: tahunPelajaranId },
        select: { tahun: true }
      });
      if (tpObj?.tahun) currentTpYear = tpObj.tahun;
    }
    const baseYearMatch = currentTpYear.match(/^(\d{4})/);
    const baseStartYear = baseYearMatch ? parseInt(baseYearMatch[1], 10) : null;
    const baseTingkat = currentClass.tingkat;

    // 2. Ambil riwayat akademik seluruh siswa ini di jenjang 10, 11, 12 beserta data Jurusan/ProgramKeahlian
    const history = await prisma.siswaAkademik.findMany({
      where: {
        siswa_id: { in: studentIds },
        status: { not: 'PINDAH' as any },
        ...(tenantId ? { siswa: { tenant_id: tenantId } } : {})
      },
      include: {
        kelas: {
          select: {
            id: true,
            nama_kelas: true,
            tingkat: true,
            jurusan_id: true,
            Jurusan: {
              select: {
                id: true,
                nama: true,
                kode: true,
                program_keahlian_id: true
              }
            }
          }
        },
        tahunPelajaran: { select: { id: true, tahun: true } }
      }
    });

    // 3. Untuk setiap tingkat pada jenjang ini, cari kelas & tahun ajaran mayoritas dari rombel ini
    const stages = targetTingkatList.map(tingkat => {
      // a. Filter awal berdasarkan tingkat kelas target
      let candidates = history.filter(h => h.kelas.tingkat === tingkat);

      // b. Validasi Program Keahlian / Jurusan Guard:
      // Di SMK Kurikulum Merdeka, siswa kelas 10 di Program Keahlian (misal TE) hanya boleh bermutasi ke Konsentrasi
      // di bawah Program Keahlian yang sama (misal TOI/TAV). Tidak boleh lompat ke program lain (misal Mesin/TP).
      if (currentClass.Jurusan?.program_keahlian_id) {
        candidates = candidates.filter(
          h => h.kelas.Jurusan?.program_keahlian_id === currentClass.Jurusan?.program_keahlian_id
        );
      } else if (currentClass.jurusan_id) {
        candidates = candidates.filter(h => h.kelas.jurusan_id === currentClass.jurusan_id);
      }

      // c. Validasi Kronologi Kalender Akademik:
      // Tingkat target harus berada di tahun kalender yang proporsional secara linier:
      // expectedYear = baseStartYear + (tingkat - baseTingkat)
      if (baseStartYear) {
        const expectedStartYear = baseStartYear + (tingkat - baseTingkat);
        candidates = candidates.filter(h => {
          const ym = h.tahunPelajaran.tahun.match(/^(\d{4})/);
          return ym && parseInt(ym[1], 10) === expectedStartYear;
        });
      }

      const frequencyMap = new Map<string, { count: number; kelas_id: string; nama_kelas: string; tingkat: number; tahun_pelajaran_id: string; tahun: string }>();

      for (const item of candidates) {
        const key = `${item.kelas_id}::${item.tahun_pelajaran_id}`;
        const existing = frequencyMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          frequencyMap.set(key, {
            count: 1,
            kelas_id: item.kelas_id,
            nama_kelas: item.kelas.nama_kelas,
            tingkat: item.kelas.tingkat,
            tahun_pelajaran_id: item.tahun_pelajaran_id,
            tahun: item.tahunPelajaran.tahun
          });
        }
      }

      const sorted = Array.from(frequencyMap.values()).sort((a, b) => b.count - a.count);

      // d. Ambang Batas Quorum Mayoritas Rombel:
      // Minimal harus mencakup sekurang-kurangnya 20% populasi rombel atau min 3 siswa (bukan anomali 1-2 siswa mengulang/mutasi)
      const minQuorum = Math.max(3, Math.floor(studentIds.length * 0.2));
      const best = (sorted[0] && sorted[0].count >= (studentIds.length < 5 ? 1 : minQuorum)) ? sorted[0] : null;

      const isCurrent = (best && best.kelas_id === kelasId && (tahunPelajaranId ? best.tahun_pelajaran_id === tahunPelajaranId : true)) || false;

      return {
        tingkat,
        label: ROMAN_MAP[tingkat] ? `Kelas ${ROMAN_MAP[tingkat]}` : `Tingkat ${tingkat}`,
        is_current: isCurrent,
        is_available: Boolean(best),
        kelas_id: best?.kelas_id || null,
        nama_kelas: best?.nama_kelas || null,
        tahun_pelajaran_id: best?.tahun_pelajaran_id || null,
        tahun: best?.tahun || null,
        count: best?.count || 0
      };
    });

    return { currentClass, stages };
  }
}
