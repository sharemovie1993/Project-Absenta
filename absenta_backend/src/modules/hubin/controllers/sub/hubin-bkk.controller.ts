// @ts-nocheck
import { HubinService } from '../../services/hubin.service';
import { FastifyRequest, FastifyReply } from 'fastify';
import { appLogger } from '@/utils/app-logger';
import { prisma } from '@/utils/prisma';

export class HubinBkkController {
  private hubinService = new HubinService();
  async getLowongan(request: AuthenticatedRequest, reply: any) {
    try {
      const { search, status, page, limit } = request.query;
      const data = await this.hubinService.getLowongan(request.tenantId!, {
        search,
        status,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
      });
      return reply.status(200).send({ success: true, ...data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async createLowongan(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.createLowongan(request.tenantId!, request.body, request.user.id);
      return reply.status(201).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updateLowongan(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.updateLowongan(request.tenantId!, request.params.id, request.body, request.user.id);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async deleteLowongan(request: AuthenticatedRequest, reply: any) {
    try {
      await this.hubinService.deleteLowongan(request.tenantId!, request.params.id, request.user.id);
      return reply.status(200).send({ success: true, message: 'Lowongan deleted' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // --- BKK LAMARAN ---
  async getLamaran(request: AuthenticatedRequest, reply: any) {
    try {
      const { lowonganId, status, page, limit } = request.query;
      let { siswaId } = request.query;

      // Check if user has management capabilities
      const auth = await authorizationService.isUserAuthorized(
        request.user.id,
        ['hubin.lamaran.manage', 'hubin.partners.manage'],
        { user: request.user }
      );
      const isManager = auth.allowed;

      if (!isManager) {
        // Force filter to only their resolved student ID
        const resolvedSiswaId = await studentResolverService.resolveSiswaId(request.tenantId!, request.user.id);
        if (!resolvedSiswaId) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Profil siswa tidak ditemukan' });
        }
        siswaId = resolvedSiswaId;
      }

      const data = await this.hubinService.getLamaran(request.tenantId!, {
        lowonganId,
        status,
        siswaId,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
      });
      return reply.status(200).send({ success: true, ...data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async createLamaran(request: AuthenticatedRequest, reply: any) {
    try {
      let siswaId = request.body.siswa_id;
      if (!siswaId) {
        siswaId = await studentResolverService.resolveSiswaId(request.tenantId!, request.user.id);
        if (!siswaId) {
          return reply.status(404).send({ success: false, message: 'Profil siswa tidak ditemukan untuk akun ini' });
        }
      }
      const data = await this.hubinService.createLamaran(request.tenantId!, {
        ...request.body,
        siswa_id: siswaId
      }, request.user.id);
      return reply.status(201).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updateLamaranStatus(request: AuthenticatedRequest, reply: any) {
    try {
      const { status, catatan } = request.body;
      const data = await this.hubinService.updateLamaranStatus(request.tenantId!, request.params.id, status, catatan, request.user.id);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async scheduleInterview(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const data = await this.hubinService.scheduleInterview(
        request.tenantId!,
        id,
        request.body,
        request.user.id
      );
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getLamaranTimeline(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const data = await this.hubinService.getLamaranTimeline(request.tenantId!, id);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async deleteLamaran(request: AuthenticatedRequest, reply: any) {
    try {
      await this.hubinService.deleteLamaran(request.tenantId!, request.params.id, request.user.id);
      return reply.status(200).send({ success: true, message: 'Lamaran berhasil direset/dihapus' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // --- TRACER STUDY ---
  async getTracerStudy(request: AuthenticatedRequest, reply: any) {
    try {
      const { search, tahunLulus, statusAlumni, page, limit } = request.query;

      const roleName = request.user.role || (request.user as any).roleName || (request.user as any).Role?.name;
      const isGlobalHubin = roleName === 'SUPERADMIN' || roleName === 'ADMIN' || roleName === 'HUBIN';

      let forceSiswaId: string | undefined;
      if (!isGlobalHubin && roleName === 'SISWA') {
        const siswaId = await studentResolverService.resolveSiswaId(request.tenantId!, request.user.id);
        if (!siswaId) {
          return reply.status(404).send({ success: false, message: 'Profil siswa tidak ditemukan untuk akun ini' });
        }
        forceSiswaId = siswaId;
      }

      const data = await this.hubinService.getTracerStudy(request.tenantId!, {
        search,
        tahunLulus: tahunLulus ? parseInt(tahunLulus) : undefined,
        statusAlumni,
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        forceSiswaId
      });
      return reply.status(200).send({ success: true, ...data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async submitTracerStudy(request: AuthenticatedRequest, reply: any) {
    try {
      let siswaId = request.body.siswa_id;
      if (!siswaId) {
        siswaId = await studentResolverService.resolveSiswaId(request.tenantId!, request.user.id);
        if (!siswaId) {
          return reply.status(404).send({ success: false, message: 'Profil siswa tidak ditemukan untuk akun ini' });
        }
      }
      const data = await this.hubinService.submitTracerStudy(request.tenantId!, siswaId, request.body, request.user.id);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async getTracerStats(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.getTracerStats(request.tenantId!);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // --- TEFA ---
}
