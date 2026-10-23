import { bukuIndukService } from '../services/buku-induk.service';

export class BukuIndukController {
  /**
   * GET /buku-induk
   * Returns paginated list of siswa for Buku Induk
   */
  async getList(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: tenant tidak ditemukan',
        });
      }

      const {
        tahun_pelajaran_id,
        kelas_id,
        jurusan_id,
        tingkat,
        angkatan,
        search,
        status,
        page,
        limit,
      } = request.query || {};

      const result = await bukuIndukService.getBukuIndukList(tenantId, {
        tahun_pelajaran_id,
        kelas_id,
        jurusan_id,
        tingkat,
        angkatan,
        search,
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error('[BukuIndukController.getList]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memuat daftar buku induk',
      });
    }
  }

  /**
   * GET /buku-induk/:siswaId
   * Returns full 360° profile of a siswa
   */
  async getDetail(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: tenant tidak ditemukan',
        });
      }

      const { siswaId } = request.params || {};

      if (!siswaId) {
        return reply.status(400).send({
          success: false,
          message: 'siswaId diperlukan',
        });
      }

      const result = await bukuIndukService.getBukuIndukDetail(tenantId, siswaId);

      if (!result) {
        return reply.status(404).send({
          success: false,
          message: 'Data siswa tidak ditemukan',
        });
      }

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[BukuIndukController.getDetail]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memuat detail buku induk siswa',
      });
    }
  }

  /**
   * GET /buku-klapper
   * Returns paginated alphabetical Klapper of siswa
   */
  async getKlapper(request: any, reply: any) {
    try {
      const tenantId = request.user?.tenant_id;

      if (!tenantId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized: tenant tidak ditemukan',
        });
      }

      const {
        tahun_pelajaran_id,
        kelas_id,
        jurusan_id,
        tingkat,
        angkatan,
        status,
        search,
        huruf,
        page,
        limit,
      } = request.query || {};

      const result = await bukuIndukService.getKlapperList(tenantId, {
        tahun_pelajaran_id,
        kelas_id,
        jurusan_id,
        tingkat,
        angkatan,
        status,
        search,
        huruf,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      console.error('[BukuIndukController.getKlapper]', error);
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memuat buku klapper',
      });
    }
  }
}

export const bukuIndukController = new BukuIndukController();
