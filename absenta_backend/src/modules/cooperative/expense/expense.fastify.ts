// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ExpenseService } from './expense.service';
import { CashBankingService } from './cash-banking.service';
import { requireCapability } from '@/middlewares/requireCapability';
import { mockTenant } from '../../../utils/mocks';
import { appLogger } from '@/utils/app-logger';

// ─── ZOD SCHEMAS (Phase 4 Hardening: Anti-DoS, Strict Typing & Guard) ───────
const listVoucherQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(15),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  search: z.string().max(100).optional(),
  categoryCode: z.string().max(20).optional(),
  accountCode: z.string().max(20).optional(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER']).optional(),
  receivedVia: z.enum(['CASH', 'BANK_TRANSFER']).optional(),
});

const createExpenseSchema = z.object({
  categoryCode: z.string().min(1, 'Kategori beban operasional wajib dipilih'),
  amount: z.coerce.number().positive('Nominal pengeluaran harus lebih besar dari Rp 0'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER']).optional().default('CASH'),
  payee: z.string().max(100).optional().nullable(),
  description: z.string().min(1, 'Keterangan pengeluaran operasional wajib diisi').max(255),
  date: z.string().optional(),
});

const createDepositSchema = z.object({
  accountCode: z.string().min(1, 'Kategori sumber penerimaan kas wajib dipilih'),
  amount: z.coerce.number().positive('Nominal penerimaan harus lebih besar dari Rp 0'),
  receivedVia: z.enum(['CASH', 'BANK_TRANSFER']).optional().default('CASH'),
  payer: z.string().max(100).optional().nullable(),
  description: z.string().min(1, 'Keterangan penerimaan kas wajib diisi').max(255),
  date: z.string().optional(),
});

const createTransferSchema = z.object({
  fromAccountCode: z.string().min(1, 'Rekening asal wajib dipilih'),
  toAccountCode: z.string().min(1, 'Rekening tujuan wajib dipilih'),
  amount: z.coerce.number().positive('Nominal transfer harus lebih besar dari Rp 0'),
  description: z.string().min(1, 'Keterangan transfer wajib diisi').max(255),
  date: z.string().optional(),
}).refine(data => data.fromAccountCode !== data.toAccountCode, {
  message: 'Rekening sumber dan rekening tujuan tidak boleh sama',
  path: ['toAccountCode'],
});

export default async function expenseRoutes(fastify: FastifyInstance) {
  const getTenantId = (req: any) => {
    return (req.user?.tenant_id || req.user?.tenantId) || mockTenant.id;
  };

  const broadcastCoopUpdate = (req: any, type: string, payload: any = {}) => {
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
        io.to(`tenant:${tenantId}`).emit('coop_expense_update', broadcastPayload);
      }
      io.emit('coop_accounting_update', broadcastPayload);
      io.emit('coop_expense_update', broadcastPayload);
    }
  };

  // GET /cooperative/expenses/categories (Daftar kategori beban standar)
  fastify.get(
    '/categories',
    { preHandler: [requireCapability(['cooperative.reports.view.financial', 'cooperative.dashboard.view.overview', 'cooperative.assets.view.list'])] },
    async (_req: any, reply: any) => {
      return reply.status(200).send({
        success: true,
        data: ExpenseService.getExpenseCategories()
      });
    }
  );

  // GET /cooperative/expenses (List bukti pengeluaran dengan filter & pagination)
  fastify.get(
    '/',
    { preHandler: [requireCapability(['cooperative.reports.view.financial', 'cooperative.dashboard.view.overview', 'cooperative.assets.view.list'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const query = listVoucherQuerySchema.parse(req.query);
        const result = await ExpenseService.listExpenses(tenantId, query);
        return reply.status(200).send({
          success: true,
          message: 'Daftar pengeluaran operasional koperasi',
          data: result
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[ExpenseRoutes] Gagal memuat daftar pengeluaran');
        const statusCode = error instanceof z.ZodError ? 400 : 500;
        return reply.status(statusCode).send({
          success: false,
          message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : (error.message || 'Gagal memuat daftar pengeluaran operasional')
        });
      }
    }
  );

  // POST /cooperative/expenses (Catat pengeluaran kas baru & posting jurnal)
  fastify.post(
    '/',
    { preHandler: [requireCapability(['cooperative.reports.view.financial', 'cooperative.savings.deposit', 'cooperative.assets.create', 'cooperative.dashboard.view.overview'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const userId = req.user?.id;
        const body = createExpenseSchema.parse(req.body);

        const created = await ExpenseService.createExpense(tenantId, body, userId);
        broadcastCoopUpdate(req, 'EXPENSE_CREATED', { id: created.id, voucherNumber: created.voucherNumber, amount: created.amount });

        return reply.status(201).send({
          success: true,
          message: 'Pengeluaran operasional berhasil dicatat dan dibukukan ke Laporan Keuangan',
          data: created
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[ExpenseRoutes] Gagal mencatat pengeluaran operasional');
        const statusCode = error instanceof z.ZodError ? 400 : 500;
        return reply.status(statusCode).send({
          success: false,
          message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : (error.message || 'Gagal mencatat pengeluaran operasional')
        });
      }
    }
  );

  // DELETE /cooperative/expenses/:id (Hapus pengeluaran operasional & jurnal)
  fastify.delete(
    '/:id',
    { preHandler: [requireCapability(['cooperative.reports.view.financial', 'cooperative.savings.deposit', 'cooperative.assets.create', 'cooperative.dashboard.view.overview'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { id } = req.params as { id: string };

        const result = await ExpenseService.deleteExpense(tenantId, id);
        broadcastCoopUpdate(req, 'EXPENSE_DELETED', { id });

        return reply.status(200).send({
          success: true,
          message: 'Bukti pengeluaran operasional dan entri jurnal berhasil dihapus',
          data: result
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[ExpenseRoutes] Gagal menghapus pengeluaran operasional');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal menghapus bukti kas keluar'
        });
      }
    }
  );

  // ─── BUKTI KAS MASUK (BKM / PENERIMAAN KAS LAINNYA) ────────────────────────

  // GET /cooperative/expenses/deposits/categories
  fastify.get(
    '/deposits/categories',
    { preHandler: [requireCapability(['cooperative.reports.view.financial', 'cooperative.dashboard.view.overview', 'cooperative.assets.view.list'])] },
    async (_req: any, reply: any) => {
      return reply.status(200).send({
        success: true,
        data: CashBankingService.getDepositCategories()
      });
    }
  );

  // GET /cooperative/expenses/deposits
  fastify.get(
    '/deposits',
    { preHandler: [requireCapability(['cooperative.reports.view.financial', 'cooperative.dashboard.view.overview', 'cooperative.assets.view.list'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const query = listVoucherQuerySchema.parse(req.query);
        const result = await CashBankingService.listDeposits(tenantId, query);
        return reply.status(200).send({
          success: true,
          message: 'Daftar bukti kas masuk (BKM)',
          data: result
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[CashBankingRoutes] Gagal memuat daftar BKM');
        const statusCode = error instanceof z.ZodError ? 400 : 500;
        return reply.status(statusCode).send({
          success: false,
          message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : (error.message || 'Gagal memuat daftar penerimaan kas')
        });
      }
    }
  );

  // POST /cooperative/expenses/deposits
  fastify.post(
    '/deposits',
    { preHandler: [requireCapability(['cooperative.reports.view.financial', 'cooperative.savings.deposit', 'cooperative.assets.create', 'cooperative.dashboard.view.overview'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const userId = req.user?.id;
        const body = createDepositSchema.parse(req.body);

        const created = await CashBankingService.createDeposit(tenantId, body, userId);
        broadcastCoopUpdate(req, 'DEPOSIT_CREATED', { id: created.id, voucherNumber: created.voucherNumber, amount: created.amount });

        return reply.status(201).send({
          success: true,
          message: 'Bukti kas masuk (BKM) berhasil dicatat dan dibukukan ke Laporan Keuangan',
          data: created
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[CashBankingRoutes] Gagal mencatat BKM');
        const statusCode = error instanceof z.ZodError ? 400 : 500;
        return reply.status(statusCode).send({
          success: false,
          message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : (error.message || 'Gagal mencatat penerimaan kas')
        });
      }
    }
  );

  // DELETE /cooperative/expenses/deposits/:id
  fastify.delete(
    '/deposits/:id',
    { preHandler: [requireCapability(['cooperative.reports.view.financial', 'cooperative.savings.deposit', 'cooperative.assets.create', 'cooperative.dashboard.view.overview'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { id } = req.params as { id: string };

        const result = await CashBankingService.deleteDeposit(tenantId, id);
        broadcastCoopUpdate(req, 'DEPOSIT_DELETED', { id });

        return reply.status(200).send({
          success: true,
          message: 'Bukti kas masuk dan entri jurnal berhasil dibatalkan',
          data: result
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[CashBankingRoutes] Gagal menghapus BKM');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal menghapus bukti kas masuk'
        });
      }
    }
  );

  // ─── TRANSFER KAS & BANK (TRF) ────────────────────────────────────────────

  // GET /cooperative/expenses/transfers
  fastify.get(
    '/transfers',
    { preHandler: [requireCapability(['cooperative.reports.view.financial', 'cooperative.dashboard.view.overview', 'cooperative.assets.view.list'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const query = listVoucherQuerySchema.parse(req.query);
        const result = await CashBankingService.listTransfers(tenantId, query);
        return reply.status(200).send({
          success: true,
          message: 'Daftar transfer dana kas & bank',
          data: result
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[CashBankingRoutes] Gagal memuat daftar transfer');
        const statusCode = error instanceof z.ZodError ? 400 : 500;
        return reply.status(statusCode).send({
          success: false,
          message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : (error.message || 'Gagal memuat daftar transfer kas')
        });
      }
    }
  );

  // POST /cooperative/expenses/transfers
  fastify.post(
    '/transfers',
    { preHandler: [requireCapability(['cooperative.reports.view.financial', 'cooperative.savings.deposit', 'cooperative.assets.create', 'cooperative.dashboard.view.overview'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const userId = req.user?.id;
        const body = createTransferSchema.parse(req.body);

        const created = await CashBankingService.createTransfer(tenantId, body, userId);
        broadcastCoopUpdate(req, 'TRANSFER_CREATED', { id: created.id, voucherNumber: created.voucherNumber, amount: created.amount });

        return reply.status(201).send({
          success: true,
          message: 'Transfer dana kas & bank berhasil dicatat dan diposting ke jurnal',
          data: created
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[CashBankingRoutes] Gagal mencatat transfer dana');
        const statusCode = error instanceof z.ZodError ? 400 : 500;
        return reply.status(statusCode).send({
          success: false,
          message: error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : (error.message || 'Gagal melakukan transfer kas')
        });
      }
    }
  );

  // DELETE /cooperative/expenses/transfers/:id
  fastify.delete(
    '/transfers/:id',
    { preHandler: [requireCapability(['cooperative.reports.view.financial', 'cooperative.savings.deposit', 'cooperative.assets.create', 'cooperative.dashboard.view.overview'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { id } = req.params as { id: string };

        const result = await CashBankingService.deleteTransfer(tenantId, id);
        broadcastCoopUpdate(req, 'TRANSFER_DELETED', { id });

        return reply.status(200).send({
          success: true,
          message: 'Bukti transfer kas dan entri jurnal berhasil dibatalkan',
          data: result
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[CashBankingRoutes] Gagal membatalkan transfer');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal membatalkan bukti transfer kas'
        });
      }
    }
  );
}
