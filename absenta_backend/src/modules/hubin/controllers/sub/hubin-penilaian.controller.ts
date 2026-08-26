// @ts-nocheck
import { HubinService } from '../../services/hubin.service';
import { FastifyRequest, FastifyReply } from 'fastify';
import { appLogger } from '@/utils/app-logger';
import { prisma } from '@/utils/prisma';

export class HubinPenilaianController {
  private hubinService = new HubinService();
  async updatePenilaian(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.updatePenilaian(
        request.tenantId!, 
        request.params.id, 
        request.body.nilai, 
        request.user.id,
        request.organizationalScope
      );
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }


  async getSettings(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.getSettings(request.tenantId!);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updateSettings(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.updateSettings(request.tenantId!, request.body);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }


  async getTefaOrders(request: AuthenticatedRequest, reply: any) {
    try {
      const { search, statusProyek, page, limit } = request.query;
      const data = await this.hubinService.getTefaOrders(request.tenantId!, {
        search,
        statusProyek,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
      });
      return reply.status(200).send({ success: true, ...data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async createTefaOrder(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.createTefaOrder(request.tenantId!, request.body, request.user.id);
      return reply.status(201).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updateTefaOrder(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.updateTefaOrder(request.tenantId!, request.params.id, request.body, request.user.id);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async deleteTefaOrder(request: AuthenticatedRequest, reply: any) {
    try {
      await this.hubinService.deleteTefaOrder(request.tenantId!, request.params.id, request.user.id);
      return reply.status(200).send({ success: true, message: 'TEFA order deleted' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getRecentActivity(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.getRecentActivity(request.tenantId!);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // --- PKL ASSESSMENT & SERTIFIKAT ---
  async upsertNilaiPklBatch(request: AuthenticatedRequest, reply: any) {
    try {
      const { scores } = request.body;
      if (!Array.isArray(scores)) {
        return reply.status(400).send({ success: false, message: 'scores (array) wajib diisi' });
      }
      const data = await this.hubinService.upsertNilaiPklBatch(request.tenantId!, scores);
      return reply.status(200).send({ success: true, message: 'Batch nilai & sertifikat PKL berhasil disimpan', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getRekapPklSiswa(request: AuthenticatedRequest, reply: any) {
    try {
      const { kelas_id, status, search } = request.query;
      const data = await this.hubinService.getRekapPklSiswa(request.tenantId!, { kelas_id, status, search });
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async upsertSettingDeskripsiPkl(request: AuthenticatedRequest, reply: any) {
    try {
      const { mitra_id, jurusan_id, deskripsi_tp } = request.body;
      if (!mitra_id || !deskripsi_tp) {
        return reply.status(400).send({ success: false, message: 'mitra_id dan deskripsi_tp wajib diisi' });
      }
      const data = await this.hubinService.upsertSettingDeskripsiPkl(request.tenantId!, { mitra_id, jurusan_id, deskripsi_tp });
      return reply.status(200).send({ success: true, message: 'Setting deskripsi TP PKL berhasil disimpan', data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getSettingDeskripsiPklList(request: AuthenticatedRequest, reply: any) {
    try {
      const { mitra_id } = request.query;
      const data = await this.hubinService.getSettingDeskripsiPklList(request.tenantId!, mitra_id);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getSertifikatPklData(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const data = await this.hubinService.getSertifikatPklData(request.tenantId!, id);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}
