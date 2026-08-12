import { prisma } from '@/utils/prisma';
import { DataScope } from '@/types/fastify';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { normalizePhone } from '@/utils/normalization';
import { removeLidMappingByPhone } from '@/modules/whatsapp/services/wa-chatbot-resolver.service';

// Command & Query Module Delegates
import { bulkResetGuruPasswordCommand } from './commands/bulk-reset-guru-password.command';
import { uploadGuruDocumentCommand } from './commands/upload-guru-document.command';
import { deleteGuruDocumentCommand } from './commands/delete-guru-document.command';
import { getGuruDocumentsQuery } from './queries/get-guru-documents.query';
import { getAllGuruQuery } from './queries/get-all-guru.query';
import { getGuruByIdQuery } from './queries/get-guru-by-id.query';
import { getGuruMeQuery } from './queries/get-guru-me.query';
import { createGuruCommand } from './commands/create-guru.command';
import { updateGuruCommand } from './commands/update-guru.command';
import { deleteGuruCommand } from './commands/delete-guru.command';
import { importGuruExcelCommand } from './commands/import-guru-excel.command';

export interface CreateGuruInput {
  user_id?: string | null;
  nip?: string | null;
  nuptk?: string | null;
  nik?: string | null;
  no_kk?: string | null;
  npwp?: string | null;
  nama_ibu_kandung?: string | null;
  nama_guru: string;
  no_rfid?: string | null;
  email?: string | null;
  no_hp?: string | null;
  alamat?: string | null;
  dusun?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  kabupaten?: string | null;
  provinsi?: string | null;
  rt?: string | null;
  rw?: string | null;
  kode_pos?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: Date | string | null;
  jenis_kelamin?: string | null;
  agama?: string | null;
  status_kepegawaian?: string | null;
  pendidikan_terakhir?: string | null;
  pangkat_golongan?: string | null;
  tmt_guru?: string | null;
  jenis_ptk?: string | null;
  foto?: string | null;
  max_jp?: number | null;
}

export interface UpdateGuruInput {
  nip?: string | null;
  nuptk?: string | null;
  nik?: string | null;
  no_kk?: string | null;
  npwp?: string | null;
  nama_ibu_kandung?: string | null;
  nama_guru?: string | null;
  no_rfid?: string | null;
  status?: string | null;
  email?: string | null;
  no_hp?: string | null;
  alamat?: string | null;
  dusun?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  kabupaten?: string | null;
  provinsi?: string | null;
  rt?: string | null;
  rw?: string | null;
  kode_pos?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: Date | string | null;
  jenis_kelamin?: string | null;
  agama?: string | null;
  status_kepegawaian?: string | null;
  pendidikan_terakhir?: string | null;
  pangkat_golongan?: string | null;
  tmt_guru?: string | null;
  jenis_ptk?: string | null;
  foto?: string | null;
  max_jp?: number | null;
}

export interface GuruResponse {
  id: string;
  tenant_id: string;
  user_id: string;
  nip: string | null;
  nama_guru: string;
  no_rfid: string | null;
  email?: string | null;
  no_hp?: string | null;
  alamat?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: Date | null;
  jenis_kelamin?: string | null;
  agama?: string | null;
  status_kepegawaian?: string | null;
  pendidikan_terakhir?: string | null;
  jenis_ptk: string | null;
  max_jp?: number | null;
  created_at: Date;
  updated_at: Date;
  User?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  user_id?: string;
  status_kepegawaian?: string;
  jenis_kelamin?: string;
  jenis_ptk?: string;
}

export interface PaginatedGuruResponse {
  data: GuruResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * GuruService Facade
 * Provides a clean API interface for Guru domain operations, forwarding to modularized commands and queries.
 */
export class GuruService {
  async bulkResetPassword(tenantId: string, org: any, payload: any): Promise<any> {
    const res = await bulkResetGuruPasswordCommand({ tenantId, org }, payload);
    await cacheInvalidationService.invalidateTenantCache(tenantId);
    return res;
  }

  async getAllGuru(scope: DataScope, params?: PaginationParams): Promise<PaginatedGuruResponse> {
    return getAllGuruQuery(scope, params);
  }

  async getGuruById(guruId: string, scope: DataScope): Promise<GuruResponse | null> {
    return getGuruByIdQuery(guruId, scope);
  }

  async getGuruMe(userId: string, tenantId: string): Promise<any | null> {
    return getGuruMeQuery(userId, tenantId);
  }

  async updateGuruMe(userId: string, tenantId: string, input: any): Promise<any> {
    const existingGuru = await prisma.guru.findFirst({
      where: { user_id: userId, tenant_id: tenantId },
    });

    if (!existingGuru) {
      throw new Error('Profil guru tidak ditemukan untuk user ini.');
    }

    return this.updateGuru(existingGuru.id, input, { tenantId });
  }

  async createGuru(input: CreateGuruInput, scope: DataScope): Promise<GuruResponse> {
    return createGuruCommand(input, scope);
  }

  async updateGuru(guruId: string, input: UpdateGuruInput, scope: DataScope): Promise<GuruResponse> {
    return updateGuruCommand(guruId, input, scope);
  }

  async deleteGuru(guruId: string, scope: DataScope): Promise<void> {
    return deleteGuruCommand(guruId, scope);
  }

  async importFromExcel(data: any[], scope: DataScope, onProgress?: (current: number, total: number) => void) {
    return importGuruExcelCommand(data, scope, onProgress);
  }

  async uploadGuruDocument(params: { tenantId?: string; guruId: string; file: any; judul: string; kategori?: string; uploadedByUserId?: string; actorUserId?: string }) {
    return uploadGuruDocumentCommand({
      tenantId: params.tenantId || '',
      guruId: params.guruId,
      file: params.file,
      judul: params.judul,
      kategori: params.kategori || 'FOTO',
      actorUserId: params.actorUserId || params.uploadedByUserId,
    });
  }

  async deleteGuruDocument(params: { tenantId?: string; documentId: string; guruId: string }) {
    return deleteGuruDocumentCommand({
      tenantId: params.tenantId || '',
      guruId: params.guruId,
      documentId: params.documentId,
    });
  }

  async getGuruDocuments(params: { tenantId?: string; guruId: string; kategori?: string }) {
    return getGuruDocumentsQuery({
      tenantId: params.tenantId || '',
      guruId: params.guruId,
    });
  }

  async updateGuruNip(guruId: string, newNip: string) {
    const cleanNip = newNip.trim();

    const existingGuru = await prisma.guru.findUnique({
      where: { id: guruId },
      select: { tenant_id: true },
    });

    if (!existingGuru) {
      throw new Error('Guru tidak ditemukan.');
    }

    const nipConflict = await prisma.guru.findFirst({
      where: {
        tenant_id: existingGuru.tenant_id,
        nip: cleanNip,
        id: { not: guruId },
      },
    });

    if (nipConflict) {
      throw new Error(`NIP ${cleanNip} sudah digunakan oleh guru lain dalam sekolah ini.`);
    }

    return prisma.guru.update({
      where: { id: guruId },
      data: { nip: cleanNip },
    });
  }

  async updateGuruEmail(userId: string, newEmail: string) {
    const cleanEmail = newEmail.trim().toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        id: { not: userId },
      },
    });

    if (existingUser) {
      throw new Error(`Email ${cleanEmail} sudah digunakan oleh pengguna lain.`);
    }

    return prisma.user.update({
      where: { id: userId },
      data: { email: cleanEmail },
    });
  }

  async normalizeWaPhones(tenantId: string): Promise<{ total: number; updated: number; unchanged: number; invalid: number }> {
    const allGuru = await prisma.guru.findMany({
      where: { tenant_id: tenantId },
    });

    let total = 0;
    let updated = 0;
    let unchanged = 0;
    let invalid = 0;

    for (const guru of allGuru) {
      total++;
      if (!guru.no_hp) {
        invalid++;
        unchanged++;
        continue;
      }

      const cleaned = normalizePhone(guru.no_hp);
      if (cleaned) {
        if (cleaned !== guru.no_hp) {
          await prisma.guru.update({
            where: { id: guru.id },
            data: { no_hp: cleaned },
          });
          if (guru.no_hp) {
            removeLidMappingByPhone(guru.no_hp);
          }
          removeLidMappingByPhone(cleaned);
          updated++;
        } else {
          unchanged++;
        }
      } else {
        invalid++;
        unchanged++;
      }
    }

    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    return { total, updated, unchanged, invalid };
  }
}

export const guruService = new GuruService();
