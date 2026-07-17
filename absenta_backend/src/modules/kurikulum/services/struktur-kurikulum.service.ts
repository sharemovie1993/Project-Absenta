import { prisma } from '../../../utils/prisma';

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

    if (existing) {
      return prisma.strukturKurikulum.update({
        where: { id: existing.id },
        data: {
          jp_per_minggu: data.jp_per_minggu,
          kelompok: data.kelompok
        }
      });
    }

    return prisma.strukturKurikulum.create({
      data: {
        tenant_id: tenantId,
        ...data
      }
    });
  }

  static async delete(tenantId: string, id: string) {
    return prisma.strukturKurikulum.deleteMany({
      where: { id, tenant_id: tenantId }
    });
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
    const schedulesCount = await prisma.jadwalTemplate.count({
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
        currentAllocationJp = await prisma.jadwalTemplate.count({
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
}

