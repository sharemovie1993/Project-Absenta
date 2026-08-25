import { prisma } from '@/utils/prisma';


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


  /**
   * Auto-sync siswa biodata ekskul (ekskul_1 & ekskul_2) to AnggotaKegiatanEskul table
   */
  async syncSiswaBiodataEskul(tenantId: string) {
    try {
      const activeTp = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true }
      });
      if (!activeTp) return;

      const eskulMasters = await prisma.jenisKegiatanMaster.findMany({
        where: { tenant_id: tenantId, aktif: true, tipe: { not: 'KBM' } }
      });
      if (eskulMasters.length === 0) return;

      const students = await prisma.siswa.findMany({
        where: {
          tenant_id: tenantId,
          OR: [
            { ekskul_1: { not: null } },
            { ekskul_2: { not: null } },
          ]
        },
        include: {
          SiswaAkademik: {
            where: {
              status: 'AKTIF',
            }
          }
        }
      });

      for (const s of students) {
        const sa = s.SiswaAkademik.find(a => a.tahun_pelajaran_id === activeTp.id) || s.SiswaAkademik[0];
        if (!sa) continue;

        const targetEskulNames = [s.ekskul_1, s.ekskul_2]
          .filter((e): e is string => Boolean(e && e.trim().length > 0))
          .map(e => e.trim().toLowerCase());

        for (const targetName of targetEskulNames) {
          const matchedMaster = eskulMasters.find(m => m.nama.trim().toLowerCase() === targetName);
          if (matchedMaster) {
            await prisma.anggotaKegiatanEskul.upsert({
              where: {
                tenant_id_jenis_kegiatan_id_siswa_akademik_id: {
                  tenant_id: tenantId,
                  jenis_kegiatan_id: matchedMaster.id,
                  siswa_akademik_id: sa.id,
                }
              },
              create: {
                tenant_id: tenantId,
                jenis_kegiatan_id: matchedMaster.id,
                siswa_akademik_id: sa.id,
              },
              update: {}
            });
          }
        }
      }
    } catch (err: any) {
      console.warn('[AutoSync Eskul] Failed syncing biodata eskul:', err.message || err);
    }
  },

  async getMembers(tenantId: string, jenisKegiatanId: string) {
    // Auto-sync any student biodata choices into AnggotaKegiatanEskul table
    await this.syncSiswaBiodataEskul(tenantId);

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
   * Tambah anggota ke eskul (bulk) dengan sinkronisasi dua arah ke biodata siswa
   */
  async addMembers(tenantId: string, jenisKegiatanId: string, siswaAkademikIds: string[]) {
    const master = await prisma.jenisKegiatanMaster.findFirst({
      where: { id: jenisKegiatanId, tenant_id: tenantId }
    });

    // Gunakan upsert untuk menghindari duplikat
    const results = await Promise.allSettled(
      siswaAkademikIds.map(async siswaAkademikId => {
        const res = await prisma.anggotaKegiatanEskul.upsert({
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
        });

        // Sinkronkan ke biodata Siswa.ekskul_1 / Siswa.ekskul_2
        if (master) {
          try {
            const sa = await prisma.siswaAkademik.findUnique({
              where: { id: siswaAkademikId },
              include: { siswa: true }
            });
            if (sa && sa.siswa) {
              const currentSiswa = sa.siswa;
              const eskulName = master.nama;
              if (!currentSiswa.ekskul_1) {
                await prisma.siswa.update({
                  where: { id: currentSiswa.id },
                  data: { ekskul_1: eskulName }
                });
              } else if (!currentSiswa.ekskul_2 && currentSiswa.ekskul_1 !== eskulName) {
                await prisma.siswa.update({
                  where: { id: currentSiswa.id },
                  data: { ekskul_2: eskulName }
                });
              } else if (currentSiswa.ekskul_1 !== eskulName && currentSiswa.ekskul_2 !== eskulName) {
                await prisma.siswa.update({
                  where: { id: currentSiswa.id },
                  data: { ekskul_1: eskulName }
                });
              }
            }
          } catch (syncErr: any) {
            console.warn('[Sync-Add-Member] Failed updating student biodata:', syncErr.message || syncErr);
          }
        }

        return res;
      })
    );

    const added = results.filter(r => r.status === 'fulfilled').length;
    return { added, total: siswaAkademikIds.length };
  },

  /**
   * Hapus anggota dari eskul berdasarkan ID record dan sinkronkan ke biodata siswa
   */
  async removeMember(tenantId: string, anggotaId: string) {
    const existing = await prisma.anggotaKegiatanEskul.findFirst({
      where: { id: anggotaId, tenant_id: tenantId },
      include: {
        JenisKegiatanMaster: true,
        SiswaAkademik: {
          include: { siswa: true }
        }
      }
    });
    if (!existing) throw new Error('Data anggota tidak ditemukan.');

    await prisma.anggotaKegiatanEskul.delete({ where: { id: anggotaId } });

    // Sinkronkan ke biodata Siswa: bersihkan eskul yang dihapus
    if (existing.SiswaAkademik?.siswa && existing.JenisKegiatanMaster) {
      try {
        const currentSiswa = existing.SiswaAkademik.siswa;
        const eskulName = existing.JenisKegiatanMaster.nama;
        const updateData: any = {};
        if (currentSiswa.ekskul_1 === eskulName) {
          updateData.ekskul_1 = currentSiswa.ekskul_2 || null;
          updateData.ekskul_2 = null;
        } else if (currentSiswa.ekskul_2 === eskulName) {
          updateData.ekskul_2 = null;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.siswa.update({
            where: { id: currentSiswa.id },
            data: updateData
          });
        }
      } catch (syncErr: any) {
        console.warn('[Sync-Remove-Member] Failed updating student biodata:', syncErr.message || syncErr);
      }
    }

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
