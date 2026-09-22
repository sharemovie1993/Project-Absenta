// @ts-nocheck
import { HubinService } from '../../services/hubin.service';
import { FastifyRequest, FastifyReply } from 'fastify';
import { appLogger } from '@/utils/app-logger';
import { prisma } from '@/utils/prisma';
import * as XLSX from 'xlsx-js-style';
import { smartReadSheet } from '@/utils/excel-import.utils';
import { z } from 'zod';
import { createMitraSchema, updateMitraSchema } from '../../services/hubin.schema';

export class HubinMitraController {
  private hubinService = new HubinService();
  async getMitra(request: AuthenticatedRequest, reply: any) {
    try {
      const { search, page, limit, mou_status } = request.query;
      const data = await this.hubinService.getMitra(request.tenantId!, { 
        search, 
        page: page ? parseInt(page) : undefined, 
        limit: limit ? parseInt(limit) : undefined,
        mou_status
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

  async importMitra(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      const part = await request.file();
      if (!part) {
        return reply.status(400).send({ success: false, message: 'File tidak ditemukan' });
      }

      const buffer = await part.toBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const data: any[] = smartReadSheet(ws);

      if (!data || data.length === 0) {
        return reply.status(400).send({ success: false, message: 'File Excel kosong atau format tidak sesuai' });
      }

      const io = request.server.io;
      const ioApi = request.server.ioApi;
      const userId = request.user?.id;
      const clientSocketId = request.headers['x-socket-id'];

      const result = await this.hubinService.importMitraFromRows(
        tenantId,
        data,
        userId,
        (progressData: any) => {
          const payload = {
            type: 'mitra',
            ...progressData
          };
          if (userId) {
            const roomName = `user:${userId}`;
            if (io) io.to(roomName).emit('import_progress', payload);
            if (ioApi) ioApi.to(roomName).emit('import_progress', payload);
          }
          if (clientSocketId) {
            if (io) io.to(clientSocketId).emit('import_progress', payload);
            if (ioApi) ioApi.to(clientSocketId).emit('import_progress', payload);
          }
        }
      );

      return reply.status(200).send({
        success: true,
        message: `Impor selesai. Ditambahkan: ${result.created}, Diperbarui: ${result.updated}, Dilewati: ${result.skipped}, Gagal: ${result.failed}`,
        data: result
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message || 'Gagal memproses impor file' });
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
