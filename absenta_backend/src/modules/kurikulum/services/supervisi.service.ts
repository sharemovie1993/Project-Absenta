import { prisma } from '../../../utils/prisma';
import { Prisma } from '@prisma/client';

export class SupervisiService {
  static async create(tenantId: string, data: {
    guru_id: string;
    tanggal: Date;
    mapel?: string;
    kelas?: string;
    jam_ke?: number;
    status?: string;
    catatan?: string;
    supervisor_id?: string;
  }) {
    return prisma.supervisiGuru.create({
      data: {
        tenant_id: tenantId,
        guru_id: data.guru_id,
        tanggal: data.tanggal,
        mapel: data.mapel,
        kelas: data.kelas,
        jam_ke: data.jam_ke,
        status: data.status || 'SCHEDULED',
        catatan: data.catatan,
        supervisor_id: data.supervisor_id,
      },
    });
  }

  static async update(tenantId: string, id: string, data: {
    tanggal?: Date;
    mapel?: string;
    kelas?: string;
    jam_ke?: number;
    status?: string;
    catatan?: string;
    nilai?: number;
    supervisor_id?: string;
  }) {
    // Verify ownership
    const existing = await prisma.supervisiGuru.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Supervisi not found');
    }

    return prisma.supervisiGuru.update({
      where: { id },
      data,
    });
  }

  static async delete(tenantId: string, id: string) {
    const existing = await prisma.supervisiGuru.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Supervisi not found');
    }

    return prisma.supervisiGuru.delete({
      where: { id },
    });
  }

  static async getAll(tenantId: string, query: {
    page?: number;
    limit?: number;
    search?: string;
    guru_id?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.SupervisiGuruWhereInput = {
      tenant_id: tenantId,
    };

    if (query.guru_id) {
      where.guru_id = query.guru_id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate && query.endDate) {
      where.tanggal = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    if (query.search) {
      where.OR = [
        { mapel: { contains: query.search, mode: 'insensitive' } },
        { kelas: { contains: query.search, mode: 'insensitive' } },
        { Guru: { nama_guru: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, list] = await Promise.all([
      prisma.supervisiGuru.count({ where }),
      prisma.supervisiGuru.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal: 'desc' },
        include: {
          Guru: {
            select: {
              id: true,
              nama_guru: true,
              nip: true,
            },
          },
          Supervisor: {
            select: {
              id: true,
              nama_guru: true,
            },
          },
        },
      }),
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getById(tenantId: string, id: string) {
    return prisma.supervisiGuru.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        Guru: {
          select: {
            id: true,
            nama_guru: true,
            nip: true,
          },
        },
        Supervisor: {
          select: {
            id: true,
            nama_guru: true,
          },
        },
      },
    });
  }
}
