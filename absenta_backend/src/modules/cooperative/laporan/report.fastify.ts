// @ts-nocheck
import { FastifyInstance, FastifyRequest } from 'fastify';
import { ReportService } from './report.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';

const getTenantId = (req: any) => {
    return ((req.user as any)?.tenant_id || (req.user as any)?.tenantId) || mockTenant.id;
};

export default async function reportRoutes(fastify: any) {
    // Get Balance Sheet (Neraca)
    fastify.get('/neraca', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const report = await ReportService.getBalanceSheet(tenantId);
        return reply.send({ data: report });
    });

    // Get Income Statement (Laba Rugi)
    // Query params opsional: ?startDate=2026-01-01&endDate=2026-12-31
    fastify.get('/laba-rugi', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const { startDate, endDate } = req.query as any;
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        const report = await ReportService.getIncomeStatement(tenantId, start, end);
        return reply.send({ data: report });
    });

    // Get Balance Sheet (Neraca - Flattened for Accounting.tsx)
    fastify.get('/balance-sheet', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const report = await ReportService.getBalanceSheet(tenantId);
        const flattened = [...report.assets, ...report.liabilities, ...report.equity];
        return reply.send(flattened);
    });

    // Get Journals list (for Jurnal Umum in Accounting.tsx)
    fastify.get('/journals', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const journals = await ReportService.getJournals(tenantId);
        return reply.send(journals);
    });

    // Get Member Savings Report
    fastify.get('/member-savings', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const report = await ReportService.getMemberSavingsReport(tenantId);
        return reply.send(report);
    });

    // Get Payroll Deductions Report
    fastify.get('/payroll-deductions', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        const tenantId = getTenantId(req);
        const { month, year } = req.query as any;
        const m = month ? parseInt(month) : new Date().getMonth() + 1;
        const y = year ? parseInt(year) : new Date().getFullYear();
        const report = await ReportService.getPayrollDeductionsReport(tenantId, m, y);
        return reply.send(report);
    });

    // POST /payroll-deductions/post
    fastify.post('/payroll-deductions/post', { preHandler: [requireCapability('cooperative.savings.deposit')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { month, year } = req.body as any;
            if (!month || !year) {
                return reply.code(400).send({ message: 'Bulan dan tahun wajib diisi.' });
            }
            const result = await ReportService.postPayrollDeductions(tenantId, parseInt(month), parseInt(year), req.user?.id);
            return reply.send(result);
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error processing bulk payroll posting');
            return reply.code(500).send({ message: error.message || 'Gagal memproses posting potongan gaji massal.' });
        }
    });

    // POST /payroll-deductions/cancel
    fastify.post('/payroll-deductions/cancel', { preHandler: [requireCapability('cooperative.savings.deposit')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { month, year } = req.body as any;
            if (!month || !year) {
                return reply.code(400).send({ message: 'Bulan dan tahun wajib diisi.' });
            }
            const result = await ReportService.cancelPayrollDeductions(tenantId, parseInt(month), parseInt(year));
            return reply.send(result);
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error cancelling bulk payroll posting');
            return reply.code(500).send({ message: error.message || 'Gagal membatalkan posting potongan gaji massal.' });
        }
    });
    // =========================================================================
    // LAPORAN INVENTORI — Fase 1
    // =========================================================================

    // GET /inventory/stock  →  Snapshot stok semua produk
    fastify.get('/inventory/stock', { preHandler: [requireCapability('cooperative.store.products.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { category, lowStockOnly } = req.query as any;
            const report = await ReportService.getInventoryStockReport(tenantId, {
                category,
                lowStockOnly: lowStockOnly === 'true' || lowStockOnly === '1',
            });
            return reply.send(report);
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error generating inventory stock report');
            return reply.code(500).send({ message: error.message || 'Gagal mengambil laporan stok.' });
        }
    });

    // GET /inventory/valuation  →  Nilai persediaan per kategori
    fastify.get('/inventory/valuation', { preHandler: [requireCapability('cooperative.store.products.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const report = await ReportService.getInventoryValuationReport(tenantId);
            return reply.send(report);
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error generating inventory valuation report');
            return reply.code(500).send({ message: error.message || 'Gagal mengambil laporan nilai persediaan.' });
        }
    });

    // GET /inventory/purchases  →  Rekap transaksi barang masuk
    fastify.get('/inventory/purchases', { preHandler: [requireCapability('cooperative.store.products.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { startDate, endDate, supplier } = req.query as any;
            const report = await ReportService.getPurchaseSummaryReport(tenantId, { startDate, endDate, supplier });
            return reply.send(report);
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Error generating purchase summary report');
            return reply.code(500).send({ message: error.message || 'Gagal mengambil rekap barang masuk.' });
        }
    });
}



