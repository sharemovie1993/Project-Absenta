import { prisma } from '../../../utils/prisma';
import { Prisma } from '@prisma/client';

export const DEFAULT_JENIS_PRESTASI = [
  { kategori: "Akademik", nama_prestasi: "Juara 1 Kelas / Umum", poin: 30 },
  { kategori: "Akademik", nama_prestasi: "Juara 2 Kelas / Umum", poin: 20 },
  { kategori: "Akademik", nama_prestasi: "Juara 3 Kelas / Umum", poin: 15 },
  { kategori: "Akademik", nama_prestasi: "Juara KSN/OSN Tingkat Kabupaten", poin: 50 },
  { kategori: "Akademik", nama_prestasi: "Juara KSN/OSN Tingkat Provinsi", poin: 75 },
  { kategori: "Akademik", nama_prestasi: "Juara KSN/OSN Tingkat Nasional", poin: 100 },
  
  { kategori: "Non-Akademik", nama_prestasi: "Juara Lomba Olahraga Tingkat Kabupaten", poin: 40 },
  { kategori: "Non-Akademik", nama_prestasi: "Juara Lomba Olahraga Tingkat Provinsi", poin: 60 },
  { kategori: "Non-Akademik", nama_prestasi: "Juara Lomba Olahraga Tingkat Nasional", poin: 80 },
  
  { kategori: "Non-Akademik", nama_prestasi: "Juara Lomba Seni/Kreativitas Tingkat Kabupaten", poin: 40 },
  { kategori: "Non-Akademik", nama_prestasi: "Juara Lomba Seni/Kreativitas Tingkat Provinsi", poin: 60 },
  { kategori: "Non-Akademik", nama_prestasi: "Juara Lomba Seni/Kreativitas Tingkat Nasional", poin: 80 },
  
  { kategori: "Keorganisasian", nama_prestasi: "Pengurus OSIS / MPK Aktif", poin: 20 },
  { kategori: "Keorganisasian", nama_prestasi: "Ketua OSIS / MPK", poin: 40 },
  { kategori: "Keorganisasian", nama_prestasi: "Paskibraka Kabupaten/Provinsi/Nasional", poin: 60 },
  
  { kategori: "Karakter & Keagamaan", nama_prestasi: "Hafizh Al-Qur'an Juz 30", poin: 30 },
  { kategori: "Karakter & Keagamaan", nama_prestasi: "Hafizh Al-Qur'an > 3 Juz", poin: 60 },
  { kategori: "Karakter & Keagamaan", nama_prestasi: "Siswa Terdisiplin / Teladan Bulanan", poin: 25 }
];

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

    if ((query as any).kelas_id) {
      where.kelas_id = (query as any).kelas_id;
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

  static async countJenisPrestasi(tenantId: string) {
    return prisma.jenisPrestasi.count({ where: { tenant_id: tenantId } });
  }

  static async seedDefaultJenisPrestasiForTenant(tenantId: string) {
    try {
      const count = await prisma.jenisPrestasi.count({ where: { tenant_id: tenantId } });
      if (count > 0) return;

      await prisma.jenisPrestasi.createMany({
        data: DEFAULT_JENIS_PRESTASI.map(d => ({
          ...d,
          tenant_id: tenantId
        }))
      });
      console.info(`[SEED] Jenis Prestasi seeded for tenant ${tenantId}`);
    } catch (error) {
      console.error(`[SEED] Failed to seed Jenis Prestasi for tenant ${tenantId}:`, error);
    }
  }

  static async getLeaderboard(tenantId: string, limit: number = 10) {
    const students = await prisma.prestasiSiswa.groupBy({
      by: ['siswa_id', 'kelas_id'],
      where: { tenant_id: tenantId },
      _sum: { poin: true },
      orderBy: { _sum: { poin: 'desc' } },
      take: limit,
    });

    const result = await Promise.all(
      students.map(async (item) => {
        const student = await prisma.siswa.findUnique({
          where: { id: item.siswa_id },
          select: { nama_siswa: true, nis: true },
        });
        const kelas = item.kelas_id
          ? await prisma.kelas.findUnique({
              where: { id: item.kelas_id },
              select: { nama_kelas: true },
            })
          : null;

        return {
          siswa_id: item.siswa_id,
          nama_siswa: student?.nama_siswa || 'Siswa Tidak Ditemukan',
          nis: student?.nis || '',
          nama_kelas: kelas?.nama_kelas || 'Umum',
          total_poin: item._sum.poin || 0,
        };
      })
    );

    return result;
  }
}
