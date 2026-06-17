import { PrismaClient } from '@prisma/client';

export interface FinancialReportData {
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  totalPaid: number;
  totalUnpaid: number;
  totalBillings: number;
  paidBillings: number;
  unpaidBillings: number;
  paymentMethods: Record<string, number>;
  monthlyTrends: Array<{
    month: string;
    paid: number;
    unpaid: number;
  }>;
}

export class FinancialService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async generateFinancialReport(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    saveToDb: boolean = true
  ): Promise<FinancialReportData> {
    try {
      // Get all invoices in the period
      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenant_id: tenantId,
          created_at: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        include: {
          payments: true,
        },
      });

      // Calculate totals
      const totalBillings = invoices.length;
      const paidBillings = invoices.filter(i => i.status === 'PAID').length;
      const unpaidBillings = totalBillings - paidBillings;

      const totalPaid = invoices
        .filter(i => i.status === 'PAID')
        .reduce((sum, i) => sum + i.total_amount, 0);

      const totalUnpaid = invoices
        .filter(i => i.status !== 'PAID')
        .reduce((sum, i) => sum + i.total_amount, 0);

      // Payment methods breakdown
      const paymentMethods: Record<string, number> = {};
      invoices.forEach(invoice => {
        invoice.payments.forEach(payment => {
          if (payment.status === 'SUCCESS') {
            const method = payment.payment_method || 'Unknown';
            paymentMethods[method] = (paymentMethods[method] || 0) + payment.amount;
          }
        });
      });

      // Monthly trends
      const monthlyTrends = this.calculateMonthlyTrends(invoices, periodStart, periodEnd);

      // Save report to database (only if saveToDb is true)
      if (saveToDb) {
        await this.saveFinancialReport({
          tenantId,
          periodStart,
          periodEnd,
          totalPaid,
          totalUnpaid,
        });
      }

      return {
        tenantId,
        periodStart,
        periodEnd,
        totalPaid,
        totalUnpaid,
        totalBillings,
        paidBillings,
        unpaidBillings,
        paymentMethods,
        monthlyTrends,
      };
    } catch (error) {
      console.error('Generate financial report error:', error);
      throw error;
    }
  }

  async getOwnerSummary() {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const [
      totalTenants,
      activeSubscriptions,
      paidCountAgg,
      unpaidCountAgg,
      overdueCountAgg,
      paidAmountAgg,
      unpaidAmountAgg,
      overdueAmountAgg,
      revenueMonthAgg,
      revenueYearAgg,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.invoice.count({ where: { status: 'PAID' } }),
      this.prisma.invoice.count({ where: { status: { in: ['DRAFT', 'SENT', 'VIEWED'] } } }),
      this.prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      this.prisma.invoice.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { status: { in: ['DRAFT', 'SENT', 'VIEWED'] } }, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { status: 'OVERDUE' }, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { status: 'PAID', created_at: { gte: startOfMonth } }, _sum: { amount: true } }),
      this.prisma.invoice.aggregate({ where: { status: 'PAID', created_at: { gte: startOfYear } }, _sum: { amount: true } }),
    ]);
    return {
      totalTenants,
      activeSubscriptions,
      invoice: {
        paid: { count: paidCountAgg || 0, amount: paidAmountAgg._sum?.amount || 0 },
        unpaid: { count: unpaidCountAgg || 0, amount: unpaidAmountAgg._sum?.amount || 0 },
        overdue: { count: overdueCountAgg || 0, amount: overdueAmountAgg._sum?.amount || 0 },
      },
      revenue: {
        month: revenueMonthAgg._sum?.amount || 0,
        year: revenueYearAgg._sum?.amount || 0,
      },
    };
  }

  private calculateMonthlyTrends(
    invoices: any[],
    periodStart: Date,
    periodEnd: Date
  ): Array<{ month: string; paid: number; unpaid: number }> {
    const trends: Array<{ month: string; paid: number; unpaid: number }> = [];
    
    const currentDate = new Date(periodStart);
    while (currentDate <= periodEnd) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const monthInvoices = invoices.filter(i => {
        const invDate = new Date(i.created_at);
        return invDate >= monthStart && invDate <= monthEnd;
      });

      const paid = monthInvoices
        .filter(i => i.status === 'PAID')
        .reduce((sum, i) => sum + i.total_amount, 0);

      const unpaid = monthInvoices
        .filter(i => i.status !== 'PAID')
        .reduce((sum, i) => sum + i.total_amount, 0);

      trends.push({
        month: currentDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }),
        paid,
        unpaid,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return trends;
  }

  private async saveFinancialReport(data: {
    tenantId: string;
    periodStart: Date;
    periodEnd: Date;
    totalPaid: number;
    totalUnpaid: number;
  }) {
    try {
      await this.prisma.financialReport.create({
        data: {
          tenant_id: data.tenantId,
          period_start: data.periodStart,
          period_end: data.periodEnd,
          total_paid: data.totalPaid,
          total_unpaid: data.totalUnpaid,
        },
      });
    } catch (error) {
      console.error('Save financial report error:', error);
    }
  }

  async getFinancialReports(
    tenantId: string,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const skip = (page - 1) * limit;

      const [reports, total] = await Promise.all([
        this.prisma.financialReport.findMany({
          where: {
            tenant_id: tenantId,
          },
          skip,
          take: limit,
          orderBy: {
            generated_at: 'desc',
          },
        }),
        this.prisma.financialReport.count({
          where: {
            tenant_id: tenantId,
          },
        }),
      ]);

      return {
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get financial reports error:', error);
      throw error;
    }
  }

  async getDashboardStats(tenantId: string) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      const [monthlyStats, yearlyStats, recentPayments] = await Promise.all([
        // Monthly stats (Invoice-based)
        this.prisma.invoice.aggregate({
          where: {
            tenant_id: tenantId,
            created_at: {
              gte: startOfMonth,
            },
          },
          _sum: {
            total_amount: true,
          },
          _count: {
            id: true,
          },
        }),
        // Yearly stats (Invoice-based)
        this.prisma.invoice.aggregate({
          where: {
            tenant_id: tenantId,
            created_at: {
              gte: startOfYear,
            },
          },
          _sum: {
            total_amount: true,
          },
          _count: {
            id: true,
          },
        }),
        // Recent payments
        this.prisma.payment.findMany({
          where: {
            tenant_id: tenantId,
            status: 'SUCCESS',
          },
          take: 5,
          orderBy: {
            created_at: 'desc',
          },
          include: {
            Invoice: true,
          },
        }),
      ]);

      // Get paid vs unpaid for this month
      const [paidThisMonth, unpaidThisMonth] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            tenant_id: tenantId,
            status: 'PAID',
            created_at: {
              gte: startOfMonth,
            },
          },
          _sum: {
            total_amount: true,
          },
          _count: {
            id: true,
          },
        }),
        this.prisma.invoice.aggregate({
          where: {
            tenant_id: tenantId,
            NOT: { status: 'PAID' },
            created_at: {
              gte: startOfMonth,
            },
          },
          _sum: {
            total_amount: true,
          },
          _count: {
            id: true,
          },
        }),
      ]);

      return {
        monthly: {
          totalAmount: monthlyStats._sum?.total_amount || 0,
          totalBillings: monthlyStats._count?.id || 0,
          paidAmount: paidThisMonth._sum?.total_amount || 0,
          paidCount: paidThisMonth._count?.id || 0,
          unpaidAmount: unpaidThisMonth._sum?.total_amount || 0,
          unpaidCount: unpaidThisMonth._count?.id || 0,
        },
        yearly: {
          totalAmount: yearlyStats._sum?.total_amount || 0,
          totalBillings: yearlyStats._count?.id || 0,
        },
        recentPayments: recentPayments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          method: payment.payment_method,
          date: payment.created_at,
          invoiceNumber: payment.Invoice?.invoice_number || payment.billing_id,
        })),
      };
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      throw error;
    }
  }

  async exportFinancialReport(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    format: 'json' | 'csv' = 'json'
  ) {
    try {
      // Generate report without saving to DB (Read-Only for export)
      const reportData = await this.generateFinancialReport(tenantId, periodStart, periodEnd, false);

      if (format === 'csv') {
        return this.convertToCSV(reportData);
      }

      return reportData;
    } catch (error) {
      console.error('Export financial report error:', error);
      throw error;
    }
  }

  private convertToCSV(data: FinancialReportData): string {
    const headers = [
      'Period Start',
      'Period End',
      'Total Paid',
      'Total Unpaid',
      'Total Billings',
      'Paid Billings',
      'Unpaid Billings',
    ];

    const rows = [
      data.periodStart.toISOString().split('T')[0],
      data.periodEnd.toISOString().split('T')[0],
      data.totalPaid.toString(),
      data.totalUnpaid.toString(),
      data.totalBillings.toString(),
      data.paidBillings.toString(),
      data.unpaidBillings.toString(),
    ];

    return [headers.join(','), rows.join(',')].join('\n');
  }
}
