import { BahanAjarService } from '../services/bahan-ajar.service';
import { prisma } from '../../../utils/prisma';

export class BahanAjarController {
  /**
   * List Bahan Ajar Presets (Platform-level)
   */
  static async listPresets(request: any, reply: any) {
    try {
      const query = request.query || {};
      const data = await BahanAjarService.listPresets({
        fase: query.fase,
        search: query.search,
        kode_mapel_ref: query.kode_mapel_ref
      });
      return { success: true, data };
    } catch (error: any) {
      reply.status(500);
      return { success: false, message: error.message || 'Gagal mengambil preset bahan ajar' };
    }
  }

  /**
   * Get single Preset by ID
   */
  static async getPresetById(request: any, reply: any) {
    try {
      const { id } = request.params;
      const data = await BahanAjarService.getPresetById(id);
      return { success: true, data };
    } catch (error: any) {
      reply.status(404);
      return { success: false, message: error.message || 'Preset tidak ditemukan' };
    }
  }

  /**
   * Get Bahan Ajar content for Reader by Perangkat ID
   */
  static async getReaderContent(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = user?.tenant_id || user?.tenantId || request.tenantId || request.tenant_id;
      const { id } = request.params;
      const query = request.query || {};
      const data = await BahanAjarService.getBahanAjarForReader(tenantId, id, {
        fase: query.fase,
        tingkat: query.tingkat ? Number(query.tingkat) : undefined,
        mapel_nama: query.mapel_nama,
        mapel_id: query.mapel_id
      });
      return { success: true, data };
    } catch (error: any) {
      reply.status(404);
      return { success: false, message: error.message || 'Konten bahan ajar tidak ditemukan' };
    }
  }

  /**
   * Save structured content to PerangkatAjar
   */
  static async saveStructuredKonten(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = user?.tenant_id || user?.tenantId || request.tenantId || request.tenant_id;
      const { id } = request.params;
      const body = request.body || {};

      let resolvedGuruId = body.metadata?.guru_id || body.guru_id;
      if (!resolvedGuruId && user?.id) {
        const guruRecord = await prisma.guru.findFirst({
          where: { user_id: user.id, tenant_id: tenantId }
        });
        if (guruRecord) resolvedGuruId = guruRecord.id;
      }

      const meta = {
        ...(body.metadata || body),
        guru_id: resolvedGuruId
      };

      const data = await BahanAjarService.saveStructuredKonten(tenantId, id, body.konten_json, meta);
      return { success: true, message: 'Konten bahan ajar berhasil disimpan', data };
    } catch (error: any) {
      reply.status(error.statusCode || 500);
      return { success: false, message: error.message || 'Gagal menyimpan konten bahan ajar' };
    }
  }

  /**
   * Import Preset to personal PerangkatAjar
   */
  static async importPreset(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = user?.tenant_id || user?.tenantId || request.tenantId || request.tenant_id;
      const { id } = request.params;
      const body = request.body || {};

      let targetGuruId = body.guru_id;
      if (!targetGuruId && user?.id) {
        const guruRecord = await prisma.guru.findFirst({
          where: { user_id: user.id, tenant_id: tenantId }
        });
        if (guruRecord) targetGuruId = guruRecord.id;
      }

      if (!targetGuruId) {
        reply.status(400);
        return { success: false, message: 'Guru ID wajib ditentukan' };
      }

      if (!body.mapel_id) {
        reply.status(400);
        return { success: false, message: 'Mata pelajaran tujuan wajib dipilih' };
      }

      const data = await BahanAjarService.importPresetToPerangkat(tenantId, id, {
        guru_id: targetGuruId,
        mapel_id: body.mapel_id,
        tahun_pelajaran_id: body.tahun_pelajaran_id,
        semester_id: body.semester_id
      });

      return { success: true, message: 'Preset bahan ajar berhasil disalin ke modul ajar Anda! ✨', data };
    } catch (error: any) {
      reply.status(error.statusCode || 500);
      return { success: false, message: error.message || 'Gagal mengadopsi preset bahan ajar' };
    }
  }
}
