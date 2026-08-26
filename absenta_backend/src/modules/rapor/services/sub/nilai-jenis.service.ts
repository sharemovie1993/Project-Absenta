// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { prisma } from '@/utils/prisma';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export class NilaiJenisService {
  static async getAllJenis(tenantId: string) {
    return prisma.jenisNilaiMaster.findMany({
      where: { tenant_id: tenantId },
      orderBy: { kode: 'asc' },
    });
  }

  static async createJenis(tenantId: string, data: { nama: string; kode: string; bobot: number; is_active?: boolean }) {
    return prisma.jenisNilaiMaster.create({
      data: {
        tenant_id: tenantId,
        ...data,
      },
    });
  }

  static async updateJenis(tenantId: string, id: string, data: Partial<{ nama: string; kode: string; bobot: number; is_active: boolean }>) {
    // Pastikan kepemilikan tenant
    const existing = await prisma.jenisNilaiMaster.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Jenis penilaian tidak ditemukan atau bukan milik tenant Anda');
    }

    return prisma.jenisNilaiMaster.update({
      where: { id },
      data,
    });
  }

  static async deleteJenis(tenantId: string, id: string) {
    const existing = await prisma.jenisNilaiMaster.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Jenis penilaian tidak ditemukan atau bukan milik tenant Anda');
    }

    return prisma.jenisNilaiMaster.delete({
      where: { id },
    });
  }

  // === NILAI SISWA ===
}
