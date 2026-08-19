import { prisma } from '../../../utils/prisma';
import { cacheService } from '../../../utils/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../constants/cache-keys';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { STRUKTUR_CAPABILITIES } from '@/config/position-capabilities';
import { DataScope } from '@/types/fastify';
import { applyDataScope } from '@/utils/applyDataScope';
import { getTenantTimezone, getTenantOffsetString, getTenantDayRangeUTC } from '@/utils/timezone.utils';
import { SesiLifecycleService } from '@/modules/attendance/sesi-absensi/services/sesi-lifecycle.service';

export class DashboardService {
  
  /**
   * Helper: Resolusi rentang waktu satu hari penuh (00:00:00 - 23:59:59) dalam UTC berdasarkan timezone tenant.
   */
  private async resolveDayRange(tenantId: string | null, tanggal?: string): Promise<{ startOfDay: Date; endOfDay: Date; dateStr: string; timeZone: string }> {
    const tz = await getTenantTimezone(tenantId);
    let dateStr = tanggal;
    if (!dateStr) {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      dateStr = formatter.format(new Date());
    }
    const { startUTC, endUTC } = getTenantDayRangeUTC(dateStr, tz);
    return { startOfDay: startUTC, endOfDay: endUTC, dateStr, timeZone: tz };
  }

  /**
   * 1️⃣ Dashboard Overview - Ringkasan global per tenant untuk hari ini
   */
  async getOverview(tenantId: string | null, tanggal?: string, scope?: DataScope) {
    const { startOfDay, endOfDay, dateStr } = await this.resolveDayRange(tenantId, tanggal);
    // Cache key should include scope fingerprints if scope is restricted
    const scopeKey = scope?.kelasIds ? `scope-${scope.kelasIds.join(',')}` : 'global';
    const cacheKey = CACHE_KEYS.DASHBOARD.OVERVIEW(tenantId, `${dateStr}-${scopeKey}`);
    
    // 📊 Cache overview dengan TTL pendek karena data real-time
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
    // Build where clause based on tenantId
    const siswaWhereClause: any = {
      status: 'AKTIF'
    };
    const guruWhereClause: any = {};
    const absenWhereClause: any = {
      created_at: {
        gte: startOfDay,
        lte: endOfDay
      }
    };

    // If tenantId is provided, filter by tenant; otherwise get all data (SUPERADMIN)
    if (tenantId) {
      siswaWhereClause.tenant_id = tenantId;
      guruWhereClause.tenant_id = tenantId;
      absenWhereClause.tenant_id = tenantId;
    }

    if (scope) {
      // applyDataScope updates the where clause based on tenant, user, and kelas scopes
      const siswaScope = applyDataScope(siswaWhereClause, scope, 'kelas_id');
      Object.assign(siswaWhereClause, siswaScope);

      // Attendance statistics should also be scoped to the classes the user manages
      // AbsenSiswa uses kelas_id_snapshot for historical consistency
      const absenScope = applyDataScope(absenWhereClause, scope, 'kelas_id_snapshot');
      Object.assign(absenWhereClause, absenScope);
    }

    // Total & Kehadiran (Siswa, Guru, Gerbang) - Executed in Parallel via Promise.all
    const [
      totalSiswa,
      totalGuru,
      absenSiswaHariIni,
      absenGuruHariIni,
      gerbangTapSiswaCount,
      gerbangTapGuruCount
    ] = await Promise.all([
      prisma.siswa.count({ where: siswaWhereClause }),
      prisma.guru.count({ where: guruWhereClause }),
      prisma.absenSiswa.groupBy({
        by: ['status', 'is_terlambat'],
        where: absenWhereClause,
        _count: { siswa_id: true }
      }),
      prisma.absenGuru.groupBy({
        by: ['status', 'is_terlambat'],
        where: absenWhereClause,
        _count: { guru_id: true }
      }),
      prisma.absenGerbangSiswa.count({ where: absenWhereClause }),
      prisma.absenGerbangGuru.count({ where: absenWhereClause })
    ]);

    // Hitung statistik siswa (gabungkan Sesi Absensi & Gerbang Tap)
    const sesiSiswaHadir = absenSiswaHariIni
      .filter(item => item.status === 'HADIR')
      .reduce((acc, curr) => acc + (curr._count.siswa_id || 0), 0);
    
    const siswaHadir = Math.max(sesiSiswaHadir, gerbangTapSiswaCount);
    
    const siswaIzin = absenSiswaHariIni.filter(item => item.status === 'IZIN').reduce((acc, curr) => acc + (curr._count.siswa_id || 0), 0);
    const siswaSakit = absenSiswaHariIni.filter(item => item.status === 'SAKIT').reduce((acc, curr) => acc + (curr._count.siswa_id || 0), 0);
    const siswaAlpa = absenSiswaHariIni.filter(item => item.status === 'ALPA').reduce((acc, curr) => acc + (curr._count.siswa_id || 0), 0);

    // Hitung statistik guru
    const sesiGuruHadir = absenGuruHariIni
      .filter(item => item.status === 'HADIR')
      .reduce((acc, curr) => acc + (curr._count.guru_id || 0), 0);

    const guruHadir = Math.max(sesiGuruHadir, gerbangTapGuruCount);
    const guruTidakHadir = absenGuruHariIni.filter(item => item.status === 'ALPA').reduce((acc, curr) => acc + (curr._count.guru_id || 0), 0);

    // Hitung persentase
    const persentaseSiswa = totalSiswa > 0 ? Math.round((siswaHadir / totalSiswa) * 100) : 0;
    const persentaseGuru = totalGuru > 0 ? Math.round((guruHadir / totalGuru) * 100) : 0;

    return {
      tanggal: dateStr,
      total_siswa: totalSiswa,
      total_guru: totalGuru,
      siswa_hadir: siswaHadir,
      siswa_izin: siswaIzin,
      siswa_sakit: siswaSakit,
      siswa_alpa: siswaAlpa,
      guru_hadir: guruHadir,
      guru_tidak_hadir: guruTidakHadir,
      persentase_siswa: persentaseSiswa,
      persentase_guru: persentaseGuru,
      gate_masuk: gerbangTapSiswaCount + gerbangTapGuruCount
    };
      },
      CACHE_TTL.DASHBOARD
    );
  }

  /**
   * 🆕 Get Guru Attendance Status
   */
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

  async getAnalyticsStats(tenantId: string | null) {
    const [usersCount] = await Promise.all([
      prisma.user.count({
        where: tenantId ? { tenant_id: tenantId } : {}
      }),
    ]);

    return {
      users: usersCount,
      billings: 0,
      payments: 0,
      revenue: 0
    };
  }

  async getRecentTenantRegistrations(limit: number = 10, days: number = 30) {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 10;
    const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(365, days)) : 30;
    const since = new Date();
    since.setDate(since.getDate() - safeDays);

    const logs = await prisma.activityLog.findMany({
      where: {
        action: 'TENANT_REGISTERED',
        created_at: { gte: since }
      },
      orderBy: { created_at: 'desc' },
      take: safeLimit,
      include: {
        Tenant: true,
        User: {
          select: { id: true, full_name: true, email: true }
        }
      }
    });

    return (logs as any[]).map((l) => ({
      id: l.id,
      tenant_id: l.tenant_id,
      tenant_name: l.Tenant?.name,
      tenant_domain: l.Tenant?.custom_domain || (l.Tenant?.subdomain ? `${l.Tenant.subdomain}.absenta.id` : null),
      admin_user: l.User ? { id: l.User.id, full_name: l.User.full_name, email: l.User.email } : null,
      timestamp: l.created_at,
      metadata: (() => {
        try {
          return l.metadata ? JSON.parse(l.metadata) : null;
        } catch {
          return null;
        }
      })()
    }));
  }

  /**
   * 🆕 Get Violation Stats
   */
  async getViolationStats(tenantId: string | null, scope?: DataScope) {
    let where: any = {
      tenant_id: tenantId || undefined
    };

    if (scope) {
      where = applyDataScope(where, scope);
    }

    const violations = await prisma.pelanggaranSiswa.findMany({
      where,
      include: {
        Siswa: {
          include: {
            Kelas: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 10
    });

    return violations.map(v => ({
      id: v.id,
      student: v.Siswa.nama_siswa,
      class: v.Siswa.Kelas?.nama_kelas || 'Tanpa Kelas',
      violation: v.jenis_pelanggaran,
      points: v.poin,
      date: v.tanggal.toISOString(),
      status: v.status
    }));
  }

  /**
   * 🆕 Get Supervision Schedule
   */
  async getSupervisionSchedule(tenantId: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const schedules = await prisma.supervisiGuru.findMany({
      where: {
        tenant_id: tenantId || undefined,
        tanggal: {
          gte: today,
          lte: endOfDay
        }
      },
      include: {
        Guru: true
      },
      orderBy: {
        jam_ke: 'asc'
      }
    });

    return schedules.map(s => ({
      id: s.id,
      teacher: s.Guru.nama_guru,
      subject: s.mapel || '-',
      class: s.kelas || '-',
      time: s.jam_ke ? `Jam ke-${s.jam_ke}` : '-',
      status: s.status
    }));
  }

  async getKepsekEscalations(tenantId: string | null, limit: number = 10) {
    const cacheKey = CACHE_KEYS.DASHBOARD.EWS_ESCALATIONS(tenantId, limit);
    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const violations = await prisma.pelanggaranSiswa.findMany({
          where: {
            tenant_id: tenantId || undefined,
            status: { not: 'SELESAI' }
          },
          include: {
            Siswa: {
              include: {
                Kelas: true
              }
            }
          },
          orderBy: {
            created_at: 'desc'
          },
          take: Math.min(Math.max(Number(limit) || 10, 1), 50)
        });

        return violations.map(v => ({
          id: v.id,
          title: `${v.jenis_pelanggaran} - ${v.Siswa.nama_siswa} (${v.Siswa.Kelas?.nama_kelas || '-'})`,
          source: 'Kesiswaan',
          status: mapViolationStatusToEscalationStatus(v.status),
          created_at: v.created_at.toISOString(),
          priority: priorityFromPoints(v.poin),
          points: v.poin
        }));
      },
      CACHE_TTL.DASHBOARD
    );
  }

  /**
   * 🆕 Get Kurikulum Global Monitoring Data
   */
  /**
   * 🆕 Get Kurikulum Global Monitoring Data
   */
  async getKurikulumMonitoringGlobal(tenantId: string | null, tanggal?: string) {
    const tz = await getTenantTimezone(tenantId);
    const dateStr = tanggal || new Date().toLocaleDateString('sv-SE', { timeZone: tz || 'Asia/Jakarta' });
    const offsetStr = getTenantOffsetString(tz);
    const cacheKey = CACHE_KEYS.DASHBOARD.KURIKULUM_MONITORING(tenantId, dateStr);

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const startOfDay = new Date(`${dateStr}T00:00:00.000${offsetStr}`);
        const endOfDay = new Date(`${dateStr}T23:59:59.999${offsetStr}`);

        const where: any = { tenant_id: tenantId || undefined };

        // 1. Total & Active Classes
        const totalClasses = await prisma.kelas.count({ where });

        // Unify session list with SesiLifecycleService (includes scheduled KBM sessions)
        const lifecycleRes = await SesiLifecycleService.getInstance().list(
          tenantId || '',
          {},
          { tanggal: dateStr, include_scheduled: true, summary: true, limit: 1000 }
        );

        const sessionList = Array.isArray(lifecycleRes.data) ? lifecycleRes.data : [];

        const activeClasses = sessionList.filter(s => s.status === 'BERLANGSUNG').length;

        // 2. Teacher Presence & Supervision
        const [totalTeachers, teacherPresent, supervisionCount] = await Promise.all([
          prisma.guru.count({ where }),
          prisma.absenGuru.count({
            where: {
              ...where,
              created_at: { gte: startOfDay, lte: endOfDay },
              status: { in: ['Hadir', 'Hadir / Mengajar', 'HADIR', 'HADIR / MENGAJAR'] }
            }
          }),
          prisma.supervisiGuru.count({
            where: {
              ...where,
              tanggal: { gte: startOfDay, lte: endOfDay }
            }
          })
        ]);

        // 3. Calculate detailed session stats for Monitoring Page
        const sessionStats = {
          total: sessionList.length,
          live: 0,
          finished: 0,
          withJournal: 0,
          teacherOnTime: 0,
          teacherLate: 0,
          teacherNotArrived: 0,
          teacherAlpa: 0,
          teacherIzin: 0,
          teacherSakit: 0,
        };

        sessionList.forEach(s => {
          const now = new Date();
          const startTime = new Date(s.waktu_mulai);
          const endTime = s.waktu_selesai ? new Date(s.waktu_selesai) : null;

          const isFinished = s.status === 'SELESAI' || (endTime && now > endTime);
          const isLive = !isFinished && (s.status === 'BERLANGSUNG' || (endTime && now >= startTime && now <= endTime));
          
          if (isLive) sessionStats.live++;
          if (isFinished) sessionStats.finished++;
          if (s.ProgresMateri) sessionStats.withJournal++;

          const absenGuru = s.AbsenGuru?.[0];
          const sStatus = (absenGuru?.status || '').toUpperCase().replace(/\s+/g, '_');
          const isExplicitNonHadir = ['IZIN', 'SAKIT', 'ALPA', 'PENUGASAN', 'TUGAS_LUAR'].includes(sStatus);
          const hasTap = !isExplicitNonHadir && !!absenGuru?.waktu_tap;
          const isPresent = (sStatus === 'HADIR' || sStatus === 'TEPAT_WAKTU' || sStatus === 'HADIR_/_MENGAJAR' || hasTap) && !isExplicitNonHadir;

          if (isPresent) {
            if (absenGuru?.is_terlambat || sStatus === 'TERLAMBAT') sessionStats.teacherLate++;
            else sessionStats.teacherOnTime++;
          } else if (sStatus === 'IZIN') {
            sessionStats.teacherIzin++;
          } else if (sStatus === 'SAKIT') {
            sessionStats.teacherSakit++;
          } else if (sStatus === 'PENUGASAN' || sStatus === 'TUGAS_LUAR') {
            sessionStats.teacherIzin++;
          } else if (sStatus === 'ALPA') {
            sessionStats.teacherAlpa++;
          } else if (sStatus === 'BELUM_HADIR' || sStatus === 'BELUM_TAP' || sStatus === '' || !absenGuru) {
            if (isLive) {
              sessionStats.teacherNotArrived++;
            } else if (isFinished) {
              sessionStats.teacherAlpa++;
            }
          }
        });

        // 4. Calculate Health Score
        const ka = activeClasses;
        const kt = totalClasses || 1;
        const gh = teacherPresent;
        const gt = totalTeachers || 1;
        const healthScore = Math.round((ka / kt) * 60 + (gh / gt) * 40);

        return {
          healthScore,
          activeClasses,
          totalClasses,
          teacherPresent,
          totalTeachers,
          supervisionCount,
          sessionStats,
          timestamp: new Date().toISOString()
        };
      },
      CACHE_TTL.DASHBOARD
    );
  }

  /**
   * 2️⃣ Statistik Harian per Kelas
   */
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
  async getHubinStats(tenantId: string, userId?: string) {
    let guruId: string | undefined;
    let isGlobalHubin = false;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          Guru: true,
          Role: {
            include: {
              rolePermissions: true
            }
          }
        }
      });

      guruId = user?.Guru?.id;
      
      // Check if user has global hubin management capability
      // If they do, they see everything. If not, they only see their assigned students.
      const permissions = user?.Role?.rolePermissions.map(rp => rp.permission_id) || [];
      isGlobalHubin = permissions.includes('hubin.partners.manage') || user?.Role?.name === 'ADMIN';
    }

    const baseWhere: any = { tenant_id: tenantId };
    const pklWhere: any = { tenant_id: tenantId };

    if (!isGlobalHubin && guruId) {
      pklWhere.pembimbing_id = guruId;
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get all unique student IDs with status LULUS or in SiswaAkademik with status LULUS
    const alumniStudents = await prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { status: 'LULUS' },
          { SiswaAkademik: { some: { status: 'LULUS' } } }
        ]
      },
      select: { id: true }
    });
    const totalAlumni = alumniStudents.length;

    const [
      totalMitra,
      totalSiswaPkl,
      pklAktif,
      pendingReports,
      mouExpiringCount,
      totalLowonganAktif,
      totalAlumniTraced,
      statusBekerjaCount,
      statusWirausahaCount,
      totalRecruitmentSuccess,
      topMitraGroup,
      tracedAlumni
    ] = await Promise.all([
      prisma.mitraIndustri.count({ where: baseWhere }),
      prisma.siswaPkl.count({ where: pklWhere }),
      prisma.siswaPkl.count({ where: { ...pklWhere, status: 'AKTIF' } }),
      prisma.absensiPkl.count({
        where: {
          SiswaPkl: pklWhere,
          is_verified: false
        }
      }),
      prisma.mitraIndustri.count({
        where: {
          ...baseWhere,
          mou_tanggal_berakhir: {
            gte: new Date(),
            lte: thirtyDaysFromNow
          }
        }
      }),
      prisma.hubinLowongan.count({
        where: {
          ...baseWhere,
          status: 'BUKA',
          deleted_at: null
        }
      }),
      prisma.hubinTracerStudy.count({
        where: { ...baseWhere, deleted_at: null }
      }),
      prisma.hubinTracerStudy.count({
        where: { ...baseWhere, status_alumni: 'BEKERJA', deleted_at: null }
      }),
      prisma.hubinTracerStudy.count({
        where: { ...baseWhere, status_alumni: 'WIRAUSAHA', deleted_at: null }
      }),
      prisma.hubinLamaran.count({
        where: { ...baseWhere, status_seleksi: 'DITERIMA', deleted_at: null }
      }),
      prisma.siswaPkl.groupBy({
        by: ['mitra_id'],
        where: { tenant_id: tenantId, status: 'AKTIF' },
        _count: { siswa_id: true },
        orderBy: { _count: { siswa_id: 'desc' } },
        take: 5
      }),
      prisma.hubinTracerStudy.findMany({
        where: {
          tenant_id: tenantId,
          status_alumni: { in: ['BEKERJA', 'WIRAUSAHA'] },
          deleted_at: null
        },
        include: {
          Siswa: {
            include: {
              Kelas: {
                include: {
                  Jurusan: true
                }
              }
            }
          }
        }
      })
    ]);

    // Tracer Coverage
    const tracerCoverage = totalAlumni > 0 ? (totalAlumniTraced / totalAlumni) * 100 : 0;

    // Employment Rate
    const employmentRate = totalAlumniTraced > 0 ? ((statusBekerjaCount + statusWirausahaCount) / totalAlumniTraced) * 100 : 0;

    // Top Mitra Detail
    const topMitraIds = topMitraGroup.map(g => g.mitra_id);
    const topMitrasDetail = await prisma.mitraIndustri.findMany({
      where: { id: { in: topMitraIds } },
      select: { id: true, nama: true }
    });
    const topMitra = topMitraGroup.map(g => {
      const detail = topMitrasDetail.find(m => m.id === g.mitra_id);
      return {
        id: g.mitra_id,
        nama: detail?.nama || 'Tidak Diketahui',
        count: g._count.siswa_id
      };
    });

    // Top Jurusan Terserap
    const jurusanCounts: Record<string, { nama: string; count: number }> = {};
    tracedAlumni.forEach(ta => {
      const jurusan = ta.Siswa?.Kelas?.Jurusan;
      if (jurusan) {
        if (!jurusanCounts[jurusan.id]) {
          jurusanCounts[jurusan.id] = {
            nama: jurusan.nama,
            count: 0
          };
        }
        jurusanCounts[jurusan.id]!.count++;
      }
    });
    const topJurusanTerserap = Object.values(jurusanCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const tracerGroups = await prisma.hubinTracerStudy.groupBy({
      by: ['status_alumni'],
      where: { ...baseWhere, deleted_at: null },
      _count: { status_alumni: true }
    });

    const tracerStats = {
      BEKERJA: 0,
      KULIAH: 0,
      WIRAUSAHA: 0,
      MENCARI_KERJA: 0
    };

    tracerGroups.forEach(g => {
      const key = g.status_alumni as keyof typeof tracerStats;
      if (tracerStats[key] !== undefined) {
        tracerStats[key] = g._count.status_alumni;
      }
    });

    const recentPkl = await prisma.siswaPkl.findMany({
      where: pklWhere,
      include: {
        Siswa: { select: { nama_siswa: true } },
        Mitra: { select: { nama: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    return {
      totalMitra,
      totalSiswaPkl,
      pklAktif,
      pendingReports,
      mouExpiringCount,
      totalLowonganAktif,
      totalAlumniTraced,
      tracerStats,
      tracerCoverage,
      employmentRate,
      topMitra,
      topJurusanTerserap,
      totalRecruitmentSuccess,
      recentPkl: recentPkl.map(p => ({
        id: p.id,
        siswa: p.Siswa.nama_siswa,
        mitra: p.Mitra.nama,
        status: p.status,
        tanggal: p.tanggal_mulai.toISOString()
      }))
    };
  }

  /**
   * 🆕 Get Sarpras (Inventory) Stats
   */
  async getSarprasStats(tenantId: string) {
    const [totalAssets, totalLoaned, totalBroken] = await Promise.all([
      prisma.sarprasAsset.count({ where: { tenant_id: tenantId } }),
      prisma.sarprasLoan.count({ where: { tenant_id: tenantId, status: 'ACTIVE' } }),
      prisma.sarprasAsset.count({ where: { tenant_id: tenantId, kondisi: 'RUSAK' } })
    ]);

    const recentLoans = await prisma.sarprasLoan.findMany({
      where: { tenant_id: tenantId },
      include: {
        Asset: { select: { nama: true } },
        Peminjam: { select: { full_name: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    return {
      totalAssets,
      totalLoaned,
      totalBroken,
      recentLoans: recentLoans.map(l => ({
        id: l.id,
        asset: l.Asset.nama,
        borrower: l.Peminjam.full_name,
        status: l.status,
        date: l.tanggal_pinjam.toISOString()
      }))
    };
  }

  /**
   * 🆕 Get TU (Administration) Stats
   */
  async getTUStats(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [suratMasukCount, suratKeluarCount] = await Promise.all([
      prisma.suratMasuk.count({
        where: {
          tenant_id: tenantId,
          tanggal_terima: { gte: startOfMonth }
        }
      }),
      prisma.suratKeluar.count({
        where: {
          tenant_id: tenantId,
          tanggal_surat: { gte: startOfMonth }
        }
      })
    ]);

    const recentSuratMasuk = await prisma.suratMasuk.findMany({
      where: { tenant_id: tenantId },
      orderBy: { tanggal_terima: 'desc' },
      take: 5
    });

    return {
      suratMasukBulanIni: suratMasukCount,
      suratKeluarBulanIni: suratKeluarCount,
      recentSuratMasuk: recentSuratMasuk.map(s => ({
        id: s.id,
        nomor: s.nomor_surat,
        judul: s.judul,
        asal: s.asal_surat,
        tanggal: s.tanggal_terima.toISOString()
      }))
    };
  }

  /**
   * 🆕 Get Gerbang (Gate) Stats
   */
  async getGerbangStats(tenantId: string) {
    const { startOfDay: today, endOfDay } = await this.resolveDayRange(tenantId);

    const [totalTaps, masukCount, keluarCount] = await Promise.all([
      prisma.absenGerbangSiswa.count({
        where: {
          tenant_id: tenantId,
          created_at: { gte: today, lte: endOfDay }
        }
      }),
      prisma.absenGerbangSiswa.count({
        where: {
          tenant_id: tenantId,
          arah: 'GERBANG_DATANG',
          created_at: { gte: today, lte: endOfDay }
        }
      }),
      prisma.absenGerbangSiswa.count({
        where: {
          tenant_id: tenantId,
          arah: 'GERBANG_PULANG',
          created_at: { gte: today, lte: endOfDay }
        }
      })
    ]);

    const lastActivities = await prisma.absenGerbangSiswa.findMany({
      where: { tenant_id: tenantId },
      include: {
        Siswa: { select: { nama_siswa: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    return {
      total_taps_today: totalTaps,
      total_masuk: masukCount,
      total_keluar: keluarCount,
      active_devices: 1, // Placeholder until device monitoring implemented
      last_activity: lastActivities[0]?.created_at || new Date().toISOString(),
      recent_activities: lastActivities.map(l => ({
        id: l.id,
        siswa: l.Siswa.nama_siswa,
        arah: l.arah,
        waktu: l.created_at.toISOString()
      }))
    };
  }

  /**
   * 🆕 Get Petugas (Officer) Stats
   */
  async getPetugasStats(tenantId: string, userId: string) {
    const { startOfDay: today, endOfDay } = await this.resolveDayRange(tenantId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { Guru: true }
    });

    const guruId = user?.Guru?.id;

    const [totalSesi, sesiHariIni, sesiSelesai] = await Promise.all([
      prisma.sesiAbsensi.count({
        where: {
          tenant_id: tenantId,
          ...(guruId ? { guru_id: guruId } : {})
        }
      }),
      prisma.sesiAbsensi.count({
        where: {
          tenant_id: tenantId,
          ...(guruId ? { guru_id: guruId } : {}),
          tanggal: { gte: today, lte: endOfDay }
        }
      }),
      prisma.sesiAbsensi.count({
        where: {
          tenant_id: tenantId,
          ...(guruId ? { guru_id: guruId } : {}),
          status: 'SELESAI'
        }
      })
    ]);

    return {
      total_sesi: totalSesi,
      sesi_hari_ini: sesiHariIni,
      sesi_selesai: sesiSelesai,
    };
  }

  /**
   * 🆕 Get Kaprog (Kepala Program) Stats
   * - totalTeachers: jumlah guru di jurusan kaprog ini
   * - activeClasses: jumlah kelas aktif hari ini di jurusan ini
   * - supervisionCount: supervisi terjadwal hari ini
   */
  async getKaprogStats(tenantId: string, userId: string) {
    // Cari assignment Kaprog/Kepala Program untuk user ini
    const now = new Date();
    const assignment = await prisma.organizationalAssignment.findFirst({
      where: {
        user_id: userId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        is_active: true,
        AND: [
          { OR: [{ start_date: null }, { start_date: { lte: now } }] },
          { OR: [{ end_date: null }, { end_date: { gte: now } }] }
        ],
        Position: { code: { contains: 'KAPROG', mode: 'insensitive' } }
      },
      include: { Position: { select: { name: true, code: true } } }
    });

    const programName = assignment?.Position?.name?.replace(/KAPROG|KEPALA PROGRAM/gi, '').trim() || 'Jurusan';

    // Hitung guru di jurusan yang sama (berdasarkan mengajar di kelas jurusan yang sama)
    // Proxy: hitung guru yang punya sesi hari ini di tenant ini
    const { startOfDay: today, endOfDay } = await this.resolveDayRange(tenantId);

    const [totalTeachers, supervisionCount] = await Promise.all([
      prisma.guru.count({ where: { ...(tenantId ? { tenant_id: tenantId } : {}) } }),
      prisma.supervisiGuru.count({
        where: {
          ...(tenantId ? { tenant_id: tenantId } : {}),
          tanggal: { gte: today, lte: endOfDay }
        }
      })
    ]);

    // Hitung kelas aktif hari ini
    const activeSessions = await prisma.sesiAbsensi.count({
      where: {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        tanggal: { gte: today, lte: endOfDay },
        status: 'BERLANGSUNG'
      }
    });

    return {
      totalTeachers,
      activeClasses: activeSessions,
      supervisionCount,
      programName
    };
  }

  /**
   * 🆕 Get Toolman Stats
   * - toolsBorrowed: alat lab sedang dipinjam
   * - toolsAvailable: alat tersedia (tidak rusak, tidak dipinjam)
   * - damagedReports: alat rusak
   */
  async getToolmanStats(tenantId: string) {
    const where = tenantId ? { tenant_id: tenantId } : {};

    const [toolsBorrowed, totalAssets, damagedReports] = await Promise.all([
      prisma.sarprasLoan.count({
        where: { ...where, status: 'ACTIVE' }
      }),
      prisma.sarprasAsset.count({ where }),
      prisma.sarprasAsset.count({ where: { ...where, kondisi: 'RUSAK' } })
    ]);

    const toolsAvailable = Math.max(0, totalAssets - toolsBorrowed - damagedReports);

    return {
      toolsBorrowed,
      toolsAvailable,
      damagedReports
    };
  }

  /**
   * 🆕 Get Kabeng (Kepala Bengkel) Stats
   * - activeBengkel: ruang/bengkel yang aktif digunakan hari ini
   * - availableTools: alat tersedia di bengkel
   * - practiceSchedules: jadwal praktik hari ini
   */
  async getKabengStats(tenantId: string, userId: string) {
    const { startOfDay: today, endOfDay } = await this.resolveDayRange(tenantId);

    const where = tenantId ? { tenant_id: tenantId } : {};

    // Cari assignment Kabeng
    const now = new Date();
    const assignment = await prisma.organizationalAssignment.findFirst({
      where: {
        user_id: userId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        is_active: true,
        AND: [
          { OR: [{ start_date: null }, { start_date: { lte: now } }] },
          { OR: [{ end_date: null }, { end_date: { gte: now } }] }
        ],
        Position: { code: { contains: 'KABENG', mode: 'insensitive' } }
      },
      include: { Position: { select: { name: true } } }
    });

    const bengkelName = assignment?.Position?.name?.replace(/KABENG|KEPALA BENGKEL/gi, '').trim() || 'Bengkel';

    // Sesi praktik: sesi absensi yang berjalan hari ini (proxy untuk jadwal bengkel)
    const [activeBengkel, availableTools, practiceSchedules] = await Promise.all([
      // Ruang bengkel aktif: sesi dengan status BERLANGSUNG hari ini
      prisma.sesiAbsensi.count({
        where: { ...where, tanggal: { gte: today, lte: endOfDay }, status: 'BERLANGSUNG' }
      }),
      // Alat tersedia
      prisma.sarprasAsset.count({
        where: { ...where, kondisi: { not: 'RUSAK' } }
      }),
      // Jadwal praktik hari ini (total sesi hari ini)
      prisma.sesiAbsensi.count({
        where: { ...where, tanggal: { gte: today, lte: endOfDay } }
      })
    ]);

    return {
      activeBengkel,
      availableTools,
      practiceSchedules,
      bengkelName
    };
  }

  /**
   * 🆕 Get BKK (Bursa Kerja Khusus) Stats
   * - alumniPlaced: alumni yang sudah ditempatkan/bekerja (status PKL SELESAI)
   * - activeJobs: lowongan kerja aktif (jika ada model Job/Lowongan)
   * - pendingApplications: lamaran yang pending (dari siswaPkl yang belum aktif)
   */
  async getBkkStats(tenantId: string) {
    const where = tenantId ? { tenant_id: tenantId } : {};

    const [alumniPlaced, pendingApplications, activePkl] = await Promise.all([
      // Alumni yang sudah selesai PKL = sudah tersalur
      prisma.siswaPkl.count({ where: { ...where, status: 'SELESAI' } }),
      // Yang masih pending (belum disetujui/aktif)
      prisma.siswaPkl.count({ where: { ...where, status: { in: ['PENDING', 'MENUNGGU'] } } }),
      // PKL aktif sebagai proxy "lowongan yang diisi"
      prisma.siswaPkl.count({ where: { ...where, status: 'AKTIF' } })
    ]);

    return {
      alumniPlaced,
      activeJobs: activePkl, // PKL aktif sebagai proxy lowongan terisi
      pendingApplications
    };
  }

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
