import { sendResponse, sendError } from '../../../utils/response';
import { JadwalValidationService } from '../services/jadwal-validation.service';

const validationService = new JadwalValidationService();

export class JadwalValidationController {
  static async validateConflict(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const body = req.body;

      // Map request body to ValidationParams
      const params = {
        tenant_id,
        tahun_pelajaran_id: body.tahun_pelajaran_id,
        semester_id: body.semester_id,
        hari: body.hari,
        jam_mulai: body.jam_mulai,
        jam_selesai: body.jam_selesai,
        tanggal: body.tanggal ? new Date(body.tanggal) : undefined,
        kelas_id: body.kelas_id,
        guru_id: body.guru_id,
        exclude_jadwal_kbm_id: body.exclude_jadwal_kbm_id || body.exclude_jadwal_template_id,
        exclude_sesi_id: body.exclude_sesi_id,
      };

      // Validasi input minimal
      if (!params.tahun_pelajaran_id || !params.semester_id || !params.hari || !params.jam_mulai || !params.jam_selesai) {
        return reply.status(400).send({
          success: false,
          message: 'tahun_pelajaran_id, semester_id, hari, jam_mulai, dan jam_selesai harus diisi',
        });
      }

      const result = await validationService.validateConflict(params);
      
      if (!result.is_valid) {
        return reply.status(409).send({
          success: false,
          message: result.error?.message || 'Terjadi konflik jadwal',
          error: result.error,
        });
      }

      return sendResponse(reply, 200, true, 'Jadwal valid dan tidak ada konflik', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memvalidasi jadwal', error);
    }
  }
}
