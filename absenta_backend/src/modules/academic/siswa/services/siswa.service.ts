// Removed DataScope import to fix TS2353
import type { CreateSiswaInput, PaginatedSiswaResponse, PaginationParams, SiswaResponse, UpdateSiswaInput } from './siswa.types';
import { bulkUpdateStatusCommand } from './commands/bulk-update-status.command';
import { createSiswaCommand } from './commands/create-siswa.command';
import { deleteAllSiswaCommand } from './commands/delete-all-siswa.command';
import { deleteSiswaCommand } from './commands/delete-siswa.command';
import { generateRfidBulkCommand } from './commands/generate-rfid-bulk.command';
import { generateRfidForSiswaCommand } from './commands/generate-rfid-for-siswa.command';
import { importFromRowsCommand } from './commands/import-from-rows.command';
import { sendParentAccessCommand } from './commands/send-parent-access.command';
import { syncSiswaAkademikCommand } from './commands/sync-siswa-akademik.command';
import { syncSiswaAkademikWithDefaultsCommand } from './commands/sync-siswa-akademik-with-defaults.command';
import { updateSiswaCommand } from './commands/update-siswa.command';
import { checkAcademicStatusQuery } from './queries/check-academic-status.query';
import { getAcademicRegistrationStatsQuery } from './queries/get-academic-registration-stats.query';
import { getAllSiswaQuery } from './queries/get-all-siswa.query';
import { getImportReferenceDataQuery } from './queries/get-import-reference-data.query';
import { getSiswaByIdQuery } from './queries/get-siswa-by-id.query';
import { getSiswaHistoryQuery } from './queries/get-siswa-history.query';

export type { PaginationParams, SiswaResponse, PaginatedSiswaResponse, CreateSiswaInput, UpdateSiswaInput } from './siswa.types';

export class SiswaService {
  async getAllSiswa(tenantId: string, org: any, params: PaginationParams): Promise<PaginatedSiswaResponse> {
    return getAllSiswaQuery({ tenantId, org }, params);
  }

  async getSiswaById(siswaId: string, tenantId: string, org: any): Promise<SiswaResponse | null> {
    return getSiswaByIdQuery(siswaId, { tenantId, org });
  }

  async getSiswaHistory(siswaId: string, tenantId: string, org: any): Promise<any[]> {
    return getSiswaHistoryQuery(siswaId, { tenantId, org });
  }

  async bulkUpdateStatus(
    tenantId: string,
    org: any,
    payload: {
      siswaIds: string[];
      status: string;
      tanggal?: Date;
      alasan?: string;
    },
  ): Promise<any> {
    return bulkUpdateStatusCommand({ tenantId, org }, payload);
  }

  async sendParentAccess(siswaId: string, tenantId: string, org: any): Promise<any> {
    return sendParentAccessCommand(siswaId, { tenantId, org });
  }

  async createSiswa(input: CreateSiswaInput, tenantId: string, org: any): Promise<SiswaResponse> {
    return createSiswaCommand(input, { tenantId, org });
  }

  async updateSiswa(siswaId: string, input: UpdateSiswaInput, tenantId: string, org: any, userId?: string): Promise<SiswaResponse> {
    return updateSiswaCommand(siswaId, input, { tenantId, org, userId });
  }

  async deleteSiswa(siswaId: string, tenantId: string, org: any): Promise<SiswaResponse> {
    return deleteSiswaCommand(siswaId, { tenantId, org });
  }

  async deleteAllSiswa(tenantId: string): Promise<{ count: number }> {
    return deleteAllSiswaCommand(tenantId);
  }

  async checkAcademicStatus(
    tenantId: string,
    studentIds: string[],
    yearId: string,
    semesterId: string,
  ): Promise<Record<string, string | null>> {
    return checkAcademicStatusQuery(tenantId, studentIds, yearId, semesterId);
  }

  async getAcademicRegistrationStats(
    tenantId: string,
    yearId: string,
    semesterId: string,
    dataScope?: any,
  ): Promise<{ registered: number; total_active: number }> {
    return getAcademicRegistrationStatsQuery(tenantId, yearId, semesterId, dataScope);
  }

  async syncSiswaAkademik(tenantId: string, yearId: string, semesterId: string, kelasId?: string, userId?: string): Promise<any> {
    return syncSiswaAkademikCommand(tenantId, yearId, semesterId, kelasId, userId);
  }

  async syncSiswaAkademikWithDefaults(input: {
    tenantId: string;
    tahun_pelajaran_id?: string;
    semester_id?: string;
    kelas_id?: string;
    userId?: string;
  }): Promise<any> {
    return syncSiswaAkademikWithDefaultsCommand(input);
  }

  async generateRfidForSiswa(tenantId: string, siswaId: string) {
    return generateRfidForSiswaCommand(tenantId, siswaId);
  }

  async generateRfidBulk(tenantId: string, kelasId?: string) {
    return generateRfidBulkCommand(tenantId, kelasId);
  }

  async importFromRows(_rows: any[], _tenantId: string, _options: any): Promise<any> {
    return importFromRowsCommand(_rows, _tenantId, _options);
  }

  async getImportReferenceData(tenantId: string) {
    return getImportReferenceDataQuery(tenantId);
  }
}
