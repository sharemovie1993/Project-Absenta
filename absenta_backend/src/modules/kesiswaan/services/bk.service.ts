import { Prisma } from '@prisma/client';
import { prisma } from '../../../utils/prisma';

export class BkService {
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
    search?: string;
    siswa_id?: string;
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

  // === Konseling Siswa ===
  static async createKonseling(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    tipe: string;
    kelompok_id?: string;
    masalah: string;
    solusi?: string;
    status?: string;
    petugas_id: string;
  }) {
    return prisma.konselingSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal: data.tanggal,
        tipe: data.tipe,
        kelompok_id: data.kelompok_id,
        masalah: data.masalah,
        solusi: data.solusi,
        status: data.status || 'PROSES',
        petugas_id: data.petugas_id
      }
    });
  }

  static async updateKonseling(tenantId: string, id: string, data: {
    tanggal?: Date;
    tipe?: string;
    masalah?: string;
    solusi?: string;
    status?: string;
  }) {
    await this.verifyOwner('konselingSiswa', id, tenantId);
    return prisma.konselingSiswa.update({
      where: { id },
      data
    });
  }

  static async deleteKonseling(tenantId: string, id: string) {
    await this.verifyOwner('konselingSiswa', id, tenantId);
    return prisma.konselingSiswa.delete({
      where: { id }
    });
  }

  static async getAllKonseling(tenantId: string, query: {
    page?: number;
    limit?: number;
    search?: string;
    siswa_id?: string;
    tipe?: string;
    status?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.KonselingSiswaWhereInput = {
      tenant_id: tenantId
    };

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }

    if (query.tipe) {
      where.tipe = query.tipe;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { masalah: { contains: query.search, mode: 'insensitive' } },
        { solusi: { contains: query.search, mode: 'insensitive' } },
        { Siswa: { nama_siswa: { contains: query.search, mode: 'insensitive' } } }
      ];
    }

    const [total, list] = await Promise.all([
      prisma.konselingSiswa.count({ where }),
      prisma.konselingSiswa.findMany({
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
          Petugas: {
            select: {
              id: true,
              full_name: true
            }
          }
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

  // === Pemanggilan Orang Tua ===
  static async createPemanggilan(tenantId: string, data: {
    siswa_id: string;
    tanggal_pemanggilan: Date;
    alasan: string;
    surat_dokumen_id?: string;
  }) {
    return prisma.pemanggilanOrangTua.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal_pemanggilan: data.tanggal_pemanggilan,
        alasan: data.alasan,
        surat_dokumen_id: data.surat_dokumen_id,
        status: 'BARU'
      }
    });
  }

  static async updatePemanggilan(tenantId: string, id: string, data: {
    tanggal_pertemuan?: Date;
    keterangan_pertemuan?: string;
    status?: string;
    surat_dokumen_id?: string;
  }) {
    await this.verifyOwner('pemanggilanOrangTua', id, tenantId);
    return prisma.pemanggilanOrangTua.update({
      where: { id },
      data
    });
  }

  static async deletePemanggilan(tenantId: string, id: string) {
    await this.verifyOwner('pemanggilanOrangTua', id, tenantId);
    return prisma.pemanggilanOrangTua.delete({
      where: { id }
    });
  }

  static async getAllPemanggilan(tenantId: string, query: {
    page?: number;
    limit?: number;
    siswa_id?: string;
    status?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.PemanggilanOrangTuaWhereInput = {
      tenant_id: tenantId
    };

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [total, list] = await Promise.all([
      prisma.pemanggilanOrangTua.count({ where }),
      prisma.pemanggilanOrangTua.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal_pemanggilan: 'desc' },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              Kelas: { select: { nama_kelas: true } }
            }
          },
          Dokumen: true
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

  // === Home Visit ===
  static async createHomeVisit(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    alasan: string;
    hasil?: string;
    foto_dokumen_id?: string;
  }) {
    return prisma.homeVisit.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal: data.tanggal,
        alasan: data.alasan,
        hasil: data.hasil,
        foto_dokumen_id: data.foto_dokumen_id
      }
    });
  }

  static async updateHomeVisit(tenantId: string, id: string, data: {
    tanggal?: Date;
    alasan?: string;
    hasil?: string;
    foto_dokumen_id?: string;
  }) {
    await this.verifyOwner('homeVisit', id, tenantId);
    return prisma.homeVisit.update({
      where: { id },
      data
    });
  }

  static async deleteHomeVisit(tenantId: string, id: string) {
    await this.verifyOwner('homeVisit', id, tenantId);
    return prisma.homeVisit.delete({
      where: { id }
    });
  }

  static async getAllHomeVisits(tenantId: string, query: {
    page?: number;
    limit?: number;
    siswa_id?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.HomeVisitWhereInput = {
      tenant_id: tenantId
    };

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }

    const [total, list] = await Promise.all([
      prisma.homeVisit.count({ where }),
      prisma.homeVisit.findMany({
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
          Dokumen: true
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

  // === Asesmen BK ===
  static async createAsesmen(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    nama_asesmen: string;
    hasil_skor?: string;
    keterangan?: string;
    dokumen_id?: string;
  }) {
    return prisma.asesmenSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal: data.tanggal,
        nama_asesmen: data.nama_asesmen,
        hasil_skor: data.hasil_skor,
        keterangan: data.keterangan,
        dokumen_id: data.dokumen_id
      }
    });
  }

  static async updateAsesmen(tenantId: string, id: string, data: {
    tanggal?: Date;
    nama_asesmen?: string;
    hasil_skor?: string;
    keterangan?: string;
    dokumen_id?: string;
  }) {
    await this.verifyOwner('asesmenSiswa', id, tenantId);
    return prisma.asesmenSiswa.update({
      where: { id },
      data
    });
  }

  static async deleteAsesmen(tenantId: string, id: string) {
    await this.verifyOwner('asesmenSiswa', id, tenantId);
    return prisma.asesmenSiswa.delete({
      where: { id }
    });
  }

  static async getAllAsesmen(tenantId: string, query: {
    page?: number;
    limit?: number;
    siswa_id?: string;
    search?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.AsesmenSiswaWhereInput = {
      tenant_id: tenantId
    };

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }

    if (query.search) {
      where.OR = [
        { nama_asesmen: { contains: query.search, mode: 'insensitive' } },
        { keterangan: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const [total, list] = await Promise.all([
      prisma.asesmenSiswa.count({ where }),
      prisma.asesmenSiswa.findMany({
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
          Dokumen: true
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

  // === Rujukan Kasus ===
  static async createRujukan(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    rujukan_ke: string;
    alasan: string;
    status?: string;
  }) {
    return prisma.rujukanKasus.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tanggal: data.tanggal,
        rujukan_ke: data.rujukan_ke,
        alasan: data.alasan,
        status: data.status || 'DIUSULKAN'
      }
    });
  }

  static async updateRujukan(tenantId: string, id: string, data: {
    tanggal?: Date;
    rujukan_ke?: string;
    alasan?: string;
    status?: string;
  }) {
    await this.verifyOwner('rujukanKasus', id, tenantId);
    return prisma.rujukanKasus.update({
      where: { id },
      data
    });
  }

  static async deleteRujukan(tenantId: string, id: string) {
    await this.verifyOwner('rujukanKasus', id, tenantId);
    return prisma.rujukanKasus.delete({
      where: { id }
    });
  }

  static async getAllRujukan(tenantId: string, query: {
    page?: number;
    limit?: number;
    siswa_id?: string;
    status?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.RujukanKasusWhereInput = {
      tenant_id: tenantId
    };

    if (query.siswa_id) {
      where.siswa_id = query.siswa_id;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [total, list] = await Promise.all([
      prisma.rujukanKasus.count({ where }),
      prisma.rujukanKasus.findMany({
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
          }
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

  // === Dashboard Stats & Early Warning System ===
  static async getDashboardStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      activeCounselingCount,
      pendingCallsCount,
      monthHomeVisitsCount,
      recentViolations,
      recentCounselings,
      siswaList
    ] = await Promise.all([
      // 1. Active Counseling
      prisma.konselingSiswa.count({
        where: { tenant_id: tenantId, status: 'PROSES' }
      }),
      // 2. Pending Summons
      prisma.pemanggilanOrangTua.count({
        where: { tenant_id: tenantId, status: { in: ['BARU', 'DIKIRIM'] } }
      }),
      // 3. Month Home Visits
      prisma.homeVisit.count({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: startOfMonth }
        }
      }),
      // 4. Recent Violations (top 5)
      prisma.pelanggaranSiswa.findMany({
        where: { tenant_id: tenantId },
        take: 5,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: { nama_siswa: true, Kelas: { select: { nama_kelas: true } } }
          }
        }
      }),
      // 5. Recent Counselings (top 5)
      prisma.konselingSiswa.findMany({
        where: { tenant_id: tenantId },
        take: 5,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: { nama_siswa: true, Kelas: { select: { nama_kelas: true } } }
          }
        }
      }),
      // 6. Fetch active students to calculate points for EWS
      prisma.siswa.findMany({
        where: { tenant_id: tenantId, status: 'AKTIF' },
        select: {
          id: true,
          nama_siswa: true,
          nis: true,
          Kelas: { select: { nama_kelas: true } },
          PelanggaranSiswa: { select: { poin: true } },
          PrestasiSiswa: { select: { poin: true } }
        }
      })
    ]);

    // 7. Calculate EWS points and sort by net points
    const criticalStudents = siswaList
      .map(s => {
        const totalViolations = s.PelanggaranSiswa.reduce((sum, p) => sum + p.poin, 0);
        const totalAchievements = s.PrestasiSiswa.reduce((sum, p) => sum + p.poin, 0);
        const netPoints = totalViolations - totalAchievements;
        return {
          id: s.id,
          nama_siswa: s.nama_siswa,
          nis: s.nis,
          kelas: s.Kelas?.nama_kelas || 'Tanpa Kelas',
          violations: totalViolations,
          achievements: totalAchievements,
          netPoints: netPoints
        };
      })
      .filter(s => s.violations > 30) // Highlight threshold
      .sort((a, b) => b.netPoints - a.netPoints)
      .slice(0, 10);

    return {
      activeCounselingCount,
      pendingCallsCount,
      monthHomeVisitsCount,
      recentViolations,
      recentCounselings,
      criticalStudents
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
