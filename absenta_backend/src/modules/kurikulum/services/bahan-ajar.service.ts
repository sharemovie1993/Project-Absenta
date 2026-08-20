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
   * Mengambil konten modul baca dari PerangkatAjar guru, Preset ID, atau Mapel ID dengan filter kontekstual
   */
  static async getBahanAjarForReader(
    tenantId: string,
    targetIdentifier: string,
    context: {
      fase?: string;
      tingkat?: number;
      mapel_nama?: string;
      mapel_id?: string;
    } = {}
  ) {
    const { fase, tingkat, mapel_nama, mapel_id } = context;

    let effectiveMapelNama = mapel_nama;
    if (!effectiveMapelNama && mapel_id) {
      const mapelRecord = await prisma.mapel.findFirst({ where: { id: mapel_id, tenant_id: tenantId } });
      if (mapelRecord) effectiveMapelNama = mapelRecord.nama_mapel;
    }

    // 1. Dapatkan daftar seluruh modul Guru (PerangkatAjar) & Preset yang relevan
    const perangkatWhere: any = { tenant_id: tenantId };
    if (mapel_id) {
      perangkatWhere.mapel_id = mapel_id;
    } else if (effectiveMapelNama) {
      perangkatWhere.Mapel = {
        nama_mapel: { contains: effectiveMapelNama, mode: 'insensitive' }
      };
    }
    if (fase) {
      perangkatWhere.fase = fase;
    }

    const availablePerangkats = await prisma.perangkatAjar.findMany({
      where: perangkatWhere,
      include: {
        Mapel: true,
        Guru: true,
        TahunPelajaran: true,
        Semester: true
      },
      orderBy: { created_at: 'asc' }
    });

    const presetWhere: any = { status: 'PUBLISHED' };
    if (fase) {
      presetWhere.fase = fase;
    } else if (tingkat) {
      presetWhere.tingkat = tingkat;
    }

    if (effectiveMapelNama) {
      presetWhere.OR = [
        { nama_mapel_ref: { contains: effectiveMapelNama, mode: 'insensitive' } },
        { kode_mapel_ref: { contains: effectiveMapelNama, mode: 'insensitive' } },
        { tags: { has: effectiveMapelNama } }
      ];
    }

    const availablePresets = await prisma.bahanAjarPreset.findMany({
      where: presetWhere,
      orderBy: { created_at: 'asc' }
    });

    const availableModulsList = [
      ...availablePerangkats.map(p => ({
        id: p.id,
        judul: p.judul,
        fase: p.fase || 'E',
        tingkat: p.tingkat || 10,
        total_alokasi_jp: p.total_alokasi_jp || 18,
        mapel: p.Mapel?.nama_mapel || effectiveMapelNama || 'Mata Pelajaran'
      })),
      ...availablePresets.map(p => ({
        id: p.id,
        judul: p.judul_modul,
        fase: p.fase,
        tingkat: p.tingkat,
        total_alokasi_jp: p.total_alokasi_jp,
        mapel: p.nama_mapel_ref
      }))
    ];

    // 2. Cek apakah targetIdentifier langsung merujuk ke ID PerangkatAjar Guru
    let directPerangkat = (targetIdentifier && targetIdentifier !== 'auto' && targetIdentifier !== 'empty-mapel')
      ? availablePerangkats.find(p => p.id === targetIdentifier) || await prisma.perangkatAjar.findFirst({
          where: { id: targetIdentifier, tenant_id: tenantId },
          include: { Mapel: true, Guru: true, TahunPelajaran: true, Semester: true }
        })
      : availablePerangkats[0];

    if (directPerangkat) {
      if (directPerangkat.konten_struktur_json) {
        return {
          perangkat: directPerangkat,
          konten: directPerangkat.konten_struktur_json,
          source: 'CUSTOM',
          available_moduls: availableModulsList
        };
      }

      if (directPerangkat.preset_ref_id) {
        const linkedPreset = await prisma.bahanAjarPreset.findUnique({
          where: { id: directPerangkat.preset_ref_id }
        });
        if (linkedPreset) {
          return {
            perangkat: directPerangkat,
            konten: linkedPreset.konten_json,
            source: 'PRESET',
            available_moduls: availableModulsList
          };
        }
      }
    }

    // 3. Cek apakah targetIdentifier langsung merujuk ke BahanAjarPreset ID
    const directPreset = (targetIdentifier && targetIdentifier !== 'auto')
      ? await prisma.bahanAjarPreset.findUnique({ where: { id: targetIdentifier } })
      : null;

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
        source: 'PRESET',
        available_moduls: availableModulsList
      };
    }

    // 4. Jika ada preset yang cocok dari availablePresets
    if (availablePresets.length > 0) {
      const selectedPreset = availablePresets[0];
      return {
        perangkat: {
          id: selectedPreset.id,
          judul: selectedPreset.judul_modul,
          fase: selectedPreset.fase,
          tingkat: selectedPreset.tingkat,
          total_alokasi_jp: selectedPreset.total_alokasi_jp,
          Mapel: { nama_mapel: selectedPreset.nama_mapel_ref }
        },
        konten: selectedPreset.konten_json,
        source: 'PRESET',
        available_moduls: availableModulsList
      };
    }

    // 5. Jika filter Mapel sudah ditentukan tetapi belum ada modul tersimpan:
    if (effectiveMapelNama) {
      return {
        perangkat: {
          id: 'empty-mapel',
          judul: `Bahan Ajar: ${effectiveMapelNama}`,
          fase: fase,
          tingkat: tingkat,
          total_alokasi_jp: 0,
          Mapel: { nama_mapel: effectiveMapelNama }
        },
        konten: null,
        source: 'NONE',
        available_moduls: []
      };
    }

    // 6. Fallback Global HANYA jika TIDAK ADA mapel yang diminta sama sekali
    const fallbackAll = await prisma.bahanAjarPreset.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { created_at: 'asc' }
    });

    if (fallbackAll) {
      return {
        perangkat: {
          id: fallbackAll.id,
          judul: fallbackAll.judul_modul,
          fase: fallbackAll.fase,
          tingkat: fallbackAll.tingkat,
          total_alokasi_jp: fallbackAll.total_alokasi_jp,
          Mapel: { nama_mapel: fallbackAll.nama_mapel_ref }
        },
        konten: fallbackAll.konten_json,
        source: 'PRESET',
        available_moduls: [
          {
            id: fallbackAll.id,
            judul: fallbackAll.judul_modul,
            fase: fallbackAll.fase,
            tingkat: fallbackAll.tingkat,
            total_alokasi_jp: fallbackAll.total_alokasi_jp,
            mapel: fallbackAll.nama_mapel_ref
          }
        ]
      };
    }

    return {
      perangkat: null,
      konten: null,
      source: 'NONE',
      available_moduls: []
    };
  }

  /**
   * Menyimpan / memperbarui konten terstruktur modul ajar guru
   */
  static async saveStructuredKonten(
    tenantId: string,
    perangkatId: string,
    kontenJson: any,
    metadata?: {
      guru_id?: string;
      mapel_id?: string;
      mapel_nama?: string;
      judul?: string;
      fase?: string;
      tingkat?: number;
      total_alokasi_jp?: number;
    }
  ) {
    if (perangkatId && perangkatId !== 'new') {
      const existing = await prisma.perangkatAjar.findFirst({
        where: { id: perangkatId, tenant_id: tenantId }
      });

      if (existing) {
        const updatePayload: any = {
          konten_struktur_json: kontenJson,
          ...(metadata?.judul ? { judul: metadata.judul } : {})
        };
        if (metadata?.mapel_id) {
          updatePayload.mapel_id = metadata.mapel_id;
        }
        const updated = await prisma.perangkatAjar.update({
          where: { id: perangkatId },
          data: updatePayload
        });

        await cacheInvalidationService.invalidateAcademicCache(tenantId);
        return updated;
      }
    }

    // Auto-resolve Active Tahun & Semester with robust fallback
    let activeTahun = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    if (!activeTahun) {
      activeTahun = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' }
      });
    }

    let activeSem = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    if (!activeSem) {
      activeSem = await prisma.semester.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' }
      });
    }

    let resolvedGuruId = metadata?.guru_id;
    if (!resolvedGuruId) {
      const anyGuru = await prisma.guru.findFirst({
        where: { tenant_id: tenantId }
      });
      resolvedGuruId = anyGuru?.id;
    }

    let resolvedMapelId = metadata?.mapel_id;
    if (!resolvedMapelId && metadata?.mapel_nama) {
      const matchedMapel = await prisma.mapel.findFirst({
        where: {
          tenant_id: tenantId,
          nama_mapel: { contains: metadata.mapel_nama, mode: 'insensitive' }
        }
      });
      if (matchedMapel) resolvedMapelId = matchedMapel.id;
    }

    if (!resolvedMapelId) {
      const anyMapel = await prisma.mapel.findFirst({
        where: { tenant_id: tenantId }
      });
      resolvedMapelId = anyMapel?.id;
    }

    if (!activeTahun?.id || !activeSem?.id || !resolvedGuruId || !resolvedMapelId) {
      throw new Error(`Data master belum lengkap (Tahun: ${activeTahun?.id ? 'OK' : 'KOSONG'}, Semester: ${activeSem?.id ? 'OK' : 'KOSONG'}, Guru: ${resolvedGuruId ? 'OK' : 'KOSONG'}, Mapel: ${resolvedMapelId ? 'OK' : 'KOSONG'})`);
    }

    const created = await prisma.perangkatAjar.create({
      data: {
        tenant_id: tenantId,
        guru_id: resolvedGuruId,
        mapel_id: resolvedMapelId,
        tahun_pelajaran_id: activeTahun.id,
        semester_id: activeSem.id,
        judul: metadata?.judul || 'Modul Ajar Mandiri Guru',
        jenis: 'MODUL_AJAR',
        fase: metadata?.fase || 'E',
        tingkat: metadata?.tingkat || 10,
        total_alokasi_jp: metadata?.total_alokasi_jp || 18,
        konten_struktur_json: kontenJson,
        file_url: 'INTERNAL_DIGITAL_READER',
        status: 'APPROVED'
      }
    });

    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    return created;
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
