import { DashboardService } from '../services/dashboard.service';
import { isSystemSuperAdmin } from '@/utils/rbac';

interface AuthenticatedRequest {
  user: {
    id: string;
    userId: string;
    tenantId: string | null;
    role: string;
  };
  tenantId: string | null;
  dataScope?: any;
  params: any;
  query: any;
}

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  /**
   * 1️⃣ Dashboard Overview
   * GET /dashboard/overview
   */
  async getOverview(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { tanggal } = request.query as { tanggal?: string };
      const scope = (request as any).dataScope;

      const data = await this.dashboardService.getOverview(tenantId, tanggal, scope);

      return reply.status(200).send({
        success: true,
        message: 'Dashboard overview',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil data overview dashboard',
        error: error.message
      });
    }
  }

  /**
   * 🆕 Get Guru Attendance Status
   */
  async getGuruAttendance(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      // Fix: Use correct user ID field from JWT payload (id)
      const userId = (request.user as any).id || (request.user as any).userId;

      const data = await this.dashboardService.getGuruAttendance(tenantId, userId);

      return reply.status(200).send({
        success: true,
        message: 'Guru attendance status',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil status kehadiran guru',
        error: error.message
      });
    }
  }

  /**
   * 🆕 Get Violation Stats
   */
  async getViolationStats(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const scope = (request as any).dataScope;
      const data = await this.dashboardService.getViolationStats(tenantId, scope);

      return reply.status(200).send({
        success: true,
        message: 'Violation stats',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil data pelanggaran',
        error: error.message
      });
    }
  }

  /**
   * 🆕 Get Supervision Schedule
   */
  async getSupervisionSchedule(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const data = await this.dashboardService.getSupervisionSchedule(tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Supervision schedule',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil jadwal supervisi',
        error: error.message
      });
    }
  }

  async getKepsekEscalations(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { limit } = request.query as { limit?: number | string };
      const data = await this.dashboardService.getKepsekEscalations(tenantId, Number(limit) || 10);

      return reply.status(200).send({
        success: true,
        message: 'Kepsek escalations',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil data eskalasi',
        error: error.message
      });
    }
  }

  /**
   * 🆕 Get Kurikulum Global Monitoring
   */
  async getKurikulumMonitoringGlobal(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { tanggal } = request.query as { tanggal?: string };
      const data = await this.dashboardService.getKurikulumMonitoringGlobal(tenantId, tanggal);

      return reply.status(200).send({
        success: true,
        message: 'Kurikulum global monitoring data',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil data monitoring kurikulum',
        error: error.message
      });
    }
  }

  /**
   * 2️⃣ Statistik Harian per Kelas
   * GET /dashboard/statistik/kelas/:tanggal
   */
  async getStatistikKelasHarian(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { tanggal } = request.params as { tanggal: string };

      if (!tanggal) {
        return reply.status(400).send({
          success: false,
          message: 'Parameter tanggal diperlukan'
        });
      }

      const scope = (request as any).dataScope;
      const data = await this.dashboardService.getStatistikKelasHarian(tenantId, tanggal, scope);

      return reply.status(200).send({
        success: true,
        message: 'Statistik kehadiran per kelas',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil statistik kelas harian',
        error: error.message
      });
    }
  }

  /**
   * 3️⃣ Statistik Bulanan per Kelas
   * GET /dashboard/statistik/kelas/:kelas_id/bulan/:bulan
   */
  async getStatistikKelasBulanan(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { kelas_id, bulan } = request.params as { kelas_id: string; bulan: string };

      if (!kelas_id || !bulan) {
        return reply.status(400).send({
          success: false,
          message: 'Parameter kelas_id dan bulan diperlukan'
        });
      }

      const data = await this.dashboardService.getStatistikKelasBulanan(tenantId, kelas_id, bulan);

      return reply.status(200).send({
        success: true,
        message: 'Statistik bulanan kelas',
        data
      });
    } catch (error: any) {
      if (error.message === 'Kelas tidak ditemukan') {
        return reply.status(404).send({
          success: false,
          message: error.message
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil statistik kelas bulanan',
        error: error.message
      });
    }
  }



  /**
   * 4️⃣ Statistik Guru Harian
   * GET /dashboard/statistik/guru/:tanggal
   */
  async getStatistikGuruHarian(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { tanggal } = request.params as { tanggal: string };

      if (!tanggal) {
        return reply.status(400).send({
          success: false,
          message: 'Parameter tanggal diperlukan'
        });
      }

      const data = await this.dashboardService.getStatistikGuruHarian(tenantId, tanggal);

      return reply.status(200).send({
        success: true,
        message: 'Statistik guru harian',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil statistik guru harian',
        error: error.message
      });
    }
  }

  /**
   * 5️⃣ Grafik Bulanan Kehadiran Siswa
   * GET /dashboard/grafik/siswa/:bulan
   */
  async getGrafikSiswaBulanan(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { bulan } = request.params as { bulan: string };

      if (!bulan) {
        return reply.status(400).send({
          success: false,
          message: 'Parameter bulan diperlukan (format: YYYY-MM)'
        });
      }

      // Validate bulan format
      if (!/^\d{4}-\d{2}$/.test(bulan)) {
        return reply.status(400).send({
          success: false,
          message: 'Format bulan tidak valid. Gunakan format YYYY-MM (contoh: 2025-10)'
        });
      }

      const data = await this.dashboardService.getGrafikSiswaBulanan(tenantId, bulan);

      return reply.status(200).send({
        success: true,
        message: 'Grafik bulanan kehadiran siswa',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil data grafik siswa bulanan',
        error: error.message
      });
    }
  }

  /**
   * 6️⃣ Grafik Bulanan Guru
   * GET /dashboard/grafik/guru/:bulan
   */
  async getGrafikGuruBulanan(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { bulan } = request.params as { bulan: string };

      if (!bulan) {
        return reply.status(400).send({
          success: false,
          message: 'Parameter bulan diperlukan (format: YYYY-MM)'
        });
      }

      // Validate bulan format
      if (!/^\d{4}-\d{2}$/.test(bulan)) {
        return reply.status(400).send({
          success: false,
          message: 'Format bulan tidak valid. Gunakan format YYYY-MM (contoh: 2025-10)'
        });
      }

      const data = await this.dashboardService.getGrafikGuruBulanan(tenantId, bulan);

      return reply.status(200).send({
        success: true,
        message: 'Grafik bulanan kehadiran guru',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil data grafik guru bulanan',
        error: error.message
      });
    }
  }

  /**
   * 7️⃣ Effective Capabilities per Guru
   * GET /dashboard/guru/:guruId/capabilities
   */
  async getGuruCapabilities(request: AuthenticatedRequest, reply: any) {
    try {
      const { guruId } = request.params as { guruId: string };
      const tenantId = request.tenantId;

      if (!guruId) {
        return reply.status(400).send({
          success: false,
          message: 'Parameter guruId diperlukan'
        });
      }

      const data = await this.dashboardService.getGuruCapabilitiesData(tenantId, guruId);
      return reply.status(200).send({
        success: true,
        message: 'Effective capabilities guru berdasarkan struktur',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil capabilities guru',
        error: error.message
      });
    }
  }

  /**
   * 7️⃣ Dashboard Stats for Analytics
   * GET /dashboard/stats
   */
  async getDashboardStats(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const data = await this.dashboardService.getAnalyticsStats(tenantId);

      return reply.status(200).send({
        success: true,
        message: 'Dashboard analytics stats',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil data statistik dashboard',
        error: error.message
      });
    }
  }

  /**
   * 8️⃣ Recent Payments for Analytics
   * GET /dashboard/recent-payments
   */
  async getRecentPayments(request: AuthenticatedRequest, reply: any) {
    try {
      const { prisma } = await import('../../../utils/prisma');
      const tenantId = request.tenantId;
      const { limit = '5' } = (request as any).query || {};
      const safeLimit = Math.min(Math.max(parseInt(String(limit)) || 5, 1), 50);

      const payments = await prisma.payment.findMany({
        where: tenantId ? { tenant_id: tenantId } : {},
        include: { Invoice: { select: { id: true } } },
        orderBy: { created_at: 'desc' },
        take: safeLimit
      });

      const data = payments.map((p: any) => ({
        id: p.id,
        billingId: p.invoice_id || p.Invoice?.id || '-',
        amount: Number(p.amount) || 0,
        status: String(p.status || '').toLowerCase(),
        paymentTime: p.created_at?.toISOString() || new Date().toISOString()
      }));

      return reply.status(200).send({
        success: true,
        message: 'Recent payments data',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil data pembayaran terbaru',
        error: error.message
      });
    }
  }

  /**
   * 9️⃣ Payment Chart Data for Analytics
   * GET /dashboard/payment-chart
   */
  async getPaymentChart(request: AuthenticatedRequest, reply: any) {
    try {
      const { prisma } = await import('../../../utils/prisma');
      const tenantId = request.tenantId;
      const now = new Date();
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = now.getFullYear();

      // Ambil pembayaran sukses per bulan untuk tahun berjalan
      const payments = await prisma.payment.findMany({
        where: {
          ...(tenantId ? { tenant_id: tenantId } : {}),
          status: 'SUCCESS',
          created_at: {
            gte: new Date(currentYear, 0, 1),
            lte: new Date(currentYear, 11, 31, 23, 59, 59)
          }
        },
        select: { amount: true, created_at: true }
      });

      // Agregasi per bulan
      const monthlyTotals = new Array(12).fill(0);
      payments.forEach((p: any) => {
        const month = new Date(p.created_at).getMonth();
        monthlyTotals[month] += Number(p.amount) || 0;
      });

      const data = monthLabels.map((month, idx) => ({
        month,
        amount: monthlyTotals[idx]
      }));

      return reply.status(200).send({
        success: true,
        message: 'Payment chart data',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil data chart pembayaran',
        error: error.message
      });
    }
  }


  async getRecentTenantRegistrations(request: any, reply: any) {
    try {
      const user = request.user;
      if (!isSystemSuperAdmin(user?.roleName, user?.tenant_id)) {
        return reply.status(403).send({
          success: false,
          message: 'Akses ditolak. Hanya SUPERADMIN yang dapat mengakses data ini.'
        });
      }

      const { limit = 10, days = 30 } = request.query || {};
      const data = await this.dashboardService.getRecentTenantRegistrations(
        parseInt(limit as string),
        parseInt(days as string)
      );

      return reply.status(200).send({
        success: true,
        message: 'Registrasi tenant terbaru',
        data
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Terjadi kesalahan server'
      });
    }
  }

  /**
   * 🆕 Get Hubin (PKL) Stats
   */
  async getHubinStats(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = (request.user as any).id || (request.user as any).userId;
      if (!tenantId) throw new Error('Tenant ID required');
      const data = await this.dashboardService.getHubinStats(tenantId, userId);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  /**
   * 🆕 Get Sarpras (Inventory) Stats
   */
  async getSarprasStats(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) throw new Error('Tenant ID required');
      const data = await this.dashboardService.getSarprasStats(tenantId);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  /**
   * 🆕 Get TU (Administration) Stats
   */
  async getTUStats(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) throw new Error('Tenant ID required');
      const data = await this.dashboardService.getTUStats(tenantId);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  /**
   * 🆕 Get Gerbang (Gate) Stats
   */
  async getGerbangStats(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) throw new Error('Tenant ID required');
      const data = await this.dashboardService.getGerbangStats(tenantId);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  /**
   * 🆕 Get Petugas (Officer) Stats
   */
  async getPetugasStats(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = (request.user as any).id || (request.user as any).userId;
      if (!tenantId) throw new Error('Tenant ID required');
      const data = await this.dashboardService.getPetugasStats(tenantId, userId);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
  /**
   * 🆕 Get Guru Leaderboard
   * GET /dashboard/leaderboard-guru
   */
  async getGuruLeaderboard(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { limit } = request.query as { limit?: string };
      
      const data = await this.dashboardService.getGuruLeaderboard(tenantId, limit ? parseInt(limit) : 10);

      return reply.status(200).send({
        success: true,
        message: 'Guru leaderboard points',
        data
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: 'Gagal mengambil data leaderboard guru',
        error: error.message
      });
    }
  }

  /**
   * 🆕 Get Kaprog Stats
   * GET /dashboard/kaprog/stats
   */
  async getKaprogStats(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = (request.user as any).id || (request.user as any).userId;
      if (!tenantId) throw new Error('Tenant ID required');
      const data = await this.dashboardService.getKaprogStats(tenantId, userId);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  /**
   * 🆕 Get Toolman Stats
   * GET /dashboard/toolman/stats
   */
  async getToolmanStats(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) throw new Error('Tenant ID required');
      const data = await this.dashboardService.getToolmanStats(tenantId);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  /**
   * 🆕 Get Kabeng Stats
   * GET /dashboard/kabeng/stats
   */
  async getKabengStats(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = (request.user as any).id || (request.user as any).userId;
      if (!tenantId) throw new Error('Tenant ID required');
      const data = await this.dashboardService.getKabengStats(tenantId, userId);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  /**
   * 🆕 Get BKK Stats
   * GET /dashboard/bkk/stats
   */
  async getBkkStats(request: AuthenticatedRequest, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) throw new Error('Tenant ID required');
      const data = await this.dashboardService.getBkkStats(tenantId);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}
