import { prisma } from '../../../utils/prisma';

export class StrukturKurikulumService {
  static async getAll(tenantId: string, filter: { tahun_pelajaran_id?: string; tingkat?: number; jurusan_id?: string }) {
    return prisma.strukturKurikulum.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.tahun_pelajaran_id ? { tahun_pelajaran_id: filter.tahun_pelajaran_id } : {}),
        ...(filter.tingkat ? { tingkat: Number(filter.tingkat) } : {}),
        ...(filter.jurusan_id ? {
          OR: [
            { jurusan_id: filter.jurusan_id },
            { jurusan_id: null }
          ]
        } : {}),
      },
      include: {
        Mapel: true,
        Jurusan: true,
        TahunPelajaran: true,
      },
      orderBy: {
        tingkat: 'asc',
      },
    });
  }

  static async upsert(tenantId: string, data: {
    mapel_id: string;
    tahun_pelajaran_id: string;
    tingkat: number;
    jurusan_id?: string;
    jp_per_minggu: number;
    kelompok?: string;
  }) {
    // Check if exists to determine whether to update or create
    const existing = await prisma.strukturKurikulum.findFirst({
      where: {
        tenant_id: tenantId,
        mapel_id: data.mapel_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        tingkat: data.tingkat,
        jurusan_id: data.jurusan_id || null,
      }
    });

    if (existing) {
      return prisma.strukturKurikulum.update({
        where: { id: existing.id },
        data: {
          jp_per_minggu: data.jp_per_minggu,
          kelompok: data.kelompok
        }
      });
    }

    return prisma.strukturKurikulum.create({
      data: {
        tenant_id: tenantId,
        ...data
      }
    });
  }

  static async delete(tenantId: string, id: string) {
    return prisma.strukturKurikulum.deleteMany({
      where: { id, tenant_id: tenantId }
    });
  }

  static async getByTingkatGrouped(tenantId: string, tahunPelajaranId: string) {
      const all = await this.getAll(tenantId, { tahun_pelajaran_id: tahunPelajaranId });
      
      const grouped: Record<number, any[]> = {};
      all.forEach(item => {
          if (!grouped[item.tingkat]) grouped[item.tingkat] = [];
          grouped[item.tingkat].push(item);
      });
      
      return grouped;
  }
}
