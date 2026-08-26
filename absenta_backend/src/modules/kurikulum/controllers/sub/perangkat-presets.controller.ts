// @ts-nocheck
import { sendResponse, sendError } from '@/utils/response';
import { PerangkatAjarService } from '../../services/perangkat-ajar.service';
import { perangkatAjarUploadSchema, perangkatAjarReviewSchema } from '../../services/perangkat-ajar.schema';
import { DocumentStorageService } from '@/modules/document-center/services/document-storage.service';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { RoleName } from '@/constants/enums';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';
import axios from 'axios';
import { PdfGeneratorService } from '@/modules/reporting/services/pdf-generator.service';
import { buildAIPromptForJenis, buildFallbackHtmlForJenis } from '../../helpers/perangkat-ajar-layout.helper';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export class PerangkatPresetsController {
  static async getTopikPresets(req: any, reply: any) {
    try {
      const { jenjang, mapel_name, fase, tingkat, kategori } = req.query;

      const cleanMapelName = mapel_name
        ? String(mapel_name).replace(/\s*\([^)]*\)/g, '').trim()
        : undefined;

      let presets: any[] = [];

      if (cleanMapelName) {
        // Step 1: Query database GlobalTopikPreset for matching cleanMapelName
        const mapelWhere: any = {
          nama_mapel: { contains: cleanMapelName, mode: 'insensitive' }
        };
        if (fase) mapelWhere.fase = String(fase);
        if (tingkat) mapelWhere.tingkat = Number(tingkat);
        if (kategori) mapelWhere.kategori = String(kategori);


        // Try strict jenjang filter first
        if (jenjang) {
          presets = await prisma.globalTopikPreset.findMany({
            where: {
              ...mapelWhere,
              OR: [{ jenjang: String(jenjang).toUpperCase() }, { jenjang: 'ALL' }]
            },
            orderBy: [{ tingkat: 'asc' }, { created_at: 'desc' }]
          });
        }

        // Step 2: If strict jenjang returns empty, query database across ALL jenjang for this mapel
        if (presets.length === 0) {
          presets = await prisma.globalTopikPreset.findMany({
            where: mapelWhere,
            orderBy: [{ created_at: 'desc' }],
            take: 200
          });
        }

        // Step 3: If still empty in GlobalTopikPreset, query database GlobalPerangkatAjarLibrary
        if (presets.length === 0) {
          const libraryItems = await prisma.globalPerangkatAjarLibrary.findMany({
            where: { nama_mapel: { contains: cleanMapelName, mode: 'insensitive' } },
            take: 200,
            select: { id: true, judul: true, topik: true, jenis: true, jenjang: true }
          });

          if (libraryItems.length > 0) {
            presets = libraryItems.map(item => ({
              id: item.id,
              judul_topik: item.topik || item.judul,
              kategori: item.jenis,
              nama_mapel: cleanMapelName,
              jenjang: item.jenjang
            }));
          }
        }
      }

      // Step 4: Fallback if no mapel_name specified or completely unmatched mapel in DB
      if (presets.length === 0) {
        const generalWhere: any = {};
        if (jenjang) {
          generalWhere.OR = [{ jenjang: String(jenjang).toUpperCase() }, { jenjang: 'ALL' }];
        }
        if (fase) generalWhere.fase = String(fase);
        if (kategori) generalWhere.kategori = String(kategori);

        presets = await prisma.globalTopikPreset.findMany({
          where: generalWhere,
          orderBy: [{ created_at: 'desc' }]
        });
      }



      return sendResponse(reply, 200, true, 'Daftar preset topik berhasil dimuat secara dinamis dari database', presets);
    } catch (error: any) {
      return sendError(reply, 500, `Gagal memuat preset topik dari database: ${error.message}`, error);
    }
  }

  static async createTopikPreset(req: any, reply: any) {
    try {
      const { jenjang, nama_mapel, kode_mapel, fase, tingkat, judul_topik, deskripsi, kategori } = req.body;
      if (!jenjang || !nama_mapel || !judul_topik) {
        return reply.status(400).send({ success: false, message: 'Parameter jenjang, nama_mapel, dan judul_topik wajib diisi' });
      }

      const preset = await prisma.globalTopikPreset.create({
        data: {
          jenjang: String(jenjang).toUpperCase(),
          nama_mapel: String(nama_mapel).trim(),
          kode_mapel: kode_mapel ? String(kode_mapel).trim() : null,
          fase: fase ? String(fase).trim() : null,
          tingkat: tingkat ? Number(tingkat) : null,
          judul_topik: String(judul_topik).trim(),
          deskripsi: deskripsi ? String(deskripsi).trim() : null,
          kategori: kategori ? String(kategori).trim() : 'UMUM',
        }
      });

      await cacheInvalidationService.invalidateAcademicCache(req.user?.tenant_id || '');
      return sendResponse(reply, 201, true, 'Preset topik berhasil ditambahkan', preset);
    } catch (error: any) {
      return sendError(reply, 500, `Gagal membuat preset topik: ${error.message}`, error);
    }
  }

  static async updateTopikPreset(req: any, reply: any) {
    try {
      const { id } = req.params;
      const { jenjang, nama_mapel, kode_mapel, fase, tingkat, judul_topik, deskripsi, kategori } = req.body;

      const preset = await prisma.globalTopikPreset.update({
        where: { id },
        data: {
          jenjang: jenjang ? String(jenjang).toUpperCase() : undefined,
          nama_mapel: nama_mapel ? String(nama_mapel).trim() : undefined,
          kode_mapel: kode_mapel !== undefined ? (kode_mapel ? String(kode_mapel).trim() : null) : undefined,
          fase: fase !== undefined ? (fase ? String(fase).trim() : null) : undefined,
          tingkat: tingkat !== undefined ? (tingkat ? Number(tingkat) : null) : undefined,
          judul_topik: judul_topik ? String(judul_topik).trim() : undefined,
          deskripsi: deskripsi !== undefined ? (deskripsi ? String(deskripsi).trim() : null) : undefined,
          kategori: kategori ? String(kategori).trim() : undefined,
        }
      });

      await cacheInvalidationService.invalidateAcademicCache(req.user?.tenant_id || '');
      return sendResponse(reply, 200, true, 'Preset topik berhasil diperbarui', preset);
    } catch (error: any) {
      return sendError(reply, 500, `Gagal memperbarui preset topik: ${error.message}`, error);
    }
  }

  static async deleteTopikPreset(req: any, reply: any) {
    try {
      const { id } = req.params;
      await prisma.globalTopikPreset.delete({ where: { id } });
      await cacheInvalidationService.invalidateAcademicCache(req.user?.tenant_id || '');
      return sendResponse(reply, 200, true, 'Preset topik berhasil dihapus');
    } catch (error: any) {
      return sendError(reply, 500, `Gagal menghapus preset topik: ${error.message}`, error);
    }
  }






  static async getLibraryTemplates(req: any, reply: any) {
    try {
      const { jenjang, nama_mapel, jenis, tingkat, search } = req.query;

      const whereClause: any = {};
      if (jenjang) {
        whereClause.OR = [
          { jenjang: String(jenjang).toUpperCase() },
          { jenjang: 'ALL' }
        ];
      }
      if (nama_mapel) {
        whereClause.nama_mapel = {
          contains: String(nama_mapel),
          mode: 'insensitive',
        };
      }
      if (jenis) {
        whereClause.jenis = String(jenis);
      }
      if (tingkat) {
        whereClause.tingkat = Number(tingkat);
      }
      if (search) {
        whereClause.OR = [
          { judul: { contains: String(search), mode: 'insensitive' } },
          { topik: { contains: String(search), mode: 'insensitive' } },
          { nama_mapel: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      const templates = await prisma.globalPerangkatAjarLibrary.findMany({
        where: whereClause,
        orderBy: [
          { downloads_count: 'desc' },
          { created_at: 'desc' }
        ]
      });

      return sendResponse(reply, 200, true, 'Katalog Bank Perangkat Ajar Platform berhasil dimuat', templates);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memuat katalog Bank Perangkat Ajar Platform', error);
    }
  }

  static async createLibraryTemplate(req: any, reply: any) {
    try {
      const { jenjang, nama_mapel, kode_mapel, tingkat, fase, jenis, judul, topik, html_content } = req.body;
      if (!jenjang || !nama_mapel || !jenis || !judul) {
        return reply.status(400).send({ success: false, message: 'Parameter jenjang, nama_mapel, jenis, dan judul wajib diisi' });
      }

      const item = await prisma.globalPerangkatAjarLibrary.create({
        data: {
          jenjang: String(jenjang).toUpperCase(),
          nama_mapel: String(nama_mapel).trim(),
          kode_mapel: kode_mapel ? String(kode_mapel).trim() : null,
          tingkat: tingkat ? Number(tingkat) : null,
          fase: fase ? String(fase).trim() : null,
          jenis: String(jenis).trim(),
          judul: String(judul).trim(),
          topik: topik ? String(topik).trim() : null,
          file_url: 'perangkat-ajar/master_template.pdf',
          html_content: html_content ? String(html_content) : null
        }
      });

      return sendResponse(reply, 201, true, 'Template Bank Perangkat Ajar berhasil ditambahkan', item);
    } catch (error: any) {
      return sendError(reply, 500, `Gagal menambahkan template library: ${error.message}`, error);
    }
  }

  static async updateLibraryTemplate(req: any, reply: any) {
    try {
      const { id } = req.params;
      const { jenjang, nama_mapel, kode_mapel, tingkat, fase, jenis, judul, topik, html_content } = req.body;

      const item = await prisma.globalPerangkatAjarLibrary.update({
        where: { id },
        data: {
          jenjang: jenjang ? String(jenjang).toUpperCase() : undefined,
          nama_mapel: nama_mapel ? String(nama_mapel).trim() : undefined,
          kode_mapel: kode_mapel !== undefined ? (kode_mapel ? String(kode_mapel).trim() : null) : undefined,
          tingkat: tingkat !== undefined ? (tingkat ? Number(tingkat) : null) : undefined,
          fase: fase !== undefined ? (fase ? String(fase).trim() : null) : undefined,
          jenis: jenis ? String(jenis).trim() : undefined,
          judul: judul ? String(judul).trim() : undefined,
          topik: topik !== undefined ? (topik ? String(topik).trim() : null) : undefined,
          html_content: html_content !== undefined ? (html_content ? String(html_content) : null) : undefined,
        }
      });

      return sendResponse(reply, 200, true, 'Template Bank Perangkat Ajar berhasil diperbarui', item);
    } catch (error: any) {
      return sendError(reply, 500, `Gagal memperbarui template library: ${error.message}`, error);
    }
  }

  static async deleteLibraryTemplate(req: any, reply: any) {
    try {
      const { id } = req.params;
      await prisma.globalPerangkatAjarLibrary.delete({ where: { id } });
      return sendResponse(reply, 200, true, 'Template Bank Perangkat Ajar berhasil dihapus');
    } catch (error: any) {
      return sendError(reply, 500, `Gagal menghapus template library: ${error.message}`, error);
    }
  }


  static async claimLibraryTemplate(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { library_id, mapel_id, tahun_pelajaran_id, semester_id, guru_id } = req.body;

      let targetTahunId = tahun_pelajaran_id;
      let targetSemesterId = semester_id;

      // Auto-resolve active academic year & semester if not explicitly passed
      if (!targetTahunId || !targetSemesterId) {
        const activeTahun = await prisma.tahunPelajaran.findFirst({
          where: { tenant_id, is_active: true },
          include: { Semester: true }
        }) || await prisma.tahunPelajaran.findFirst({
          where: { tenant_id },
          include: { Semester: true },
          orderBy: { created_at: 'desc' }
        });

        if (activeTahun) {
          targetTahunId = targetTahunId || activeTahun.id;
          const activeSem = activeTahun.Semester.find((s: any) => s.is_active) || activeTahun.Semester[0];
          if (activeSem) {
            targetSemesterId = targetSemesterId || activeSem.id;
          }
        }
      }

      if (!library_id || !mapel_id || !targetTahunId || !targetSemesterId) {
        return reply.status(400).send({
          success: false,
          message: 'Parameter library_id, mapel_id, serta Tahun Pelajaran & Semester aktif sekolah tidak ditemukan.'
        });
      }


      const libraryItem = await prisma.globalPerangkatAjarLibrary.findUnique({
        where: { id: library_id }
      });
      if (!libraryItem) {
        return reply.status(404).send({ success: false, message: 'Template perangkat ajar tidak ditemukan di Bank Platform' });
      }

      // Determine target guru_id with full fallbacks for teachers & admins
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
        } else {
          return reply.status(400).send({
            success: false,
            message: 'Data profil guru pengajar belum terdaftar di sekolah ini. Silakan tambahkan data guru terlebih dahulu.'
          });
        }
      }


      // Increment download counter in library
      await prisma.globalPerangkatAjarLibrary.update({
        where: { id: library_id },
        data: { downloads_count: { increment: 1 } }
      });

      // Claim & duplicate to PerangkatAjar table (Status: APPROVED because it's pre-approved platform content)
      const result = await PerangkatAjarService.uploadPerangkat(tenant_id, {
        guru_id: targetGuruId,
        mapel_id,
        tahun_pelajaran_id: targetTahunId,
        semester_id: targetSemesterId,
        judul: libraryItem.judul,
        jenis: libraryItem.jenis,
        file_url: libraryItem.file_url,
      });


      // Set initial review notice (Status remains PENDING for teacher review & editing)
      await prisma.perangkatAjar.update({
        where: { id: result.id },
        data: {
          catatan_reviewer: 'Diadopsi dari Bank Perangkat Ajar Platform (AI Generated). Silakan periksa, sunting via editor jika perlu, dan ajukan ke Wakasek Kurikulum.',
        }
      });

      return sendResponse(reply, 201, true, 'Perangkat ajar berhasil diklaim ke repositori Anda (Status: PENDING). Silakan periksa dan sunting via editor jika diperlukan.', result);
    } catch (error: any) {
      return sendError(reply, 500, `Gagal mengklaim template perangkat ajar: ${error.message}`, error);
    }
  }

}
