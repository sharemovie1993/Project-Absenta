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
  dataScope?: any;
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
      }, request.dataScope);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getRepairStats(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await RepairService.getRepairStats(request.tenantId!, request.dataScope);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async createRepair(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await RepairService.createRepair(request.tenantId!, request.body, request.dataScope);
      return reply.status(201).send({ success: true, message: 'Data perbaikan berhasil dibuat', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updateRepair(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const data = await RepairService.updateRepair(request.tenantId!, id, request.body, request.dataScope);
      return reply.status(200).send({ success: true, message: 'Data perbaikan berhasil diperbarui', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}
