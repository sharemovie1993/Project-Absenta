// @ts-nocheck
import { HubinService } from '../../services/hubin.service';
import { FastifyRequest, FastifyReply } from 'fastify';
import { appLogger } from '@/utils/app-logger';
import { prisma } from '@/utils/prisma';

export class HubinMitraController {
  private hubinService = new HubinService();
  async getMitra(request: AuthenticatedRequest, reply: any) {
    try {
      const { search, page, limit } = request.query;
      const data = await this.hubinService.getMitra(request.tenantId!, { 
        search, 
        page: page ? parseInt(page) : undefined, 
        limit: limit ? parseInt(limit) : undefined 
      });
      return reply.status(200).send({ success: true, ...data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async createMitra(request: AuthenticatedRequest, reply: any) {
    try {
      const parsedBody = createMitraSchema.parse(request.body);
      const data = await this.hubinService.createMitra(request.tenantId!, parsedBody, request.user.id);
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

  async updateMitra(request: AuthenticatedRequest, reply: any) {
    try {
      const parsedBody = updateMitraSchema.parse(request.body);
      const data = await this.hubinService.updateMitra(
        request.tenantId!, 
        request.params.id, 
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

  async deleteMitra(request: AuthenticatedRequest, reply: any) {
    try {
      await this.hubinService.deleteMitra(request.tenantId!, request.params.id, request.user.id);
      return reply.status(200).send({ success: true, message: 'Mitra deleted' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // --- PENEMPATAN ---

  async getMoUHistory(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.getMoUHistory(request.tenantId!, request.params.mitraId);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async createMoUHistory(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.createMoUHistory(request.tenantId!, request.params.mitraId, request.body, request.user.id);
      return reply.status(201).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async deleteMoUHistory(request: AuthenticatedRequest, reply: any) {
    try {
      await this.hubinService.deleteMoUHistory(request.tenantId!, request.params.id, request.user.id);
      return reply.status(200).send({ success: true, message: 'MoU history deleted' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // --- BKK LOWONGAN ---
}
