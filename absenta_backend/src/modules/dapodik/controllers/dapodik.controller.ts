import { dapodikService, DapodikService } from '../services/dapodik.service';

export const dapodikController = {
  /**
   * Mengambil info network interface server untuk pendaftaran di Dapodik
   */
  async getServerNetworkInfo(_request: any, reply: any) {
    try {
      const info = dapodikService.getServerNetworkInfo();
      return reply.status(200).send({
        success: true,
        data: info,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: err.message || 'Gagal mendeteksi interface jaringan server',
      });
    }
  },

  /**
   * Mengambil konfigurasi integrasi Dapodik tenant yang sedang aktif
   */
  async getConfig(request: any, reply: any) {
    try {
      const user = request.user!;
      const tenantId = user.tenantId || user.tenant_id;
      const config = await dapodikService.getConfig(tenantId);
      return reply.status(200).send({
        success: true,
        data: config,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: err.message || 'Gagal mengambil konfigurasi Dapodik',
      });
    }
  },

  /**
   * Menyimpan konfigurasi Dapodik
   */
  async saveConfig(request: any, reply: any) {
    try {
      const user = request.user!;
      const tenantId = user.tenantId || user.tenant_id;
      const { dapodik_host, npsn, api_token, is_active } = request.body || {};

      if (!dapodik_host || !npsn || !api_token) {
        return reply.status(400).send({
          success: false,
          message: 'Host Dapodik, NPSN, dan Token Web Service wajib diisi.',
        });
      }

      const saved = await dapodikService.saveConfig(tenantId, {
        dapodik_host,
        npsn,
        api_token,
        is_active,
      });

      return reply.status(200).send({
        success: true,
        message: 'Konfigurasi Dapodik berhasil disimpan.',
        data: saved,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: err.message || 'Gagal menyimpan konfigurasi Dapodik',
      });
    }
  },

  /**
   * Menguji koneksi (Handshake) ke server Dapodik
   */
  async testConnection(request: any, reply: any) {
    try {
      const user = request.user!;
      const tenantId = user.tenantId || user.tenant_id;
      const customConfig = request.body || undefined;

      const result = await dapodikService.testConnection(tenantId, customConfig);
      return reply.status(result.success ? 200 : 400).send(result);
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        message: err.message || 'Gagal melakukan tes koneksi Dapodik',
      });
    }
  },

  /**
   * Menjalankan Diff Engine: Komparasi Siswa Dapodik vs Siswa Absenta
   */
  async compareStudents(request: any, reply: any) {
    try {
      const user = request.user!;
      const tenantId = user.tenantId || user.tenant_id;
      const q = request.query || {};

      const options = {
        checkNama: q.check_nama !== undefined ? q.check_nama === 'true' || q.check_nama === true : true,
        checkNis: q.check_nis !== undefined ? q.check_nis === 'true' || q.check_nis === true : true,
        checkNisn: q.check_nisn !== undefined ? q.check_nisn === 'true' || q.check_nisn === true : true,
        checkNik: q.check_nik !== undefined ? q.check_nik === 'true' || q.check_nik === true : true,
        checkKelas: q.check_kelas !== undefined ? q.check_kelas === 'true' || q.check_kelas === true : true,
        checkJenisKelamin: q.check_jenis_kelamin !== undefined ? q.check_jenis_kelamin === 'true' || q.check_jenis_kelamin === true : true,
        checkTanggalLahir: q.check_tanggal_lahir !== undefined ? q.check_tanggal_lahir === 'true' || q.check_tanggal_lahir === true : true,
        checkTempatLahir: q.check_tempat_lahir !== undefined ? q.check_tempat_lahir === 'true' || q.check_tempat_lahir === true : false,
        ignoreClassWhitespace: q.ignore_class_whitespace !== undefined ? q.ignore_class_whitespace === 'true' || q.ignore_class_whitespace === true : true,
        onlyActiveStudents: q.only_active_students !== undefined ? q.only_active_students === 'true' || q.only_active_students === true : true,
      };

      const forceRefresh = q.force_refresh === 'true' || q.force_refresh === true;
      const sourceMode: 'LIVE' | 'STAGING' = (q.source_mode || 'LIVE').toUpperCase() === 'STAGING' ? 'STAGING' : 'LIVE';

      const report = await dapodikService.compareStudents(tenantId, options, forceRefresh, sourceMode);
      return reply.status(200).send({
        success: true,
        data: report,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: err.message || 'Gagal menjalankan komparasi data siswa',
      });
    }
  },

  /**
   * Mengambil Metadata Staging Storage di Platform
   */
  async getStagingMeta(request: any, reply: any) {
    try {
      const user = request.user!;
      const tenantId = user.tenantId || user.tenant_id;
      const meta = DapodikService.getStagingMeta(tenantId);
      return reply.status(200).send({
        success: true,
        data: meta,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: err.message || 'Gagal mengambil metadata staging platform',
      });
    }
  },

  /**
   * Menyinkronkan siswa yang dipilih
   */
  async syncStudents(request: any, reply: any) {
    try {
      const user = request.user!;
      const tenantId = user.tenantId || user.tenant_id;
      const { action, students, tahun_pelajaran_id, semester_id } = request.body || {};

      if (!action || !Array.isArray(students) || students.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'Parameter action dan daftar students wajib disertakan.',
        });
      }

      const result = await dapodikService.syncStudents(
        tenantId,
        {
          action,
          students,
          tahun_pelajaran_id,
          semester_id,
        },
        {
          userId: user.id || user.userId,
          org: user.org,
        }
      );

      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        message: err.message || 'Gagal menyinkronkan siswa',
      });
    }
  },
};
