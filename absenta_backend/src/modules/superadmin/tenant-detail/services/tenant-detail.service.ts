import { cacheService } from '../../../../utils/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../../constants/cache-keys';
import { tenantDetailDb as prisma } from './repositories/tenant-detail.db';
import { getTenantDetailQuery } from './queries/get-tenant-detail.query';
import { getTenantMetricsQuery } from './queries/get-tenant-metrics.query';
import { getRecentActivitiesQuery } from './queries/get-recent-activities.query';
import { getTenantUsersQuery } from './queries/get-tenant-users.query';
import { createTenantUserCommand } from './commands/create-tenant-user.command';
import { updateTenantUserCommand } from './commands/update-tenant-user.command';
import { deleteTenantUserCommand } from './commands/delete-tenant-user.command';
import { getUserStatisticsQuery } from './queries/get-user-statistics.query';
import { getAcademicDataQuery } from './queries/get-academic-data.query';
import { exportTenantDataQuery } from './queries/export-tenant-data.query';

/**
 * Service untuk mengelola detail tenant
 * Menyediakan method untuk mengambil informasi lengkap tenant
 */
export class TenantDetailService {
  
  /**
   * Mengambil detail lengkap tenant berdasarkan ID
   * @param tenantId - ID tenant yang akan diambil detailnya
   * @returns Promise dengan data tenant lengkap
   */
  async getTenantDetail(tenantId: string) {
    return getTenantDetailQuery(tenantId);
  }

  /**
   * Mengambil metrics dashboard untuk tenant
   * @param tenantId - ID tenant
   * @returns Promise dengan data metrics
   */
  async getTenantMetrics(tenantId: string) {
    return getTenantMetricsQuery(tenantId);
  }

  /**
   * Mengambil aktivitas terbaru tenant
   * @param tenantId - ID tenant
   * @param limit - Jumlah aktivitas yang diambil (default: 10)
   * @returns Promise dengan data aktivitas terbaru
   */
  async getRecentActivities(tenantId: string, limit: number = 10) {
    return getRecentActivitiesQuery(tenantId, limit);
  }

  /**
   * Mengambil daftar user dalam tenant
   */
  async getTenantUsers(tenantId: string, page: number = 1, limit: number = 10, search?: string) {
    return getTenantUsersQuery(tenantId, page, limit, search);
  }

  /**
   * Membuat user baru dalam tenant
   */
  async createTenantUser(tenantId: string, userData: any) {
    return createTenantUserCommand(tenantId, userData);
  }

  /**
   * Mengupdate user dalam tenant
   */
  async updateTenantUser(tenantId: string, userId: string, updateData: any) {
    return updateTenantUserCommand(tenantId, userId, updateData);
  }

  /**
   * Menghapus user dari tenant
   */
  async deleteTenantUser(tenantId: string, userId: string, deletedBy: string) {
    return deleteTenantUserCommand(tenantId, userId, deletedBy);
  }

  /**
   * Mengambil statistik pengguna untuk tenant
   * @param tenantId - ID tenant
   * @returns Promise dengan statistik pengguna
   */
  async getUserStatistics(tenantId: string) {
    return getUserStatisticsQuery(tenantId);
  }

  /**
   * Mengambil data akademik tenant (jurusan, kelas, guru, siswa, mapel)
   * @param tenantId - ID tenant yang akan diambil data akademiknya
   * @returns Promise dengan data akademik lengkap
   */
  async getAcademicData(tenantId: string) {
    return getAcademicDataQuery(tenantId);
  }

  /**
   * Mengambil data attendance monitoring untuk tenant
   * @param tenantId - ID tenant
   * @param options - Opsi filter (date_from, date_to, period)
   * @returns Promise dengan data attendance
   */
  async getAttendanceData(tenantId: string, options: {
    date_from?: string;
    date_to?: string;
    period?: 'daily' | 'weekly' | 'monthly';
  } = {}) {
    const { date_from, date_to, period = 'weekly' } = options;
    const cacheKey = CACHE_KEYS.TENANT.ATTENDANCE(tenantId, period);
    
    try {
      // 📊 Cache data absensi dengan TTL pendek karena data berubah sering
      return await cacheService.getOrSet(
        cacheKey,
        async () => {
          // Set default date range
          const endDate = date_to ? new Date(date_to) : new Date();
          const startDate = date_from ? new Date(date_from) : (() => {
            const date = new Date();
            switch (period) {
              case 'daily':
                date.setDate(date.getDate() - 7); // Last 7 days
                break;
              case 'weekly':
                date.setDate(date.getDate() - 30); // Last 30 days
                break;
              case 'monthly':
                date.setMonth(date.getMonth() - 6); // Last 6 months
                break;
              default:
                date.setDate(date.getDate() - 30);
            }
            return date;
          })();

          // Get attendance statistics and data in parallel
          const [overview, sessions, analytics] = await Promise.all([
            this.getAttendanceOverview(tenantId, startDate, endDate),
            this.getRecentAttendanceSessions(tenantId, startDate, endDate),
            this.getAttendanceAnalytics(tenantId, startDate, endDate)
          ]);

          return {
            overview,
            sessions,
            analytics,
            period: {
              start: startDate.toISOString().split('T')[0],
              end: endDate.toISOString().split('T')[0],
              type: period
            }
          };
        },
        CACHE_TTL.ATTENDANCE
      );
    } catch (error) {
      console.error('Error getting attendance data:', error);
      throw new Error('Gagal mengambil data attendance');
    }
  }

  /**
   * Mengambil overview attendance untuk tenant
   */
  private async getAttendanceOverview(tenantId: string, startDate: Date, endDate: Date) {
    const [totalSessions, totalAttendanceRecords, classStats] = await Promise.all([
      // Total sessions
      prisma.sesiAbsensi.count({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startDate, lte: endDate }
        }
      }),
      
      // Total attendance records
      prisma.absenSiswa.count({
        where: {
          tenant_id: tenantId,
          created_at: { gte: startDate, lte: endDate }
        }
      }),
      
      // Class performance stats (historical, using snapshot kelas in AbsenSiswa)
      (async () => {
        const grouped = await prisma.absenSiswa.groupBy({
          by: ['kelas_id_snapshot', 'status'],
          where: { tenant_id: tenantId, created_at: { gte: startDate, lte: endDate } },
          _count: { siswa_id: true },
        });
        const kelasIds = Array.from(new Set(grouped.map(g => String(g.kelas_id_snapshot || '')).filter(Boolean)));
        const kelasInfo = await prisma.kelas.findMany({
          where: { tenant_id: tenantId, id: { in: kelasIds } },
          include: { Jurusan: { select: { nama: true } } },
        });
        return { grouped, kelasInfo };
      })()
    ]);

    // Calculate attendance rates by class
    const groupedStats = (classStats as any).grouped as Array<any>;
    const kelasInfo = (classStats as any).kelasInfo as Array<any>;
    const totalsByKelas: Record<string, { total: number; hadir: number }> = {};
    for (const g of groupedStats) {
      const kid = String(g.kelas_id_snapshot || '');
      if (!kid) continue;
      if (!totalsByKelas[kid]) totalsByKelas[kid] = { total: 0, hadir: 0 };
      const c = Number((g._count?.siswa_id) || 0);
      totalsByKelas[kid].total += c;
      if (String(g.status).toUpperCase() === 'HADIR') {
        totalsByKelas[kid].hadir += c;
      }
    }
    const infoByKelas = new Map<string, any>(kelasInfo.map(k => [String(k.id), k]));
    const classByPerformance = Object.entries(totalsByKelas).map(([kelasId, agg]) => {
      const info = infoByKelas.get(kelasId);
      const attendanceRate = agg.total > 0 ? Math.round((agg.hadir / agg.total) * 100) : 0;
      return {
        kelas_id: kelasId,
        kelas_nama: info?.nama_kelas || '',
        jurusan_nama: info?.Jurusan?.nama || '',
        attendance_rate: attendanceRate,
        total_records: agg.total,
      };
    }).sort((a, b) => b.attendance_rate - a.attendance_rate);

    const bestPerformingClass = classByPerformance[0] || null;
    const lowestPerformingClass = classByPerformance[classByPerformance.length - 1] || null;
    
    const averageAttendanceRate = classByPerformance.length > 0 ?
      Math.round(classByPerformance.reduce((sum, cls) => sum + cls.attendance_rate, 0) / classByPerformance.length) : 0;

    return {
      summary: {
        total_sessions: totalSessions,
        total_attendance_records: totalAttendanceRecords,
        average_attendance_rate: averageAttendanceRate,
        best_performing_class: bestPerformingClass ? {
          kelas_nama: bestPerformingClass.kelas_nama,
          attendance_rate: bestPerformingClass.attendance_rate
        } : null,
        lowest_performing_class: lowestPerformingClass ? {
          kelas_nama: lowestPerformingClass.kelas_nama,
          attendance_rate: lowestPerformingClass.attendance_rate
        } : null
      },
      by_class: classByPerformance
    };
  }

  /**
   * Mengambil sesi attendance terbaru
   */
  private async getRecentAttendanceSessions(tenantId: string, startDate: Date, endDate: Date) {
    const sessions = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startDate, lte: endDate }
      },
      include: {
        Kelas: {
          include: {
            Jurusan: { select: { nama: true } },
            _count: { select: { Siswa: true } }
          }
        },
        Mapel: { select: { nama_mapel: true } },
        Guru: { select: { nama_guru: true } },
        _count: {
          select: {
            AbsenSiswa: {
              where: { status: 'HADIR' }
            }
          }
        }
      },
      orderBy: { tanggal: 'desc' },
      take: 20
    });

    return sessions.map(session => {
      const totalSiswa = session.Kelas?._count?.Siswa || 0;
      const totalHadir = session._count?.AbsenSiswa || 0;
      const attendanceRate = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;

      return {
        id: session.id,
        tanggal: session.tanggal.toISOString().split('T')[0],
        waktu_mulai: session.waktu_mulai.toISOString(),
        waktu_selesai: session.waktu_selesai?.toISOString() || null,
        kelas_nama: session.Kelas?.nama_kelas || '',
        jurusan_nama: session.Kelas?.Jurusan?.nama || '',
        mapel_nama: session.Mapel?.nama_mapel || '',
        guru_nama: session.Guru?.nama_guru || '',
        jenis_kegiatan: session.jenis_kegiatan,
        status: session.status,
        total_siswa: totalSiswa,
        total_hadir: totalHadir,
        attendance_rate: attendanceRate
      };
    });
  }

  /**
   * Mengambil analytics attendance
   */
  private async getAttendanceAnalytics(tenantId: string, startDate: Date, endDate: Date) {
    // Get daily trends
    const dailyTrends = await this.getAttendanceTrends(tenantId, startDate, endDate);
    
    // Get performance by subject
    const performanceBySubject = await prisma.mapel.findMany({
      where: { tenant_id: tenantId },
      include: {
        SesiAbsensi: {
          where: {
            tanggal: { gte: startDate, lte: endDate }
          },
          include: {
            _count: {
              select: {
                AbsenSiswa: {
                  where: { status: 'HADIR' }
                }
              }
            },
            AbsenSiswa: true
          }
        }
      }
    });

    const subjectPerformance = performanceBySubject.map(mapel => {
      const totalSessions = mapel.SesiAbsensi.length;
      const totalAttendance = mapel.SesiAbsensi.reduce((sum, sesi) => 
        sum + sesi.AbsenSiswa.length, 0
      );
      const totalPresent = mapel.SesiAbsensi.reduce((sum, sesi) => 
        sum + sesi._count.AbsenSiswa, 0
      );
      
      const attendanceRate = totalAttendance > 0 ? 
        Math.round((totalPresent / totalAttendance) * 100) : 0;

      return {
        mapel_nama: mapel.nama_mapel,
        attendance_rate: attendanceRate,
        total_sessions: totalSessions
      };
    }).sort((a, b) => b.attendance_rate - a.attendance_rate);

    // Generate alerts based on performance
    const alerts = this.generateAttendanceAlerts(dailyTrends, subjectPerformance);

    return {
      trends: dailyTrends,
      performance_by_subject: subjectPerformance,
      alerts
    };
  }

  /**
   * Mengambil trends attendance berdasarkan periode
   */
  private async getAttendanceTrends(tenantId: string, startDate: Date, endDate: Date) {
    // Implementation for attendance trends based on period
    // This would involve grouping data by day/week/month
    const sessions = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: startDate, lte: endDate }
      },
      include: {
        _count: {
          select: {
            AbsenSiswa: true
          }
        },
        AbsenSiswa: {
          where: { status: 'HADIR' }
        }
      }
    });

    // Group by date and calculate daily attendance rates
    const dailyData = new Map();
    
    sessions.forEach(session => {
      const dateKey = session.tanggal.toISOString().split('T')[0];
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          date: dateKey,
          total_sessions: 0,
          total_students: 0,
          total_present: 0
        });
      }
      
      const dayData = dailyData.get(dateKey);
      dayData.total_sessions += 1;
      dayData.total_students += session._count.AbsenSiswa;
      dayData.total_present += session.AbsenSiswa.length;
    });

    return Array.from(dailyData.values()).map(day => ({
      period: day.date,
      attendance_rate: day.total_students > 0 ? 
        Math.round((day.total_present / day.total_students) * 100) : 0,
      total_sessions: day.total_sessions,
      total_students: day.total_students
    })).sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Generate alerts berdasarkan performance data
   */
  private generateAttendanceAlerts(trends: any[], subjectPerformance: any[]) {
    const alerts = [];

    // Check for low attendance trends
    const recentTrends = trends.slice(-7); // Last 7 periods
    const avgRecentAttendance = recentTrends.length > 0 ?
      recentTrends.reduce((sum, trend) => sum + trend.attendance_rate, 0) / recentTrends.length : 0;

    if (avgRecentAttendance < 70) {
      alerts.push({
        type: 'LOW_ATTENDANCE',
        message: `Tingkat kehadiran rata-rata turun menjadi ${avgRecentAttendance.toFixed(1)}% dalam 7 periode terakhir`,
        severity: avgRecentAttendance < 50 ? 'high' : 'medium',
        related_entity: 'OVERALL'
      });
    }

    // Check for subjects with low performance
    const lowPerformingSubjects = subjectPerformance.filter(subject => 
      subject.attendance_rate < 60 && subject.total_sessions > 0
    );

    lowPerformingSubjects.forEach(subject => {
      alerts.push({
        type: 'LOW_ATTENDANCE',
        message: `Mata pelajaran ${subject.mapel_nama} memiliki tingkat kehadiran rendah (${subject.attendance_rate}%)`,
        severity: subject.attendance_rate < 40 ? 'high' : 'medium',
        related_entity: subject.mapel_nama
      });
    });

    return alerts;
  }

  /**
   * Mengambil data billing untuk tenant
   * @param tenantId - ID tenant
   * @returns Promise dengan data billing lengkap
   */
  async getTenantBilling(tenantId: string) {
    const cacheKey = CACHE_KEYS.TENANT.BILLING(tenantId);
    
    try {
      // 💰 Cache data billing dengan TTL sedang
      return await cacheService.getOrSet(
        cacheKey,
        async () => {
      // Ambil data subscription aktif
      const activeSubscription = await prisma.subscription.findFirst({
        where: { 
          tenant_id: tenantId,
          status: 'ACTIVE'
        },
        include: {
          Plan: true
        },
        orderBy: { created_at: 'desc' }
      });

      // Ambil audit trail riwayat langganan dari SubscriptionHistory
      const subscriptionHistory = await prisma.subscriptionHistory.findMany({
        where: {
          Subscription: { tenant_id: tenantId }
        },
        include: {
          Subscription: {
            include: {
              Plan: true
            }
          }
        },
        orderBy: { changed_at: 'desc' }
      });

      // Ambil payment history
      const paymentHistory = await prisma.payment.findMany({
        where: { tenant_id: tenantId },
        include: {
          Billing: {
            include: {
              Subscription: {
                include: {
                  Plan: true
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 20 // Limit to last 20 payments
      });

      // Hitung billing analytics
      const totalRevenue = await prisma.payment.aggregate({
        where: { 
          tenant_id: tenantId,
          status: 'SUCCESS'
        },
        _sum: {
          amount: true
        }
      });

      const monthlyRevenue = await prisma.payment.aggregate({
        where: { 
          tenant_id: tenantId,
          status: 'SUCCESS',
          created_at: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: {
          amount: true
        }
      });

      const paymentStats = await prisma.payment.groupBy({
        by: ['status'],
        where: { tenant_id: tenantId },
        _count: {
          status: true
        }
      });

      // Hitung next billing date
      let nextBillingDate = null;
      if (activeSubscription) {
        const lastPayment = await prisma.payment.findFirst({
          where: { 
            tenant_id: tenantId,
            status: 'SUCCESS'
          },
          orderBy: { created_at: 'desc' }
        });

        if (lastPayment) {
          // Asumsi billing cycle monthly karena schema hanya ada price_monthly
          const lastPaymentDate = new Date(lastPayment.created_at);
          nextBillingDate = new Date(lastPaymentDate.setMonth(lastPaymentDate.getMonth() + 1));
        }
      }

      return {
        activeSubscription: activeSubscription ? {
          id: activeSubscription.id,
          plan: {
            id: activeSubscription.Plan.id,
            name: activeSubscription.Plan.name,
            price_monthly: activeSubscription.Plan.price_monthly,
            features_json: activeSubscription.Plan.features_json
          },
          status: activeSubscription.status,
          start_date: activeSubscription.start_date,
          end_date: activeSubscription.end_date,
          next_billing_date: nextBillingDate,
          created_at: activeSubscription.created_at
        } : null,
        subscriptionHistory: subscriptionHistory.map(h => ({
          id: h.id,
          plan_name: h.Subscription?.Plan?.name || 'Unknown Plan',
          plan: {
            name: h.Subscription?.Plan?.name || 'Unknown Plan',
            price_monthly: h.Subscription?.Plan?.price_monthly ?? null
          },
          status: h.Subscription?.status || 'UNKNOWN',
          start_date: h.Subscription?.start_date || null,
          end_date: h.Subscription?.end_date || null,
          created_at: h.changed_at,
          changed_by: h.changed_by || null,
          reason: h.reason || null,
          old_plan_id: h.old_plan_id || null,
          new_plan_id: h.new_plan_id || null
        })),
        paymentHistory: paymentHistory.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          payment_method: payment.payment_method,
          gateway_transaction_id: payment.gateway_transaction_id,
          plan_name: payment.Billing?.Subscription?.Plan?.name || 'Unknown Plan',
          created_at: payment.created_at,
          paid_at: payment.paid_at
        })),
        analytics: {
          totalRevenue: totalRevenue._sum?.amount || 0,
          monthlyRevenue: monthlyRevenue._sum?.amount || 0,
          paymentStats: paymentStats.reduce((acc, stat) => {
            acc[stat.status.toLowerCase()] = stat._count.status;
            return acc;
          }, {} as Record<string, number>),
          totalPayments: paymentHistory.length,
          averagePayment: paymentHistory.length > 0 
            ? (totalRevenue._sum?.amount || 0) / paymentHistory.length 
            : 0
        }
      };
        },
        CACHE_TTL.BILLING
      );
    } catch (error) {
      console.error('Error getting tenant billing:', error);
      throw new Error('Failed to get tenant billing data');
    }
  }

  /**
   * Mengambil activity logs tenant dengan filtering dan pagination
   * @param tenantId - ID tenant
   * @param options - Options untuk filtering dan pagination
   * @returns Promise dengan data logs yang sudah difilter dan dipaginasi
   */
  async getTenantLogs(tenantId: string, options: {
    page: number;
    limit: number;
    user_id?: string;
    action?: string;
    entity?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  }) {
    try {
      const { page, limit, user_id, action, entity, date_from, date_to, search } = options;
      
      // Build where clause untuk filtering
      const whereClause: any = {
        tenant_id: tenantId
      };

      // Filter by user
      if (user_id) {
        whereClause.user_id = user_id;
      }

      // Filter by action
      if (action) {
        whereClause.action = {
          contains: action,
          mode: 'insensitive'
        };
      }

      // Filter by entity
      if (entity) {
        whereClause.entity = {
          contains: entity,
          mode: 'insensitive'
        };
      }

      // Filter by date range
      if (date_from || date_to) {
        whereClause.created_at = {};
        if (date_from) {
          whereClause.created_at.gte = new Date(date_from);
        }
        if (date_to) {
          const endDate = new Date(date_to);
          endDate.setHours(23, 59, 59, 999); // Set to end of day
          whereClause.created_at.lte = endDate;
        }
      }

      // Search filter (OR across common fields)
      if (search) {
        const q = search;
        const orConditions = [
          { action: { contains: q, mode: 'insensitive' } },
          { entity: { contains: q, mode: 'insensitive' } },
          { metadata: { contains: q, mode: 'insensitive' } },
          { entity_id: { contains: q, mode: 'insensitive' } },
          { User: { is: { full_name: { contains: q, mode: 'insensitive' } } } },
          { User: { is: { email: { contains: q, mode: 'insensitive' } } } }
        ];
        whereClause.OR = Array.isArray(whereClause.OR)
          ? [...whereClause.OR, ...orConditions]
          : orConditions;
      }

      // Calculate offset untuk pagination
      const offset = (page - 1) * limit;

      // Get total count untuk pagination
      const totalLogs = await prisma.activityLog.count({
        where: whereClause
      });

      // Get logs dengan filtering dan pagination
      const logs = await prisma.activityLog.findMany({
        where: whereClause,
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
        skip: offset,
        take: limit
      });

      // Calculate pagination info
      const totalPages = Math.ceil(totalLogs / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      // Get summary statistics
      const [uniqueUsersCount, uniqueActionsCount, dateRange] = await Promise.all([
        // Count unique users
        prisma.activityLog.findMany({
          where: whereClause,
          select: { user_id: true },
          distinct: ['user_id']
        }).then(result => result.filter(item => item.user_id !== null).length),

        // Count unique actions
        prisma.activityLog.findMany({
          where: whereClause,
          select: { action: true },
          distinct: ['action']
        }).then(result => result.length),

        // Get date range
        prisma.activityLog.aggregate({
          where: whereClause,
          _min: { created_at: true },
          _max: { created_at: true }
        })
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total: totalLogs,
          totalPages,
          hasNext,
          hasPrev
        },
        filters: {
          user_id,
          action,
          entity,
          date_from,
          date_to,
          search
        },
        summary: {
          totalLogs,
          uniqueUsers: uniqueUsersCount,
          uniqueActions: uniqueActionsCount,
          dateRange: {
            earliest: dateRange._min?.created_at || null,
            latest: dateRange._max?.created_at || null
          }
        }
      };
    } catch (error) {
      console.error('Error getting tenant logs:', error);
      throw new Error(`Gagal mengambil activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export data tenant dalam berbagai format
   * @param tenantId - ID tenant
   * @param entities - Array entitas yang akan diekspor
   * @param format - Format export (JSON, CSV, EXCEL)
   * @param dateFrom - Tanggal mulai filter (optional)
   * @param dateTo - Tanggal akhir filter (optional)
   * @returns Promise dengan data export atau URL download
   */
  async exportTenantData(
    tenantId: string,
    entities: string[],
    format: 'JSON' | 'CSV' | 'EXCEL',
    dateFrom?: string,
    dateTo?: string
  ) {
    return exportTenantDataQuery(tenantId, entities, format, dateFrom, dateTo);
  }
}
