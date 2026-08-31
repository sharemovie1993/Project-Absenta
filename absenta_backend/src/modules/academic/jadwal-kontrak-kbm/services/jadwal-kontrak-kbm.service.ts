import { prisma } from '@/utils/prisma';

export interface ListJadwalKontrakKbmFilters {
  tahun_pelajaran_id?: string;
  semester_id?: string;
  kelas_id?: string;
  guru_id?: string;
  mapel_id?: string;
  search?: string;
}

export interface UpdateJadwalKontrakKbmInput {
  guru_id?: string | null;
  mapel_id?: string | null;
  jumlah_kartu?: number;
  durasi_jp?: number;
  total_jp?: number;
  aturan_blok?: string;
  ruangan_id?: string | null;
}

const includeRelations = {
  Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
  Guru: { select: { id: true, nama_guru: true } },
  Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
  TahunPelajaran: { select: { id: true, tahun: true } },
  Semester: { select: { id: true, nama_semester: true } },
  MasterRuangan: { select: { id: true, nama_ruangan: true } },
};

export class JadwalKontrakKbmService {
  async list(tenantId: string, filters: ListJadwalKontrakKbmFilters) {
    const where: any = { tenant_id: tenantId };
    if (filters.tahun_pelajaran_id) where.tahun_pelajaran_id = filters.tahun_pelajaran_id;
    if (filters.semester_id) where.semester_id = filters.semester_id;
    if (filters.kelas_id) where.kelas_id = filters.kelas_id;
    if (filters.guru_id) where.guru_id = filters.guru_id;
    if (filters.mapel_id) where.mapel_id = filters.mapel_id;

    let data = await prisma.jadwalKontrakKbm.findMany({
      where,
      include: includeRelations,
      orderBy: [{ Kelas: { nama_kelas: 'asc' } }, { Mapel: { nama_mapel: 'asc' } }],
    });

    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter(
        (d: any) =>
          d.Guru?.nama_guru?.toLowerCase().includes(q) ||
          d.Mapel?.nama_mapel?.toLowerCase().includes(q) ||
          d.Kelas?.nama_kelas?.toLowerCase().includes(q),
      );
    }

    return data;
  }

  async update(id: string, tenantId: string, input: UpdateJadwalKontrakKbmInput) {
    const record = await prisma.jadwalKontrakKbm.findFirst({ where: { id, tenant_id: tenantId } });
    if (!record) throw new Error('Kontrak KBM tidak ditemukan.');

    return prisma.jadwalKontrakKbm.update({
      where: { id },
      data: {
        guru_id: input.guru_id !== undefined ? input.guru_id : undefined,
        mapel_id: input.mapel_id !== undefined ? input.mapel_id : undefined,
        jumlah_kartu: input.jumlah_kartu,
        durasi_jp: input.durasi_jp,
        total_jp: input.total_jp,
        aturan_blok: input.aturan_blok,
        ruangan_id: input.ruangan_id !== undefined ? input.ruangan_id : undefined,
      },
      include: includeRelations,
    });
  }

  async delete(id: string, tenantId: string) {
    const record = await prisma.jadwalKontrakKbm.findFirst({ where: { id, tenant_id: tenantId } });
    if (!record) throw new Error('Kontrak KBM tidak ditemukan.');
    await prisma.jadwalKontrakKbm.delete({ where: { id } });
    return { success: true };
  }

  async getSummary(tenantId: string, tahun_pelajaran_id?: string, semester_id?: string) {
    const where: any = { tenant_id: tenantId };
    if (tahun_pelajaran_id) where.tahun_pelajaran_id = tahun_pelajaran_id;
    if (semester_id) where.semester_id = semester_id;

    const [total, byKelas, byGuru] = await Promise.all([
      prisma.jadwalKontrakKbm.count({ where }),
      prisma.jadwalKontrakKbm.groupBy({ by: ['kelas_id'], where, _count: { id: true } }),
      prisma.jadwalKontrakKbm.groupBy({ by: ['guru_id'], where, _count: { id: true } }),
    ]);

    return {
      total_kontrak: total,
      total_kelas_terlibat: byKelas.length,
      total_guru_terlibat: byGuru.filter((g: any) => g.guru_id !== null).length,
    };
  }
}

export const jadwalKontrakKbmService = new JadwalKontrakKbmService();
