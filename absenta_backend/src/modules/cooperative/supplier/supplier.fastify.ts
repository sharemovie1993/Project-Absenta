// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { FastifyInstance } from 'fastify';
import { SupplierService } from './supplier.service';
import { requireCapability } from '@/middlewares/requireCapability';
import { mockTenant } from '../../../utils/mocks';

export default async function supplierRoutes(fastify: FastifyInstance) {

  const getTenantId = (req: any) => {
    return (req.user?.tenant_id || req.user?.tenantId) || mockTenant.id;
  };

  // GET /cooperative/suppliers
  fastify.get(
    '/',
    { preHandler: [requireCapability('cooperative.store.products.view.list')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const includeInactive = req.query?.includeInactive === 'true';
        const suppliers = await SupplierService.findAll(tenantId, includeInactive);
        return reply.status(200).send({ success: true, message: 'Daftar supplier', data: suppliers });
      } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
        reply.status(500).send({ success: false, message: error.message || 'Gagal mengambil daftar supplier'  });
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
          return reply.status(404).send({ success: false, message: 'Supplier tidak ditemukan'  });
        }
        return reply.status(200).send({ success: true, message: 'Detail supplier', data: supplier });
      } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
        reply.status(500).send({ success: false, message: error.message || 'Gagal mengambil detail supplier'  });
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
        const body = req.body as any;

        if (!body?.name || !body.name.trim()) {
          return reply.code(400).send({ message: 'Nama supplier wajib diisi' });
        }

        const supplier = await SupplierService.create(tenantId, {
          name: body.name,
          contact: body.contact,
          phone: body.phone,
          email: body.email,
          address: body.address,
          notes: body.notes
        });

        reply.code(201).send(supplier);
      } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
        if (error.code === 'P2002') {
          return reply.code(409).send({ message: 'Supplier dengan nama ini sudah terdaftar' });
        }
        reply.status(500).send({ success: false, message: error.message || 'Gagal membuat supplier'  });
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
        const body = req.body as any;

        const supplier = await SupplierService.update(id, tenantId, {
          name: body.name,
          contact: body.contact,
          phone: body.phone,
          email: body.email,
          address: body.address,
          notes: body.notes,
          isActive: body.isActive
        });

        return reply.status(200).send({ success: true, message: 'Detail supplier', data: supplier });
      } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
        if (error.message === 'Supplier tidak ditemukan') {
          return reply.code(404).send({ message: error.message });
        }
        if (error.code === 'P2002') {
          return reply.code(409).send({ message: 'Supplier dengan nama ini sudah terdaftar' });
        }
        reply.status(500).send({ success: false, message: error.message || 'Gagal mengupdate supplier'  });
      }
    }
  );

  // DELETE /cooperative/suppliers/:id  (soft-delete: set isActive = false)
  fastify.delete(
    '/:id',
    { preHandler: [requireCapability('cooperative.store.products.delete')] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { id } = req.params as { id: string };
        await SupplierService.delete(id, tenantId);
        return { success: true, message: 'Supplier berhasil dinonaktifkan' };
      } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
        if (error.message === 'Supplier tidak ditemukan') {
          return reply.code(404).send({ message: error.message });
        }
        reply.status(500).send({ success: false, message: error.message || 'Gagal menghapus supplier'  });
      }
    }
  );
}
