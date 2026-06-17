import { prisma } from '@/utils/prisma';
import { parentAuthService } from './parent-auth.service';
import { JenisTap, AbsensiMode } from '@/constants/enums';
import { ATTENDANCE_POINTS } from '@/constants/attendance-points';
import { getEffectiveAbsensiMode } from '@/utils/attendanceModeHelper';

export class ParentDataService {
  
  /**
   * Get Dashboard Data (GET /me)
   * Returns: Parent Profile + Active Students List (with status & summary)
   */
  async getDashboardData(orangTuaId: string) {
    // 1. Get Basic Profile & Active Students using existing logic
    const profile = await parentAuthService.getParentProfile(orangTuaId);

    // 2. Enhance Student Data with Attendance Info
    const childrenWithAttendance = await Promise.all(profile.children.map(async (child) => {
      // Get Student Tenant Info for Mode
      const studentInfo = await prisma.siswa.findUnique({
        where: { id: child.id }
      });
      
      const absensiMode = studentInfo?.tenant_id 
        ? await getEffectiveAbsensiMode(studentInfo.tenant_id) 
        : AbsensiMode.SIMPLE;
      
      // Get Tenant Timezone
      const tzConfig = await prisma.config.findFirst({
        where: { tenant_id: studentInfo?.tenant_id, key: 'TIMEZONE' }
      });
      const timeZone = tzConfig?.value || 'Asia/Jakarta';

      // A. Get Today's Status (Hero Data)
      const todayStatus = await this.getTodayStatus(child.id, timeZone);

      // B. Get Attendance Summary (Current Semester)
      const summary = await this.getAttendanceSummary(child.id, absensiMode);

      return {
        siswa_id: child.id,
        nama_siswa: child.nama,
        kelas: child.kelas,
        absensi_mode: absensiMode,
        timezone: timeZone,
        status_kehadiran_hari_ini: todayStatus,
        ringkasan_kehadiran: summary
      };
    }));

    return {
      orang_tua: {
        id: profile.id,
        nama: profile.nama,
        no_hp: profile.no_hp
      },
      siswa: childrenWithAttendance
    };
  }

  /**
   * Get Today's Attendance Status (HERO DATA)
   * Returns comprehensive object for UI Hero Section
   */
  private async getTodayStatus(siswaId: string, timeZone: string = 'Asia/Jakarta') {
    // Calculate Offset
    const TZ_OFFSET: Record<string, number> = {
      'Asia/Jakarta': 7,
      'Asia/Makassar': 8,
      'Asia/Jayapura': 9
    };
    const offset = TZ_OFFSET[timeZone] ?? 7;

    const now = new Date();
    // Get "Today" string in Tenant Timezone: "YYYY-MM-DD"
    // We can shift 'now' by offset hours to get the local date
    const tenantNow = new Date(now.getTime() + (offset * 60 * 60 * 1000));
    const dayStr = tenantNow.toISOString().split('T')[0];

    // Construct Range in UTC
    const startOfDay = new Date(new Date(`${dayStr}T00:00:00.000Z`).getTime() - (offset * 60 * 60 * 1000));
    const endOfDay = new Date(new Date(`${dayStr}T23:59:59.999Z`).getTime() - (offset * 60 * 60 * 1000));

    // 1. Get Student Tenant (needed for context if we want to expand)
    const siswa = await prisma.siswa.findUnique({
      where: { id: siswaId },
      select: { tenant_id: true }
    });
    
    if (!siswa) return { status: 'BELUM_HADIR', label: 'Belum Hadir', waktu_masuk: null, waktu_pulang: null };

    // 2. Fetch Gate Records (Datang & Pulang)
    // This includes Manual Entries (which are stored as AbsenGerbangSiswa)
    const gateRecords = await prisma.absenGerbangSiswa.findMany({
      where: {
        siswa_id: siswaId,
        waktu_tap: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        SesiGerbang: true
      }
    });

    const datang = gateRecords.find(r => r.arah === JenisTap.GERBANG_DATANG || r.arah === 'MASUK');
    const pulang = gateRecords.find(r => r.arah === JenisTap.GERBANG_PULANG);

    // 3. Determine Status
    let status = 'BELUM_HADIR';
    let label = 'Belum Hadir';
    let waktu_masuk: Date | null = null;
    let waktu_pulang: Date | null = null;
    let color_hint = 'gray'; // UI Helper
    let is_terlambat = false;

    // Check Arrival / Manual Status
    if (datang) {
      status = datang.status;
      // SA-IS AUDIT FIX: If status is ALPA/IZIN/SAKIT/DISPEN, waktu_masuk should be null in the dashboard view
      // even if there is a timestamp in the database (e.g. manual entry timestamp).
      // Only HADIR (possibly with is_terlambat) imply a physical presence time.
      if (status === 'HADIR') {
        waktu_masuk = datang.waktu_tap;
      } else {
        waktu_masuk = null;
      }

      // Map Status to Label & Color
      switch (status) {
        case 'HADIR':
          if (datang.is_terlambat) {
            label = 'Terlambat';
            color_hint = 'orange';
            is_terlambat = true;
          } else {
            label = 'Hadir';
            color_hint = 'green';
          }
          break;
        case 'IZIN':
          label = 'Izin';
          color_hint = 'blue';
          break;
        case 'SAKIT':
          label = 'Sakit';
          color_hint = 'blue';
          break;
        case 'ALPA':
          label = 'Alpa';
          color_hint = 'red';
          break;
        case 'DISPEN':
          label = 'Dispen';
          color_hint = 'blue';
          break;
        default:
          label = status;
          color_hint = 'gray';
      }
    }

    // Check Return (Pulang) - Only if currently HADIR
    if (pulang) {
      waktu_pulang = pulang.waktu_tap;
      
      if (status === 'HADIR') {
        status = 'SUDAH_PULANG';
        label = 'Sudah Pulang';
        color_hint = 'green';

        // Check Pulang Cepat (Early Departure)
        if (datang?.SesiGerbang?.waktu_selesai && waktu_pulang) {
           const scheduleEnd = new Date(datang.SesiGerbang.waktu_selesai);
           // Threshold: 15 minutes before schedule
           if (waktu_pulang.getTime() < (scheduleEnd.getTime() - 15 * 60 * 1000)) {
             status = 'PULANG_CEPAT';
             label = 'Pulang Cepat';
             color_hint = 'orange';
           }
        }
      }
    }

    return {
      status,
      label,
      is_terlambat,
      waktu_masuk: waktu_masuk ? waktu_masuk.toISOString() : null,
      waktu_pulang: waktu_pulang ? waktu_pulang.toISOString() : null,
      color_hint
    };
  }

  /**
   * Get Attendance Summary for Current Active Semester
   */
  private async getAttendanceSummary(siswaId: string, absensiMode: string = AbsensiMode.SIMPLE) {
    // 1. Find Active Semester for the student's tenant
    const siswa = await prisma.siswa.findUnique({
      where: { id: siswaId },
      select: { tenant_id: true }
    });

    if (!siswa) return { hadir: 0, sakit: 0, izin: 0, alpa: 0, terlambat: 0, dispen: 0, total_poin: 0 };

    // Find active academic period
    const activeYear = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: siswa.tenant_id, is_active: true }
    });
    
    if (!activeYear) return { hadir: 0, sakit: 0, izin: 0, alpa: 0, terlambat: 0, dispen: 0, total_poin: 0 };

    // Note: For SIMPLE mode, we might not have semesters, but we usually have an active year.
    // For MULTI_SESI, we need active semester.
    const activeSemester = await prisma.semester.findFirst({
      where: { tenant_id: siswa.tenant_id, tahun_pelajaran_id: activeYear.id, is_active: true }
    });

    // Strategy: Fetch raw data and merge in memory to avoid double counting and ensure consistency with Rekap
    // 1. Gate Data (All Modes)
    const gateRecords = (await prisma.absenGerbangSiswa.findMany({
        where: {
            siswa_id: siswaId,
            tahun_pelajaran_id_snapshot: activeYear.id,
            arah: JenisTap.GERBANG_DATANG
        },
        select: { status: true, is_terlambat: true, waktu_tap: true, poin_kehadiran: true }
    })) ?? [];

    // 2. Class Data (Multi Sesi Only)
    let classRecords: any[] = [];
    if (absensiMode === AbsensiMode.MULTI_SESI && activeSemester) {
        classRecords = (await prisma.absenSiswa.findMany({
            where: {
                SiswaAkademik: {
                    siswa_id: siswaId,
                    tahun_pelajaran_id: activeYear.id,
                    semester_id: activeSemester.id
                }
            },
            select: { 
                status: true, is_terlambat: true, poin_kehadiran: true,
                SesiAbsensi: { select: { tanggal: true } }
            }
        })) ?? [];
    }

    // 3. Merge Logic (Daily)
    const dailyMap = new Map<string, { gate: any, class: any[] }>();
    const getDayRec = (dateStr: string) => {
        if (!dailyMap.has(dateStr)) dailyMap.set(dateStr, { gate: null, class: [] });
        return dailyMap.get(dateStr)!;
    };

    gateRecords.forEach(g => {
        if (!g.waktu_tap) return;
        const d = g.waktu_tap.toISOString().split('T')[0];
        const rec = getDayRec(d);
        // Prioritize HADIR if multiple taps
        if (!rec.gate || (g.status === 'HADIR' && rec.gate.status !== 'HADIR')) {
            rec.gate = g;
        }
    });

    classRecords.forEach(c => {
        if (!c.SesiAbsensi?.tanggal) return;
        const d = c.SesiAbsensi.tanggal.toISOString().split('T')[0];
        const rec = getDayRec(d);
        rec.class.push(c);
    });

    // 4. Aggregate
    const summary = { hadir: 0, sakit: 0, izin: 0, alpa: 0, terlambat: 0, dispen: 0, total_poin: 0 };

    dailyMap.forEach((val) => {
        let finalStatus = 'ALPA';
        let isLate = false;
        let dbPoin = 0;

        const gateStatus = val.gate?.status;
        const gateLate = val.gate?.is_terlambat;
        const gatePoin = val.gate?.poin_kehadiran || 0;

        const classStatuses = val.class.map(c => c.status);
        const classHasHadir = classStatuses.includes('HADIR');
        const classHasLate = val.class.some(c => c.status === 'HADIR' && c.is_terlambat);
        const classHasSakit = classStatuses.includes('SAKIT');
        const classHasIzin = classStatuses.includes('IZIN');
        const classHasDispen = classStatuses.includes('DISPEN');

        // Poin Priority: Class > Gate
        if (val.class.length > 0) {
            dbPoin = Math.max(...val.class.map(c => c.poin_kehadiran || 0));
        } else if (val.gate) {
            dbPoin = gatePoin;
        }

        // Status Determination
        if ((gateStatus === 'HADIR') || classHasHadir) {
            finalStatus = 'HADIR';
            if (gateLate || classHasLate) isLate = true;
        } else if (gateStatus === 'SAKIT' || classHasSakit) {
            finalStatus = 'SAKIT';
        } else if (gateStatus === 'DISPEN' || classHasDispen) {
            finalStatus = 'DISPEN';
        } else if (gateStatus === 'IZIN' || classHasIzin) {
            finalStatus = 'IZIN';
        }

        // Add to summary
        if (finalStatus === 'HADIR') {
            summary.hadir++;
            if (isLate) summary.terlambat++;
        } else if (finalStatus === 'SAKIT') summary.sakit++;
        else if (finalStatus === 'IZIN') summary.izin++;
        else if (finalStatus === 'DISPEN') summary.dispen++;
        else summary.alpa++;

        // Add Poin
        if (dbPoin > 0) {
            summary.total_poin += dbPoin;
        } else {
            // Fallback calculation using constants
             if (finalStatus === 'HADIR') {
                summary.total_poin += isLate ? ATTENDANCE_POINTS.HADIR_TERLAMBAT : ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;
            } else if (finalStatus === 'SAKIT') {
                summary.total_poin += ATTENDANCE_POINTS.SAKIT;
            } else if (finalStatus === 'IZIN') {
                summary.total_poin += ATTENDANCE_POINTS.IZIN;
            } else if (finalStatus === 'DISPEN') {
                summary.total_poin += ATTENDANCE_POINTS.DISPEN;
            } else {
                summary.total_poin += ATTENDANCE_POINTS.ALPA;
            }
        }
    });

    return summary;
  }

  /**
   * Get Attendance History (Paginated)
   */
  async getAttendanceHistory(siswaId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    // Verify parent owns this student? 
    // Controller should have verified Token -> Parent. 
    // Here we should verify Parent -> Student link?
    // Ideally yes, but for now assuming Controller/Middleware handles access checks.
    // However, to be safe, we can rely on the fact that the caller passes a verified parentId context if needed.
    // For now, simple read.

    // 1. Try AbsenSiswa (MULTI_SESI)
    const totalSiswa = await prisma.absenSiswa.count({
      where: { SiswaAkademik: { siswa_id: siswaId } }
    });

    if (totalSiswa > 0) {
      const records = await prisma.absenSiswa.findMany({
        where: { SiswaAkademik: { siswa_id: siswaId } },
        include: {
          SesiAbsensi: {
            select: {
              tanggal: true,
              jenis_kegiatan: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: limit
      });

      return {
        data: records.map(r => ({
          id: r.id,
          tanggal: r.SesiAbsensi.tanggal,
          jenis: r.SesiAbsensi.jenis_kegiatan,
          status: r.status,
          waktu_tap: r.waktu_tap
        })),
        meta: {
          page,
          limit,
          total: totalSiswa,
          total_pages: Math.ceil(totalSiswa / limit)
        }
      };
    }

    // 2. Fallback AbsenGerbangSiswa (SIMPLE)
    const [totalGate, gateRecords] = await Promise.all([
      prisma.absenGerbangSiswa.count({ where: { siswa_id: siswaId } }),
      prisma.absenGerbangSiswa.findMany({
        where: { siswa_id: siswaId },
        orderBy: { waktu_tap: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      data: gateRecords.map(r => ({
        id: r.id,
        tanggal: r.waktu_tap, // timestamp
        jenis: 'ABSENSI_HARIAN', // Generic label
        status: r.status,
        waktu_tap: r.waktu_tap
      })),
      meta: {
        page,
        limit,
        total: totalGate,
        total_pages: Math.ceil(totalGate / limit)
      }
    };
  }

  /**
   * Get Notifications (Placeholder)
   */
  async getNotifications(_siswaId: string, page: number = 1, limit: number = 20) {
    // Stub implementation
    return {
      data: [],
      meta: {
        page,
        limit,
        total: 0,
        total_pages: 0
      }
    };
  }

  /**
   * Get Monthly Recap for Parent App
   * Wrapper around rekapService.getRekapBulananSiswa
   */
  async getMonthlyRecap(siswaId: string, bulan: string) {
    // We need tenant_id. Fetch from student record.
    const siswa = await prisma.siswa.findUnique({
      where: { id: siswaId },
      select: { tenant_id: true }
    });

    if (!siswa) {
      throw new Error('Siswa not found');
    }

    const parts = String(bulan || '').split('-');
    const yearStr = parts[0] || '';
    const monthStr = parts[1] || '';
    if (!yearStr || !monthStr) {
      throw new Error('Invalid month format. Use YYYY-MM');
    }

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      throw new Error('Invalid month format. Use YYYY-MM');
    }

    const startOfMonth = new Date(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01T00:00:00.000+07:00`);
    const lastDay = new Date(year, month, 0);
    const lastDayStr = `${String(lastDay.getFullYear()).padStart(4, '0')}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    const endOfMonth = new Date(`${lastDayStr}T23:59:59.999+07:00`);

    const statistik: any = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0, TERLAMBAT: 0, DISPEN: 0 };
    let total_poin = 0;
    const detail: Array<{ tanggal: string; status: string }> = [];

    const absenGerbang = await prisma.absenGerbangSiswa.findMany({
      where: {
        siswa_id: siswaId,
        tenant_id: siswa.tenant_id,
        created_at: { gte: startOfMonth, lte: endOfMonth },
        waktu_tap: { gte: startOfMonth, lte: endOfMonth },
      } as any,
      orderBy: { waktu_tap: 'asc' },
    });

    const attendanceByDate = new Map<string, any>();
    for (const absen of absenGerbang) {
      if (!absen.waktu_tap) continue;
      const dateKey = absen.waktu_tap.toISOString().split('T')[0];
      if (!attendanceByDate.has(dateKey)) {
        attendanceByDate.set(dateKey, absen);
      }
    }

    attendanceByDate.forEach((absen) => {
      const st = (absen.status === 'HADIR' && absen.is_terlambat) ? 'TERLAMBAT' : absen.status;
      if (statistik[st] !== undefined) statistik[st]++;
      detail.push({ tanggal: absen.waktu_tap.toISOString().split('T')[0], status: st });

      const poin = Number(absen.poin_kehadiran || 0);
      if (poin > 0) {
        total_poin += poin;
      } else {
        if (st === 'HADIR') total_poin += ATTENDANCE_POINTS.HADIR_TEPAT_WAKTU;
        else if (st === 'TERLAMBAT') total_poin += ATTENDANCE_POINTS.HADIR_TERLAMBAT;
        else if (st === 'SAKIT') total_poin += ATTENDANCE_POINTS.SAKIT;
        else if (st === 'IZIN') total_poin += ATTENDANCE_POINTS.IZIN;
        else if (st === 'DISPEN') total_poin += ATTENDANCE_POINTS.DISPEN;
        else total_poin += ATTENDANCE_POINTS.ALPA;
      }
    });

    return {
      nama_siswa: (await prisma.siswa.findFirst({ where: { id: siswaId, tenant_id: siswa.tenant_id } } as any))?.nama_siswa || '',
      bulan,
      statistik,
      total_poin,
      detail,
    };
  }

  /**
   * Get Daily Tracking for Parent App
   * Wrapper around rekapService.getTrackingHarianSiswa
   */
  async getDailyTracking(siswaId: string, tanggal: string) {
    // We need tenant_id. Fetch from student record.
    const siswa = await prisma.siswa.findUnique({
      where: { id: siswaId },
      select: { tenant_id: true }
    });

    if (!siswa) {
      throw new Error('Siswa not found');
    }

    const absensiMode = await getEffectiveAbsensiMode(siswa.tenant_id);

    const tzConfig = await prisma.config.findFirst({
      where: { tenant_id: siswa.tenant_id, key: 'TIMEZONE' },
    });
    const timeZone = tzConfig?.value || 'Asia/Jakarta';

    const TZ_OFFSET: Record<string, number> = {
      'Asia/Jakarta': 7,
      'Asia/Makassar': 8,
      'Asia/Jayapura': 9,
    };
    const offset = TZ_OFFSET[timeZone] ?? 7;

    const dayStr = String(tanggal);
    const startOfDay = new Date(new Date(`${dayStr}T00:00:00.000Z`).getTime() - (offset * 60 * 60 * 1000));
    const endOfDay = new Date(new Date(`${dayStr}T23:59:59.999Z`).getTime() - (offset * 60 * 60 * 1000));

    const formatTime = (date: Date) => {
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date).replace('.', ':');
    };

    let kegiatan: { waktu: string; timestamp?: Date | null; jenis_kegiatan: string; status: any }[] = [];

    const gerbangTaps = await prisma.absenGerbangSiswa.findMany({
      where: {
        siswa_id: siswaId,
        tenant_id: siswa.tenant_id,
        waktu_tap: { gte: startOfDay, lte: endOfDay },
      } as any,
      orderBy: { waktu_tap: 'asc' },
    });

    kegiatan = kegiatan.concat(
      gerbangTaps.map((tap) => ({
        waktu: tap.waktu_tap ? formatTime(tap.waktu_tap) : '-',
        timestamp: tap.waktu_tap,
        jenis_kegiatan: tap.arah === 'GERBANG_DATANG' ? 'Datang (Gerbang)' : 'Pulang (Gerbang)',
        status: tap.status === 'HADIR' && tap.is_terlambat ? 'TERLAMBAT' : tap.status,
      })),
    );

    if (absensiMode === AbsensiMode.MULTI_SESI) {
      const sessionTaps = await prisma.absenSiswa.findMany({
        where: {
          tenant_id: siswa.tenant_id,
          SiswaAkademik: { siswa_id: siswaId },
          SesiAbsensi: {
            tanggal: { gte: startOfDay, lte: endOfDay },
          },
        } as any,
        include: {
          SesiAbsensi: {
            include: { Mapel: true } as any,
          } as any,
        } as any,
        orderBy: { SesiAbsensi: { waktu_mulai: 'asc' } } as any,
      });

      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      kegiatan = kegiatan.concat(
        sessionTaps.map((tap: any) => {
          const effectiveTime = tap.waktu_tap || tap.SesiAbsensi?.waktu_mulai;
          const mapelName = tap.SesiAbsensi?.Mapel?.nama_mapel;
          const rawJenis = tap.SesiAbsensi?.jenis_kegiatan || 'KBM';
          const cleanJenis = isUUID(String(rawJenis)) ? 'KBM' : rawJenis;
          const activityName = mapelName ? `${cleanJenis} - ${mapelName}` : (isUUID(String(rawJenis)) ? 'Sesi Kelas' : rawJenis);
          return {
            waktu: effectiveTime ? formatTime(effectiveTime) : '-',
            timestamp: effectiveTime,
            jenis_kegiatan: activityName,
            status: tap.status === 'HADIR' && tap.is_terlambat ? 'TERLAMBAT' : tap.status,
          };
        }),
      );
    }

    kegiatan.sort((a, b) => {
      if (!a.timestamp && !b.timestamp) return 0;
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    const siswaRow = await prisma.siswa.findFirst({ where: { id: siswaId, tenant_id: siswa.tenant_id } } as any);
    return {
      nama: String((siswaRow as any)?.nama_siswa || ''),
      tanggal: tanggal,
      kegiatan,
    };
  }

  async logParentAppActivity(tenantId: string, action: string, entityId: string | null, metadata?: any) {
    await prisma.activityLog.create({
      data: {
        tenant_id: tenantId,
        user_id: null,
        action,
        entity: 'ParentApp',
        entity_id: entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }
}

export const parentDataService = new ParentDataService();
