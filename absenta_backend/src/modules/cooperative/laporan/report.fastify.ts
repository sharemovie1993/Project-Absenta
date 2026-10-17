// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ReportService } from './report.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';

const getTenantId = (req: any) => {
    return ((req.user as any)?.tenant_id || (req.user as any)?.tenantId) || mockTenant.id;
};

// ─── ZOD SCHEMAS (Phase 4 Hardening: Financial Reports & Payroll Guards) ────
const dateRangeQuerySchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
    asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
});

const ledgerParamsSchema = z.object({
    code: z.string().min(1, 'Kode akun wajib diisi').max(20),
});

const payrollQuerySchema = z.object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
});

const payrollActionBodySchema = z.object({
    month: z.coerce.number().int().min(1).max(12, 'Bulan harus antara 1 sampai 12'),
    year: z.coerce.number().int().min(2020).max(2100, 'Tahun tidak valid'),
});

const inventoryStockQuerySchema = z.object({
    category: z.string().max(50).optional(),
    lowStockOnly: z.union([z.boolean(), z.string()]).optional(),
});

const inventoryPurchaseQuerySchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
    supplier: z.string().max(100).optional(),
});

export default async function reportRoutes(fastify: any) {
    // Get Balance Sheet (Neraca)
    fastify.get('/neraca', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const query = dateRangeQuerySchema.parse(req.query);
            const asOf = query.asOfDate ? new Date(query.asOfDate) : undefined;
            const report = await ReportService.getBalanceSheet(tenantId, asOf);
            return reply.send({ data: report });
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal mengambil laporan neraca');
            const statusCode = error instanceof z.ZodError ? 400 : 500;
            return reply.status(statusCode).send({ 
                success: false, 
                message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message 
            });
        }
    });

    // Get Income Statement (Laba Rugi)
    fastify.get('/laba-rugi', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const query = dateRangeQuerySchema.parse(req.query);
            const start = query.startDate ? new Date(query.startDate) : undefined;
            const end = query.endDate ? new Date(query.endDate) : undefined;
            const report = await ReportService.getIncomeStatement(tenantId, start, end);
            return reply.send({ data: report });
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal mengambil laporan laba rugi');
            const statusCode = error instanceof z.ZodError ? 400 : 500;
            return reply.status(statusCode).send({ 
                success: false, 
                message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message 
            });
        }
    });

    // Get Cash Flow Statement (Laporan Arus Kas)
    fastify.get('/arus-kas', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const query = dateRangeQuerySchema.parse(req.query);
            const start = query.startDate ? new Date(query.startDate) : undefined;
            const end = query.endDate ? new Date(query.endDate) : undefined;
            const report = await ReportService.getCashFlowStatement(tenantId, start, end);
            return reply.send({ data: report });
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal mengambil laporan arus kas');
            const statusCode = error instanceof z.ZodError ? 400 : 500;
            return reply.status(statusCode).send({ 
                success: false, 
                message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message 
            });
        }
    });

    // Get General Ledger Detail by Account Code (Buku Besar Per Akun)
    fastify.get('/ledger/:code', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const { code } = ledgerParamsSchema.parse(req.params);
            const query = dateRangeQuerySchema.parse(req.query);
            const start = query.startDate ? new Date(query.startDate) : undefined;
            const end = query.endDate ? new Date(query.endDate) : undefined;
            const report = await ReportService.getGeneralLedgerByAccount(tenantId, code, start, end);
            return reply.send({ data: report });
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal mengambil buku besar per akun');
            const statusCode = error instanceof z.ZodError ? 400 : 500;
            return reply.status(statusCode).send({ 
                success: false, 
                message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message 
            });
        }
    });

    // Get Trial Balance (Neraca Saldo Resmi - Seluruh Akun dengan Debit & Kredit SAK ETAP)
    fastify.get('/trial-balance', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const query = dateRangeQuerySchema.parse(req.query);
            const asOfDate = query.endDate ? new Date(query.endDate) : undefined;
            const report = await ReportService.getTrialBalance(tenantId, asOfDate);
            return reply.send({ success: true, data: report });
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal mengambil neraca saldo trial balance');
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    // Get Balance Sheet (Neraca - Flattened for Accounting.tsx Trial Balance)
    fastify.get('/balance-sheet', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const report = await ReportService.getBalanceSheet(tenantId);
            const flattened = [...report.assets, ...report.liabilities, ...report.equity];
            return reply.send(flattened);
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal mengambil neraca saldo trial balance');
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    // Get Journals list (for Jurnal Umum in Accounting.tsx)
    fastify.get('/journals', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const journals = await ReportService.getJournals(tenantId);
            return reply.send(journals);
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal mengambil daftar jurnal umum');
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    // Get Member Savings Report
    fastify.get('/member-savings', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const report = await ReportService.getMemberSavingsReport(tenantId);
            return reply.send(report);
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal mengambil laporan simpanan anggota');
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    // Get Payroll Deductions Report
    fastify.get('/payroll-deductions', { preHandler: [requireCapability('cooperative.reports.view.financial')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const query = payrollQuerySchema.parse(req.query);
            const m = query.month || new Date().getMonth() + 1;
            const y = query.year || new Date().getFullYear();
            const report = await ReportService.getPayrollDeductionsReport(tenantId, m, y);
            return reply.send(report);
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal memuat rekapitulasi potongan gaji');
            const statusCode = error instanceof z.ZodError ? 400 : 500;
            return reply.status(statusCode).send({ 
                success: false, 
                message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message 
            });
        }
    });

    const broadcastCoopAccounting = (req: any, type: string, payload: any = {}) => {
        const io = req.server?.io || fastify.io;
        if (io) {
            const broadcastPayload = {
                type,
                ...payload,
                timestamp: new Date().toISOString()
            };
            const tenantId = getTenantId(req);
            if (tenantId) {
                io.to(`tenant:${tenantId}`).emit('coop_accounting_update', broadcastPayload);
                io.to(`tenant:${tenantId}`).emit('coop_saving_update', broadcastPayload);
                io.to(`tenant:${tenantId}`).emit('coop_loan_update', broadcastPayload);
            }
            io.emit('coop_accounting_update', broadcastPayload);
            io.emit('coop_saving_update', broadcastPayload);
            io.emit('coop_loan_update', broadcastPayload);
            io.emit('cooperative_sync', { type, data: broadcastPayload });
            io.to('cooperative_workspace').emit('cooperative_sync', { type, data: broadcastPayload });
        }
    };

    // POST /payroll-deductions/post
    fastify.post('/payroll-deductions/post', { preHandler: [requireCapability('cooperative.savings.deposit')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const body = payrollActionBodySchema.parse(req.body);
            const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;
            const result = await ReportService.postPayrollDeductions(tenantId, body.month, body.year, req.user?.id, idempotencyKey);
            broadcastCoopAccounting(req, 'PAYROLL_POSTED', { month: body.month, year: body.year, grandTotal: (result as any)?.grandTotal });
            return reply.send(result);
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal memproses posting potongan gaji massal');
            const statusCode = error instanceof z.ZodError ? 400 : 500;
            return reply.status(statusCode).send({ 
                success: false, 
                message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message 
            });
        }
    });

    // POST /payroll-deductions/cancel
    fastify.post('/payroll-deductions/cancel', { preHandler: [requireCapability('cooperative.savings.deposit')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const body = payrollActionBodySchema.parse(req.body);
            const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;
            const result = await ReportService.cancelPayrollDeductions(tenantId, body.month, body.year, req.user?.id, idempotencyKey);
            broadcastCoopAccounting(req, 'PAYROLL_CANCELLED', { month: body.month, year: body.year });
            return reply.send(result);
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal membatalkan posting potongan gaji massal');
            const statusCode = error instanceof z.ZodError ? 400 : 500;
            return reply.status(statusCode).send({ 
                success: false, 
                message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message 
            });
        }
    });

    // =========================================================================
    // LAPORAN INVENTORI — Hardened
    // =========================================================================

    // GET /inventory/stock  →  Snapshot stok semua produk
    fastify.get('/inventory/stock', { preHandler: [requireCapability('cooperative.store.products.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const query = inventoryStockQuerySchema.parse(req.query);
            const report = await ReportService.getInventoryStockReport(tenantId, {
                category: query.category,
                lowStockOnly: query.lowStockOnly === true || query.lowStockOnly === 'true' || query.lowStockOnly === '1',
            });
            return reply.send(report);
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal mengambil laporan stok produk');
            const statusCode = error instanceof z.ZodError ? 400 : 500;
            return reply.status(statusCode).send({ 
                success: false, 
                message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message 
            });
        }
    });

    // GET /inventory/valuation  →  Nilai persediaan per kategori
    fastify.get('/inventory/valuation', { preHandler: [requireCapability('cooperative.store.products.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const report = await ReportService.getInventoryValuationReport(tenantId);
            return reply.send(report);
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal mengambil laporan nilai persediaan');
            return reply.status(500).send({ success: false, message: error.message });
        }
    });

    // GET /inventory/purchases  →  Rekap transaksi barang masuk
    fastify.get('/inventory/purchases', { preHandler: [requireCapability('cooperative.store.products.view.list')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const query = inventoryPurchaseQuerySchema.parse(req.query);
            const report = await ReportService.getPurchaseSummaryReport(tenantId, query);
            return reply.send(report);
        } catch (error: any) {
            appLogger.error({ err: error }, '[ReportRoutes] Gagal mengambil rekap barang masuk');
            const statusCode = error instanceof z.ZodError ? 400 : 500;
            return reply.status(statusCode).send({ 
                success: false, 
                message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message 
            });
        }
    });
}
