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

  static async getUkk(tenantId: string, filter: { siswa_id?: string; query?: string; jurusan_id?: string; kelas_id?: string }) {
    return prisma.sertifikatUkk.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.siswa_id ? { siswa_id: filter.siswa_id } : {}),
        ...(filter.jurusan_id
          ? {
              Siswa: {
                OR: [
                  { jurusan_id: filter.jurusan_id },
                  { Kelas: { jurusan_id: filter.jurusan_id } },
                ],
              },
            }
          : {}),
        ...(filter.kelas_id ? { Siswa: { kelas_id: filter.kelas_id } } : {}),
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
            nama_siswa: true,
            jurusan_id: true,
            kelas_id: true,
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

  // === UKK Jurusan Settings (Judul Penugasan, Unit Kompetensi, Skema) ===
  static async getUkkSettings(tenantId: string, jurusanId?: string) {
    const key = jurusanId ? `ukk_settings_${jurusanId}` : 'ukk_settings_default';
    const config = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key },
    });
    if (!config || !config.value) return null;
    try {
      return JSON.parse(config.value);
    } catch {
      return null;
    }
  }

  static async saveUkkSettings(tenantId: string, jurusanId: string, data: any) {
    const key = jurusanId ? `ukk_settings_${jurusanId}` : 'ukk_settings_default';
    const value = JSON.stringify(data);
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key },
    });
    if (existing) {
      return prisma.config.update({
        where: { id: existing.id },
        data: { value, description: `Konfigurasi UKK Jurusan ${jurusanId || 'Default'}` },
      });
    } else {
      return prisma.config.create({
        data: {
          tenant_id: tenantId,
          key,
          value,
          description: `Konfigurasi UKK Jurusan ${jurusanId || 'Default'}`,
        },
      });
    }
  }

  // === UKK Pra-UKK Jadwal & Ploting Penguji ===
  static async getUkkJadwal(tenantId: string, jurusanId?: string) {
    const key = jurusanId ? `ukk_jadwal_${jurusanId}` : 'ukk_jadwal_default';
    const config = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key },
    });
    if (!config || !config.value) return [];
    try {
      const parsed = JSON.parse(config.value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static async saveUkkJadwal(tenantId: string, jurusanId: string, sessions: any[]) {
    const key = jurusanId ? `ukk_jadwal_${jurusanId}` : 'ukk_jadwal_default';
    const value = JSON.stringify(sessions);
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

  // === UKK Berita Acara & Dokumentasi Sesi ===
  static async getUkkBeritaAcara(tenantId: string, jurusanId?: string) {
    const key = jurusanId ? `ukk_berita_acara_${jurusanId}` : 'ukk_berita_acara_default';
    const config = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key },
    });
    if (!config || !config.value) return [];
    try {
      const parsed = JSON.parse(config.value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static async saveUkkBeritaAcara(tenantId: string, jurusanId: string, records: any[]) {
    const key = jurusanId ? `ukk_berita_acara_${jurusanId}` : 'ukk_berita_acara_default';
    const value = JSON.stringify(records);
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
