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
        Fasilitator: {
          include: {
            Guru: { select: { id: true, nama_guru: true, nip: true } },
            Kelas: { include: { Kelas: { select: { id: true, nama_kelas: true, tingkat: true } } } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  static async deleteProjek(tenantId: string, id: string) {
    return prisma.p5Projek.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // === FASILITATOR P5 TIM ===
  static async getMyProjects(
    tenantId: string,
    guruId: string,
    filter?: { tahun_pelajaran_id?: string; semester_id?: string }
  ) {
    const fasilitatorAssignments = await prisma.p5Fasilitator.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: guruId,
        Projek: {
          ...(filter?.tahun_pelajaran_id ? { tahun_pelajaran_id: filter.tahun_pelajaran_id } : {}),
          ...(filter?.semester_id ? { semester_id: filter.semester_id } : {}),
        },
      },
      include: {
        Projek: {
          include: {
            TahunPelajaran: true,
            Semester: true,
          },
        },
        Kelas: {
          include: {
            Kelas: {
              select: {
                id: true,
                nama_kelas: true,
                tingkat: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return fasilitatorAssignments.map((f) => ({
      fasilitator_id: f.id,
      guru_id: f.guru_id,
      projek: f.Projek,
      covered_classes: f.Kelas.map((k) => k.Kelas),
      covered_class_ids: f.Kelas.map((k) => k.kelas_id),
    }));
  }

  static async getFasilitator(tenantId: string, projekId: string) {
    return prisma.p5Fasilitator.findMany({
      where: {
        tenant_id: tenantId,
        projek_id: projekId,
      },
      include: {
        Guru: {
          select: {
            id: true,
            nama_guru: true,
            nip: true,
          },
        },
        Kelas: {
          include: {
            Kelas: {
              select: {
                id: true,
                nama_kelas: true,
                tingkat: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  static async upsertFasilitator(
    tenantId: string,
    projekId: string,
    data: {
      guru_id: string;
      kelas_ids: string[];
    }
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Upsert P5Fasilitator
      const fasilitator = await tx.p5Fasilitator.upsert({
        where: {
          projek_id_guru_id: {
            projek_id: projekId,
            guru_id: data.guru_id,
          },
        },
        update: {},
        create: {
          tenant_id: tenantId,
          projek_id: projekId,
          guru_id: data.guru_id,
        },
      });

      // 2. Delete existing class coverage
      await tx.p5FasilitatorKelas.deleteMany({
        where: { fasilitator_id: fasilitator.id },
      });

      // 3. Insert new class coverage
      if (data.kelas_ids && data.kelas_ids.length > 0) {
        await tx.p5FasilitatorKelas.createMany({
          data: data.kelas_ids.map((kId) => ({
            fasilitator_id: fasilitator.id,
            kelas_id: kId,
          })),
        });
      }

      // Return full updated record
      return tx.p5Fasilitator.findUnique({
        where: { id: fasilitator.id },
        include: {
          Guru: true,
          Kelas: { include: { Kelas: true } },
        },
      });
    });
  }

  static async removeFasilitator(tenantId: string, projekId: string, guruId: string) {
    return prisma.p5Fasilitator.deleteMany({
      where: {
        tenant_id: tenantId,
        projek_id: projekId,
        guru_id: guruId,
      },
    });
  }

  // === NILAI P5 ===
  static async upsertNilai(
    tenantId: string,
    data: {
      projek_id: string;
      siswa_id: string;
      siswa_akademik_id?: string | null;
      dimensi: string;
      sub_elemen: string;
      kualifikasi: string;
      catatan_proses?: string | null;
    }
  ) {
    let saId = data.siswa_akademik_id || null;
    if (!saId) {
      const projek = await prisma.p5Projek.findFirst({
        where: { id: data.projek_id, tenant_id: tenantId },
        select: { tahun_pelajaran_id: true, semester_id: true },
      });
      if (projek) {
        let sa = await prisma.siswaAkademik.findFirst({
          where: {
            siswa_id: data.siswa_id,
            tahun_pelajaran_id: projek.tahun_pelajaran_id,
            semester_id: projek.semester_id,
          },
          select: { id: true },
        });
        if (!sa) {
          const siswa = await prisma.siswa.findFirst({
            where: { id: data.siswa_id, tenant_id: tenantId },
            select: { id: true, kelas_id: true },
          });
          if (siswa?.kelas_id) {
            sa = await prisma.siswaAkademik.upsert({
              where: {
                siswa_id_tahun_pelajaran_id_semester_id: {
                  siswa_id: siswa.id,
                  tahun_pelajaran_id: projek.tahun_pelajaran_id,
                  semester_id: projek.semester_id,
                },
              },
              create: {
                siswa_id: siswa.id,
                kelas_id: siswa.kelas_id,
                tahun_pelajaran_id: projek.tahun_pelajaran_id,
                semester_id: projek.semester_id,
                status: 'AKTIF',
              },
              update: {},
              select: { id: true },
            });
          }
        }
        saId = sa?.id || null;
      }
    }

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
        ...(saId ? { siswa_akademik_id: saId } : {}),
      },
      create: {
        tenant_id: tenantId,
        projek_id: data.projek_id,
        siswa_id: data.siswa_id,
        siswa_akademik_id: saId,
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
        siswa_akademik_id?: string | null;
        kualifikasi: string;
        catatan_proses?: string | null;
      }>;
    }
  ) {
    const projek = await prisma.p5Projek.findFirst({
      where: { id: data.projek_id, tenant_id: tenantId },
      select: { tahun_pelajaran_id: true, semester_id: true },
    });

    const saMap = new Map<string, string>();
    if (projek) {
      const uniqueSiswaIds = [...new Set(data.scores.map((s) => s.siswa_id))];
      const existingSas = await prisma.siswaAkademik.findMany({
        where: {
          siswa_id: { in: uniqueSiswaIds },
          tahun_pelajaran_id: projek.tahun_pelajaran_id,
          semester_id: projek.semester_id,
        },
        select: { id: true, siswa_id: true },
      });
      existingSas.forEach((sa) => saMap.set(sa.siswa_id, sa.id));

      const missingSiswaIds = uniqueSiswaIds.filter((id) => !saMap.has(id));
      if (missingSiswaIds.length > 0) {
        const students = await prisma.siswa.findMany({
          where: { id: { in: missingSiswaIds }, tenant_id: tenantId, kelas_id: { not: null } },
          select: { id: true, kelas_id: true },
        });
        for (const s of students) {
          if (s.kelas_id) {
            const createdSa = await prisma.siswaAkademik.upsert({
              where: {
                siswa_id_tahun_pelajaran_id_semester_id: {
                  siswa_id: s.id,
                  tahun_pelajaran_id: projek.tahun_pelajaran_id,
                  semester_id: projek.semester_id,
                },
              },
              create: {
                siswa_id: s.id,
                kelas_id: s.kelas_id,
                tahun_pelajaran_id: projek.tahun_pelajaran_id,
                semester_id: projek.semester_id,
                status: 'AKTIF',
              },
              update: {},
              select: { id: true },
            });
            saMap.set(s.id, createdSa.id);
          }
        }
      }
    }

    const operations = data.scores.map((s) => {
      const saId = s.siswa_akademik_id || saMap.get(s.siswa_id) || null;
      return prisma.p5NilaiSiswa.upsert({
        where: {
          siswa_id_projek_id_dimensi_sub_elemen: {
            siswa_id: s.siswa_id,
            projek_id: data.projek_id,
            dimensi: data.dimensi,
            sub_elemen: data.sub_elemen,
          },
        },
        update: {
          kualifikasi: s.kualifikasi,
          catatan_proses: s.catatan_proses || null,
          ...(saId ? { siswa_akademik_id: saId } : {}),
        },
        create: {
          tenant_id: tenantId,
          projek_id: data.projek_id,
          siswa_id: s.siswa_id,
          siswa_akademik_id: saId,
          dimensi: data.dimensi,
          sub_elemen: data.sub_elemen,
          kualifikasi: s.kualifikasi,
          catatan_proses: s.catatan_proses || null,
        },
      });
    });

    return prisma.$transaction(operations);
  }

  static async upsertMatrixNilai(
    tenantId: string,
    data: {
      projek_id: string;
      grades: Array<{
        siswa_id: string;
        siswa_akademik_id?: string | null;
        dimensi: string;
        sub_elemen: string;
        kualifikasi: string;
        catatan_proses?: string | null;
      }>;
    }
  ) {
    const projek = await prisma.p5Projek.findFirst({
      where: { id: data.projek_id, tenant_id: tenantId },
      select: { tahun_pelajaran_id: true, semester_id: true },
    });

    const saMap = new Map<string, string>();
    if (projek) {
      const uniqueSiswaIds = [...new Set(data.grades.map((g) => g.siswa_id))];
      const existingSas = await prisma.siswaAkademik.findMany({
        where: {
          siswa_id: { in: uniqueSiswaIds },
          tahun_pelajaran_id: projek.tahun_pelajaran_id,
          semester_id: projek.semester_id,
        },
        select: { id: true, siswa_id: true },
      });
      existingSas.forEach((sa) => saMap.set(sa.siswa_id, sa.id));

      const missingSiswaIds = uniqueSiswaIds.filter((id) => !saMap.has(id));
      if (missingSiswaIds.length > 0) {
        const students = await prisma.siswa.findMany({
          where: { id: { in: missingSiswaIds }, tenant_id: tenantId, kelas_id: { not: null } },
          select: { id: true, kelas_id: true },
        });
        for (const s of students) {
          if (s.kelas_id) {
            const createdSa = await prisma.siswaAkademik.upsert({
              where: {
                siswa_id_tahun_pelajaran_id_semester_id: {
                  siswa_id: s.id,
                  tahun_pelajaran_id: projek.tahun_pelajaran_id,
                  semester_id: projek.semester_id,
                },
              },
              create: {
                siswa_id: s.id,
                kelas_id: s.kelas_id,
                tahun_pelajaran_id: projek.tahun_pelajaran_id,
                semester_id: projek.semester_id,
                status: 'AKTIF',
              },
              update: {},
              select: { id: true },
            });
            saMap.set(s.id, createdSa.id);
          }
        }
      }
    }

    const operations = data.grades.map((g) => {
      const saId = g.siswa_akademik_id || saMap.get(g.siswa_id) || null;
      return prisma.p5NilaiSiswa.upsert({
        where: {
          siswa_id_projek_id_dimensi_sub_elemen: {
            siswa_id: g.siswa_id,
            projek_id: data.projek_id,
            dimensi: g.dimensi,
            sub_elemen: g.sub_elemen,
          },
        },
        update: {
          kualifikasi: g.kualifikasi,
          catatan_proses: g.catatan_proses || null,
          ...(saId ? { siswa_akademik_id: saId } : {}),
        },
        create: {
          tenant_id: tenantId,
          projek_id: data.projek_id,
          siswa_id: g.siswa_id,
          siswa_akademik_id: saId,
          dimensi: g.dimensi,
          sub_elemen: g.sub_elemen,
          kualifikasi: g.kualifikasi,
          catatan_proses: g.catatan_proses || null,
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
        SiswaAkademik: {
          select: {
            id: true,
            kelas_id: true,
            kelas: { select: { nama_kelas: true, tingkat: true } },
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
