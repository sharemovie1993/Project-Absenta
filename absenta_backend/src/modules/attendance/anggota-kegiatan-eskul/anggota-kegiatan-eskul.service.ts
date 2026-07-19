import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const anggotaKegiatanEskulService = {

  /**
   * Ambil daftar siswa akademik aktif untuk digunakan sebagai picker tambah anggota.
   * Filter berdasarkan tahun_pelajaran aktif saja.
   */
  async getSiswaAkademikList(tenantId: string, search?: string, kelasId?: string) {
    const activeTp = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });
    if (!activeTp) return [];

    const siswaFilter: any = { tenant_id: tenantId };
    if (search) {
      siswaFilter.OR = [
        { nama_siswa: { contains: search, mode: 'insensitive' } },
        { nis: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rows = await prisma.siswaAkademik.findMany({
      where: {
        siswa: siswaFilter,
        tahun_pelajaran_id: activeTp.id,
        status: 'AKTIF' as any,
        ...(kelasId ? { kelas_id: kelasId } : {}),
      },
      include: {
        siswa: { select: { id: true, nis: true, nama_siswa: true } },
        kelas: { select: { id: true, nama_kelas: true } }
      },
      orderBy: { siswa: { nama_siswa: 'asc' } },
      take: 200
    });

    return rows.map(r => ({
      siswa_akademik_id: r.id,
      siswa_id: r.siswa_id,
      nis: r.siswa.nis,
      nama_siswa: r.siswa.nama_siswa,
      kelas: r.kelas?.nama_kelas ?? '-',
      kelas_id: r.kelas_id,
    }));
  },


  async getMembers(tenantId: string, jenisKegiatanId: string) {
    const isAll = jenisKegiatanId === 'ALL';
    const members = await prisma.anggotaKegiatanEskul.findMany({
      where: {
        tenant_id: tenantId,
        ...(isAll ? {} : { jenis_kegiatan_id: jenisKegiatanId }),
      },
      include: {
        SiswaAkademik: {
          include: {
            siswa: {
              select: {
                id: true,
                nis: true,
                nama_siswa: true,
              }
            },
            kelas: {
              select: { id: true, nama_kelas: true }
            }
          }
        },
        JenisKegiatanMaster: {
          select: {
            id: true,
            nama: true,
          }
        }
      },
      orderBy: {
        SiswaAkademik: {
          siswa: { nama_siswa: 'asc' }
        }
      }
    });

    return members.map(m => ({
      id: m.id,
      siswa_akademik_id: m.siswa_akademik_id,
      nis: m.SiswaAkademik.siswa.nis,
      nama_siswa: m.SiswaAkademik.siswa.nama_siswa,
      kelas: m.SiswaAkademik.kelas?.nama_kelas || '-',
      kelas_id: m.SiswaAkademik.kelas_id,
      eskul_id: m.jenis_kegiatan_id,
      eskul_nama: m.JenisKegiatanMaster?.nama || '-',
      joined_at: m.created_at,
    }));
  },

  /**
   * Tambah anggota ke eskul (bulk)
   */
  async addMembers(tenantId: string, jenisKegiatanId: string, siswaAkademikIds: string[]) {
    // Gunakan upsert untuk menghindari duplikat
    const results = await Promise.allSettled(
      siswaAkademikIds.map(siswaAkademikId =>
        prisma.anggotaKegiatanEskul.upsert({
          where: {
            tenant_id_jenis_kegiatan_id_siswa_akademik_id: {
              tenant_id: tenantId,
              jenis_kegiatan_id: jenisKegiatanId,
              siswa_akademik_id: siswaAkademikId,
            }
          },
          create: {
            tenant_id: tenantId,
            jenis_kegiatan_id: jenisKegiatanId,
            siswa_akademik_id: siswaAkademikId,
          },
          update: {} // no-op
        })
      )
    );

    const added = results.filter(r => r.status === 'fulfilled').length;
    return { added, total: siswaAkademikIds.length };
  },

  /**
   * Hapus anggota dari eskul berdasarkan ID record
   */
  async removeMember(tenantId: string, anggotaId: string) {
    const existing = await prisma.anggotaKegiatanEskul.findFirst({
      where: { id: anggotaId, tenant_id: tenantId }
    });
    if (!existing) throw new Error('Data anggota tidak ditemukan.');
    await prisma.anggotaKegiatanEskul.delete({ where: { id: anggotaId } });
    return { success: true };
  },

  /**
   * Cek apakah siswa terdaftar sebagai anggota eskul (digunakan oleh sesi.service)
   */
  async getMemberSiswaAkademikIds(tenantId: string, jenisKegiatanId: string): Promise<string[]> {
    const rows = await prisma.anggotaKegiatanEskul.findMany({
      where: { tenant_id: tenantId, jenis_kegiatan_id: jenisKegiatanId },
      select: { siswa_akademik_id: true }
    });
    return rows.map(r => r.siswa_akademik_id);
  }
};
