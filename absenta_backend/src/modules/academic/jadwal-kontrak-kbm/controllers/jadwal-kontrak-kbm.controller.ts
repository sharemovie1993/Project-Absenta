import { jadwalKontrakKbmService } from '../services/jadwal-kontrak-kbm.service';

export class JadwalKontrakKbmController {
  async list(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const { tahun_pelajaran_id, semester_id, kelas_id, guru_id, mapel_id, search } = request.query as any;
      const data = await jadwalKontrakKbmService.list(tenantId, {
        tahun_pelajaran_id, semester_id, kelas_id, guru_id, mapel_id, search,
      });
      return reply.send({ success: true, message: 'OK', data, total: data.length });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  }

  async update(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const { id } = request.params as any;
      const body = request.body as any;
      const updated = await jadwalKontrakKbmService.update(id, tenantId, body);
      return reply.send({ success: true, message: 'Kontrak KBM berhasil diperbarui.', data: updated });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  }

  async remove(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const { id } = request.params as any;
      await jadwalKontrakKbmService.delete(id, tenantId);
      return reply.send({ success: true, message: 'Kontrak KBM berhasil dihapus.' });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  }

  async summary(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const { tahun_pelajaran_id, semester_id } = request.query as any;
      const data = await jadwalKontrakKbmService.getSummary(tenantId, tahun_pelajaran_id, semester_id);
      return reply.send({ success: true, message: 'OK', data });
    } catch (err: any) {
      return reply.status(500).send({ success: false, message: err.message });
    }
  }
}

export const jadwalKontrakKbmController = new JadwalKontrakKbmController();
