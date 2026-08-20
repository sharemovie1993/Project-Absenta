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
   * Mengambil konten modul baca dari PerangkatAjar guru atau fallback ke preset jika ditautkan
   */
  static async getBahanAjarForReader(tenantId: string, perangkatId: string) {
    const perangkat = await prisma.perangkatAjar.findFirst({
      where: { id: perangkatId, tenant_id: tenantId },
      include: {
        Mapel: true,
        Guru: true,
        TahunPelajaran: true,
        Semester: true
      }
    });

    if (!perangkat) {
      throw new Error('Perangkat ajar tidak ditemukan');
    }

    // Jika perangkat memiliki konten terstruktur langsung
    if (perangkat.konten_struktur_json) {
      return {
        perangkat,
        konten: perangkat.konten_struktur_json,
        source: 'CUSTOM'
      };
    }

    // Jika perangkat menautkan ke preset_ref_id
    if (perangkat.preset_ref_id) {
      const preset = await prisma.bahanAjarPreset.findUnique({
        where: { id: perangkat.preset_ref_id }
      });
      if (preset) {
        return {
          perangkat,
          konten: preset.konten_json,
          source: 'PRESET'
        };
      }
    }

    // Fallback: cari preset yang cocok berdasarkan mapel / nama jika ada
    const fallbackPreset = await prisma.bahanAjarPreset.findFirst({
      where: {
        OR: [
          { judul_modul: { contains: perangkat.judul, mode: 'insensitive' } },
          { nama_mapel_ref: { contains: perangkat.Mapel?.nama_mapel || '', mode: 'insensitive' } }
        ],
        status: 'PUBLISHED'
      }
    });

    return {
      perangkat,
      konten: fallbackPreset ? fallbackPreset.konten_json : null,
      source: fallbackPreset ? 'AUTO_MATCHED_PRESET' : 'NONE'
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
