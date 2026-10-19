import { academicPlenoService } from '../services/academic-pleno.service';

export class AcademicPlenoController {
  // 1. Sessions
  async listSessions(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { tahun_pelajaran_id, semester_id, status } = request.query || {};
      const sessions = await academicPlenoService.listSessions(tenant_id, {
        tahun_pelajaran_id,
        semester_id,
        status,
      });
      return reply.send({ success: true, data: sessions });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memuat daftar sesi sidang pleno',
      });
    }
  }

  async createSession(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const session = await academicPlenoService.createSession(tenant_id, request.body);
      return reply.status(201).send({ success: true, data: session });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal membuat sesi sidang pleno',
      });
    }
  }

  async getSessionDetail(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id } = request.params;
      const detail = await academicPlenoService.getSessionDetail(tenant_id, id);
      return reply.send({ success: true, data: detail });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memuat detail sesi sidang pleno',
      });
    }
  }

  async updateSession(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id } = request.params;
      const updated = await academicPlenoService.updateSession(tenant_id, id, request.body);
      return reply.send({ success: true, data: updated });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memperbarui sesi sidang pleno',
      });
    }
  }

  async startSession(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id } = request.params;
      const started = await academicPlenoService.startSession(tenant_id, id);
      return reply.send({ success: true, data: started });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memulai sidang pleno',
      });
    }
  }

  async pauseSession(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id } = request.params;
      const paused = await academicPlenoService.pauseSession(tenant_id, id);
      return reply.send({ success: true, data: paused });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menunda sidang pleno',
      });
    }
  }

  async finalizeSession(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const userId = request.user?.id;
      const { id } = request.params;
      const { closing_notes } = request.body || {};
      const finalized = await academicPlenoService.finalizeSession(tenant_id, id, userId, closing_notes);
      return reply.send({ success: true, data: finalized });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memfinalisasi sidang pleno',
      });
    }
  }

  // 2. Attendance
  async listAttendance(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id } = request.params;
      const attendances = await academicPlenoService.listAttendance(tenant_id, id);
      return reply.send({ success: true, data: attendances });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memuat presensi sidang',
      });
    }
  }

  async tapAttendance(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const userId = request.user?.id;
      const { id } = request.params;
      const record = await academicPlenoService.tapAttendance(tenant_id, id, request.body, userId);
      return reply.send({ success: true, data: record });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memperbarui presensi kehadiran',
      });
    }
  }

  async bulkInviteAttendance(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id } = request.params;
      const result = await academicPlenoService.bulkInviteAttendance(tenant_id, id);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal mengundang dewan guru',
      });
    }
  }

  // 3. Rombels & Triage
  async listRombels(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id } = request.params;
      const rombels = await academicPlenoService.listRombels(tenant_id, id);
      return reply.send({ success: true, data: rombels });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memuat daftar rombel pleno',
      });
    }
  }

  async calculateTriage(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id } = request.params;
      const { rombel_id } = request.body || {};
      const result = await academicPlenoService.calculateTriage(tenant_id, id, rombel_id);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menghitung triase otomatis',
      });
    }
  }

  async getRombelCandidates(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id, rombelId } = request.params;
      const candidates = await academicPlenoService.getRombelCandidates(tenant_id, id, rombelId);
      return reply.send({ success: true, data: candidates });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memuat kandidat siswa rombel',
      });
    }
  }

  async batchApproveGreen(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const userId = request.user?.id;
      const { id, rombelId } = request.params;
      const result = await academicPlenoService.batchApproveGreen(tenant_id, id, rombelId, userId);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal aklamasi zona hijau',
      });
    }
  }

  // 4. Student Dossier & Decisions
  async getStudentDossier(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id, siswaId } = request.params;
      const dossier = await academicPlenoService.getStudentDossier(tenant_id, id, siswaId);
      return reply.send({ success: true, data: dossier });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memuat dossier 360 siswa',
      });
    }
  }

  async decideStudent(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const userId = request.user?.id;
      const { id, siswaId } = request.params;
      const decision = await academicPlenoService.decideStudent(tenant_id, id, siswaId, request.body, userId);
      return reply.send({ success: true, data: decision });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menyimpan putusan siswa',
      });
    }
  }

  // 5. Minutes of Meeting
  async listMinutes(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id } = request.params;
      const minutes = await academicPlenoService.listMinutes(tenant_id, id);
      return reply.send({ success: true, data: minutes });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal memuat risalah sidang',
      });
    }
  }

  async createMinute(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const userId = request.user?.id;
      const { id } = request.params;
      const minute = await academicPlenoService.createMinute(tenant_id, id, request.body, userId);
      return reply.status(201).send({ success: true, data: minute });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal mencatat risalah sidang',
      });
    }
  }

  // 6. Sync to Transition & Export BAP
  async syncToTransition(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id } = request.params;
      const { target_tahun_pelajaran_id } = request.body || {};
      const result = await academicPlenoService.syncToTransition(tenant_id, id, target_tahun_pelajaran_id);
      return reply.send({ success: true, data: result });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal menyinkronkan hasil sidang ke transisi kelas',
      });
    }
  }

  async exportBap(request: any, reply: any) {
    try {
      const tenant_id = request.dataScope?.tenant_id || request.user?.tenant_id;
      const { id } = request.params;
      const bapData = await academicPlenoService.getBapData(tenant_id, id);
      return reply.send({ success: true, data: bapData });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Gagal mengekspor data Berita Acara Pleno',
      });
    }
  }
}

export const academicPlenoController = new AcademicPlenoController();
