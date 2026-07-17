// Removed DataScope import to fix TS2353
import type { CreateSiswaInput, PaginatedSiswaResponse, PaginationParams, SiswaResponse, UpdateSiswaInput } from './siswa.types';
import { bulkUpdateStatusCommand } from './commands/bulk-update-status.command';
import { createSiswaCommand } from './commands/create-siswa.command';
import { deleteAllSiswaCommand } from './commands/delete-all-siswa.command';
import { deleteSiswaCommand } from './commands/delete-siswa.command';
import { generateRfidBulkCommand } from './commands/generate-rfid-bulk.command';
import { generateRfidForSiswaCommand } from './commands/generate-rfid-for-siswa.command';
import { importFromRowsCommand } from './commands/import-from-rows.command';
import { pairRfidBulkCommand } from './commands/pair-rfid-bulk.command';
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
import { uploadSiswaDocumentCommand } from './commands/upload-siswa-document.command';
import { deleteSiswaDocumentCommand } from './commands/delete-siswa-document.command';
import { completeSiswaExitCommand } from './commands/complete-siswa-exit.command';
import { getSiswaDocumentsQuery } from './queries/get-siswa-documents.query';
import { getSiswaTimelineQuery } from './queries/get-siswa-timeline.query';
import { getSiswaExitBundleQuery } from './queries/get-siswa-exit-bundle.query';
import { mapPpdbStudentsCommand } from './commands/map-ppdb-students.command';

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

  async pairRfidBulk(tenantId: string, kelasId: string, rfids: string[]) {
    return pairRfidBulkCommand(tenantId, kelasId, rfids);
  }

  async importFromRows(rows: any[], tenantId: string, options: any): Promise<any> {
    return importFromRowsCommand(rows, tenantId, options);
  }

  async getImportReferenceData(tenantId: string) {
    return getImportReferenceDataQuery(tenantId);
  }

  async uploadSiswaDocument(params: {
    tenantId: string;
    siswaId: string;
    judul: string;
    kategori: string;
    actorUserId?: string;
    file: any;
  }) {
    return uploadSiswaDocumentCommand(params);
  }

  async deleteSiswaDocument(params: {
    tenantId: string;
    siswaId: string;
    documentId: string;
  }) {
    return deleteSiswaDocumentCommand(params);
  }

  async getSiswaDocuments(params: {
    tenantId: string;
    siswaId: string;
  }) {
    return getSiswaDocumentsQuery(params);
  }

  async getSiswaTimeline(params: {
    tenantId: string;
    siswaId: string;
    userContext?: { id: string; capabilities: string[] };
  }) {
    return getSiswaTimelineQuery(params);
  }

  async completeSiswaExit(params: {
    tenantId: string;
    siswaId: string;
    status: string;
    alasan?: string;
    actorUserId?: string;
    file: any;
  }) {
    return completeSiswaExitCommand(params);
  }

  async getSiswaExitBundle(params: {
    tenantId: string;
    siswaId: string;
  }) {
    return getSiswaExitBundleQuery(params);
  }

  async mapPpdbStudents(
    tenantId: string,
    org: any,
    input: { siswaIds: string[]; targetKelasId: string }
  ) {
    return mapPpdbStudentsCommand(input, { tenantId, org });
  }
}
