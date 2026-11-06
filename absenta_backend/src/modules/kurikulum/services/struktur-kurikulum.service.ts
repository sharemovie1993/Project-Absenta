import { prisma } from '../../../utils/prisma';
import { cacheService } from '../../../utils/cache.service';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';
import { CACHE_KEYS } from '../../../constants/cache-keys';

export function calculatePositionEquivalency(code: string = '', name: string = ''): number {
  const upperCode = code.toUpperCase();
  const upperName = name.toUpperCase();

  if (upperCode.includes('WAKA') || upperName.includes('WAKA') || upperName.includes('WAKIL')) {
    return 12;
  }
  if (
    upperCode.includes('KAPROG') || 
    upperName.includes('KAPROG') || 
    upperName.includes('KEPALA PROGRAM') || 
    upperName.includes('KEPALA LAB') || 
    upperName.includes('KEPALA BENGKEL')
  ) {
    return 12;
  }
  if (upperCode.includes('WALI') || upperName.includes('WALI KELAS')) {
    return 2;
  }
  if (upperCode.includes('PIKET') || upperName.includes('PIKET') || upperName.includes('PEMBINA')) {
    return 2;
  }
  return 0;
}

export class StrukturKurikulumService {
  static async getAll(tenantId: string, filter: { tahun_pelajaran_id?: string; tingkat?: number; jurusan_id?: string }) {
    return prisma.strukturKurikulum.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.tahun_pelajaran_id ? { tahun_pelajaran_id: filter.tahun_pelajaran_id } : {}),
        ...(filter.tingkat ? { tingkat: Number(filter.tingkat) } : {}),
        ...(filter.jurusan_id ? {
          OR: [
            { jurusan_id: filter.jurusan_id },
            { jurusan_id: null }
          ]
        } : {}),
      },
      include: {
        Mapel: true,
        Jurusan: true,
        TahunPelajaran: true,
      },
      orderBy: [
        { tingkat: 'asc' },
        { urutan: 'asc' },
        { created_at: 'asc' },
      ],
    });
  }

  static async upsert(tenantId: string, data: {
    mapel_id: string;
    tahun_pelajaran_id: string;
    tingkat: number;
    jurusan_id?: string;
    jp_per_minggu: number;
    kelompok?: string;
  }) {
    // Check if exists to determine whether to update or create
    const existing = await prisma.strukturKurikulum.findFirst({
      where: {
        tenant_id: tenantId,
        mapel_id: data.mapel_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        tingkat: data.tingkat,
        jurusan_id: data.jurusan_id || null,
      }
    });

    let result;
    if (existing) {
      result = await prisma.strukturKurikulum.update({
        where: { id: existing.id },
        data: {
          jp_per_minggu: data.jp_per_minggu,
          kelompok: data.kelompok
        }
      });
    } else {
      result = await prisma.strukturKurikulum.create({
        data: {
          tenant_id: tenantId,
          ...data
        }
      });
    }

    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    await cacheInvalidationService.invalidateBebanGuruCache(tenantId);
    return result;
  }

  static async delete(tenantId: string, id: string) {
    const res = await prisma.strukturKurikulum.deleteMany({
      where: { id, tenant_id: tenantId }
    });
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    await cacheInvalidationService.invalidateBebanGuruCache(tenantId);
    return res;
  }

  static async getByTingkatGrouped(tenantId: string, tahunPelajaranId: string) {
      const all = await this.getAll(tenantId, { tahun_pelajaran_id: tahunPelajaranId });
      
      const grouped: Record<number, any[]> = {};
      all.forEach(item => {
          if (!grouped[item.tingkat]) grouped[item.tingkat] = [];
          grouped[item.tingkat].push(item);
      });
      
      return grouped;
  }

  static async getStandardReferences(jenjang?: string) {
    return prisma.globalKurikulumStandard.findMany({
      where: jenjang ? {
        jenjang: {
          equals: jenjang,
          mode: 'insensitive'
        }
      } : {},
      orderBy: [
        { jenjang: 'asc' },
        { tingkat: 'asc' },
        { nama_mapel: 'asc' }
      ]
    });
  }

  static async createStandardReference(data: {
    jenjang: string;
    category?: string;
    nama_mapel: string;
    kode_mapel: string;
    tingkat: number;
    jp_per_minggu: number;
  }) {
    return prisma.globalKurikulumStandard.create({ data });
  }

  static async updateStandardReference(id: string, data: {
    jenjang?: string;
    category?: string;
    nama_mapel?: string;
    kode_mapel?: string;
    tingkat?: number;
    jp_per_minggu?: number;
  }) {
    return prisma.globalKurikulumStandard.update({
      where: { id },
      data
    });
  }

  static async deleteStandardReference(id: string) {
    return prisma.globalKurikulumStandard.delete({
      where: { id }
    });
  }

  static async checkBebanGuru(tenantId: string, guruId: string, addMapelId?: string, addKelasId?: string) {
    const guru = await prisma.guru.findFirst({
      where: { id: guruId, tenant_id: tenantId },
      select: { max_jp: true, nama_guru: true }
    });

    if (!guru) {
      throw new Error('Guru tidak ditemukan');
    }

    const maxJp = guru.max_jp ?? 24;

    const activeYear = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    if (!activeYear) return { current_jp: 0, max_jp: maxJp, is_exceeded: false, nama_guru: guru.nama_guru };

    const activeSemester = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, tahun_pelajaran_id: activeYear.id, is_active: true }
    });
    if (!activeSemester) return { current_jp: 0, max_jp: maxJp, is_exceeded: false, nama_guru: guru.nama_guru };

    // Count actual scheduled slots for this teacher in the visual grid
    const schedulesCount = await prisma.jadwalKBM.count({
      where: {
        tenant_id: tenantId,
        guru_id: guruId,
        tahun_pelajaran_id: activeYear.id,
        semester_id: activeSemester.id,
        mapel_id: { not: null },
      }
    });

    const totalJp = schedulesCount + 1; // Count plus the one we are placing

    // Class KBM subject allocation check
    let isAllocationExceeded = false;
    let maxAllocationJp = 0;
    let currentAllocationJp = 0;
    let mapelName = '';
    let kelasName = '';

    if (addMapelId && addKelasId) {
      const cls = await prisma.kelas.findFirst({
        where: { id: addKelasId, tenant_id: tenantId },
        select: { tingkat: true, nama_kelas: true }
      });
      const mapel = await prisma.mapel.findFirst({
        where: { id: addMapelId, tenant_id: tenantId },
        select: { nama_mapel: true }
      });

      if (cls && mapel) {
        kelasName = cls.nama_kelas;
        mapelName = mapel.nama_mapel;

        const struct = await prisma.strukturKurikulum.findFirst({
          where: {
            tenant_id: tenantId,
            mapel_id: addMapelId,
            tingkat: cls.tingkat,
            tahun_pelajaran_id: activeYear.id
          },
          select: { jp_per_minggu: true }
        });

        maxAllocationJp = struct?.jp_per_minggu ?? 2; // Default 2 JP if not set in structure

        // Count current slots for this class and subject
        currentAllocationJp = await prisma.jadwalKBM.count({
          where: {
            tenant_id: tenantId,
            kelas_id: addKelasId,
            mapel_id: addMapelId,
            tahun_pelajaran_id: activeYear.id,
            semester_id: activeSemester.id,
          }
        });

        isAllocationExceeded = (currentAllocationJp + 1) > maxAllocationJp;
      }
    }

    return {
      current_jp: totalJp,
      max_jp: maxJp,
      is_exceeded: totalJp > maxJp,
      nama_guru: guru.nama_guru,
      is_allocation_exceeded: isAllocationExceeded,
      current_allocation_jp: currentAllocationJp + 1,
      max_allocation_jp: maxAllocationJp,
      mapel_name: mapelName,
      kelas_name: kelasName
    };
  }

  static async getBebanGuruAll(tenantId: string, tahunPelajaranId?: string, semesterId?: string) {
    const cacheKey = CACHE_KEYS.ACADEMIC.BEBAN_GURU(tenantId, tahunPelajaranId, semesterId);
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const teachers = await prisma.guru.findMany({
      where: {
        tenant_id: tenantId,
        jenis_ptk: 'PENDIDIK'
      },
      select: {
        id: true,
        nama_guru: true,
        nip: true,
        max_jp: true,
        user_id: true,
        User: {
          select: {
            organizationalAssignments: {
              where: { is_active: true },
              select: {
                Position: {
                  select: {
                    id: true,
                    code: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        nama_guru: 'asc'
      }
    });

    const activeYear = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    const activeSemester = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, tahun_pelajaran_id: activeYear?.id, is_active: true }
    });

    const yearId = tahunPelajaranId || activeYear?.id;
    const semId = semesterId || activeSemester?.id;

    const countMap = new Map<string, number>();

    if (yearId && semId) {
      const scheduledCounts = await prisma.jadwalKBM.groupBy({
        by: ['guru_id'],
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: yearId,
          semester_id: semId,
          guru_id: { not: null },
          mapel_id: { not: null }
        },
        _count: {
          _all: true
        }
      });

      scheduledCounts.forEach(c => {
        if (c.guru_id) {
          countMap.set(c.guru_id, c._count._all);
        }
      });
    }

    const result = teachers.map((t: any) => {
      const currentKbmJp = countMap.get(t.id) || 0;
      const maxJp = t.max_jp ?? 24;

      const positions = (t.User?.organizationalAssignments || []).map((oa: any) => {
        const eqJp = calculatePositionEquivalency(oa.Position?.code, oa.Position?.name);
        return {
          id: oa.Position?.id,
          code: oa.Position?.code,
          name: oa.Position?.name,
          ekuivalen_jp: eqJp
        };
      }).filter((p: any) => p.ekuivalen_jp > 0);

      const ekuivalenPositionJp = positions.reduce((acc: number, p: any) => acc + p.ekuivalen_jp, 0);
      const totalCalculatedJp = currentKbmJp + ekuivalenPositionJp;

      return {
        id: t.id,
        nama_guru: t.nama_guru,
        nip: t.nip,
        max_jp: maxJp,
        current_jp: currentKbmJp,
        ekuivalen_position_jp: ekuivalenPositionJp,
        total_calculated_jp: totalCalculatedJp,
        effective_max_kbm_jp: Math.max(0, maxJp - ekuivalenPositionJp),
        is_exceeded: totalCalculatedJp > maxJp,
        positions
      };
    });

    await cacheService.set(cacheKey, result, 300);
    return result;
  }

  static async clone(tenantId: string, payload: { from_tahun_pelajaran_id: string; to_tahun_pelajaran_id: string; overwrite?: boolean }) {
    const { from_tahun_pelajaran_id, to_tahun_pelajaran_id, overwrite = false } = payload;
    if (!from_tahun_pelajaran_id || !to_tahun_pelajaran_id) {
      throw new Error('Tahun pelajaran asal dan tujuan wajib dipilih');
    }
    if (from_tahun_pelajaran_id === to_tahun_pelajaran_id) {
      throw new Error('Tahun pelajaran asal dan tujuan tidak boleh sama');
    }

    const sourceRecords = await prisma.strukturKurikulum.findMany({
      where: { tenant_id: tenantId, tahun_pelajaran_id: from_tahun_pelajaran_id }
    });

    if (!sourceRecords || sourceRecords.length === 0) {
      throw new Error('Tidak ada data struktur kurikulum pada tahun pelajaran asal untuk disalin');
    }

    if (overwrite) {
      await prisma.strukturKurikulum.deleteMany({
        where: { tenant_id: tenantId, tahun_pelajaran_id: to_tahun_pelajaran_id }
      });
    }

    const existingTarget = await prisma.strukturKurikulum.findMany({
      where: { tenant_id: tenantId, tahun_pelajaran_id: to_tahun_pelajaran_id },
      select: { mapel_id: true, tingkat: true, jurusan_id: true }
    });

    const existingSet = new Set(
      existingTarget.map(t => `${t.mapel_id}_${t.tingkat}_${t.jurusan_id || 'null'}`)
    );

    const recordsToCreate = sourceRecords
      .filter(rec => {
        const key = `${rec.mapel_id}_${rec.tingkat}_${rec.jurusan_id || 'null'}`;
        return overwrite || !existingSet.has(key);
      })
      .map(rec => ({
        tenant_id: tenantId,
        mapel_id: rec.mapel_id,
        tahun_pelajaran_id: to_tahun_pelajaran_id,
        tingkat: rec.tingkat,
        jurusan_id: rec.jurusan_id || null,
        jp_per_minggu: rec.jp_per_minggu,
        kelompok: rec.kelompok,
        urutan: (rec as any).urutan ?? 100,
        is_active: (rec as any).is_active ?? true,
      }));

    if (recordsToCreate.length === 0) {
      return { cloned_count: 0, message: 'Seluruh struktur kurikulum sudah ada pada tahun pelajaran tujuan' };
    }

    await prisma.strukturKurikulum.createMany({
      data: recordsToCreate
    });

    return { cloned_count: recordsToCreate.length };
  }

  static async updateOrdering(
    tenantId: string,
    items: Array<{ id: string; urutan: number; kelompok?: string; is_active?: boolean }>
  ) {
    if (!items || items.length === 0) {
      return { count: 0 };
    }

    const updates = items.map(item =>
      prisma.strukturKurikulum.updateMany({
        where: { id: item.id, tenant_id: tenantId },
        data: {
          urutan: item.urutan,
          ...(item.kelompok !== undefined ? { kelompok: item.kelompok } : {}),
          ...(item.is_active !== undefined ? { is_active: item.is_active } : {}),
        }
      })
    );

    await prisma.$transaction(updates);
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    return { success: true, count: items.length };
  }

  static async applyKemendikbudStandard(
    tenantId: string,
    payload: { tahun_pelajaran_id: string; tingkat?: number; preset?: 'modern' | 'legacy' }
  ) {
    const { tahun_pelajaran_id, tingkat, preset } = payload;
    if (!tahun_pelajaran_id) {
      throw new Error('tahun_pelajaran_id wajib diisi');
    }

    const tp = await prisma.tahunPelajaran.findFirst({
      where: { id: tahun_pelajaran_id, tenant_id: tenantId },
    });
    const matchYear = String(tp?.tahun || '').match(/^(\d{4})/);
    const startYear = matchYear ? parseInt(matchYear[1], 10) : 2025;
    const isLegacy = preset === 'legacy' || (preset !== 'modern' && startYear < 2025);

    let records = await prisma.strukturKurikulum.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id,
        ...(tingkat ? { tingkat: Number(tingkat) } : {}),
      },
      include: { Mapel: true },
    });

    // Jika belum ada struktur di periode ini, otomatis generate dari data tahun lain atau master mapel
    if (records.length === 0) {
      const sourceFromOtherYears = await prisma.strukturKurikulum.findMany({
        where: {
          tenant_id: tenantId,
          ...(tingkat ? { tingkat: Number(tingkat) } : {}),
        },
        include: { Mapel: true },
        distinct: ['mapel_id', 'tingkat'],
      });

      if (sourceFromOtherYears.length > 0) {
        await prisma.strukturKurikulum.createMany({
          data: sourceFromOtherYears.map(src => ({
            tenant_id: tenantId,
            mapel_id: src.mapel_id,
            tahun_pelajaran_id,
            tingkat: src.tingkat,
            jurusan_id: src.jurusan_id,
            jp_per_minggu: src.jp_per_minggu || 2,
            kelompok: src.kelompok || (isLegacy ? 'Kelompok Umum' : 'Mata Pelajaran Umum'),
            urutan: (src as any).urutan ?? 100,
            is_active: true,
          })),
        });
      } else {
        const allMapels = await prisma.mapel.findMany({
          where: { tenant_id: tenantId },
        });

        if (allMapels.length === 0) {
          return { count: 0, message: 'Belum ada mata pelajaran terdaftar di sekolah ini' };
        }

        const targetTingkat = tingkat ? Number(tingkat) : 10;
        await prisma.strukturKurikulum.createMany({
          data: allMapels.map(m => ({
            tenant_id: tenantId,
            mapel_id: m.id,
            tahun_pelajaran_id,
            tingkat: targetTingkat,
            jp_per_minggu: 2,
            kelompok: m.kelompok_mapel || (isLegacy ? 'Kelompok Umum' : 'Mata Pelajaran Umum'),
            urutan: 100,
            is_active: true,
          })),
        });
      }

      records = await prisma.strukturKurikulum.findMany({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id,
          ...(tingkat ? { tingkat: Number(tingkat) } : {}),
        },
        include: { Mapel: true },
      });
    }

    const updates = records.map(rec => {
      const mapelName = rec.Mapel?.nama_mapel || '';
      const n = mapelName.toLowerCase().trim();
      const g = (rec.kelompok || rec.Mapel?.kelompok_mapel || '').toLowerCase().trim();

      let targetKelompok = isLegacy ? 'Kelompok Umum' : 'Mata Pelajaran Umum';
      let priority = 90;

      if (isLegacy) {
        // --- ERA 2024/2025 KE BELAKANG: 2 KELOMPOK (KELOMPOK UMUM & KELOMPOK KEJURUAN) ---
        const isKejuruanLegacy =
          g.includes('kejuruan') ||
          g.includes('pilihan') ||
          n.includes('matematika') ||
          n.includes('inggris') ||
          n.includes('informatika') ||
          n.includes('ipas') ||
          (n.includes('alam') && n.includes('sosial')) ||
          n.includes('dasar') ||
          n.includes('konsentrasi') ||
          n.includes('kk ') ||
          n.includes('pkk') ||
          n.includes('kewirausahaan') ||
          n.includes('pkl') ||
          n.includes('pilihan');

        if (isKejuruanLegacy) {
          targetKelompok = 'Kelompok Kejuruan';
          if (n.includes('matematika')) priority = 110;
          else if (n.includes('inggris')) priority = 120;
          else if (n.includes('informatika')) priority = 130;
          else if (n.includes('ipas') || (n.includes('alam') && n.includes('sosial'))) priority = 140;
          else if (n.includes('dasar') || n.includes('ddpk')) priority = 150;
          else if (n.includes('konsentrasi') || n.includes('kk')) priority = 160;
          else if (n.includes('kreatif') || n.includes('pkk') || n.includes('kewirausahaan')) priority = 170;
          else if (n.includes('pkl') || n.includes('praktik kerja')) priority = 180;
          else if (n.includes('pilihan')) priority = 200;
          else priority = 190;
        } else {
          targetKelompok = 'Kelompok Umum';
          if (n.includes('agama') || n.includes('budi pekerti') || n.includes('pai') || n.includes('pak')) priority = 10;
          else if (n.includes('pancasila') || n.includes('ppkn') || n.includes('kewarganegaraan')) priority = 20;
          else if (n.includes('bahasa indonesia') || n === 'indonesia') priority = 30;
          else if (n.includes('jasmani') || n.includes('olahraga') || n.includes('pjok') || n.includes('penjas')) priority = 40;
          else if (n.includes('sejarah')) priority = 50;
          else if (n.includes('seni') || n.includes('budaya') || n.includes('prakarya')) priority = 60;
          else if (n.includes('bimbingan konseling') || n.includes('bk')) priority = 70;
          else if (n.includes('sunda') || n.includes('jawa') || n.includes('daerah')) priority = 80;
          else priority = 90;
        }
      } else {
        // --- ERA 2025/2026 KE ATAS: 4 KELOMPOK (UMUM, KEJURUAN, PILIHAN, MUATAN LOKAL) ---
        if (g.includes('muatan') || g.includes('lokal') || n.includes('sunda') || n.includes('jawa') || n.includes('daerah')) {
          targetKelompok = 'Muatan Lokal';
          priority = 300;
        } else if (n.includes('agama') || n.includes('budi pekerti') || n.includes('pai') || n.includes('pak')) {
          priority = 10;
        } else if (n.includes('pancasila') || n.includes('ppkn') || n.includes('kewarganegaraan')) {
          priority = 20;
        } else if (n.includes('bahasa indonesia') || n === 'indonesia') {
          priority = 30;
        } else if (n.includes('jasmani') || n.includes('olahraga') || n.includes('pjok') || n.includes('penjas')) {
          priority = 40;
        } else if (n.includes('sejarah')) {
          priority = 50;
        } else if (n.includes('seni') || n.includes('budaya') || n.includes('prakarya')) {
          priority = 60;
        } else if (n.includes('bimbingan konseling') || n.includes('bk')) {
          priority = 70;
        } else if (g.includes('pilihan') || n.includes('pilihan')) {
          targetKelompok = 'Mata Pelajaran Pilihan';
          priority = 200;
        } else if (g.includes('kejuruan') || n.includes('matematika') || n.includes('inggris') || n.includes('informatika') || n.includes('ipas') || n.includes('dasar') || n.includes('konsentrasi') || n.includes('kk ') || n.includes('pkk') || n.includes('pkl')) {
          targetKelompok = 'Mata Pelajaran Kejuruan';
          if (n.includes('matematika')) priority = 110;
          else if (n.includes('inggris')) priority = 120;
          else if (n.includes('informatika')) priority = 130;
          else if (n.includes('ipas') || (n.includes('alam') && n.includes('sosial'))) priority = 140;
          else if (n.includes('dasar') || n.includes('ddpk')) priority = 150;
          else if (n.includes('konsentrasi') || n.includes('kk')) priority = 160;
          else if (n.includes('kreatif') || n.includes('pkk') || n.includes('kewirausahaan')) priority = 170;
          else if (n.includes('pkl') || n.includes('praktik kerja')) priority = 180;
          else priority = 190;
        }
      }

      return prisma.strukturKurikulum.update({
        where: { id: rec.id },
        data: {
          urutan: priority,
          kelompok: targetKelompok,
        },
      });
    });

    await prisma.$transaction(updates);
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    const eraLabel = isLegacy ? 'Preset 2 Kelompok (2024/2025 ke belakang)' : 'Preset 4 Kelompok (2025/2026 ke atas)';
    return { success: true, count: updates.length, message: `Berhasil menerapkan urutan standar ${eraLabel} untuk ${updates.length} mapel` };
  }
}

