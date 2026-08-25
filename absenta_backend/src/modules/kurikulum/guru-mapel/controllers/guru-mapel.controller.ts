import { appLogger } from '@/utils/app-logger';
import { guruMapelService, CreateGuruMapelInput } from '../services/guru-mapel.service';
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

      const { guru_id, mapel_id, kelas_id, jurusan_id, tahun_pelajaran_id, semester_id } = request.body || {};
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
        semester_id: semester_id || null
      };
      const created = await guruMapelService.assignMapelToGuru(user.tenantId, input);

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
}

export const guruMapelController = new GuruMapelController();
