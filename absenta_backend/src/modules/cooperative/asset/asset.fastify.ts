// @ts-nocheck
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AssetService } from './asset.service';
import { requireCapability } from '@/middlewares/requireCapability';
import { mockTenant } from '../../../utils/mocks';
import { appLogger } from '@/utils/app-logger';

// ─── ZOD SCHEMAS (Phase 4 Hardening: Anti-DoS, Strict Typing & Guard) ───────
const listAssetQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  category: z.string().max(50).optional(),
  condition: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
  search: z.string().max(100).optional(),
});

const createAssetSchema = z.object({
  name: z.string().min(1, 'Nama aset wajib diisi').max(150, 'Nama aset maksimal 150 karakter'),
  category: z.enum(['EQUIPMENT', 'DISPLAY_FURNITURE', 'COOLING_APPLIANCE', 'BUILDING_FACILITY', 'VEHICLE', 'OTHER']).optional().default('EQUIPMENT'),
  location: z.string().min(1, 'Lokasi aset wajib diisi').max(100, 'Lokasi maksimal 100 karakter'),
  purchaseDate: z.string().or(z.date()).optional(),
  purchasePrice: z.coerce.number().min(0, 'Harga perolehan tidak boleh negatif'),
  condition: z.enum(['GOOD', 'FAIR', 'DAMAGED', 'DISPOSED']).optional().default('GOOD'),
  status: z.enum(['IN_USE', 'IN_REPAIR', 'IDLE', 'WRITTEN_OFF']).optional().default('IN_USE'),
  usefulLifeMonths: z.coerce.number().int().min(1, 'Masa manfaat minimal 1 bulan').max(600, 'Masa manfaat maksimal 600 bulan (50 tahun)').optional().default(48),
  salvageValue: z.coerce.number().min(0, 'Nilai residu tidak boleh negatif').optional().default(0),
  serialNumber: z.string().max(100).optional().nullable(),
  picName: z.string().max(100).optional().nullable(),
  photoUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  notes: z.string().max(500).optional().nullable(),
  fundingSource: z.enum(['CASH', 'RESERVE_CAPITAL']).optional().default('CASH'),
  postToLedger: z.boolean().optional().default(true),
});

const updateAssetSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  category: z.enum(['EQUIPMENT', 'DISPLAY_FURNITURE', 'COOLING_APPLIANCE', 'BUILDING_FACILITY', 'VEHICLE', 'OTHER']).optional(),
  location: z.string().min(1).max(100).optional(),
  purchaseDate: z.string().or(z.date()).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  condition: z.enum(['GOOD', 'FAIR', 'DAMAGED', 'DISPOSED']).optional(),
  status: z.enum(['IN_USE', 'IN_REPAIR', 'IDLE', 'WRITTEN_OFF']).optional(),
  usefulLifeMonths: z.coerce.number().int().min(1).max(600).optional(),
  salvageValue: z.coerce.number().min(0).optional(),
  serialNumber: z.string().max(100).optional().nullable(),
  picName: z.string().max(100).optional().nullable(),
  photoUrl: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const runDepreciationSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

const depreciationStatusQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export default async function assetRoutes(fastify: FastifyInstance) {
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
      // Broadcast ke cooperative workspace room dan global listeners
      io.emit('cooperative_sync', broadcastPayload);
      io.to('cooperative_workspace').emit('cooperative_sync', broadcastPayload);
      io.emit('coop_asset_update', broadcastPayload);
      io.to('cooperative_workspace').emit('coop_asset_update', broadcastPayload);
      io.emit('coop_accounting_update', broadcastPayload);
      io.to('cooperative_workspace').emit('coop_accounting_update', broadcastPayload);
    }
  };

  // GET /cooperative/assets (List aset dengan filter & summary)
  fastify.get(
    '/',
    { preHandler: [requireCapability(['cooperative.assets.view.list', 'cooperative.dashboard.view.overview'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const parseResult = listAssetQuerySchema.safeParse(req.query || {});
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Parameter kueri tidak valid',
            errors: parseResult.error.format()
          });
        }

        const result = await AssetService.listAssets(tenantId, parseResult.data);
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

  // GET /cooperative/assets/depreciation-status (Cek status penyusutan bulan berjalan)
  // Catatan: Ditempatkan sebelum /:id agar tidak tertimpa parameter id
  fastify.get(
    '/depreciation-status',
    { preHandler: [requireCapability(['cooperative.assets.view.list', 'cooperative.dashboard.view.overview', 'cooperative.reports.view.financial'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const parseResult = depreciationStatusQuerySchema.safeParse(req.query || {});
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Parameter periode tidak valid',
            errors: parseResult.error.format()
          });
        }

        const { year, month } = parseResult.data;
        const result = await AssetService.getDepreciationStatus(tenantId, year, month);
        return reply.status(200).send({
          success: true,
          message: 'Status penyusutan aset koperasi',
          data: result
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[AssetRoutes] Gagal memuat status penyusutan aset');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal memuat status penyusutan aset'
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
        const parseResult = createAssetSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Validasi pendaftaran aset gagal',
            errors: parseResult.error.format()
          });
        }

        const newAsset = await AssetService.createAsset(tenantId, parseResult.data);
        const userId = req.user?.id || req.user?.sub || 'system';
        appLogger.info({ tenantId, userId, assetId: newAsset.id, code: newAsset.code }, '[Audit] Aset koperasi berhasil didaftarkan');
        broadcastCoopUpdate(req, 'COOP_ASSET_CREATED', newAsset);

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

        const parseResult = updateAssetSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Validasi pembaruan aset gagal',
            errors: parseResult.error.format()
          });
        }

        const updated = await AssetService.updateAsset(tenantId, id, parseResult.data);
        const userId = req.user?.id || req.user?.sub || 'system';
        appLogger.info({ tenantId, userId, assetId: id, code: updated.code }, '[Audit] Data aset koperasi berhasil diperbarui');
        broadcastCoopUpdate(req, 'COOP_ASSET_UPDATED', updated);

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
        const userId = req.user?.id || req.user?.sub || 'system';
        appLogger.info({ tenantId, userId, assetId: id }, '[Audit] Aset koperasi berhasil dihapus');
        broadcastCoopUpdate(req, 'COOP_ASSET_DELETED', { id });

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

  // POST /cooperative/assets/sync-accounting (Sinkronisasi aset eksisting ke Neraca Akuntansi)
  fastify.post(
    '/sync-accounting',
    { preHandler: [requireCapability(['cooperative.assets.create', 'cooperative.dashboard.view.overview', 'cooperative.reports.view.financial'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const result = await AssetService.syncExistingAssetsToJournal(tenantId);
        const userId = req.user?.id || req.user?.sub || 'system';
        appLogger.info({ tenantId, userId, syncedCount: result.syncedCount, totalSyncedValue: result.totalSyncedValue }, '[Audit] Selesai sinkronisasi aset eksisting ke Neraca Keuangan');
        broadcastCoopUpdate(req, 'COOP_ASSET_SYNCED', result);

        return reply.status(200).send({
          success: true,
          message: `Berhasil menyinkronkan ${result.syncedCount} aset ke Neraca Keuangan (Total: Rp ${result.totalSyncedValue.toLocaleString('id-ID')})`,
          data: result
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[AssetRoutes] Gagal menyinkronkan aset ke neraca');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal menyinkronkan aset ke neraca'
        });
      }
    }
  );

  // POST /cooperative/assets/depreciate (Eksekusi penyusutan aset bulanan)
  fastify.post(
    '/depreciate',
    { preHandler: [requireCapability(['cooperative.assets.create', 'cooperative.dashboard.view.overview', 'cooperative.reports.view.financial'])] },
    async (req: any, reply: any) => {
      try {
        const tenantId = getTenantId(req);
        const parseResult = runDepreciationSchema.safeParse(req.body || {});
        if (!parseResult.success) {
          return reply.status(400).send({
            success: false,
            message: parseResult.error.issues[0]?.message || 'Parameter depresiasi tidak valid',
            errors: parseResult.error.format()
          });
        }

        const now = new Date();
        const y = parseResult.data.year || now.getFullYear();
        const m = parseResult.data.month || now.getMonth() + 1;

        const result = await AssetService.runMonthlyDepreciation(tenantId, y, m);
        const userId = req.user?.id || req.user?.sub || 'system';
        appLogger.info({ tenantId, userId, period: result.period, voucherNumber: result.voucherNumber, totalDepreciation: result.totalDepreciation }, '[Audit] Penyusutan bulanan aset koperasi berhasil dibukukan');
        broadcastCoopUpdate(req, 'COOP_ASSET_DEPRECIATED', result);

        return reply.status(200).send({
          success: true,
          message: `Penyusutan periode ${result.period} berhasil dibukukan (${result.assetCount} aset, Total Beban Susut: Rp ${result.totalDepreciation.toLocaleString('id-ID')})`,
          data: result
        });
      } catch (error: any) {
        appLogger.error({ err: error }, '[AssetRoutes] Gagal menjalankan penyusutan aset');
        return reply.status(500).send({
          success: false,
          message: error.message || 'Gagal menjalankan penyusutan aset'
        });
      }
    }
  );
}
