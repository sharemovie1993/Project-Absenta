// @ts-nocheck
import { appLogger } from '@/utils/app-logger';
import { z } from 'zod';
import { AccountService } from './account.service';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';

const getTenantId = (req: any) => {
  return ((req.user as any)?.tenant_id || (req.user as any)?.tenantId) || mockTenant.id;
};

// ─── ZOD SCHEMAS ────────────────────────────────────────────────────────────
const createAccountSchema = z.object({
  code: z.string().min(1, 'Kode akun wajib diisi').max(20, 'Kode akun maksimal 20 karakter'),
  name: z.string().min(2, 'Nama akun minimal 2 karakter').max(100, 'Nama akun maksimal 100 karakter'),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  isHeader: z.boolean().optional().default(false),
  parentId: z.string().uuid().nullable().optional(),
});

const updateAccountSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(2).max(100).optional(),
  isHeader: z.boolean().optional(),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export default async function accountRoutes(fastify: any) {
  // 1. GET /cooperative/accounts — Ambil daftar pohon akun COA
  fastify.get('/', {
    preHandler: [requireCapability('cooperative.reports.view.financial')]
  }, async (req: any, reply: any) => {
    try {
      const tenantId = getTenantId(req);
      const isTree = req.query.tree === 'true' || req.query.tree === true;
      const search = req.query.search ? String(req.query.search) : undefined;
      const type = req.query.type ? String(req.query.type) : undefined;

      const result = await AccountService.listAccounts(tenantId, { tree: isTree, search, type });
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      appLogger.error({ err: error }, '[AccountRoutes] Gagal memuat daftar akun');
      return reply.status(500).send({ success: false, message: error.message });
    }
  });

  // 2. POST /cooperative/accounts — Buat akun baru (Header atau Detail)
  fastify.post('/', {
    preHandler: [requireCapability('cooperative.reports.view.financial')]
  }, async (req: any, reply: any) => {
    try {
      const tenantId = getTenantId(req);
      const parsed = createAccountSchema.parse(req.body);
      const created = await AccountService.createAccount(tenantId, parsed);
      return reply.status(201).send({ success: true, data: created, message: 'Akun berhasil dibuat' });
    } catch (error: any) {
      appLogger.error({ err: error }, '[AccountRoutes] Gagal membuat akun');
      const status = error instanceof z.ZodError ? 400 : 400;
      const message = error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message;
      return reply.status(status).send({ success: false, message });
    }
  });

  // 3. PUT /cooperative/accounts/:id — Perbarui akun
  fastify.put('/:id', {
    preHandler: [requireCapability('cooperative.reports.view.financial')]
  }, async (req: any, reply: any) => {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;
      const parsed = updateAccountSchema.parse(req.body);
      const updated = await AccountService.updateAccount(tenantId, id, parsed);
      return reply.send({ success: true, data: updated, message: 'Akun berhasil diperbarui' });
    } catch (error: any) {
      appLogger.error({ err: error }, '[AccountRoutes] Gagal memperbarui akun');
      const status = error instanceof z.ZodError ? 400 : 400;
      const message = error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : error.message;
      return reply.status(status).send({ success: false, message });
    }
  });

  // 4. DELETE /cooperative/accounts/:id — Hapus akun
  fastify.delete('/:id', {
    preHandler: [requireCapability('cooperative.reports.view.financial')]
  }, async (req: any, reply: any) => {
    try {
      const tenantId = getTenantId(req);
      const { id } = req.params;
      const result = await AccountService.deleteAccount(tenantId, id);
      return reply.send(result);
    } catch (error: any) {
      appLogger.error({ err: error }, '[AccountRoutes] Gagal menghapus akun');
      return reply.status(400).send({ success: false, message: error.message });
    }
  });

  // 5. POST /cooperative/accounts/ensure-defaults — Sinkronisasi akun standar hierarki
  fastify.post('/ensure-defaults', {
    preHandler: [requireCapability('cooperative.reports.view.financial')]
  }, async (req: any, reply: any) => {
    try {
      const tenantId = getTenantId(req);
      await AccountService.ensureDefaultHierarchy(tenantId);
      return reply.send({ success: true, message: 'Struktur bagan akun standar berhasil disinkronisasi' });
    } catch (error: any) {
      appLogger.error({ err: error }, '[AccountRoutes] Gagal sinkronisasi akun standar');
      return reply.status(500).send({ success: false, message: error.message });
    }
  });
}
