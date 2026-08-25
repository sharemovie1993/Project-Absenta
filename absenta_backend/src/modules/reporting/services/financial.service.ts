import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/utils/prisma';

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
    this.prisma = prisma;
  }

  async generateFinancialReport(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    saveToDb: boolean = true
  ): Promise<FinancialReportData> {
    try {
      const invoices: any[] = [];

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
    const [
      totalTenants,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ]);
    const paidCountAgg = 0;
    const unpaidCountAgg = 0;
    const overdueCountAgg = 0;
    const paidAmountAgg = { _sum: { amount: 0 } };
    const unpaidAmountAgg = { _sum: { amount: 0 } };
    const overdueAmountAgg = { _sum: { amount: 0 } };
    const revenueMonthAgg = { _sum: { amount: 0 } };
    const revenueYearAgg = { _sum: { amount: 0 } };
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

  async getDashboardStats(_tenantId: string) {
    try {

      const monthlyStats = { _sum: { total_amount: 0 }, _count: { id: 0 } };
      const yearlyStats = { _sum: { total_amount: 0 }, _count: { id: 0 } };
      const paidThisMonth = { _sum: { total_amount: 0 }, _count: { id: 0 } };
      const unpaidThisMonth = { _sum: { total_amount: 0 }, _count: { id: 0 } };

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
        recentPayments: [],
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
