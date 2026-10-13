// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { AssetService } from './asset.service';
import { requireCapability } from '@/middlewares/requireCapability';
import { mockTenant } from '../../../utils/mocks';
import { appLogger } from '@/utils/app-logger';

export default async function assetRoutes(fastify: FastifyInstance) {
  const getTenantId = (req: any) => {
    return (req.user?.tenant_id || req.user?.tenantId) || mockTenant.id;
  };

  // GET /cooperative/assets (List aset dengan filter & summary)
  fastify.get(
    '/',
    { preHandler: [requireCapability(['cooperative.assets.view.list', 'cooperative.dashboard.view.overview'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const result = await AssetService.listAssets(tenantId, req.query || {});
        return reply.status(200).send({
          success: true,
          message: 'Daftar inventaris aset koperasi',
          data: result
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[AssetRoutes] Gagal memuat daftar aset');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal memuat inventaris aset koperasi'
        });
      }
    }
  );

  // GET /cooperative/assets/:id (Detail satu aset)
  fastify.get(
    '/:id',
    { preHandler: [requireCapability(['cooperative.assets.view.detail', 'cooperative.assets.view.list', 'cooperative.dashboard.view.overview'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { id } = req.params as { id: string };
        const asset = await AssetService.getAssetById(tenantId, id);
        if (!asset) {
          return reply.status(404).send({
            success: false,
            message: 'Aset koperasi tidak ditemukan'
          });
        }
        return reply.status(200).send({
          success: true,
          message: 'Detail aset koperasi',
          data: asset
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[AssetRoutes] Gagal memuat detail aset');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal memuat detail aset koperasi'
        });
      }
    }
  );

  // POST /cooperative/assets (Daftarkan aset baru)
  fastify.post(
    '/',
    { preHandler: [requireCapability(['cooperative.assets.create', 'cooperative.dashboard.view.overview', 'cooperative.store.products.create'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const body = req.body as any;

        if (!body.name || !body.location || body.purchasePrice === undefined) {
          return reply.status(400).send({
            success: false,
            message: 'Nama aset, lokasi, dan harga perolehan wajib diisi'
          });
        }

        const newAsset = await AssetService.createAsset(tenantId, body);
        return reply.status(201).send({
          success: true,
          message: 'Aset koperasi berhasil didaftarkan',
          data: newAsset
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[AssetRoutes] Gagal mendaftarkan aset');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal mendaftarkan aset koperasi'
        });
      }
    }
  );

  // PUT /cooperative/assets/:id (Perbarui aset)
  fastify.put(
    '/:id',
    { preHandler: [requireCapability(['cooperative.assets.update', 'cooperative.dashboard.view.overview', 'cooperative.store.products.create'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { id } = req.params as { id: string };
        const updated = await AssetService.updateAsset(tenantId, id, req.body as any);
        return reply.status(200).send({
          success: true,
          message: 'Data aset berhasil diperbarui',
          data: updated
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[AssetRoutes] Gagal memperbarui aset');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal memperbarui data aset koperasi'
        });
      }
    }
  );

  // DELETE /cooperative/assets/:id (Hapus aset)
  fastify.delete(
    '/:id',
    { preHandler: [requireCapability(['cooperative.assets.delete', 'cooperative.dashboard.view.overview', 'cooperative.store.products.create'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const { id } = req.params as { id: string };
        await AssetService.deleteAsset(tenantId, id);
        return reply.status(200).send({
          success: true,
          message: 'Aset koperasi berhasil dihapus'
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[AssetRoutes] Gagal menghapus aset');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal menghapus aset koperasi'
        });
      }
    }
  );
}
