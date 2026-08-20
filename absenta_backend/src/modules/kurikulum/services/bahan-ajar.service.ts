import { prisma } from '../../../utils/prisma';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';

export interface ListPresetsFilter {
  fase?: string;
  search?: string;
  kode_mapel_ref?: string;
}

export class BahanAjarService {
  /**
   * Mengambil daftar preset bahan ajar global platform
   */
  static async listPresets(filter: ListPresetsFilter = {}) {
    const { fase, search, kode_mapel_ref } = filter;

    const where: any = {
      status: 'PUBLISHED'
    };

    if (fase) {
      where.fase = fase;
    }

    if (kode_mapel_ref) {
      where.kode_mapel_ref = kode_mapel_ref;
    }

    if (search) {
      where.OR = [
        { judul_modul: { contains: search, mode: 'insensitive' } },
        { deskripsi: { contains: search, mode: 'insensitive' } },
        { nama_mapel_ref: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }

    return prisma.bahanAjarPreset.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Mengambil detail 1 preset bahan ajar
   */
  static async getPresetById(id: string) {
    const preset = await prisma.bahanAjarPreset.findUnique({
      where: { id }
    });

    if (!preset) {
      throw new Error('Preset Bahan Ajar tidak ditemukan');
    }

    return preset;
  }

  /**
   * Mengambil konten modul baca dari PerangkatAjar guru, Preset ID, atau Mapel ID
   */
  static async getBahanAjarForReader(tenantId: string, targetIdentifier: string) {
    // 1. Cek apakah targetIdentifier langsung merujuk ke BahanAjarPreset ID
    const directPreset = await prisma.bahanAjarPreset.findUnique({
      where: { id: targetIdentifier }
    });

    if (directPreset) {
      return {
        perangkat: {
          id: directPreset.id,
          judul: directPreset.judul_modul,
          fase: directPreset.fase,
          tingkat: directPreset.tingkat,
          total_alokasi_jp: directPreset.total_alokasi_jp,
          Mapel: { nama_mapel: directPreset.nama_mapel_ref }
        },
        konten: directPreset.konten_json,
        source: 'PRESET'
      };
    }

    // 2. Cek apakah targetIdentifier adalah ID PerangkatAjar di database
    const perangkat = await prisma.perangkatAjar.findFirst({
      where: { id: targetIdentifier, tenant_id: tenantId },
      include: {
        Mapel: true,
        Guru: true,
        TahunPelajaran: true,
        Semester: true
      }
    });

    if (perangkat) {
      // Jika memiliki konten terstruktur langsung
      if (perangkat.konten_struktur_json) {
        return {
          perangkat,
          konten: perangkat.konten_struktur_json,
          source: 'CUSTOM'
        };
      }

      // Jika menautkan ke preset_ref_id
      if (perangkat.preset_ref_id) {
        const linkedPreset = await prisma.bahanAjarPreset.findUnique({
          where: { id: perangkat.preset_ref_id }
        });
        if (linkedPreset) {
          return {
            perangkat,
            konten: linkedPreset.konten_json,
            source: 'PRESET'
          };
        }
      }

      // Fallback per-mapel untuk perangkat ini
      const matchedPreset = await prisma.bahanAjarPreset.findFirst({
        where: {
          OR: [
            { judul_modul: { contains: perangkat.judul, mode: 'insensitive' } },
            { nama_mapel_ref: { contains: perangkat.Mapel?.nama_mapel || '', mode: 'insensitive' } }
          ],
          status: 'PUBLISHED'
        }
      });

      if (matchedPreset) {
        return {
          perangkat,
          konten: matchedPreset.konten_json,
          source: 'AUTO_MATCHED_PRESET'
        };
      }
    }

    // 3. Cek apakah targetIdentifier adalah Mapel ID
    const mapel = await prisma.mapel.findFirst({
      where: { id: targetIdentifier, tenant_id: tenantId }
    });

    if (mapel) {
      const mapelPreset = await prisma.bahanAjarPreset.findFirst({
        where: {
          OR: [
            { nama_mapel_ref: { contains: mapel.nama_mapel, mode: 'insensitive' } },
            { kode_mapel_ref: { contains: mapel.kode_mapel || '', mode: 'insensitive' } }
          ],
          status: 'PUBLISHED'
        }
      });

      if (mapelPreset) {
        return {
          perangkat: {
            id: mapelPreset.id,
            judul: mapelPreset.judul_modul,
            fase: mapelPreset.fase,
            tingkat: mapelPreset.tingkat,
            total_alokasi_jp: mapelPreset.total_alokasi_jp,
            Mapel: { nama_mapel: mapel.nama_mapel }
          },
          konten: mapelPreset.konten_json,
          source: 'PRESET'
        };
      }
    }

    // 4. Fallback Terakhir: Ambil preset nasional pertama yang berstatus PUBLISHED
    const defaultPreset = await prisma.bahanAjarPreset.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { created_at: 'asc' }
    });

    if (defaultPreset) {
      return {
        perangkat: {
          id: defaultPreset.id,
          judul: defaultPreset.judul_modul,
          fase: defaultPreset.fase,
          tingkat: defaultPreset.tingkat,
          total_alokasi_jp: defaultPreset.total_alokasi_jp,
          Mapel: { nama_mapel: defaultPreset.nama_mapel_ref }
        },
        konten: defaultPreset.konten_json,
        source: 'PRESET'
      };
    }

    return {
      perangkat: null,
      konten: null,
      source: 'NONE'
    };
  }

  /**
   * Menyimpan / memperbarui konten terstruktur modul ajar guru
   */
  static async saveStructuredKonten(tenantId: string, perangkatId: string, kontenJson: any) {
    const existing = await prisma.perangkatAjar.findFirst({
      where: { id: perangkatId, tenant_id: tenantId }
    });

    if (!existing) {
      throw new Error('Perangkat ajar tidak ditemukan');
    }

    const updated = await prisma.perangkatAjar.update({
      where: { id: perangkatId },
      data: {
        konten_struktur_json: kontenJson
      }
    });

    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    return updated;
  }

  /**
   * Mengimpor preset global menjadi PerangkatAjar personal guru
   */
  static async importPresetToPerangkat(
    tenantId: string,
    presetId: string,
    data: {
      guru_id: string;
      mapel_id: string;
      tahun_pelajaran_id?: string;
      semester_id?: string;
    }
  ) {
    const preset = await this.getPresetById(presetId);

    let resolvedTahunId = data.tahun_pelajaran_id;
    if (!resolvedTahunId) {
      const activeTahun = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true }
      });
      resolvedTahunId = activeTahun?.id;
    }

    let resolvedSemesterId = data.semester_id;
    if (!resolvedSemesterId) {
      const activeSem = await prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true }
      });
      resolvedSemesterId = activeSem?.id;
    }

    if (!resolvedTahunId || !resolvedSemesterId) {
      throw new Error('Tahun Pelajaran atau Semester aktif tidak ditemukan');
    }

    const created = await prisma.perangkatAjar.create({
      data: {
        tenant_id: tenantId,
        guru_id: data.guru_id,
        mapel_id: data.mapel_id,
        tahun_pelajaran_id: resolvedTahunId,
        semester_id: resolvedSemesterId,
        judul: preset.judul_modul,
        jenis: 'MODUL_AJAR',
        fase: preset.fase,
        tingkat: preset.tingkat,
        total_alokasi_jp: preset.total_alokasi_jp,
        konten_struktur_json: preset.konten_json as any,
        preset_ref_id: preset.id,
        file_url: 'INTERNAL_DIGITAL_READER',
        status: 'APPROVED'
      }
    });

    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    return created;
  }
}
