// @ts-nocheck
import { HubinService } from '../../services/hubin.service';
import { FastifyRequest, FastifyReply } from 'fastify';
import { appLogger } from '@/utils/app-logger';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import { 
  createPenempatanSchema, 
  updatePenempatanSchema, 
  bulkCreatePenempatanSchema 
} from '../../services/hubin.schema';

export class HubinPenempatanController {
  private hubinService = new HubinService();
  async getPenempatan(request: AuthenticatedRequest, reply: any) {
    try {
      const { search, page, limit, tahun_pelajaran_id, semester_id, status, mitra_id, pembimbing_id, kelas_id } = request.query;
      const data = await this.hubinService.getPenempatan(
        request.tenantId!, 
        request.user.id, 
        {
          search,
          page: page ? parseInt(page) : undefined,
          limit: limit ? parseInt(limit) : undefined,
          tahun_pelajaran_id: tahun_pelajaran_id || undefined,
          semester_id: semester_id || undefined,
          status: status || undefined,
          mitra_id: mitra_id || undefined,
          pembimbing_id: pembimbing_id || undefined,
          kelas_id: kelas_id || undefined
        },
        request.organizationalScope
      );
      return reply.status(200).send({ success: true, ...data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getMyPenempatan(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.getPenempatanBySiswa(request.tenantId!, request.user.id);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async createPenempatan(request: AuthenticatedRequest, reply: any) {
    try {
      const parsedBody = createPenempatanSchema.parse(request.body);
      const data = await this.hubinService.createPenempatan(
        request.tenantId!, 
        parsedBody, 
        request.user.id,
        request.organizationalScope
      );
      return reply.status(201).send({ success: true, data });
    } catch (error: any) {
      appLogger.error({ err: error, body: request.body }, 'createPenempatan error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updatePenempatan(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const parsedBody = updatePenempatanSchema.parse(request.body);
      const data = await this.hubinService.updatePenempatan(
        request.tenantId!, 
        id, 
        parsedBody, 
        request.user.id,
        request.organizationalScope
      );
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      appLogger.error({ err: error, body: request.body, id: request.params?.id }, 'updatePenempatan error');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async bulkCreatePenempatan(request: AuthenticatedRequest, reply: any) {
    try {
      const parsedBody = bulkCreatePenempatanSchema.parse(request.body);
      const data = await this.hubinService.bulkCreatePenempatan(
        request.tenantId!,
        parsedBody,
        request.user.id,
        request.organizationalScope
      );
      return reply.status(201).send({ success: true, data });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async deletePenempatan(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      await this.hubinService.deletePenempatan(
        request.tenantId!, 
        id, 
        request.user.id,
        request.organizationalScope
      );
      return reply.status(200).send({ success: true, message: 'Penempatan berhasil dihapus' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async mutasiPenempatan(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const data = await this.hubinService.mutasiPenempatan(
        request.tenantId!,
        id,
        request.body,
        request.user.id,
        request.organizationalScope
      );
      return reply.status(200).send({ success: true, message: 'Mutasi penempatan siswa berhasil diproses', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async bulkUpdateStatus(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.bulkUpdateStatus(
        request.tenantId!,
        request.body,
        request.user.id,
        request.organizationalScope
      );
      return reply.status(200).send({ success: true, message: 'Status penempatan berhasil diperbarui', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}
