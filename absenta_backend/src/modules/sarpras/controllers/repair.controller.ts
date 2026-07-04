import { RepairService } from '../services/repair.service';
import { z } from 'zod';
import { sarprasAssetRepairSchema, updateSarprasAssetRepairSchema } from '../services/sarpras.schema';

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
      const parsed = sarprasAssetRepairSchema.parse(request.body);
      const userId = (request.user as any).id || (request.user as any).userId;
      const body = {
        asset_id: parsed.asset_id,
        teknisi: parsed.teknisi,
        biaya: parsed.biaya,
        deskripsi: parsed.deskripsi,
        foto_kerusakan: parsed.foto_kerusakan
      };
      const data = await RepairService.createRepair(request.tenantId!, body, request.organizationalScope, userId);
      return reply.status(201).send({ success: true, message: 'Data perbaikan berhasil dibuat', data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, message: error.errors.map(e => e.message).join(', '), errors: error.errors });
      }
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updateRepair(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const parsed = updateSarprasAssetRepairSchema.parse(request.body);
      const userId = (request.user as any).id || (request.user as any).userId;
      const body = {
        asset_id: parsed.asset_id,
        teknisi: parsed.teknisi,
        biaya: parsed.biaya,
        deskripsi: parsed.deskripsi,
        tanggal_selesai: parsed.tanggal_selesai,
        status: parsed.status,
        foto_kerusakan: parsed.foto_kerusakan
      };
      const data = await RepairService.updateRepair(request.tenantId!, id, body, request.organizationalScope, userId);
      return reply.status(200).send({ success: true, message: 'Data perbaikan berhasil diperbarui', data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ success: false, message: error.errors.map(e => e.message).join(', '), errors: error.errors });
      }
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getRepairsCalendar(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await RepairService.getRepairsCalendar(request.tenantId!, request.organizationalScope);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}
