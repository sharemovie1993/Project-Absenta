import { prisma } from '@/utils/prisma';
import { organizationalContextCache } from '../../auth/services/organizational-context-cache';

export const pembinaKegiatanEskulService = {

  /**
   * Ambil daftar pembina eskul berdasarkan jenis_kegiatan_id
   * Diambil langsung dari tabel OrganizationalAssignment dengan posisi PEMBINA_ESKUL
   */
  async getPembinas(tenantId: string, jenisKegiatanId: string) {
    const isAll = jenisKegiatanId === 'ALL';
    const assigns = await prisma.organizationalAssignment.findMany({
      where: {
        tenant_id: tenantId,
        ...(isAll ? {} : { jenis_kegiatan_id: jenisKegiatanId }),
        Position: {
          code: 'PEMBINA_ESKUL'
        },
        is_active: true
      },
      include: {
        User: {
          include: {
            Guru: {
              select: {
                id: true,
                nip: true,
                nama_guru: true
              }
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
        User: {
          Guru: {
            nama_guru: 'asc'
          }
        }
      }
    });

    return assigns
      .filter((a: any) => a.User?.Guru)
      .map((a: any) => ({
        id: a.id, // ID assignment sebagai ID baris
        guru_id: a.User.Guru.id,
        nip: a.User.Guru.nip ?? '-',
        nama_guru: a.User.Guru.nama_guru,
        eskul_id: a.jenis_kegiatan_id,
        eskul_nama: a.JenisKegiatanMaster?.nama || '-',
        joined_at: a.start_date || a.created_at || new Date(),
      }));
  },

  /**
   * Tambah pembina ke eskul (bulk)
   * Menyimpan langsung ke tabel OrganizationalAssignment
   */
  async addPembinas(tenantId: string, jenisKegiatanId: string, guruIds: string[]) {
    const position = await prisma.organizationalPosition.findFirst({
      where: { tenant_id: tenantId, code: 'PEMBINA_ESKUL' },
      select: { id: true }
    });

    if (!position) {
      throw new Error('Jabatan Pembina Eskul tidak ditemukan.');
    }

    const results = await Promise.allSettled(
      guruIds.map(async (guruId) => {
        const guru = await prisma.guru.findUnique({
          where: { id: guruId },
          select: { user_id: true }
        });
        if (!guru?.user_id) {
          throw new Error('User Guru tidak ditemukan.');
        }

        const res = await prisma.organizationalAssignment.upsert({
          where: {
            user_id_position_id_jenis_kegiatan_id: {
              user_id: guru.user_id,
              position_id: position.id,
              jenis_kegiatan_id: jenisKegiatanId
            }
          },
          create: {
            tenant_id: tenantId,
            position_id: position.id,
            user_id: guru.user_id,
            jenis_kegiatan_id: jenisKegiatanId,
            is_active: true,
            start_date: new Date()
          },
          update: {
            is_active: true,
            end_date: null,
            updated_at: new Date()
          }
        });

        await organizationalContextCache.invalidateUser(String(guru.user_id));
        return res;
      })
    );

    const added = results.filter(r => r.status === 'fulfilled').length;
    return { added, total: guruIds.length };
  },

  /**
   * Hapus pembina dari eskul berdasarkan ID record (yaitu ID OrganizationalAssignment)
   */
  async removePembina(tenantId: string, pembinaId: string) {
    const existing = await prisma.organizationalAssignment.findFirst({
      where: { id: pembinaId, tenant_id: tenantId },
      select: { user_id: true }
    });
    if (!existing) {
      throw new Error('Data pembina tidak ditemukan.');
    }

    await prisma.organizationalAssignment.update({
      where: { id: pembinaId },
      data: {
        is_active: false,
        end_date: new Date(),
        updated_at: new Date()
      }
    });

    await organizationalContextCache.invalidateUser(String(existing.user_id));
    return { success: true };
  },

  /**
   * Ambil list guru aktif untuk picker pembina
   */
  async getGuruList(tenantId: string, search?: string) {
    const rows = await prisma.guru.findMany({
      where: {
        tenant_id: tenantId,
        ...(search ? {
          nama_guru: { contains: search, mode: 'insensitive' }
        } : {})
      },
      select: {
        id: true,
        nip: true,
        nama_guru: true
      },
      orderBy: { nama_guru: 'asc' },
      take: 200
    });
    return rows;
  }
};
