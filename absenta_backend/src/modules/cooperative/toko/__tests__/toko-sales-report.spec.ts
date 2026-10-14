import { TokoService } from '../toko.service';
import { prisma } from '@/utils/prisma';

// Mock Prisma
jest.mock('@/utils/prisma', () => ({
  prisma: {
    sale: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    saleItem: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('TokoService - Sales Report Unit & Isolation Tests (Phase 5 QA)', () => {
  const mockTenantId = 'tenant-test-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSalesReportSummary', () => {
    it('harus menghitung omset, keranjang belanja rata-rata, laba kotor, dan pemisahan metode bayar dengan benar', async () => {
      const mockSales = [
        {
          id: 'sale-1',
          total: 50000,
          paymentMethod: 'CASH',
          items: [
            { quantity: 2, product: { costPrice: 15000, price: 25000 } }
          ]
        },
        {
          id: 'sale-2',
          total: 30000,
          paymentMethod: 'SAVING',
          items: [
            { quantity: 3, product: { costPrice: 6000, price: 10000 } }
          ]
        }
      ];

      (prisma.sale.findMany as jest.Mock).mockResolvedValue(mockSales);

      const summary = await TokoService.getSalesReportSummary(mockTenantId, {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        paymentMethod: 'ALL'
      });

      expect(prisma.sale.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          tenantId: mockTenantId
        })
      }));

      // Total Sales: 50,000 + 30,000 = 80,000
      expect(summary.totalSales).toBe(80000);
      expect(summary.totalTransactions).toBe(2);
      expect(summary.avgBasketSize).toBe(40000);
      expect(summary.totalItemsSold).toBe(5);

      // Estimated Cost: (2 * 15,000) + (3 * 6,000) = 30,000 + 18,000 = 48,000
      // Estimated Gross Profit: 80,000 - 48,000 = 32,000
      expect(summary.totalEstimatedGrossProfit).toBe(32000);
      // Margin: (32,000 / 80,000) * 100 = 40%
      expect(summary.grossProfitMarginPct).toBe(40);

      // Breakdown
      expect(summary.paymentBreakdown.CASH.total).toBe(50000);
      expect(summary.paymentBreakdown.CASH.count).toBe(1);
      expect(summary.paymentBreakdown.SAVING.total).toBe(30000);
      expect(summary.paymentBreakdown.SAVING.count).toBe(1);
    });

    it('harus menangani kasus ketika belum ada transaksi sama sekali tanpa division by zero', async () => {
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([]);

      const summary = await TokoService.getSalesReportSummary(mockTenantId);

      expect(summary.totalSales).toBe(0);
      expect(summary.totalTransactions).toBe(0);
      expect(summary.avgBasketSize).toBe(0);
      expect(summary.totalItemsSold).toBe(0);
      expect(summary.totalEstimatedGrossProfit).toBe(0);
      expect(summary.grossProfitMarginPct).toBe(0);
    });
  });

  describe('getTopSellingProducts', () => {
    it('harus mengagregasi volume terjual dan mengurutkan berdasarkan item paling laris', async () => {
      const mockSaleItems = [
        {
          productId: 'prod-1',
          quantity: 10,
          price: 5000,
          product: { id: 'prod-1', code: 'BRG-1', name: 'Buku Tulis', category: 'STATIONERY', costPrice: 3500, price: 5000 }
        },
        {
          productId: 'prod-2',
          quantity: 25,
          price: 2000,
          product: { id: 'prod-2', code: 'BRG-2', name: 'Pensil 2B', category: 'STATIONERY', costPrice: 1200, price: 2000 }
        },
        {
          productId: 'prod-1',
          quantity: 5,
          price: 5000,
          product: { id: 'prod-1', code: 'BRG-1', name: 'Buku Tulis', category: 'STATIONERY', costPrice: 3500, price: 5000 }
        }
      ];

      (prisma.saleItem.findMany as jest.Mock).mockResolvedValue(mockSaleItems);

      const top = await TokoService.getTopSellingProducts(mockTenantId, { limit: 10 });

      expect(prisma.saleItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          sale: { tenantId: mockTenantId }
        })
      }));

      // prod-2 has 25 qty, prod-1 has 10+5=15 qty. prod-2 should be ranked 1st
      expect(top.length).toBe(2);
      expect(top[0].productId).toBe('prod-2');
      expect(top[0].qtySold).toBe(25);
      expect(top[0].totalRevenue).toBe(50000);

      expect(top[1].productId).toBe('prod-1');
      expect(top[1].qtySold).toBe(15);
      expect(top[1].totalRevenue).toBe(75000);
    });
  });

  describe('getDailySalesReport', () => {
    it('harus merekap omset dan transaksi per hari secara akurat untuk Z-Report kasir', async () => {
      const mockSales = [
        {
          date: new Date('2026-10-14T08:30:00.000Z'),
          total: 25000,
          paymentMethod: 'CASH',
          items: [{ quantity: 2 }]
        },
        {
          date: new Date('2026-10-14T11:00:00.000Z'),
          total: 15000,
          paymentMethod: 'SAVING',
          items: [{ quantity: 1 }]
        },
        {
          date: new Date('2026-10-13T09:00:00.000Z'),
          total: 50000,
          paymentMethod: 'CASH',
          items: [{ quantity: 4 }]
        }
      ];

      (prisma.sale.findMany as jest.Mock).mockResolvedValue(mockSales);

      const daily = await TokoService.getDailySalesReport(mockTenantId);

      expect(daily.length).toBe(2);
      // Urutan tanggal descending
      const dayToday = daily.find(d => d.date.includes('2026-10-14'));
      expect(dayToday).toBeDefined();
      expect(dayToday?.transactionCount).toBe(2);
      expect(dayToday?.cashTotal).toBe(25000);
      expect(dayToday?.savingTotal).toBe(15000);
      expect(dayToday?.grandTotal).toBe(40000);
      expect(dayToday?.totalItems).toBe(3);
    });
  });
});
