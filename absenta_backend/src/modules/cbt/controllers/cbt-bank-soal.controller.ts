import { CbtBankSoalService } from '../services/cbt-bank-soal.service';
import { sendResponse, sendError } from '../../../utils/response';
import {
  createBankSoalSchema,
  updateBankSoalSchema,
  queryBankSoalSchema,
  createSoalPgSchema,
  updateSoalPgSchema,
  bulkImportSoalSchema,
  parseGoogleFormSchema,
  updateBankContributorsSchema,
} from '../schemas/cbt.schema';
import { z } from 'zod';

export class CbtBankSoalController {
  static async list(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const query = queryBankSoalSchema.parse(req.query);
      const result = await CbtBankSoalService.list(tenant_id, query);
      return sendResponse(reply, 200, true, 'Daftar bank soal berhasil diambil', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      return sendError(reply, 500, 'Gagal mengambil daftar bank soal', error);
    }
  }

  static async getById(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await CbtBankSoalService.getById(tenant_id, id);
      return sendResponse(reply, 200, true, 'Detail bank soal berhasil diambil', result);
    } catch (error: any) {
      return sendError(reply, 404, error.message || 'Bank soal tidak ditemukan');
    }
  }

  static async create(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsed = createBankSoalSchema.parse(req.body);
      const result = await CbtBankSoalService.create(tenant_id, parsed);
      return sendResponse(reply, 201, true, 'Bank soal berhasil dibuat', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      return sendError(reply, 400, error.message || 'Gagal membuat bank soal', error);
    }
  }

  static async update(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const parsed = updateBankSoalSchema.parse(req.body);
      const result = await CbtBankSoalService.update(tenant_id, id, parsed);
      return sendResponse(reply, 200, true, 'Bank soal berhasil diperbarui', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      return sendError(reply, 400, error.message || 'Gagal memperbarui bank soal', error);
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await CbtBankSoalService.delete(tenant_id, id);
      return sendResponse(reply, 200, true, 'Bank soal berhasil dihapus', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal menghapus bank soal');
    }
  }

  static async duplicate(req: any, reply: any) {
    try {
      const { tenant_id, guru_profile } = req.user!;
      const { id } = req.params;
      const targetGuruId = req.body?.guru_id || guru_profile?.id;
      const result = await CbtBankSoalService.duplicate(tenant_id, id, targetGuruId);
      return sendResponse(reply, 201, true, 'Bank soal berhasil diduplikasi ke akun Anda', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal menduplikasi bank soal');
    }
  }

  static async listContributors(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await CbtBankSoalService.listContributors(tenant_id, id);
      return sendResponse(reply, 200, true, 'Daftar kontributor bank soal berhasil diambil', result);
    } catch (error: any) {
      return sendError(reply, 404, error.message || 'Gagal mengambil daftar kontributor');
    }
  }

  static async updateContributors(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const parsed = updateBankContributorsSchema.parse(req.body || {});
      const manualContributors = [
        ...(parsed.contributors || []),
        ...(parsed.guru_ids || []).map((guru_id) => ({ guru_id, unit_pengajaran_id: null })),
      ];
      const result = await CbtBankSoalService.syncCollaborationContributors(tenant_id, id, {
        manualContributors,
        replaceExisting: true,
      });
      return sendResponse(reply, 200, true, 'Daftar kontributor bank soal berhasil diperbarui', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      return sendError(reply, 400, error.message || 'Gagal memperbarui kontributor bank soal');
    }
  }

  static async syncContributors(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await CbtBankSoalService.syncCollaborationContributors(tenant_id, id);
      return sendResponse(reply, 200, true, 'Kontributor kolaborasi & delegasi berhasil disinkronkan', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal menyinkronkan kontributor bank soal');
    }
  }

  // Question Items
  static async listQuestions(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params; // bank_soal_id
      const result = await CbtBankSoalService.listQuestions(tenant_id, id);
      return sendResponse(reply, 200, true, 'Daftar butir soal berhasil diambil', result);
    } catch (error: any) {
      return sendError(reply, 404, error.message || 'Gagal mengambil butir soal');
    }
  }

  static async createQuestion(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params; // bank_soal_id
      const parsed = createSoalPgSchema.parse(req.body);
      const result = await CbtBankSoalService.createQuestion(tenant_id, id, parsed, req.user);
      return sendResponse(reply, 201, true, 'Butir soal berhasil ditambahkan', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      const status = String(error?.message || '').startsWith('Akses ditolak') ? 403 : 400;
      return sendError(reply, status, error.message || 'Gagal menambahkan butir soal');
    }
  }

  static async updateQuestion(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { questionId } = req.params;
      const parsed = updateSoalPgSchema.parse(req.body);
      const result = await CbtBankSoalService.updateQuestion(tenant_id, questionId, parsed, req.user);
      return sendResponse(reply, 200, true, 'Butir soal berhasil diperbarui', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      const status = String(error?.message || '').startsWith('Akses ditolak') ? 403 : 400;
      return sendError(reply, status, error.message || 'Gagal memperbarui butir soal');
    }
  }

  static async deleteQuestion(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { questionId } = req.params;
      const result = await CbtBankSoalService.deleteQuestion(tenant_id, questionId, req.user);
      return sendResponse(reply, 200, true, 'Butir soal berhasil dihapus', result);
    } catch (error: any) {
      const status = String(error?.message || '').startsWith('Akses ditolak') ? 403 : 400;
      return sendError(reply, status, error.message || 'Gagal menghapus butir soal');
    }
  }

  static async bulkImportQuestions(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params; // bank_soal_id
      const parsed = bulkImportSoalSchema.parse(req.body);
      const result = await CbtBankSoalService.bulkImportQuestions(tenant_id, id, parsed.items, req.user);
      return sendResponse(reply, 201, true, 'Berhasil mengimpor butir soal', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      const status = String(error?.message || '').startsWith('Akses ditolak') ? 403 : 400;
      return sendError(reply, status, error.message || 'Gagal mengimpor butir soal');
    }
  }

  static async parseGoogleForm(req: any, reply: any) {
    try {
      const parsed = parseGoogleFormSchema.parse(req.body);
      const result = await CbtBankSoalService.parseGoogleForm(parsed.url);
      return sendResponse(reply, 200, true, 'Berhasil mengekstrak butir soal dari Google Form', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      return sendError(reply, 400, error.message || 'Gagal mengekstrak soal dari Google Form');
    }
  }
}
