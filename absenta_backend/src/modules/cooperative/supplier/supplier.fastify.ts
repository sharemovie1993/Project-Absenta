// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SupplierService } from './supplier.service';
import { requireCapability } from '@/middlewares/requireCapability';
import { mockTenant } from '../../../utils/mocks';
import { appLogger } from '@/utils/app-logger';

// ─── ZOD SCHEMAS (Phase 4 Hardening: Anti-DoS & Input Validation) ─────────────
const listSupplierQuerySchema = z.object({
  includeInactive: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional().default(false),
  search: z.string().max(100).optional(),
});

const createSupplierSchema = z.object({
  name: z.string().min(2, 'Nama supplier minimal 2 karakter').max(150, 'Nama supplier maksimal 150 karakter'),
  contact: z.string().max(100, 'Kontak person maksimal 100 karakter').optional().nullable(),
  phone: z.string().max(30, 'Nomor telepon maksimal 30 karakter').optional().nullable(),
  email: z.string().email('Format email tidak valid').max(100).optional().nullable().or(z.literal('')),
  address: z.string().max(300, 'Alamat maksimal 300 karakter').optional().nullable(),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional().nullable(),
});

const updateSupplierSchema = z.object({
  name: z.string().min(2, 'Nama supplier minimal 2 karakter').max(150).optional(),
  contact: z.string().max(100).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email('Format email tidak valid').max(100).optional().nullable().or(z.literal('')),
  address: z.string().max(300).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export default async function supplierRoutes(fastify: FastifyInstance) {
  const getTenantId = (req: any) => {
    return (req.user?.tenant_id || req.user?.tenantId) || mockTenant.id;
  };

  const broadcastCoopUpdate = (req: any, type: string, payload: any = {}) => {
    const io = req.server?.io || fastify.io;
    if (io) {
      const broadcastPayload = {
        type,
        data: payload,
        timestamp: new Date().toISOString()
      };
      io.emit('cooperative_sync', broadcastPayload);
      io.to('cooperative_workspace').emit('cooperative_sync', broadcastPayload);
      io.emit('coop_supplier_update', broadcastPayload);
      io.to('cooperative_workspace').emit('coop_supplier_update', broadcastPayload);
    }
  };

  // GET /cooperative/suppliers
  fastify.get(
    '/',
    { preHandler: [requireCapability('cooperative.store.products.view.list')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const parseResult = listSupplierQuerySchema.safeParse(req.query || {});
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Parameter kueri tidak valid',
            errors: parseResult.error.format()
          });
        }

        const suppliers = await SupplierService.findAll(tenantId, parseResult.data.includeInactive);
        return reply.status(200).send({
          success: true,
          message: 'Daftar supplier koperasi',
          data: suppliers
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[SupplierRoutes] Gagal mengambil daftar supplier');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal mengambil daftar supplier'
        });
      }
    }
  );

  // GET /cooperative/suppliers/:id
  fastify.get(
    '/:id',
    { preHandler: [requireCapability('cooperative.store.products.view.list')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { id } = req.params as { id: string };
        const supplier = await SupplierService.findById(id, tenantId);
        if (!supplier) {
          return reply.status(404).send({
            success: false,
            message: 'Supplier tidak ditemukan'
          });
        }
        return reply.status(200).send({
          success: true,
          message: 'Detail supplier',
          data: supplier
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[SupplierRoutes] Gagal mengambil detail supplier');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal mengambil detail supplier'
        });
      }
    }
  );

  // POST /cooperative/suppliers
  fastify.post(
    '/',
    { preHandler: [requireCapability('cooperative.store.products.create')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const parseResult = createSupplierSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Validasi pendaftaran supplier gagal',
            errors: parseResult.error.format()
          });
        }

        const supplier = await SupplierService.create(tenantId, parseResult.data);
        const userId = req.user?.id || req.user?.sub || 'system';
        appLogger.info({ tenantId, userId, supplierId: supplier.id, name: supplier.name }, '[Audit] Supplier koperasi berhasil didaftarkan');
        broadcastCoopUpdate(req, 'COOP_SUPPLIER_CREATED', supplier);

        return reply.status(201).send({
          success: true,
          message: 'Supplier berhasil didaftarkan',
          data: supplier
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[SupplierRoutes] Gagal mendaftarkan supplier');
        if (error.code === 'P2002') {
          return reply.status(409).send({
            success: false,
            message: 'Supplier dengan nama ini sudah terdaftar di koperasi'
          });
        }
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal membuat supplier'
        });
      }
    }
  );

  // PUT /cooperative/suppliers/:id
  fastify.put(
    '/:id',
    { preHandler: [requireCapability('cooperative.store.products.update')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { id } = req.params as { id: string };

        const parseResult = updateSupplierSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Validasi pembaruan supplier gagal',
            errors: parseResult.error.format()
          });
        }

        const supplier = await SupplierService.update(id, tenantId, parseResult.data);
        const userId = req.user?.id || req.user?.sub || 'system';
        appLogger.info({ tenantId, userId, supplierId: id, name: supplier.name }, '[Audit] Data supplier koperasi berhasil diperbarui');
        broadcastCoopUpdate(req, 'COOP_SUPPLIER_UPDATED', supplier);

        return reply.status(200).send({
          success: true,
          message: 'Data supplier berhasil diperbarui',
          data: supplier
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[SupplierRoutes] Gagal mengupdate supplier');
        if (error.message === 'Supplier tidak ditemukan') {
          return reply.status(404).send({ success: false, message: error.message });
        }
        if (error.code === 'P2002') {
          return reply.status(409).send({
            success: false,
            message: 'Supplier dengan nama ini sudah terdaftar'
          });
        }
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal mengupdate supplier'
        });
      }
    }
  );

  // DELETE /cooperative/suppliers/:id (soft-delete: set isActive = false)
  fastify.delete(
    '/:id',
    { preHandler: [requireCapability('cooperative.store.products.delete')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { id } = req.params as { id: string };
        const deactivated = await SupplierService.delete(id, tenantId);
        const userId = req.user?.id || req.user?.sub || 'system';
        appLogger.info({ tenantId, userId, supplierId: id }, '[Audit] Supplier koperasi berhasil dinonaktifkan');
        broadcastCoopUpdate(req, 'COOP_SUPPLIER_DELETED', { id });

        return reply.status(200).send({
          success: true,
          message: 'Supplier berhasil dinonaktifkan',
          data: deactivated
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[SupplierRoutes] Gagal menghapus supplier');
        if (error.message === 'Supplier tidak ditemukan') {
          return reply.status(404).send({ success: false, message: error.message });
        }
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal menghapus supplier'
        });
      }
    }
  );
}
