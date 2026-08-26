// @ts-nocheck
import { Hari } from '@prisma/client';
import { RoleName } from '@/constants/enums';
import { prisma } from '@/utils/prisma';
import { JadwalValidationService } from '@/modules/jadwal/services/jadwal-validation.service';
import { jadwalKBMDb } from '../../services/repositories/jadwal-kbm.db';
import { applyDataScope } from '@/utils/applyDataScope';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { jadwalKBMService } from '../../services/jadwal-kbm.service';
import { smartReadSheet } from '@/utils/excel-import.utils';
import * as XLSX from 'xlsx-js-style';
import { generateSessionsForTenantDirect, getTenantLocalTime } from '@/jobs/attendanceAutoSession.job';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { systemConfigService } from '@/modules/system-config/services/system-config.service';
import { appLogger } from '@/utils/app-logger';

const validationService = new JadwalValidationService();

export class JadwalExcelController {
  async getImportTemplate(_request: any, reply: any) {
    try {
      const headers = ['hari', 'jam_mulai', 'jam_selesai', 'nama_kelas', 'nama_mapel', 'nama_guru'];
      const sample = [
        { hari: 'SENIN', jam_mulai: '07:00', jam_selesai: '07:45', nama_kelas: 'X RPL 1', nama_mapel: 'Matematika', nama_guru: 'Ahmad Subarjo, S.Kom' },
        { hari: 'SENIN', jam_mulai: '07:45', jam_selesai: '08:30', nama_kelas: 'X RPL 1', nama_mapel: 'Bahasa Indonesia', nama_guru: 'Siti Aminah, S.Pd' }
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sample, { header: headers });

      const headerStyle = {
        font: { bold: true, color: { rgb: "000000" } },
        fill: { fgColor: { rgb: "FFD700" } }, // Gold for Required
        alignment: { horizontal: "center" }
      };

      headers.forEach((_, i) => {
        const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
        if (cell) cell.s = headerStyle;
      });

      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Pelajaran');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', 'attachment; filename="template_impor_jadwal.xlsx"');
      return reply.send(buffer);
    } catch (error) {
      return reply.status(500).send({ success: false, message: 'Gagal membuat template' });
    }
  }

  async importFromExcel(request: any, reply: any) {
    try {
      const { tenantId } = request;
      const { tahun_pelajaran_id, semester_id } = request.query;

      if (!tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({ success: false, message: 'Tahun Pelajaran dan Semester wajib dipilih' });
      }

      const part = await request.file();
      if (!part) return reply.status(400).send({ success: false, message: 'File tidak ditemukan' });

      const buffer = await part.toBuffer();
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = smartReadSheet(ws);

      const result = await jadwalKBMService.importFromExcel(
        data, 
        tenantId, 
        tahun_pelajaran_id, 
        semester_id
      );

      // Auto-sync sessions for today in background (organic behavior)
      void this.syncSessionsToday(tenantId);

      await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);

      return reply.status(200).send({
        success: true,
        message: `Import selesai. Berhasil: ${result.success}, Gagal: ${result.failed}`,
        data: result
      });
    } catch (error: any) {
      return reply.status(500).send({ success: false, message: error.message });
    }
  }

  async autoGeneratePreview(request: any, reply: any) {
    try {
      const { tenantId } = request;
      const { tahun_pelajaran_id, semester_id, kelas_ids, overwrite_existing } = request.body || {};

      if (!tahun_pelajaran_id || !semester_id) {
        return reply.status(400).send({
          success: false,
          message: 'Tahun Pelajaran dan Semester wajib dipilih'
        });
      }

      const { TimetableSolverService } = await import('../../services/timetable-solver.service');

      const result = await TimetableSolverService.generate(tenantId, {
        tahun_pelajaran_id,
        semester_id,
        kelas_ids: Array.isArray(kelas_ids) ? kelas_ids : undefined,
        overwrite_existing: Boolean(overwrite_existing)
      });

      return reply.send({
        success: true,
        message: 'Hasil generasi jadwal otomatis berhasil dihitung',
        data: result
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Gagal membuat generasi jadwal otomatis'
      });
    }
  }

  async autoGenerateApply(request: any, reply: any) {
    try {
      const { tenantId, user } = request;
      const { tahun_pelajaran_id, semester_id, generated_schedules, overwrite_existing } = request.body || {};

      if (!tahun_pelajaran_id || !semester_id || !Array.isArray(generated_schedules)) {
        return reply.status(400).send({
          success: false,
          message: 'Data pratinjau hasil generasi jadwal tidak valid'
        });
      }

      const { TimetableSolverService } = await import('../../services/timetable-solver.service');

      const result = await TimetableSolverService.apply(tenantId, {
        tahun_pelajaran_id,
        semester_id,
        generated_schedules,
        overwrite_existing: Boolean(overwrite_existing),
        userId: user?.id
      });

      void this.syncSessionsToday(tenantId);

      await cacheInvalidationService.invalidateJadwalKbmCache(tenantId);

      return reply.send({
        success: true,
        message: `Berhasil menerapkan ${result.count} slot jadwal KBM ke sistem`,
        data: result
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Gagal menerapkan generasi jadwal'
      });
    }
  }
}
