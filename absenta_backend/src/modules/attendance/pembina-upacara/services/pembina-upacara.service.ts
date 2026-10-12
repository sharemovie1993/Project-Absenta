import { prisma } from '@/utils/prisma';
import { DataScope } from '@/middlewares/dataScope';
import { StatusPelaksanaanUpacara } from '@prisma/client';

export interface CreatePembinaUpacaraDto {
  tahun_pelajaran_id: string;
  semester_id?: string | null;
  tanggal: string; // ISO date YYYY-MM-DD
  guru_id: string;
  guru_pengganti_id?: string | null;
  kelas_petugas_id?: string | null;
  jadwal_kegiatan_id?: string | null;
  tema_amanat?: string | null;
  catatan?: string | null;
  status?: StatusPelaksanaanUpacara;
}

export interface AutoGenerateUpacaraDto {
  tahun_pelajaran_id: string;
  semester_id?: string | null;
  tanggal_mulai?: string; // YYYY-MM-DD (default: semester start or today)
  tanggal_selesai?: string; // YYYY-MM-DD (default: semester end or +6 months)
  guru_ids?: string[];
  kelas_ids?: string[];
  rotasi_pairs?: Array<{ guru_id: string; kelas_id?: string | null }>;
  tema_presets?: string[];
}

export const pembinaUpacaraService = {
  async getAll(
    scope: DataScope,
    filters?: {
      tahun_pelajaran_id?: string;
      semester_id?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const tenantId = scope.tenantId;
    const where: any = { tenant_id: tenantId };

    if (filters?.tahun_pelajaran_id) {
      where.tahun_pelajaran_id = filters.tahun_pelajaran_id;
    }
    if (filters?.semester_id) {
      where.semester_id = filters.semester_id;
    }
    if (filters?.startDate || filters?.endDate) {
      where.tanggal = {};
      if (filters.startDate) where.tanggal.gte = new Date(filters.startDate);
      if (filters.endDate) where.tanggal.lte = new Date(filters.endDate);
    }

    return prisma.jadwalPembinaUpacara.findMany({
      where,
      include: {
        GuruUtama: {
          select: {
            id: true,
            nama_guru: true,
            nip: true,
          },
        },
        GuruPengganti: {
          select: {
            id: true,
            nama_guru: true,
            nip: true,
          },
        },
        KelasPetugas: {
          select: {
            id: true,
            nama_kelas: true,
          },
        },
        TahunPelajaran: {
          select: {
            id: true,
            tahun: true,
          },
        },
        Semester: {
          select: {
            id: true,
            nama_semester: true,
          },
        },
      },
      orderBy: {
        tanggal: 'asc',
      },
    });
  },

  async getById(scope: DataScope, id: string) {
    return prisma.jadwalPembinaUpacara.findFirst({
      where: {
        id,
        tenant_id: scope.tenantId,
      },
      include: {
        GuruUtama: true,
        GuruPengganti: true,
        KelasPetugas: true,
        TahunPelajaran: true,
        Semester: true,
      },
    });
  },

  async create(scope: DataScope, data: CreatePembinaUpacaraDto, userId?: string) {
    const dateObj = new Date(data.tanggal);

    return prisma.jadwalPembinaUpacara.create({
      data: {
        tenant_id: scope.tenantId,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id || null,
        tanggal: dateObj,
        guru_id: data.guru_id,
        guru_pengganti_id: data.guru_pengganti_id || null,
        kelas_petugas_id: data.kelas_petugas_id || null,
        jadwal_kegiatan_id: data.jadwal_kegiatan_id || null,
        tema_amanat: data.tema_amanat || null,
        catatan: data.catatan || null,
        status: data.status || StatusPelaksanaanUpacara.DIJADWALKAN,
        created_by: userId || null,
      },
      include: {
        GuruUtama: {
          select: { id: true, nama_guru: true, nip: true },
        },
        GuruPengganti: {
          select: { id: true, nama_guru: true, nip: true },
        },
        KelasPetugas: {
          select: { id: true, nama_kelas: true },
        },
      },
    });
  },

  async update(scope: DataScope, id: string, data: Partial<CreatePembinaUpacaraDto>) {
    const existing = await prisma.jadwalPembinaUpacara.findFirst({
      where: { id, tenant_id: scope.tenantId },
    });
    if (!existing) throw new Error('Jadwal pembina upacara tidak ditemukan');

    const updateData: any = { ...data };
    if (data.tanggal) {
      updateData.tanggal = new Date(data.tanggal);
    }

    return prisma.jadwalPembinaUpacara.update({
      where: { id },
      data: updateData,
      include: {
        GuruUtama: {
          select: { id: true, nama_guru: true, nip: true },
        },
        GuruPengganti: {
          select: { id: true, nama_guru: true, nip: true },
        },
        KelasPetugas: {
          select: { id: true, nama_kelas: true },
        },
      },
    });
  },

  async delete(scope: DataScope, id: string) {
    const existing = await prisma.jadwalPembinaUpacara.findFirst({
      where: { id, tenant_id: scope.tenantId },
    });
    if (!existing) throw new Error('Jadwal pembina upacara tidak ditemukan');

    return prisma.jadwalPembinaUpacara.delete({
      where: { id },
    });
  },

  async autoGenerate(scope: DataScope, dto: AutoGenerateUpacaraDto, userId?: string) {
    const hasPairs = dto.rotasi_pairs && dto.rotasi_pairs.length > 0;
    const hasGurus = dto.guru_ids && dto.guru_ids.length > 0;

    if (!hasPairs && !hasGurus) {
      throw new Error('Daftar guru pembina atau rotasi wali kelas tidak boleh kosong.');
    }

    // Tentukan rentang tanggal
    let start = dto.tanggal_mulai ? new Date(dto.tanggal_mulai) : new Date();
    let end: Date;

    if (dto.tanggal_selesai) {
      end = new Date(dto.tanggal_selesai);
    } else {
      // Default rentang 1 semester (sekitar 22 minggu)
      end = new Date(start);
      end.setMonth(end.getMonth() + 5);
    }

    // Kumpulkan seluruh hari Senin dalam rentang
    const mondays: Date[] = [];
    const current = new Date(start);
    // Normalisasi jam
    current.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      if (current.getDay() === 1) { // 1 = Senin
        mondays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    if (mondays.length === 0) {
      throw new Error('Tidak ditemukan hari Senin dalam rentang tanggal yang dipilih.');
    }

    // Ambil slot JadwalKegiatan Upacara jika ada
    const masterUpacara = await prisma.jadwalKegiatan.findFirst({
      where: {
        tenant_id: scope.tenantId,
        nama: { contains: 'Upacara', mode: 'insensitive' },
        aktif: true,
      },
    });

    const results = [];
    for (let i = 0; i < mondays.length; i++) {
      const tgl = mondays[i];
      let guruId: string;
      let kelasId: string | null = null;

      if (hasPairs) {
        const pair = dto.rotasi_pairs![i % dto.rotasi_pairs!.length];
        guruId = pair.guru_id;
        kelasId = pair.kelas_id || null;
      } else {
        guruId = dto.guru_ids![i % dto.guru_ids!.length];
        kelasId = dto.kelas_ids && dto.kelas_ids.length > 0
          ? dto.kelas_ids[i % dto.kelas_ids.length]
          : null;
      }

      const tema = dto.tema_presets && dto.tema_presets.length > 0
        ? dto.tema_presets[i % dto.tema_presets.length]
        : null;

      const record = await prisma.jadwalPembinaUpacara.upsert({
        where: {
          tenant_id_tanggal: {
            tenant_id: scope.tenantId,
            tanggal: tgl,
          },
        },
        update: {
          tahun_pelajaran_id: dto.tahun_pelajaran_id,
          semester_id: dto.semester_id || null,
          guru_id: guruId,
          kelas_petugas_id: kelasId,
          tema_amanat: tema,
          jadwal_kegiatan_id: masterUpacara?.id || null,
        },
        create: {
          tenant_id: scope.tenantId,
          tahun_pelajaran_id: dto.tahun_pelajaran_id,
          semester_id: dto.semester_id || null,
          tanggal: tgl,
          guru_id: guruId,
          kelas_petugas_id: kelasId,
          tema_amanat: tema,
          jadwal_kegiatan_id: masterUpacara?.id || null,
          status: StatusPelaksanaanUpacara.DIJADWALKAN,
          created_by: userId || null,
        },
        include: {
          GuruUtama: { select: { id: true, nama_guru: true, nip: true } },
          KelasPetugas: { select: { id: true, nama_kelas: true } },
        },
      });

      results.push(record);
    }

    return {
      count: results.length,
      items: results,
    };
  },
};
