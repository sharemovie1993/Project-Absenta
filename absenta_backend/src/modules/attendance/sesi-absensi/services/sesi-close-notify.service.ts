import { prisma } from '../../../../utils/prisma';
import { getTenantTimezone, getTenantOffsetString } from '../../../../utils/timezone.utils';
import { getRedisConnection } from '@/queue/redis';

export class SesiCloseNotifyService {
  private static instance: SesiCloseNotifyService;

  public static getInstance(): SesiCloseNotifyService {
    if (!SesiCloseNotifyService.instance) {
      SesiCloseNotifyService.instance = new SesiCloseNotifyService();
    }
    return SesiCloseNotifyService.instance;
  }

  async upsertProgresMateri(tenantId: string, _org: any, sesiId: string, payload: any) {
    let sesi: any = await prisma.sesiAbsensi.findFirst({
      where: { id: sesiId, tenant_id: tenantId }
    });

    // Konsolidasi Jadwal Virtual (sched_...): Auto-materialize SesiAbsensi saat Guru mengisi Jurnal / Ruang KBM Daring
    if (!sesi && typeof sesiId === 'string' && (sesiId.startsWith('sched_') || sesiId.startsWith('sched-'))) {
      const cleanJadwalId = sesiId.replace(/^(sched-hist-|sched_|sched-)/, '');
      const jadwal = await prisma.jadwalKBM.findFirst({
        where: { id: cleanJadwalId, tenant_id: tenantId }
      });

      if (jadwal) {
        const tz = await getTenantTimezone(tenantId);
        const tzOffset = getTenantOffsetString(tz);
        const targetDateStr = payload.tanggal || new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
        const startOfDay = new Date(`${targetDateStr}T00:00:00.000${tzOffset}`);
        const endOfDay = new Date(`${targetDateStr}T23:59:59.999${tzOffset}`);

        const existingForJadwal = await prisma.sesiAbsensi.findFirst({
          where: {
            tenant_id: tenantId,
            jadwal_kbm_id: jadwal.id,
            tanggal: { gte: startOfDay, lte: endOfDay }
          }
        });

        if (existingForJadwal) {
          sesi = existingForJadwal;
        } else {
          const jamMulaiStr = jadwal.jam_mulai || '07:00';
          const jamSelesaiStr = jadwal.jam_selesai || '08:30';
          const waktuMulai = new Date(`${targetDateStr}T${jamMulaiStr.length === 5 ? `${jamMulaiStr}:00` : jamMulaiStr}.000${tzOffset}`);
          const waktuSelesai = new Date(`${targetDateStr}T${jamSelesaiStr.length === 5 ? `${jamSelesaiStr}:00` : jamSelesaiStr}.000${tzOffset}`);

          sesi = await prisma.sesiAbsensi.create({
            data: {
              tenant_id: tenantId,
              jadwal_kbm_id: jadwal.id,
              unit_pengajaran_id: (jadwal as any).unit_pengajaran_id || null,
              kelas_id: jadwal.kelas_id,
              mapel_id: jadwal.mapel_id,
              guru_id: jadwal.guru_id,
              guru_pelaksana_id: (jadwal as any).guru_pelaksana_id || null,
              is_delegasi: Boolean((jadwal as any).guru_pelaksana_id),
              semester_id: jadwal.semester_id,
              tahun_pelajaran_id: jadwal.tahun_pelajaran_id,
              tanggal: startOfDay,
              waktu_mulai: waktuMulai,
              waktu_selesai: waktuSelesai,
              jenis_kegiatan: jadwal.jenis_kegiatan || 'KBM',
              status: 'BERLANGSUNG',
              sumber_sesi: 'TEMPLATE',
              keterangan: '[DIBUKA_GURU] KBM Daring / Jurnal'
            }
          });
        }
      }
    }

    if (!sesi) throw new Error('Sesi tidak ditemukan');
    const resolvedSesiId = sesi.id;

    const judul = payload.judul_materi || payload.materiPokok || 'Materi KBM';
    const deskripsi = payload.deskripsi || payload.capaianPembelajaran || null;
    const pencapaian = payload.pencapaian_persen !== undefined ? Number(payload.pencapaian_persen) : 0;
    const kendala = payload.kendala || payload.catatanKelas || null;

    const modePelaksanaan = payload.mode_pelaksanaan || 'TATAP_MUKA';
    const perangkatAjarId = payload.perangkat_ajar_id !== undefined ? (payload.perangkat_ajar_id || null) : undefined;
    const instruksiTugas = payload.instruksi_tugas !== undefined ? (payload.instruksi_tugas || null) : undefined;
    const fileTugasUrl = payload.file_tugas_url !== undefined ? (payload.file_tugas_url || null) : undefined;
    const referensiJson = payload.referensi_json !== undefined ? payload.referensi_json : undefined;
    const isDaring = modePelaksanaan === 'DARING_LIVE' || modePelaksanaan === 'DARING_TUGAS';
    const meetingRoomId = payload.meeting_room_id || (isDaring ? `kbm-sesi-${resolvedSesiId}` : null);

    const extraData: any = {
      mode_pelaksanaan: modePelaksanaan,
    };
    if (perangkatAjarId !== undefined) extraData.perangkat_ajar_id = perangkatAjarId;
    if (instruksiTugas !== undefined) extraData.instruksi_tugas = instruksiTugas;
    if (fileTugasUrl !== undefined) extraData.file_tugas_url = fileTugasUrl;
    if (referensiJson !== undefined) extraData.referensi_json = referensiJson;
    if (meetingRoomId) extraData.meeting_room_id = meetingRoomId;

    const nextSesiStatus = sesi.status === 'MENDATANG' ? 'BERLANGSUNG' : sesi.status;

    const [progres] = await prisma.$transaction([
      prisma.progresMateri.upsert({
        where: { sesi_id: resolvedSesiId },
        create: {
          tenant_id: tenantId,
          sesi_id: resolvedSesiId,
          judul_materi: judul,
          deskripsi: deskripsi,
          pencapaian_persen: pencapaian,
          kendala: kendala,
          ...extraData,
        },
        update: {
          judul_materi: judul,
          deskripsi: deskripsi,
          pencapaian_persen: pencapaian,
          kendala: kendala,
          ...extraData,
        }
      }),
      prisma.sesiAbsensi.update({
        where: { id: resolvedSesiId },
        data: {
          status: nextSesiStatus,
          updated_at: new Date()
        }
      })
    ]);

    // Auto-record AbsenGuru = HADIR jika guru mengisi Ruang KBM Daring / Tugas / Jurnal dan belum tercatat hadir
    const effectiveGuruId = sesi.guru_pelaksana_id || sesi.guru_id;
    if (effectiveGuruId && (isDaring || Boolean(instruksiTugas) || Boolean(perangkatAjarId))) {
      const existingGuruAbsen = await prisma.absenGuru.findFirst({
        where: { tenant_id: tenantId, sesi_id: resolvedSesiId, guru_id: effectiveGuruId }
      });

      if (!existingGuruAbsen || existingGuruAbsen.status === 'BELUM_HADIR' || existingGuruAbsen.status === 'Belum Hadir' || existingGuruAbsen.status === 'ALPA') {
        const now = new Date();
        const catatanDaring = modePelaksanaan === 'DARING_LIVE'
          ? '[KBM DARING LIVE] Guru membuka ruang kelas virtual & materi'
          : '[KBM DARING / TUGAS] Guru menyematkan modul & penugasan';

        if (existingGuruAbsen) {
          await prisma.absenGuru.update({
            where: { id: existingGuruAbsen.id },
            data: {
              status: 'HADIR',
              waktu_tap: existingGuruAbsen.waktu_tap || now,
              is_terlambat: false,
              menit_keterlambatan: 0,
              catatan: catatanDaring,
              updated_at: now
            }
          });
        } else {
          await prisma.absenGuru.create({
            data: {
              tenant_id: tenantId,
              sesi_id: resolvedSesiId,
              guru_id: effectiveGuruId,
              status: 'HADIR',
              waktu_tap: now,
              is_terlambat: false,
              menit_keterlambatan: 0,
              catatan: catatanDaring,
              tahun_pelajaran_id: sesi.tahun_pelajaran_id || 'default-tp',
              semester_id: sesi.semester_id || 'default-sem'
            }
          });
        }
      }
    }

    // Broadcast real-time update ke Monitoring Pimpinan & Dashboard Siswa
    try {
      const redis = getRedisConnection();
      const evt = JSON.stringify({
        tenant_id: tenantId,
        sesi_id: resolvedSesiId,
        guru_id: effectiveGuruId,
        mode_pelaksanaan: modePelaksanaan,
        updated_at: new Date().toISOString()
      });
      await redis.publish('events:sesi_status_update', evt);
      await redis.publish('events:absen_guru_update', evt);
      await redis.publish('events:session_attendance_update', evt);
    } catch (_) {}

    return { ...progres, resolved_sesi_id: resolvedSesiId };
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
