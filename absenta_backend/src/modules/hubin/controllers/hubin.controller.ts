import { HubinService } from '../services/hubin.service';
import { studentResolverService } from '../../../services/student-resolver.service';
import { authorizationService } from '../../auth/services/authorization.service';
import { storageService } from '../../../infra/storage/storage.service';
import crypto from 'crypto';
import path from 'path';
import { z } from 'zod';
import { 
  createMitraSchema, 
  updateMitraSchema, 
  createPenempatanSchema, 
  updatePenempatanSchema, 
  bulkCreatePenempatanSchema 
} from '../services/hubin.schema';


interface AuthenticatedRequest {
  user: {
    id: string;
    userId: string;
    tenantId: string | null;
    role: string;
  };
  tenantId: string | null;
  organizationalScope: any;
  body: any;
  params: any;
  query: any;
}

export class HubinController {
  private hubinService: HubinService;

  constructor() {
    this.hubinService = new HubinService();
  }

  private async hasHubinManageCaps(request: AuthenticatedRequest): Promise<boolean> {
    const auth = await authorizationService.isUserAuthorized(
      request.user.id,
      ['hubin.logbook.manage', 'hubin.pkl.view.list', 'hubin.absensi.view.history', 'hubin.absensi.verify', 'hubin.partners.manage'],
      { user: request.user }
    );
    return auth.allowed;
  }

  // --- MITRA ---
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
  async getAbsensiSiswa(request: AuthenticatedRequest, reply: any) {
    try {
      const { siswaPklId } = request.params;
      const isManager = await this.hasHubinManageCaps(request);
      if (!isManager) {
        const siswaId = await studentResolverService.resolveSiswaId(request.tenantId!, request.user.id);
        if (!siswaId) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Profil siswa tidak ditemukan' });
        }
        const isOwner = await this.hubinService.verifySiswaPklOwnership(request.tenantId!, siswaPklId, siswaId);
        if (!isOwner) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Anda tidak memiliki akses ke data absensi ini' });
        }
      }
      const { page, limit } = request.query;
      const data = await this.hubinService.getAbsensiSiswa(request.tenantId!, siswaPklId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
      });
      return reply.status(200).send({ success: true, ...data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async checkIn(request: AuthenticatedRequest, reply: any) {
    try {
      const { siswaPklId, ...data } = request.body;
      const isManager = await this.hasHubinManageCaps(request);
      if (!isManager) {
        const siswaId = await studentResolverService.resolveSiswaId(request.tenantId!, request.user.id);
        if (!siswaId) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Profil siswa tidak ditemukan' });
        }
        const isOwner = await this.hubinService.verifySiswaPklOwnership(request.tenantId!, siswaPklId, siswaId);
        if (!isOwner) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Anda hanya dapat melakukan presensi untuk penempatan Anda sendiri' });
        }
      }
      const result = await this.hubinService.checkIn(request.tenantId!, siswaPklId, data);
      return reply.status(200).send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async checkOut(request: AuthenticatedRequest, reply: any) {
    try {
      const { siswaPklId, ...data } = request.body;
      const isManager = await this.hasHubinManageCaps(request);
      if (!isManager) {
        const siswaId = await studentResolverService.resolveSiswaId(request.tenantId!, request.user.id);
        if (!siswaId) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Profil siswa tidak ditemukan' });
        }
        const isOwner = await this.hubinService.verifySiswaPklOwnership(request.tenantId!, siswaPklId, siswaId);
        if (!isOwner) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Anda hanya dapat melakukan presensi untuk penempatan Anda sendiri' });
        }
      }
      const result = await this.hubinService.checkOut(request.tenantId!, siswaPklId, data);
      return reply.status(200).send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async updateLogbook(request: AuthenticatedRequest, reply: any) {
    try {
      const { siswaPklId } = request.params;
      const isManager = await this.hasHubinManageCaps(request);
      if (!isManager) {
        const siswaId = await studentResolverService.resolveSiswaId(request.tenantId!, request.user.id);
        if (!siswaId) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Profil siswa tidak ditemukan' });
        }
        const isOwner = await this.hubinService.verifySiswaPklOwnership(request.tenantId!, siswaPklId, siswaId);
        if (!isOwner) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Anda hanya dapat memperbarui jurnal untuk penempatan Anda sendiri' });
        }
      }
      const result = await this.hubinService.updateLogbook(request.tenantId!, siswaPklId, request.body);
      return reply.status(200).send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async verifyAbsensi(request: AuthenticatedRequest, reply: any) {
    try {
      const result = await this.hubinService.verifyAbsensi(
        request.tenantId!, 
        request.params.id, 
        request.user.id,
        request.organizationalScope
      );
      return reply.status(200).send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async syncOfflineLogbook(request: AuthenticatedRequest, reply: any) {
    try {
      const { siswaPklId, logs } = request.body;
      if (!logs || !Array.isArray(logs)) {
        return reply.status(400).send({ success: false, message: 'Invalid payload: logs must be an array' });
      }

      const isManager = await this.hasHubinManageCaps(request);
      if (!isManager) {
        const siswaId = await studentResolverService.resolveSiswaId(request.tenantId!, request.user.id);
        if (!siswaId) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Profil siswa tidak ditemukan' });
        }
        const isOwner = await this.hubinService.verifySiswaPklOwnership(request.tenantId!, siswaPklId, siswaId);
        if (!isOwner) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Anda hanya dapat melakukan presensi untuk penempatan Anda sendiri' });
        }
      }

      const result = await this.hubinService.syncOfflineLogbook(request.tenantId!, siswaPklId, logs);
      return reply.status(200).send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

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

  async addKunjungan(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.addKunjungan(
        request.tenantId!, 
        request.params.id, 
        request.body, 
        request.user.id,
        request.organizationalScope
      );
      return reply.status(201).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async submitJurnalPortofolio(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      const isManager = await this.hasHubinManageCaps(request);
      if (!isManager) {
        const siswaId = await studentResolverService.resolveSiswaId(request.tenantId!, request.user.id);
        if (!siswaId) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Profil siswa tidak ditemukan' });
        }
        const isOwner = await this.hubinService.verifySiswaPklOwnership(request.tenantId!, id, siswaId);
        if (!isOwner) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Anda hanya dapat mengirim jurnal untuk penempatan Anda sendiri' });
        }
      }
      const data = await this.hubinService.submitJurnalPortofolio(request.tenantId!, id, request.body);
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async reviewJurnalPortofolio(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.reviewJurnalPortofolio(
        request.tenantId!, 
        request.params.id, 
        request.body, 
        request.user.id,
        request.organizationalScope
      );
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // --- SETTINGS & DIRECT GOOGLE DRIVE UPLOAD ---
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

  async uploadPklPhoto(request: any, reply: any) {
    try {
      const fileData = await request.file();
      if (!fileData) {
        return reply.status(400).send({ success: false, message: 'File tidak ditemukan' });
      }

      // Check if file is image
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(fileData.mimetype)) {
        return reply.status(400).send({ success: false, message: 'Tipe file tidak didukung. Harap upload gambar.' });
      }

      // Extract folder_name (class name) from fields
      const rawFolderName = fileData.fields?.folder_name?.value || (fileData as any).folder_name;
      const folderName = rawFolderName ? String(rawFolderName).trim() : undefined;

      const fileExtension = path.extname(fileData.filename);
      const randomName = crypto.randomBytes(16).toString('hex');
      const fileName = `${randomName}${fileExtension}`;

      const tenantSegment = request.tenantId || 'global';
      const sanitizeFolderName = (name: string) => name.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').trim();
      const folderSegment = folderName ? sanitizeFolderName(folderName) : 'root';
      const storageKey = `uploads/hubin/${tenantSegment}/${folderSegment}/${fileName}`;

      await storageService.uploadStream(storageKey, fileData.file, { contentType: fileData.mimetype });

      const fileUrl = `/api/uploads/hubin/${tenantSegment}/${folderSegment}/${fileName}`;

      return reply.status(200).send({
        success: true,
        message: 'File berhasil disimpan',
        data: {
          url: fileUrl,
          filename: fileData.filename,
          mimetype: fileData.mimetype
        }
      });
    } catch (error: any) {
      console.error(error);
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async deletePklPhoto(request: AuthenticatedRequest, reply: any) {
    try {
      const { url } = request.body;
      if (!url) {
        return reply.status(400).send({ success: false, message: 'URL file tidak ditemukan' });
      }

      const marker = '/uploads/';
      const index = url.indexOf(marker);
      if (index !== -1) {
        const key = url.substring(index + 1);
        await storageService.delete(key);
      }
      
      return reply.status(200).send({
        success: true,
        message: 'File berhasil dihapus permanen'
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // --- MOU HISTORY ---
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
