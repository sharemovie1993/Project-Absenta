import { HubinService } from '../services/hubin.service';
import { googleDriveService } from '../services/google-drive.service';

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
      const data = await this.hubinService.createMitra(request.tenantId!, request.body);
      return reply.status(201).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async updateMitra(request: AuthenticatedRequest, reply: any) {
    try {
      const data = await this.hubinService.updateMitra(
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

  async deleteMitra(request: AuthenticatedRequest, reply: any) {
    try {
      await this.hubinService.deleteMitra(request.tenantId!, request.params.id);
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
      const data = await this.hubinService.createPenempatan(request.tenantId!, request.body);
      return reply.status(201).send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async deletePenempatan(request: AuthenticatedRequest, reply: any) {
    try {
      const { id } = request.params;
      await this.hubinService.deletePenempatan(request.tenantId!, id);
      return reply.status(200).send({ success: true, message: 'Penempatan berhasil dihapus' });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  // --- ABSENSI ---
  async getAbsensiSiswa(request: AuthenticatedRequest, reply: any) {
    try {
      const { siswaPklId } = request.params;
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
      const result = await this.hubinService.checkIn(request.tenantId!, siswaPklId, data);
      return reply.status(200).send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async checkOut(request: AuthenticatedRequest, reply: any) {
    try {
      const { siswaPklId, ...data } = request.body;
      const result = await this.hubinService.checkOut(request.tenantId!, siswaPklId, data);
      return reply.status(200).send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  }

  async updateLogbook(request: AuthenticatedRequest, reply: any) {
    try {
      const { siswaPklId } = request.params;
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
      const data = await this.hubinService.submitJurnalPortofolio(request.tenantId!, request.params.id, request.body);
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

      // Extract folder_name (class name) from fields - Be more permissive with class names
      // We check both fileData.fields and direct field access for robustness
      const rawFolderName = fileData.fields?.folder_name?.value || (fileData as any).folder_name;
      const folderName = rawFolderName ? String(rawFolderName).trim() : undefined;

      console.log(`[HubinController] Upload request for folder: "${folderName || 'ROOT'}"`);

      const buffer = await fileData.toBuffer();

      // Sanitasi nama file: Ganti spasi dengan underscore dan hapus karakter non-alphanumeric
      const cleanFileName = fileData.filename
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '');
      
      const fileUrl = await googleDriveService.uploadToDrive(
        request.tenantId!,
        buffer,
        cleanFileName,
        fileData.mimetype,
        folderName // Pass folder name (class) to service
      );

      return reply.status(200).send({
        success: true,
        message: 'File berhasil disimpan di Google Drive',
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

      const success = await googleDriveService.deleteFromDrive(request.tenantId!, url);
      
      return reply.status(200).send({
        success: success,
        message: success ? 'File berhasil dihapus permanen dari Google Drive' : 'Gagal menghapus file dari Google Drive'
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }
}
