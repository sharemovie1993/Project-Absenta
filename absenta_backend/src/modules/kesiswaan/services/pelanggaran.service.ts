import { Prisma } from '@prisma/client';
import { prisma } from '../../../utils/prisma';
import { applyDataScope } from '../../../utils/applyDataScope';
import { DataScope } from '../../../types/fastify';

export class PelanggaranService {
  static async create(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    jenis_pelanggaran: string;
    poin: number;
    keterangan?: string;
    status?: string;
  }) {
    // Ambil info akademik saat ini dari data Siswa
    const siswa = await prisma.siswa.findUnique({
      where: { id: data.siswa_id },
      select: { kelas_id: true, tahun_pelajaran_id: true, semester_id: true }
    });

    let siswaAkademikId: string | undefined;
    if (siswa && siswa.tahun_pelajaran_id && siswa.semester_id) {
      const sa = await prisma.siswaAkademik.findFirst({
        where: {
          siswa_id: data.siswa_id,
          kelas_id: siswa.kelas_id,
          tahun_pelajaran_id: siswa.tahun_pelajaran_id,
          semester_id: siswa.semester_id
        }
      });
      siswaAkademikId = sa?.id;
    }

    return prisma.pelanggaranSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        siswa_akademik_id: siswaAkademikId,
        kelas_id: siswa?.kelas_id,
        tanggal: data.tanggal,
        jenis_pelanggaran: data.jenis_pelanggaran,
        poin: data.poin,
        keterangan: data.keterangan,
        status: data.status || 'BARU',
      },
    });
  }

  static async update(tenantId: string, id: string, data: {
    tanggal?: Date;
    jenis_pelanggaran?: string;
    poin?: number;
    keterangan?: string;
    status?: string;
  }) {
    // Verify ownership
    const existing = await prisma.pelanggaranSiswa.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Pelanggaran not found');
    }

    return prisma.pelanggaranSiswa.update({
      where: { id },
      data,
    });
  }

  static async delete(tenantId: string, id: string) {
    const existing = await prisma.pelanggaranSiswa.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Pelanggaran not found');
    }

    return prisma.pelanggaranSiswa.delete({
      where: { id },
    });
  }

  static async getAll(tenantId: string, query: {
    page?: number;
    limit?: number;
    search?: string;
    siswa_id?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }, scope?: DataScope) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    let where: Prisma.PelanggaranSiswaWhereInput = {
      tenant_id: tenantId,
    };

    if (scope) {
      where = applyDataScope(where, scope);
      
      // If student scope (userId present), refine where to filter by student's user identity
      if (scope.userId) {
          where.Siswa = { user_id: scope.userId };
          // Remove default user_id filter from applyDataScope if it exists, as it refers to student's user_id indirectly
          delete (where as any).user_id; 
      }
    }

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
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
        { jenis_pelanggaran: { contains: query.search, mode: 'insensitive' } },
        { keterangan: { contains: query.search, mode: 'insensitive' } },
        { Siswa: { nama_siswa: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    console.log(`[PelanggaranService] Final Where Clause:`, JSON.stringify(where, null, 2));

    const [total, list] = await Promise.all([
      prisma.pelanggaranSiswa.count({ where }),
      prisma.pelanggaranSiswa.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              Kelas: {
                select: {
                  id: true,
                  nama_kelas: true,
                },
              },
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
    return prisma.pelanggaranSiswa.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        Siswa: {
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            Kelas: true,
          },
        },
      },
    });
  }
}
