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

    // Get Students (Hanya Siswa Aktif)
    const students = await prisma.siswa.findMany({
      where: {
        kelas_id: kelasId,
        tenant_id: tenantId,
        status: 'AKTIF',
      },
      select: { id: true, nama_siswa: true, nis: true }
    });

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
    const cacheKey = CACHE_KEYS.ACADEMIC.REKAP_MAPEL_BULANAN(tenantId, kelasId, mapelId, bulan);
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

    // 1. Fetch Students in Class (Hanya Siswa Aktif)
    const students = await prisma.siswa.findMany({
      where: { kelas_id: kelasId, tenant_id: tenantId, status: 'AKTIF' },
      select: { id: true, nama_siswa: true, nis: true },
      orderBy: { nama_siswa: 'asc' }
    });

    const studentIds = students.map(s => s.id);

    // 2. Fetch Mapel details
    const mapelObj = await prisma.mapel.findFirst({
      where: { id: mapelId, tenant_id: tenantId },
      select: { id: true, nama_mapel: true, kode_mapel: true }
    });

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

    // 2. Fetch all active students in this class
    const students = await prisma.siswa.findMany({
      where: { kelas_id: kelasId, tenant_id: tenantId, status: 'AKTIF' },
      select: { id: true, nama_siswa: true, nis: true },
      orderBy: { nama_siswa: 'asc' }
    });
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
}
