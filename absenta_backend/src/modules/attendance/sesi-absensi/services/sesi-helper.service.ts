import { prisma } from '../../../../utils/prisma';

export class SesiHelperService {
  private static instance: SesiHelperService;

  public static getInstance(): SesiHelperService {
    if (!SesiHelperService.instance) {
      SesiHelperService.instance = new SesiHelperService();
    }
    return SesiHelperService.instance;
  }

  async summaryById(tenantId: string, _org: any, id: string) {
    const sesi = await prisma.sesiAbsensi.findFirst({
      where: { id, tenant_id: tenantId },
      select: {
        id: true,
        kelas_id: true,
        guru_id: true,
        jenis_kegiatan: true,
        status: true,
        waktu_mulai: true,
        waktu_selesai: true,
        Kelas: { select: { nama_kelas: true } },
        Mapel: { select: { nama_mapel: true } },
        Guru: { select: { nama_guru: true } }
      }
    });
    if (!sesi) throw new Error('Sesi tidak ditemukan');

    const totalSiswa = await prisma.siswaAkademik.count({
      where: { kelas_id: sesi.kelas_id }
    });

    const absenList = await prisma.absenSiswa.findMany({
      where: { tenant_id: tenantId, sesi_id: id },
      select: { status: true }
    });

    let hadir = 0;
    let terlambat = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    absenList.forEach(a => {
      if (a.status === 'HADIR') hadir++;
      else if (a.status === 'TERLAMBAT') terlambat++;
      else if (a.status === 'SAKIT') sakit++;
      else if (a.status === 'IZIN') izin++;
      else if (a.status === 'ALPA') alpa++;
    });

    const unrecorded = Math.max(0, totalSiswa - absenList.length);
    alpa += unrecorded;

    const rate = totalSiswa > 0 ? Math.round(((hadir + terlambat) / totalSiswa) * 100) : 0;

    return {
      sesi_id: id,
      kelas: sesi.Kelas?.nama_kelas || '-',
      mapel: sesi.Mapel?.nama_mapel || sesi.jenis_kegiatan,
      guru: sesi.Guru?.nama_guru || '-',
      total_siswa: totalSiswa,
      hadir,
      terlambat,
      sakit,
      izin,
      alpa,
      persentase_kehadiran: rate
    };
  }

  async checkPetugasActive(userId: string, _tenantId: string, org: any) {
    if (org?.tenant_wide === true) return true;

    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true, role_id: true }
    });

    if (user?.role_id) return true;

    const isGuru = await prisma.guru.findFirst({
      where: { user_id: userId },
      select: { id: true }
    });

    return Boolean(isGuru);
  }

  async enrichWithSummary(tenantId: string, sessions: any[]) {
    if (!sessions || sessions.length === 0) return [];

    const sessionIds = sessions.map(s => s.id).filter(Boolean);
    const summaryMap = new Map<string, any>();

    if (sessionIds.length > 0) {
      try {
        const counts = await prisma.absenSiswa.groupBy({
          by: ['sesi_id', 'status'],
          where: { sesi_id: { in: sessionIds }, tenant_id: tenantId },
          _count: { _all: true }
        });
        counts.forEach((c: any) => {
          if (!summaryMap.has(c.sesi_id)) {
            summaryMap.set(c.sesi_id, { total: 0, HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0, TERLAMBAT: 0 });
          }
          const sum = summaryMap.get(c.sesi_id)!;
          const countVal = typeof c._count === 'object' ? (c._count._all || 0) : (c._count || 0);
          sum[c.status] = countVal;
          sum.total = (sum.total || 0) + countVal;
        });
      } catch (err: any) {
        console.warn('[enrichWithSummary] Batch groupBy error:', err?.message);
      }
    }

    return sessions.map(sesi => ({
      ...sesi,
      summary: summaryMap.get(sesi.id) || { total: 0, HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0, TERLAMBAT: 0 }
    }));
  }

  async attachJenisKegiatanMeta(_tenantId: string, sessions: any[]) {
    if (!sessions) return [];
    return sessions.map(s => ({
      ...s,
      meta_jenis: s.jenis_kegiatan || 'KBM'
    }));
  }

  async publishRedisEvent(channel: string, payload: any) {
    console.log(`[Redis Event] Channel: ${channel}`, payload);
  }

  /**
   * ⚖️ Keadilan Presensi KBM:
   * 1. Deteksi Kejadian Khusus Sekolah (Apel Mendadak, Hari Guru, Hujan Lebat) -> Abaikan keterlambatan
   * 2. Deteksi Jadwal Kegiatan Rutin Slot 0 (Upacara, Sholat Dhuha, Senam) dari Visual Builder / JadwalKegiatan -> Jam mulai disesuaikan setelah kegiatan selesai
   * 3. Deteksi Jeda Transisi Guru Molor (Handover Grace Period) -> Hanya berlaku saat guru membuka sesi (skipHandover=false).
   *    TIDAK berlaku untuk tap siswa (skipHandover=true) agar siswa dinilai dari jam jadwal resmi.
   *
   * @param skipHandover - Set true saat dipanggil dari tapSiswa/updateAttendance (penilaian siswa).
   *                       Handover Grace hanya adil untuk guru yang terhalang masuk kelas.
   */
  async resolveEffectiveKbmStartTarget(
    tenantId: string,
    kelasId: string | null | undefined,
    scheduledStart: Date | null,
    currentDate: Date = new Date(),
    options?: { skipHandover?: boolean; skipKegiatanExtension?: boolean; kbmEnd?: Date | null }
  ): Promise<{ effectiveStartTarget: Date | null; isSpecialEventLateIgnored: boolean; isHandoverExtended: boolean; auditNote?: string }> {
    if (!scheduledStart || isNaN(scheduledStart.getTime())) {
      return { effectiveStartTarget: scheduledStart, isSpecialEventLateIgnored: false, isHandoverExtended: false };
    }

    try {
      // 1. Cek Kejadian Khusus (Apel Mendadak/Hujan Lebat)
      const todayStr = currentDate.toISOString().split('T')[0];
      const specialEvent = await prisma.absensiKejadianKhusus.findFirst({
        where: {
          tenant_id: tenantId,
          tanggal: new Date(todayStr),
          abaikan_terlambat: true
        }
      });

      if (specialEvent) {
        return {
          effectiveStartTarget: null, // Abaikan keterlambatan
          isSpecialEventLateIgnored: true,
          isHandoverExtended: false,
          auditNote: `Dispensasi KBM: ${specialEvent.keterangan || 'Kejadian Khusus / Pembiasaan'}`
        };
      }

      // 2. Cek Jadwal Kegiatan Rutin yang BENAR-BENAR BERIRISAN (hanya untuk siswa / jika tidak di-skip)
      // Untuk guru, pengampunan keterlambatan KBM wajib melalui verifikasi kehadiran aktual di kegiatan
      // (checkGuruKegiatanGracePeriod: tap terminal atau selfie kegiatan) agar tidak menjadi celah mangkir.
      const dayIndex = currentDate.getDay();
      const HARI_MAP: Record<number, any> = {
        0: 'MINGGU',
        1: 'SENIN',
        2: 'SELASA',
        3: 'RABU',
        4: 'KAMIS',
        5: 'JUMAT',
        6: 'SABTU'
      };
      const hariEnum = HARI_MAP[dayIndex];

      if (hariEnum && !options?.skipKegiatanExtension) {
        const activeKegiatans = await prisma.jadwalKegiatan.findMany({
          where: {
            tenant_id: tenantId,
            aktif: true,
            berlaku_mulai: { lte: currentDate },
            AND: [
              {
                OR: [
                  { berlaku_sampai: null },
                  { berlaku_sampai: { gte: currentDate } }
                ]
              },
              ...(kelasId ? [{
                OR: [
                  { target_semua_kelas: true },
                  { target_kelas_ids: { has: kelasId } }
                ]
              }] : [])
            ],
            hari: { has: hariEnum },
          },
          orderBy: { waktu_selesai: 'desc' }
        });

        const kbmStartMs = scheduledStart.getTime();
        const kbmEndMs = (options?.kbmEnd && !isNaN(options.kbmEnd.getTime()))
          ? options.kbmEnd.getTime()
          : (kbmStartMs + 90 * 60 * 1000);

        const overlappingKegiatan = activeKegiatans.find((k: any) => {
          if (!k.waktu_selesai || !k.waktu_selesai.includes(':')) return false;
          const kegType = String(k.jenis_kegiatan || '').toUpperCase();
          const kegName = String(k.nama || '');
          // Abaikan Apel Pulang / Apel Sore agar tidak menggeser jam KBM pagi/siang (aware 2 shift)
          if (kegType === 'APEL_SORE' || /pulang|apel\s*sore|apel_sore/i.test(kegName)) return false;

          const [endH, endM] = k.waktu_selesai.split(':').map(Number);
          const kegEnd = new Date(scheduledStart);
          kegEnd.setHours(endH || 0, endM || 0, 0, 0);

          const [startH, startM] = (k.waktu_mulai || '06:00').split(':').map(Number);
          const kegStart = new Date(scheduledStart);
          kegStart.setHours(startH || 0, startM || 0, 0, 0);

          return kegEnd.getTime() > kbmStartMs && kegStart.getTime() < kbmEndMs;
        });

        if (overlappingKegiatan && overlappingKegiatan.waktu_selesai) {
          const [endH, endM] = overlappingKegiatan.waktu_selesai.split(':').map(Number);
          const kegiatanEndTarget = new Date(scheduledStart);
          kegiatanEndTarget.setHours(endH || 0, endM || 0, 0, 0);

          if (kegiatanEndTarget.getTime() > scheduledStart.getTime()) {
            return {
              effectiveStartTarget: kegiatanEndTarget,
              isSpecialEventLateIgnored: false,
              isHandoverExtended: true,
              auditNote: `Kegiatan ${overlappingKegiatan.nama} (s.d ${overlappingKegiatan.waktu_selesai})`
            };
          }
        }
      }

      // 3. Cek Sesi Sebelumnya di Kelas yang Sama (Handover Grace Period)
      //    ⚠️ HANYA berlaku saat guru membuka sesi (skipHandover = false/undefined).
      //    Untuk tapSiswa, handover dilewati agar siswa dinilai dari jam jadwal resmi.
      if (kelasId && !options?.skipHandover) {
        const startOfToday = new Date(currentDate);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(currentDate);
        endOfToday.setHours(23, 59, 59, 999);

        const prevSession = await prisma.sesiAbsensi.findFirst({
          where: {
            tenant_id: tenantId,
            kelas_id: kelasId,
            created_at: { gte: startOfToday, lte: endOfToday },
            waktu_selesai: { not: null }
          },
          orderBy: { waktu_selesai: 'desc' }
        });

        if (prevSession && prevSession.waktu_selesai && prevSession.waktu_selesai.getTime() > scheduledStart.getTime()) {
          const HANDOVER_BUFFER_MS = 5 * 60 * 1000; // 5 Menit Jeda Transisi
          const effectiveStart = new Date(prevSession.waktu_selesai.getTime() + HANDOVER_BUFFER_MS);
          return {
            effectiveStartTarget: effectiveStart,
            isSpecialEventLateIgnored: false,
            isHandoverExtended: true,
            auditNote: `Transisi Guru: Sesi sebelumnya selesai ${prevSession.waktu_selesai.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
          };
        }
      }
    } catch (err: any) {
      console.warn('[resolveEffectiveKbmStartTarget] Warning:', err?.message);
    }

    return {
      effectiveStartTarget: scheduledStart,
      isSpecialEventLateIgnored: false,
      isHandoverExtended: false
    };
  }

  /**
   * 🛡️ Single Source of Truth (SSOT) Pengampunan Keterlambatan Guru via Kehadiran Kegiatan:
   * Mengembalikan { forgiven: true, kegiatanNama } HANYA jika guru benar-benar tercatat HADIR
   * pada sesi kegiatan non-KBM (non-APEL_SORE) hari ini yang waktunya beririsan dengan KBM ini
   * — baik melalui Tap Terminal Unified Kegiatan maupun Selfie Mandiri Kegiatan.
   */
  async checkGuruKegiatanGracePeriod(
    tenantId: string,
    guruId: string,
    kbmStartHHMM: string | null | undefined,
    kbmEndHHMM: string | null | undefined,
    todayDateStr: string,
    tz: string,
    tzOffset: string
  ): Promise<{ forgiven: boolean; kegiatanNama?: string }> {
    try {
      const toMinutes = (hhmm?: string | null) => {
        if (!hhmm || !hhmm.includes(':')) return null;
        const [h, m] = hhmm.split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        return h * 60 + m;
      };
      const formatHHMM = (dt?: Date | null) => {
        if (!dt) return null;
        return new Intl.DateTimeFormat('en-GB', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(dt);
      };

      const kbmStartMin = toMinutes(kbmStartHHMM);
      const kbmEndMin = toMinutes(kbmEndHHMM) ?? (kbmStartMin !== null ? kbmStartMin + 90 : null);
      if (kbmStartMin === null || kbmEndMin === null) {
        return { forgiven: false };
      }

      const startOfDay = new Date(`${todayDateStr}T00:00:00.000${tzOffset}`);
      const endOfDay = new Date(`${todayDateStr}T23:59:59.999${tzOffset}`);

      const kegiatanHadirList = await prisma.absenGuru.findMany({
        where: {
          tenant_id: tenantId,
          guru_id: guruId,
          status: 'HADIR',
          SesiAbsensi: {
            tanggal: { gte: startOfDay, lte: endOfDay },
            jenis_kegiatan: { not: 'KBM' },
          },
        },
        include: {
          SesiAbsensi: {
            select: {
              jenis_kegiatan: true,
              waktu_mulai: true,
              waktu_selesai: true,
              JadwalKegiatan: {
                select: {
                  nama: true,
                  jenis_kegiatan: true,
                  waktu_mulai: true,
                  waktu_selesai: true,
                },
              },
            },
          },
        },
      });

      const overlappingKegiatan = kegiatanHadirList.find((kg) => {
        const s = kg.SesiAbsensi;
        if (!s) return false;
        const kegType = String(s.JadwalKegiatan?.jenis_kegiatan || s.jenis_kegiatan || '').toUpperCase();
        const kegName = String(s.JadwalKegiatan?.nama || s.jenis_kegiatan || '');
        if (kegType === 'APEL_SORE' || /pulang|apel\s*sore|apel_sore/i.test(kegName)) return false;

        const kgStartStr = s.JadwalKegiatan?.waktu_mulai || formatHHMM(s.waktu_mulai) || '06:30';
        const kgEndStr = s.JadwalKegiatan?.waktu_selesai || formatHHMM(s.waktu_selesai) || '08:00';
        const kgStartMin = toMinutes(kgStartStr);
        const kgEndMin = toMinutes(kgEndStr);
        if (kgStartMin === null || kgEndMin === null) return false;
        return Math.max(kgStartMin, kbmStartMin) < Math.min(kgEndMin, kbmEndMin);
      });

      if (overlappingKegiatan) {
        const kgNama = overlappingKegiatan.SesiAbsensi?.JadwalKegiatan?.nama || overlappingKegiatan.SesiAbsensi?.jenis_kegiatan || 'Kegiatan';
        return { forgiven: true, kegiatanNama: kgNama };
      }

      return { forgiven: false };
    } catch (err) {
      console.warn('[SesiHelperService.checkGuruKegiatanGracePeriod] Failed checking:', err);
      return { forgiven: false };
    }
  }
}

export const sesiHelperService = SesiHelperService.getInstance();
