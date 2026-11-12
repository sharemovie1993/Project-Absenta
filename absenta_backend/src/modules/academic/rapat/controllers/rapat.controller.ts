import { RapatService } from '../services/rapat.service';

export class RapatController {
  static async listRapat(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id || request.tenantId;
      const query = request.query as any;

      const result = await RapatService.listRapat(tenantId, query);
      return reply.code(200).send({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (err: any) {
      request.log?.error(err);
      return reply.code(400).send({ success: false, message: err.message || 'Gagal memuat daftar rapat.' });
    }
  }

  static async getRapatDetail(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id || request.tenantId;
      const { id } = request.params as { id: string };

      const detail = await RapatService.getRapatDetail(tenantId, id);
      return reply.code(200).send({
        success: true,
        data: detail,
      });
    } catch (err: any) {
      request.log?.error(err);
      return reply.code(404).send({ success: false, message: err.message || 'Rapat tidak ditemukan.' });
    }
  }

  static async createRapat(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id || request.tenantId;
      const userId = request.user?.id;
      const body = request.body as any;

      if (!body.judul_rapat || !body.tanggal_rapat || !body.jam_mulai) {
        return reply.code(400).send({
          success: false,
          message: 'Judul rapat, tanggal rapat, dan jam mulai wajib diisi.',
        });
      }

      const created = await RapatService.createRapat(tenantId, body, userId);
      return reply.code(201).send({
        success: true,
        message: 'Agenda rapat berhasil dibuat dan peserta awal telah dipetakan.',
        data: created,
      });
    } catch (err: any) {
      request.log?.error(err);
      return reply.code(400).send({ success: false, message: err.message || 'Gagal membuat rapat.' });
    }
  }

  static async updateRapat(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id || request.tenantId;
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const updated = await RapatService.updateRapat(tenantId, id, body);
      return reply.code(200).send({
        success: true,
        message: 'Data rapat dan notulen berhasil diperbarui.',
        data: updated,
      });
    } catch (err: any) {
      request.log?.error(err);
      return reply.code(400).send({ success: false, message: err.message || 'Gagal memperbarui rapat.' });
    }
  }

  static async deleteRapat(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id || request.tenantId;
      const { id } = request.params as { id: string };

      const res = await RapatService.deleteRapat(tenantId, id);
      return reply.code(200).send(res);
    } catch (err: any) {
      request.log?.error(err);
      return reply.code(400).send({ success: false, message: err.message || 'Gagal menghapus rapat.' });
    }
  }

  static async recordAttendance(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id || request.tenantId;
      const { id } = request.params as { id: string };
      const body = request.body as any;

      if (!body.pesertaId) {
        return reply.code(400).send({ success: false, message: 'ID peserta wajib diisi.' });
      }

      const res = await RapatService.recordAttendance(tenantId, id, {
        pesertaId: body.pesertaId,
        isHadir: body.isHadir ?? true,
        metodeKehadiran: body.metodeKehadiran,
        catatan: body.catatan,
      });

      return reply.code(200).send({
        success: true,
        message: 'Status kehadiran peserta berhasil dicatat.',
        data: res,
      });
    } catch (err: any) {
      request.log?.error(err);
      return reply.code(400).send({ success: false, message: err.message || 'Gagal mencatat kehadiran.' });
    }
  }

  static async getActiveMeeting(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id || request.tenantId;
      const role = request.user?.role;

      const active = await RapatService.getActiveMeeting(tenantId, role);
      return reply.code(200).send({
        success: true,
        data: active,
      });
    } catch (err: any) {
      request.log?.error(err);
      return reply.code(500).send({ success: false, message: 'Gagal memuat rapat aktif.' });
    }
  }

  static async publicSelfAttend(request: any, reply: any) {
    try {
      const tenantId = request.headers['x-tenant-id'] || (request.query as any)?.tenantId;
      const body = request.body as any;

      if (!tenantId) {
        return reply.code(400).send({ success: false, message: 'Tenant ID diperlukan untuk presensi rapat.' });
      }

      if (!body.qrToken || !body.nomorIdentitasOrId) {
        return reply.code(400).send({
          success: false,
          message: 'Token QR dan nomor identitas (NIP/NISN/NIK/Nama) wajib diisi.',
        });
      }

      const result = await RapatService.selfAttendViaQr(tenantId, {
        qrToken: body.qrToken,
        nomorIdentitasOrId: body.nomorIdentitasOrId,
      });

      return reply.code(200).send(result);
    } catch (err: any) {
      return reply.code(400).send({ success: false, message: err.message || 'Presensi gagal.' });
    }
  }

  static async getBeritaAcaraData(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id || request.tenantId;
      const { id } = request.params as { id: string };

      const data = await RapatService.getBeritaAcaraData(tenantId, id);
      return reply.code(200).send({
        success: true,
        data,
      });
    } catch (err: any) {
      return reply.code(400).send({ success: false, message: err.message || 'Gagal memuat berita acara.' });
    }
  }
}
