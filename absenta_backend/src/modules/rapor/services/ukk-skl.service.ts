import { prisma } from '../../../utils/prisma';
import { fetchCloudSkkniKatalog, fetchCloudSkkniRumpun } from '@/services/licenseClient';

export class UkkSklService {
  // === UKK (Uji Kompetensi Keahlian) ===
  static async upsertUkk(
    tenantId: string,
    data: {
      id?: string | null;
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
    if (data.id) {
      return prisma.sertifikatUkk.update({
        where: {
          id: data.id,
          tenant_id: tenantId,
        },
        data: {
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

    // Filter tanggal_terbit sertifikat agar terisolasi per tahun ajaran
    let targetYearString = filter.tahun_ajaran;
    if (!targetYearString && filter.tahun_pelajaran_id) {
      const tp = await prisma.tahunPelajaran.findUnique({
        where: { id: filter.tahun_pelajaran_id },
        select: { tahun: true },
      });
      targetYearString = tp?.tahun;
    }

    let dateFilter: any = {};
    if (targetYearString && targetYearString.includes('/')) {
      const [y1Str, y2Str] = targetYearString.split('/');
      const y1 = parseInt(y1Str, 10);
      const y2 = parseInt(y2Str, 10);
      if (!isNaN(y1) && !isNaN(y2)) {
        const start = new Date(`${y1}-07-01T00:00:00.000Z`);
        const end = new Date(`${y2}-06-30T23:59:59.999Z`);
        dateFilter = {
          tanggal_terbit: {
            gte: start,
            lte: end,
          },
        };
      }
    }

    return prisma.sertifikatUkk.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.siswa_id ? { siswa_id: filter.siswa_id } : {}),
        ...dateFilter,
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

  /**
   * Mengambil semua pengaturan UKK historis per jurusan (semua tahun ajaran yang pernah disimpan).
   * Hasilnya berupa array ringkasan: { tahun_ajaran, edisi_pedoman, skema_sertifikasi, judul_penugasan_id, unit_kompetensi_count }
   */
  static async getAllUkkSettingsSummary(tenantId: string, jurusanId: string) {
    const prefix = `ukk_settings_${jurusanId}_`;
    const allConfigs = await prisma.config.findMany({
      where: {
        tenant_id: tenantId,
        key: { startsWith: prefix },
      },
      orderBy: { key: 'asc' },
    });

    return allConfigs.map((cfg) => {
      const sanitizedYear = cfg.key.slice(prefix.length); // e.g. "2023_2024"
      const tahunAjaran = sanitizedYear.replace(/_/g, '/').replace('//', '_'); // "2023/2024"
      let parsed: any = {};
      try { parsed = JSON.parse(cfg.value || '{}'); } catch {}
      return {
        tahun_ajaran: tahunAjaran,
        edisi_pedoman: parsed.edisi_pedoman || null,
        skema_sertifikasi: parsed.skema_sertifikasi || null,
        judul_penugasan_id: parsed.judul_penugasan_id || null,
        unit_kompetensi_count: Array.isArray(parsed.unit_kompetensi) ? parsed.unit_kompetensi.length : 0,
        updated_at: cfg.updated_at,
      };
    });
  }

  // === MASTER KATALOG SKKNI CLOUD (Single Source of Truth dari Server Lisensi) ===
  static async getCloudSkkniKatalog(tenantId: string, params?: { search?: string; rumpun?: string }) {
    // 1. Coba ambil langsung dari Server Lisensi
    const cloudData = await fetchCloudSkkniKatalog(params);
    if (cloudData && cloudData.length > 0) {
      // Simpan ke cache lokal untuk offline resiliency (jika tanpa filter)
      if (!params?.search && (!params?.rumpun || params.rumpun === 'ALL')) {
        const existing = await prisma.config.findFirst({
          where: { tenant_id: tenantId, key: 'skkni_cloud_cache' },
        });
        if (existing) {
          await prisma.config.update({
            where: { id: existing.id },
            data: { value: JSON.stringify(cloudData) },
          }).catch(() => {});
        } else {
          await prisma.config.create({
            data: {
              tenant_id: tenantId,
              key: 'skkni_cloud_cache',
              value: JSON.stringify(cloudData),
              description: 'Cache Katalog SKKNI Server Lisensi Offline Fallback',
            },
          }).catch(() => {});
        }
      }
      return { source: 'cloud', data: cloudData };
    }

    // 2. Offline Fallback: Baca dari cache DB lokal jika server lisensi tidak terjangkau
    const cached = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'skkni_cloud_cache' },
    });
    if (cached && cached.value) {
      try {
        let list = JSON.parse(cached.value);
        if (params?.rumpun && params.rumpun !== 'ALL') {
          list = list.filter((k: any) => k.rumpun === params.rumpun);
        }
        if (params?.search) {
          const q = params.search.toLowerCase();
          list = list.filter((k: any) =>
            (k.namaSkema && k.namaSkema.toLowerCase().includes(q)) ||
            (k.kodeSkema && k.kodeSkema.toLowerCase().includes(q)) ||
            k.units?.some((u: any) =>
              (u.judulUnitId && u.judulUnitId.toLowerCase().includes(q)) ||
              (u.kodeUnit && u.kodeUnit.toLowerCase().includes(q))
            )
          );
        }
        return { source: 'local_cache', data: list };
      } catch {}
    }

    return { source: 'empty', data: [] };
  }

  static async getCloudSkkniRumpun(tenantId: string) {
    const cloudRumpun = await fetchCloudSkkniRumpun();
    if (cloudRumpun && cloudRumpun.length > 0) return cloudRumpun;

    // Fallback dari cache DB lokal
    const cached = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'skkni_cloud_cache' },
    });
    if (cached && cached.value) {
      try {
        const list = JSON.parse(cached.value);
        const distinct = Array.from(new Set(list.map((k: any) => k.rumpun))).filter(Boolean) as string[];
        if (distinct.length > 0) return distinct;
      } catch {}
    }

    return [
      'Bisnis & Manajemen',
      'Kuliner & Pariwisata',
      'Seni & Ekonomi Kreatif',
      'Teknologi & Rekayasa',
      'Teknologi Informasi & Komunikasi',
    ];
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
