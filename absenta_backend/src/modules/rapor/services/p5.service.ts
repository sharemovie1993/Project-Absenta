import { prisma } from '../../../utils/prisma';

export class P5Service {
  // === PROJEK MASTER ===
  static async createProjek(
    tenantId: string,
    data: {
      judul: string;
      deskripsi?: string | null;
      tahun_pelajaran_id: string;
      semester_id: string;
    }
  ) {
    return prisma.p5Projek.create({
      data: {
        tenant_id: tenantId,
        judul: data.judul,
        deskripsi: data.deskripsi,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
      },
    });
  }

  static async updateProjek(
    tenantId: string,
    id: string,
    data: {
      judul?: string;
      deskripsi?: string | null;
      tahun_pelajaran_id?: string;
      semester_id?: string;
    }
  ) {
    return prisma.p5Projek.updateMany({
      where: { id, tenant_id: tenantId },
      data,
    });
  }

  static async getProjek(
    tenantId: string,
    filter: { tahun_pelajaran_id?: string; semester_id?: string }
  ) {
    return prisma.p5Projek.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.tahun_pelajaran_id ? { tahun_pelajaran_id: filter.tahun_pelajaran_id } : {}),
        ...(filter.semester_id ? { semester_id: filter.semester_id } : {}),
      },
      include: {
        TahunPelajaran: true,
        Semester: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  static async deleteProjek(tenantId: string, id: string) {
    return prisma.p5Projek.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // === NILAI P5 ===
  static async upsertNilai(
    tenantId: string,
    data: {
      projek_id: string;
      siswa_id: string;
      dimensi: string;
      sub_elemen: string;
      kualifikasi: string;
      catatan_proses?: string | null;
    }
  ) {
    return prisma.p5NilaiSiswa.upsert({
      where: {
        siswa_id_projek_id_dimensi_sub_elemen: {
          siswa_id: data.siswa_id,
          projek_id: data.projek_id,
          dimensi: data.dimensi,
          sub_elemen: data.sub_elemen,
        },
      },
      update: {
        kualifikasi: data.kualifikasi,
        catatan_proses: data.catatan_proses || null,
      },
      create: {
        tenant_id: tenantId,
        projek_id: data.projek_id,
        siswa_id: data.siswa_id,
        dimensi: data.dimensi,
        sub_elemen: data.sub_elemen,
        kualifikasi: data.kualifikasi,
        catatan_proses: data.catatan_proses || null,
      },
    });
  }

  static async upsertBulkNilai(
    tenantId: string,
    data: {
      projek_id: string;
      dimensi: string;
      sub_elemen: string;
      scores: Array<{
        siswa_id: string;
        kualifikasi: string;
        catatan_proses?: string | null;
      }>;
    }
  ) {
    const operations = data.scores.map((score) => {
      return prisma.p5NilaiSiswa.upsert({
        where: {
          siswa_id_projek_id_dimensi_sub_elemen: {
            siswa_id: score.siswa_id,
            projek_id: data.projek_id,
            dimensi: data.dimensi,
            sub_elemen: data.sub_elemen,
          },
        },
        update: {
          kualifikasi: score.kualifikasi,
          catatan_proses: score.catatan_proses || null,
        },
        create: {
          tenant_id: tenantId,
          projek_id: data.projek_id,
          siswa_id: score.siswa_id,
          dimensi: data.dimensi,
          sub_elemen: data.sub_elemen,
          kualifikasi: score.kualifikasi,
          catatan_proses: score.catatan_proses || null,
        },
      });
    });

    return prisma.$transaction(operations);
  }

  static async getNilai(
    tenantId: string,
    filter: {
      projek_id?: string;
      siswa_id?: string;
      dimensi?: string;
    }
  ) {
    return prisma.p5NilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.projek_id ? { projek_id: filter.projek_id } : {}),
        ...(filter.siswa_id ? { siswa_id: filter.siswa_id } : {}),
        ...(filter.dimensi ? { dimensi: filter.dimensi } : {}),
      },
      include: {
        Siswa: {
          select: {
            nama_siswa: true,
            nis: true,
            Kelas: { select: { nama_kelas: true } },
          },
        },
        Projek: true,
      },
      orderBy: [
        { Siswa: { nama_siswa: 'asc' } },
        { dimensi: 'asc' },
      ],
    });
  }
}
