import { prisma } from '../../../utils/prisma';
import { ACTIVITY_LOG_ALLOWED_EVENTS } from '../../../constants/logOwnership';

export type ActivityLogEventParams = {
  event_type: string;
  tenant_id: string;
  user_id: string | null;
  entity: string;
  entity_id?: string | null;
  metadata?: Record<string, any> | null;
};

export class ActivityLogService {
  logEvent(params: ActivityLogEventParams): void {
    if (!ACTIVITY_LOG_ALLOWED_EVENTS.includes(params.event_type as any)) {
      throw new Error('Log Ownership Violation: Event not allowed in this log layer');
    }

    queueMicrotask(() => {
      prisma.activityLog.create({
        data: {
          tenant_id: params.tenant_id,
          user_id: params.user_id,
          action: params.event_type,
          entity: params.entity,
          entity_id: params.entity_id ?? null,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        },
      }).catch(err => {
        console.error('[ActivityLogService] failed to save log:', err);
      });
    });
  }

  /**
   * SSOT Progres Adopsi Platform oleh Guru, Daftar Guru Belum Pernah Login, & Guru Teraktif
   * Memisahkan aktivitas 1 Hari Ini (login & aksi hari ini) dengan Akumulasi Adopsi Platform.
   */
  async getAcademicScopedPlatformAdoption(
    tenantId: string,
    options?: { startUTC?: Date; endUTC?: Date }
  ) {
    const [activeTp, activeSem, allGurus] = await Promise.all([
      prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, tahun: true },
      }),
      prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, nama_semester: true },
      }),
      prisma.guru.findMany({
        where: { tenant_id: tenantId },
        select: {
          id: true,
          user_id: true,
          nama_guru: true,
          nip: true,
          User: {
            select: {
              id: true,
              last_login: true,
              has_completed_onboarding: true,
            },
          },
        },
        orderBy: { nama_guru: 'asc' },
      }),
    ]);

    const userIds = allGurus.map((g) => g.user_id).filter(Boolean);
    const guruIds = allGurus.map((g) => g.id);

    const [allTimeLogsGroup, todayLogsGroup, absenGuruGroup, todayAbsenGuruGroup] =
      await Promise.all([
        userIds.length > 0
          ? prisma.activityLog.groupBy({
              by: ['user_id'],
              where: { tenant_id: tenantId, user_id: { in: userIds } },
              _count: { id: true },
              _max: { created_at: true },
            })
          : Promise.resolve([]),
        userIds.length > 0 && options?.startUTC && options?.endUTC
          ? prisma.activityLog.groupBy({
              by: ['user_id'],
              where: {
                tenant_id: tenantId,
                user_id: { in: userIds },
                created_at: { gte: options.startUTC, lte: options.endUTC },
              },
              _count: { id: true },
            })
          : Promise.resolve([]),
        guruIds.length > 0
          ? prisma.absenGuru.groupBy({
              by: ['guru_id'],
              where: {
                tenant_id: tenantId,
                guru_id: { in: guruIds },
                ...(activeTp ? { tahun_pelajaran_id: activeTp.id } : {}),
                ...(activeSem ? { semester_id: activeSem.id } : {}),
              },
              _count: { id: true },
            })
          : Promise.resolve([]),
        guruIds.length > 0 && options?.startUTC && options?.endUTC
          ? prisma.absenGuru.groupBy({
              by: ['guru_id'],
              where: {
                tenant_id: tenantId,
                guru_id: { in: guruIds },
                created_at: { gte: options.startUTC, lte: options.endUTC },
              },
              _count: { id: true },
            })
          : Promise.resolve([]),
      ]);

    const allLogMap = new Map<string, { count: number; lastAt: Date | null }>();
    allTimeLogsGroup.forEach((l) => {
      if (l.user_id) {
        allLogMap.set(l.user_id, { count: l._count.id, lastAt: l._max.created_at });
      }
    });

    const todayLogMap = new Map<string, number>();
    todayLogsGroup.forEach((l) => {
      if (l.user_id) todayLogMap.set(l.user_id, l._count.id);
    });

    const absenMap = new Map<string, number>();
    absenGuruGroup.forEach((a) => absenMap.set(a.guru_id, a._count.id));

    const todayAbsenMap = new Map<string, number>();
    todayAbsenGuruGroup.forEach((a) => todayAbsenMap.set(a.guru_id, a._count.id));

    let guruSudahMasuk = 0;
    let guruAktifHariIni = 0;
    const belumPernahMasukList: Array<{ nama: string; nip: string }> = [];
    const activeTodayCandidates: Array<{ nama: string; nip: string; score: number; detail: string }> = [];

    for (const g of allGurus) {
      const logInfo = allLogMap.get(g.user_id);
      const totalLogs = logInfo?.count || 0;
      const totalAbsen = absenMap.get(g.id) || 0;
      const lastLogin = g.User?.last_login || logInfo?.lastAt || null;
      const hasEverEntered =
        Boolean(lastLogin) ||
        Boolean(g.User?.has_completed_onboarding) ||
        totalLogs > 0 ||
        totalAbsen > 0;

      if (hasEverEntered) {
        guruSudahMasuk++;
      } else {
        belumPernahMasukList.push({
          nama: g.nama_guru,
          nip: g.nip || '-',
        });
      }

      const todayLogs = todayLogMap.get(g.user_id) || 0;
      const todayAbsen = todayAbsenMap.get(g.id) || 0;
      const loginToday =
        Boolean(
          options?.startUTC &&
            options?.endUTC &&
            lastLogin &&
            lastLogin >= options.startUTC &&
            lastLogin <= options.endUTC
        );

      if (todayLogs > 0 || todayAbsen > 0 || loginToday) {
        guruAktifHariIni++;
        activeTodayCandidates.push({
          nama: g.nama_guru,
          nip: g.nip || '-',
          score: todayLogs + todayAbsen * 2,
          detail: `${todayLogs} Aktivitas Sistem • ${todayAbsen} Sesi KBM Hari Ini`,
        });
      }
    }

    activeTodayCandidates.sort((a, b) => b.score - a.score);

    const totalGuru = allGurus.length;
    const guruBelumPernahMasuk = belumPernahMasukList.length;
    const progresAdopsiPct =
      totalGuru > 0 ? Math.round((guruSudahMasuk / totalGuru) * 100) : 0;
    const progresAktifHariIniPct =
      totalGuru > 0 ? Math.round((guruAktifHariIni / totalGuru) * 100) : 0;

    return {
      academicContext: activeTp
        ? `${activeTp.tahun}${activeSem ? ` (${activeSem.nama_semester})` : ''}`
        : 'Konteks Aktif',
      totalGuru,
      guruSudahMasuk,
      guruBelumPernahMasuk,
      progresAdopsiPct,
      guruAktifHariIni,
      progresAktifHariIniPct,
      topActiveToday: activeTodayCandidates.slice(0, 5),
      belumPernahMasukItems: belumPernahMasukList.slice(0, 8),
    };
  }
}

export const activityLogService = new ActivityLogService();
