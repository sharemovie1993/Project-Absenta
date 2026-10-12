import { pembinaUpacaraService } from '../services/pembina-upacara.service';
import { z } from 'zod';
import { appLogger } from '@/utils/app-logger';

export const createPembinaUpacaraSchema = z.object({
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran wajib dipilih'),
  semester_id: z.string().optional().nullable(),
  tanggal: z.string().min(1, 'Tanggal pelaksanaan wajib diisi'),
  guru_id: z.string().min(1, 'Guru pembina wajib dipilih'),
  guru_pengganti_id: z.string().optional().nullable(),
  kelas_petugas_id: z.string().optional().nullable(),
  jadwal_kegiatan_id: z.string().optional().nullable(),
  tema_amanat: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
  status: z.enum(['DIJADWALKAN', 'SELESAI', 'DIGANTIKAN', 'DIBATALKAN']).optional(),
});

export const updatePembinaUpacaraSchema = createPembinaUpacaraSchema.partial();

export const autoGenerateUpacaraSchema = z.object({
  tahun_pelajaran_id: z.string().min(1, 'Tahun pelajaran wajib dipilih'),
  semester_id: z.string().optional().nullable(),
  tanggal_mulai: z.string().optional(),
  tanggal_selesai: z.string().optional(),
  guru_ids: z.array(z.string()).optional(),
  kelas_ids: z.array(z.string()).optional(),
  rotasi_pairs: z.array(z.object({
    guru_id: z.string(),
    kelas_id: z.string().optional().nullable(),
  })).optional(),
  tema_presets: z.array(z.string()).optional(),
}).refine(data => (data.guru_ids && data.guru_ids.length > 0) || (data.rotasi_pairs && data.rotasi_pairs.length > 0), {
  message: 'Pilih minimal 1 guru pembina atau tentukan rotasi wali kelas',
});

export const pembinaUpacaraController = {
  async getAll(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { tahun_pelajaran_id, semester_id, startDate, endDate } = request.query || {};
      const data = await pembinaUpacaraService.getAll(scope, {
        tahun_pelajaran_id,
        semester_id,
        startDate,
        endDate,
      });
      return reply.status(200).send({
        success: true,
        message: 'Daftar jadwal pembina upacara berhasil dimuat',
        data,
      });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error fetching pembina upacara');
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async getDetail(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { id } = request.params as any;
      const data = await pembinaUpacaraService.getById(scope, id);
      if (!data) {
        return reply.status(404).send({ success: false, message: 'Jadwal pembina upacara tidak ditemukan' });
      }
      return reply.status(200).send({ success: true, message: 'Detail jadwal ditemukan', data });
    } catch (error: any) {
      return reply.status(404).send({ success: false, message: error.message });
    }
  },

  async create(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const userId = request.user?.id;
      const parsedBody = createPembinaUpacaraSchema.parse(request.body || {});
      const data = await pembinaUpacaraService.create(scope, parsedBody as any, userId);
      appLogger.info({ id: data.id }, 'Jadwal pembina upacara created');
      return reply.status(201).send({
        success: true,
        message: 'Jadwal pembina upacara berhasil disimpan',
        data,
      });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error creating pembina upacara');
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async update(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { id } = request.params as any;
      const parsedBody = updatePembinaUpacaraSchema.parse(request.body || {});
      const data = await pembinaUpacaraService.update(scope, id, parsedBody as any);
      return reply.status(200).send({
        success: true,
        message: 'Jadwal pembina upacara berhasil diperbarui',
        data,
      });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error updating pembina upacara');
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async delete(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { id } = request.params as any;
      await pembinaUpacaraService.delete(scope, id);
      return reply.status(200).send({
        success: true,
        message: 'Jadwal pembina upacara berhasil dihapus',
      });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error deleting pembina upacara');
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async autoGenerate(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const userId = request.user?.id;
      const parsedBody = autoGenerateUpacaraSchema.parse(request.body || {});
      const result = await pembinaUpacaraService.autoGenerate(scope, parsedBody as any, userId);
      return reply.status(200).send({
        success: true,
        message: `Berhasil membuat jadwal giliran pembina upacara untuk ${result.count} pekan.`,
        data: result,
      });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Error auto-generating pembina upacara');
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async getWaConfig(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const data = await pembinaUpacaraService.getWaNotifConfig(scope.tenantId);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async saveWaConfig(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const data = await pembinaUpacaraService.saveWaNotifConfig(scope.tenantId, request.body || {});
      return reply.status(200).send({
        success: true,
        message: 'Konfigurasi pengingat WhatsApp upacara berhasil disimpan',
        data,
      });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async getWaGroups(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { waGatewayService } = await import('@/services/wa-gateway.service');
      const force = request.query?.refresh === 'true';
      const groups = await waGatewayService.getParticipatingGroups(scope.tenantId, force).catch(() => []);
      return reply.status(200).send({ success: true, data: groups || [] });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async testSendWa(request: any, reply: any) {
    try {
      const scope = request.dataScope;
      const { targetGroupId } = request.body || {};
      const result = await pembinaUpacaraService.sendSeninGroupReminder(scope.tenantId, true, targetGroupId);
      return reply.status(200).send({ success: true, message: result.message });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },
};
