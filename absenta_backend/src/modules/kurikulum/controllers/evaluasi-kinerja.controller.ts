import { EvaluasiKinerjaService } from '../services/evaluasi-kinerja.service';

export class EvaluasiKinerjaController {
  /**
   * GET /kurikulum/evaluasi-kinerja
   */
  static async getAll(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const {
        tahun_pelajaran_id,
        semester_id,
        search,
        predikat,
        status_kepegawaian,
        guru_id,
      } = request.query as {
        tahun_pelajaran_id?: string;
        semester_id?: string;
        search?: string;
        predikat?: string;
        status_kepegawaian?: string;
        guru_id?: string;
      };

      const result = await EvaluasiKinerjaService.getEvaluasiList(tenantId, {
        tahun_pelajaran_id,
        semester_id,
        search,
        predikat,
        status_kepegawaian,
        guru_id,
      });

      return reply.send({
        success: true,
        message: 'Evaluasi kinerja guru berhasil dimuat',
        ...result,
      });
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Gagal memuat data evaluasi kinerja guru',
      });
    }
  }

  /**
   * GET /kurikulum/evaluasi-kinerja/:guruId
   */
  static async getDetailByGuruId(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { guruId } = request.params as { guruId: string };
      const { tahun_pelajaran_id, semester_id } = request.query as {
        tahun_pelajaran_id?: string;
        semester_id?: string;
      };

      const result = await EvaluasiKinerjaService.getEvaluasiList(tenantId, {
        guru_id: guruId,
        tahun_pelajaran_id,
        semester_id,
      });

      const teacherRecord = result.data[0] || null;
      if (!teacherRecord) {
        return reply.status(404).send({
          success: false,
          message: 'Data evaluasi guru tidak ditemukan',
        });
      }

      return reply.send({
        success: true,
        message: 'Detail evaluasi kinerja guru berhasil dimuat',
        data: teacherRecord,
      });
    } catch (error: any) {
      request.log?.error(error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Gagal memuat detail evaluasi guru',
      });
    }
  }
}
