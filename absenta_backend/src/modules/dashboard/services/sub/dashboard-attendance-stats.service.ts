// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { AbsensiMode } from '@/constants/enums';
import { formatTenantTime, getTenantTimezone, getTenantOffsetString, getTenantDayRange } from '@/utils/timezone.utils';
import { sesiLifecycleService, SesiLifecycleService } from '@/modules/attendance/sesi-absensi/services/sesi-lifecycle.service';
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
      whereClause = applyDataScope(whereClause, scope, { classField: 'id' });
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

    const rawData = await prisma.absenGerbangSiswa.findMany({
      where: {
        ...whereClause,
        arah: 'GERBANG_DATANG',
      },
      select: {
        created_at: true,
        status: true,
        is_terlambat: true,
      },
    });

    const datasets = [
      { label: 'Hadir', data: new Array(daysInMonth).fill(0) },
      { label: 'Izin', data: new Array(daysInMonth).fill(0) },
      { label: 'Sakit', data: new Array(daysInMonth).fill(0) },
      { label: 'Alpha', data: new Array(daysInMonth).fill(0) },
    ];

    const statusToDatasetLabel = (status: unknown): string | null => {
      const s = String(status || '').toUpperCase();
      // TERLAMBAT is counted as 'Hadir' in this chart unless we add a new dataset
      if (s === 'HADIR') {
         // Optionally you could separate TERLAMBAT if you have a dataset for it
         // But for now, user might want to see them as HADIR or maybe we should add TERLAMBAT dataset?
         // User request: "menghapus TERLAMBAT dijadikan Enum AbsenStatus" but "poin kehadiran 50 for late".
         // The chart labels are: Hadir, Izin, Sakit, Alpha.
         // Usually Late is considered Present.
         return 'Hadir'; 
      }
      if (s === 'IZIN' || s === 'DISPEN') return 'Izin';
      if (s === 'SAKIT') return 'Sakit';
      if (s === 'ALPA') return 'Alpha';
      return null;
    };

    rawData.forEach(row => {
      const dayIndex = new Date(row.created_at).getDate() - 1;
      const label = statusToDatasetLabel(row.status);
      const dataset = label ? datasets.find(d => d.label === label) : undefined;
      if (dataset && dayIndex >= 0 && dayIndex < daysInMonth) {
        dataset.data[dayIndex]++;
      }
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
        status: true
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

    // Aggregate data in memory
    rawData.forEach(row => {
      const day = new Date(row.created_at).getDate();
      const dayIndex = day - 1;
      const s = String(row.status || '').toUpperCase();
      
      // Map status to dataset label
      let label = s;
      if (s === 'HADIR' && (row as any).is_terlambat) {
          // If we want to track late separately, we can. 
          // For now, count as HADIR or maybe add TERLAMBAT dataset?
          // Previous code for Siswa counted TERLAMBAT as HADIR.
          label = 'HADIR';
      }
      
      const dataset = datasets.find(d => d.label === label);
      
      if (dataset && dayIndex >= 0 && dayIndex < daysInMonth) {
        dataset.data[dayIndex]++;
      }
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
