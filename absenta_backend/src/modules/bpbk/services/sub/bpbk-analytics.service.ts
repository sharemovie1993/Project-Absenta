// @ts-nocheck
import { PLATFORM_TIMEZONE } from '@/infra/jobEngine';
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../utils/prisma';
import { parentNotificationService } from '../../../parent-app/services/parent-notification.service';
import { ParentEventType } from '../../../parent-app/constants/parent-event-matrix';
import { activityLogService } from '../../../activity/services/activity-log.service';
import { SuratKeluarService } from '../../../correspondence/services/surat-keluar.service';
import { systemConfigService } from '../../../system-config/services/system-config.service';
import { randomBytes } from 'crypto';
import { cacheService } from '../../../../utils/cache.service';
import { getSmartFrontendBaseUrl } from '../../../../utils/url-helper';
import { cacheInvalidationService } from '../../../../utils/cache-invalidation.service';
import { BpbkCommonHelper } from './bpbk-common.helper';
import { BpbkPemanggilanService } from './bpbk-pemanggilan.service';
import { BpbkKasusService } from './bpbk-kasus.service';
import { BpbkKonselingService } from './bpbk-konseling.service';
import { BpbkHomeVisitService } from './bpbk-homevisit.service';
import { BpbkAsesmenService } from './bpbk-asesmen.service';
import { BpbkAnalyticsService } from './bpbk-analytics.service';

export class BpbkAnalyticsService {
  static async getDashboardStats(tenantId: string) {
    const tz = await getTenantTimezone(tenantId) || PLATFORM_TIMEZONE;
    appLogger.info({ tenantId, tz }, 'BPBK stats fetched');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      activeCounselingCount,
      pendingCallsCount,
      monthHomeVisitsCount,
      recentViolations,
      recentCounselings
    ] = await Promise.all([
      // 1. Active Counseling
      prisma.konselingSiswa.count({
        where: { tenant_id: tenantId, status: 'PROSES' }
      }),
      // 2. Pending Summons
      prisma.pemanggilanOrangTua.count({
        where: { tenant_id: tenantId, status: { in: ['BARU', 'DIKIRIM'] } }
      }),
      // 3. Month Home Visits
      prisma.homeVisit.count({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startOfMonth }
        }
      }),
      // 4. Recent Violations (top 5)
      prisma.pelanggaranSiswa.findMany({
        where: { tenant_id: tenantId },
        take: 5,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: { nama_siswa: true, Kelas: { select: { nama_kelas: true } } }
          }
        }
      }),
      // 5. Recent Counselings (top 5)
      prisma.konselingSiswa.findMany({
        where: { tenant_id: tenantId },
        take: 5,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: { nama_siswa: true, Kelas: { select: { nama_kelas: true } } }
          }
        }
      })
    ]);

    // Composite Risk Score
    const ewsList = await this.calculateEwsForSiswa(tenantId);
    const criticalStudents = ewsList
      .map(e => ({
        id: e.siswa.id,
        nama_siswa: e.siswa.nama_siswa,
        nis: e.siswa.nis,
        kelas: e.siswa.Kelas?.nama_kelas || 'Tanpa Kelas',
        violations: e.violations,
        achievements: e.achievements,
        riskScore: e.riskScore,
        riskLevel: e.riskLevel,
        alpaCount: e.alpaCount
      }))
      .filter(s => s.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    return {
      activeCounselingCount,
      pendingCallsCount,
      monthHomeVisitsCount,
      recentViolations,
      recentCounselings,
      criticalStudents
    };
  }

  // === EWS Calculation Helper ===
  static readonly DEFAULT_EWS_WEIGHTS = {
    weight_violation: 1.5,
    weight_alpa: 12.0,
    weight_case_high: 25.0,
    weight_case_medium: 10.0,
    weight_case_low: 5.0,
    weight_achievement: 0.5,
  };

  static async getEwsWeights(tenantId: string) {
    const config = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'bpbk_ews_weights' }
    });
    if (config?.value) {
      try {
        const parsed = JSON.parse(config.value);
        return {
          weight_violation: typeof parsed.weight_violation === 'number' ? parsed.weight_violation : this.DEFAULT_EWS_WEIGHTS.weight_violation,
          weight_alpa: typeof parsed.weight_alpa === 'number' ? parsed.weight_alpa : this.DEFAULT_EWS_WEIGHTS.weight_alpa,
          weight_case_high: typeof parsed.weight_case_high === 'number' ? parsed.weight_case_high : this.DEFAULT_EWS_WEIGHTS.weight_case_high,
          weight_case_medium: typeof parsed.weight_case_medium === 'number' ? parsed.weight_case_medium : this.DEFAULT_EWS_WEIGHTS.weight_case_medium,
          weight_case_low: typeof parsed.weight_case_low === 'number' ? parsed.weight_case_low : this.DEFAULT_EWS_WEIGHTS.weight_case_low,
          weight_achievement: typeof parsed.weight_achievement === 'number' ? parsed.weight_achievement : this.DEFAULT_EWS_WEIGHTS.weight_achievement,
        };
      } catch {
        return this.DEFAULT_EWS_WEIGHTS;
      }
    }
    return this.DEFAULT_EWS_WEIGHTS;
  }

  static async updateEwsWeights(tenantId: string, weights: any) {
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'bpbk_ews_weights' }
    });
    const serialized = JSON.stringify(weights);
    let result;
    if (existing) {
      result = await prisma.config.update({
        where: { id: existing.id },
        data: { value: serialized }
      });
    } else {
      result = await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: 'bpbk_ews_weights',
          value: serialized,
          description: 'Custom bobot perhitungan skor EWS BPBK'
        }
      });
    }
    await cacheInvalidationService.invalidateBpbkCache(tenantId);
    return result;
  }

  static async getCalendarEvents(tenantId: string, query: { start?: string; end?: string }) {
    const whereSummons: any = { tenant_id: tenantId, deleted_at: null };
    const whereHomeVisits: any = { tenant_id: tenantId, deleted_at: null };

    if (query.start) {
      const startDate = new Date(query.start);
      whereSummons.tanggal_pemanggilan = { gte: startDate };
      whereHomeVisits.tanggal = { gte: startDate };
    }
    if (query.end) {
      const endDate = new Date(query.end);
      if (!whereSummons.tanggal_pemanggilan) whereSummons.tanggal_pemanggilan = {};
      if (!whereHomeVisits.tanggal) whereHomeVisits.tanggal = {};
      whereSummons.tanggal_pemanggilan.lte = endDate;
      whereHomeVisits.tanggal.lte = endDate;
    }

    const [summons, homeVisits] = await Promise.all([
      prisma.pemanggilanOrangTua.findMany({
        where: whereSummons,
        include: {
          Siswa: {
            select: { id: true, nama_siswa: true, nis: true }
          }
        },
        orderBy: { tanggal_pemanggilan: 'asc' }
      }),
      prisma.homeVisit.findMany({
        where: whereHomeVisits,
        include: {
          Siswa: {
            select: { id: true, nama_siswa: true, nis: true }
          }
        },
        orderBy: { tanggal: 'asc' }
      })
    ]);

    const events: Array<any> = [];

    summons.forEach(s => {
      events.push({
        id: s.id,
        type: 'SUMMONS',
        title: `Pemanggilan: ${s.Siswa?.nama_siswa || 'Siswa'}`,
        start: s.tanggal_pemanggilan.toISOString().split('T')[0],
        end: s.tanggal_pemanggilan.toISOString().split('T')[0],
        description: s.alasan,
        status: s.status,
        metadata: {
          waktu: s.waktu_pertemuan || null,
          tempat: s.tempat_pertemuan || null
        }
      });
    });

    homeVisits.forEach(hv => {
      events.push({
        id: hv.id,
        type: 'HOMEVISIT',
        title: `Home Visit: ${hv.Siswa?.nama_siswa || 'Siswa'}`,
        start: hv.tanggal.toISOString().split('T')[0],
        end: hv.tanggal.toISOString().split('T')[0],
        description: hv.alasan,
        status: 'SELESAI'
      });
    });

    return events;
  }

  static async calculateEwsForSiswa(tenantId: string) {
    const weights = await this.getEwsWeights(tenantId);

    const siswaList = await prisma.siswa.findMany({
      where: { tenant_id: tenantId, status: 'AKTIF' },
      include: {
        PelanggaranSiswa: true,
        PrestasiSiswa: true,
        Kelas: {
          include: {
            Jurusan: true
          }
        }
      }
    });

    const activeCases = await prisma.kasusBK.findMany({
      where: {
        tenant_id: tenantId,
        status: { in: ['TERBUKA', 'PROSES', 'RUJUKAN'] },
        deleted_at: null
      }
    });

    const highPriorityMap = new Map<string, number>();
    const mediumPriorityMap = new Map<string, number>();
    const lowPriorityMap = new Map<string, number>();

    activeCases.forEach(c => {
      const sId = c.siswa_id;
      if (c.prioritas === 'TINGGI') {
        highPriorityMap.set(sId, (highPriorityMap.get(sId) || 0) + 1);
      } else if (c.prioritas === 'SEDANG') {
        mediumPriorityMap.set(sId, (mediumPriorityMap.get(sId) || 0) + 1);
      } else if (c.prioritas === 'RENDAH') {
        lowPriorityMap.set(sId, (lowPriorityMap.get(sId) || 0) + 1);
      }
    });

    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);

    const alpaAttendance = await prisma.absenSiswa.findMany({
      where: {
        tenant_id: tenantId,
        status: 'ALPA',
        created_at: { gte: date30DaysAgo },
        Siswa: { status: 'AKTIF' }
      },
      select: { siswa_id: true }
    });

    const alpaMap = new Map<string, number>();
    alpaAttendance.forEach(a => {
      if (a.siswa_id) {
        alpaMap.set(a.siswa_id, (alpaMap.get(a.siswa_id) || 0) + 1);
      }
    });

    // Fetch EWS snapshots of active students for AI trend calculation
    const snapshots = await prisma.ewsSnapshot.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: { in: siswaList.map(s => s.id) }
      },
      orderBy: { snapshot_date: 'desc' }
    });

    const snapshotMap = new Map<string, any[]>();
    snapshots.forEach(snap => {
      const arr = snapshotMap.get(snap.siswa_id) || [];
      arr.push(snap);
      snapshotMap.set(snap.siswa_id, arr);
    });

    return siswaList.map(s => {
      const totalViolations = s.PelanggaranSiswa.reduce((sum: number, p: any) => sum + p.poin, 0);
      const totalAchievements = s.PrestasiSiswa.reduce((sum: number, p: any) => sum + p.poin, 0);
      const alpaCount = alpaMap.get(s.id) || 0;
      const highPriority = highPriorityMap.get(s.id) || 0;
      const mediumPriority = mediumPriorityMap.get(s.id) || 0;
      const lowPriority = lowPriorityMap.get(s.id) || 0;

      let riskScore = (totalViolations * weights.weight_violation) 
                      + (alpaCount * weights.weight_alpa) 
                      + (highPriority * weights.weight_case_high) 
                      + (mediumPriority * weights.weight_case_medium) 
                      + (lowPriority * weights.weight_case_low) 
                      - (totalAchievements * weights.weight_achievement);
      riskScore = Math.max(0, Math.round(riskScore));

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (riskScore >= 70) {
        riskLevel = 'HIGH';
      } else if (riskScore >= 30) {
        riskLevel = 'MEDIUM';
      }

      // Pola Kasus AI Sederhana
      const detectedPatterns: string[] = [];
      const sSnaps = snapshotMap.get(s.id) || [];
      
      let trendSlope = 0;
      if (sSnaps.length >= 2) {
        const recent = sSnaps[0];
        const oldest = sSnaps[sSnaps.length - 1];
        const scoreDiff = (recent.risk_score || 0) - (oldest.risk_score || 0);
        const daysDiff = Math.max(1, Math.round((recent.snapshot_date.getTime() - oldest.snapshot_date.getTime()) / (1000 * 3600 * 24)));
        trendSlope = (scoreDiff / daysDiff) * 7; // points per week
      }

      // 1. RISK_TREND_EXPONENTIAL_INCREASE
      if (trendSlope >= 15) {
        detectedPatterns.push('RISK_TREND_EXPONENTIAL_INCREASE');
      }

      // 2. PATTERN_WITHDRAWAL (Active cases + Alpa > 3 days in last 30 days)
      if ((highPriority + mediumPriority) > 0 && alpaCount > 3) {
        detectedPatterns.push('PATTERN_WITHDRAWAL');
      }

      // 3. PATTERN_AGGRESSIVE (Violations increased > 20 points in last 15 days)
      const date15DaysAgo = new Date();
      date15DaysAgo.setDate(date15DaysAgo.getDate() - 15);
      const recentViolationsScore = s.PelanggaranSiswa
        .filter((p: any) => new Date(p.tanggal || p.created_at) >= date15DaysAgo)
        .reduce((sum: number, p: any) => sum + p.poin, 0);
      if (recentViolationsScore >= 20) {
        detectedPatterns.push('PATTERN_AGGRESSIVE');
      }

      // 4. PATTERN_DISRUPTIVE (Total violations > 3 and Alpa > 5)
      if (s.PelanggaranSiswa.length > 3 && alpaCount > 5) {
        detectedPatterns.push('PATTERN_DISRUPTIVE');
      }

      return {
        siswa: s as any,
        violations: totalViolations,
        achievements: totalAchievements,
        riskScore,
        riskLevel,
        alpaCount,
        activeCasesCount: highPriority + mediumPriority + lowPriority,
        detectedPatterns
      };
    });
  }

  // === Reporting and Analytics ===
  static async getReportsData(tenantId: string) {
    const cases = await prisma.kasusBK.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
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
    });

    const activeCases = cases.filter(c => ['TERBUKA', 'PROSES', 'RUJUKAN'].includes(c.status));
    const completedCases = cases.filter(c => c.status === 'SELESAI');
    const reopenedCases = cases.filter(c => c.reopen_count > 0);

    const kategoriMap: Record<string, number> = {
      KEDISIPLINAN: 0,
      AKADEMIS: 0,
      PRIBADI: 0,
      SOSIAL: 0
    };
    cases.forEach(c => {
      if (kategoriMap[c.kategori] !== undefined) {
        kategoriMap[c.kategori]++;
      }
    });

    const ewsList = await this.calculateEwsForSiswa(tenantId);
    const riskDistribution = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    ewsList.forEach(e => {
      riskDistribution[e.riskLevel]++;
    });

    const topRiskStudents = ewsList
      .map(e => ({
        id: e.siswa.id,
        nama_siswa: e.siswa.nama_siswa,
        nis: e.siswa.nis,
        kelas: e.siswa.Kelas?.nama_kelas || 'Tanpa Kelas',
        riskScore: e.riskScore,
        riskLevel: e.riskLevel
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);

    const jurusans = await prisma.jurusan.findMany({
      where: { tenant_id: tenantId }
    });

    const statistikJurusan = jurusans.map(j => {
      const studentsInJurusan = ewsList.filter(e => e.siswa.Kelas?.jurusan_id === j.id);
      const totalStudents = studentsInJurusan.length;
      
      const jumlahKasus = cases.filter(c => c.Siswa?.Kelas?.jurusan_id === j.id).length;
      const jumlahPelanggaran = studentsInJurusan.reduce((sum, e) => sum + e.violations, 0);
      const totalRiskScore = studentsInJurusan.reduce((sum, e) => sum + e.riskScore, 0);
      const averageRiskScore = totalStudents > 0 ? Number((totalRiskScore / totalStudents).toFixed(1)) : 0;

      return {
        id: j.id,
        jurusan: j.kode,
        nama_jurusan: j.nama,
        jumlahKasus,
        jumlahPelanggaran,
        averageRiskScore
      };
    });

    const kelasList = await prisma.kelas.findMany({
      where: { tenant_id: tenantId }
    });

    const statistikKelas = kelasList.map(k => {
      const studentsInKelas = ewsList.filter(e => e.siswa.kelas_id === k.id);
      const totalStudents = studentsInKelas.length;

      const jumlahKasus = cases.filter(c => c.Siswa?.kelas_id === k.id).length;
      const jumlahPelanggaran = studentsInKelas.reduce((sum, e) => sum + e.violations, 0);
      const totalRiskScore = studentsInKelas.reduce((sum, e) => sum + e.riskScore, 0);
      const averageRiskScore = totalStudents > 0 ? Number((totalRiskScore / totalStudents).toFixed(1)) : 0;

      return {
        id: k.id,
        kelas: k.nama_kelas,
        jumlahKasus,
        jumlahPelanggaran,
        averageRiskScore
      };
    }).sort((a, b) => b.averageRiskScore - a.averageRiskScore);

    const kelasBerisiko = [...statistikKelas].slice(0, 5);
    const kelasTerbaik = [...statistikKelas].reverse().slice(0, 5);

    const totalOpened = cases.length;
    const totalCompleted = completedCases.length;
    const completionRate = totalOpened > 0 ? Number(((totalCompleted / totalOpened) * 100).toFixed(1)) : 0;

    let totalResolutionTimeMs = 0;
    let resolvedWithTimeCount = 0;
    completedCases.forEach(c => {
      if (c.closed_at) {
        const openedTime = new Date(c.tanggal_kasus).getTime();
        const closedTime = new Date(c.closed_at).getTime();
        if (closedTime >= openedTime) {
          totalResolutionTimeMs += (closedTime - openedTime);
          resolvedWithTimeCount++;
        }
      }
    });

    const meanResolutionTimeDays = resolvedWithTimeCount > 0 
      ? Number((totalResolutionTimeMs / (1000 * 60 * 60 * 24) / resolvedWithTimeCount).toFixed(1))
      : 0;

    const reopenLogs = await prisma.activityLog.findMany({
      where: {
        tenant_id: tenantId,
        action: 'CASE_REOPEN'
      },
      include: {
        User: {
          include: {
            Guru: true
          }
        }
      }
    });

    const reopenPerGuruMap = new Map<string, number>();
    reopenLogs.forEach(log => {
      const name = log.User?.Guru?.nama_guru || log.User?.full_name || 'System/Lainnya';
      reopenPerGuruMap.set(name, (reopenPerGuruMap.get(name) || 0) + 1);
    });
    const reopenPerGuru = Array.from(reopenPerGuruMap.entries()).map(([name, count]) => ({ name, count }));

    const reopenedCasesDetailed = cases.filter(c => c.reopen_count > 0);
    const reopenPerJurusanMap = new Map<string, number>();
    reopenedCasesDetailed.forEach(c => {
      const jKode = c.Siswa?.Kelas?.Jurusan?.kode || 'Lainnya';
      reopenPerJurusanMap.set(jKode, (reopenPerJurusanMap.get(jKode) || 0) + c.reopen_count);
    });
    const reopenPerJurusan = Array.from(reopenPerJurusanMap.entries()).map(([name, count]) => ({ name, count }));

    const reopenPerKategoriMap = new Map<string, number>();
    reopenedCasesDetailed.forEach(c => {
      reopenPerKategoriMap.set(c.kategori, (reopenPerKategoriMap.get(c.kategori) || 0) + c.reopen_count);
    });
    const reopenPerKategori = Array.from(reopenPerKategoriMap.entries()).map(([name, count]) => ({ name, count }));

    return {
      statistikKasus: {
        active: activeCases.length,
        completed: completedCases.length,
        reopened: reopenedCases.length,
        kategori: kategoriMap
      },
      statistikRisiko: {
        distribution: riskDistribution,
        topRiskStudents
      },
      statistikJurusan,
      statistikKelas: {
        all: statistikKelas,
        best: kelasTerbaik,
        atRisk: kelasBerisiko
      },
      statistikPenyelesaian: {
        totalOpened,
        totalCompleted,
        completionRate,
        meanResolutionTimeDays
      },
      statistikReopen: {
        totalReopened: reopenedCases.reduce((sum, c) => sum + c.reopen_count, 0),
        perGuru: reopenPerGuru,
        perJurusan: reopenPerJurusan,
        perKategori: reopenPerKategori
      }
    };
  }

  static async getStudentRiskTrend(tenantId: string, siswaId: string) {
    await this.verifyOwner('siswa', siswaId, tenantId);

    const snapshots = await prisma.ewsSnapshot.findMany({
      where: { tenant_id: tenantId, siswa_id: siswaId },
      orderBy: { snapshot_date: 'asc' }
    });

    const [violations, achievements, counselings, visits, summons, cases] = await Promise.all([
      prisma.pelanggaranSiswa.findMany({
        where: { tenant_id: tenantId, siswa_id: siswaId },
        orderBy: { tanggal: 'asc' }
      }),
      prisma.prestasiSiswa.findMany({
        where: { tenant_id: tenantId, siswa_id: siswaId },
        orderBy: { tanggal: 'asc' }
      }),
      prisma.konselingSiswa.findMany({
        where: { tenant_id: tenantId, siswa_id: siswaId, deleted_at: null },
        orderBy: { tanggal: 'asc' }
      }),
      prisma.homeVisit.findMany({
        where: { tenant_id: tenantId, siswa_id: siswaId, deleted_at: null },
        orderBy: { tanggal: 'asc' }
      }),
      prisma.pemanggilanOrangTua.findMany({
        where: { tenant_id: tenantId, siswa_id: siswaId, deleted_at: null },
        orderBy: { tanggal_pemanggilan: 'asc' }
      }),
      prisma.kasusBK.findMany({
        where: { tenant_id: tenantId, siswa_id: siswaId, deleted_at: null },
        orderBy: { tanggal_kasus: 'asc' }
      })
    ]);

    const events: Array<{ date: string; type: string; title: string; description: string }> = [];

    violations.forEach(v => {
      events.push({
        date: v.tanggal.toISOString().split('T')[0],
        type: 'VIOLATION',
        title: `Pelanggaran: ${v.jenis_pelanggaran || 'Pelanggaran'}`,
        description: `Poin pelanggaran tercatat: +${v.poin}`
      });
    });

    achievements.forEach(a => {
      events.push({
        date: a.tanggal.toISOString().split('T')[0],
        type: 'ACHIEVEMENT',
        title: `Prestasi: ${a.nama_prestasi}`,
        description: `Poin penghargaan tercatat: -${a.poin}`
      });
    });

    counselings.forEach(c => {
      events.push({
        date: c.tanggal.toISOString().split('T')[0],
        type: 'COUNSELING',
        title: `Konseling ${c.tipe === 'INDIVIDU' ? 'Individu' : 'Kelompok'}`,
        description: `Status: ${c.status}. Masalah: ${c.masalah.slice(0, 60)}...`
      });
    });

    visits.forEach(v => {
      events.push({
        date: v.tanggal.toISOString().split('T')[0],
        type: 'HOMEVISIT',
        title: `Home Visit`,
        description: `Alasan: ${v.alasan.slice(0, 60)}...`
      });
    });

    summons.forEach(s => {
      events.push({
        date: s.tanggal_pemanggilan.toISOString().split('T')[0],
        type: 'SUMMONS',
        title: `Pemanggilan Orang Tua`,
        description: `Alasan: ${s.alasan.slice(0, 60)}... Status: ${s.status}`
      });
    });

    cases.forEach(c => {
      events.push({
        date: c.tanggal_kasus.toISOString().split('T')[0],
        type: 'CASE_OPEN',
        title: `Kasus Baru Dibuka: ${c.judul}`,
        description: `Kategori: ${c.kategori}, Prioritas: ${c.prioritas}`
      });
      if (c.closed_at) {
        events.push({
          date: c.closed_at.toISOString().split('T')[0],
          type: 'CASE_CLOSE',
          title: `Kasus Selesai: ${c.judul}`,
          description: `Catatan: ${c.catatan_selesai || '-'}`
        });
      }
    });

    events.sort((a, b) => a.date.localeCompare(b.date));

    return {
      snapshots: snapshots.map(s => ({
        id: s.id,
        risk_score: s.risk_score,
        risk_level: s.risk_level,
        violations_score: s.violations_score,
        achievement_score: s.achievement_score,
        alpa_count: s.alpa_count,
        active_cases: s.active_cases,
        date: s.snapshot_date.toISOString().split('T')[0]
      })),
      events
    };
  }

  static async getWaliKelasDashboardData(tenantId: string, userId: string) {
    const classIds = await this.getWaliKelasClassIds(tenantId, userId);
    if (classIds.length === 0) {
      return {
        kelas: 'Belum Ditugaskan',
        activeCasesCount: 0,
        pendingSummonsCount: 0,
        siswaKritis: [],
        cases: [],
        summons: [],
        trend: []
      };
    }

    // Ambil nama-nama kelas binaan
    const classes = await prisma.kelas.findMany({
      where: { id: { in: classIds }, tenant_id: tenantId },
      select: { nama_kelas: true }
    });
    const className = classes.map(c => c.nama_kelas).join(', ');

    const allEws = await this.calculateEwsForSiswa(tenantId);
    const classEws = allEws.filter(e => classIds.includes(e.siswa.kelas_id));
    const classSiswaIds = classEws.map(e => e.siswa.id);

    const siswaKritis = classEws
      .map(e => ({
        id: e.siswa.id,
        nama_siswa: e.siswa.nama_siswa,
        nis: e.siswa.nis,
        riskScore: e.riskScore,
        riskLevel: e.riskLevel,
        violations: e.violations,
        achievements: e.achievements,
        alpaCount: e.alpaCount
      }))
      .filter(s => s.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore);

    const cases = await prisma.kasusBK.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: { in: classSiswaIds },
        status: { in: ['TERBUKA', 'PROSES', 'RUJUKAN'] },
        deleted_at: null
      },
      include: {
        Siswa: {
          select: { nama_siswa: true, nis: true, Kelas: { select: { nama_kelas: true } } }
        }
      }
    });

    const summons = await prisma.pemanggilanOrangTua.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: { in: classSiswaIds },
        status: { in: ['BARU', 'DIKIRIM'] },
        deleted_at: null
      },
      include: {
        Siswa: {
          select: { nama_siswa: true, nis: true, Kelas: { select: { nama_kelas: true } } }
        }
      }
    });

    // Terapkan filter visibilitas: SENSITIVE tidak boleh dilihat wali kelas
    const allowedCases = cases.filter(c => c.visibility !== 'SENSITIVE').map(c => ({
      id: c.id,
      judul: c.judul,
      kategori: c.kategori,
      prioritas: c.prioritas,
      status: c.status,
      tanggal_kasus: c.tanggal_kasus,
      nama_siswa: c.Siswa?.nama_siswa || '-'
    }));

    const allowedSummons = summons.filter(s => s.visibility !== 'SENSITIVE').map(s => ({
      id: s.id,
      tanggal_pemanggilan: s.tanggal_pemanggilan,
      alasan: s.alasan,
      status: s.status,
      nama_siswa: s.Siswa?.nama_siswa || '-'
    }));

    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);

    const snapshots = await prisma.ewsSnapshot.findMany({
      where: {
        tenant_id: tenantId,
        siswa_id: { in: classSiswaIds },
        snapshot_date: { gte: date30DaysAgo }
      },
      orderBy: { snapshot_date: 'asc' }
    });

    const trendMap = new Map<string, { date: string; sumScore: number; count: number }>();
    snapshots.forEach(s => {
      const dateStr = s.snapshot_date.toISOString().split('T')[0];
      const existing = trendMap.get(dateStr) || { date: dateStr, sumScore: 0, count: 0 };
      existing.sumScore += s.risk_score;
      existing.count += 1;
      trendMap.set(dateStr, existing);
    });

    const trend = Array.from(trendMap.values()).map(t => ({
      date: t.date,
      average_risk_score: Number((t.sumScore / t.count).toFixed(1))
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      kelas: className,
      activeCasesCount: allowedCases.length,
      pendingSummonsCount: allowedSummons.length,
      siswaKritis,
      cases: allowedCases,
      summons: allowedSummons,
      trend
    };
  }

  static async getAuditLogsData(tenantId: string, query: { page?: string | number; limit?: string | number; search?: string }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      tenant_id: tenantId,
      entity: {
        in: ['KasusBK', 'KonselingSiswa', 'PemanggilanOrangTua', 'HomeVisit', 'AsesmenSiswa', 'RujukanKasus']
      }
    };

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { entity: { contains: query.search, mode: 'insensitive' } },
        { User: { full_name: { contains: query.search, mode: 'insensitive' } } }
      ];
    }

    const [total, list] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              full_name: true,
              email: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: limit
      })
    ]);

    return {
      list,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // === Helper Owner Verification ===
}
