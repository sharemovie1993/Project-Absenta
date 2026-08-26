// @ts-nocheck
import { HubinService } from '../../services/hubin.service';
import { FastifyRequest, FastifyReply } from 'fastify';
import { appLogger } from '@/utils/app-logger';
import { prisma } from '@/utils/prisma';

export class HubinAbsensiController {
  private hubinService = new HubinService();
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
}
