import { CbtTestEngineService } from '../services/cbt-test-engine.service';
import { sendResponse, sendError } from '../../../utils/response';
import {
  verifyExamTokenSchema,
  startExamSessionSchema,
  syncAnswersBatchSchema,
  recordViolationSchema,
  submitExamFinalSchema,
} from '../schemas/cbt.schema';
import { prisma } from '@/utils/prisma';
import { z } from 'zod';

export class CbtTestEngineController {
  /**
   * Helper untuk mendapatkan ID Siswa dari akun yang sedang login
   */
  private static async resolveSiswaId(req: any): Promise<string> {
    const { tenant_id, id: userId } = req.user!;
    if (req.user.siswa_id) return req.user.siswa_id;

    const profile = await prisma.siswa.findFirst({
      where: { user_id: userId, tenant_id },
      select: { id: true },
    });

    if (!profile) {
      throw new Error('Akun Anda tidak terhubung dengan data profil Siswa');
    }

    return profile.id;
  }

  /**
   * Daftar jadwal ujian siswa yang sedang login
   */
  static async getMyExams(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const siswaId = await CbtTestEngineController.resolveSiswaId(req);
      const result = await CbtTestEngineService.getMyExams(tenant_id, siswaId);
      return sendResponse(reply, 200, true, 'Daftar ujian siswa', result);
    } catch (error: any) {
      return sendError(reply, 400, error.message || 'Gagal memuat daftar ujian');
    }
  }

  /**
   * Verifikasi token ujian
   */
  static async verifyToken(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const siswaId = await CbtTestEngineController.resolveSiswaId(req);
      const parsed = verifyExamTokenSchema.parse(req.body);
      const result = await CbtTestEngineService.verifyToken(tenant_id, parsed.token_ujian, siswaId);
      return sendResponse(reply, 200, true, 'Token ujian valid', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      return sendError(reply, 400, error.message || 'Token tidak valid');
    }
  }

  /**
   * Mulai atau lanjutkan sesi ujian
   */
  static async startSession(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const siswaId = await CbtTestEngineController.resolveSiswaId(req);
      const parsed = startExamSessionSchema.parse(req.body);
      const result = await CbtTestEngineService.startOrResumeSession(
        tenant_id,
        parsed.jadwal_ujian_id,
        siswaId,
        parsed.token_masuk,
        parsed.metadata_perangkat
      );
      return sendResponse(reply, 200, true, 'Sesi ujian berhasil dimulai', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      return sendError(reply, 400, error.message || 'Gagal memulai sesi ujian');
    }
  }

  /**
   * Sinkronisasi batch jawaban ke Redis buffer (Autosave background)
   */
  static async syncAnswers(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { jadwalId } = req.params;
      const siswaId = await CbtTestEngineController.resolveSiswaId(req);
      const parsed = syncAnswersBatchSchema.parse(req.body);
      const result = await CbtTestEngineService.syncAnswersBatch(
        tenant_id,
        jadwalId,
        siswaId,
        parsed
      );
      return sendResponse(reply, 200, true, 'Jawaban tersinkronisasi', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      return sendError(reply, 500, 'Gagal menyinkronkan jawaban', error);
    }
  }

  /**
   * Catat pelanggaran pengawasan anti-curang
   */
  static async recordViolation(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { jadwalId } = req.params;
      const siswaId = await CbtTestEngineController.resolveSiswaId(req);
      const parsed = recordViolationSchema.parse(req.body);
      const result = await CbtTestEngineService.recordViolation(
        tenant_id,
        jadwalId,
        siswaId,
        parsed
      );
      return sendResponse(reply, 200, true, 'Pelanggaran dicatat', result);
    } catch (error: any) {
      return sendError(reply, 500, 'Gagal mencatat pelanggaran', error);
    }
  }

  /**
   * Submit final ujian
   */
  static async submitFinal(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { jadwalId } = req.params;
      const siswaId = await CbtTestEngineController.resolveSiswaId(req);
      const parsed = submitExamFinalSchema.parse(req.body);
      const result = await CbtTestEngineService.submitFinal(
        tenant_id,
        jadwalId,
        siswaId,
        parsed
      );
      return sendResponse(reply, 200, true, 'Ujian berhasil diserahkan', result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return sendError(reply, 400, error.errors.map((e) => e.message).join(', '));
      }
      return sendError(reply, 400, error.message || 'Gagal menyerahkan ujian');
    }
  }
}
