import { prisma } from '../../../../utils/prisma';
import { cacheService } from '../../../../utils/cache.service';
import { cacheInvalidationService } from '../../../../utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../../constants/cache-keys';

export class PiketService {
  /**
   * 1. Buat Izin Keluar Baru
   */
  async createIzin(tenantId: string, data: {
    siswa_akademik_id: string;
    guru_piket_id?: string;
    alasan: string;
    tipe_izin: string;
    status?: string;
    jam_keluar: Date;
  }) {
    let academicId = data.siswa_akademik_id;

    // Robust resolution: Check if the provided ID is a valid SiswaAkademik ID
    const exists = await prisma.siswaAkademik.findUnique({
      where: { id: academicId }
    });

    if (!exists) {
      // Treat as base Siswa ID and look up active SiswaAkademik mapping for this student
      const sa = await prisma.siswaAkademik.findFirst({
        where: {
          siswa_id: academicId,
          status: 'AKTIF'
        }
      });

      if (!sa) {
        throw new Error('Siswa tidak memiliki data akademik yang aktif pada tahun ajaran/semester ini');
      }
      academicId = sa.id;
    }

    const res = await prisma.izinKeluarSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_akademik_id: academicId,
        guru_piket_id: data.guru_piket_id,
        alasan: data.alasan,
        tipe_izin: data.tipe_izin || 'IZIN_KELUAR',
        jam_keluar: data.jam_keluar,
        status: data.status || 'DISETUJUI'
      },
      include: {
        SiswaAkademik: {
          include: {
            siswa: { select: { nama_siswa: true, nis: true, no_hp: true } },
            kelas: { select: { nama_kelas: true } }
          }
        },
        GuruPiket: { select: { nama_guru: true } }
      }
    });

    // Real-time Sync to Sesi KBM
    void this.syncIzinToSesiKbm(tenantId, academicId, res);

    // Invalidate piket and attendance cache
    void cacheInvalidationService.invalidatePiketCache(tenantId);

    return res;
  }

  /**
   * Helper Private Method: Sync Izin Piket ke Absensi Sesi KBM
   */
  private async syncIzinToSesiKbm(tenantId: string, siswaAkademikId: string, izin: any) {
    try {
      const now = new Date(izin.jam_keluar || new Date());
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const sa = await prisma.siswaAkademik.findUnique({
        where: { id: siswaAkademikId },
        select: { id: true, siswa_id: true, kelas_id: true }
      });
      if (!sa?.kelas_id) return;

      const sessions = await prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          kelas_id: sa.kelas_id,
          tanggal: { gte: startOfDay, lte: endOfDay }
        },
        select: { id: true, waktu_mulai: true, waktu_selesai: true, status: true, kelas_id: true, tahun_pelajaran_id: true }
      });

      if (sessions.length === 0) return;

      const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      if (izin.tipe_izin === 'PULANG_AWAL') {
        for (const sesi of sessions) {
          const cat = `[PIKET - PULANG AWAL ${jamStr}] ${izin.alasan || ''}`;
          await prisma.absenSiswa.upsert({
            where: {
              sesi_id_siswa_akademik_id: {
                sesi_id: sesi.id,
                siswa_akademik_id: siswaAkademikId,
              }
            },
            update: {
              status: 'IZIN',
              catatan: cat,
              poin_kehadiran: 2,
            },
            create: {
              tenant_id: tenantId,
              sesi_id: sesi.id,
              siswa_akademik_id: siswaAkademikId,
              siswa_id: sa.siswa_id,
              status: 'IZIN',
              catatan: cat,
              poin_kehadiran: 2,
              kelas_id_snapshot: sesi.kelas_id,
              tahun_pelajaran_id_snapshot: sesi.tahun_pelajaran_id,
            }
          });
        }
      } else if (izin.tipe_izin === 'DISPENSASI') {
        for (const sesi of sessions) {
          const cat = `[PIKET - DISPENSASI] ${izin.alasan || ''}`;
          await prisma.absenSiswa.upsert({
            where: {
              sesi_id_siswa_akademik_id: {
                sesi_id: sesi.id,
                siswa_akademik_id: siswaAkademikId,
              }
            },
            update: {
              status: 'DISPEN',
              catatan: cat,
              poin_kehadiran: 2,
            },
            create: {
              tenant_id: tenantId,
              sesi_id: sesi.id,
              siswa_akademik_id: siswaAkademikId,
              siswa_id: sa.siswa_id,
              status: 'DISPEN',
              catatan: cat,
              poin_kehadiran: 2,
              kelas_id_snapshot: sesi.kelas_id,
              tahun_pelajaran_id_snapshot: sesi.tahun_pelajaran_id,
            }
          });
        }
      } else if (izin.tipe_izin === 'IZIN_KELUAR') {
        const activeSesi = sessions.find(s => {
          if (s.waktu_mulai <= now && (!s.waktu_selesai || s.waktu_selesai >= now)) return true;
          return s.status === 'BERLANGSUNG';
        }) || sessions[0];

        if (activeSesi) {
          const cat = `[IZIN SEMENTARA ${jamStr}] ${izin.alasan || ''}`;
          const existingAbsen = await prisma.absenSiswa.findUnique({
            where: {
              sesi_id_siswa_akademik_id: {
                sesi_id: activeSesi.id,
                siswa_akademik_id: siswaAkademikId,
              }
            }
          });

          if (existingAbsen) {
            await prisma.absenSiswa.update({
              where: { id_created_at: { id: existingAbsen.id, created_at: existingAbsen.created_at } },
              data: {
                catatan: existingAbsen.catatan ? `${existingAbsen.catatan} | ${cat}` : cat,
              }
            });
          } else {
            await prisma.absenSiswa.create({
              data: {
                tenant_id: tenantId,
                sesi_id: activeSesi.id,
                siswa_akademik_id: siswaAkademikId,
                siswa_id: sa.siswa_id,
                status: 'HADIR',
                catatan: cat,
                poin_kehadiran: 10,
                kelas_id_snapshot: activeSesi.kelas_id,
                tahun_pelajaran_id_snapshot: activeSesi.tahun_pelajaran_id,
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('Error syncing Izin to Sesi KBM:', err);
    }
  }

  /**
   * 2. Catat Siswa Kembali
   */
  async catatKembali(tenantId: string, id: string) {
    const res = await prisma.izinKeluarSiswa.update({
      where: { id, tenant_id: tenantId },
      data: {
        status: 'KEMBALI',
        jam_kembali: new Date()
      }
    });

    // Invalidate piket cache
    void cacheInvalidationService.invalidatePiketCache(tenantId);

    return res;
  }

  /**
   * 3. Get Izin Harian (Monitoring)
   */
  async getIzinHarian(tenantId: string, date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = CACHE_KEYS.KESISWAAN.PIKET_HARIAN(tenantId, dateStr);

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return await prisma.izinKeluarSiswa.findMany({
          where: {
            tenant_id: tenantId,
            jam_keluar: { gte: startOfDay, lte: endOfDay }
          },
          include: {
            SiswaAkademik: {
              include: {
                siswa: { 
                  select: { 
                    id: true,
                    nama_siswa: true, 
                    nis: true, 
                    no_hp: true,
                    nama_ayah: true,
                    nama_ibu: true
                  } 
                },
                kelas: { select: { nama_kelas: true } }
              }
            },
            GuruPiket: { select: { nama_guru: true } }
          },
          orderBy: { jam_keluar: 'desc' }
        });
      },
      CACHE_TTL.DASHBOARD
    );
  }

  /**
   * 3.5. Get Izin Range (Untuk Laporan Kustom / Filter)
   */
  async getIzinRange(tenantId: string, startDateStr: string, endDateStr: string) {
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    return await prisma.izinKeluarSiswa.findMany({
      where: {
        tenant_id: tenantId,
        jam_keluar: { gte: start, lte: end }
      },
      include: {
        SiswaAkademik: {
          include: {
            siswa: { 
              select: { 
                id: true,
                nama_siswa: true, 
                nis: true, 
                no_hp: true 
              } 
            },
            kelas: { select: { nama_kelas: true } }
          }
        },
        GuruPiket: { select: { nama_guru: true } }
      },
      orderBy: { jam_keluar: 'desc' }
    });
  }

  /**
   * 4. Batalkan Izin
   */
  async deleteIzin(tenantId: string, id: string) {
    const res = await prisma.izinKeluarSiswa.delete({
      where: { id, tenant_id: tenantId }
    });

    // Invalidate piket cache
    void cacheInvalidationService.invalidatePiketCache(tenantId);

  }
}

