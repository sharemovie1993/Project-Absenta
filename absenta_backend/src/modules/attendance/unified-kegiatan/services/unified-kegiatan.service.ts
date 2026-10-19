import { prisma } from '@/utils/prisma';
import { Hari } from '@prisma/client';
import { getTenantTimezone, getTenantOffsetString } from '@/utils/timezone.utils';

export interface UnifiedTapPayload {
  guru_id: string;
  sesi_id?: string;
  status: 'HADIR' | 'IZIN' | 'SAKIT' | 'DINAS_LUAR' | 'ALPA';
  catatan?: string;
  jenis_kegiatan?: string;
  jadwal_kegiatan_id?: string;
}

export interface UnifiedRfidTapPayload {
  rfid_token: string;
  sesi_id?: string;
  jenis_kegiatan?: string;
  jadwal_kegiatan_id?: string;
}

export class UnifiedKegiatanService {
  private static instance: UnifiedKegiatanService;

  public static getInstance(): UnifiedKegiatanService {
    if (!UnifiedKegiatanService.instance) {
      UnifiedKegiatanService.instance = new UnifiedKegiatanService();
    }
    return UnifiedKegiatanService.instance;
  }

  /**
   * Helper: Dapatkan tanggal YYYY-MM-DD hari ini
   */
  public getTodayDateStr(): string {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  /**
   * Helper: Dapatkan enum Hari Prisma dari string tanggal (YYYY-MM-DD)
   */
  public getHariEnum(dateStr?: string): Hari {
    const d = dateStr ? new Date(dateStr) : new Date();
    const dayIndex = d.getDay();
    const map: Record<number, Hari> = {
      0: 'MINGGU',
      1: 'SENIN',
      2: 'SELASA',
      3: 'RABU',
      4: 'KAMIS',
      5: 'JUMAT',
      6: 'SABTU',
    };
    return map[dayIndex] || 'SENIN';
  }

  /**
   * Helper: Cek apakah 2 rentang waktu [startA, endA] dan [startB, endB] beririsan (overlap)
   */
  private isTimeOverlapping(startA?: string | null, endA?: string | null, startB?: string | null, endB?: string | null): boolean {
    if (!startA || !startB) return true; // Fallback jika jam tidak diset, asumsikan potensi irisan
    const sA = startA.length === 5 ? startA : startA.slice(0, 5);
    const eA = endA ? (endA.length === 5 ? endA : endA.slice(0, 5)) : '23:59';
    const sB = startB.length === 5 ? startB : startB.slice(0, 5);
    const eB = endB ? (endB.length === 5 ? endB : endB.slice(0, 5)) : '23:59';

    return sA < eB && eA > sB;
  }

  /**
   * 1. Guard Status: Cek ketersediaan Jadwal Kegiatan aktif sesuai jenisnya (default: KETARUNAAN)
   */
  async getGuardStatus(tenantId: string, jenisKegiatan: string = 'KETARUNAAN') {
    // 1. Prioritaskan jadwal yang berstatus aktif
    let jadwal = await prisma.jadwalKegiatan.findFirst({
      where: {
        tenant_id: tenantId,
        aktif: true,
        OR: [
          { nama: { contains: jenisKegiatan, mode: 'insensitive' } },
          { jenis_kegiatan: { contains: jenisKegiatan, mode: 'insensitive' } },
        ],
      },
      orderBy: { updated_at: 'desc' },
    });

    // 2. Jika tidak ada yang aktif, cari record terakhir yang pernah dibuat untuk tenant ini
    if (!jadwal) {
      jadwal = await prisma.jadwalKegiatan.findFirst({
        where: {
          tenant_id: tenantId,
          OR: [
            { nama: { contains: jenisKegiatan, mode: 'insensitive' } },
            { jenis_kegiatan: { contains: jenisKegiatan, mode: 'insensitive' } },
          ],
        },
        orderBy: { updated_at: 'desc' },
      });
    }

    if (!jadwal) {
      return {
        is_active: false,
        jadwal_kegiatan_id: null,
        jadwal_nama: null,
        jadwal_waktu_mulai: null,
        jadwal_waktu_selesai: null,
        hari_aktif: [],
      };
    }

    const hariAktifList = Array.isArray(jadwal.hari) ? (jadwal.hari as string[]) : [];
    const todayHari = this.getHariEnum();
    const isTodayScheduledDay = hariAktifList.length > 0 ? hariAktifList.includes(todayHari) : true;

    // Hitung waktu sekarang WIB (HH:mm)
    const now = new Date();
    const wibNow = new Date(now.getTime() + 7 * 3600 * 1000);
    const currentHours = String(wibNow.getUTCHours()).padStart(2, '0');
    const currentMinutes = String(wibNow.getUTCMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    let isWithinTimeWindow = false;
    if (jadwal.waktu_mulai && jadwal.waktu_selesai) {
      const s = jadwal.waktu_mulai.slice(0, 5);
      const e = jadwal.waktu_selesai.slice(0, 5);
      isWithinTimeWindow = currentTimeStr >= s && currentTimeStr <= e;
    }

    return {
      is_active: Boolean(jadwal.aktif),
      jadwal_kegiatan_id: jadwal.id,
      jadwal_nama: jadwal.nama,
      jadwal_waktu_mulai: jadwal.waktu_mulai,
      jadwal_waktu_selesai: jadwal.waktu_selesai,
      hari_aktif: hariAktifList,
      today_hari: todayHari,
      is_today_scheduled_day: isTodayScheduledDay,
      is_within_time_window: isWithinTimeWindow,
      current_time: currentTimeStr,
    };
  }

  /**
   * Helper: Dapatkan rentang UTC untuk tanggal tertentu agar mencakup timezone WIB/WITA/WIT
   */
  public getDateRange(dateStr?: string): { gte: Date; lte: Date } {
    const dStr = dateStr || this.getTodayDateStr();
    const base = new Date(dStr + 'T00:00:00.000Z');
    const gte = new Date(base.getTime() - 14 * 3600 * 1000);
    const lte = new Date(base.getTime() + 24 * 3600 * 1000);
    return { gte, lte };
  }

  /**
   * 2. Sesi Hari Ini: Ambil SesiAbsensi kegiatan pada tanggal tertentu
   */
  async getSesiHariIni(tenantId: string, params?: { tanggal?: string; jadwal_kegiatan_id?: string; jenis_kegiatan?: string }) {
    const dateRange = this.getDateRange(params?.tanggal);
    const jenis = params?.jenis_kegiatan || 'KETARUNAAN';

    let whereClause: any = {
      tenant_id: tenantId,
      tanggal: {
        gte: dateRange.gte,
        lte: dateRange.lte,
      },
    };

    if (params?.jadwal_kegiatan_id) {
      whereClause.jadwal_kegiatan_id = params.jadwal_kegiatan_id;
    } else {
      whereClause.OR = [
        { jenis_kegiatan: { contains: jenis, mode: 'insensitive' } },
        { JadwalKegiatan: { nama: { contains: jenis, mode: 'insensitive' } } },
      ];
    }

    const sesi = await prisma.sesiAbsensi.findFirst({
      where: whereClause,
      include: {
        _count: {
          select: {
            AbsenSiswa: true,
            AbsenGuru: true,
          },
        },
      },
      orderBy: { waktu_mulai: 'asc' },
    });

    if (!sesi) return null;

    const hadirSiswa = await prisma.absenSiswa.count({
      where: { sesi_id: sesi.id, status: 'HADIR' },
    });

    const hadirGuru = await prisma.absenGuru.count({
      where: { sesi_id: sesi.id, status: 'HADIR' },
    });

    return {
      id: sesi.id,
      tanggal: sesi.tanggal.toISOString().split('T')[0],
      jenis_kegiatan: sesi.jenis_kegiatan,
      jadwal_kegiatan_id: sesi.jadwal_kegiatan_id,
      waktu_mulai: sesi.waktu_mulai ? sesi.waktu_mulai.toTimeString().slice(0, 5) : '07:00',
      waktu_selesai: sesi.waktu_selesai ? sesi.waktu_selesai.toTimeString().slice(0, 5) : null,
      status: sesi.status,
      hadir_siswa: hadirSiswa,
      total_siswa: sesi._count.AbsenSiswa,
      hadir_guru: hadirGuru,
      total_guru: sesi._count.AbsenGuru,
    };
  }

  /**
   * 3. Pendamping & Unsur Beririsan: Ambil daftar seluruh unsur pendamping & status tap hari ini
   */
  async getPendamping(tenantId: string, params: { tanggal?: string; sesi_id?: string; jadwal_kegiatan_id?: string; jenis_kegiatan?: string }) {
    const targetDateStr = params.tanggal || this.getTodayDateStr();
    const hariEnum = this.getHariEnum(targetDateStr);
    const jenis = params.jenis_kegiatan || 'KETARUNAAN';

    // Ambil jadwalKegiatan untuk tahu hari dan jam resmi
    let jadwalKegiatan = null;
    if (params.jadwal_kegiatan_id) {
      jadwalKegiatan = await prisma.jadwalKegiatan.findUnique({
        where: { id: params.jadwal_kegiatan_id },
      });
    }
    if (!jadwalKegiatan) {
      jadwalKegiatan = await prisma.jadwalKegiatan.findFirst({
        where: {
          tenant_id: tenantId,
          aktif: true,
          OR: [
            { nama: { contains: jenis, mode: 'insensitive' } },
            { jenis_kegiatan: { contains: jenis, mode: 'insensitive' } },
          ],
        },
      });
    }

    const hariAktifList = Array.isArray(jadwalKegiatan?.hari) ? (jadwalKegiatan.hari as string[]) : [];
    const todayHari = this.getHariEnum();
    const isTodayScheduledDay = hariAktifList.length > 0 ? hariAktifList.includes(todayHari) : true;

    // Tentukan hari query KBM:
    // Jika params.tanggal diberikan (melihat tanggal spesifik), gunakan hari dari tanggal itu.
    // Jika tidak diberikan dan hari ini bukan hari jadwal, gunakan hari jadwal utama (misal JUMAT) sebagai preview!
    let kbmHariQuery: Hari = hariEnum;
    if (!params.tanggal && !isTodayScheduledDay && hariAktifList.length > 0) {
      kbmHariQuery = hariAktifList[0] as Hari;
    }

    // Cari atau pastikan sesi kegiatan
    let sesiId = params.sesi_id;
    let kegiatanWaktuMulai = jadwalKegiatan?.waktu_mulai || '06:30';
    let kegiatanWaktuSelesai = jadwalKegiatan?.waktu_selesai || '08:00';

    if (!sesiId) {
      const sesi = await this.getSesiHariIni(tenantId, { tanggal: targetDateStr, jadwal_kegiatan_id: params.jadwal_kegiatan_id, jenis_kegiatan: jenis });
      sesiId = sesi?.id;
      if (sesi?.waktu_mulai) kegiatanWaktuMulai = sesi.waktu_mulai;
      if (sesi?.waktu_selesai) kegiatanWaktuSelesai = sesi.waktu_selesai;
    } else {
      const existingSesi = await prisma.sesiAbsensi.findUnique({
        where: { id: sesiId },
        include: { JadwalKegiatan: true }
      });
      if (existingSesi?.JadwalKegiatan) {
        kegiatanWaktuMulai = existingSesi.JadwalKegiatan.waktu_mulai || kegiatanWaktuMulai;
        kegiatanWaktuSelesai = existingSesi.JadwalKegiatan.waktu_selesai || kegiatanWaktuSelesai;
      }
    }

    // Ambil struktur penugasan kepanitiaan (Ketua Pembina Taruna, Pembina Rohis, Kaprog, Wali Kelas, Pembina OSIS)
    const positions = await prisma.organizationalPosition.findMany({
      where: {
        tenant_id: tenantId,
        code: { in: ['KETUA_PEMBINA_TARUNA', 'PEMBINA_ROHIS', 'KAPROG', 'WALIKELAS', 'PEMBINA_ESKUL'] },
        is_active: true,
      },
      include: {
        organizationalAssigns: {
          where: { is_active: true },
          include: {
            User: { include: { Guru: true } },
            Kelas: { select: { nama_kelas: true } },
            Unit: { select: { nama: true } },
          },
        },
      },
    });

    // Ambil status presensi AbsenGuru yang sudah tercatat di sesi Kegiatan hari ini
    const existingAbsen = sesiId
      ? await prisma.absenGuru.findMany({
          where: { sesi_id: sesiId },
        })
      : [];
    const absenMap = new Map(existingAbsen.map(a => [a.guru_id, a]));

    const result: Array<{
      guru_id: string;
      nama_guru: string;
      jabatan: string;
      jabatan_kode: string;
      kelas_nama?: string;
      mapel_nama?: string;
      jam_kbm?: string;
      status: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA' | 'BELUM_TAP';
      waktu_tap?: string | null;
      catatan?: string | null;
      sesi_id?: string | null;
      is_overlapping_kbm?: boolean;
      kbm_sesi_id?: string | null;
      kbm_status?: string | null;
    }> = [];

    const seenGuruIds = new Set<string>();

    // 1. Pembina Khusus (Taruna / Rohis)
    const tarunaPos = positions.find(p => p.code === 'KETUA_PEMBINA_TARUNA');
    if (tarunaPos && tarunaPos.organizationalAssigns.length > 0) {
      tarunaPos.organizationalAssigns.forEach((a, idx) => {
        const g = a.User?.Guru;
        if (g && !seenGuruIds.has(g.id)) {
          seenGuruIds.add(g.id);
          const rec = absenMap.get(g.id);
          result.push({
            guru_id: g.id,
            nama_guru: g.nama_guru,
            jabatan: idx === 0 ? '🎖️ Ketua Pembina Taruna' : `Staf Pembina ${idx}`,
            jabatan_kode: 'KETUA_PEMBINA_TARUNA',
            status: (rec?.status as any) || 'BELUM_TAP',
            waktu_tap: rec?.waktu_tap ? rec.waktu_tap.toISOString() : null,
            catatan: rec?.catatan || null,
            sesi_id: sesiId || null,
          });
        }
      });
    }

    // 2. Kaprog (Kepala Program Keahlian / Jurusan)
    const kaprogPos = positions.find(p => p.code === 'KAPROG');
    if (kaprogPos) {
      kaprogPos.organizationalAssigns.forEach(a => {
        const g = a.User?.Guru;
        if (g && !seenGuruIds.has(g.id)) {
          seenGuruIds.add(g.id);
          const rec = absenMap.get(g.id);
          result.push({
            guru_id: g.id,
            nama_guru: g.nama_guru,
            jabatan: `🏛️ Kaprog ${a.Unit?.nama || ''}`,
            jabatan_kode: 'KAPROG',
            status: (rec?.status as any) || 'BELUM_TAP',
            waktu_tap: rec?.waktu_tap ? rec.waktu_tap.toISOString() : null,
            catatan: rec?.catatan || null,
            sesi_id: sesiId || null,
          });
        }
      });
    }

    // 3. Wali Kelas
    const waliPos = positions.find(p => p.code === 'WALIKELAS');
    if (waliPos) {
      waliPos.organizationalAssigns.forEach(a => {
        const g = a.User?.Guru;
        if (g && !seenGuruIds.has(g.id)) {
          seenGuruIds.add(g.id);
          const rec = absenMap.get(g.id);
          result.push({
            guru_id: g.id,
            nama_guru: g.nama_guru,
            jabatan: `🏫 Wali Kelas ${a.Kelas?.nama_kelas || ''}`,
            jabatan_kode: 'WALIKELAS',
            kelas_nama: a.Kelas?.nama_kelas || undefined,
            status: (rec?.status as any) || 'BELUM_TAP',
            waktu_tap: rec?.waktu_tap ? rec.waktu_tap.toISOString() : null,
            catatan: rec?.catatan || null,
            sesi_id: sesiId || null,
          });
        }
      });
    }

    // 4. Guru Mapel KBM yang Jadwalnya BERIRISAN Jam dengan Kegiatan
    const allKbmHariIni = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        hari: kbmHariQuery,
        guru_id: { not: null },
      },
      include: {
        Guru: { select: { id: true, nama_guru: true } },
        Kelas: { select: { id: true, nama_kelas: true } },
        Mapel: { select: { id: true, nama_mapel: true } },
      },
    });

    // Ambil sesi KBM fisik yang sudah ada hari ini untuk mengetahui status live (MENDATANG / BERLANGSUNG)
    const kbmSesiHariIni = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: new Date(targetDateStr),
        jenis_kegiatan: 'KBM',
      },
      select: {
        id: true,
        jadwal_kbm_id: true,
        guru_id: true,
        status: true,
      }
    });
    const kbmSesiMap = new Map(kbmSesiHariIni.map(s => [`${s.jadwal_kbm_id}_${s.guru_id}`, s]));

    allKbmHariIni.forEach((kbm: any) => {
      // Periksa irisan waktu secara presisi
      const isOverlapping = this.isTimeOverlapping(kegiatanWaktuMulai, kegiatanWaktuSelesai, kbm.jam_mulai, kbm.jam_selesai);
      
      if (isOverlapping && kbm.Guru) {
        const liveKbmSesi = kbmSesiMap.get(`${kbm.id}_${kbm.Guru.id}`);
        const rec = absenMap.get(kbm.Guru.id);

        if (!seenGuruIds.has(kbm.Guru.id)) {
          seenGuruIds.add(kbm.Guru.id);
          result.push({
            guru_id: kbm.Guru.id,
            nama_guru: kbm.Guru.nama_guru,
            jabatan: `📚 Guru Mapel (${kbm.Mapel?.nama_mapel || 'KBM'})`,
            jabatan_kode: 'GURU_MAPEL',
            kelas_nama: kbm.Kelas?.nama_kelas || undefined,
            mapel_nama: kbm.Mapel?.nama_mapel || undefined,
            jam_kbm: `${kbm.jam_mulai || '07:15'} - ${kbm.jam_selesai || '11:05'}`,
            status: (rec?.status as any) || 'BELUM_TAP',
            waktu_tap: rec?.waktu_tap ? rec.waktu_tap.toISOString() : null,
            catatan: rec?.catatan || null,
            sesi_id: sesiId || null,
            is_overlapping_kbm: true,
            kbm_sesi_id: liveKbmSesi?.id || null,
            kbm_status: liveKbmSesi?.status || 'MENDATANG',
          });
        }
      }
    });

    return {
      data: result,
      sesi_id: sesiId || null,
      is_today_scheduled_day: isTodayScheduledDay,
      schedule_day_used: kbmHariQuery,
      today_hari: todayHari,
      is_active_session: Boolean(sesiId),
    };
  }

  /**
   * 4. Tap Pendamping: 1 Tap ➔ 2 Record Murni (Sesi Kegiatan & Sesi KBM Reguler yang Beririsan)
   * 
   * SAFEGUARD:
   * Hanya guru yang benar-benar di-tap HADIR yang dibuka sesi KBM-nya.
   * Guru yang belum tap / tidak hadir TIDAK di-generate sesi hadir palsu.
   */
  async tapPendamping(tenantId: string, payload: UnifiedTapPayload) {
    const now = new Date();
    const todayStr = this.getTodayDateStr();
    const hariEnum = this.getHariEnum(todayStr);

    let parentSesi: any = null;
    if (payload.sesi_id) {
      parentSesi = await prisma.sesiAbsensi.findUnique({
        where: { id: payload.sesi_id },
        include: {
          JadwalKegiatan: true,
        },
      });
    }

    if (!parentSesi) {
      // Cari sesi kegiatan yang aktif hari ini (dinamis sesuai jenis kegiatan)
      const jenisTarget = payload.jenis_kegiatan || 'KETARUNAAN';
      const sesiToday = await this.getSesiHariIni(tenantId, {
        tanggal: todayStr,
        jenis_kegiatan: jenisTarget,
        jadwal_kegiatan_id: payload.jadwal_kegiatan_id,
      });
      if (sesiToday?.id) {
        payload.sesi_id = sesiToday.id;
        parentSesi = await prisma.sesiAbsensi.findUnique({
          where: { id: sesiToday.id },
          include: {
            JadwalKegiatan: true,
          },
        });
      }
    }

    if (!parentSesi) {
      throw new Error('Sesi kegiatan hari ini belum dimulai atau tidak ditemukan');
    }

    const namaKegiatan = parentSesi.JadwalKegiatan?.nama || parentSesi.jenis_kegiatan || 'Kegiatan Pembiasaan';
    const activeSesiId = parentSesi.id;

    // 1. Catat murni di AbsenGuru milik Sesi Kegiatan
    await prisma.absenGuru.upsert({
      where: {
        sesi_id_guru_id: {
          sesi_id: activeSesiId,
          guru_id: payload.guru_id,
        },
      },
      update: {
        status: payload.status,
        waktu_tap: payload.status === 'HADIR' ? now : undefined,
        catatan: payload.catatan || `Hadir via Terminal Kegiatan (${namaKegiatan})`,
        updated_at: now,
      },
      create: {
        tenant_id: tenantId,
        sesi_id: activeSesiId,
        guru_id: payload.guru_id,
        status: payload.status,
        waktu_tap: payload.status === 'HADIR' ? now : undefined,
        catatan: payload.catatan || `Hadir via Terminal Kegiatan (${namaKegiatan})`,
        tahun_pelajaran_id: parentSesi.tahun_pelajaran_id,
        semester_id: parentSesi.semester_id,
        created_at: now,
        updated_at: now,
      },
    });

    // 2. Eksekusi 1 Tap 2 Record HANYA jika guru berstatus HADIR
    let syncedKbm = false;
    let kbmSesiId: string | undefined;

    if (payload.status === 'HADIR') {
      const kegiatanMulai = parentSesi.JadwalKegiatan?.waktu_mulai || '06:30';
      const kegiatanSelesai = parentSesi.JadwalKegiatan?.waktu_selesai || '08:00';

      // Cari jadwal KBM guru hari ini
      const overlappingKbms = await prisma.jadwalKBM.findMany({
        where: {
          tenant_id: tenantId,
          guru_id: payload.guru_id,
          hari: hariEnum,
        },
      });

      // Filter jadwal yang bersinggungan jam
      const overlappingKbm = overlappingKbms.find((kbm) =>
        this.isTimeOverlapping(kegiatanMulai, kegiatanSelesai, kbm.jam_mulai, kbm.jam_selesai)
      );

      if (overlappingKbm) {
        // Multi-JP Slot Resolution: Cari seluruh slot berurutan untuk kelas, guru, mapel ini
        const relatedSlots = await prisma.jadwalKBM.findMany({
          where: {
            tenant_id: tenantId,
            kelas_id: overlappingKbm.kelas_id,
            guru_id: overlappingKbm.guru_id,
            mapel_id: overlappingKbm.mapel_id,
            hari: hariEnum,
          },
          orderBy: { slot_index: 'asc' },
        });

        // Bentuk grup slot yang contiguous / berurutan (gap antar-slot <= 35 menit)
        const groups: (typeof relatedSlots)[] = [];
        let currentGroup: typeof relatedSlots = [];

        for (const slot of relatedSlots) {
          if (currentGroup.length === 0) {
            currentGroup.push(slot);
          } else {
            const prev = currentGroup[currentGroup.length - 1];
            const isConsecutiveSlot = (slot.slot_index !== undefined && prev.slot_index !== undefined && slot.slot_index === prev.slot_index + 1);

            const [prevH, prevM] = (prev.jam_selesai || '').split(':').map(Number);
            const [currH, currM] = (slot.jam_mulai || '').split(':').map(Number);
            const prevMins = (prevH || 0) * 60 + (prevM || 0);
            const currMins = (currH || 0) * 60 + (currM || 0);
            const gap = currMins - prevMins;

            if (isConsecutiveSlot || (gap >= 0 && gap <= 35)) {
              currentGroup.push(slot);
            } else {
              groups.push(currentGroup);
              currentGroup = [slot];
            }
          }
        }
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }

        const activeGroup = groups.find(g => g.some(s => s.id === overlappingKbm.id)) || [overlappingKbm];
        const firstSlot = activeGroup[0];
        const lastSlot = activeGroup[activeGroup.length - 1];
        const activeScheduleIds = activeGroup.map(s => s.id);

        const tz = await getTenantTimezone(tenantId);
        const tzOffset = getTenantOffsetString(tz);

        const waktuMulaiSesi = new Date(`${todayStr}T${firstSlot.jam_mulai}:00.000${tzOffset}`);
        const waktuSelesaiSesi = new Date(`${todayStr}T${lastSlot.jam_selesai}:00.000${tzOffset}`);

        // Cari sesi KBM reguler kelas & mapel tersebut hari ini
        let kbmSesi = await prisma.sesiAbsensi.findFirst({
          where: {
            tenant_id: tenantId,
            OR: [
              { jadwal_kbm_id: { in: activeScheduleIds } },
              {
                kelas_id: overlappingKbm.kelas_id,
                mapel_id: overlappingKbm.mapel_id,
                jenis_kegiatan: 'KBM',
              },
            ],
            tanggal: new Date(todayStr),
          },
        });

        // Jika belum ada, materialisasi sesi KBM dengan status BERLANGSUNG
        if (!kbmSesi) {
          kbmSesi = await prisma.sesiAbsensi.create({
            data: {
              tenant_id: tenantId,
              jadwal_kbm_id: firstSlot.id,
              kelas_id: overlappingKbm.kelas_id,
              guru_id: overlappingKbm.guru_id,
              mapel_id: overlappingKbm.mapel_id,
              tahun_pelajaran_id: overlappingKbm.tahun_pelajaran_id,
              semester_id: overlappingKbm.semester_id,
              jenis_kegiatan: 'KBM',
              status: 'BERLANGSUNG',
              tanggal: new Date(todayStr),
              waktu_mulai: waktuMulaiSesi,
              waktu_selesai: waktuSelesaiSesi,
              foto_kegiatan: parentSesi.foto_kegiatan || undefined,
              created_at: now,
              updated_at: now,
            },
          });
        } else {
          // Buka sesi KBM yang masih MENDATANG / BELUM_DIMULAI dan pastikan waktu_selesai presisi
          const updateData: any = { updated_at: now };
          if (kbmSesi.status === 'MENDATANG' || kbmSesi.status === 'BELUM_DIMULAI') {
            updateData.status = 'BERLANGSUNG';
            if (!kbmSesi.waktu_mulai) updateData.waktu_mulai = waktuMulaiSesi;
            if (parentSesi.foto_kegiatan && !kbmSesi.foto_kegiatan) updateData.foto_kegiatan = parentSesi.foto_kegiatan;
          }
          if (!kbmSesi.waktu_selesai) {
            updateData.waktu_selesai = waktuSelesaiSesi;
          }
          if (Object.keys(updateData).length > 1) {
            kbmSesi = await prisma.sesiAbsensi.update({
              where: { id: kbmSesi.id },
              data: updateData,
            });
          }
        }

        // Upsert AbsenGuru di sesi KBM reguler
        await prisma.absenGuru.upsert({
          where: {
            sesi_id_guru_id: {
              sesi_id: kbmSesi.id,
              guru_id: payload.guru_id,
            },
          },
          update: {
            status: 'HADIR',
            waktu_tap: now,
            is_terlambat: false,
            catatan: `Hadir mendampingi ${namaKegiatan} (Terminal Kegiatan Terpadu)`,
            updated_at: now,
          },
          create: {
            tenant_id: tenantId,
            sesi_id: kbmSesi.id,
            guru_id: payload.guru_id,
            status: 'HADIR',
            waktu_tap: now,
            is_terlambat: false,
            catatan: `Hadir mendampingi ${namaKegiatan} (Terminal Kegiatan Terpadu)`,
            tahun_pelajaran_id: overlappingKbm.tahun_pelajaran_id,
            semester_id: overlappingKbm.semester_id,
            created_at: now,
            updated_at: now,
          },
        });

        // 🛡️ PEWARISAN KETIDAKHADIRAN GERBANG (SAKIT, IZIN, ALPA, DISPEN):
        // Siswa yang di gerbang tercatat SAKIT, IZIN, ALPA, atau DISPEN otomatis diwariskan ke sesi KBM.
        // Siswa yang berstatus HADIR / TERLAMBAT di gerbang TIDAK diwariskan (wajib diverifikasi fisik di kelas).
        try {
          const startOfDay = new Date(`${todayStr}T00:00:00.000${tzOffset}`);
          const endOfDay = new Date(`${todayStr}T23:59:59.999${tzOffset}`);

          const gateAbsences = await prisma.absenGerbangSiswa.findMany({
            where: {
              tenant_id: tenantId,
              created_at: { gte: startOfDay, lte: endOfDay },
              status: { in: ['SAKIT', 'IZIN', 'ALPA', 'ALFA', 'DISPEN'] },
              OR: [
                { kelas_id_snapshot: overlappingKbm.kelas_id },
                { Siswa: { kelas_id: overlappingKbm.kelas_id } }
              ],
            },
            select: {
              siswa_id: true,
              status: true,
              waktu_tap: true,
              catatan: true,
            },
          });

          for (const ga of gateAbsences) {
            const sa = await prisma.siswaAkademik.findFirst({
              where: {
                siswa_id: ga.siswa_id,
                kelas_id: overlappingKbm.kelas_id,
                status: 'AKTIF',
              },
              select: { id: true },
            });
            if (!sa) continue;

            const normalizedStatus = String(ga.status || '').toUpperCase() === 'ALFA' ? 'ALPA' : ga.status;

            const existing = await prisma.absenSiswa.findFirst({
              where: { sesi_id: kbmSesi.id, siswa_akademik_id: sa.id },
            });

            if (existing) {
              await prisma.absenSiswa.update({
                where: { id_created_at: { id: existing.id, created_at: (existing as any).created_at } },
                data: {
                  status: normalizedStatus as any,
                  waktu_tap: ga.waktu_tap || waktuMulaiSesi,
                  asal_gerbang: true,
                  catatan: ga.catatan || `Tercatat ${normalizedStatus} dari Presensi Gerbang`,
                  updated_at: now,
                },
              });
            } else {
              await prisma.absenSiswa.create({
                data: {
                  tenant_id: tenantId,
                  sesi_id: kbmSesi.id,
                  siswa_akademik_id: sa.id,
                  status: normalizedStatus as any,
                  waktu_tap: ga.waktu_tap || waktuMulaiSesi,
                  asal_gerbang: true,
                  kelas_id_snapshot: overlappingKbm.kelas_id,
                  tahun_pelajaran_id_snapshot: overlappingKbm.tahun_pelajaran_id,
                  catatan: ga.catatan || `Tercatat ${normalizedStatus} dari Presensi Gerbang`,
                },
              });
            }
          }
        } catch (gateSyncErr: any) {
          console.warn('[UnifiedKegiatanService] Gate non-present sync warning:', gateSyncErr?.message);
        }

        syncedKbm = true;
        kbmSesiId = kbmSesi.id;
      }
    }

    return {
      success: true,
      message: syncedKbm
        ? `Presensi dicatat & Sesi KBM reguler berhasil dibuka otomatis (1 Tap 2 Record)`
        : `Presensi pendamping berhasil dicatat`,
      synced_kbm: syncedKbm,
      kbm_sesi_id: kbmSesiId,
    };
  }

  /**
   * 4b. Tap Pendamping via RFID Token (Universal Reusable Engine)
   * Dapat digunakan untuk Ketarunaan, Sholat Dhuha, Upacara Bendera, dsb.
   */
  async tapPendampingByRfid(tenantId: string, payload: UnifiedRfidTapPayload) {
    const token = payload.rfid_token?.trim();
    if (!token) {
      throw new Error('Token RFID tidak boleh kosong');
    }

    // Cari Guru berdasarkan no_rfid, NIP, atau NUPTK
    const guru = await prisma.guru.findFirst({
      where: {
        tenant_id: tenantId,
        OR: [
          { no_rfid: token },
          { nip: token },
          { nuptk: token },
        ],
      },
    });

    if (!guru) {
      throw new Error(`Kartu RFID "${token}" tidak terdaftar sebagai Guru atau Pembina`);
    }

    const jenis = payload.jenis_kegiatan || 'KETARUNAAN';
    let sesiId = payload.sesi_id;

    if (!sesiId) {
      const todayStr = this.getTodayDateStr();
      const sesiToday = await this.getSesiHariIni(tenantId, {
        tanggal: todayStr,
        jadwal_kegiatan_id: payload.jadwal_kegiatan_id,
        jenis_kegiatan: jenis,
      });
      sesiId = sesiToday?.id;
    }

    // Panggil engine 1 Tap 2 Record
    const tapResult = await this.tapPendamping(tenantId, {
      guru_id: guru.id,
      sesi_id: sesiId,
      status: 'HADIR',
      jenis_kegiatan: jenis,
      jadwal_kegiatan_id: payload.jadwal_kegiatan_id,
      catatan: `Hadir via Scanner RFID Universal (${jenis})`,
    });

    return {
      ...tapResult,
      guru: {
        id: guru.id,
        nama_guru: guru.nama_guru,
        nip: guru.nip,
        foto: guru.foto || null,
      },
    };
  }

  /**
   * 5. Statistik & Tren: Agregasi murni dari SSOT SesiAbsensi
   */
  async getStats(tenantId: string, params?: { 
    tahun_pelajaran_id?: string; 
    semester_id?: string; 
    jadwal_kegiatan_id?: string; 
    jenis_kegiatan?: string;
    tanggal_mulai?: string;
    tanggal_selesai?: string;
  }) {
    const jenis = params?.jenis_kegiatan || 'KETARUNAAN';

    const sesiWhere: any = {
      tenant_id: tenantId,
      OR: [
        { jenis_kegiatan: { contains: jenis, mode: 'insensitive' } },
        { JadwalKegiatan: { nama: { contains: jenis, mode: 'insensitive' } } },
      ],
    };

    const activeTp = params?.tahun_pelajaran_id
      ? { id: params.tahun_pelajaran_id }
      : await prisma.tahunPelajaran.findFirst({
          where: { tenant_id: tenantId, is_active: true },
        });

    if (activeTp?.id) {
      sesiWhere.tahun_pelajaran_id = activeTp.id;
    }
    if (params?.jadwal_kegiatan_id) {
      sesiWhere.jadwal_kegiatan_id = params.jadwal_kegiatan_id;
    }
    if (params?.tanggal_mulai || params?.tanggal_selesai) {
      sesiWhere.tanggal = {};
      if (params.tanggal_mulai) {
        sesiWhere.tanggal.gte = new Date(`${params.tanggal_mulai}T00:00:00.000Z`);
      }
      if (params.tanggal_selesai) {
        sesiWhere.tanggal.lte = new Date(`${params.tanggal_selesai}T23:59:59.999Z`);
      }
    }

    const sesiList = await prisma.sesiAbsensi.findMany({
      where: sesiWhere,
      include: {
        _count: {
          select: {
            AbsenSiswa: true,
            AbsenGuru: true,
          },
        },
      },
      orderBy: { tanggal: 'asc' },
    });

    const totalSiswaMaster = await prisma.siswaAkademik.count({
      where: {
        status: 'AKTIF',
        ...(activeTp?.id ? { tahun_pelajaran_id: activeTp.id } : {}),
        siswa: { status: 'AKTIF', tenant_id: tenantId },
      },
    });

    if (sesiList.length === 0) {
      return {
        trend: [],
        latest: {
          total_siswa: totalSiswaMaster,
          hadir_siswa: 0,
          persen_hadir_siswa: 0,
          total_pendamping: 0,
          hadir_pendamping: 0,
          persen_hadir_pendamping: 0,
          is_empty_session: true,
        },
        ringkasan_periode: {
          total_sesi: 0,
          avg_persen_siswa: 0,
          avg_persen_guru: 0,
          total_hadir_siswa: 0,
          total_target_siswa: 0,
          arah_perkembangan: 'STABIL',
          evaluasi: 'Belum Ada Sesi',
          tanggal_mulai: params?.tanggal_mulai || null,
          tanggal_selesai: params?.tanggal_selesai || null,
        },
        total_siswa_master: totalSiswaMaster,
        by_tingkat: [],
        by_kelas: [],
      };
    }

    const sesiIds = sesiList.map(s => s.id);

    // Ambil rekap kehadiran nyata dari AbsenSiswa untuk seluruh sesi kegiatan ini (SSOT)
    const hadirPerSesiList = await prisma.absenSiswa.groupBy({
      by: ['sesi_id'],
      where: {
        sesi_id: { in: sesiIds },
        tenant_id: tenantId,
        status: 'HADIR',
      },
      _count: { id: true },
    });
    const hadirPerSesiMap = new Map<string, number>();
    for (const item of hadirPerSesiList) {
      hadirPerSesiMap.set(item.sesi_id, item._count.id);
    }

    // Ambil rekap kehadiran nyata dari AbsenGuru untuk seluruh sesi kegiatan ini (SSOT)
    const hadirGuruPerSesiList = await prisma.absenGuru.groupBy({
      by: ['sesi_id'],
      where: {
        sesi_id: { in: sesiIds },
        tenant_id: tenantId,
        status: 'HADIR',
      },
      _count: { id: true },
    });
    const hadirGuruPerSesiMap = new Map<string, number>();
    for (const item of hadirGuruPerSesiList) {
      hadirGuruPerSesiMap.set(item.sesi_id, item._count.id);
    }

    // Kelompokkan sesi per tanggal unik (Satu hari kegiatan sekolah = Satu Pertemuan Terpadu)
    const sesiByTanggal = new Map<string, typeof sesiList>();
    for (const s of sesiList) {
      const tglKey = s.tanggal.toISOString().split('T')[0];
      const arr = sesiByTanggal.get(tglKey) || [];
      arr.push(s);
      sesiByTanggal.set(tglKey, arr);
    }

    const sortedTanggalKeys = Array.from(sesiByTanggal.keys()).sort();
    const trend: Array<any> = [];
    let prevPersenSiswa = 0;
    let prevPersenGuru = 0;

    for (let i = 0; i < sortedTanggalKeys.length; i++) {
      const tglKey = sortedTanggalKeys[i];
      const sesiHariIni = sesiByTanggal.get(tglKey) || [];

      let totalSiswaHariIni = 0;
      let hadirSiswaHariIni = 0;
      let totalGuruHariIni = 0;
      let hadirGuruHariIni = 0;

      for (const s of sesiHariIni) {
        totalSiswaHariIni += s._count.AbsenSiswa > 0 ? s._count.AbsenSiswa : 0;
        hadirSiswaHariIni += hadirPerSesiMap.get(s.id) || 0;
        totalGuruHariIni += s._count.AbsenGuru > 0 ? s._count.AbsenGuru : 0;
        hadirGuruHariIni += hadirGuruPerSesiMap.get(s.id) || 0;
      }

      // Jika kuota AbsenSiswa belum digenerate di sesi, gunakan total siswa aktif sekolah sebagai kuota target
      if (totalSiswaHariIni === 0) {
        totalSiswaHariIni = totalSiswaMaster;
      }
      if (totalGuruHariIni === 0) {
        totalGuruHariIni = Math.max(sesiHariIni.length, 1);
      }

      const persenSiswa = totalSiswaHariIni > 0 && hadirSiswaHariIni > 0
        ? (hadirSiswaHariIni / totalSiswaHariIni) * 100
        : 0;
      const persenGuru = totalGuruHariIni > 0 && hadirGuruHariIni > 0
        ? (hadirGuruHariIni / totalGuruHariIni) * 100
        : 0;

      const deltaSiswa = i > 0 ? persenSiswa - prevPersenSiswa : 0;
      const deltaGuru = i > 0 ? persenGuru - prevPersenGuru : 0;

      prevPersenSiswa = persenSiswa;
      prevPersenGuru = persenGuru;

      trend.push({
        tanggal: tglKey,
        sesi_ke: i + 1,
        total_siswa: totalSiswaHariIni,
        hadir_siswa: hadirSiswaHariIni,
        persen_hadir_siswa: Math.round(persenSiswa),
        total_pendamping: totalGuruHariIni,
        hadir_guru: hadirGuruHariIni,
        persen_hadir_guru: Math.round(persenGuru),
        delta_siswa: Number(deltaSiswa.toFixed(1)),
        delta_guru: Number(deltaGuru.toFixed(1)),
      });
    }

    const latest = trend[trend.length - 1];

    const allKelas = await prisma.kelas.findMany({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true, nama_kelas: true, tingkat: true },
    });

    const byKelas: Array<any> = [];
    for (const k of allKelas) {
      const countSiswa = await prisma.siswaAkademik.count({
        where: {
          kelas_id: k.id,
          status: 'AKTIF',
          ...(activeTp?.id ? { tahun_pelajaran_id: activeTp.id } : {}),
          siswa: { status: 'AKTIF', tenant_id: tenantId },
        },
      });

      // Hitung kehadiran riil rombel ini pada sesi-sesi kegiatan pembiasaan ini
      const sesiForClass = sesiList.filter(s => s.kelas_id === k.id);
      let hadirKelas = 0;
      let targetKelas = 0;

      if (sesiForClass.length > 0) {
        for (const s of sesiForClass) {
          hadirKelas += hadirPerSesiMap.get(s.id) || 0;
          targetKelas += s._count.AbsenSiswa > 0 ? s._count.AbsenSiswa : countSiswa;
        }
      } else {
        targetKelas = countSiswa * Math.max(sesiList.length, 1);
        hadirKelas = 0;
      }

      const persenKelas = targetKelas > 0 && hadirKelas > 0 
        ? Math.round((hadirKelas / targetKelas) * 100) 
        : 0;

      byKelas.push({
        kelas_id: k.id,
        kelas_nama: k.nama_kelas,
        total: countSiswa,
        hadir: hadirKelas,
        persen: persenKelas,
      });
    }

    const totalSesi = trend.length;
    const avgPersenSiswa = totalSesi > 0 
      ? Math.round(trend.reduce((acc, t) => acc + t.persen_hadir_siswa, 0) / totalSesi) 
      : 0;
    const avgPersenGuru = totalSesi > 0 
      ? Math.round(trend.reduce((acc, t) => acc + t.persen_hadir_guru, 0) / totalSesi) 
      : 0;
    const totalHadirSiswaKumulatif = trend.reduce((acc, t) => acc + t.hadir_siswa, 0);
    const totalTargetSiswaKumulatif = trend.reduce((acc, t) => acc + t.total_siswa, 0);

    let arahPerkembangan: 'NAIK' | 'STABIL' | 'TURUN' = 'STABIL';
    if (totalSesi >= 2) {
      const half = Math.floor(totalSesi / 2);
      const firstHalf = trend.slice(0, half);
      const secondHalf = trend.slice(half);
      const avgFirst = firstHalf.reduce((a, b) => a + b.persen_hadir_siswa, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b.persen_hadir_siswa, 0) / secondHalf.length;
      if (avgSecond - avgFirst > 2) arahPerkembangan = 'NAIK';
      else if (avgFirst - avgSecond > 2) arahPerkembangan = 'TURUN';
    }

    const ringkasan_periode = {
      total_sesi: totalSesi,
      avg_persen_siswa: avgPersenSiswa,
      avg_persen_guru: avgPersenGuru,
      total_hadir_siswa: totalHadirSiswaKumulatif,
      total_target_siswa: totalTargetSiswaKumulatif,
      arah_perkembangan: arahPerkembangan,
      evaluasi: avgPersenSiswa >= 85 ? 'Sangat Baik' : avgPersenSiswa >= 70 ? 'Baik' : avgPersenSiswa >= 50 ? 'Cukup' : 'Perlu Pendampingan',
      tanggal_mulai: params?.tanggal_mulai || (trend[0]?.tanggal ?? null),
      tanggal_selesai: params?.tanggal_selesai || (trend[trend.length - 1]?.tanggal ?? null),
    };

    const tingkatMap = new Map<string, { total: number; hadir: number }>();
    for (const bk of byKelas) {
      const kName = bk.kelas_nama.toUpperCase();
      let tingkat = 'Lainnya';
      if (kName.startsWith('X ') || kName.startsWith('10 ') || kName === 'X') tingkat = 'Kelas X';
      else if (kName.startsWith('XI ') || kName.startsWith('11 ') || kName === 'XI') tingkat = 'Kelas XI';
      else if (kName.startsWith('XII ') || kName.startsWith('12 ') || kName === 'XII') tingkat = 'Kelas XII';

      const cur = tingkatMap.get(tingkat) || { total: 0, hadir: 0 };
      cur.total += bk.total;
      cur.hadir += bk.hadir;
      tingkatMap.set(tingkat, cur);
    }

    const byTingkat = Array.from(tingkatMap.entries()).map(([tingkat, val]) => ({
      tingkat,
      total: val.total,
      hadir: val.hadir,
      persen: val.total > 0 && val.hadir > 0 ? Math.round((val.hadir / val.total) * 100) : 0,
    }));

    return {
      trend,
      latest: {
        total_siswa: latest?.total_siswa || totalSiswaMaster,
        hadir_siswa: latest?.hadir_siswa || 0,
        persen_hadir_siswa: latest?.persen_hadir_siswa || 0,
        total_pendamping: latest?.total_pendamping || 0,
        hadir_pendamping: latest?.hadir_guru || 0,
        persen_hadir_pendamping: latest?.persen_hadir_guru || 0,
        is_empty_session: false,
      },
      ringkasan_periode,
      total_siswa_master: totalSiswaMaster,
      by_tingkat: byTingkat,
      by_kelas: byKelas,
    };
  }

  /**
   * 6. Laporan Tim Pendamping (Scope Sekolah)
   */
  async getLaporanTim(tenantId: string, params: { tanggal?: string; sesi_id?: string; jadwal_kegiatan_id?: string; jenis_kegiatan?: string }) {
    const pendampingData = await this.getPendamping(tenantId, params);
    const rows = pendampingData.data.map((p, idx) => ({
      no: idx + 1,
      jabatan: p.jabatan,
      jabatan_kode: p.jabatan_kode,
      nama_guru: p.nama_guru,
      kelas_nama: p.kelas_nama,
      mapel_nama: p.mapel_nama,
      jam_kbm: p.jam_kbm,
      status: p.status,
      waktu_tap: p.waktu_tap,
      keterangan: p.catatan || (p.status === 'HADIR' ? 'Tercatat Hadir' : '-'),
    }));

    return {
      tanggal: params.tanggal || this.getTodayDateStr(),
      jenis_kegiatan: params.jenis_kegiatan || 'Kegiatan Terpadu',
      data: rows,
    };
  }

  /**
   * 7. Laporan Per Kelas (Scope Rombel) — Data Nyata dari AbsenSiswa SSOT
   */
  async getLaporanKelas(tenantId: string, params: { tanggal?: string; kelas_id?: string; jadwal_kegiatan_id?: string; jenis_kegiatan?: string; tahun_pelajaran_id?: string }) {
    const targetDateStr = params.tanggal || this.getTodayDateStr();
    const jenis = params.jenis_kegiatan || 'KETARUNAAN';
    const dateRange = this.getDateRange(targetDateStr);

    const activeTp = params.tahun_pelajaran_id
      ? { id: params.tahun_pelajaran_id }
      : await prisma.tahunPelajaran.findFirst({
          where: { tenant_id: tenantId, is_active: true },
        });

    // Ambil semua sesi kegiatan pada tanggal ini
    let sesiWhere: any = {
      tenant_id: tenantId,
      tanggal: { gte: dateRange.gte, lte: dateRange.lte },
    };
    if (activeTp?.id) {
      sesiWhere.tahun_pelajaran_id = activeTp.id;
    }
    if (params.jadwal_kegiatan_id) {
      sesiWhere.jadwal_kegiatan_id = params.jadwal_kegiatan_id;
    } else {
      sesiWhere.OR = [
        { jenis_kegiatan: { contains: jenis, mode: 'insensitive' } },
        { JadwalKegiatan: { nama: { contains: jenis, mode: 'insensitive' } } },
      ];
    }

    const sesiList = await prisma.sesiAbsensi.findMany({
      where: sesiWhere,
      select: { id: true, kelas_id: true, status: true },
    });
    const sesiByKelas = new Map<string, { id: string; status: string }>();
    for (const s of sesiList) {
      if (s.kelas_id) sesiByKelas.set(s.kelas_id, { id: s.id, status: s.status });
    }

    // Ambil posisi struktural untuk kaprog dan walikelas
    const waliPos = await prisma.organizationalPosition.findFirst({
      where: { tenant_id: tenantId, code: 'WALIKELAS', is_active: true },
      include: {
        organizationalAssigns: {
          where: { is_active: true },
          include: { User: { include: { Guru: true } }, Kelas: { select: { id: true } } },
        },
      },
    });

    // Bangun map walikelas per kelas_id
    const waliMap = new Map<string, { nama_guru: string; guru_id: string }>();
    waliPos?.organizationalAssigns.forEach(a => {
      if (a.Kelas?.id && a.User?.Guru) {
        waliMap.set(a.Kelas.id, { nama_guru: a.User.Guru.nama_guru, guru_id: a.User.Guru.id });
      }
    });

    const siswaAkademikWhere: any = {
      status: 'AKTIF',
      siswa: { status: 'AKTIF' },
    };
    if (activeTp?.id) {
      siswaAkademikWhere.tahun_pelajaran_id = activeTp.id;
    }

    const kelasWhere: any = { tenant_id: tenantId, is_active: true };
    if (params.kelas_id) kelasWhere.id = params.kelas_id;

    const kelasList: any[] = await prisma.kelas.findMany({
      where: kelasWhere,
      orderBy: { nama_kelas: 'asc' },
      include: {
        SiswaAkademik: {
          where: siswaAkademikWhere,
          include: {
            siswa: { select: { id: true, nama_siswa: true, nis: true } },
          },
          orderBy: {
            siswa: { nama_siswa: 'asc' },
          },
        },
      },
    });

    const result: Array<any> = [];

    for (let idx = 0; idx < kelasList.length; idx++) {
      const k = kelasList[idx];
      const sesiData = sesiByKelas.get(k.id);
      const sesiId = sesiData?.id;
      const isSesiSelesai = sesiData?.status === 'SELESAI';

      // Ambil AbsenSiswa nyata jika ada sesi
      const absenSiswaMap = new Map<string, any>();
      if (sesiId) {
        const absenList = await prisma.absenSiswa.findMany({
          where: { sesi_id: sesiId },
          select: {
            siswa_akademik_id: true,
            status: true,
            waktu_tap: true,
            catatan: true,
          },
        });
        for (const a of absenList) {
          absenSiswaMap.set(a.siswa_akademik_id, a);
        }
      }

      // Ambil data gerbang non-hadir (SAKIT, IZIN, ALPA, DISPEN) hari ini untuk kelas ini
      const gateAbsenceList = await prisma.absenGerbangSiswa.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: dateRange.gte, lte: dateRange.lte },
          status: { in: ['SAKIT', 'IZIN', 'ALPA', 'ALFA', 'DISPEN'] },
          OR: [
            { kelas_id_snapshot: k.id },
            { Siswa: { kelas_id: k.id } },
          ],
        },
        select: {
          siswa_id: true,
          status: true,
          waktu_tap: true,
          catatan: true,
        },
      });
      const gateAbsenceMap = new Map(gateAbsenceList.map(g => [g.siswa_id, g]));

      const rawSiswaAkademikList = (k.SiswaAkademik || []) as any[];
      const siswaAkademikList = [...rawSiswaAkademikList].sort((a, b) => {
        const nameA = a.siswa?.nama_siswa || '';
        const nameB = b.siswa?.nama_siswa || '';
        return nameA.localeCompare(nameB);
      });

      let hadir = 0, sakit = 0, izin = 0, alpa = 0, belum = 0;

      const siswaRows = siswaAkademikList.map((sa: any, sIdx: number) => {
        const absen = absenSiswaMap.get(sa.id);
        const sId = sa.siswa_id || sa.siswa?.id;
        const gateAbsence = sId ? gateAbsenceMap.get(sId) : null;
        let status = 'BELUM_TAP';
        let catatan = absen?.catatan || null;
        let waktuTap = absen?.waktu_tap ? absen.waktu_tap.toISOString() : null;

        if (absen?.status) {
          status = absen.status;
        } else if (gateAbsence) {
          // 🛡️ Mewarisi status ketidakhadiran resmi dari gerbang
          const norm = String(gateAbsence.status || '').toUpperCase() === 'ALFA' ? 'ALPA' : gateAbsence.status;
          status = norm;
          waktuTap = gateAbsence.waktu_tap ? gateAbsence.waktu_tap.toISOString() : null;
          catatan = gateAbsence.catatan || `Tercatat ${norm} di Gerbang`;
        } else if (isSesiSelesai) {
          status = 'ALPA';
        } else {
          status = 'BELUM_TAP';
        }

        if (status === 'HADIR') hadir++;
        else if (status === 'SAKIT') sakit++;
        else if (status === 'IZIN') izin++;
        else if (status === 'ALPA') alpa++;
        else belum++;

        return {
          no: sIdx + 1,
          nama_siswa: sa.siswa?.nama_siswa || sa.Siswa?.nama_siswa || '-',
          nis: sa.siswa?.nis || sa.Siswa?.nis || '-',
          status,
          waktu_tap: waktuTap,
          catatan,
        };
      });

      // Wali kelas info
      const wali = waliMap.get(k.id);
      let wali_kelas_info: { nama_guru: string; status: string } | undefined;
      if (wali && sesiId) {
        const guruAbsen = await prisma.absenGuru.findFirst({
          where: { sesi_id: sesiId, guru_id: wali.guru_id },
          select: { status: true },
        });
        wali_kelas_info = {
          nama_guru: wali.nama_guru,
          status: (guruAbsen?.status as string) || 'BELUM_TAP',
        };
      }

      result.push({
        no: idx + 1,
        kelas_id: k.id,
        kelas_nama: k.nama_kelas,
        status_sesi: sesiData?.status || 'TIDAK_ADA_SESI',
        wali_kelas: wali_kelas_info,
        siswa: siswaRows,
        rekap: {
          hadir,
          sakit,
          izin,
          alpa,
          belum,
          total: siswaAkademikList.length,
        },
      });
    }

    return result;
  }
}

export const unifiedKegiatanService = UnifiedKegiatanService.getInstance();

