// @ts-nocheck
import { sendResponse, sendError } from '@/utils/response';
import { PerangkatAjarService } from '../../services/perangkat-ajar.service';
import { perangkatAjarUploadSchema, perangkatAjarReviewSchema, perangkatAjarUpdateSchema } from '../../services/perangkat-ajar.schema';
import { DocumentStorageService } from '@/modules/document-center/services/document-storage.service';
import { storageService } from '@/infra/storage/storage.service';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { RoleName } from '@/constants/enums';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import axios from 'axios';
import { PdfGeneratorService } from '@/modules/reporting/services/pdf-generator.service';
import { buildAIPromptForJenis, buildFallbackHtmlForJenis } from '../../helpers/perangkat-ajar-layout.helper';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { convertOfficeToPdfSibling } from '@/utils/office-to-pdf.util';

export class PerangkatCrudController {
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
      const faseRaw = file.fields?.fase?.value;
      const tingkatRaw = file.fields?.tingkat?.value;
      const isSharedRaw = file.fields?.is_shared?.value;

      // Validate inputs before saving the file
      const parsedFields = perangkatAjarUploadSchema.omit({ file_url: true }).parse({
        guru_id,
        mapel_id,
        tahun_pelajaran_id,
        semester_id,
        judul,
        jenis,
        fase: faseRaw ? String(faseRaw).trim() : null,
        tingkat: tingkatRaw ? Number(tingkatRaw) : null,
        is_shared: String(isSharedRaw || '').toLowerCase() === 'true',
      });

      // Save file using DocumentStorageService
      const storageService = new DocumentStorageService();
      const uploadResult = await storageService.saveFile({
        tenantId: tenant_id,
        category: parsedFields.jenis,
        file: file,
        subFolder: 'perangkat-ajar',
      });

      // Konversi otomatis .ppt/.pptx/.doc/.docx -> .pdf pendamping agar bisa langsung dipratinjau di sesi KBM
      await convertOfficeToPdfSibling(uploadResult.relativePath).catch(() => null);

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

      // Auto-index into Global Library for National Bank Katalog
      try {
        const targetMapel = await prisma.mapel.findUnique({ where: { id: parsedFields.mapel_id }, select: { nama_mapel: true, kode_mapel: true } });
        const kUpper = String(parsedFields.judul || '').toUpperCase();
        let targetTingkat = 10;
        let targetFase = 'E';
        if (kUpper.includes('XI') || kUpper.includes('11')) { targetTingkat = 11; targetFase = 'F'; }
        else if (kUpper.includes('XII') || kUpper.includes('12')) { targetTingkat = 12; targetFase = 'F'; }
        else if (kUpper.includes('VII') || kUpper.includes('7')) { targetTingkat = 7; targetFase = 'D'; }
        else if (kUpper.includes('VIII') || kUpper.includes('8')) { targetTingkat = 8; targetFase = 'D'; }
        else if (kUpper.includes('IX') || kUpper.includes('9')) { targetTingkat = 9; targetFase = 'D'; }

        await prisma.globalPerangkatAjarLibrary.create({
          data: {
            jenjang: 'SMK',
            nama_mapel: targetMapel?.nama_mapel || 'Mata Pelajaran',
            kode_mapel: targetMapel?.kode_mapel || null,
            tingkat: targetTingkat,
            fase: targetFase,
            jenis: parsedFields.jenis,
            judul: parsedFields.judul,
            topik: parsedFields.judul,
            file_url: uploadResult.relativePath
          }
        });
      } catch (libErr: any) {
        console.warn('[LIBRARY INDEXING] Auto-index upload notice:', libErr.message);
      }


      return sendResponse(reply, 201, true, 'Perangkat ajar berhasil diunggah dan diindeks ke Katalog Library', result);

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

  static async update(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;

      const existing = await prisma.perangkatAjar.findFirst({
        where: { id, tenant_id },
      });

      if (!existing) {
        return reply.status(404).send({ success: false, message: 'Perangkat ajar tidak ditemukan' });
      }

      const hasFullManage =
        req.user?.roleName === RoleName.SUPERADMIN ||
        (await authorizationService.hasUserPermission(userId, 'academic.manage.academic'));

      if (!hasFullManage) {
        const guru = await prisma.guru.findFirst({
          where: { user_id: userId, tenant_id },
          select: { id: true },
        });
        if (!guru || guru.id !== existing.guru_id) {
          return reply.status(403).send({ success: false, message: 'Anda tidak memiliki izin mengubah perangkat ajar ini' });
        }
      }

      let rawFields: Record<string, any> = {};
      let uploadedFileUrl: string | undefined;
      let pendingFilePart: { filename: string; mimetype: string; toBuffer: () => Promise<Buffer> } | null = null;

      if (typeof req.isMultipart === 'function' && req.isMultipart()) {
        for await (const part of req.parts()) {
          if (part.type === 'file') {
            const buffer = await part.toBuffer();
            if (buffer && buffer.length > 0) {
              pendingFilePart = {
                filename: part.filename,
                mimetype: part.mimetype,
                toBuffer: async () => buffer,
              };
            }
          } else {
            rawFields[part.fieldname] = part.value;
          }
        }
      } else {
        rawFields = req.body || {};
      }

      const parsedFields = perangkatAjarUpdateSchema.parse({
        ...(rawFields.judul !== undefined ? { judul: rawFields.judul } : {}),
        ...(rawFields.jenis !== undefined ? { jenis: rawFields.jenis } : {}),
        ...(rawFields.mapel_id !== undefined ? { mapel_id: rawFields.mapel_id } : {}),
        ...(rawFields.guru_id !== undefined && hasFullManage ? { guru_id: rawFields.guru_id } : {}),
        ...(rawFields.fase !== undefined
          ? { fase: rawFields.fase ? String(rawFields.fase).trim() : null }
          : {}),
        ...(rawFields.tingkat !== undefined
          ? { tingkat: rawFields.tingkat ? Number(rawFields.tingkat) : null }
          : {}),
        ...(rawFields.is_shared !== undefined
          ? { is_shared: String(rawFields.is_shared).toLowerCase() === 'true' }
          : {}),
      });

      if (pendingFilePart) {
        const storage = new DocumentStorageService();
        const uploadResult = await storage.saveFile({
          tenantId: tenant_id,
          category: parsedFields.jenis || existing.jenis,
          file: pendingFilePart as any,
          subFolder: 'perangkat-ajar',
        });
        await convertOfficeToPdfSibling(uploadResult.relativePath).catch(() => null);
        uploadedFileUrl = uploadResult.relativePath;
      }

      const updated = await PerangkatAjarService.updatePerangkat(tenant_id, id, {
        ...parsedFields,
        ...(uploadedFileUrl ? { file_url: uploadedFileUrl } : {}),
        resetToPending: Boolean(uploadedFileUrl && existing.status === 'REJECTED'),
      });

      return sendResponse(reply, 200, true, 'Perangkat ajar berhasil diperbarui', updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Gagal memperbarui perangkat ajar', error);
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

      const safeTitle = (perangkat.judul || 'perangkat-ajar').replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_');

      // 1. Jika berkas fisik tersimpan di Storage Engine, alirkan berkas asli
      if (perangkat.file_url) {
        const key = String(perangkat.file_url).replace(/^\/+/, '');
        const exists = (await storageService.exists(key)) || (await storageService.exists(`storage/${key}`));
        if (exists) {
          const targetKey = (await storageService.exists(key)) ? key : `storage/${key}`;
          const ext = targetKey.includes('.') ? targetKey.split('.').pop()!.toLowerCase() : 'pdf';
          const mimeMap: Record<string, string> = {
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          };
          const contentType = mimeMap[ext] || 'application/octet-stream';
          const cleanFilename = `${safeTitle}.${ext}`;

          if (
            String(process.env.STORAGE_USE_DIRECT_URL || '').trim().toLowerCase() === 'true' &&
            storageService.getDriverName() === 's3'
          ) {
            try {
              const directUrl = await storageService.getSignedDownloadUrl(targetKey);
              if (directUrl) {
                return reply.redirect(302, directUrl);
              }
            } catch (err) {
              console.warn(`[PerangkatAjar] Failed direct URL for: ${targetKey}`, err);
            }
          }

          const stream = storageService.createReadStream(targetKey);
          reply.type(contentType);
          reply.header('Content-Disposition', `inline; filename="${cleanFilename}"`);
          reply.header('Access-Control-Allow-Origin', '*');
          reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
          reply.header('Cache-Control', 'public, max-age=31536000, immutable');
          return reply.send(stream);
        }
      }

      // 2. Fallback untuk perangkat non-fisik (AI / Editor): Generate Full Official 5-Page HTML with PrintHeader Logos
      const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id } });
      const sekolah = await prisma.sekolah.findFirst({ where: { tenant_id } });
      const cleanFilename = `${safeTitle}.pdf`;

      const fullHtml = generateOfficialKurikulumHtml(perangkat, tenant, sekolah);
      const pdfBuffer = await PdfGeneratorService.renderHtmlToPdf(fullHtml, 'portrait');

      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `inline; filename="${cleanFilename}"`);
      return reply.send(pdfBuffer);

    } catch (error) {
      return sendError(reply, 500, 'Gagal memuat berkas perangkat ajar cloud native', error);
    }
  }





  static async review(req: any, reply: any) {
    try {
      const { tenant_id, id: reviewerId } = req.user!;
      const { id } = req.params;
      const parsed = perangkatAjarReviewSchema.parse(req.body);

      const result = await PerangkatAjarService.reviewPerangkat(tenant_id, id, reviewerId, parsed);
      await cacheInvalidationService.invalidateAcademicCache(tenant_id);
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
        }) || await prisma.guru.findFirst({
          where: { tenant_id },
          select: { id: true }
        });

        if (guru) {
          guru_id = guru.id;
        }
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


  static async getDetail(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      const item = await PerangkatAjarService.getPerangkatById(tenant_id, id);
      if (!item) {
        return reply.status(404).send({ success: false, message: 'Perangkat ajar tidak ditemukan' });
      }

      return sendResponse(reply, 200, true, 'Detail perangkat ajar berhasil dimuat', item);
    } catch (error: any) {
      return sendError(reply, 500, `Gagal memuat detail perangkat ajar: ${error.message}`, error);
    }
  }

  static async saveEditor(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      let { id: paramId, perangkat_id, judul, jenis, mapel_id, guru_id, tahun_pelajaran_id, semester_id, html_content } = req.body;
      const targetId = perangkat_id || paramId;

      // Auto resolve mapel_id if missing/empty
      if (!mapel_id) {
        const firstMapel = await prisma.mapel.findFirst({
          where: { tenant_id },
          select: { id: true }
        });
        if (firstMapel) mapel_id = firstMapel.id;
      }

      if (!judul || !jenis || !mapel_id || !html_content) {
        return reply.status(400).send({ success: false, message: 'Parameter wajib (judul, jenis, mapel_id, html_content) tidak boleh kosong' });
      }


      // Auto resolve active tahun_pelajaran_id and semester_id if omitted
      if (!tahun_pelajaran_id || !semester_id) {
        const activeYear = await prisma.tahunPelajaran.findFirst({
          where: { tenant_id, is_active: true },
          include: { Semester: { where: { is_active: true } } }
        });
        if (activeYear) {
          tahun_pelajaran_id = tahun_pelajaran_id || activeYear.id;
          semester_id = semester_id || (activeYear.Semester[0]?.id ?? null);
        }
        if (!tahun_pelajaran_id || !semester_id) {
          const fallbackYear = await prisma.tahunPelajaran.findFirst({
            where: { tenant_id },
            include: { Semester: true }
          });
          if (fallbackYear) {
            tahun_pelajaran_id = tahun_pelajaran_id || fallbackYear.id;
            semester_id = semester_id || (fallbackYear.Semester[0]?.id ?? null);
          }
        }
      }

      if (!tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({ success: false, message: 'Tahun Pelajaran / Semester aktif belum diatur di sistem sekolah' });
      }

      // Determine target guru_id safely
      const hasFullManage = req.user?.roleName === RoleName.SUPERADMIN || 
                            await authorizationService.hasUserPermission(userId, 'academic.manage.academic');

      let targetGuruId = guru_id;
      if (!targetGuruId) {
        const guru = await prisma.guru.findFirst({
          where: { user_id: userId, tenant_id },
          select: { id: true }
        }) || await prisma.guru.findFirst({
          where: { tenant_id },
          select: { id: true }
        });

        if (guru) {
          targetGuruId = guru.id;
        } else if (!hasFullManage) {
          return reply.status(403).send({ success: false, message: 'Anda tidak terdaftar sebagai guru pengajar' });
        }
      }

      if (!targetGuruId) {
        return reply.status(400).send({ success: false, message: 'Tidak ada data guru pengajar yang dapat dihubungkan di sekolah ini' });
      }

      let result: any;
      if (targetId) {
        // Update existing record
        result = await prisma.perangkatAjar.update({
          where: { id: targetId },
          data: {
            judul,
            jenis,
            mapel_id,
            tahun_pelajaran_id,
            semester_id,
            guru_id: targetGuruId,
          }
        });
      } else {
        // Save new record
        result = await PerangkatAjarService.uploadPerangkat(tenant_id, {
          guru_id: targetGuruId,
          mapel_id,
          tahun_pelajaran_id,
          semester_id,
          judul,
          jenis,
          file_url: '',
        });
      }

      // Auto-Index / Update Global Perangkat Ajar Library
      try {
        const targetMapel = await prisma.mapel.findUnique({ where: { id: mapel_id }, select: { nama_mapel: true, kode_mapel: true } });
        const kUpper = String(req.body?.kelas || judul || '').toUpperCase();
        let targetTingkat = 10;
        let targetFase = 'E';
        if (kUpper.includes('XI') || kUpper.includes('11')) { targetTingkat = 11; targetFase = 'F'; }
        else if (kUpper.includes('XII') || kUpper.includes('12')) { targetTingkat = 12; targetFase = 'F'; }
        else if (kUpper.includes('VII') || kUpper.includes('7')) { targetTingkat = 7; targetFase = 'D'; }
        else if (kUpper.includes('VIII') || kUpper.includes('8')) { targetTingkat = 8; targetFase = 'D'; }
        else if (kUpper.includes('IX') || kUpper.includes('9')) { targetTingkat = 9; targetFase = 'D'; }

        const cleanJudul = judul.trim();
        const mapelName = targetMapel?.nama_mapel || 'Mata Pelajaran';

        const existingLib = await prisma.globalPerangkatAjarLibrary.findFirst({
          where: {
            jenis,
            OR: [
              { judul: { equals: cleanJudul, mode: 'insensitive' } },
              { topik: { equals: cleanJudul, mode: 'insensitive' } },
              {
                nama_mapel: { contains: mapelName, mode: 'insensitive' },
                judul: { contains: cleanJudul, mode: 'insensitive' }
              }
            ]
          }
        });

        if (existingLib) {
          await prisma.globalPerangkatAjarLibrary.update({
            where: { id: existingLib.id },
            data: {
              html_content,
              updated_at: new Date()
            }
          });
        } else {
          await prisma.globalPerangkatAjarLibrary.create({
            data: {
              jenjang: 'SMK',
              nama_mapel: mapelName,
              kode_mapel: targetMapel?.kode_mapel || null,
              tingkat: targetTingkat,
              fase: targetFase,
              jenis,
              judul: cleanJudul,
              topik: cleanJudul,
              file_url: '',
              html_content: html_content
            }
          });
        }
      } catch (libErr: any) {
        console.warn('[LIBRARY INDEXING] Auto-index to library notice:', libErr.message);
      }

      await cacheInvalidationService.invalidateAcademicCache(tenant_id);
      return sendResponse(reply, 200, true, 'Perubahan naskah perangkat ajar berhasil disimpan', result);
    } catch (error: any) {
      return sendError(reply, 500, `Gagal menyimpan dokumen editor: ${error.message}`, error);
    }
  }


  static async bulkDelete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { ids } = req.body || {};

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({ success: false, message: 'Daftar ID perangkat ajar wajib diisi' });
      }

      const result = await PerangkatAjarService.bulkDeletePerangkat(tenant_id, ids);
      return sendResponse(reply, 200, true, `${result.count} dokumen perangkat ajar berhasil dihapus`, result);
    } catch (error: any) {
      return sendError(reply, 500, `Gagal menghapus masal perangkat ajar: ${error.message}`, error);
    }
  }

  static async rollover(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const {
        source_tahun_pelajaran_id,
        target_tahun_pelajaran_id,
        source_semester_id,
        target_semester_id,
        guru_id,
        mode = 'skip_existing',
      } = req.body || {};

      if (!source_tahun_pelajaran_id || !target_tahun_pelajaran_id) {
        return reply.status(400).send({
          success: false,
          message: 'source_tahun_pelajaran_id dan target_tahun_pelajaran_id wajib diisi',
        });
      }

      const hasFullManage =
        req.user?.roleName === RoleName.SUPERADMIN ||
        (await authorizationService.hasUserPermission(userId, 'academic.manage.academic'));

      let effectiveGuruId = guru_id;
      if (!hasFullManage) {
        const guru = await prisma.guru.findFirst({
          where: { user_id: userId, tenant_id },
          select: { id: true },
        });
        if (!guru) {
          return reply.status(403).send({
            success: false,
            message: 'Anda tidak memiliki hak akses untuk menyalin perangkat ajar',
          });
        }
        effectiveGuruId = guru.id;
      }

      const result = await PerangkatAjarService.rolloverPerangkat(tenant_id, {
        source_tahun_pelajaran_id,
        target_tahun_pelajaran_id,
        source_semester_id,
        target_semester_id,
        guru_id: effectiveGuruId,
        mode,
      });

      return sendResponse(reply, 200, true, result.message, result);
    } catch (error: any) {
      return sendError(reply, 400, `Gagal menyalin perangkat ajar dari tahun sebelumnya: ${error.message}`, error);
    }
  }
}

function generateOfficialKurikulumHtml(perangkat: any, tenant: any, sekolah: any): string {
  const logoDaerah = tenant?.logo_daerah_url || sekolah?.logo_daerah_url || 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg';
}
