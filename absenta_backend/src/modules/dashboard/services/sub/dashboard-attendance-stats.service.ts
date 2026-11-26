// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { AbsensiMode } from '@/constants/enums';
import { formatTenantTime, getTenantTimezone, getTenantOffsetString, getTenantDayRange } from '@/utils/timezone.utils';
import { sesiLifecycleService, SesiLifecycleService } from '@/modules/attendance/sesi-absensi/services/sesi-lifecycle.service';
import { applyDataScope } from '@/utils/applyDataScope';
import { DashboardCommonHelper } from './dashboard-common.helper';

export class DashboardAttendanceStatsService {
  private helper = new DashboardCommonHelper();
  private resolveDayRange(...args: any[]) { return this.helper.resolveDayRange(...args); }

  async getGuruAttendance(_tenantId: string | null, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const guru = await prisma.guru.findUnique({
      where: { user_id: userId }
    });

    if (!guru) return null;

    const absen = await prisma.absenGuru.findFirst({
      where: {
        guru_id: guru.id,
        created_at: {
          gte: today,
          lte: endOfDay
        }
      }
    });

    return {
      isCheckedIn: !!absen,
      status: absen?.status || 'Belum Check-in',
      waktu_checkin: absen?.created_at || null
    };
  }

  async getGuruCapabilitiesData(tenantId: string | null, guruId: string) {
    const guru = await prisma.guru.findFirst({
      where: {
        id: guruId,
        ...(tenantId ? { tenant_id: tenantId } : {})
      }
    });

    if (!guru) {
      throw new Error('Guru tidak ditemukan atau bukan milik tenant ini');
    }

    const now = new Date();
    const assignments = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: guru.tenant_id,
        user_id: String((guru as any).user_id || ''),
        is_active: true,
        AND: [{ OR: [{ start_date: null }, { start_date: { lte: now } }] }, { OR: [{ end_date: null }, { end_date: { gte: now } }] }],
      },
      include: {
        Position: {
          select: {
            id: true,
            code: true,
            name: true,
            organizationalCaps: { select: { permission_id: true } },
          },
        },
      },
    });

    const capabilities = await authorizationService.resolveUserCapabilities(String((guru as any).user_id || ''));

    const structures = assignments.map((a: any) => {
      const kode = String(a.Position?.code || '');
      const dbCaps = Array.isArray(a.Position?.organizationalCaps) ? a.Position.organizationalCaps.map((x: any) => x.permission_id).filter(Boolean) : [];
      const caps = dbCaps.length > 0 ? dbCaps : (STRUKTUR_CAPABILITIES as any)[kode] || [];
      return {
        struktur_id: a.position_id,
        kode,
        nama: String(a.Position?.name || ''),
        start_date: a.start_date,
        end_date: a.end_date,
        is_active: a.is_active,
        capabilities: caps,
      };
    });

    return {
      guru: {
        id: guru.id,
        nama_guru: guru.nama_guru,
        tenant_id: guru.tenant_id
      },
      structures,
      capabilities
    };
  }


  async getStatistikKelasHarian(tenantId: string | null, tanggal: string, scope?: DataScope) {
    const { startOfDay, endOfDay } = await this.resolveDayRange(tenantId, tanggal);

    // Build where clause based on tenantId and scope
    let whereClause: any = {};
    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    if (scope) {
      whereClause = applyDataScope(whereClause, scope, { classField: 'id', unitField: 'jurusan_id' });
    }

    // Ambil semua kelas
    const kelasData = await prisma.kelas.findMany({ where: whereClause, select: { id: true, nama_kelas: true } });

    // Group data absensi berdasarkan snapshot kelas untuk tanggal target
    const grouped = await prisma.absenSiswa.groupBy({
      by: ['kelas_id_snapshot', 'status', 'is_terlambat'],
      where: {
        created_at: { gte: startOfDay, lte: endOfDay },
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
      _count: { siswa_id: true },
    });

    const countsByKelas: Record<string, { HADIR: number; TERLAMBAT: number; IZIN: number; SAKIT: number; ALPA: number }> = {};
    for (const g of grouped as any[]) {
      const kid = String(g.kelas_id_snapshot || '');
      if (!kid) continue;
      if (!countsByKelas[kid]) countsByKelas[kid] = { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
      
      const st = String(g.status || '').toUpperCase();
      const isLate = Boolean(g.is_terlambat);
      
      let statusKey: 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'ALPA' | null = null;
      
      if (st === 'HADIR') {
        statusKey = isLate ? 'TERLAMBAT' : 'HADIR';
      } else if (['IZIN', 'SAKIT', 'ALPA'].includes(st)) {
        statusKey = st as any;
      }
      
      if (statusKey) {
        countsByKelas[kid][statusKey] += Number((g._count?.siswa_id) || 0);
      }
    }

    const distinctPerKelas: Record<string, number> = {};
    const distinctGrouped = await prisma.absenSiswa.groupBy({
      by: ['kelas_id_snapshot', 'siswa_id'],
      where: {
        created_at: { gte: startOfDay, lte: endOfDay },
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
      _count: { siswa_id: true },
    });
    for (const row of distinctGrouped as any[]) {
      const kid = String(row.kelas_id_snapshot || '');
      if (!kid) continue;
      distinctPerKelas[kid] = (distinctPerKelas[kid] || 0) + 1;
    }

    const list = kelasData.map(kelas => {
      const stats = countsByKelas[kelas.id] || { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
      const populasi = distinctPerKelas[kelas.id] || 0;
      const present = stats.HADIR + stats.TERLAMBAT;
      const persentase_histori = populasi > 0 ? Math.round((present / populasi) * 1000) / 10 : 0;
      return {
        kelas: kelas.nama_kelas,
        kelas_id: kelas.id,
        ...stats,
        populasi_histori: populasi,
        persentase_kehadiran_histori: persentase_histori,
      };
    });

    return {
      totalKelas: kelasData.length,
      kelasAktif: Object.keys(countsByKelas).length,
      list
    };
  }

  /**
   * 3️⃣ Statistik Bulanan per Kelas
   */
  async getStatistikKelasBulanan(tenantId: string | null, kelasId: string, bulan: string) {
    // Parse bulan format: "2025-10" atau "Oktober 2025"
    let year: number, month: number;
    
    if (bulan.includes('-')) {
      const parts = bulan.split('-').map(Number);
      if (parts.length !== 2) {
        throw new Error('Format bulan tidak valid. Gunakan format "YYYY-MM"');
      }
      year = parts[0]!;
      month = parts[1]!;
    } else {
      // Handle "Oktober 2025" format
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                         'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const parts = bulan.split(' ');
      if (parts.length !== 2) {
        throw new Error('Format bulan tidak valid. Gunakan format "YYYY-MM" atau "Bulan YYYY"');
      }
      month = monthNames.indexOf(parts[0]!) + 1;
      year = parseInt(parts[1]!);
    }

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Build where clause for kelas
    const kelasWhereClause: any = { id: kelasId };
    if (tenantId) {
      kelasWhereClause.tenant_id = tenantId;
    }

    // Get kelas info
    const kelas = await prisma.kelas.findUnique({
      where: kelasWhereClause
    });

    if (!kelas) {
      throw new Error('Kelas tidak ditemukan');
    }

    // Statistik bulanan berdasarkan snapshot kelas (menghindari ketergantungan pada kelas saat ini)
    const statistikBulanan = await prisma.absenSiswa.groupBy({
      by: ['status', 'is_terlambat'],
      where: {
        created_at: { gte: startOfMonth, lte: endOfMonth },
        kelas_id_snapshot: kelasId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
      _count: { siswa_id: true },
    });

    const statistik = {
      HADIR: 0,
      TERLAMBAT: 0,
      IZIN: 0,
      SAKIT: 0,
      ALPA: 0,
      total_poin: 0
    };

    statistikBulanan.forEach(item => {
      const st = String(item.status || '').toUpperCase();
      const isLate = Boolean(item.is_terlambat);
      const count = Number(item._count.siswa_id || 0);

      if (st === 'HADIR') {
        if (isLate) {
            statistik.TERLAMBAT += count;
            statistik.total_poin += (50 * count);
        }
        else {
            statistik.HADIR += count;
            statistik.total_poin += (100 * count);
        }
      } else if (statistik.hasOwnProperty(st)) {
        statistik[st as keyof typeof statistik] += count;
      }
    });

    const totalAbsensi = Object.values(statistik).reduce((sum, count) => sum + count, 0);
    const persentaseKehadiran = totalAbsensi > 0 ? 
      Math.round(((statistik.HADIR + statistik.TERLAMBAT) / totalAbsensi) * 100 * 10) / 10 : 0;

    const distinctMonthly = await prisma.absenSiswa.groupBy({
      by: ['siswa_id'],
      where: {
        kelas_id_snapshot: kelasId,
        created_at: { gte: startOfMonth, lte: endOfMonth },
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
      _count: { siswa_id: true },
    });
    const populasi_histori = distinctMonthly.length;
    const present_histori = statistik.HADIR + statistik.TERLAMBAT;
    const persentase_kehadiran_histori = populasi_histori > 0 ? Math.round((present_histori / populasi_histori) * 100 * 10) / 10 : 0;

    return {
      kelas: kelas.nama_kelas,
      bulan: bulan,
      statistik,
      persentase_kehadiran: persentaseKehadiran,
      populasi_histori,
      persentase_kehadiran_histori,
    };
  }

  /**
   * 4️⃣ Statistik Guru Harian
   */
  async getStatistikGuruHarian(tenantId: string | null, tanggal: string) {
    const { startOfDay, endOfDay } = await this.resolveDayRange(tenantId, tanggal);

    // Build where clause based on tenantId
    const whereClause: any = {};
    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    // Get all guru with their attendance for the day
    const guruData = await prisma.guru.findMany({
      where: whereClause,
      include: {
        AbsenGuru: {
          where: {
            created_at: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          include: {
            SesiAbsensi: true
          }
        },
        SesiAbsensi: {
          where: {
            tanggal: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        }
      }
    });

    const list = guruData.map(guru => {
      const totalSesi = guru.SesiAbsensi.length;
      const hadir = guru.AbsenGuru.filter(absen => absen.status === 'HADIR').length;
      const persentase = totalSesi > 0 ? Math.round((hadir / totalSesi) * 100) : 0;

      return {
        guru_id: guru.id,
        nama_guru: guru.nama_guru,
        total_sesi: totalSesi,
        hadir: hadir,
        persentase: persentase,
        // Detailed status breakdown for pie chart
        status: guru.AbsenGuru[0]?.status || 'BELUM_HADIR'
      };
    });

    const summary = {
      totalGuru: guruData.length,
      guruHadir: list.filter(g => g.hadir > 0 || g.status === 'HADIR').length,
      guruIzin: list.filter(g => g.status === 'IZIN').length,
      guruSakit: list.filter(g => g.status === 'SAKIT').length,
      guruAlpa: list.filter(g => g.status === 'ALPA' && g.total_sesi > 0).length,
    };

    return {
      ...summary,
      list
    };
  }

  /**
   * 5️⃣ Grafik Bulanan Kehadiran Siswa
   */
  async getGrafikSiswaBulanan(tenantId: string | null, bulan: string) {
    // Parse bulan format: "2025-10"
    const parts = bulan.split('-');
    if (parts.length !== 2) {
      throw new Error('Format bulan harus YYYY-MM');
    }
    
    const year = parseInt(parts[0]!);
    const month = parseInt(parts[1]!);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      throw new Error('Format bulan tidak valid');
    }
    
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const endOfMonthWithTime = new Date(year, month, 0, 23, 59, 59, 999);

    // Generate labels (tanggal dalam bulan)
    const labels: string[] = [];
    const daysInMonth = endOfMonth.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      labels.push(day.toString().padStart(2, '0'));
    }

    // Build where clause
    const whereClause: any = {
      created_at: {
        gte: startOfMonth,
        lte: endOfMonthWithTime
      }
    };

    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    const [rawKbmData, rawGerbangData] = await Promise.all([
      prisma.absenSiswa.findMany({
        where: whereClause,
        select: {
          created_at: true,
          status: true,
          siswa_id: true,
          siswa_akademik_id: true,
        },
      }),
      prisma.absenGerbangSiswa.findMany({
        where: {
          ...whereClause,
          arah: 'GERBANG_DATANG',
        },
        select: {
          created_at: true,
          status: true,
          siswa_id: true,
        },
      }),
    ]);

    const datasets = [
      { label: 'Hadir', data: new Array(daysInMonth).fill(0) },
      { label: 'Izin', data: new Array(daysInMonth).fill(0) },
      { label: 'Sakit', data: new Array(daysInMonth).fill(0) },
      { label: 'Alpha', data: new Array(daysInMonth).fill(0) },
    ];

    const statusToDatasetLabel = (status: unknown): string | null => {
      const s = String(status || '').toUpperCase();
      if (s === 'HADIR' || s === 'TERLAMBAT') {
        return 'Hadir';
      }
      if (s === 'IZIN' || s === 'DISPEN') return 'Izin';
      if (s === 'SAKIT') return 'Sakit';
      if (s === 'ALPA' || s === 'ALPHA') return 'Alpha';
      return null;
    };

    const statusPriority: Record<string, number> = {
      Hadir: 4,
      Izin: 3,
      Sakit: 2,
      Alpha: 1,
    };

    // Deduplicate per (dayIndex, studentKey) so multiple KBM sessions / gate taps count 1 student per day
    const dailyStudentStatus = Array.from({ length: daysInMonth }, () => new Map<string, string>());

    const recordStudentDay = (createdAt: Date, studentKey: string | null | undefined, status: unknown) => {
      if (!studentKey) return;
      const dayIndex = new Date(createdAt).getDate() - 1;
      if (dayIndex < 0 || dayIndex >= daysInMonth) return;
      const label = statusToDatasetLabel(status);
      if (!label) return;
      const dayMap = dailyStudentStatus[dayIndex]!;
      const existing = dayMap.get(studentKey);
      if (!existing || (statusPriority[label] ?? 0) > (statusPriority[existing] ?? 0)) {
        dayMap.set(studentKey, label);
      }
    };

    rawKbmData.forEach((row) => {
      recordStudentDay(row.created_at, row.siswa_id || row.siswa_akademik_id, row.status);
    });
    rawGerbangData.forEach((row) => {
      recordStudentDay(row.created_at, row.siswa_id, row.status);
    });

    dailyStudentStatus.forEach((dayMap, dayIndex) => {
      dayMap.forEach((label) => {
        const dataset = datasets.find((d) => d.label === label);
        if (dataset) {
          dataset.data[dayIndex]++;
        }
      });
    });

    return {
      labels,
      datasets
    };
  }

  /**
   * 6️⃣ Grafik Bulanan Guru
   */
  async getGrafikGuruBulanan(tenantId: string | null, bulan: string) {
    // Parse bulan format: "2025-10"
    const parts = bulan.split('-');
    if (parts.length !== 2) {
      throw new Error('Format bulan harus YYYY-MM');
    }
    
    const year = parseInt(parts[0]!);
    const month = parseInt(parts[1]!);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      throw new Error('Format bulan tidak valid');
    }
    
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const endOfMonthWithTime = new Date(year, month, 0, 23, 59, 59, 999);

    // Generate labels (tanggal dalam bulan)
    const labels: string[] = [];
    const daysInMonth = endOfMonth.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      labels.push(day.toString().padStart(2, '0'));
    }

    // Build where clause
    const whereClause: any = {
      created_at: {
        gte: startOfMonth,
        lte: endOfMonthWithTime
      }
    };

    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    // Fetch minimal data for aggregation
    const rawData = await prisma.absenGuru.findMany({
      where: whereClause,
      select: {
        created_at: true,
        status: true,
        guru_id: true,
      }
    });

    // Initialize datasets
    const datasets = [
      { label: 'HADIR', data: new Array(daysInMonth).fill(0) },
      { label: 'IZIN', data: new Array(daysInMonth).fill(0) },
      { label: 'SAKIT', data: new Array(daysInMonth).fill(0) },
      { label: 'ALPA', data: new Array(daysInMonth).fill(0) },
      { label: 'DISPEN', data: new Array(daysInMonth).fill(0) }
    ];

    const guruPriority: Record<string, number> = {
      HADIR: 5,
      DISPEN: 4,
      IZIN: 3,
      SAKIT: 2,
      ALPA: 1,
    };

    // Deduplicate per (dayIndex, guru_id) so multiple sessions in one day count 1 unique teacher
    const dailyGuruStatus = Array.from({ length: daysInMonth }, () => new Map<string, string>());

    rawData.forEach((row) => {
      const dayIndex = new Date(row.created_at).getDate() - 1;
      if (dayIndex < 0 || dayIndex >= daysInMonth) return;
      const s = String(row.status || '').toUpperCase();
      const label = s === 'TERLAMBAT' ? 'HADIR' : s;
      if (!datasets.some((d) => d.label === label)) return;
      const guruKey = String(row.guru_id || '');
      if (!guruKey) return;
      const dayMap = dailyGuruStatus[dayIndex]!;
      const existing = dayMap.get(guruKey);
      if (!existing || (guruPriority[label] ?? 0) > (guruPriority[existing] ?? 0)) {
        dayMap.set(guruKey, label);
      }
    });

    dailyGuruStatus.forEach((dayMap, dayIndex) => {
      dayMap.forEach((label) => {
        const dataset = datasets.find((d) => d.label === label);
        if (dataset) {
          dataset.data[dayIndex]++;
        }
      });
    });

    return {
      labels,
      datasets
    };
  }



  /**
   * 🆕 Get Hubin (PKL) Stats
   */

  async getGuruLeaderboard(tenantId: string | null, limit: number = 10) {
    const where: any = tenantId ? { tenant_id: tenantId } : {};
    
    // Group by guru_id and sum poin_kehadiran
    const leaderboardRaw = await prisma.absenGuru.groupBy({
      by: ['guru_id'],
      where: {
        ...where,
        status: 'HADIR' // Only count points for actual attendance
      },
      _sum: {
        poin_kehadiran: true
      },
      orderBy: {
        _sum: {
          poin_kehadiran: 'desc'
        }
      },
      take: Math.min(Math.max(limit, 1), 50)
    });

    if (leaderboardRaw.length === 0) return [];

    // Get Guru details for the IDs found
    const guruIds = leaderboardRaw.map(l => l.guru_id);
    const gurus = await prisma.guru.findMany({
      where: {
        id: { in: guruIds }
      },
      include: {
        User: {
          select: {
            full_name: true,
            email: true
          }
        }
      }
    });

    // Map and merge data
    return leaderboardRaw.map(l => {
      const guru = gurus.find(g => g.id === l.guru_id);
      return {
        guru_id: l.guru_id,
        nama: guru?.nama_guru || guru?.User?.full_name || 'Pengajar',
        avatar: null, // User model doesn't have avatar_url in schema
        total_poin: l._sum.poin_kehadiran || 0,
        nip: guru?.nip || '-'
      };
    });
  }

  /**
   * SSOT Leaderboard (Guru Terbaik & Siswa Terbaik) dan Galeri Foto Bukti KBM Hari Ini
   * Terscope ke Konteks Akademik Aktif (Tahun Pelajaran & Semester Aktif).
   */
  async getAcademicScopedLeaderboardAndGallery(
    tenantId: string,
    options?: { startUTC?: Date; endUTC?: Date; tz?: string; limit?: number }
  ) {
    const limit = options?.limit || 5;
    const tz = options?.tz || (await getTenantTimezone(tenantId));

    const [activeTp, activeSem] = await Promise.all([
      prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, tahun: true },
      }),
      prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, nama_semester: true },
      }),
    ]);

    const academicContext = activeTp
      ? `${activeTp.tahun}${activeSem ? ` (${activeSem.nama_semester})` : ''}`
      : 'Konteks Aktif';

    const sesiAcademicScope: any = {
      ...(activeTp ? { tahun_pelajaran_id: activeTp.id } : {}),
      ...(activeSem ? { semester_id: activeSem.id } : {}),
    };

    // ── 1. Leaderboard Guru Terbaik (Scoped TP & Semester Aktif) ──────────────
    const guruGroup = await prisma.absenGuru.groupBy({
      by: ['guru_id'],
      where: {
        tenant_id: tenantId,
        status: 'HADIR',
        ...sesiAcademicScope,
      },
      _sum: { poin_kehadiran: true },
      _count: { id: true },
      orderBy: [{ _sum: { poin_kehadiran: 'desc' } }, { _count: { id: 'desc' } }],
      take: limit,
    });

    const guruIds = guruGroup.map((g) => g.guru_id);
    const guruList =
      guruIds.length > 0
        ? await prisma.guru.findMany({
            where: { id: { in: guruIds } },
            select: { id: true, nama_guru: true, nip: true, foto: true },
          })
        : [];

    const topTeachers = guruGroup.map((g, idx) => {
      const info = guruList.find((item) => item.id === g.guru_id);
      const poin = g._sum.poin_kehadiran || 0;
      const sesi = g._count.id || 0;
      return {
        rank: idx + 1,
        name: info?.nama_guru || 'Guru',
        subtitle: info?.nip ? `NIP. ${info.nip}` : 'Tenaga Pendidik',
        badge: `${poin} Poin • ${sesi} Sesi KBM`,
        photoUrl: info?.foto || null,
      };
    });

    // ── 2. Leaderboard Siswa Terbaik (Scoped TP & Semester Aktif) ─────────────
    const siswaHadirGroup = await prisma.absenSiswa.groupBy({
      by: ['siswa_id'],
      where: {
        tenant_id: tenantId,
        status: 'HADIR',
        ...(activeTp ? { SesiAbsensi: sesiAcademicScope } : {}),
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 25,
    });

    const candidateSiswaIds = siswaHadirGroup.map((s) => s.siswa_id).filter(Boolean);
    let topStudents: Array<{
      rank: number;
      name: string;
      subtitle: string;
      badge: string;
      photoUrl?: string | null;
    }> = [];

    if (candidateSiswaIds.length > 0) {
      const [candidateDetails, alpaGroup, pelanggaranGroup, prestasiGroup] = await Promise.all([
        prisma.siswa.findMany({
          where: { id: { in: candidateSiswaIds }, status: 'AKTIF' },
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            foto: true,
            Kelas: { select: { nama_kelas: true } },
            SiswaAkademik: activeTp
              ? {
                  where: sesiAcademicScope,
                  select: { kelas: { select: { nama_kelas: true } } },
                  take: 1,
                }
              : false,
          },
        }),
        prisma.absenSiswa.groupBy({
          by: ['siswa_id'],
          where: {
            tenant_id: tenantId,
            siswa_id: { in: candidateSiswaIds },
            status: 'ALPA',
            ...(activeTp ? { SesiAbsensi: sesiAcademicScope } : {}),
          },
          _count: { id: true },
        }),
        prisma.pelanggaranSiswa.groupBy({
          by: ['siswa_id'],
          where: {
            tenant_id: tenantId,
            siswa_id: { in: candidateSiswaIds },
            ...(activeTp ? { tahun_pelajaran_id: activeTp.id } : {}),
          },
          _sum: { poin: true },
        }),
        prisma.prestasiSiswa.groupBy({
          by: ['siswa_id'],
          where: {
            tenant_id: tenantId,
            siswa_id: { in: candidateSiswaIds },
          },
          _count: { id: true },
        }),
      ]);

      const alpaMap = new Map<string, number>();
      alpaGroup.forEach((a) => alpaMap.set(a.siswa_id, a._count.id));

      const pelanggaranMap = new Map<string, number>();
      pelanggaranGroup.forEach((p) => pelanggaranMap.set(p.siswa_id, p._sum.poin || 0));

      const prestasiMap = new Map<string, number>();
      prestasiGroup.forEach((pr) => prestasiMap.set(pr.siswa_id, pr._count.id));

      const scoredStudents = siswaHadirGroup
        .map((sh) => {
          const detail = candidateDetails.find((d) => d.id === sh.siswa_id);
          if (!detail) return null;
          const hadirCount = sh._count.id || 0;
          const alpaCount = alpaMap.get(sh.siswa_id) || 0;
          const pelPoin = pelanggaranMap.get(sh.siswa_id) || 0;
          const prestasiCount = prestasiMap.get(sh.siswa_id) || 0;
          const score = hadirCount * 10 + prestasiCount * 50 - alpaCount * 30 - pelPoin * 2;
          const kelasNama =
            (Array.isArray(detail.SiswaAkademik) && detail.SiswaAkademik[0]?.kelas?.nama_kelas) ||
            detail.Kelas?.nama_kelas ||
            'Siswa';
          return {
            name: detail.nama_siswa,
            subtitle: `${kelasNama} • NIS. ${detail.nis}`,
            badge:
              prestasiCount > 0
                ? `${hadirCount} Sesi Hadir • ${prestasiCount} Prestasi`
                : `${hadirCount} Sesi Hadir • 0 Pelanggaran`,
            photoUrl: detail.foto || null,
            score,
            alpaCount,
            pelPoin,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => {
          if (a.alpaCount === 0 && b.alpaCount > 0) return -1;
          if (b.alpaCount === 0 && a.alpaCount > 0) return 1;
          return b.score - a.score;
        })
        .slice(0, limit);

      topStudents = scoredStudents.map((s, idx) => ({
        rank: idx + 1,
        name: s.name,
        subtitle: s.subtitle,
        badge: s.badge,
        photoUrl: s.photoUrl,
      }));
    }

    // ── 3. Galeri Bukti KBM Hari Ini (foto_kegiatan dari SesiAbsensi) ─────────
    const basePhotoWhere: any = {
      tenant_id: tenantId,
      foto_kegiatan: { not: null },
      NOT: { foto_kegiatan: '' },
      ...sesiAcademicScope,
    };

    const todayPhotoSessions =
      options?.startUTC && options?.endUTC
        ? await prisma.sesiAbsensi.findMany({
            where: {
              ...basePhotoWhere,
              tanggal: { gte: options.startUTC, lte: options.endUTC },
            },
            include: {
              Guru: { select: { nama_guru: true } },
              GuruPelaksana: { select: { nama_guru: true } },
              Kelas: { select: { nama_kelas: true } },
              Mapel: { select: { nama_mapel: true } },
            },
            orderBy: { waktu_mulai: 'desc' },
            take: 12,
          })
        : [];

    let isToday = todayPhotoSessions.length > 0;
    const rawGallerySessions =
      todayPhotoSessions.length > 0
        ? todayPhotoSessions
        : await prisma.sesiAbsensi.findMany({
            where: basePhotoWhere,
            include: {
              Guru: { select: { nama_guru: true } },
              GuruPelaksana: { select: { nama_guru: true } },
              Kelas: { select: { nama_kelas: true } },
              Mapel: { select: { nama_mapel: true } },
            },
            orderBy: { waktu_mulai: 'desc' },
            take: 8,
          });

    const galleryItems = rawGallerySessions
      .filter((s) => Boolean(s.foto_kegiatan && s.foto_kegiatan.trim()))
      .map((s) => ({
        id: s.id,
        photoUrl: s.foto_kegiatan!.trim(),
        mapel: s.Mapel?.nama_mapel || s.jenis_kegiatan || 'KBM Kelas',
        kelas: s.Kelas?.nama_kelas || 'Kelas',
        guru: s.GuruPelaksana?.nama_guru || s.Guru?.nama_guru || 'Guru Pengajar',
        waktu: s.waktu_mulai
          ? new Date(s.waktu_mulai).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: tz,
            })
          : '-',
        jurnal: s.keterangan || null,
      }));

    return {
      leaderboard: {
        academicContext,
        topTeachers,
        topStudents,
      },
      kbmGallery: {
        isToday,
        totalPhotosToday: todayPhotoSessions.length,
        items: galleryItems,
      },
    };
  }
}

function mapViolationStatusToEscalationStatus(status: string): string {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'BARU' || normalized === 'PENDING') return 'Waiting';
  if (normalized === 'PROSES' || normalized === 'IN_PROGRESS') return 'Review';
  if (normalized === 'SELESAI' || normalized === 'DONE') return 'Done';
  return status;
}

function priorityFromPoints(points: number): 'High' | 'Medium' | 'Low' {
  const p = Number(points) || 0;
  if (p >= 50) return 'High';
  if (p >= 20) return 'Medium';
  return 'Low';
}
