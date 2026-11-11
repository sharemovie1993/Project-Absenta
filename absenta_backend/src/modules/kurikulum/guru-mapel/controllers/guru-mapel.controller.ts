import { appLogger } from '@/utils/app-logger';
import { guruMapelService, CreateGuruMapelInput } from '../services/guru-mapel.service';
import { unitPengajaranService, KurikulumPolicyError } from '../services/unit-pengajaran.service';
import { smartReadSheet } from '@/utils/excel-import.utils';
import * as XLSX from 'xlsx-js-style';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export class GuruMapelController {
  async list(request: any, reply: any): Promise<ApiResponse> {
    try {
      const user = request.user;
      if (!user) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }

      const { guru_id, mapel_id, kelas_id, jurusan_id, tahun_pelajaran_id, semester_id } = request.query || {};
      const data = await guruMapelService.listAssignments(user.roleName, user.tenantId, { guru_id, mapel_id, kelas_id, jurusan_id, tahun_pelajaran_id, semester_id });

      reply.status(200);
      return { success: true, message: 'Assignments retrieved successfully', data };
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error');
      const msg = error instanceof Error ? error.message : 'Failed to retrieve assignments';
      reply.status(500);
      return { success: false, message: msg };
    }
  }

  async create(request: any, reply: any): Promise<ApiResponse> {
    try {
      const user = request.user;
      if (!user) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }

      const { guru_id, mapel_id, kelas_id, jurusan_id, tahun_pelajaran_id, semester_id, teaching_mode, units } = request.body || {};
      if (!guru_id || !mapel_id) {
        reply.status(400);
        return { success: false, message: 'guru_id and mapel_id are required' };
      }

      const input: CreateGuruMapelInput = { 
        guru_id, 
        mapel_id, 
        kelas_id: kelas_id || null, 
        jurusan_id: jurusan_id || null,
        tahun_pelajaran_id: tahun_pelajaran_id || null,
        semester_id: semester_id || null,
        teaching_mode,
        units,
      };
      const created = await guruMapelService.assignMapelToGuru(request.tenantId || user.tenantId, input);

      reply.status(201);
      return { success: true, message: 'Assignment created successfully', data: created };
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error');
      const msg = error instanceof Error ? error.message : 'Failed to create assignment';
      if (msg.includes('not found') || msg.includes('already exists')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      return { success: false, message: msg };
    }
  }

  async remove(request: any, reply: any): Promise<ApiResponse> {
    try {
      const user = request.user;
      const { id } = request.params;
      if (!user) {
        reply.status(401);
        return { success: false, message: 'Unauthorized' };
      }

      await guruMapelService.removeAssignment(id, user.roleName, user.tenantId);
      reply.status(200);
      return { success: true, message: 'Assignment removed successfully' };
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error');
      const msg = error instanceof Error ? error.message : 'Failed to remove assignment';
      if (msg.includes('Insufficient permissions') || msg.includes('not found')) {
        reply.status(400);
      } else {
        reply.status(500);
      }
      return { success: false, message: msg };
    }
  }

  async getImportTemplate(_request: any, reply: any) {
    try {
      const headers = ['nama_guru', 'nama_mapel'];
      const sample = [
        { nama_guru: 'Ahmad Subarjo, S.Kom', nama_mapel: 'Matematika' },
        { nama_guru: 'Siti Aminah, S.Pd', nama_mapel: 'Bahasa Indonesia' }
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sample, { header: headers });

      // Styles
      const headerStyle = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "FFD700" } }, // Gold for Required
        alignment: { horizontal: "center" }
      };

      headers.forEach((_, i) => {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
        if (cell) cell.s = headerStyle;
      });

      ws['!cols'] = [{ wch: 30 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Penugasan Guru');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="template_impor_guru_mapel.xlsx"');
      return reply.send(buffer);
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error');
      return reply.status(500).send({ success: false, message: 'Gagal membuat template' });
    }
  }

  async importFromExcel(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const part = await request.file();
      if (!part) return reply.status(400).send({ success: false, message: 'File tidak ditemukan' });

      const buffer = await part.toBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = smartReadSheet(ws);

      const result = await guruMapelService.importFromExcel(data, tenantId);

      return reply.status(200).send({
        success: true,
        message: `Import selesai. Berhasil: ${result.success}, Gagal: ${result.failed}`,
        data: result
      });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Controller error');
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async syncFromJadwal(request: any, reply: any) {
    try {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }
      const tenantId = user.tenantId || request.tenantId;
      const { tahun_pelajaran_id, semester_id } = request.body || {};

      const result = await guruMapelService.syncFromJadwalKbm(tenantId, tahun_pelajaran_id, semester_id);
      return reply.status(200).send({
        success: true,
        message: `Sinkronisasi berhasil. Ditambahkan: ${result.syncedCount} penugasan baru dari total ${result.totalAssignments} jadwal KBM.`,
        data: result
      });
    } catch (error: any) {
      appLogger.error({ err: error }, 'Controller error syncFromJadwal');
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  private handlePolicyError(reply: any, error: unknown, fallbackMessage: string) {
    if (error instanceof KurikulumPolicyError) {
      reply.status(error.statusCode);
      return {
        success: false,
        code: error.code,
        message: error.message,
        details: error.details,
      };
    }
    const msg = error instanceof Error ? error.message : fallbackMessage;
    reply.status(500);
    return { success: false, message: msg };
  }

  async getPolicy(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = request.tenantId || user?.tenantId;
      if (!user || !tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const data = await unitPengajaranService.getKurikulumPolicy(tenantId);
      return reply.status(200).send({ success: true, data });
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error getPolicy');
      return this.handlePolicyError(reply, error, 'Gagal memuat kebijakan kurikulum');
    }
  }

  async setPolicy(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = request.tenantId || user?.tenantId;
      if (!user || !tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const { kurikulum_lock_mid_semester_split } = request.body || {};
      const data = await unitPengajaranService.setKurikulumPolicy(tenantId, Boolean(kurikulum_lock_mid_semester_split));
      return reply.status(200).send({ success: true, message: 'Kebijakan kurikulum berhasil diperbarui.', data });
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error setPolicy');
      return this.handlePolicyError(reply, error, 'Gagal memperbarui kebijakan kurikulum');
    }
  }

  async listTenantUnits(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = request.tenantId || user?.tenantId;
      if (!user || !tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const q = request.query || {};
      const data = await unitPengajaranService.listUnitsByTenant(tenantId, {
        tahun_pelajaran_id: q.tahun_pelajaran_id,
        semester_id: q.semester_id,
        kelas_id: q.kelas_id,
        jurusan_id: q.jurusan_id,
        mapel_id: q.mapel_id,
        guru_id: q.guru_id,
        is_active: q.is_active === undefined ? true : String(q.is_active) !== 'false',
      });
      return reply.status(200).send({ success: true, data });
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error listTenantUnits');
      return this.handlePolicyError(reply, error, 'Gagal memuat daftar unit pengajaran');
    }
  }

  async getUnitsForGuruMapel(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = request.tenantId || user?.tenantId;
      if (!user || !tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const { id } = request.params;
      const data = await unitPengajaranService.getUnitsForGuruMapel(tenantId, id);
      return reply.status(200).send({ success: true, data });
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error getUnitsForGuruMapel');
      return this.handlePolicyError(reply, error, 'Gagal memuat detail unit pengajaran');
    }
  }

  async switchMode(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = request.tenantId || user?.tenantId;
      if (!user || !tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const { id } = request.params;
      const { teaching_mode, units, confirmMidSemesterSplit } = request.body || {};
      if (!teaching_mode || !['SINGLE', 'COLLABORATION'].includes(teaching_mode)) {
        return reply.status(400).send({ success: false, message: 'teaching_mode harus SINGLE atau COLLABORATION' });
      }
      const data = await unitPengajaranService.switchTeachingMode(tenantId, id, {
        teaching_mode,
        units,
        confirmMidSemesterSplit: Boolean(confirmMidSemesterSplit),
      });
      return reply.status(200).send({ success: true, message: 'Mode pengajaran berhasil diperbarui.', data });
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error switchMode');
      return this.handlePolicyError(reply, error, 'Gagal mengubah mode pengajaran');
    }
  }

  async createUnit(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = request.tenantId || user?.tenantId;
      if (!user || !tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const { id } = request.params;
      const { nama_unit, guru_id, jp_alokasi, target_sumatif_slot, urutan, is_active } = request.body || {};
      if (!guru_id) return reply.status(400).send({ success: false, message: 'guru_id wajib dipilih' });
      const data = await unitPengajaranService.createUnit(tenantId, id, {
        nama_unit,
        guru_id,
        jp_alokasi,
        target_sumatif_slot,
        urutan,
        is_active,
      });
      return reply.status(201).send({ success: true, message: 'Unit pengajaran ditambahkan.', data });
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error createUnit');
      return this.handlePolicyError(reply, error, 'Gagal menambah unit pengajaran');
    }
  }

  async updateUnit(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = request.tenantId || user?.tenantId;
      if (!user || !tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const { unitId } = request.params;
      const data = await unitPengajaranService.updateUnit(tenantId, unitId, request.body || {});
      return reply.status(200).send({ success: true, message: 'Unit pengajaran diperbarui.', data });
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error updateUnit');
      return this.handlePolicyError(reply, error, 'Gagal memperbarui unit pengajaran');
    }
  }

  async removeUnit(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = request.tenantId || user?.tenantId;
      if (!user || !tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const { unitId } = request.params;
      const data = await unitPengajaranService.removeUnit(tenantId, unitId);
      return reply.status(200).send({ success: true, message: 'Unit pengajaran dihapus.', data });
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error removeUnit');
      return this.handlePolicyError(reply, error, 'Gagal menghapus unit pengajaran');
    }
  }

  async copyUnitsToClasses(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = request.tenantId || user?.tenantId;
      if (!user || !tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const { id } = request.params;
      const { target_kelas_ids } = request.body || {};
      const data = await unitPengajaranService.copyUnitsToClasses(tenantId, id, target_kelas_ids);
      return reply.status(200).send({
        success: true,
        message: `Konfigurasi unit disalin ke ${data.copied_classes} kelas.`,
        data,
      });
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error copyUnitsToClasses');
      return this.handlePolicyError(reply, error, 'Gagal menyalin konfigurasi unit ke kelas paralel');
    }
  }

  async copyUnitsFromSemester(request: any, reply: any) {
    try {
      const user = request.user;
      const tenantId = request.tenantId || user?.tenantId;
      if (!user || !tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized' });
      const {
        source_tahun_pelajaran_id,
        source_semester_id,
        target_tahun_pelajaran_id,
        target_semester_id,
      } = request.body || {};
      if (!source_tahun_pelajaran_id || !source_semester_id || !target_tahun_pelajaran_id || !target_semester_id) {
        return reply.status(400).send({
          success: false,
          message: 'source_tahun_pelajaran_id, source_semester_id, target_tahun_pelajaran_id, dan target_semester_id wajib diisi',
        });
      }
      const data = await unitPengajaranService.copyUnitsFromSemester(tenantId, {
        source_tahun_pelajaran_id,
        source_semester_id,
        target_tahun_pelajaran_id,
        target_semester_id,
      });
      return reply.status(200).send({
        success: true,
        message: `Berhasil menyalin ${data.created_count} konfigurasi plotting & unit pengajaran.`,
        data,
      });
    } catch (error) {
      appLogger.error({ err: error }, 'Controller error copyUnitsFromSemester');
      return this.handlePolicyError(reply, error, 'Gagal menyalin konfigurasi dari semester sebelumnya');
    }
  }
}

export const guruMapelController = new GuruMapelController();
