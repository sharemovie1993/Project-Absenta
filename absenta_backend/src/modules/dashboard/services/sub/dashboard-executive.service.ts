// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { AbsensiMode } from '@/constants/enums';
import { formatTenantTime, getTenantTimezone, getTenantOffsetString, getTenantDayRange } from '@/utils/timezone.utils';
import { sesiLifecycleService, SesiLifecycleService } from '@/modules/attendance/sesi-absensi/services/sesi-lifecycle.service';
import { CACHE_KEYS, CACHE_TTL } from '@/constants/cache-keys';
import { cacheService } from '@/utils/cache.service';
import { applyDataScope } from '@/utils/applyDataScope';
import { DashboardCommonHelper } from './dashboard-common.helper';

export class DashboardExecutiveService {
  private helper = new DashboardCommonHelper();
  private resolveDayRange(...args: any[]) { return this.helper.resolveDayRange(...args); }

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

        const activeClasses = sessionList.filter((s: any) => s.status === 'BERLANGSUNG').length;

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

        // 3. Consolidated SSOT Session Stats for Monitoring Page
        const sessionStats = SesiLifecycleService.aggregateSessionStats(sessionList);

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
}
