import { sendResponse, sendError } from '../../../utils/response';
import { PerangkatAjarService } from '../services/perangkat-ajar.service';
import { perangkatAjarUploadSchema, perangkatAjarReviewSchema } from '../services/perangkat-ajar.schema';
import { DocumentStorageService } from '../../document-center/services/document-storage.service';
import { authorizationService } from '../../auth/services/authorization.service';
import { RoleName } from '../../../constants/enums';
import { prisma } from '../../../utils/prisma';
import { z } from 'zod';
import path from 'path';

export class PerangkatAjarController {
  static async upload(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const file = await req.file();
      if (!file) {
        return reply.status(400).send({ success: false, message: 'File berkas wajib diunggah' });
      }

      // Extract fields from multipart
      const guru_id = file.fields?.guru_id?.value;
      const mapel_id = file.fields?.mapel_id?.value;
      const tahun_pelajaran_id = file.fields?.tahun_pelajaran_id?.value;
      const semester_id = file.fields?.semester_id?.value;
      const judul = file.fields?.judul?.value;
      const jenis = file.fields?.jenis?.value;

      // Validate inputs before saving the file
      const parsedFields = perangkatAjarUploadSchema.omit({ file_url: true }).parse({
        guru_id,
        mapel_id,
        tahun_pelajaran_id,
        semester_id,
        judul,
        jenis,
      });

      // Save file using DocumentStorageService
      const storageService = new DocumentStorageService();
      const uploadResult = await storageService.saveFile({
        tenantId: tenant_id,
        category: parsedFields.jenis,
        file: file,
        subFolder: 'perangkat-ajar',
      });

      const hasFullManage = req.user?.roleName === RoleName.SUPERADMIN || 
                            await authorizationService.hasUserPermission(userId, 'academic.manage.academic');

      let targetGuruId = parsedFields.guru_id;
      if (!hasFullManage) {
        const guru = await prisma.guru.findFirst({
          where: { user_id: userId, tenant_id },
          select: { id: true }
        });
        if (!guru) {
          return reply.status(403).send({ success: false, message: 'Anda tidak terdaftar sebagai guru pengajar' });
        }
        targetGuruId = guru.id;
      }

      // Save to database
      const result = await PerangkatAjarService.uploadPerangkat(tenant_id, {
        ...parsedFields,
        guru_id: targetGuruId,
        file_url: uploadResult.relativePath,
      });

      return sendResponse(reply, 201, true, 'Perangkat ajar berhasil diunggah dan siap diverifikasi', result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal mengunggah perangkat ajar', error);
    }
  }

  static async download(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      const perangkat = await PerangkatAjarService.getPerangkatById(tenant_id, id);
      if (!perangkat) {
        return reply.status(404).send({ success: false, message: 'Perangkat ajar tidak ditemukan' });
      }

      const storageService = new DocumentStorageService();
      const stream = storageService.createReadStream(perangkat.file_url);

      const filename = path.basename(perangkat.file_url);
      const extension = path.extname(perangkat.file_url).toLowerCase();

      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
      };
      const contentType = mimeTypes[extension] || 'application/octet-stream';

      const underscoreIndex = filename.indexOf('_');
      const cleanFilename = underscoreIndex > -1 ? filename.substring(underscoreIndex + 1) : filename;

      reply.header('Content-Type', contentType);
      reply.header('Content-Disposition', `attachment; filename="${cleanFilename}"`);
      return reply.send(stream);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengunduh berkas perangkat ajar', error);
    }
  }

  static async review(req: any, reply: any) {
    try {
      const { tenant_id, id: reviewerId } = req.user!;
      const { id } = req.params;
      const parsed = perangkatAjarReviewSchema.parse(req.body);

      const result = await PerangkatAjarService.reviewPerangkat(tenant_id, id, reviewerId, parsed);
      return sendResponse(reply, 200, true, 'Verifikasi perangkat ajar berhasil disimpan', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, error.message.includes('not found') ? 404 : 500, error.message || 'Gagal melakukan verifikasi', error);
    }
  }

  static async getList(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      let { guru_id, mapel_id, tahun_pelajaran_id, semester_id, status, jenis } = req.query;

      const hasFullManage = req.user?.roleName === RoleName.SUPERADMIN || 
                            await authorizationService.hasUserPermission(userId, 'academic.manage.academic');

      if (!hasFullManage) {
        const guru = await prisma.guru.findFirst({
          where: { user_id: userId, tenant_id },
          select: { id: true }
        });
        if (!guru) {
          return sendResponse(reply, 200, true, 'Daftar perangkat ajar berhasil dimuat', []);
        }
        guru_id = guru.id;
      }

      const result = await PerangkatAjarService.getPerangkat(tenant_id, {
        guru_id: guru_id || undefined,
        mapel_id: mapel_id || undefined,
        tahun_pelajaran_id: tahun_pelajaran_id || undefined,
        semester_id: semester_id || undefined,
        status: status || undefined,
        jenis: jenis || undefined,
      });

      return sendResponse(reply, 200, true, 'Daftar perangkat ajar berhasil dimuat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memuat daftar perangkat ajar', error);
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;

      const perangkat = await PerangkatAjarService.getPerangkatById(tenant_id, id);
      if (!perangkat) {
        return reply.status(404).send({ success: false, message: 'Perangkat ajar tidak ditemukan' });
      }

      const hasFullManage = req.user?.roleName === RoleName.SUPERADMIN || 
                            await authorizationService.hasUserPermission(userId, 'academic.manage.academic');

      if (!hasFullManage) {
        const guru = await prisma.guru.findFirst({
          where: { user_id: userId, tenant_id },
          select: { id: true }
        });
        if (!guru || perangkat.guru_id !== guru.id) {
          return reply.status(403).send({ success: false, message: 'Forbidden: Anda tidak diizinkan menghapus berkas ini' });
        }
      }

      await PerangkatAjarService.deletePerangkat(tenant_id, id);
      return sendResponse(reply, 200, true, 'Perangkat ajar berhasil dihapus');
    } catch (error: any) {
      return sendError(reply, error.message.includes('not found') ? 404 : 500, error.message || 'Gagal menghapus perangkat ajar', error);
    }
  }
}
