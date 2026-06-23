import { BkService } from '../services/bk.service';
import { sendResponse, sendError } from '../../../utils/response';

export class BkController {
  // === Jenis Prestasi ===
  static async createJenisPrestasi(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BkService.createJenisPrestasi(tenant_id, req.body);
      return sendResponse(reply, 201, true, 'Kategori prestasi berhasil dibuat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal membuat kategori prestasi', error);
    }
  }

  static async updateJenisPrestasi(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await BkService.updateJenisPrestasi(tenant_id, id, req.body);
      return sendResponse(reply, 200, true, 'Kategori prestasi berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memperbarui kategori prestasi', error);
    }
  }

  static async deleteJenisPrestasi(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await BkService.deleteJenisPrestasi(tenant_id, id);
      return sendResponse(reply, 200, true, 'Kategori prestasi berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus kategori prestasi', error);
    }
  }

  static async getAllJenisPrestasi(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BkService.getAllJenisPrestasi(tenant_id);
      return sendResponse(reply, 200, true, 'Daftar kategori prestasi berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil daftar kategori prestasi', error);
    }
  }

  // === Prestasi Siswa ===
  static async createPrestasiSiswa(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const data = req.body;
      if (data.tanggal) data.tanggal = new Date(data.tanggal);
      const result = await BkService.createPrestasiSiswa(tenant_id, data);
      return sendResponse(reply, 201, true, 'Prestasi siswa berhasil dicatat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mencatat prestasi siswa', error);
    }
  }

  static async updatePrestasiSiswa(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const data = req.body;
      if (data.tanggal) data.tanggal = new Date(data.tanggal);
      const result = await BkService.updatePrestasiSiswa(tenant_id, id, data);
      return sendResponse(reply, 200, true, 'Prestasi siswa berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memperbarui prestasi siswa', error);
    }
  }

  static async deletePrestasiSiswa(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await BkService.deletePrestasiSiswa(tenant_id, id);
      return sendResponse(reply, 200, true, 'Catatan prestasi berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus catatan prestasi', error);
    }
  }

  static async getAllPrestasiSiswa(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BkService.getAllPrestasiSiswa(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Data prestasi siswa berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data prestasi siswa', error);
    }
  }

  // === Konseling Siswa ===
  static async createKonseling(req: any, reply: any) {
    try {
      const { tenant_id, id: petugas_id } = req.user!;
      const data = req.body;
      if (data.tanggal) data.tanggal = new Date(data.tanggal);
      const result = await BkService.createKonseling(tenant_id, { ...data, petugas_id });
      return sendResponse(reply, 201, true, 'Sesi konseling berhasil dicatat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mencatat sesi konseling', error);
    }
  }

  static async updateKonseling(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const data = req.body;
      if (data.tanggal) data.tanggal = new Date(data.tanggal);
      const result = await BkService.updateKonseling(tenant_id, id, data);
      return sendResponse(reply, 200, true, 'Sesi konseling berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memperbarui sesi konseling', error);
    }
  }

  static async deleteKonseling(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await BkService.deleteKonseling(tenant_id, id);
      return sendResponse(reply, 200, true, 'Catatan konseling berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus catatan konseling', error);
    }
  }

  static async getAllKonseling(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BkService.getAllKonseling(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Data konseling berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data konseling', error);
    }
  }

  // === Pemanggilan Orang Tua ===
  static async createPemanggilan(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const data = req.body;
      if (data.tanggal_pemanggilan) data.tanggal_pemanggilan = new Date(data.tanggal_pemanggilan);
      const result = await BkService.createPemanggilan(tenant_id, data);
      return sendResponse(reply, 201, true, 'Pemanggilan orang tua berhasil dibuat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal membuat pemanggilan orang tua', error);
    }
  }

  static async updatePemanggilan(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const data = req.body;
      if (data.tanggal_pertemuan) data.tanggal_pertemuan = new Date(data.tanggal_pertemuan);
      const result = await BkService.updatePemanggilan(tenant_id, id, data);
      return sendResponse(reply, 200, true, 'Status pemanggilan berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memperbarui status pemanggilan', error);
    }
  }

  static async deletePemanggilan(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await BkService.deletePemanggilan(tenant_id, id);
      return sendResponse(reply, 200, true, 'Surat pemanggilan berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus surat pemanggilan', error);
    }
  }

  static async getAllPemanggilan(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BkService.getAllPemanggilan(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Data pemanggilan berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data pemanggilan', error);
    }
  }

  // === Home Visit ===
  static async createHomeVisit(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const data = req.body;
      if (data.tanggal) data.tanggal = new Date(data.tanggal);
      const result = await BkService.createHomeVisit(tenant_id, data);
      return sendResponse(reply, 201, true, 'Log kunjungan rumah berhasil dicatat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mencatat log kunjungan rumah', error);
    }
  }

  static async updateHomeVisit(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const data = req.body;
      if (data.tanggal) data.tanggal = new Date(data.tanggal);
      const result = await BkService.updateHomeVisit(tenant_id, id, data);
      return sendResponse(reply, 200, true, 'Log kunjungan rumah berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memperbarui log kunjungan rumah', error);
    }
  }

  static async deleteHomeVisit(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await BkService.deleteHomeVisit(tenant_id, id);
      return sendResponse(reply, 200, true, 'Log kunjungan rumah berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus log kunjungan rumah', error);
    }
  }

  static async getAllHomeVisits(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BkService.getAllHomeVisits(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Data kunjungan rumah berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data kunjungan rumah', error);
    }
  }

  // === Asesmen ===
  static async createAsesmen(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const data = req.body;
      if (data.tanggal) data.tanggal = new Date(data.tanggal);
      const result = await BkService.createAsesmen(tenant_id, data);
      return sendResponse(reply, 201, true, 'Hasil asesmen berhasil disimpan', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal menyimpan hasil asesmen', error);
    }
  }

  static async updateAsesmen(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const data = req.body;
      if (data.tanggal) data.tanggal = new Date(data.tanggal);
      const result = await BkService.updateAsesmen(tenant_id, id, data);
      return sendResponse(reply, 200, true, 'Hasil asesmen berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memperbarui hasil asesmen', error);
    }
  }

  static async deleteAsesmen(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await BkService.deleteAsesmen(tenant_id, id);
      return sendResponse(reply, 200, true, 'Catatan asesmen berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus catatan asesmen', error);
    }
  }

  static async getAllAsesmen(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BkService.getAllAsesmen(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Data asesmen berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data asesmen', error);
    }
  }

  // === Rujukan ===
  static async createRujukan(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const data = req.body;
      if (data.tanggal) data.tanggal = new Date(data.tanggal);
      const result = await BkService.createRujukan(tenant_id, data);
      return sendResponse(reply, 201, true, 'Disposisi rujukan berhasil dicatat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mencatat disposisi rujukan', error);
    }
  }

  static async updateRujukan(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const data = req.body;
      if (data.tanggal) data.tanggal = new Date(data.tanggal);
      const result = await BkService.updateRujukan(tenant_id, id, data);
      return sendResponse(reply, 200, true, 'Disposisi rujukan berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memperbarui disposisi rujukan', error);
    }
  }

  static async deleteRujukan(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await BkService.deleteRujukan(tenant_id, id);
      return sendResponse(reply, 200, true, 'Data rujukan berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus data rujukan', error);
    }
  }

  static async getAllRujukan(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BkService.getAllRujukan(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Data rujukan berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data rujukan', error);
    }
  }

  // === Dashboard BK Stats ===
  static async getDashboardStats(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await BkService.getDashboardStats(tenant_id);
      return sendResponse(reply, 200, true, 'Statistik dashboard BK berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil statistik dashboard BK', error);
    }
  }
}
