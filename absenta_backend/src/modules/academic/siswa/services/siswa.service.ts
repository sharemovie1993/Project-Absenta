import { prisma } from '@/utils/prisma';
import type { CreateSiswaInput, PaginatedSiswaResponse, PaginationParams, SiswaResponse, UpdateSiswaInput } from './siswa.types';
import { bulkUpdateStatusCommand } from './commands/bulk-update-status.command';
import { createSiswaCommand } from './commands/create-siswa.command';
import { deleteAllSiswaCommand } from './commands/delete-all-siswa.command';
import { deleteSiswaCommand } from './commands/delete-siswa.command';
import { generateRfidBulkCommand } from './commands/generate-rfid-bulk.command';
import { generateNisMassalCommand } from './commands/generate-nis-massal.command';
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

import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

import { bulkResetSiswaPasswordCommand } from './commands/bulk-reset-siswa-password.command';

export type { PaginationParams, SiswaResponse, PaginatedSiswaResponse, CreateSiswaInput, UpdateSiswaInput } from './siswa.types';

export class SiswaService {
  async bulkResetPassword(
    tenantId: string,
    org: any,
    payload: any,
  ): Promise<any> {
    const res = await bulkResetSiswaPasswordCommand({ tenantId, org }, payload);
    await cacheInvalidationService.invalidateSiswaCache(tenantId);
    return res;
  }

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
    const res = await bulkUpdateStatusCommand({ tenantId, org }, payload);
    await cacheInvalidationService.invalidateSiswaCache(tenantId);
    return res;
  }

  async sendParentAccess(siswaId: string, tenantId: string, org: any, reqOrigin?: string): Promise<any> {
    return sendParentAccessCommand(siswaId, { tenantId, org, reqOrigin });
  }

  async createSiswa(input: CreateSiswaInput, tenantId: string, org: any): Promise<SiswaResponse> {
    const res = await createSiswaCommand(input, { tenantId, org });
    await cacheInvalidationService.invalidateSiswaCache(tenantId, res.id);
    return res;
  }

  async updateSiswa(siswaId: string, input: UpdateSiswaInput, tenantId: string, org: any, userId?: string): Promise<SiswaResponse> {
    const res = await updateSiswaCommand(siswaId, input, { tenantId, org, userId });
    await cacheInvalidationService.invalidateSiswaCache(tenantId, siswaId);
    return res;
  }

  async deleteSiswa(siswaId: string, tenantId: string, org: any): Promise<SiswaResponse> {
    const res = await deleteSiswaCommand(siswaId, { tenantId, org });
    await cacheInvalidationService.invalidateSiswaCache(tenantId, siswaId);
    return res;
  }

  async deleteAllSiswa(tenantId: string): Promise<{ count: number }> {
    const res = await deleteAllSiswaCommand(tenantId);
    await cacheInvalidationService.invalidateSiswaCache(tenantId);
    return res;
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
    const res = await syncSiswaAkademikCommand(tenantId, yearId, semesterId, kelasId, userId);
    await cacheInvalidationService.invalidateSiswaCache(tenantId);
    return res;
  }

  async syncSiswaAkademikWithDefaults(input: {
    tenantId: string;
    tahun_pelajaran_id?: string;
    semester_id?: string;
    kelas_id?: string;
    userId?: string;
  }): Promise<any> {
    const res = await syncSiswaAkademikWithDefaultsCommand(input);
    await cacheInvalidationService.invalidateSiswaCache(input.tenantId);
    return res;
  }

  async generateRfidForSiswa(tenantId: string, siswaId: string) {
    return generateRfidForSiswaCommand(tenantId, siswaId);
  }

  async generateRfidBulk(tenantId: string, kelasId?: string) {
    return generateRfidBulkCommand(tenantId, kelasId);
  }

  async generateNisMassal(input: { orderedKelasIds?: string[] }, scope: { tenantId: string; org: any }) {
    return generateNisMassalCommand(input, scope);
  }

  async getNisWizardPreview(tenantId: string) {
    // Return all kelas with temp-NIS student counts, grouped for the wizard
    const kelasWithCounts = await (await import('@/utils/prisma')).prisma.kelas.findMany({
      where: { tenant_id: tenantId, is_active: true },
      select: {
        id: true,
        nama_kelas: true,
        tingkat: true,
        jurusan_id: true,
        Jurusan: { select: { id: true, nama: true } },
        _count: {
          select: {
            Siswa: { where: { status: 'AKTIF', nis: { startsWith: '1111' } } }
          }
        }
      },
      orderBy: [
        { Jurusan: { nama: 'asc' } },
        { tingkat: 'asc' },
        { nama_kelas: 'asc' }
      ]
    });

    return kelasWithCounts
      .filter((k: any) => k._count.Siswa > 0)
      .map((k: any) => ({
        kelasId: k.id,
        namaKelas: k.nama_kelas,
        tingkat: k.tingkat,
        jurusanId: k.jurusan_id,
        namaJurusan: k.Jurusan?.nama ?? '-',
        jumlahSiswa: k._count.Siswa
      }));
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

  /**
   * SHARED DOMAIN SERVICE METHOD:
   * Mengambil status presensi gerbang hari ini untuk siswa.
   */
  async getPresensiHariIniBySiswaId(siswaId: string): Promise<{
    gerbang: any;
    status: string;
    jamTap: string;
    tglStr: string;
  }> {
    const now = new Date();
    const wibMs = now.getTime() + (7 * 60 * 60 * 1000);
    const today = new Date(wibMs);
    today.setUTCHours(0, 0, 0, 0);

    const gerbang = await prisma.absenGerbangSiswa.findFirst({
      where: { siswa_id: siswaId, created_at: { gte: today } },
      orderBy: { created_at: 'desc' },
    });

    const status = gerbang ? gerbang.status : 'BELUM SCAN';
    const jamTap = gerbang?.waktu_tap
      ? new Date(gerbang.waktu_tap).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : '-';
    const tglStr = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });

    return { gerbang, status, jamTap, tglStr };
  }

  /**
   * SHARED DOMAIN SERVICE METHOD:
   * Mengambil total poin pelanggaran & prestasi siswa.
   */
  async getPoinBySiswaId(siswaId: string): Promise<{
    totalPelanggaranPoin: number;
    totalPelanggaranCount: number;
    totalPrestasiPoin: number;
    totalPrestasiCount: number;
    pelanggaranTerbaru: any[];
  }> {
    const [pelanggaran, prestasiResult, pelanggaranTerbaru] = await Promise.all([
      prisma.pelanggaranSiswa.aggregate({
        where: { siswa_id: siswaId },
        _sum: { poin: true },
        _count: { id: true },
      }),
      prisma.prestasiSiswa.aggregate({
        where: { siswa_id: siswaId },
        _sum: { poin: true },
        _count: { id: true },
      }).catch(() => ({ _sum: { poin: 0 }, _count: { id: 0 } })),
      prisma.pelanggaranSiswa.findMany({
        where: { siswa_id: siswaId },
        orderBy: { created_at: 'desc' },
        take: 3,
        select: { jenis_pelanggaran: true, poin: true, tanggal: true },
      }),
    ]);

    return {
      totalPelanggaranPoin: pelanggaran._sum.poin || 0,
      totalPelanggaranCount: pelanggaran._count.id || 0,
      totalPrestasiPoin: prestasiResult._sum?.poin || 0,
      totalPrestasiCount: prestasiResult._count?.id || 0,
      pelanggaranTerbaru,
    };
  }

  /**
   * SHARED DOMAIN SERVICE METHOD:
   * Mengambil rekap kehadiran siswa bulan ini.
   */
  async getRekapKehadiranBulanIniBySiswaId(siswaId: string): Promise<{
    bulanStr: string;
    hadir: number;
    terlambat: number;
    izinSakit: number;
    alpa: number;
  }> {
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const bulanStr = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const [hadir, terlambat, izinSakit, alpa] = await Promise.all([
      prisma.absenGerbangSiswa.count({ where: { siswa_id: siswaId, created_at: { gte: firstDay }, status: 'HADIR' } }),
      prisma.absenGerbangSiswa.count({ where: { siswa_id: siswaId, created_at: { gte: firstDay }, is_terlambat: true } }),
      prisma.absenGerbangSiswa.count({ where: { siswa_id: siswaId, created_at: { gte: firstDay }, status: { in: ['IZIN', 'SAKIT', 'DISPEN'] } } }),
      prisma.absenGerbangSiswa.count({ where: { siswa_id: siswaId, created_at: { gte: firstDay }, status: 'ALPA' } }),
    ]);

    return { bulanStr, hadir, terlambat, izinSakit, alpa };
  }

  /**
   * Mass WA Phone Normalization for Siswa & Parents with Cache Invalidation
   */
  async normalizeWaPhones(tenantId: string): Promise<{ total: number; updated: number; unchanged: number; invalid: number }> {
    const { formatStandardIndonesianPhone } = await import('@/utils/normalization');
    const { cacheInvalidationService } = await import('@/utils/cache-invalidation.service');

    const allSiswa = await prisma.siswa.findMany({
      where: { tenant_id: tenantId },
      include: { OrangTuaSiswa: { include: { OrangTua: true } } },
    });

    let total = 0;
    let updated = 0;
    let unchanged = 0;
    let invalid = 0;

    for (const siswa of allSiswa) {
      total++;
      let isChanged = false;
      const updateData: any = {};

      if (siswa.no_hp) {
        const cleaned = formatStandardIndonesianPhone(siswa.no_hp);
        if (cleaned) {
          if (cleaned !== siswa.no_hp) {
            updateData.no_hp = cleaned;
            isChanged = true;
          }
        } else {
          invalid++;
        }
      }

      if ((siswa as any).no_hp_ortu) {
        const cleaned = formatStandardIndonesianPhone((siswa as any).no_hp_ortu);
        if (cleaned && cleaned !== (siswa as any).no_hp_ortu) {
          updateData.no_hp_ortu = cleaned;
          isChanged = true;
        }
      }

      if (siswa.nama_ayah || (siswa as any).no_hp_ayah) {
        const hpAyah = (siswa as any).no_hp_ayah;
        if (hpAyah) {
          const cleaned = formatStandardIndonesianPhone(hpAyah);
          if (cleaned && cleaned !== hpAyah) {
            updateData.no_hp_ayah = cleaned;
            isChanged = true;
          }
        }
      }

      if (siswa.nama_ibu || (siswa as any).no_hp_ibu) {
        const hpIbu = (siswa as any).no_hp_ibu;
        if (hpIbu) {
          const cleaned = formatStandardIndonesianPhone(hpIbu);
          if (cleaned && cleaned !== hpIbu) {
            updateData.no_hp_ibu = cleaned;
            isChanged = true;
          }
        }
      }

      if (isChanged) {
        await prisma.siswa.update({
          where: { id: siswa.id },
          data: updateData,
        });
        updated++;
      } else {
        unchanged++;
      }

      for (const ots of (siswa as any).OrangTuaSiswa || []) {
        if (ots.OrangTua && ots.OrangTua.no_hp) {
          const cleanedOrtuHp = formatStandardIndonesianPhone(ots.OrangTua.no_hp);
          if (cleanedOrtuHp && cleanedOrtuHp !== ots.OrangTua.no_hp) {
            await prisma.orangTua.update({
              where: { id: ots.OrangTua.id },
              data: { no_hp: cleanedOrtuHp },
            });
          }
        }
      }
    }

    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    await cacheInvalidationService.invalidateUserCache(tenantId);

    return { total, updated, unchanged, invalid };
  }
}

export const siswaService = new SiswaService();

