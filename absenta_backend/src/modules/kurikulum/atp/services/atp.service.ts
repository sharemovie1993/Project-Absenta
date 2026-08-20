import { prisma } from '@/utils/prisma';

export interface CreateTpInput {
  id?: string;
  kode_tp: string;
  judul_materi: string;
  deskripsi_tp: string;
  alokasi_jp?: number;
  urutan?: number;
  is_completed?: boolean;
}

export interface UpsertAtpInput {
  id?: string;
  guru_id: string;
  mapel_id: string;
  tahun_pelajaran_id: string;
  semester_id: string;
  fase: string;
  tingkat?: number;
  nama_atp: string;
  deskripsi?: string;
  total_alokasi_jp?: number;
  status?: string;
  tujuan_pembelajaran: CreateTpInput[];
}

export class AtpService {
  /**
   * Mengambil daftar ATP dengan filter
   */
  async getAtpList(tenantId: string, filters: {
    guruId?: string;
    mapelId?: string;
    tahunPelajaranId?: string;
    semesterId?: string;
    fase?: string;
  }) {
    const where: any = { tenant_id: tenantId };

    if (filters.guruId) where.guru_id = filters.guruId;
    if (filters.mapelId) where.mapel_id = filters.mapelId;
    if (filters.tahunPelajaranId) where.tahun_pelajaran_id = filters.tahunPelajaranId;
    if (filters.semesterId) where.semester_id = filters.semesterId;
    if (filters.fase) where.fase = filters.fase;

    return prisma.alurTujuanPembelajaran.findMany({
      where,
      include: {
        Guru: {
          select: { id: true, nama_guru: true }
        },
        Mapel: {
          select: { id: true, nama_mapel: true, kode_mapel: true }
        },
        TahunPelajaran: {
          select: { id: true, tahun: true, is_active: true }
        },
        Semester: {
          select: { id: true, nama_semester: true, is_active: true }
        },
        TujuanPembelajaran: {
          orderBy: { urutan: 'asc' }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Mengambil detail ATP berdasarkan ID
   */
  async getAtpById(tenantId: string, id: string) {
    const atp = await prisma.alurTujuanPembelajaran.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        Guru: {
          select: { id: true, nama_guru: true }
        },
        Mapel: {
          select: { id: true, nama_mapel: true, kode_mapel: true }
        },
        TahunPelajaran: {
          select: { id: true, tahun: true }
        },
        Semester: {
          select: { id: true, nama_semester: true }
        },
        TujuanPembelajaran: {
          orderBy: { urutan: 'asc' }
        }
      }
    });

    if (!atp) {
      throw new Error('Rencana ATP tidak ditemukan');
    }

    return atp;
  }

  /**
   * Membuat atau memperbarui ATP beserta seluruh Tujuan Pembelajaran (TP)
   */
  async upsertAtp(tenantId: string, input: UpsertAtpInput) {
    const {
      id,
      guru_id,
      mapel_id,
      tahun_pelajaran_id,
      semester_id,
      fase,
      tingkat,
      nama_atp,
      deskripsi,
      total_alokasi_jp = 0,
      status = 'PUBLISHED',
      tujuan_pembelajaran = []
    } = input;

    return prisma.$transaction(async (tx: any) => {
      // Fallback tahun_pelajaran_id & semester_id jika tidak diberikan frontend
      let resolvedTahunId = tahun_pelajaran_id;
      if (!resolvedTahunId) {
        const activeTahun = await tx.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } })
          || await tx.tahunPelajaran.findFirst({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' } });
        resolvedTahunId = activeTahun?.id;
      }

      let resolvedSemesterId = semester_id;
      if (!resolvedSemesterId) {
        const activeSemester = await tx.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } })
          || await tx.semester.findFirst({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' } });
        resolvedSemesterId = activeSemester?.id;
      }

      let targetId = id;
      if (!targetId && resolvedTahunId && resolvedSemesterId) {
        const existing = await tx.alurTujuanPembelajaran.findFirst({
          where: {
            tenant_id: tenantId,
            guru_id,
            mapel_id,
            tahun_pelajaran_id: resolvedTahunId,
            semester_id: resolvedSemesterId,
            fase
          }
        });
        if (existing) targetId = existing.id;
      }

      let atpRecord;

      if (targetId) {
        // Update existing ATP
        atpRecord = await tx.alurTujuanPembelajaran.update({
          where: { id: targetId },
          data: {
            guru_id,
            mapel_id,
            tahun_pelajaran_id: resolvedTahunId,
            semester_id: resolvedSemesterId,
            fase,
            tingkat,
            nama_atp,
            deskripsi,
            total_alokasi_jp,
            status
          }
        });

        // Delete old TPs that are no longer in the list
        await tx.tujuanPembelajaran.deleteMany({
          where: {
            atp_id: targetId,
            tenant_id: tenantId
          }
        });
      } else {
        // Create new ATP
        atpRecord = await tx.alurTujuanPembelajaran.create({
          data: {
            tenant_id: tenantId,
            guru_id,
            mapel_id,
            tahun_pelajaran_id: resolvedTahunId,
            semester_id: resolvedSemesterId,
            fase,
            tingkat,
            nama_atp,
            deskripsi,
            total_alokasi_jp,
            status
          }
        });
      }

      // Re-create all TPs
      if (tujuan_pembelajaran.length > 0) {
        await tx.tujuanPembelajaran.createMany({
          data: tujuan_pembelajaran.map((tp, idx) => ({
            tenant_id: tenantId,
            atp_id: atpRecord.id,
            kode_tp: tp.kode_tp || `TP ${idx + 1}`,
            judul_materi: tp.judul_materi,
            deskripsi_tp: tp.deskripsi_tp || '',
            alokasi_jp: tp.alokasi_jp || 2,
            urutan: typeof tp.urutan === 'number' ? tp.urutan : idx + 1,
            is_completed: Boolean(tp.is_completed)
          }))
        });
      }

      return tx.alurTujuanPembelajaran.findUnique({
        where: { id: atpRecord.id },
        include: {
          TujuanPembelajaran: {
            orderBy: { urutan: 'asc' }
          }
        }
      });
    });
  }

  /**
   * Menghapus ATP beserta seluruh TP di dalamnya
   */
  async deleteAtp(tenantId: string, id: string) {
    const existing = await prisma.alurTujuanPembelajaran.findFirst({
      where: { id, tenant_id: tenantId }
    });

    if (!existing) {
      throw new Error('Rencana ATP tidak ditemukan');
    }

    await prisma.alurTujuanPembelajaran.delete({
      where: { id }
    });

    return { message: 'Alur Tujuan Pembelajaran berhasil dihapus' };
  }

  /**
   * Rekomendasi / Pengambilan Daftar TP Aktif untuk Sesi KBM Harian (1-Klik Jurnal Integration)
   */
  async getActiveTpForSesi(tenantId: string, sesiId: string) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesiId, tenant_id: tenantId },
      include: {
        Kelas: true,
        Mapel: true,
        Guru: true
      }
    });

    if (!sesi || !sesi.guru_id || !sesi.mapel_id) {
      return {
        atp: null,
        tujuan_pembelajaran: []
      };
    }

    // Find published ATP matching guru, mapel, tahun_pelajaran, and semester
    const atp = await prisma.alurTujuanPembelajaran.findFirst({
      where: {
        tenant_id: tenantId,
        guru_id: sesi.guru_id,
        mapel_id: sesi.mapel_id,
        tahun_pelajaran_id: sesi.tahun_pelajaran_id,
        semester_id: sesi.semester_id,
        status: 'PUBLISHED'
      },
      include: {
        TujuanPembelajaran: {
          orderBy: { urutan: 'asc' }
        }
      }
    });

    // If not found with exact semester, fallback to any matching guru + mapel
    if (!atp) {
      const fallbackAtp = await prisma.alurTujuanPembelajaran.findFirst({
        where: {
          tenant_id: tenantId,
          guru_id: sesi.guru_id,
          mapel_id: sesi.mapel_id,
          status: 'PUBLISHED'
        },
        include: {
          TujuanPembelajaran: {
            orderBy: { urutan: 'asc' }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      return {
        atp: fallbackAtp || null,
        tujuan_pembelajaran: fallbackAtp?.TujuanPembelajaran || []
      };
    }

    return {
      atp,
      tujuan_pembelajaran: atp.TujuanPembelajaran || []
    };
  }
}

export const atpService = new AtpService();
