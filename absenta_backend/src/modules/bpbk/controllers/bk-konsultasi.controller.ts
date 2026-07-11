import { sendResponse, sendError } from '../../../utils/response';
import { BkKonsultasiService } from '../services/bk-konsultasi.service';

/**
 * Controller BK Consultation Booking untuk SISI GURU BK (authenticated user).
 */
export class BkKonsultasiController {
  static async getAll(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BkKonsultasiService.getAllBookings(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Daftar booking konsultasi berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil daftar booking', error);
    }
  }

  static async updateStatus(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await BkKonsultasiService.updateBookingStatus(tenant_id, id, req.body);
      return sendResponse(reply, 200, true, 'Status booking berhasil diperbarui', result);
    } catch (error: any) {
      if (error?.message === 'Booking tidak ditemukan') return sendError(reply, 404, error.message);
      if (error?.name === 'ZodError') return sendError(reply, 400, 'Validasi gagal', error.errors);
      return sendError(reply, 500, 'Gagal memperbarui status booking', error);
    }
  }
}

/**
 * Controller BK Consultation Booking untuk SISI ORANG TUA (parent auth).
 */
export class BkKonsultasiParentController {
  static async createBooking(req: any, reply: any) {
    try {
      const { tenant_id, ortu_id } = req.parentAuth!;
      const result = await BkKonsultasiService.createBooking(tenant_id, ortu_id, req.body);
      return sendResponse(reply, 201, true, 'Booking konsultasi berhasil dibuat', result);
    } catch (error: any) {
      if (error?.name === 'ZodError') return sendError(reply, 400, 'Validasi gagal', error.errors);
      if (error?.message?.includes('sudah memiliki booking') || error?.message?.includes('bukan anak Anda')) {
        return sendError(reply, 400, error.message);
      }
      return sendError(reply, 500, 'Gagal membuat booking', error);
    }
  }

  static async getMyBookings(req: any, reply: any) {
    try {
      const { tenant_id, ortu_id } = req.parentAuth!;
      const result = await BkKonsultasiService.getOrangTuaBookings(tenant_id, ortu_id);
      return sendResponse(reply, 200, true, 'Riwayat booking konsultasi berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil riwayat booking', error);
    }
  }

  static async cancelBooking(req: any, reply: any) {
    try {
      const { tenant_id, ortu_id } = req.parentAuth!;
      const { id } = req.params;
      const result = await BkKonsultasiService.cancelBookingOrtu(tenant_id, ortu_id, id);
      return sendResponse(reply, 200, true, 'Booking berhasil dibatalkan', result);
    } catch (error: any) {
      if (error?.message?.includes('tidak ditemukan') || error?.message?.includes('dibatalkan')) {
        return sendError(reply, 400, error.message);
      }
      return sendError(reply, 500, 'Gagal membatalkan booking', error);
    }
  }
}
