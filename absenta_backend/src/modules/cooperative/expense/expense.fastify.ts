// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { ExpenseService } from './expense.service';
import { requireCapability } from '@/middlewares/requireCapability';
import { mockTenant } from '../../../utils/mocks';
import { appLogger } from '@/utils/app-logger';

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
        const result = await ExpenseService.listExpenses(tenantId, req.query || {});
        return reply.status(200).send({
          success: true,
          message: 'Daftar pengeluaran operasional koperasi',
          data: result
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[ExpenseRoutes] Gagal memuat daftar pengeluaran');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal memuat daftar pengeluaran operasional'
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
        const body = req.body || {};

        if (!body.categoryCode) {
          return reply.status(400).send({
            success: false,
            message: 'Kategori beban operasional wajib dipilih'
          });
        }

        if (!body.amount || Number(body.amount) <= 0) {
          return reply.status(400).send({
            success: false,
            message: 'Nominal pengeluaran harus lebih besar dari Rp 0'
          });
        }

        if (!body.description || !body.description.trim()) {
          return reply.status(400).send({
            success: false,
            message: 'Keterangan pengeluaran operasional wajib diisi'
          });
        }

        const created = await ExpenseService.createExpense(tenantId, body, userId);
        broadcastCoopUpdate(req, 'EXPENSE_CREATED', { id: created.id, voucherNumber: created.voucherNumber, amount: created.amount });

        return reply.status(201).send({
          success: true,
          message: 'Pengeluaran operasional berhasil dicatat dan dibukukan ke Laporan Keuangan',
          data: created
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[ExpenseRoutes] Gagal mencatat pengeluaran operasional');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal mencatat pengeluaran operasional'
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
}
