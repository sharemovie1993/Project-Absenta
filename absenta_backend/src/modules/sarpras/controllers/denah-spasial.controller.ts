import { DenahSpasialService } from '../services/denah-spasial.service';

function resolveTenantId(request: any): string {
  const tid = request.tenantId || request.user?.tenantId || request.user?.tenant_id;
  if (!tid) {
    throw new Error('Tenant ID tidak valid atau belum terautentikasi');
  }
  return tid;
}

export class DenahSpasialController {
  static async list(request: any, reply: any) {
    try {
      const tenantId = resolveTenantId(request);
      const { tipe, event_cbt_id, gedung, lantai } = request.query || {};
      const data = await DenahSpasialService.list(tenantId, {
        tipe,
        event_cbt_id,
        gedung,
        lantai: lantai ? Number(lantai) : undefined,
      });
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  static async getById(request: any, reply: any) {
    try {
      const tenantId = resolveTenantId(request);
      const { id } = request.params;
      const data = await DenahSpasialService.getById(tenantId, id);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(404).send({ success: false, message: error.message });
    }
  }

  static async create(request: any, reply: any) {
    try {
      const tenantId = resolveTenantId(request);
      const data = await DenahSpasialService.create(tenantId, request.body);
      return reply.status(201).send({ success: true, message: 'Denah spasial berhasil disimpan', data });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  static async update(request: any, reply: any) {
    try {
      const tenantId = resolveTenantId(request);
      const { id } = request.params;
      const data = await DenahSpasialService.update(tenantId, id, request.body);
      return reply.status(200).send({ success: true, message: 'Denah spasial berhasil diperbarui', data });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  static async delete(request: any, reply: any) {
    try {
      const tenantId = resolveTenantId(request);
      const { id } = request.params;
      await DenahSpasialService.delete(tenantId, id);
      return reply.status(200).send({ success: true, message: 'Denah spasial berhasil dihapus' });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  static async clone(request: any, reply: any) {
    try {
      const tenantId = resolveTenantId(request);
      const { id } = request.params;
      const { nama_denah, tipe, event_cbt_id } = request.body || {};
      const data = await DenahSpasialService.clone(tenantId, id, {
        nama_denah,
        tipe,
        event_cbt_id,
      });
      return reply.status(201).send({ success: true, message: 'Denah spasial berhasil dikloning', data });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }
}
