import { appLogger } from '@/utils/app-logger';
import { programKeahlianService } from '../services/program-keahlian.service';
import { createProgramKeahlianSchema, updateProgramKeahlianSchema } from '../services/program-keahlian.schema';

export const programKeahlianController = {
  async getAll(request: any, reply: any) {
    try {
      const user = request.user!;
      const { page = 1, limit = 100, search = '' } = request.query || {};
      const result = await programKeahlianService.getAllProgramKeahlian(
        user.roleName,
        user.tenantId,
        { page: Number(page), limit: Number(limit), search: String(search) }
      );
      return reply.status(200).send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err: any) {
      appLogger.error({ err: err }, 'Controller error');
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async getById(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params as { id: string };
      const result = await programKeahlianService.getProgramKeahlianById(id, user.roleName, user.tenantId);
      if (!result) return reply.status(404).send({ success: false, message: 'Program Keahlian tidak ditemukan' });
      return reply.status(200).send({ success: true, data: result });
    } catch (err: any) {
      appLogger.error({ err: err }, 'Controller error');
      return reply.status(500).send({ success: false, message: err.message });
    }
  },

  async create(request: any, reply: any) {
    try {
      const user = request.user!;
      if (!user.tenantId) return reply.status(403).send({ success: false, message: 'Tenant ID diperlukan' });
      const parsed = createProgramKeahlianSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ success: false, message: parsed.error.issues[0].message });
      const result = await programKeahlianService.createProgramKeahlian(parsed.data, user.tenantId);
      return reply.status(201).send({ success: true, data: result, message: 'Program Keahlian berhasil ditambahkan' });
    } catch (err: any) {
      appLogger.error({ err: err }, 'Controller error');
      return reply.status(400).send({ success: false, message: err.message });
    }
  },

  async update(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params as { id: string };
      const parsed = updateProgramKeahlianSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ success: false, message: parsed.error.issues[0].message });
      const result = await programKeahlianService.updateProgramKeahlian(id, parsed.data, user.roleName, user.tenantId);
      return reply.status(200).send({ success: true, data: result, message: 'Program Keahlian berhasil diperbarui' });
    } catch (err: any) {
      appLogger.error({ err: err }, 'Controller error');
      return reply.status(400).send({ success: false, message: err.message });
    }
  },

  async remove(request: any, reply: any) {
    try {
      const user = request.user!;
      const { id } = request.params as { id: string };
      await programKeahlianService.removeProgramKeahlian(id, user.roleName, user.tenantId);
      return reply.status(200).send({ success: true, message: 'Program Keahlian berhasil dihapus' });
    } catch (err: any) {
      appLogger.error({ err: err }, 'Controller error');
      return reply.status(400).send({ success: false, message: err.message });
    }
  },
};
