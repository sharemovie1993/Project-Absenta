import { sendResponse, sendError } from '../../../utils/response';
import { PerangkatAjarService } from '../services/perangkat-ajar.service';
import { perangkatAjarUploadSchema, perangkatAjarReviewSchema } from '../services/perangkat-ajar.schema';
import { DocumentStorageService } from '../../document-center/services/document-storage.service';
import { authorizationService } from '../../auth/services/authorization.service';
import { RoleName } from '../../../constants/enums';
import { prisma } from '../../../utils/prisma';
import { z } from 'zod';
import axios from 'axios';
import { PdfGeneratorService } from '../../reporting/services/pdf-generator.service';
import { buildAIPromptForJenis, buildFallbackHtmlForJenis } from '../helpers/perangkat-ajar-layout.helper';





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

  static async download(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      const perangkat = await PerangkatAjarService.getPerangkatById(tenant_id, id);
      if (!perangkat) {
        return reply.status(404).send({ success: false, message: 'Perangkat ajar tidak ditemukan' });
      }

      // Fetch Tenant & Sekolah Info for PrintHeader Logos & Address
      const tenant = await prisma.tenant.findUnique({ where: { id: tenant_id } });
      const sekolah = await prisma.sekolah.findFirst({ where: { tenant_id } });

      const safeTitle = (perangkat.judul || 'perangkat-ajar').replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_');
      const cleanFilename = `${safeTitle}.pdf`;

      // Generate Full Official 5-Page HTML with PrintHeader Logos
      const fullHtml = generateOfficialKurikulumHtml(perangkat, tenant, sekolah);

      // Render to PDF using Puppeteer / PdfGeneratorService
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

  static async generateAI(req: any, reply: any) {
    try {
      const { jenis, mapel_name, kelas, topik, alokasi_waktu } = req.body;
      if (!jenis || !mapel_name || !kelas || !topik) {
        return reply.status(400).send({ success: false, message: 'Parameter jenis, mapel_name, kelas, dan topik wajib diisi' });
      }

      // Dynamic Fase Inference Helper based on Kurikulum Merdeka
      const kStr = String(kelas || '').toUpperCase().trim();
      let dynamicFase = 'E';
      if (kStr.includes('XI') || kStr.includes('XII') || kStr.includes('11') || kStr.includes('12')) dynamicFase = 'F';
      else if (kStr.includes('VII') || kStr.includes('VIII') || kStr.includes('IX') || kStr.includes('7') || kStr.includes('8') || kStr.includes('9')) dynamicFase = 'D';
      else if (kStr.includes('5') || kStr.includes('6')) dynamicFase = 'C';
      else if (kStr.includes('3') || kStr.includes('4')) dynamicFase = 'B';
      else if (kStr.includes('1') || kStr.includes('2')) dynamicFase = 'A';

      // ─── Fetch data TTD dinamis ──────────────────────────────────────────────
      // 1. Data Guru dari profil guru yang sedang login
      let namaGuru: string | undefined;
      let nipGuru: string | undefined;
      if (req.user?.id) {
        const guruRecord = await prisma.guru.findFirst({
          where: { user_id: req.user.id, tenant_id: req.user.tenant_id },
          select: { nama_guru: true, nip: true }
        });
        if (guruRecord) {
          namaGuru = guruRecord.nama_guru;
          nipGuru = guruRecord.nip || undefined;
        }
      }

      // 2. Data Kepala Sekolah & Lokasi dari tabel Sekolah (System Config Sekolah)
      let namaKepsek: string | undefined;
      let nipKepsek: string | undefined;
      let kotaSekolah: string | undefined;
      let namaSekolah: string | undefined;
      let tahunPelajaran: string | undefined;
      if (req.user?.tenant_id) {
        const sekolah = await prisma.sekolah.findFirst({
          where: { tenant_id: req.user.tenant_id },
          select: {
            nama: true,
            kota: true,
            kepala_sekolah: true,
            nip_kepala: true,
          }
        }).catch(() => null);

        if (sekolah) {
          namaSekolah = sekolah.nama;
          kotaSekolah = sekolah.kota || undefined;
          namaKepsek = sekolah.kepala_sekolah || undefined;
          nipKepsek = sekolah.nip_kepala || undefined;
        }

        // Ambil tahun pelajaran aktif untuk keterangan tanggal TTD
        const activeTahun = await prisma.tahunPelajaran.findFirst({
          where: { tenant_id: req.user.tenant_id, is_active: true },
          select: { tahun: true }
        });
        tahunPelajaran = activeTahun?.tahun || undefined;
      }
      // ────────────────────────────────────────────────────────────────────────

      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
      let cleanedHtml = '';

      const layoutContext = {
        jenis,
        mapel_name,
        kelas,
        dynamicFase,
        topik,
        alokasi_waktu,
        // Injeksi TTD dinamis
        nama_guru: namaGuru,
        nip_guru: nipGuru,
        nama_kepala_sekolah: namaKepsek,
        nip_kepala_sekolah: nipKepsek,
        nama_sekolah: namaSekolah,
        kota_sekolah: kotaSekolah,
        tahun_pelajaran: tahunPelajaran,
      };

      if (apiKey) {
        const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        const prompt = buildAIPromptForJenis(layoutContext);

        for (const model of models) {
          try {
            const response = await axios.post(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 }
              },
              { timeout: 15000 }
            );

            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              cleanedHtml = text.trim();
              if (cleanedHtml.startsWith('```html')) cleanedHtml = cleanedHtml.substring(7);
              else if (cleanedHtml.startsWith('```')) cleanedHtml = cleanedHtml.substring(3);
              if (cleanedHtml.endsWith('```')) cleanedHtml = cleanedHtml.substring(0, cleanedHtml.length - 3);
              cleanedHtml = cleanedHtml.trim();
              break;
            }
          } catch (e: any) {
            console.warn(`[GEMINI AI] Model ${model} failed, trying next fallback: ${e.message}`);
          }
        }
      }

      // Fallback HTML Generator khusus per jenis perangkat dari helper
      if (!cleanedHtml) {
        cleanedHtml = buildFallbackHtmlForJenis(layoutContext);
      }

      return sendResponse(reply, 200, true, 'Draf perangkat ajar berhasil dibuat dengan AI', { content: cleanedHtml });
    } catch (error: any) {
      const errMsg = error.response?.data?.error?.message || error.message;
      return sendError(reply, 500, `Gagal memproses draf perangkat ajar AI: ${errMsg}`, error);
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

      return sendResponse(reply, 200, true, 'Perubahan naskah perangkat ajar berhasil disimpan', result);
    } catch (error: any) {
      return sendError(reply, 500, `Gagal menyimpan dokumen editor: ${error.message}`, error);
    }
  }

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

      return sendResponse(reply, 200, true, 'Preset topik berhasil diperbarui', preset);
    } catch (error: any) {
      return sendError(reply, 500, `Gagal memperbarui preset topik: ${error.message}`, error);
    }
  }

  static async deleteTopikPreset(req: any, reply: any) {
    try {
      const { id } = req.params;
      await prisma.globalTopikPreset.delete({ where: { id } });
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
}

function generateOfficialKurikulumHtml(perangkat: any, tenant: any, sekolah: any): string {
  const logoDaerah = tenant?.logo_daerah_url || sekolah?.logo_daerah_url || 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg';
  const logoSekolah = tenant?.logo_url || sekolah?.logo_sekolah_url || sekolah?.logo_url || 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg';

  const dinasAtas = (tenant?.nama_dinas_atas || sekolah?.nama_dinas_atas || 'PEMERINTAH DAERAH PROVINSI JAWA BARAT').toUpperCase();
  const dinasBawah = (tenant?.nama_dinas_bawah || sekolah?.nama_dinas_bawah || 'DINAS PENDIDIKAN').toUpperCase();
  const cabangDinas = (tenant?.nama_cabang_dinas || sekolah?.nama_cabang_dinas || 'KANTOR CABANG DINAS PENDIDIKAN WILAYAH IV').toUpperCase();
  const namaSekolah = (tenant?.name || sekolah?.nama_sekolah || 'SEKOLAH MENENGAH KEJURUAN NEGERI 1 PLERED').toUpperCase();

  const alamatLengkap = tenant?.address || sekolah?.alamat || 'Jl. Rawasari, Plered - Purwakarta';
  const telepon = tenant?.phone || sekolah?.telepon || '087779937341';
  const website = tenant?.website || sekolah?.website || 'smkn1plered.sch.id';
  const email = tenant?.email || sekolah?.email || 'nsple@gmail.com';

  const judul = perangkat.judul || 'Modul Ajar Kurikulum Merdeka';
  const jenis = (perangkat.jenis || 'MODUL_AJAR').replace('_', ' ');
  const namaGuru = perangkat.Guru?.nama_guru || 'Guru Pengajar';
  const nipGuru = perangkat.Guru?.nip || '-';
  const namaMapel = perangkat.Mapel?.nama_mapel || 'Mata Pelajaran';
  const kodeMapel = perangkat.Mapel?.kode_mapel || 'KBM';
  const tahunPel = perangkat.TahunPelajaran?.tahun || '2025/2026';
  const semester = perangkat.Semester?.nama_semester || 'Genap';
  const status = perangkat.status || 'APPROVED';
  const reviewerNote = perangkat.catatan_reviewer || 'Diadopsi secara resmi dari Bank Perangkat Ajar Platform Absenta';

  const kopHtml = `
    <div class="header-kop">
      <table class="header-table">
        <tr>
          <td style="width: 90px; text-align: left; vertical-align: middle;">
            <img src="${logoDaerah}" class="logo-img" alt="Logo Daerah" />
          </td>
          <td class="kop-title">
            <div style="font-size: 11pt; font-weight: bold; font-family: Arial, sans-serif;">${dinasAtas}</div>
            <div style="font-size: 11pt; font-weight: bold; font-family: Arial, sans-serif;">${dinasBawah}</div>
            <div style="font-size: 9.5pt; font-weight: bold; font-family: Arial, sans-serif;">${cabangDinas}</div>
            <div style="font-size: 13.5pt; font-weight: 900; font-family: Arial, sans-serif; margin-top: 2px;">${namaSekolah}</div>
            <div style="font-size: 8.5pt; font-weight: normal; font-family: 'Times New Roman', Times, serif; margin-top: 3px;">
              ${alamatLengkap} | Telp: ${telepon} | Website: ${website} | Email: ${email}
            </div>
          </td>
          <td style="width: 90px; text-align: right; vertical-align: middle;">
            <img src="${logoSekolah}" class="logo-img" alt="Logo Sekolah" />
          </td>
        </tr>
      </table>
    </div>
  `;

  // Determine actual content: Use real html_content if available, otherwise build structured content
  let processedContent = (perangkat.html_content && perangkat.html_content.trim().length > 30)
    ? (perangkat.html_content.includes('header-kop') ? perangkat.html_content : `${kopHtml}\n${perangkat.html_content}`)
    : null;

  if (processedContent) {
    // Inject page breaks before major section headers if not present
    processedContent = processedContent
      .replace(/<h3>\s*(IV\.|VI\.|VII\.|VIII\.)/gi, (match: string) => `<div style="page-break-before: always; break-before: page;"></div>${match}`);


    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${judul}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Times New Roman', Times, serif; color: #0f172a; margin: 0; padding: 0; font-size: 10.5pt; line-height: 1.5; background: #fff; }
            .header-kop { border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 15px; width: 100%; }
            .header-table { width: 100%; border-collapse: collapse; border: none; }
            .header-table td { border: none; padding: 0; vertical-align: middle; }
            .logo-img { height: 75px; width: auto; object-fit: contain; }
            .kop-title { text-align: center; font-family: Arial, sans-serif; }
            h2 { font-size: 12pt; text-align: center; text-transform: uppercase; text-decoration: underline; margin-top: 15px; font-family: Arial, sans-serif; }
            h3 { font-size: 10pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 3px; margin-top: 15px; font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; }
            th, td { border: 1px solid #475569; padding: 5px 8px; font-size: 9.5pt; vertical-align: top; }
            th { background-color: #f1f5f9; font-weight: bold; text-align: left; }
            .grid-2 { display: table; width: 100%; margin-top: 8px; }
            .col-2 { display: table-cell; width: 50%; padding: 4px; vertical-align: top; }
            .box-card { border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px; font-size: 9.5pt; }
            ul { margin: 4px 0; padding-left: 18px; }
            li { margin-bottom: 2px; }
            .flex-between { width: 100%; margin-top: 25px; display: table; }
            .col-sign { display: table-cell; width: 33%; text-align: center; font-size: 9.5pt; vertical-align: bottom; }
          </style>
        </head>
        <body>
          ${processedContent}
        </body>
      </html>
    `;
  }


  return `
    <!DOCTYPE html>


    <html>
      <head>
        <meta charset="utf-8">
        <title>${judul}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Times New Roman', Times, serif; color: #0f172a; margin: 0; padding: 0; font-size: 10.5pt; line-height: 1.5; }
          .page-card { page-break-after: always; padding-bottom: 20px; }
          .header-kop { border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 15px; width: 100%; }
          .header-table { width: 100%; border-collapse: collapse; border: none; }
          .header-table td { border: none; padding: 0; vertical-align: middle; }
          .logo-img { height: 75px; width: auto; object-fit: contain; }
          .kop-title { text-align: center; font-family: Arial, sans-serif; }
          h2 { font-size: 12pt; text-align: center; text-transform: uppercase; text-decoration: underline; margin-top: 15px; font-family: Arial, sans-serif; }
          h3 { font-size: 10pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 3px; margin-top: 15px; font-family: Arial, sans-serif; }
          table.data-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; }
          table.data-table th, table.data-table td { border: 1px solid #475569; padding: 5px 8px; font-size: 9.5pt; vertical-align: top; }
          table.data-table th { background-color: #f1f5f9; font-weight: bold; text-align: left; }
          .grid-2 { display: table; width: 100%; margin-top: 8px; }
          .col-2 { display: table-cell; width: 50%; padding: 4px; vertical-align: top; }
          .box-card { border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px; font-size: 9.5pt; }
          ul { margin: 4px 0; padding-left: 18px; }
          li { margin-bottom: 2px; }
          .flex-between { width: 100%; margin-top: 25px; display: table; }
          .col-sign { display: table-cell; width: 33%; text-align: center; font-size: 9.5pt; vertical-align: bottom; }
        </style>
      </head>
      <body>
        <!-- HALAMAN 1 -->
        <div class="page-card">
          ${kopHtml}

          <h2>${judul}</h2>
          <div style="text-align: center; font-size: 9pt; font-weight: bold; margin-bottom: 15px;">
            JENIS BERKAS: ${jenis} | STATUS: ${status} (VERIFIED PLATFORM)
          </div>

          <h3>I. INFORMASI UMUM PERANGKAT AJAR</h3>
          <table class="data-table">
            <tr>
              <th style="width: 35%;">Nama Penyusun / Guru Pengampu</th>
              <td><b>${namaGuru}</b> (NIP. ${nipGuru})</td>
            </tr>
            <tr>
              <th>Mata Pelajaran & Kode Mapel</th>
              <td><b>${namaMapel}</b> (${kodeMapel})</td>
            </tr>
            <tr>
              <th>Fase / Kelas / Jenjang</th>
              <td>Fase F / Kelas XI - XII / SMK-SMA</td>
            </tr>
            <tr>
              <th>Tahun Pelajaran & Semester</th>
              <td>Tahun Pelajaran ${tahunPel} (${semester})</td>
            </tr>
            <tr>
              <th>Alokasi Waktu & Model KBM</th>
              <td>2 x 45 Menit (4 JP / Minggu) — Problem-Based Learning (PBL)</td>
            </tr>
          </table>

          <h3>II. SARANA PRASARANA & TARGET PESERTA DIDIK</h3>
          <div class="grid-2">
            <div class="col-2">
              <div class="box-card">
                <b>A. Sarana & Media Belajar:</b>
                <ul>
                  <li>Laptop, LCD Projector, & Akses Internet Sekolah</li>
                  <li>Slide Presentasi Interaktif & Modul Digital</li>
                  <li>Lembar Kerja Peserta Didik (LKPD) Cetak/Digital</li>
                </ul>
              </div>
            </div>
            <div class="col-2">
              <div class="box-card">
                <b>B. Target Peserta Didik:</b>
                <ul>
                  <li>Peserta Didik Reguler/Tipikal (80%)</li>
                  <li>Peserta Didik Kesulitan Belajar (10%)</li>
                  <li>Pencapaian Tinggi (10%)</li>
                </ul>
              </div>
            </div>
          </div>

          <h3>III. DIMENSI PROFIL PELAJAR PANCASILA</h3>
          <table class="data-table">
            <tr>
              <th>Dimensi Utama</th>
              <th>Indikator Ketercapaian Sikap</th>
            </tr>
            <tr>
              <td>1. Beriman & Bertaqwa</td>
              <td>Integritas moral dan kedisiplinan beribadah</td>
            </tr>
            <tr>
              <td>2. Bernalar Kritis</td>
              <td>Menganalisis masalah rasional dan logis</td>
            </tr>
            <tr>
              <td>3. Gotong Royong</td>
              <td>Kolaborasi dan aktif dalam diskusi kelompok</td>
            </tr>
            <tr>
              <td>4. Kreatif & Mandiri</td>
              <td>Merancang gagasan inovatif secara mandiri</td>
            </tr>
          </table>
        </div>

        <!-- HALAMAN 2 -->
        <div class="page-card">
          <h3>IV. CAPAIAN & TUJUAN PEMBELAJARAN (CP & TP)</h3>
          <div class="box-card" style="margin-bottom: 10px;">
            <b>Capaian Pembelajaran (CP) Elemen Utama:</b><br />
            Peserta didik mampu menganalisis, mengidentifikasi, dan mengaplikasikan kompetensi sub-topik ${judul} secara kritis, reflektif, dan rasional dalam konteks nyata.
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 8%;">No</th>
                <th style="width: 42%;">Tujuan Pembelajaran (TP)</th>
                <th style="width: 50%;">Indikator Ketercapaian Sub-Kriteria (KKTP)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Menjelaskan konsep dasar dan prinsip materi ${judul}</td>
                <td>Siswa mampu mendefinisikan istilah utama dan prinsip dasar dengan akurat 100%.</td>
              </tr>
              <tr>
                <td>2</td>
                <td>Menganalisis studi kasus nyata dan mencari pemecahan masalah</td>
                <td>Siswa mampu membedakan struktur, pola masalah, dan solusi efisien secara ilmiah.</td>
              </tr>
              <tr>
                <td>3</td>
                <td>Merancang produk/laporan hasil analisis KBM</td>
                <td>Siswa mampu mempublikasikan hasil diskusi kelompok dalam bentuk LKPD/karya projek.</td>
              </tr>
            </tbody>
          </table>

          <h3>V. PEMAHAMAN BERMAKNA & PERTANYAAN PEMANTIK</h3>
          <div class="box-card">
            <b>A. Pemahaman Bermakna:</b><br />
            Pemahaman mendalam mengenai ${judul} membantu peserta didik memecahkan masalah kontekstual di kehidupan sehari-hari dan dunia industri.<br /><br />
            <b>B. Pertanyaan Pemantik:</b><br />
            1. Mengapa pemahaman konsep dasar ${judul} sangat krusial dalam pemecahan masalah nyata?<br />
            2. Langkah paling inovatif apa yang dapat Anda ambil untuk mengatasi kendala utama dalam studi kasus tersebut?
          </div>
        </div>

        <!-- HALAMAN 3 -->
        <div class="page-card">
          <h3>VI. SKENARIO KEGIATAN PEMBELAJARAN (KBM 3 PERTEMUAN)</h3>

          <div style="font-weight: bold; font-size: 10pt; margin-top: 5px;">A. Pertemuan Ke-1: Konsepsi Dasar & Orientasi Masalah (90 Menit)</div>
          <table class="data-table">
            <tr><th style="width: 25%;">Pendahuluan (15 M)</th><td>Apersepsi, salam pembuka, doa bersama, dan penjelasan tujuan KBM.</td></tr>
            <tr><th>Kegiatan Inti (60 M)</th><td>Orientasi masalah, pembentukan kelompok diskusi (4-5 siswa), penayangan materi pemantik, dan pengerjaan LKPD Tahap 1.</td></tr>
            <tr><th>Penutup (15 M)</th><td>Refleksi singkat, penyampaian kesimpulan awal, dan doa penutup.</td></tr>
          </table>

          <div style="font-weight: bold; font-size: 10pt; margin-top: 10px;">B. Pertemuan Ke-2: Analisis & Eksplorasi Projek Kelompok (90 Menit)</div>
          <table class="data-table">
            <tr><th style="width: 25%;">Pendahuluan (15 M)</th><td>Review materi minggu lalu, pemanasan KBM, dan pengorganisasian tugas.</td></tr>
            <tr><th>Kegiatan Inti (60 M)</th><td>Pengumpulan data, diskusi analisis masalah, penyusunan solusi, dan pendampingan guru.</td></tr>
            <tr><th>Penutup (15 M)</th><td>Evaluasi progres kelompok dan penjelasan persiapan presentasi minggu depan.</td></tr>
          </table>

          <div style="font-weight: bold; font-size: 10pt; margin-top: 10px;">C. Pertemuan Ke-3: Presentasi Hasil & Asesmen Evaluasi (90 Menit)</div>
          <table class="data-table">
            <tr><th style="width: 25%;">Pendahuluan (15 M)</th><td>Check-in kesiapan media presentasi kelompok dan tata tertib diskusi.</td></tr>
            <tr><th>Kegiatan Inti (60 M)</th><td>Presentasi karya kelompok, sesi tanya jawab antar-siswa, dan umpan balik guru.</td></tr>
            <tr><th>Penutup (15 M)</th><td>Refleksi KBM akhir, pengumuman nilai terbaik, dan motivasi penutup.</td></tr>
          </table>
        </div>

        <!-- HALAMAN 4 -->
        <div class="page-card">
          <h3>VII. LAMPIRAN LEMBAR KERJA PESERTA DIDIK (LKPD)</h3>
          <div class="box-card">
            <b>Petunjuk Kerja Siswa:</b><br />
            1. Bacalah modul bacaan dan ikuti petunjuk pengerjaan soal di bawah ini.<br />
            2. Diskusikan bersama anggota kelompok Anda dan tuliskan jawaban pada lembar yang disediakan.<br />
            3. Presentasikan hasil karya kelompok Anda di depan kelas.
          </div>

          <div style="margin-top: 10px;">
            <b>Soal & Studi Kasus Analisis:</b>
            <ol>
              <li>Jelaskan definisi dan komponen utama dari ${judul} berdasarkan hasil pengamatan Anda!</li>
              <li>Analisis kendala utama yang sering muncul pada kasus di atas dan berikan solusinya!</li>
              <li>Buatlah rancangan ide inovatif kelompok Anda dalam bentuk diagram alur/sketsa projek!</li>
            </ol>
          </div>
        </div>

        <!-- HALAMAN 5 -->
        <div class="page-card">
          <h3>VIII. RUBRİK PENILAIAN & ASESMEN</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 25%;">Aspek Penilaian</th>
                <th>Indikator Kriteria Ketercapaian (KKTP)</th>
                <th style="width: 25%;">Teknik Asesmen</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>1. Sikap (Profil Pancasila)</b></td>
                <td>Keaktifan, integritas, dan gotong royong dalam KBM</td>
                <td>Observasi Jurnal</td>
              </tr>
              <tr>
                <td><b>2. Pengetahuan (Kognitif)</b></td>
                <td>Kemampuan analisis dan pemahaman materi</td>
                <td>Tes Formatif / Kuis</td>
              </tr>
              <tr>
                <td><b>3. Keterampilan (Psikomotor)</b></td>
                <td>Kelengkapan laporan LKPD dan estetika presentasi</td>
                <td>Unjuk Kerja / Produk</td>
              </tr>
            </tbody>
          </table>

          <h3>IX. GLOSARIUM & DAFTAR PUSTAKA</h3>
          <div class="grid-2">
            <div class="col-2">
              <div class="box-card">
                <b>A. Glosarium:</b>
                <ul>
                  <li><b>CP:</b> Capaian Pembelajaran</li>
                  <li><b>ATP:</b> Alur Tujuan Pembelajaran</li>
                  <li><b>LKPD:</b> Lembar Kerja Peserta Didik</li>
                </ul>
              </div>
            </div>
            <div class="col-2">
              <div class="box-card">
                <b>B. Daftar Pustaka:</b>
                <ul>
                  <li>Panduan Pembelajaran & Asesmen Kemendikbudristek (2024)</li>
                  <li>Buku Teks Utama Siswa & Guru Kemendikbudristek</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="flex-between">
            <div class="col-sign">
              Mengetahui,<br />
              <b>Kepala Sekolah</b><br /><br /><br /><br />
              <u>Dr. H. Mulyadi, M.Pd.</u><br />
              NIP. 19780512 200312 1 002
            </div>

            <div class="col-sign" style="border: 1px solid #10b981; background: #ecfdf5; padding: 6px; font-size: 8pt;">
              <b style="color: #047857;">REPOSITORI ABSENTA VERIFIED</b><br />
              Status: <b>${status}</b><br />
              Catatan: <b>${reviewerNote}</b>
            </div>

            <div class="col-sign">
              Guru Pengampu,<br />
              <b>Mata Pelajaran</b><br /><br /><br /><br />
              <u>${namaGuru}</u><br />
              NIP. ${nipGuru}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}






