import { sendResponse, sendError } from '../../../utils/response';
import { NilaiService } from '../services/nilai.service';
import {
  jenisNilaiCreateSchema,
  jenisNilaiUpdateSchema,
  nilaiSiswaUpsertSchema,
  bulkNilaiSiswaSchema,
} from '../services/penilaian.schema';
import { z } from 'zod';

export class NilaiController {
  // === JENIS PENILAIAN ===
  static async getAllJenis(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await NilaiService.getAllJenis(tenant_id);
      return sendResponse(reply, 200, true, 'Jenis penilaian retrieved', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve jenis penilaian', error);
    }
  }

  static async createJenis(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = jenisNilaiCreateSchema.parse(req.body);

      const result = await NilaiService.createJenis(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'Jenis penilaian created successfully', result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Failed to create jenis penilaian', error);
    }
  }

  static async updateJenis(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const parsed = jenisNilaiUpdateSchema.parse(req.body);

      const result = await NilaiService.updateJenis(tenant_id, id, parsed);
      return sendResponse(reply, 200, true, 'Jenis penilaian updated successfully', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, error.message.includes('not found') ? 404 : 500, 'Failed to update', error);
    }
  }

  static async deleteJenis(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;

      await NilaiService.deleteJenis(tenant_id, id);
      return sendResponse(reply, 200, true, 'Jenis penilaian deleted successfully');
    } catch (error: any) {
      return sendError(reply, error.message.includes('not found') ? 404 : 500, 'Failed to delete', error);
    }
  }

  // === NILAI SISWA ===
  static async getNilai(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { siswa_id, mapel_id, tahun_pelajaran_id, semester_id, jenis_nilai_id, kelas_id } = req.query;

      const result = await NilaiService.getNilai(tenant_id, {
        siswa_id,
        mapel_id,
        tahun_pelajaran_id,
        semester_id,
        jenis_nilai_id,
        kelas_id,
      });

      return sendResponse(reply, 200, true, 'Data nilai retrieved successfully', result);
    } catch (error) {
      return sendError(reply, 500, 'Failed to retrieve nilai', error);
    }
  }

  static async upsertNilai(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = nilaiSiswaUpsertSchema.parse(req.body);

      const result = await NilaiService.upsertNilai(tenant_id, parsed);
      return sendResponse(reply, 200, true, 'Nilai saved successfully', result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Failed to save nilai', error);
    }
  }

  static async upsertBulkNilai(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = bulkNilaiSiswaSchema.parse(req.body);

      const result = await NilaiService.upsertBulkNilai(tenant_id, parsed);
      return sendResponse(reply, 200, true, `${result.length} nilai saved successfully`, result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map((e) => e.message).join(', '),
          errors: error.errors,
        });
      }
      return sendError(reply, 500, 'Failed to bulk save nilai', error);
    }
  }

  static async upsertBatchSumatif(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { mapel_id, tahun_pelajaran_id, semester_id, scores } = req.body;

      if (!mapel_id || !tahun_pelajaran_id || !semester_id || !Array.isArray(scores)) {
        return reply.status(400).send({
          success: false,
          message: 'mapel_id, tahun_pelajaran_id, semester_id, dan scores (array) wajib diisi',
        });
      }

      const result = await NilaiService.upsertBatchSumatifNilai(tenant_id, {
        mapel_id,
        tahun_pelajaran_id,
        semester_id,
        scores,
      });

      return sendResponse(reply, 200, true, 'Batch nilai sumatif berhasil disimpan & dikalkulasi', result);
    } catch (error: any) {
      return sendError(reply, 500, error.message || 'Gagal menyimpan batch nilai sumatif', error);
    }
  }

  static async exportEraporKemendikbud(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { kelas_id, mapel_id, tahun_pelajaran_id, semester_id } = req.query;

      if (!kelas_id || !mapel_id || !tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({
          success: false,
          message: 'kelas_id, mapel_id, tahun_pelajaran_id, dan semester_id wajib diisi',
        });
      }

      const { filename, buffer } = await NilaiService.exportEraporKemendikbud(tenant_id, {
        kelas_id,
        mapel_id,
        tahun_pelajaran_id,
        semester_id,
      });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(buffer);
    } catch (error: any) {
      return sendError(reply, 500, error.message || 'Failed to export e-Rapor Kemendikbud', error);
    }
  }

  static async exportErapor(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { kelas_id, mapel_id, tahun_pelajaran_id, semester_id, jenis_nilai_id } = req.query;

      if (!kelas_id || !mapel_id || !tahun_pelajaran_id || !semester_id || !jenis_nilai_id) {
        return reply.status(400).send({
          success: false,
          message: 'kelas_id, mapel_id, tahun_pelajaran_id, semester_id, dan jenis_nilai_id wajib diisi'
        });
      }

      const { filename, buffer } = await NilaiService.exportErafor(tenant_id, {
        kelas_id,
        mapel_id,
        tahun_pelajaran_id,
        semester_id,
        jenis_nilai_id
      });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(buffer);
    } catch (error: any) {
      return sendError(reply, 500, error.message || 'Failed to export e-Rapor Excel', error);
    }
  }

  static async importNilai(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const fileData = await req.file();
      if (!fileData) {
        return reply.status(400).send({
          success: false,
          message: 'Berkas Excel wajib diunggah'
        });
      }

      const mapel_id = fileData.fields.mapel_id?.value;
      const tahun_pelajaran_id = fileData.fields.tahun_pelajaran_id?.value;
      const semester_id = fileData.fields.semester_id?.value;
      const jenis_nilai_id = fileData.fields.jenis_nilai_id?.value;
      const sesi_absensi_id = fileData.fields.sesi_absensi_id?.value;

      if (!mapel_id || !tahun_pelajaran_id || !semester_id || !jenis_nilai_id) {
        return reply.status(400).send({
          success: false,
          message: 'Parameter mapel_id, tahun_pelajaran_id, semester_id, dan jenis_nilai_id wajib disertakan dalam form fields'
        });
      }

      const buffer = await fileData.toBuffer();
      const result = await NilaiService.importNilaiExcel(tenant_id, buffer, {
        mapel_id,
        tahun_pelajaran_id,
        semester_id,
        jenis_nilai_id,
        sesi_absensi_id
      });

      return sendResponse(
        reply,
        200,
        true,
        `Berhasil mengimpor ${result.success_count} nilai siswa. ${result.skipped.length} baris dilewati.`,
        result
      );
    } catch (error: any) {
      return sendError(reply, 500, error.message || 'Gagal mengimpor nilai dari Excel', error);
    }
  }

  static async downloadTemplate(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { kelas_id, mapel_id, jenis_nilai_id, mode } = req.query;

      if (!kelas_id || !mapel_id) {
        return reply.status(400).send({
          success: false,
          message: 'kelas_id dan mapel_id wajib diisi'
        });
      }

      const { filename, buffer } = await NilaiService.generateImportTemplateExcel(tenant_id, {
        kelas_id,
        mapel_id,
        jenis_nilai_id,
        mode
      });

      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return reply.send(buffer);
    } catch (error: any) {
      return sendError(reply, 500, error.message || 'Gagal mengunduh template Excel', error);
    }
  }

  static async getTeacherProgress(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const user = req.user!;
      const { tahun_pelajaran_id, semester_id } = req.query;

      const result = await NilaiService.getTeacherProgress(
        tenant_id,
        { id: user.id, roleName: user.roleName },
        { tahun_pelajaran_id, semester_id }
      );

      return sendResponse(reply, 200, true, 'Progres pengisian nilai berhasil dimuat', result);
    } catch (error: any) {
      return sendError(reply, 500, error.message || 'Gagal memuat progres pengisian nilai', error);
    }
  }
}
