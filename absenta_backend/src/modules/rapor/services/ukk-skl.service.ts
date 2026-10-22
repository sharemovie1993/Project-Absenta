import { prisma } from '../../../utils/prisma';

export class UkkSklService {
  // === UKK (Uji Kompetensi Keahlian) ===
  static async upsertUkk(
    tenantId: string,
    data: {
      siswa_id: string;
      asesor_internal?: string | null;
      asesor_eksternal: string;
      mitra_industri_id?: string | null;
      nilai_praktik: number;
      nilai_teori?: number | null;
      predikat: string;
      nomor_sertifikat: string;
      tanggal_terbit: Date;
    }
  ) {
    return prisma.sertifikatUkk.upsert({
      where: {
        nomor_sertifikat: data.nomor_sertifikat,
      },
      update: {
        asesor_internal: data.asesor_internal,
        asesor_eksternal: data.asesor_eksternal,
        mitra_industri_id: data.mitra_industri_id,
        nilai_praktik: data.nilai_praktik,
        nilai_teori: data.nilai_teori,
        predikat: data.predikat,
        tanggal_terbit: data.tanggal_terbit,
      },
      create: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        asesor_internal: data.asesor_internal,
        asesor_eksternal: data.asesor_eksternal,
        mitra_industri_id: data.mitra_industri_id,
        nilai_praktik: data.nilai_praktik,
        nilai_teori: data.nilai_teori,
        predikat: data.predikat,
        nomor_sertifikat: data.nomor_sertifikat,
        tanggal_terbit: data.tanggal_terbit,
      },
    });
  }

  static async getUkk(
    tenantId: string,
    filter: {
      siswa_id?: string;
      query?: string;
      jurusan_id?: string;
      kelas_id?: string;
      tahun_pelajaran_id?: string;
      tahun_ajaran?: string;
    }
  ) {
    const siswaConditions: any[] = [];

    if (filter.jurusan_id) {
      siswaConditions.push({
        OR: [
          { jurusan_id: filter.jurusan_id },
          { Kelas: { jurusan_id: filter.jurusan_id } },
        ],
      });
    }

    if (filter.kelas_id) {
      siswaConditions.push({ kelas_id: filter.kelas_id });
    }

    if (filter.tahun_pelajaran_id) {
      siswaConditions.push({
        OR: [
          { tahun_pelajaran_id: filter.tahun_pelajaran_id },
          { SiswaAkademik: { some: { tahun_pelajaran_id: filter.tahun_pelajaran_id } } },
        ],
      });
    } else if (filter.tahun_ajaran) {
      siswaConditions.push({
        OR: [
          { TahunPelajaran: { tahun: filter.tahun_ajaran } },
          { SiswaAkademik: { some: { tahunPelajaran: { tahun: filter.tahun_ajaran } } } },
        ],
      });
    }

    const siswaWhere: any = siswaConditions.length > 0 ? { AND: siswaConditions } : {};

    return prisma.sertifikatUkk.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.siswa_id ? { siswa_id: filter.siswa_id } : {}),
        ...(Object.keys(siswaWhere).length > 0 ? { Siswa: siswaWhere } : {}),
        ...(filter.query
          ? {
              OR: [
                { nomor_sertifikat: { contains: filter.query, mode: 'insensitive' } },
                { asesor_internal: { contains: filter.query, mode: 'insensitive' } },
                { asesor_eksternal: { contains: filter.query, mode: 'insensitive' } },
                { Siswa: { nama_siswa: { contains: filter.query, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        Siswa: {
          select: {
            id: true,
            nis: true,
            nisn: true,
            nama_siswa: true,
            jurusan_id: true,
            kelas_id: true,
            tahun_pelajaran_id: true,
            TahunPelajaran: {
              select: {
                id: true,
                tahun: true,
              },
            },
            Kelas: {
              select: {
                id: true,
                nama_kelas: true,
                tingkat: true,
                jurusan_id: true,
              },
            },
          },
        },
        MitraIndustri: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  static async deleteUkk(tenantId: string, id: string) {
    return prisma.sertifikatUkk.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // === UKK Jurusan Settings (Judul Penugasan, Unit Kompetensi, Skema, Edisi Regulasi Historis) ===
  static async getUkkSettings(tenantId: string, jurusanId?: string, tahunAjaran?: string) {
    if (!jurusanId) {
      const config = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: 'ukk_settings_default' },
      });
      if (!config || !config.value) return null;
      try {
        return JSON.parse(config.value);
      } catch {
        return null;
      }
    }

    // 1. If academic year specified, check year-scoped key first (e.g. ukk_settings_jurId_2025_2026)
    if (tahunAjaran) {
      const sanitizedYear = String(tahunAjaran).replace(/[^a-zA-Z0-9]/g, '_');
      const yearKey = `ukk_settings_${jurusanId}_${sanitizedYear}`;
      const yearConfig = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: yearKey },
      });
      if (yearConfig && yearConfig.value) {
        try {
          return JSON.parse(yearConfig.value);
        } catch {}
      }
    }

    // 2. Fallback to general jurusan key
    const fallbackKey = `ukk_settings_${jurusanId}`;
    const fallbackConfig = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: fallbackKey },
    });
    if (!fallbackConfig || !fallbackConfig.value) return null;
    try {
      return JSON.parse(fallbackConfig.value);
    } catch {
      return null;
    }
  }

  static async saveUkkSettings(tenantId: string, jurusanId: string, data: any, tahunAjaran?: string) {
    const value = JSON.stringify(data);
    const targetYear = tahunAjaran || data?.tahun_ajaran;

    // 1. If year is present, save year-specific historical record
    if (targetYear) {
      const sanitizedYear = String(targetYear).replace(/[^a-zA-Z0-9]/g, '_');
      const yearKey = `ukk_settings_${jurusanId}_${sanitizedYear}`;
      const existingYear = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: yearKey },
      });
      if (existingYear) {
        await prisma.config.update({
          where: { id: existingYear.id },
          data: { value, description: `Konfigurasi UKK Jurusan ${jurusanId} TA ${targetYear}` },
        });
      } else {
        await prisma.config.create({
          data: {
            tenant_id: tenantId,
            key: yearKey,
            value,
            description: `Konfigurasi UKK Jurusan ${jurusanId} TA ${targetYear}`,
          },
        });
      }
    }

    // 2. Also save to current active default key for backwards compatibility
    const defaultKey = `ukk_settings_${jurusanId}`;
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: defaultKey },
    });
    if (existing) {
      return prisma.config.update({
        where: { id: existing.id },
        data: { value, description: `Konfigurasi UKK Jurusan ${jurusanId}` },
      });
    } else {
      return prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: defaultKey,
          value,
          description: `Konfigurasi UKK Jurusan ${jurusanId}`,
        },
      });
    }
  }

  // === UKK Pra-UKK Jadwal & Ploting Penguji (Aware Tahun Ajaran Historis) ===
  static async getUkkJadwal(tenantId: string, jurusanId?: string, tahunAjaran?: string) {
    if (tahunAjaran) {
      const sanitizedYear = String(tahunAjaran).replace(/[^a-zA-Z0-9]/g, '_');
      const yearKey = jurusanId ? `ukk_jadwal_${jurusanId}_${sanitizedYear}` : `ukk_jadwal_default_${sanitizedYear}`;
      const yearConfig = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: yearKey },
      });
      if (yearConfig && yearConfig.value) {
        try {
          const parsed = JSON.parse(yearConfig.value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {}
      }
    }

    const fallbackKey = jurusanId ? `ukk_jadwal_${jurusanId}` : 'ukk_jadwal_default';
    const config = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: fallbackKey },
    });
    if (!config || !config.value) return [];
    try {
      const parsed = JSON.parse(config.value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static async saveUkkJadwal(tenantId: string, jurusanId: string, sessions: any[], tahunAjaran?: string) {
    const value = JSON.stringify(sessions);

    if (tahunAjaran) {
      const sanitizedYear = String(tahunAjaran).replace(/[^a-zA-Z0-9]/g, '_');
      const yearKey = jurusanId ? `ukk_jadwal_${jurusanId}_${sanitizedYear}` : `ukk_jadwal_default_${sanitizedYear}`;
      const existingYear = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: yearKey },
      });
      if (existingYear) {
        await prisma.config.update({
          where: { id: existingYear.id },
          data: { value, description: `Jadwal & Ploting UKK Jurusan ${jurusanId || 'Default'} TA ${tahunAjaran}` },
        });
      } else {
        await prisma.config.create({
          data: {
            tenant_id: tenantId,
            key: yearKey,
            value,
            description: `Jadwal & Ploting UKK Jurusan ${jurusanId || 'Default'} TA ${tahunAjaran}`,
          },
        });
      }
    }

    const key = jurusanId ? `ukk_jadwal_${jurusanId}` : 'ukk_jadwal_default';
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key },
    });
    if (existing) {
      return prisma.config.update({
        where: { id: existing.id },
        data: { value, description: `Jadwal & Ploting UKK Jurusan ${jurusanId || 'Default'}` },
      });
    } else {
      return prisma.config.create({
        data: {
          tenant_id: tenantId,
          key,
          value,
          description: `Jadwal & Ploting UKK Jurusan ${jurusanId || 'Default'}`,
        },
      });
    }
  }

  // === UKK Berita Acara & Dokumentasi Sesi (Aware Tahun Ajaran Historis) ===
  static async getUkkBeritaAcara(tenantId: string, jurusanId?: string, tahunAjaran?: string) {
    if (tahunAjaran) {
      const sanitizedYear = String(tahunAjaran).replace(/[^a-zA-Z0-9]/g, '_');
      const yearKey = jurusanId ? `ukk_berita_acara_${jurusanId}_${sanitizedYear}` : `ukk_berita_acara_default_${sanitizedYear}`;
      const yearConfig = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: yearKey },
      });
      if (yearConfig && yearConfig.value) {
        try {
          const parsed = JSON.parse(yearConfig.value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {}
      }
    }

    const fallbackKey = jurusanId ? `ukk_berita_acara_${jurusanId}` : 'ukk_berita_acara_default';
    const config = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: fallbackKey },
    });
    if (!config || !config.value) return [];
    try {
      const parsed = JSON.parse(config.value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static async saveUkkBeritaAcara(tenantId: string, jurusanId: string, records: any[], tahunAjaran?: string) {
    const value = JSON.stringify(records);

    if (tahunAjaran) {
      const sanitizedYear = String(tahunAjaran).replace(/[^a-zA-Z0-9]/g, '_');
      const yearKey = jurusanId ? `ukk_berita_acara_${jurusanId}_${sanitizedYear}` : `ukk_berita_acara_default_${sanitizedYear}`;
      const existingYear = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key: yearKey },
      });
      if (existingYear) {
        await prisma.config.update({
          where: { id: existingYear.id },
          data: { value, description: `Berita Acara UKK Jurusan ${jurusanId || 'Default'} TA ${tahunAjaran}` },
        });
      } else {
        await prisma.config.create({
          data: {
            tenant_id: tenantId,
            key: yearKey,
            value,
            description: `Berita Acara UKK Jurusan ${jurusanId || 'Default'} TA ${tahunAjaran}`,
          },
        });
      }
    }

    const key = jurusanId ? `ukk_berita_acara_${jurusanId}` : 'ukk_berita_acara_default';
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key },
    });
    if (existing) {
      return prisma.config.update({
        where: { id: existing.id },
        data: { value, description: `Berita Acara UKK Jurusan ${jurusanId || 'Default'}` },
      });
    } else {
      return prisma.config.create({
        data: {
          tenant_id: tenantId,
          key,
          value,
          description: `Berita Acara UKK Jurusan ${jurusanId || 'Default'}`,
        },
      });
    }
  }

  // === SKL (Surat Keterangan Lulus) ===
  static async upsertSkl(
    tenantId: string,
    data: {
      siswa_id: string;
      nomor_skl: string;
      tanggal_lulus: Date;
      rata_rata_nilai: number;
      status_kelulusan?: string;
      catatan?: string | null;
    }
  ) {
    return prisma.kelulusanSiswa.upsert({
      where: {
        nomor_skl: data.nomor_skl,
      },
      update: {
        tanggal_lulus: data.tanggal_lulus,
        rata_rata_nilai: data.rata_rata_nilai,
        status_kelulusan: data.status_kelulusan || 'LULUS',
        catatan: data.catatan,
      },
      create: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        nomor_skl: data.nomor_skl,
        tanggal_lulus: data.tanggal_lulus,
        rata_rata_nilai: data.rata_rata_nilai,
        status_kelulusan: data.status_kelulusan || 'LULUS',
        catatan: data.catatan,
      },
    });
  }

  static async getSkl(tenantId: string, filter: { siswa_id?: string; query?: string }) {
    return prisma.kelulusanSiswa.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.siswa_id ? { siswa_id: filter.siswa_id } : {}),
        ...(filter.query
          ? {
              OR: [
                { nomor_skl: { contains: filter.query, mode: 'insensitive' } },
                { Siswa: { nama_siswa: { contains: filter.query, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        Siswa: {
          select: {
            id: true,
            nis: true,
            nama_siswa: true,
            Kelas: {
              select: {
                nama_kelas: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  static async deleteSkl(tenantId: string, id: string) {
    return prisma.kelulusanSiswa.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }
}
