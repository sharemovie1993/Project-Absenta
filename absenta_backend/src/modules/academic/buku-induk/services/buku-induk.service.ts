import { prisma } from '@/utils/prisma';

export class BukuIndukService {
  /**
   * Get paginated list of siswa for Buku Induk
   */
  async getBukuIndukList(
    tenantId: string,
    params: {
      tahun_pelajaran_id?: string;
      kelas_id?: string;
      jurusan_id?: string;
      tingkat?: string;
      angkatan?: string;
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const {
      tahun_pelajaran_id,
      kelas_id,
      jurusan_id,
      tingkat,
      angkatan,
      search,
      status,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    const where: any = {
      tenant_id: tenantId,
    };

    if (search) {
      where.OR = [
        { nama_siswa: { contains: search, mode: 'insensitive' } },
        { nis: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (angkatan) {
      const startOfYear = new Date(`${angkatan}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${angkatan}-12-31T23:59:59.999Z`);
      const angkatanCond = {
        OR: [
          { tanggal_masuk: { gte: startOfYear, lte: endOfYear } },
          { nis: { startsWith: angkatan } },
        ],
      };
      where.AND = where.AND ? [...where.AND, angkatanCond] : [angkatanCond];
    }

    if (tahun_pelajaran_id) {
      const siswaAkademikFilter: any = { tahun_pelajaran_id };
      if (kelas_id) {
        siswaAkademikFilter.kelas_id = kelas_id;
      }
      where.SiswaAkademik = { some: siswaAkademikFilter };
    } else if (kelas_id) {
      where.kelas_id = kelas_id;
    }

    if (jurusan_id) {
      where.jurusan_id = jurusan_id;
    }

    if (tingkat) {
      where.Kelas = { tingkat: parseInt(tingkat, 10) };
    }

    const [data, total] = await Promise.all([
      prisma.siswa.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nama_siswa: 'asc' },
        select: {
          id: true,
          nis: true,
          nama_siswa: true,
          nisn: true,
          status: true,
          jenis_kelamin: true,
          tanggal_masuk: true,
          foto: true,
          Kelas: {
            select: {
              id: true,
              nama_kelas: true,
              tingkat: true,
              jurusan_id: true,
            },
          },
          TahunPelajaran: {
            select: {
              id: true,
              tahun: true,
            },
          },
          Semester: {
            select: {
              id: true,
              nama_semester: true,
            },
          },
        },
      }),
      prisma.siswa.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get full 360° profile of a siswa for Buku Induk Detail
   */
  async getBukuIndukDetail(tenantId: string, siswaId: string) {
    const siswa = await prisma.siswa.findFirst({
      where: {
        id: siswaId,
        tenant_id: tenantId,
      },
      include: {
        Kelas: {
          select: {
            id: true,
            nama_kelas: true,
            tingkat: true,
            jurusan_id: true,
          },
        },
        TahunPelajaran: {
          select: {
            id: true,
            tahun: true,
          },
        },
        Semester: {
          select: {
            id: true,
            nama_semester: true,
          },
        },
        OrangTuaSiswa: {
          include: {
            OrangTua: true,
          },
        },
        SiswaDocument: true,
        HubinTracerStudy: true,
        SiswaAkademik: {
          orderBy: { tahun_pelajaran_id: 'asc' },
          include: {
            tahunPelajaran: {
              select: {
                id: true,
                tahun: true,
              },
            },
            semester: {
              select: {
                id: true,
                nama_semester: true,
              },
            },
            kelas: {
              select: {
                id: true,
                nama_kelas: true,
                tingkat: true,
                jurusan_id: true,
              },
            },
            NilaiSiswa: {
              include: {
                Mapel: {
                  select: {
                    id: true,
                    nama_mapel: true,
                    kode_mapel: true,
                  },
                },
              },
            },
            P5NilaiSiswa: true,
            NilaiEskul: {
              include: {
                JenisKegiatanMaster: {
                  select: {
                    id: true,
                    nama: true,
                  },
                },
              },
            },
            AbsenSiswa: {
              select: {
                id: true,
                status: true,
              },
            },
            PrestasiSiswa: true,
            KelulusanSiswa: true,
            SertifikatUkk: true,
            SiswaPkl: true,
          },
        },
      },
    });

    if (!siswa) {
      return null;
    }

    return siswa;
  }

  /**
   * Get paginated Klapper (alphabetical index) of siswa
   */
  async getKlapperList(
    tenantId: string,
    params: {
      tahun_pelajaran_id?: string;
      angkatan?: string;
      status?: string;
      search?: string;
      huruf?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { tahun_pelajaran_id, angkatan, status, search, huruf, page = 1, limit = 20 } = params;

    const skip = (page - 1) * limit;

    const where: any = {
      tenant_id: tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (angkatan) {
      const startOfYear = new Date(`${angkatan}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${angkatan}-12-31T23:59:59.999Z`);
      const angkatanCond = {
        OR: [
          { tanggal_masuk: { gte: startOfYear, lte: endOfYear } },
          { nis: { startsWith: angkatan } },
        ],
      };
      where.AND = where.AND ? [...where.AND, angkatanCond] : [angkatanCond];
    }

    if (huruf) {
      where.nama_siswa = { startsWith: huruf, mode: 'insensitive' };
    }

    if (search) {
      const searchConditions: any[] = [
        { nama_siswa: { contains: search, mode: 'insensitive' } },
        { nis: { contains: search, mode: 'insensitive' } },
      ];
      if (huruf) {
        // Combine huruf filter with search
        where.AND = [
          { nama_siswa: { startsWith: huruf, mode: 'insensitive' } },
          {
            OR: searchConditions,
          },
        ];
        delete where.nama_siswa;
      } else {
        where.OR = searchConditions;
      }
    }

    if (tahun_pelajaran_id) {
      where.SiswaAkademik = { some: { tahun_pelajaran_id } };
    }

    const [data, total] = await Promise.all([
      prisma.siswa.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nama_siswa: 'asc' },
        select: {
          id: true,
          nis: true,
          nama_siswa: true,
          nisn: true,
          status: true,
          tanggal_masuk: true,
          Kelas: {
            select: {
              id: true,
              nama_kelas: true,
              tingkat: true,
            },
          },
        },
      }),
      prisma.siswa.count({ where }),
    ]);

    // Attach klapper number (1-based position within this paginated result)
    const dataWithKlapperNo = data.map((siswa, index) => ({
      ...siswa,
      klapper_no: skip + index + 1,
    }));

    return {
      data: dataWithKlapperNo,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const bukuIndukService = new BukuIndukService();
