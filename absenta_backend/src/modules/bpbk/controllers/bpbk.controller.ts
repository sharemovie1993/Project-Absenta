import { BpbkService } from '../services/bpbk.service';
import { sendResponse, sendError } from '../../../utils/response';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { z } from 'zod';
import { 
  kasusBKSchema, updateKasusBKSchema,
  konselingSiswaSchema, updateKonselingSchema,
  pemanggilanOrangTuaSchema, updatePemanggilanSchema,
  homeVisitSchema, updateHomeVisitSchema,
  asesmenSiswaSchema, updateAsesmenSchema,
  rujukanKasusSchema, updateRujukanSchema,
  ewsWeightsSchema
} from '../services/bpbk.schema';

export class BpbkController {
  // === Kasus BK ===
  static async createKasusBK(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const data = kasusBKSchema.parse(req.body);
      const result = await BpbkService.createKasusBK(tenant_id, data, userId);
      return sendResponse(reply, 201, true, 'Kasus BK berhasil dibuka', result);
    } catch (error) {
      return sendError(reply, 400, 'Gagal membuka kasus BK', error);
    }
  }

  static async updateKasusBK(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const data = updateKasusBKSchema.parse(req.body);
      const result = await BpbkService.updateKasusBK(tenant_id, id, data, userId);
      return sendResponse(reply, 200, true, 'Kasus BK berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 400, 'Gagal memperbarui kasus BK', error);
    }
  }

  static async deleteKasusBK(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      await BpbkService.deleteKasusBK(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Kasus BK berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus kasus BK', error);
    }
  }

  static async getKasusBKById(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const capabilities = await authorizationService.resolveUserCapabilities(userId, { user: req.user });
      const result = await BpbkService.getKasusBKById(tenant_id, id, { id: userId, capabilities });
      return sendResponse(reply, 200, true, 'Detail kasus BK berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil detail kasus BK', error);
    }
  }

  static async getAllKasusBK(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const capabilities = await authorizationService.resolveUserCapabilities(userId, { user: req.user });
      const result = await BpbkService.getAllKasusBK(tenant_id, { id: userId, capabilities }, req.query);
      return sendResponse(reply, 200, true, 'Daftar kasus BK berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil daftar kasus BK', error);
    }
  }

  // === Konseling Siswa ===
  static async createKonseling(req: any, reply: any) {
    try {
      const { tenant_id, id: petugas_id } = req.user!;
      const data = konselingSiswaSchema.parse(req.body);
      const result = await BpbkService.createKonseling(tenant_id, { ...data, petugas_id }, petugas_id);
      return sendResponse(reply, 201, true, 'Sesi konseling berhasil dicatat', result);
    } catch (error) {
      return sendError(reply, 400, 'Gagal mencatat sesi konseling', error);
    }
  }

  static async updateKonseling(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const data = updateKonselingSchema.parse(req.body);
      const result = await BpbkService.updateKonseling(tenant_id, id, data, userId);
      return sendResponse(reply, 200, true, 'Sesi konseling berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 400, 'Gagal memperbarui sesi konseling', error);
    }
  }

  static async deleteKonseling(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      await BpbkService.deleteKonseling(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Catatan konseling berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus catatan konseling', error);
    }
  }

  static async getAllKonseling(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const capabilities = await authorizationService.resolveUserCapabilities(userId, { user: req.user });
      const result = await BpbkService.getAllKonseling(tenant_id, { id: userId, capabilities }, req.query);
      return sendResponse(reply, 200, true, 'Data konseling berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data konseling', error);
    }
  }

  // === Pemanggilan Orang Tua ===
  static async createPemanggilan(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const data = pemanggilanOrangTuaSchema.parse(req.body);
      const result = await BpbkService.createPemanggilan(tenant_id, data, userId);
      return sendResponse(reply, 201, true, 'Pemanggilan orang tua berhasil dibuat', result);
    } catch (error) {
      return sendError(reply, 400, 'Gagal membuat pemanggilan orang tua', error);
    }
  }

  static async sendWhatsAppParent(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await BpbkService.sendSummonsToParentWhatsApp(tenant_id, id);
      return sendResponse(reply, 200, true, 'Surat panggilan berhasil dikirim via WhatsApp ke Orang Tua');
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengirim WhatsApp ke Orang Tua', error);
    }
  }
  static async updatePemanggilan(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const data = updatePemanggilanSchema.parse(req.body);
      const result = await BpbkService.updatePemanggilan(tenant_id, id, data, userId);
      return sendResponse(reply, 200, true, 'Status pemanggilan berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 400, 'Gagal memperbarui status pemanggilan', error);
    }
  }

  static async deletePemanggilan(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      await BpbkService.deletePemanggilan(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Surat pemanggilan berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus surat pemanggilan', error);
    }
  }

  static async getAllPemanggilan(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const capabilities = await authorizationService.resolveUserCapabilities(userId, { user: req.user });
      const result = await BpbkService.getAllPemanggilan(tenant_id, { id: userId, capabilities }, req.query);
      return sendResponse(reply, 200, true, 'Data pemanggilan berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data pemanggilan', error);
    }
  }

  // === Home Visit ===
  static async createHomeVisit(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const data = homeVisitSchema.parse(req.body);
      const result = await BpbkService.createHomeVisit(tenant_id, data, userId);
      return sendResponse(reply, 201, true, 'Log kunjungan rumah berhasil dicatat', result);
    } catch (error) {
      return sendError(reply, 400, 'Gagal mencatat log kunjungan rumah', error);
    }
  }

  static async updateHomeVisit(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const data = updateHomeVisitSchema.parse(req.body);
      const result = await BpbkService.updateHomeVisit(tenant_id, id, data, userId);
      return sendResponse(reply, 200, true, 'Log kunjungan rumah berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 400, 'Gagal memperbarui log kunjungan rumah', error);
    }
  }

  static async deleteHomeVisit(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      await BpbkService.deleteHomeVisit(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Log kunjungan rumah berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus log kunjungan rumah', error);
    }
  }

  static async getAllHomeVisits(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const capabilities = await authorizationService.resolveUserCapabilities(userId, { user: req.user });
      const result = await BpbkService.getAllHomeVisits(tenant_id, { id: userId, capabilities }, req.query);
      return sendResponse(reply, 200, true, 'Data kunjungan rumah berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data kunjungan rumah', error);
    }
  }

  // === Asesmen ===
  static async createAsesmen(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const data = asesmenSiswaSchema.parse(req.body);
      const result = await BpbkService.createAsesmen(tenant_id, data, userId);
      return sendResponse(reply, 201, true, 'Hasil asesmen berhasil disimpan', result);
    } catch (error) {
      return sendError(reply, 400, 'Gagal menyimpan hasil asesmen', error);
    }
  }

  static async updateAsesmen(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const data = updateAsesmenSchema.parse(req.body);
      const result = await BpbkService.updateAsesmen(tenant_id, id, data, userId);
      return sendResponse(reply, 200, true, 'Hasil asesmen berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 400, 'Gagal memperbarui hasil asesmen', error);
    }
  }

  static async deleteAsesmen(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      await BpbkService.deleteAsesmen(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Catatan asesmen berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus catatan asesmen', error);
    }
  }

  static async getAllAsesmen(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const capabilities = await authorizationService.resolveUserCapabilities(userId, { user: req.user });
      const result = await BpbkService.getAllAsesmen(tenant_id, { id: userId, capabilities }, req.query);
      return sendResponse(reply, 200, true, 'Data asesmen berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data asesmen', error);
    }
  }

  // === Rujukan ===
  static async createRujukan(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const data = rujukanKasusSchema.parse(req.body);
      const result = await BpbkService.createRujukan(tenant_id, data, userId);
      return sendResponse(reply, 201, true, 'Disposisi rujukan berhasil dicatat', result);
    } catch (error) {
      return sendError(reply, 400, 'Gagal mencatat disposisi rujukan', error);
    }
  }

  static async updateRujukan(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const data = updateRujukanSchema.parse(req.body);
      const result = await BpbkService.updateRujukan(tenant_id, id, data, userId);
      return sendResponse(reply, 200, true, 'Disposisi rujukan berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 400, 'Gagal memperbarui disposisi rujukan', error);
    }
  }

  static async deleteRujukan(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      await BpbkService.deleteRujukan(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Data rujukan berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus data rujukan', error);
    }
  }

  static async getAllRujukan(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const capabilities = await authorizationService.resolveUserCapabilities(userId, { user: req.user });
      const result = await BpbkService.getAllRujukan(tenant_id, { id: userId, capabilities }, req.query);
      return sendResponse(reply, 200, true, 'Data rujukan berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data rujukan', error);
    }
  }

  // === Dashboard BK Stats ===
  static async getDashboardStats(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BpbkService.getDashboardStats(tenant_id);
      return sendResponse(reply, 200, true, 'Statistik dashboard BK berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil statistik dashboard BK', error);
    }
  }

  static async closeKasusBK(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const data = req.body;
      const result = await BpbkService.closeKasusBK(tenant_id, id, userId, data);
      return sendResponse(reply, 200, true, 'Kasus BK berhasil ditutup', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal menutup kasus BK', error);
    }
  }

  static async reopenKasusBK(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const result = await BpbkService.reopenKasusBK(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Kasus BK berhasil dibuka kembali', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal membuka kembali kasus BK', error);
    }
  }

  static async restoreKasusBK(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const result = await BpbkService.restoreKasusBK(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Kasus BK berhasil dipulihkan', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memulihkan kasus BK', error);
    }
  }

  static async restoreKonseling(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const result = await BpbkService.restoreKonseling(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Catatan konseling berhasil dipulihkan', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memulihkan catatan konseling', error);
    }
  }

  static async restorePemanggilan(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const result = await BpbkService.restorePemanggilan(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Surat pemanggilan berhasil dipulihkan', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memulihkan surat pemanggilan', error);
    }
  }

  static async restoreHomeVisit(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const result = await BpbkService.restoreHomeVisit(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Log kunjungan rumah berhasil dipulihkan', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memulihkan log kunjungan rumah', error);
    }
  }

  static async restoreAsesmen(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const result = await BpbkService.restoreAsesmen(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Hasil asesmen berhasil dipulihkan', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memulihkan hasil asesmen', error);
    }
  }

  static async restoreRujukan(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const result = await BpbkService.restoreRujukan(tenant_id, id, userId);
      return sendResponse(reply, 200, true, 'Data rujukan berhasil dipulihkan', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memulihkan data rujukan', error);
    }
  }

  static async getReports(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BpbkService.getReportsData(tenant_id);
      return sendResponse(reply, 200, true, 'Laporan dan statistik BK berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil laporan dan statistik BK', error);
    }
  }

  static async getStudentRiskTrend(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { siswaId } = req.params;
      const result = await BpbkService.getStudentRiskTrend(tenant_id, siswaId);
      return sendResponse(reply, 200, true, 'Tren risiko siswa berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil tren risiko siswa', error);
    }
  }

  static async getWaliKelasReports(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const result = await BpbkService.getWaliKelasDashboardData(tenant_id, userId);
      return sendResponse(reply, 200, true, 'Laporan BK wali kelas berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil laporan BK wali kelas', error);
    }
  }

  static async getAuditLogs(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const query = req.query || {};
      const result = await BpbkService.getAuditLogsData(tenant_id, query);
      return sendResponse(reply, 200, true, 'Log audit BK berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil log audit BK', error);
    }
  }

  static async getCalendarEvents(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const query = req.query || {};
      const result = await BpbkService.getCalendarEvents(tenant_id, query);
      return sendResponse(reply, 200, true, 'Jadwal kalender BK berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil jadwal kalender BK', error);
    }
  }

  static async getEwsWeights(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BpbkService.getEwsWeights(tenant_id);
      return sendResponse(reply, 200, true, 'Bobot parameter EWS berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil bobot parameter EWS', error);
    }
  }

  static async updateEwsWeights(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const parsedBody = ewsWeightsSchema.parse(req.body);
      const result = await BpbkService.updateEwsWeights(tenant_id, parsedBody);
      return sendResponse(reply, 200, true, 'Bobot parameter EWS berhasil diperbarui', result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.errors.map(e => e.message).join(', '),
          errors: error.errors
        });
      }
      return sendError(reply, 500, 'Gagal memperbarui bobot parameter EWS', error);
    }
  }
}

