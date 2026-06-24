import { prisma } from '../../../utils/prisma';
import { Prisma } from '@prisma/client';

export class PrestasiService {
  // === Jenis Prestasi ===
  static async createJenisPrestasi(tenantId: string, data: {
    kategori: string;
    nama_prestasi: string;
    poin: number;
  }) {
    return prisma.jenisPrestasi.create({
      data: {
        tenant_id: tenantId,
        kategori: data.kategori,
        nama_prestasi: data.nama_prestasi,
        poin: data.poin
      }
    });
  }

  static async updateJenisPrestasi(tenantId: string, id: string, data: {
    kategori?: string;
    nama_prestasi?: string;
    poin?: number;
  }) {
    await this.verifyOwner('jenisPrestasi', id, tenantId);
    return prisma.jenisPrestasi.update({
      where: { id },
      data
    });
  }

  static async deleteJenisPrestasi(tenantId: string, id: string) {
    await this.verifyOwner('jenisPrestasi', id, tenantId);
    return prisma.jenisPrestasi.delete({
      where: { id }
    });
  }

  static async getAllJenisPrestasi(tenantId: string) {
    return prisma.jenisPrestasi.findMany({
      where: { tenant_id: tenantId },
      orderBy: { nama_prestasi: 'asc' }
    });
  }

  // === Prestasi Siswa ===
  static async createPrestasiSiswa(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    jenis_prestasi_id?: string;
    nama_prestasi: string;
    poin: number;
    keterangan?: string;
  }) {
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

    return prisma.prestasiSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        siswa_akademik_id: siswaAkademikId,
        kelas_id: siswa?.kelas_id,
        tanggal: data.tanggal,
        jenis_prestasi_id: data.jenis_prestasi_id,
        nama_prestasi: data.nama_prestasi,
        poin: data.poin,
        keterangan: data.keterangan
      }
    });
  }

  static async updatePrestasiSiswa(tenantId: string, id: string, data: {
    tanggal?: Date;
    jenis_prestasi_id?: string;
    nama_prestasi?: string;
    poin?: number;
    keterangan?: string;
  }) {
    await this.verifyOwner('prestasiSiswa', id, tenantId);
    return prisma.prestasiSiswa.update({
      where: { id },
      data
    });
  }

  static async deletePrestasiSiswa(tenantId: string, id: string) {
    await this.verifyOwner('prestasiSiswa', id, tenantId);
    return prisma.prestasiSiswa.delete({
      where: { id }
    });
  }

  static async getAllPrestasiSiswa(tenantId: string, query: {
    page?: number;
    limit?: number;
    siswa_id?: string;
    search?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.PrestasiSiswaWhereInput = {
      tenant_id: tenantId
    };

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }

    if (query.search) {
      where.OR = [
        { nama_prestasi: { contains: query.search, mode: 'insensitive' } },
        { keterangan: { contains: query.search, mode: 'insensitive' } },
        { Siswa: { nama_siswa: { contains: query.search, mode: 'insensitive' } } }
      ];
    }

    const [total, list] = await Promise.all([
      prisma.prestasiSiswa.count({ where }),
      prisma.prestasiSiswa.findMany({
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
              Kelas: { select: { nama_kelas: true } }
            }
          },
          Jenis: true
        }
      })
    ]);

    return {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // === Helper Owner Verification ===
  private static async verifyOwner(modelName: string, id: string, tenantId: string) {
    const dbModel = (prisma as any)[modelName];
    if (!dbModel) {
      throw new Error(`Model ${modelName} not found in Prisma client`);
    }
    const record = await dbModel.findFirst({
      where: { id, tenant_id: tenantId }
    });
    if (!record) {
      throw new Error(`Data not found or unauthorized access to model ${modelName}`);
    }
  }
}
