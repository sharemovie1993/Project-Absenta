import { prisma } from '../../../../utils/prisma';

export class SesiCloseNotifyService {
  private static instance: SesiCloseNotifyService;

  public static getInstance(): SesiCloseNotifyService {
    if (!SesiCloseNotifyService.instance) {
      SesiCloseNotifyService.instance = new SesiCloseNotifyService();
    }
    return SesiCloseNotifyService.instance;
  }

  async upsertProgresMateri(tenantId: string, _org: any, sesiId: string, payload: any) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesiId, tenant_id: tenantId }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    const judul = payload.judul_materi || payload.materiPokok || 'Materi KBM';
    const deskripsi = payload.deskripsi || payload.capaianPembelajaran || null;
    const pencapaian = payload.pencapaian_persen !== undefined ? Number(payload.pencapaian_persen) : 0;
    const kendala = payload.kendala || payload.catatanKelas || null;

    const [progres] = await prisma.$transaction([
      prisma.progresMateri.upsert({
        where: { sesi_id: sesiId },
        create: {
          tenant_id: tenantId,
          sesi_id: sesiId,
          judul_materi: judul,
          deskripsi: deskripsi,
          pencapaian_persen: pencapaian,
          kendala: kendala,
        },
        update: {
          judul_materi: judul,
          deskripsi: deskripsi,
          pencapaian_persen: pencapaian,
          kendala: kendala,
        }
      }),
      prisma.sesiAbsensi.update({
        where: { id: sesiId },
        data: {
          updated_at: new Date()
        }
      })
    ]);

    return progres;
  }

  async handleSessionClose(tenantId: string, sesiId: string, _sesi: any) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesiId, tenant_id: tenantId },
      select: { id: true, kelas_id: true, guru_id: true, tahun_pelajaran_id: true, semester_id: true }
    });
    if (!sesi) return;

    const saWhere: any = {
      kelas_id: sesi.kelas_id,
      status: 'AKTIF',
      siswa: {
        status: 'AKTIF'
      }
    };
    if (sesi.tahun_pelajaran_id && sesi.tahun_pelajaran_id !== 'default-tp') {
      saWhere.tahun_pelajaran_id = sesi.tahun_pelajaran_id;
    }
    if (sesi.semester_id && sesi.semester_id !== 'default-sem') {
      saWhere.semester_id = sesi.semester_id;
    }

    let rawSiswaList = await prisma.siswaAkademik.findMany({
      where: saWhere,
      select: { id: true, siswa_id: true }
    });

    if (rawSiswaList.length === 0) {
      rawSiswaList = await prisma.siswaAkademik.findMany({
        where: { 
          kelas_id: sesi.kelas_id, 
          status: 'AKTIF',
          siswa: {
            status: 'AKTIF'
          }
        },
        select: { id: true, siswa_id: true }
      });
    }

    // Deduplicate by siswa_id to prevent multi-year/historical profiles from inflating class size
    const uniqueMap = new Map<string, typeof rawSiswaList[0]>();
    rawSiswaList.forEach(s => {
      if (s.siswa_id && !uniqueMap.has(s.siswa_id)) {
        uniqueMap.set(s.siswa_id, s);
      }
    });
    const siswaList = Array.from(uniqueMap.values());

    const existingAbsen = await prisma.absenSiswa.findMany({
      where: { tenant_id: tenantId, sesi_id: sesiId },
      select: { siswa_akademik_id: true }
    });

    const recordedSet = new Set(existingAbsen.map(a => a.siswa_akademik_id));
    const missingSiswa = siswaList.filter(s => !recordedSet.has(s.id));

    if (missingSiswa.length > 0) {
      await prisma.absenSiswa.createMany({
        data: missingSiswa.map(s => ({
          tenant_id: tenantId,
          sesi_id: sesiId,
          siswa_akademik_id: s.id,
          status: 'ALPA',
          is_terlambat: false,
          poin_kehadiran: 0,
          catatan: 'Auto-marked ALPA on session close'
        }))
      });
    }

    // Update AbsenGuru jika belum hadir — HANYA JIKA GURU BERSTATUS AKTIF!
    if (sesi.guru_id) {
      const guru = await prisma.guru.findFirst({
        where: { id: sesi.guru_id, tenant_id: tenantId },
        select: { id: true, User: { select: { status: true } } }
      });
      const isGuruActive = !guru?.User || guru.User.status === 'ACTIVE';
      if (isGuruActive) {
        await prisma.absenGuru.updateMany({
          where: { 
            sesi_id: sesiId, 
            status: { in: ['Belum Hadir', 'BELUM_HADIR'] } 
          },
          data: { status: 'ALPA' }
        });
      }
    }
  }

  async finalizeSessionAndNotify(tenantId: string, sesiId: string) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id: sesiId, tenant_id: tenantId },
      select: {
        id: true,
        kelas_id: true,
        jenis_kegiatan: true,
        Mapel: { select: { nama_mapel: true } }
      }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    await this.handleSessionClose(tenantId, sesiId, sesi);

    const alpaSiswa = await prisma.absenSiswa.findMany({
      where: { tenant_id: tenantId, sesi_id: sesiId, status: 'ALPA' },
      select: {
        SiswaAkademik: {
          select: {
            siswa: { select: { nama_siswa: true, no_hp: true } }
          }
        }
      }
    });

    return {
      success: true,
      message: `Session finalized. ${alpaSiswa.length} student(s) auto-marked as ALPA and queued for notification.`,
      notified_count: alpaSiswa.length
    };
  }
}

export const sesiCloseNotifyService = SesiCloseNotifyService.getInstance();
