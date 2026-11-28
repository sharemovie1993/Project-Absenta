import { z } from 'zod';
import { periodeOperasionalKbmService } from '../services/periode-kbm.service';
import { appLogger } from '@/utils/app-logger';

const createPeriodeSchema = z.object({
  tahun_pelajaran_id: z.string().optional(),
  semester_id: z.string().optional().nullable(),
  nama: z.string().min(1, 'Nama periode wajib diisi').max(120),
  tipe: z.enum(['PKL', 'KBM_BLOK', 'NON_KBM']),
  kelompok_aktif: z.enum(['PRODUKTIF', 'UMUM', 'MUATAN_LOKAL']).optional().nullable(),
  tanggal_mulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
  tanggal_selesai: z.string().min(1, 'Tanggal selesai wajib diisi'),
  target_semua_kelas: z.boolean().optional().default(false),
  target_kelas_ids: z.array(z.string()).optional().default([]),
  keterangan: z.string().optional().nullable(),
  aktif: z.boolean().optional(),
});

const updatePeriodeSchema = createPeriodeSchema.partial();

export const periodeOperasionalKbmController = {
  async getAll(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.dataScope?.tenantId || request.user?.tenantId;
      const { tahun_pelajaran_id, tipe, aktif } = request.query || {};
      const result = await periodeOperasionalKbmService.getAll(tenantId, {
        tahun_pelajaran_id,
        tipe,
        aktifOnly: aktif === 'true',
      });
      return reply.status(200).send({
        success: true,
        data: result.items,
        cbt_synced_events: result.cbt_synced_events,
      });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error fetching periode operasional KBM');
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async create(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.dataScope?.tenantId || request.user?.tenantId;
      const userId = request.user?.id || request.user?.userId || 'system';
      const parsed = createPeriodeSchema.parse(request.body || {});
      const data = await periodeOperasionalKbmService.create(tenantId, userId, parsed);
      return reply.status(201).send({ success: true, message: 'Periode operasional KBM berhasil disimpan', data });
    } catch (error: any) {
      const zodIssue = error?.issues?.[0]?.message;
      return reply.status(400).send({ success: false, message: zodIssue || error.message });
    }
  },

  async update(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.dataScope?.tenantId || request.user?.tenantId;
      const { id } = request.params as { id: string };
      const parsed = updatePeriodeSchema.parse(request.body || {});
      const data = await periodeOperasionalKbmService.update(tenantId, id, parsed);
      return reply.status(200).send({ success: true, message: 'Periode operasional KBM berhasil diperbarui', data });
    } catch (error: any) {
      const zodIssue = error?.issues?.[0]?.message;
      return reply.status(400).send({ success: false, message: zodIssue || error.message });
    }
  },

  async delete(request: any, reply: any) {
    try {
      const tenantId = request.tenantId || request.dataScope?.tenantId || request.user?.tenantId;
      const { id } = request.params as { id: string };
      await periodeOperasionalKbmService.delete(tenantId, id);
      return reply.status(200).send({ success: true, message: 'Periode operasional KBM berhasil dihapus' });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },
};
