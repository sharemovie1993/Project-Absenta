// @ts-nocheck
import { HubinService } from '../../services/hubin.service';
import { FastifyRequest, FastifyReply } from 'fastify';
import { appLogger } from '@/utils/app-logger';
import { prisma } from '@/utils/prisma';

export class HubinPenempatanController {
  private hubinService = new HubinService();
  async getPenempatan(request: AuthenticatedRequest, reply: any) {
    try {
      const { search, page, limit } = request.query;
      const data = await this.hubinService.getPenempatan(
        request.tenantId!, 
        request.user.id, 
        {
          search,
          page: page ? parseInt(page) : undefined,
          limit: limit ? parseInt(limit) : undefined
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

  // --- ABSENSI ---
}
