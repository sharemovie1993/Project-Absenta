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
      orderBy: {
        tingkat: 'asc',
      },
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
    return result;
  }

  static async delete(tenantId: string, id: string) {
    const res = await prisma.strukturKurikulum.deleteMany({
      where: { id, tenant_id: tenantId }
    });
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
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
        kelompok: rec.kelompok
      }));

    if (recordsToCreate.length === 0) {
      return { cloned_count: 0, message: 'Seluruh struktur kurikulum sudah ada pada tahun pelajaran tujuan' };
    }

    await prisma.strukturKurikulum.createMany({
      data: recordsToCreate
    });

    return { cloned_count: recordsToCreate.length };
  }
}

