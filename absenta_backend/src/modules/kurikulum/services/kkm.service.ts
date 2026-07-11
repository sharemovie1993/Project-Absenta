import { prisma } from '../../../utils/prisma';

export class KkmService {
  static async getAll(tenantId: string, filter: { mapel_id?: string; tingkat?: number }) {
    return prisma.kkmp.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.mapel_id ? { mapel_id: filter.mapel_id } : {}),
        ...(filter.tingkat ? { tingkat: Number(filter.tingkat) } : {}),
      },
      include: {
        Mapel: true,
      },
      orderBy: [
        { tingkat: 'asc' },
        { Mapel: { nama_mapel: 'asc' } },
      ],
    });
  }

  static async upsert(tenantId: string, data: { mapel_id: string; tingkat: number; kkm_nilai: number }) {
    return prisma.kkmp.upsert({
      where: {
        tenant_id_mapel_id_tingkat: {
          tenant_id: tenantId,
          mapel_id: data.mapel_id,
          tingkat: data.tingkat,
        },
      },
      update: {
        kkm_nilai: data.kkm_nilai,
      },
      create: {
        tenant_id: tenantId,
        mapel_id: data.mapel_id,
        tingkat: data.tingkat,
        kkm_nilai: data.kkm_nilai,
      },
    });
  }

  static async delete(tenantId: string, id: string) {
    return prisma.kkmp.deleteMany({
      where: {
        id,
        tenant_id: tenantId,
      },
    });
  }
}
