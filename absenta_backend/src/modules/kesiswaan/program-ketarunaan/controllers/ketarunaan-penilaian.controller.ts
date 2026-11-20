import { ketarunaanPenilaianService } from '../services/ketarunaan-penilaian.service';
import { DataScope } from '../../../../types/fastify';

export const ketarunaanPenilaianController = {
  async getSkema(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const { tahun_pelajaran_id, semester_id, jurusan_id } = request.query || {};
      if (!tahun_pelajaran_id) {
        return reply.status(400).send({ message: 'tahun_pelajaran_id wajib diisi' });
      }

      const data = await ketarunaanPenilaianService.getSkemaConfig(scope.tenantId, {
        tahun_pelajaran_id,
        semester_id,
        jurusan_id,
      });

      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async saveSkema(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const payload = request.body;
      if (!payload?.tahun_pelajaran_id) {
        return reply.status(400).send({ message: 'tahun_pelajaran_id wajib diisi' });
      }

      const data = await ketarunaanPenilaianService.saveSkemaConfig(scope.tenantId, payload);
      return reply.send({ success: true, data, message: 'Skema penilaian berhasil disimpan' });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async getNilaiKelas(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const { kelas_id, tahun_pelajaran_id, semester_id } = request.query || {};
      if (!kelas_id || !tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({
          message: 'kelas_id, tahun_pelajaran_id, dan semester_id wajib diisi',
        });
      }

      const data = await ketarunaanPenilaianService.getNilaiKelas(scope.tenantId, {
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
      });

      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async saveNilaiBulk(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const payload = request.body;
      if (!payload?.kelas_id || !payload?.tahun_pelajaran_id || !payload?.semester_id || !Array.isArray(payload?.items)) {
        return reply.status(400).send({
          message: 'Format data tidak lengkap (kelas_id, tahun_pelajaran_id, semester_id, items wajib)',
        });
      }

      const userId = request.user?.id;
      const data = await ketarunaanPenilaianService.saveNilaiBulk(scope.tenantId, {
        ...payload,
        userId,
      });
      return reply.send({ success: true, data, message: 'Nilai ketarunaan berhasil disimpan' });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async lockNilaiKeRapor(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const { kelas_id, tahun_pelajaran_id, semester_id, is_archive_correction, correction_reason } = request.body || {};
      if (!kelas_id || !tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({
          message: 'kelas_id, tahun_pelajaran_id, dan semester_id wajib diisi',
        });
      }

      const userId = request.user?.id;
      const data = await ketarunaanPenilaianService.lockNilaiKeRapor(scope.tenantId, {
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
        userId,
        is_archive_correction,
        correction_reason,
      });

      return reply.send({
        success: true,
        data,
        message: 'Nilai berhasil dikunci & disinkronkan ke Rapor Kokurikuler',
      });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async unlockNilai(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const { kelas_id, tahun_pelajaran_id, semester_id, is_archive_correction, correction_reason } = request.body || {};
      if (!kelas_id || !tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({
          message: 'kelas_id, tahun_pelajaran_id, dan semester_id wajib diisi',
        });
      }

      const userId = request.user?.id;
      const data = await ketarunaanPenilaianService.unlockNilai(scope.tenantId, {
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
        userId,
        is_archive_correction,
        correction_reason,
      });

      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(400).send({ success: false, message: error.message });
    }
  },

  async syncPresensi5Siklus(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const { kelas_id, tahun_pelajaran_id, semester_id } = request.query || {};
      if (!kelas_id || !tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({
          message: 'kelas_id, tahun_pelajaran_id, dan semester_id wajib diisi',
        });
      }

      const data = await ketarunaanPenilaianService.calculatePresensi5Siklus(scope.tenantId, {
        kelas_id,
        tahun_pelajaran_id,
        semester_id,
      });

      const plainRekap: Record<string, any> = {};
      data.rekapMap.forEach((v, k) => {
        plainRekap[k] = v;
      });

      return reply.send({
        success: true,
        data: {
          totalSesiTerlaksana: data.totalSesiTerlaksana,
          totalSesiDisiplin: data.totalSesiDisiplin,
          totalSesiDuha: data.totalSesiDuha,
          rekap: plainRekap,
        },
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },

  async getNilaiExport(request: any, reply: any) {
    try {
      const scope = request.dataScope as DataScope;
      if (!scope?.tenantId) {
        return reply.status(400).send({ message: 'Tenant ID required' });
      }

      const { tahun_pelajaran_id, semester_id, kelas_id } = request.query || {};
      if (!tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({
          message: 'tahun_pelajaran_id dan semester_id wajib diisi',
        });
      }

      const data = await ketarunaanPenilaianService.getNilaiExport(scope.tenantId, {
        tahun_pelajaran_id,
        semester_id,
        kelas_id: kelas_id && kelas_id !== 'ALL' ? kelas_id : undefined,
      });

      return reply.send({ success: true, data });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  },
};
