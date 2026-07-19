import { prisma } from '../../../../utils/prisma';
import { AbsensiMode } from '../../../../constants/enums';
import { ATTENDANCE_POINTS } from '../../../../constants/attendance-points';
import { DataScope } from '../../../../types/fastify';

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
  students: Array<{
    id: string;
    nama: string;
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    persentase: number;
    total_poin: number;
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

export class RekapService {
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

  // 3. Rekap Bulanan Kelas (Guru/Wali Kelas)
  async getRekapBulananKelas(kelasId: string, bulan: string, tenantId: string, tahunPelajaranId?: string, scope?: DataScope): Promise<RekapKelasBulananData> {
    // Security check for DataScope
    if (scope && Array.isArray(scope.kelasIds) && scope.kelasIds.length > 0 && scope.tenantWide !== true) {
      if (!scope.kelasIds.map(id => String(id)).includes(String(kelasId))) {
        throw new Error('Forbidden: You do not have access to this class data.');
      }
    }

    const [yearStr, monthStr] = bulan.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    
    const startOfMonth = new Date(`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-01T00:00:00.000+07:00`);
    const lastDay = new Date(year, month, 0);
    const lastDayStr = `${String(lastDay.getFullYear()).padStart(4,'0')}-${String(lastDay.getMonth()+1).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`;
    const endOfMonth = new Date(`${lastDayStr}T23:59:59.999+07:00`);

    // Get Students
    const students = await prisma.siswa.findMany({
      where: {
        kelas_id: kelasId,
        tenant_id: tenantId,
      },
      select: { id: true, nama_siswa: true }
    });

    const studentIds = students.map(s => s.id);

    // Get Tenant Mode
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { absensi_mode: true }
    });

    // Get Tenant Timezone
    const tzConfig = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'TIMEZONE' }
    });
    const timeZone = tzConfig?.value || 'Asia/Jakarta';

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

    const studentStats = new Map<string, { hadir: number, sakit: number, izin: number, alpa: number, telat: number, poin: number }>();
    students.forEach(s => {
      studentStats.set(s.id, { hadir: 0, sakit: 0, izin: 0, alpa: 0, telat: 0, poin: 0 });
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
    // We need to track daily status for each student to handle conflicts/merges
    // Map<studentId, Map<dateString, { gate: any, class: { status: string, poin: number, is_terlambat: boolean }[], pkl: any | null }>>
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
        // If multiple taps, prioritize HADIR/TERLAMBAT
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

        datesMap.forEach((rec, _) => {
            // Determine Day Status based on Merge Rules
            let finalStatus = 'ALPA';
            let isLate = false;
            let dbPoin = 0;

            const gateStatus = rec.gate?.status;
            const gateLate = rec.gate?.is_terlambat;
            const gatePoin = rec.gate?.poin_kehadiran || 0;
            
            const classStatuses = rec.class.map(c => c.status);
            const classHasHadir = classStatuses.includes('HADIR') || classStatuses.includes('TERLAMBAT');
            const classHasLate = classStatuses.includes('TERLAMBAT'); // Status string converted
            const classRecordsLate = rec.class.some(c => c.is_terlambat); // Boolean flag check
            const classHasSakit = classStatuses.includes('SAKIT');
            const classHasIzin = classStatuses.includes('IZIN') || classStatuses.includes('DISPEN');

            // Logic to determine DB Poin Priority: Class > Gate
            // If Class has records, try to find a relevant poin
            if (rec.class.length > 0) {
                // Find max poin from class records (assuming standard input)
                // Or find poin matching the final status
                const maxClassPoin = Math.max(...rec.class.map(c => c.poin));
                dbPoin = maxClassPoin;
            } else if (rec.gate) {
                dbPoin = gatePoin;
            }

            // Rule 1: Presence
            // If Gate says HADIR OR Class says HADIR -> HADIR
            if ((gateStatus === 'HADIR') || classHasHadir || (rec.pkl?.status === 'HADIR')) {
                finalStatus = 'HADIR';
                
                // Rule 2: Lateness
                // If Gate Late OR Class Late -> Late (PKL usually doesn't have late flag yet, or treat as on time)
                if (gateLate || classHasLate || classRecordsLate) {
                    isLate = true;
                }
            } 
            // Rule 3: Excused
            else if (gateStatus === 'SAKIT' || classHasSakit) {
                finalStatus = 'SAKIT';
            }
            else if (gateStatus === 'IZIN' || classHasIzin) {
                finalStatus = 'IZIN';
            }

            // Update Stats & Poin
            // Priority: Use DB Poin if > 0, else fallback to calculation
            let calculatedPoin = 0;

            if (finalStatus === 'HADIR') {
                stats.hadir++;
                if (isLate) {
                    stats.telat++;
                    calculatedPoin = ATTENDANCE_POINTS.HADIR_TERLAMBAT;
                } else {
                    calculatedPoin = ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;
                }
            } else if (finalStatus === 'SAKIT') {
                stats.sakit++;
                calculatedPoin = ATTENDANCE_POINTS.SAKIT;
            } else if (finalStatus === 'IZIN') {
                stats.izin++;
                calculatedPoin = ATTENDANCE_POINTS.IZIN;
            } else {
                stats.alpa++;
                calculatedPoin = ATTENDANCE_POINTS.ALPA;
            }

            // Apply Poin: DB vs Calculated
            // If we have a valid positive poin from DB, use it.
            // Exception: If DB says 0 but we detected Presence, assume DB wasn't filled and use Calculated.
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

      const totalDays = st.hadir + st.sakit + st.izin + st.alpa; // Effective days recorded
      const persentase = totalDays > 0 ? Math.round((st.hadir / totalDays) * 100) : 0;

      studentList.push({
        id: s.id,
        nama: s.nama_siswa,
        hadir: st.hadir,
        sakit: st.sakit,
        izin: st.izin,
        alpa: st.alpa,
        persentase,
        total_poin: st.poin
      });
    });
    
    // Sort students by Attendance Score (Total Poin descending, then Name)
    studentList.sort((a, b) => b.total_poin - a.total_poin || a.nama.localeCompare(b.nama));

    const grandTotal = totalHadir + totalSakit + totalIzin + totalAlpa;
    const classPersentase = grandTotal > 0 ? Math.round((totalHadir / grandTotal) * 100) : 0;

    return {
      kelas_id: kelasId,
      bulan,
      total_hadir: totalHadir,
      total_sakit: totalSakit,
      total_izin: totalIzin,
      total_alpa: totalAlpa,
      total_telat: totalTelat,
      persentase_kehadiran: classPersentase,
      students: studentList
    };
  }



  // 2. Rekap Bulanan per Siswa
  async getRekapBulananSiswa(siswaId: string, bulan: string, tenantId: string, tahunPelajaranId?: string, forceGateOnly: boolean = false): Promise<RekapBulananSiswaResponse> {
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
    
    const startOfMonth = new Date(`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-01T00:00:00.000+07:00`);
    const lastDay = new Date(year, month, 0);
    const lastDayStr = `${String(lastDay.getFullYear()).padStart(4,'0')}-${String(lastDay.getMonth()+1).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`;
    const endOfMonth = new Date(`${lastDayStr}T23:59:59.999+07:00`);

    // Get tenant mode
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

    let detail: Array<{ tanggal: string; status: string }> = [];

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
        } else {
          // Keep the earliest/latest? Or prioritize status?
          // Simple logic: first tap of day defines status (usually 'HADIR')
        }
      });

      attendanceByDate.forEach(absen => {
        const status = (absen.status === 'HADIR' && absen.is_terlambat) ? 'TERLAMBAT' : absen.status;
        if (statistik[status] !== undefined) statistik[status]++;
        
        detail.push({
          tanggal: formatDateKey(absen.waktu_tap),
          status: status
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
        include: { SesiAbsensi: true }
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

        // Add to Stats
        if (finalStatus === 'HADIR') {
             if (isLate) {
                 if (statistik['TERLAMBAT'] !== undefined) statistik['TERLAMBAT']++;
                 detail.push({ tanggal: date, status: 'TERLAMBAT' });
             } else {
                 if (statistik['HADIR'] !== undefined) statistik['HADIR']++;
                 detail.push({ tanggal: date, status: 'HADIR' });
             }
        } else {
             if (statistik[finalStatus] !== undefined) statistik[finalStatus]++;
             detail.push({ tanggal: date, status: finalStatus });
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

        const totalDayPoin = dbPoin > 0 ? dbPoin : calculatedPoin;
        total_poin += totalDayPoin;
      });
    }

    // Calculate overall statistics
    const totalEffectiveDays = statistik.HADIR + statistik.IZIN + statistik.SAKIT + statistik.ALPA + statistik.TERLAMBAT + statistik.DISPEN;
    const persentase_kehadiran = totalEffectiveDays > 0 ? Math.round(((statistik.HADIR + statistik.TERLAMBAT) / totalEffectiveDays) * 100) : 0;

    return {
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
  }



  // 4. Rekap Harian Guru (Jurnal)
  async getRekapHarianGuru(tanggal: string, tenantId: string, guruId?: string): Promise<RekapHarianGuruResponse[]> {
    const startOfDay = new Date(`${tanggal}T00:00:00.000+07:00`);
    const endOfDay = new Date(`${tanggal}T23:59:59.999+07:00`);

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

  // 5. Tracking Harian Siswa (Mode MULTI_SESI)
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
            include: { Mapel: true }
          }
        },
        orderBy: { SesiAbsensi: { waktu_mulai: 'asc' } }
      });

      kegiatan = kegiatan.concat(sessionTaps.map(tap => {
        // Use tap time if available, otherwise fall back to session start time
        const effectiveTime = tap.waktu_tap || tap.SesiAbsensi?.waktu_mulai;
        const mapelName = tap.SesiAbsensi?.Mapel?.nama_mapel;
        
        // Helper to check if string is UUID
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        const rawJenis = tap.SesiAbsensi?.jenis_kegiatan || 'KBM';
        const cleanJenis = isUUID(rawJenis) ? 'KBM' : rawJenis;
        
        const activityName = mapelName ? `${cleanJenis} - ${mapelName}` : (isUUID(rawJenis) ? 'Sesi Kelas' : rawJenis);
        
        return {
          waktu: effectiveTime ? formatTime(effectiveTime) : '-',
          timestamp: effectiveTime,
          jenis_kegiatan: activityName,
          status: (tap.status === 'HADIR' && tap.is_terlambat) ? 'TERLAMBAT' : tap.status,
          keterangan: tap.keterangan || null,  // Catatan dari sesi KBM (termasuk warisan pembiasaan overtime)
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

  // 4. Rekap Harian Siswa (Single Day Status & Poin)
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
          status: true,
          is_terlambat: true,
          poin_kehadiran: true,
          waktu_tap: true,
          SesiAbsensi: {
            select: {
              waktu_mulai: true,
              jenis_kegiatan: true,
              Mapel: {
                select: {
                  nama_mapel: true
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

    // 4. Determine Status & Poin
    let finalStatus = 'ALPA';
    let isLate = false;
    let dbPoin = 0;

    const gateStatus = gateTaps.find(t => t.status === 'HADIR')?.status || gateTaps[0]?.status;
    const gateLate = gateTaps.some(t => t.is_terlambat);
    const gatePoin = gateTaps.reduce((acc, t) => acc + (t.poin_kehadiran || 0), 0);
    
    const pklStatus = pklAbsen?.status;
    const pklPoin = pklAbsen?.status === 'HADIR' ? ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU : 0;
    
    const classPoinSum = classTaps.reduce((sum, c) => sum + (c.poin_kehadiran || 0), 0);

    const classHasHadir = classTaps.some(c => c.status === 'HADIR' || c.status === 'TERLAMBAT');
    const classHasLate = classTaps.some(c => c.is_terlambat || c.status === 'TERLAMBAT');
    const classHasSakit = classTaps.some(c => c.status === 'SAKIT');
    const classHasIzin = classTaps.some(c => c.status === 'IZIN' || c.status === 'DISPEN');
    const classHasDispen = classTaps.some(c => c.status === 'DISPEN');

    // Logika status hibrida (Gerbang + Kelas + PKL)
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
    const rincian: Array<{ jenis_kegiatan: string; status: string; waktu_tap: string | null }> = [];

    gateTaps.forEach(tap => {
      rincian.push({
        jenis_kegiatan: tap.arah === 'GERBANG_DATANG' ? 'Datang (Gerbang)' : 'Pulang (Gerbang)',
        status: tap.is_terlambat && tap.status === 'HADIR' ? 'TERLAMBAT' : tap.status,
        waktu_tap: tap.waktu_tap ? tap.waktu_tap.toISOString() : null
      });
    });

    classTaps.forEach(tap => {
      const mapelName = tap.SesiAbsensi?.Mapel?.nama_mapel;
      const rawJenis = tap.SesiAbsensi?.jenis_kegiatan || 'KBM';
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      const cleanJenis = isUUID(rawJenis) ? 'KBM' : rawJenis;
      const activityName = mapelName ? `${cleanJenis} - ${mapelName}` : (isUUID(rawJenis) ? 'Sesi Kelas' : rawJenis);
      
      const effectiveTime = tap.waktu_tap || tap.SesiAbsensi?.waktu_mulai;

      rincian.push({
        jenis_kegiatan: activityName,
        status: tap.is_terlambat && tap.status === 'HADIR' ? 'TERLAMBAT' : tap.status,
        waktu_tap: effectiveTime ? effectiveTime.toISOString() : null
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

  // 5b. Rekap Harian Seluruh Siswa di Kelas (Bulk Query)
  async getRekapHarianKelas(kelasId: string, tanggal: string, tenantId: string, tahunPelajaranId?: string) {
    // 1. Get Kelas and validate access
    const kelas = await prisma.kelas.findFirst({
      where: { id: kelasId, tenant_id: tenantId }
    });
    if (!kelas) throw new Error('Kelas not found');

    // 2. Fetch all students in this class
    const students = await prisma.siswa.findMany({
      where: { kelas_id: kelasId, tenant_id: tenantId },
      select: { id: true, nama_siswa: true },
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
        nama: siswa.nama_siswa,
        status: isLate && finalStatus === 'HADIR' ? 'TERLAMBAT' : finalStatus,
        poin: totalPoin
      };
    });
  }

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



  // Log activity for audit
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

  async getRekapBulananGuruMe(userId: string, tenantId: string, bulan: string): Promise<any> {
    // 1. Get Guru ID
    const guru = await prisma.guru.findFirst({
      where: { user_id: userId, tenant_id: tenantId },
      select: { id: true, nama_guru: true }
    });

    if (!guru) throw new Error('Profil Guru tidak ditemukan');

    // 2. Parse Date Range (Timezone-aware Asia/Jakarta)
    const [yearStr, monthStr] = bulan.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const startOfMonth = new Date(`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-01T00:00:00.000+07:00`);
    const lastDay = new Date(year, month, 0);
    const lastDayStr = `${String(lastDay.getFullYear()).padStart(4,'0')}-${String(lastDay.getMonth()+1).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`;
    const endOfMonth = new Date(`${lastDayStr}T23:59:59.999+07:00`);

    // 3. Fetch Attendance Log (AbsenGuru)
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
          select: { tanggal: true, jenis_kegiatan: true, Mapel: { select: { nama_mapel: true } } }
        }
      },
      orderBy: { SesiAbsensi: { tanggal: 'asc' } }
    });

    // 4. Calculate Stats & Daily Grouping
    const statistik = { HADIR: 0, TERLAMBAT: 0, ALPA: 0, IZIN: 0, SAKIT: 0, DISPEN: 0 };
    let totalPoin = 0;
    const dailyMap = new Map<string, { status: string; poin: number }[]>();

    attendanceLogs.forEach(log => {
      const dateKey = log.SesiAbsensi?.tanggal.toISOString().split('T')[0];
      if (!dateKey) return;

      // Normalize teacher status to match frontend standard status labels (HADIR, TERLAMBAT, etc.)
      const rawStatus = (log.status || '').toUpperCase();
      let currentStatus = 'ALPA';
      if (rawStatus.includes('HADIR') || rawStatus.includes('MENGAJAR')) {
        currentStatus = log.is_terlambat ? 'TERLAMBAT' : 'HADIR';
      } else if (rawStatus.includes('IZIN')) {
        currentStatus = 'IZIN';
      } else if (rawStatus.includes('SAKIT')) {
        currentStatus = 'SAKIT';
      } else if (rawStatus.includes('DISPEN')) {
        currentStatus = 'DISPEN';
      }

      if ((statistik as any)[currentStatus] !== undefined) {
        (statistik as any)[currentStatus]++;
      }
      totalPoin += log.poin_kehadiran || 0;

      if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, []);
      dailyMap.get(dateKey)!.push({
        status: currentStatus,
        poin: log.poin_kehadiran || 0
      });
    });

    // 5. Finalize Detail for Calendar Dots
    const detail = Array.from(dailyMap.entries()).map(([date, items]) => {
      // Logic for daily dot color: prioritize status
      let primaryStatus = 'HADIR';
      if (items.some(i => i.status === 'ALPA')) primaryStatus = 'ALPA';
      else if (items.some(i => i.status === 'SAKIT')) primaryStatus = 'SAKIT';
      else if (items.some(i => i.status === 'IZIN')) primaryStatus = 'IZIN';
      else if (items.some(i => i.status === 'DISPEN')) primaryStatus = 'DISPEN';
      else if (items.some(i => i.status === 'TERLAMBAT')) primaryStatus = 'TERLAMBAT';

      return {
        tanggal: date,
        status: primaryStatus,
        count: items.length
      };
    });

    return {
      nama_guru: guru.nama_guru,
      bulan,
      statistik,
      total_poin: totalPoin,
      persentase_kehadiran: attendanceLogs.length > 0 ? Math.round(((statistik.HADIR + statistik.TERLAMBAT) / attendanceLogs.length) * 100) : 0,
      detail
    };
  }

  /**
   * Get Attendance Leaderboard
   * Ranks students based on attendance points
   */
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

export const rekapService = new RekapService();
