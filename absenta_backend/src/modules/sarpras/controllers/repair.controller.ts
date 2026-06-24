import { RepairService } from '../services/repair.service';

interface AuthenticatedRequest {
  user: {
    id: string;
    userId: string;
    tenantId: string | null;
    role: string;
  };
  tenantId: string | null;
  params: any;
  query: any;
  body: any;
  organizationalScope?: any;
}

export class RepairController {
  async getRepairs(request: AuthenticatedRequest, reply: any) {
    try {
      const { page, limit, status, asset_id } = request.query;
      const data = await RepairService.getRepairs(request.tenantId!, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as string,
        asset_id: asset_id as string
      }, request.organizationalScope);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getRepairStats(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await RepairService.getRepairStats(request.tenantId!, request.organizationalScope);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async createRepair(request: AuthenticatedRequest, reply: any) {
    try {
      const { asset_id, biaya } = request.body;
      if (!asset_id) {
        return reply.status(400).send({ success: false, message: 'asset_id wajib diisi' });
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(asset_id)) {
        return reply.status(400).send({ success: false, message: 'asset_id tidak valid' });
      }
      if (biaya !== undefined && (typeof biaya !== 'number' || biaya < 0)) {
        return reply.status(400).send({ success: false, message: 'Biaya perbaikan tidak boleh negatif' });
      }

      const userId = (request.user as any).id || (request.user as any).userId;
      const data = await RepairService.createRepair(request.tenantId!, request.body, request.organizationalScope, userId);
      return reply.status(201).send({ success: true, message: 'Data perbaikan berhasil dibuat', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updateRepair(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const { asset_id, biaya } = request.body;
      if (asset_id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(asset_id)) {
          return reply.status(400).send({ success: false, message: 'asset_id tidak valid' });
        }
      }
      if (biaya !== undefined && (typeof biaya !== 'number' || biaya < 0)) {
        return reply.status(400).send({ success: false, message: 'Biaya perbaikan tidak boleh negatif' });
      }
      const userId = (request.user as any).id || (request.user as any).userId;
      const data = await RepairService.updateRepair(request.tenantId!, id, request.body, request.organizationalScope, userId);
      return reply.status(200).send({ success: true, message: 'Data perbaikan berhasil diperbarui', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}
