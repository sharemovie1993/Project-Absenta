import { prisma } from '@/utils/prisma';
import { Hari } from '@prisma/client';
import { getTenantTimezone, getTenantOffsetString } from '@/utils/timezone.utils';
import { emitDomainEvent } from '@/infra/event-bus';
import { storageService } from '@/infra/storage/storage.service';
import {
  getEffectivePolicyForJadwalKegiatan,
  formatOrgDutyLabel,
} from './kegiatan-wajib-config.helper';

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
   * Helper: Dapatkan tanggal YYYY-MM-DD hari ini berbasis timezone Asia/Jakarta (WIB)
   */
  public getTodayDateStr(timezone: string = 'Asia/Jakarta'): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  }

  /**
   * Helper: Dapatkan enum Hari Prisma dari string tanggal (YYYY-MM-DD) berbasis timezone Asia/Jakarta (WIB)
   */
  public getHariEnum(dateStr?: string, timezone: string = 'Asia/Jakarta'): Hari {
    const d = dateStr ? new Date(`${dateStr.slice(0, 10)}T12:00:00+07:00`) : new Date();
    const dayName = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    }).format(d);
    const map: Record<string, Hari> = {
      Sun: 'MINGGU',
      Mon: 'SENIN',
      Tue: 'SELASA',
      Wed: 'RABU',
      Thu: 'KAMIS',
      Fri: 'JUMAT',
      Sat: 'SABTU',
    };
    return map[dayName] || 'SENIN';
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
   * Klasifikasi jenis siklus dari nama / jenis_kegiatan JadwalKegiatan
   */
  private classifySiklusType(namaOrJenis?: string | null): 'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE' {
    const u = String(namaOrJenis || '').toUpperCase();
    if (u.includes('UPACARA')) return 'UPACARA';
    if (u.includes('DUHA') || u.includes('DHUHA')) return 'DUHA';
    if (u.includes('SORE') || u.includes('PULANG')) return 'APEL_SORE';
    return 'KETARUNAAN';
  }

  private getSiklusPilarLabel(siklus: 'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE'): string {
    if (siklus === 'DUHA') return 'Pembiasaan Dhuha • Pilar Mental & Spiritual (1 Sesi Bersama Terminal Dhuha)';
    if (siklus === 'UPACARA') return 'Upacara Bendera • Pilar Kedisiplinan Taruna';
    if (siklus === 'APEL_SORE') return 'Apel Sore / Pulang • Pilar Kedisiplinan Taruna';
    return 'Pembinaan Ketarunaan & Apel Pagi • Pilar Kedisiplinan Taruna';
  }

  /**
   * Resolusi Cerdas Multi-Siklus untuk Ranah KETARUNAAN (5 Siklus: Upacara, Ketarunaan, Dhuha, Apel Pagi/Sore)
   * - Menghormati jadwal ketat per hari (Senin=Upacara, Sel/Rab/Kam/Sab=Ketarunaan, Jumat=Dhuha).
   * - Pada hari Jumat, otomatis mengarah ke JadwalKegiatan & SesiAbsensi DUHA yang sama persis dengan Terminal Dhuha.
   */
  public async resolveSiklusJadwal(tenantId: string, jenisKegiatan: string = 'KETARUNAAN', targetHari?: Hari) {
    const hariToMatch = targetHari || this.getHariEnum();
    const isMultiCycleKetarunaan = jenisKegiatan.toUpperCase() === 'KETARUNAAN';

    const now = new Date();
    const wibNow = new Date(now.getTime() + 7 * 3600 * 1000);
    const currentHours = String(wibNow.getUTCHours()).padStart(2, '0');
    const currentMinutes = String(wibNow.getUTCMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    if (!isMultiCycleKetarunaan) {
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

      const hariAktif = Array.isArray(jadwal?.hari) ? (jadwal!.hari as string[]) : [];
      const isScheduled = Boolean(jadwal?.aktif) && (hariAktif.length > 0 ? hariAktif.includes(hariToMatch) : true);
      const siklusType = this.classifySiklusType(jadwal?.nama || jadwal?.jenis_kegiatan || jenisKegiatan);

      return {
        jadwal,
        allActiveSchedules: jadwal && jadwal.aktif ? [jadwal] : [],
        todaySchedules: isScheduled && jadwal && jadwal.aktif ? [jadwal] : [],
        hariAktif,
        unionHariAktif: hariAktif,
        isScheduledOnTargetDay: isScheduled,
        siklusType,
        siklusPilarLabel: this.getSiklusPilarLabel(siklusType),
        currentTimeStr,
      };
    }

    // Multi-Cycle 5 Siklus Ketarunaan (1 Slot = 1 Agenda Fisik)
    // Mengambil jadwal inti KETARUNAAN + jadwal pembiasaan lain (Upacara/Apel/Dhuha) yang ditandai
    // `termasuk_siklus_ketarunaan = true`.
    // Backward-compatible: jika tenant belum pernah menyetel flag `termasuk_siklus_ketarunaan` sama sekali
    // pada kegiatan non-Ketarunaan, tetap menyertakan Upacara/Apel/Dhuha agar sekolah eksisting tidak terputus.
    const cycleKeywords = ['UPACARA', 'KETARUNAAN', 'DUHA', 'DHUHA', 'APEL'];
    const rawCandidateSchedules = await prisma.jadwalKegiatan.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { termasuk_siklus_ketarunaan: true },
          ...cycleKeywords.flatMap((kw) => [
            { nama: { contains: kw, mode: 'insensitive' as const } },
            { jenis_kegiatan: { contains: kw, mode: 'insensitive' as const } },
          ]),
        ],
      },
      orderBy: { updated_at: 'desc' },
    });

    const isCoreKetarunaan = (j: { nama?: string | null; jenis_kegiatan?: string | null }) =>
      /ketarunaan|taruna/i.test(`${j.nama || ''} ${j.jenis_kegiatan || ''}`);

    const hasExplicitNonCoreTag = rawCandidateSchedules.some(
      (j) => !isCoreKetarunaan(j) && Boolean(j.termasuk_siklus_ketarunaan)
    );

    const allCycleSchedules = hasExplicitNonCoreTag
      ? rawCandidateSchedules.filter((j) => isCoreKetarunaan(j) || Boolean(j.termasuk_siklus_ketarunaan))
      : rawCandidateSchedules;

    const activeSchedules = allCycleSchedules.filter((j) => j.aktif);
    const dayOrder: Hari[] = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
    const unionSet = new Set<string>();
    activeSchedules.forEach((j) => {
      if (Array.isArray(j.hari)) {
        (j.hari as string[]).forEach((h) => unionSet.add(h));
      }
    });
    const unionHariAktif = dayOrder.filter((d) => unionSet.has(d));

    // Cari jadwal aktif yang jatuh pada hariToMatch
    const matchingToday = activeSchedules.filter(
      (j) => Array.isArray(j.hari) && (j.hari as string[]).includes(hariToMatch)
    );

    let selectedJadwal = null;
    if (matchingToday.length === 1) {
      selectedJadwal = matchingToday[0];
    } else if (matchingToday.length > 1) {
      // Jika ada jadwal pagi (Upacara/Ketarunaan/Dhuha) & sore (Apel Pulang) di hari yang sama:
      // Pilih yang sedang berada di rentang jam saat ini; jika tidak sedang di rentang jam, utamakan siklus pagi sebelum jam 13:00 WIB
      const inWindow = matchingToday.find((j) => {
        if (!j.waktu_mulai || !j.waktu_selesai) return false;
        return currentTimeStr >= j.waktu_mulai.slice(0, 5) && currentTimeStr <= j.waktu_selesai.slice(0, 5);
      });
      if (inWindow) {
        selectedJadwal = inWindow;
      } else {
        const morning = matchingToday.find((j) => this.classifySiklusType(j.nama || j.jenis_kegiatan) !== 'APEL_SORE');
        const afternoon = matchingToday.find((j) => this.classifySiklusType(j.nama || j.jenis_kegiatan) === 'APEL_SORE');
        selectedJadwal = currentTimeStr >= '13:00' && afternoon ? afternoon : (morning || matchingToday[0]);
      }
    }

    const isScheduledOnTargetDay = matchingToday.length > 0;

    if (!selectedJadwal) {
      // Fallback ke jadwal utama KETARUNAAN (aktif maupun nonaktif) untuk metadata pratinjau saat hari libur/Minggu
      selectedJadwal =
        activeSchedules.find((j) => this.classifySiklusType(j.nama || j.jenis_kegiatan) === 'KETARUNAAN') ||
        activeSchedules[0] ||
        allCycleSchedules.find((j) => this.classifySiklusType(j.nama || j.jenis_kegiatan) === 'KETARUNAAN') ||
        allCycleSchedules[0] ||
        null;
    }

    const jadwalHariAktif = Array.isArray(selectedJadwal?.hari) ? (selectedJadwal!.hari as string[]) : [];
    const siklusType = this.classifySiklusType(selectedJadwal?.nama || selectedJadwal?.jenis_kegiatan);

    return {
      jadwal: selectedJadwal,
      allActiveSchedules: activeSchedules,
      todaySchedules: matchingToday,
      hariAktif: jadwalHariAktif,
      unionHariAktif: unionHariAktif.length > 0 ? unionHariAktif : jadwalHariAktif,
      isScheduledOnTargetDay,
      siklusType,
      siklusPilarLabel: this.getSiklusPilarLabel(siklusType),
      currentTimeStr,
    };
  }

  /**
   * 1. Guard Status: Cek ketersediaan Jadwal Kegiatan aktif sesuai jenisnya (default: KETARUNAAN 5 Siklus)
   */
  async getGuardStatus(tenantId: string, jenisKegiatan: string = 'KETARUNAAN') {
    const todayHari = this.getHariEnum();
    const resolved = await this.resolveSiklusJadwal(tenantId, jenisKegiatan, todayHari);
    const {
      jadwal,
      allActiveSchedules,
      todaySchedules,
      hariAktif,
      unionHariAktif,
      isScheduledOnTargetDay,
      siklusType,
      siklusPilarLabel,
      currentTimeStr,
    } = resolved;

    if (!jadwal) {
      return {
        is_active: false,
        jadwal_kegiatan_id: null,
        jadwal_nama: null,
        jadwal_waktu_mulai: null,
        jadwal_waktu_selesai: null,
        hari_aktif: [],
        siklus_hari_aktif: [],
        siklus_aktif: null,
        siklus_pilar_label: null,
        siklus_schedules: [],
        today_schedules: [],
      };
    }

    let isWithinTimeWindow = false;
    if (jadwal.waktu_mulai && jadwal.waktu_selesai) {
      const s = jadwal.waktu_mulai.slice(0, 5);
      const e = jadwal.waktu_selesai.slice(0, 5);
      isWithinTimeWindow = currentTimeStr >= s && currentTimeStr <= e;
    }

    return {
      is_active: Boolean(jadwal.aktif) || allActiveSchedules.length > 0,
      jadwal_kegiatan_id: jadwal.id,
      jadwal_nama: jadwal.nama,
      jadwal_waktu_mulai: jadwal.waktu_mulai,
      jadwal_waktu_selesai: jadwal.waktu_selesai,
      hari_aktif: unionHariAktif.length > 0 ? unionHariAktif : hariAktif,
      jadwal_hari_spesifik: hariAktif,
      siklus_hari_aktif: unionHariAktif,
      siklus_aktif: siklusType,
      siklus_pilar_label: siklusPilarLabel,
      siklus_schedules: allActiveSchedules.map((s) => ({
        id: s.id,
        nama: s.nama,
        siklus: this.classifySiklusType(s.nama || s.jenis_kegiatan),
        hari: Array.isArray(s.hari) ? s.hari : [],
        waktu_mulai: s.waktu_mulai,
        waktu_selesai: s.waktu_selesai,
        target_semua_kelas: Boolean(s.target_semua_kelas),
        target_kelas_ids: Array.isArray(s.target_kelas_ids) ? s.target_kelas_ids : [],
      })),
      today_schedules: (todaySchedules || []).map((s) => ({
        id: s.id,
        nama: s.nama,
        siklus: this.classifySiklusType(s.nama || s.jenis_kegiatan),
        waktu_mulai: s.waktu_mulai,
        waktu_selesai: s.waktu_selesai,
        target_semua_kelas: Boolean(s.target_semua_kelas),
        target_kelas_ids: Array.isArray(s.target_kelas_ids) ? s.target_kelas_ids : [],
      })),
      today_hari: todayHari,
      is_today_scheduled_day: isScheduledOnTargetDay,
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
   * 2. Sesi Hari Ini: Ambil SesiAbsensi kegiatan pada tanggal tertentu (mendukung resolusi 5 Siklus Ketarunaan)
   */
  async getSesiHariIni(tenantId: string, params?: { tanggal?: string; jadwal_kegiatan_id?: string; jenis_kegiatan?: string }) {
    const dateRange = this.getDateRange(params?.tanggal);
    const targetHari = this.getHariEnum(params?.tanggal);
    const jenis = params?.jenis_kegiatan || 'KETARUNAAN';

    let targetJadwalId = params?.jadwal_kegiatan_id;
    let resolvedSiklus: Awaited<ReturnType<typeof this.resolveSiklusJadwal>> | null = null;

    if (!targetJadwalId && jenis.toUpperCase() === 'KETARUNAAN') {
      resolvedSiklus = await this.resolveSiklusJadwal(tenantId, jenis, targetHari);
      if (resolvedSiklus.jadwal?.id) {
        targetJadwalId = resolvedSiklus.jadwal.id;
      }
    }

    const includeCount = {
      _count: {
        select: {
          AbsenSiswa: true,
          AbsenGuru: true,
        },
      },
    };

    let sesi = null;

    if (targetJadwalId) {
      sesi = await prisma.sesiAbsensi.findFirst({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: dateRange.gte, lte: dateRange.lte },
          jadwal_kegiatan_id: targetJadwalId,
        },
        include: includeCount,
        orderBy: { waktu_mulai: 'asc' },
      });
    }

    // Fallback pencarian lintas nama siklus pada tanggal tersebut (misal sesi Duha/Upacara dibuat tanpa jadwal_kegiatan_id)
    if (!sesi) {
      const searchTerms =
        jenis.toUpperCase() === 'KETARUNAAN'
          ? [
              resolvedSiklus?.jadwal?.nama,
              'KETARUNAAN',
              'UPACARA',
              'DUHA',
              'DHUHA',
              'APEL',
            ].filter(Boolean) as string[]
          : [jenis];

      sesi = await prisma.sesiAbsensi.findFirst({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: dateRange.gte, lte: dateRange.lte },
          OR: searchTerms.flatMap((term) => [
            { jenis_kegiatan: { contains: term, mode: 'insensitive' as const } },
            { JadwalKegiatan: { nama: { contains: term, mode: 'insensitive' as const } } },
          ]),
        },
        include: includeCount,
        orderBy: { waktu_mulai: 'asc' },
      });
    }

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
      siklus_aktif: this.classifySiklusType(sesi.jenis_kegiatan),
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
   * 2b. Live Terminal Feed & Unified Counter Sesi Hari Ini (Guru + Siswa)
   * Mengembalikan daftar tap terbaru & total hadir gabungan agar tahan reload browser.
   */
  async getTerminalFeed(
    tenantId: string,
    params?: { tanggal?: string; jadwal_kegiatan_id?: string; jenis_kegiatan?: string }
  ) {
    const dateRange = this.getDateRange(params?.tanggal);
    const targetHari = this.getHariEnum(params?.tanggal);
    const jenis = params?.jenis_kegiatan || 'KETARUNAAN';

    let targetJadwalId = params?.jadwal_kegiatan_id;
    let resolvedSiklus: Awaited<ReturnType<typeof this.resolveSiklusJadwal>> | null = null;

    if (!targetJadwalId && jenis.toUpperCase() === 'KETARUNAAN') {
      resolvedSiklus = await this.resolveSiklusJadwal(tenantId, jenis, targetHari);
      if (resolvedSiklus.jadwal?.id) {
        targetJadwalId = resolvedSiklus.jadwal.id;
      }
    }

    const searchTerms =
      jenis.toUpperCase() === 'KETARUNAAN'
        ? [
            resolvedSiklus?.jadwal?.nama,
            'KETARUNAAN',
            'UPACARA',
            'DUHA',
            'DHUHA',
            'APEL',
          ].filter(Boolean) as string[]
        : [jenis];

    const sesiList = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: dateRange.gte, lte: dateRange.lte },
        OR: [
          ...(targetJadwalId ? [{ jadwal_kegiatan_id: targetJadwalId }] : []),
          ...searchTerms.flatMap((term) => [
            { jenis_kegiatan: { contains: term, mode: 'insensitive' as const } },
            { JadwalKegiatan: { nama: { contains: term, mode: 'insensitive' as const } } },
          ]),
        ],
      },
      select: { id: true },
    });

    const sesiIds = sesiList.map((s) => s.id);
    if (sesiIds.length === 0) {
      return {
        feed: [],
        summary: {
          siswa_hadir: 0,
          siswa_terlambat: 0,
          guru_hadir: 0,
          total_hadir: 0,
        },
      };
    }

    const [siswaRows, guruRows, siswaHadirCount, siswaTerlambatCount, guruHadirCount] = await Promise.all([
      prisma.absenSiswa.findMany({
        where: {
          sesi_id: { in: sesiIds },
          status: { in: ['HADIR', 'TERLAMBAT'] },
        },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              nisn: true,
              foto: true,
              Kelas: { select: { nama_kelas: true } },
            },
          },
        },
        orderBy: [{ waktu_tap: 'desc' }, { updated_at: 'desc' }],
        take: 30,
      }),
      prisma.absenGuru.findMany({
        where: {
          sesi_id: { in: sesiIds },
          status: { in: ['HADIR', 'TERLAMBAT'] },
        },
        include: {
          Guru: {
            select: {
              id: true,
              nama_guru: true,
              nip: true,
              foto: true,
              jenis_ptk: true,
            },
          },
        },
        orderBy: [{ waktu_tap: 'desc' }, { updated_at: 'desc' }],
        take: 30,
      }),
      prisma.absenSiswa.count({
        where: {
          sesi_id: { in: sesiIds },
          status: { in: ['HADIR', 'TERLAMBAT'] },
        },
      }),
      prisma.absenSiswa.count({
        where: {
          sesi_id: { in: sesiIds },
          OR: [{ is_terlambat: true }, { status: 'TERLAMBAT' }],
        },
      }),
      prisma.absenGuru.count({
        where: {
          sesi_id: { in: sesiIds },
          status: { in: ['HADIR', 'TERLAMBAT'] },
        },
      }),
    ]);

    const formatJam = (dt: Date | null | undefined) => {
      if (!dt) return '--:--:--';
      return new Date(dt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };

    const detectMetode = (catatan?: string | null): 'RFID' | 'QR' | 'MANUAL' => {
      const c = (catatan || '').toUpperCase();
      if (c.includes('QR')) return 'QR';
      if (c.includes('RFID') || c.includes('SCANNER')) return 'RFID';
      return 'MANUAL';
    };

    const combined: Array<{
      id: string;
      nama: string;
      idNumber?: string;
      subLabel?: string;
      entityType: 'GURU' | 'SISWA';
      status: string;
      jam: string;
      foto?: string;
      syncedKbm?: boolean;
      metode: 'RFID' | 'QR' | 'MANUAL';
      sortTime: number;
    }> = [];

    for (const row of siswaRows) {
      const ts = row.waktu_tap || row.updated_at || new Date(0);
      const isLate = Boolean(row.is_terlambat || row.status === 'TERLAMBAT');
      combined.push({
        id: `siswa-${row.id}`,
        nama: row.Siswa?.nama_siswa || 'Siswa',
        idNumber: row.Siswa?.nisn || row.Siswa?.nis || undefined,
        subLabel: row.kelas_nama_snapshot || row.Siswa?.Kelas?.nama_kelas || 'Taruna',
        entityType: 'SISWA',
        status: isLate ? 'TERLAMBAT' : 'HADIR',
        jam: formatJam(row.waktu_tap || row.updated_at),
        foto: row.Siswa?.foto || undefined,
        syncedKbm: Boolean((row.catatan || '').toUpperCase().includes('KBM')),
        metode: detectMetode(row.catatan),
        sortTime: new Date(ts).getTime(),
      });
    }

    for (const row of guruRows) {
      const ts = row.waktu_tap || row.updated_at || new Date(0);
      const isLate = Boolean(row.status === 'TERLAMBAT');
      combined.push({
        id: `guru-${row.id}`,
        nama: row.Guru?.nama_guru || 'Guru / Pembina',
        idNumber: row.Guru?.nip || undefined,
        subLabel: (row.Guru as any)?.jenis_ptk || 'Pembina / Pendamping',
        entityType: 'GURU',
        status: isLate ? 'TERLAMBAT' : 'HADIR',
        jam: formatJam(row.waktu_tap || row.updated_at),
        foto: row.Guru?.foto || undefined,
        syncedKbm: Boolean((row.catatan || '').toUpperCase().includes('KBM')),
        metode: detectMetode(row.catatan),
        sortTime: new Date(ts).getTime(),
      });
    }

    combined.sort((a, b) => b.sortTime - a.sortTime);

    return {
      feed: combined.slice(0, 30).map(({ sortTime: _st, ...item }) => item),
      summary: {
        siswa_hadir: siswaHadirCount,
        siswa_terlambat: siswaTerlambatCount,
        guru_hadir: guruHadirCount,
        total_hadir: siswaHadirCount + guruHadirCount,
      },
    };
  }

  /**
   * 3. Pendamping & Unsur Beririsan: Ambil daftar seluruh unsur pendamping & status tap hari ini
   */
  async getPendamping(tenantId: string, params: { tanggal?: string; sesi_id?: string; jadwal_kegiatan_id?: string; jenis_kegiatan?: string }) {
    const targetDateStr = params.tanggal || this.getTodayDateStr();
    const hariEnum = this.getHariEnum(targetDateStr);
    const jenis = params.jenis_kegiatan || 'KETARUNAAN';

    // Resolusi jadwal siklus hari target (Senin=Upacara, Sel/Rab/Kam/Sab=Ketarunaan, Jumat=Dhuha)
    const resolvedSiklus = await this.resolveSiklusJadwal(tenantId, jenis, hariEnum);
    let jadwalKegiatan = null;
    if (params.jadwal_kegiatan_id) {
      jadwalKegiatan = await prisma.jadwalKegiatan.findUnique({
        where: { id: params.jadwal_kegiatan_id },
      });
    }
    // Jika jadwal yang dikirim bukan jadwal hari ini sedangkan pada hari ini ada jadwal siklus sah (misal Jumat=Dhuha), gunakan jadwal siklus hari ini
    if (
      jenis.toUpperCase() === 'KETARUNAAN' &&
      resolvedSiklus.isScheduledOnTargetDay &&
      resolvedSiklus.jadwal &&
      (!jadwalKegiatan ||
        !(Array.isArray(jadwalKegiatan.hari) && (jadwalKegiatan.hari as string[]).includes(hariEnum)))
    ) {
      jadwalKegiatan = resolvedSiklus.jadwal;
    }
    if (!jadwalKegiatan) {
      jadwalKegiatan = resolvedSiklus.jadwal;
    }

    const hariAktifList = resolvedSiklus.unionHariAktif;
    const todayHari = this.getHariEnum();
    const isTodayScheduledDay = resolvedSiklus.isScheduledOnTargetDay;
    const activeSiklusType = this.classifySiklusType(jadwalKegiatan?.nama || jadwalKegiatan?.jenis_kegiatan || jenis);

    // Tentukan hari query KBM:
    let kbmHariQuery: Hari = hariEnum;
    if (!params.tanggal && !isTodayScheduledDay && hariAktifList.length > 0) {
      kbmHariQuery = hariAktifList[0] as Hari;
    }

    // Cari atau pastikan sesi kegiatan (menggunakan jadwalKegiatan.id siklus hari ini agar 1 sesi bersama dengan Dhuha/Upacara)
    let sesiId = params.sesi_id;
    let kegiatanWaktuMulai = jadwalKegiatan?.waktu_mulai || '06:30';
    let kegiatanWaktuSelesai = jadwalKegiatan?.waktu_selesai || '08:00';

    if (!sesiId) {
      const sesi = await this.getSesiHariIni(tenantId, {
        tanggal: targetDateStr,
        jadwal_kegiatan_id: jadwalKegiatan?.id || params.jadwal_kegiatan_id,
        jenis_kegiatan: jenis,
      });
      sesiId = sesi?.id;
      if (sesi?.waktu_mulai) kegiatanWaktuMulai = sesi.waktu_mulai;
      if (sesi?.waktu_selesai) kegiatanWaktuSelesai = sesi.waktu_selesai;
    } else {
      const existingSesi = await prisma.sesiAbsensi.findUnique({
        where: { id: sesiId },
        include: { JadwalKegiatan: true },
      });
      if (existingSesi?.JadwalKegiatan) {
        kegiatanWaktuMulai = existingSesi.JadwalKegiatan.waktu_mulai || kegiatanWaktuMulai;
        kegiatanWaktuSelesai = existingSesi.JadwalKegiatan.waktu_selesai || kegiatanWaktuSelesai;
      }
    }

    // Baca kebijakan relasional 2-tier per JadwalKegiatan (tabel JadwalKegiatan + JadwalKegiatanWajibPosition):
    // Tier 1: wajibTapTerminalGuru (Wajib Tap Terminal vs Selfie Mandiri di Universal KBM)
    // Tier 2: wajibGuruBeririsan + relasi posisi jabatan OrganizationalPosition pilihan admin
    const isApelPulang = activeSiklusType === 'APEL_SORE';
    const kegiatanPolicy = await getEffectivePolicyForJadwalKegiatan(
      tenantId,
      jadwalKegiatan?.id || params.jadwal_kegiatan_id,
      jadwalKegiatan?.nama,
      jadwalKegiatan?.jenis_kegiatan || activeSiklusType
    );
    const wajibTapTerminalGuru = kegiatanPolicy.wajibTapTerminalGuru;

    // Ambil struktur penugasan jabatan organisasi yang berelasi pada JadwalKegiatan ini
    const positions = kegiatanPolicy.wajibPositionsConfigured
      ? (kegiatanPolicy.orgPositionIds.length > 0
          ? await prisma.organizationalPosition.findMany({
              where: {
                tenant_id: tenantId,
                id: { in: kegiatanPolicy.orgPositionIds },
                is_active: true,
              },
              orderBy: [{ order: 'asc' }, { name: 'asc' }],
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
            })
          : [])
      : (kegiatanPolicy.orgPositionCodes.length > 0
          ? await prisma.organizationalPosition.findMany({
              where: {
                tenant_id: tenantId,
                code: { in: kegiatanPolicy.orgPositionCodes },
                is_active: true,
              },
              orderBy: [{ order: 'asc' }, { name: 'asc' }],
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
            })
          : []);

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
    const isDhuhaMode = activeSiklusType === 'DUHA' || jenis.toUpperCase().includes('DUHA');

    // Urutkan posisi prioritas tampilan agar tetap rapi di modal & daftar pendamping
    const POSITION_ORDER: Record<string, number> = {
      KETUA_PEMBINA_TARUNA: 1,
      PEMBINA_TARUNA: 2,
      KOORDINATOR_DHUHA: 3,
      PEMBINA_ROHIS: 4,
      KESISWAAN: 5,
      KAPROG: 6,
      BPBK: 7,
      WALIKELAS: 8,
    };
    const sortedPositions = [...positions].sort((a, b) => {
      const pa = POSITION_ORDER[a.code] ?? 50 + (a.order || 0);
      const pb = POSITION_ORDER[b.code] ?? 50 + (b.order || 0);
      return pa - pb;
    });

    const getPositionIcon = (code: string) => {
      if (code === 'KETUA_PEMBINA_TARUNA' || code === 'PEMBINA_TARUNA') return '🎖️';
      if (code === 'KOORDINATOR_DHUHA' || code === 'PEMBINA_ROHIS') return '🕌';
      if (code === 'KESISWAAN') return '🧑‍🎓';
      if (code === 'KAPROG') return '🏛️';
      if (code === 'BPBK') return '🧠';
      if (code === 'WALIKELAS') return '🏫';
      if (code === 'KEPALA_SEKOLAH') return '👑';
      if (code === 'PEMBINA_ESKUL') return '🚩';
      return '👤';
    };

    // Scope target rombel kegiatan ini:
    // Jika kegiatan hanya menarget kelas tertentu (mis. Ketarunaan khusus Kelas X, Apel Datang khusus Kelas XI),
    // maka WALIKELAS dan Guru Mapel KBM Beririsan otomatis disaring hanya untuk rombel target kegiatan ini.
    const jadwalTargetSemuaKelas = jadwalKegiatan ? Boolean(jadwalKegiatan.target_semua_kelas) : true;
    const jadwalTargetKelasSet = new Set<string>(
      !jadwalTargetSemuaKelas && Array.isArray(jadwalKegiatan?.target_kelas_ids)
        ? jadwalKegiatan.target_kelas_ids
        : []
    );
    const hasRestrictedKelasScope = !jadwalTargetSemuaKelas && jadwalTargetKelasSet.size > 0;

    // 1. Seluruh Posisi Jabatan Organisasi yang berelasi pada JadwalKegiatan ini
    for (const pos of sortedPositions) {
      if (!kegiatanPolicy.wajibPositionsConfigured && (pos.code === 'KOORDINATOR_DHUHA' || pos.code === 'PEMBINA_ROHIS') && !isDhuhaMode) {
        continue;
      }
      const icon = getPositionIcon(pos.code);
      pos.organizationalAssigns.forEach((a) => {
        // Scope-aware WALIKELAS: hanya Wali Kelas yang kelas binaannya menjadi peserta kegiatan ini
        if (pos.code === 'WALIKELAS' && hasRestrictedKelasScope) {
          if (!a.kelas_id || !jadwalTargetKelasSet.has(a.kelas_id)) {
            return;
          }
        }
        const g = a.User?.Guru;
        if (g && !seenGuruIds.has(g.id)) {
          seenGuruIds.add(g.id);
          const rec = absenMap.get(g.id);
          const label = formatOrgDutyLabel({
            Position: { code: pos.code, name: pos.name },
            Kelas: a.Kelas,
            Unit: a.Unit,
          });
          result.push({
            guru_id: g.id,
            nama_guru: g.nama_guru,
            jabatan: `${icon} ${label}`,
            jabatan_kode: pos.code === 'PEMBINA_ROHIS' ? 'KOORDINATOR_DHUHA' : pos.code,
            kelas_nama: a.Kelas?.nama_kelas || undefined,
            status: (rec?.status as any) || 'BELUM_TAP',
            waktu_tap: rec?.waktu_tap ? rec.waktu_tap.toISOString() : null,
            catatan: rec?.catatan || null,
            sesi_id: sesiId || null,
          });
        }
      });
    }

    // 2. Guru Mapel KBM yang Jadwalnya BERIRISAN Jam dengan Kegiatan (dan mengajar di rombel target kegiatan yang aktif operasional)
    // Aktif jika kebijakan JadwalKegiatan mengaktifkan wajib_guru_beririsan dan kegiatan bukan Apel Pulang (APEL_SORE).
    if (!isApelPulang && kegiatanPolicy.wajibGuruBeririsan) {
      const { resolveKbmOperationalFilter } = await import('@/modules/attendance/helpers/kbm-operational-period.helper');
      const [rawKbmHariIni, kbmOpFilter] = await Promise.all([
        prisma.jadwalKBM.findMany({
          where: {
            tenant_id: tenantId,
            hari: kbmHariQuery,
            guru_id: { not: null },
            ...(hasRestrictedKelasScope ? { kelas_id: { in: Array.from(jadwalTargetKelasSet) } } : {}),
          },
          include: {
            Guru: { select: { id: true, nama_guru: true } },
            Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
            Mapel: { select: { id: true, nama_mapel: true, kelompok_mapel: true } },
          },
        }),
        resolveKbmOperationalFilter(tenantId, targetDateStr),
      ]);
      const allKbmHariIni = kbmOpFilter.filterActiveSchedules(rawKbmHariIni);

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
    }

    return {
      data: result,
      sesi_id: sesiId || null,
      jadwal_kegiatan_id: jadwalKegiatan?.id || null,
      jadwal_nama: jadwalKegiatan?.nama || null,
      siklus_aktif: activeSiklusType,
      siklus_pilar_label: this.getSiklusPilarLabel(activeSiklusType),
      is_today_scheduled_day: isTodayScheduledDay,
      schedule_day_used: kbmHariQuery,
      today_hari: todayHari,
      is_active_session: Boolean(sesiId),
      wajib_tap_terminal_guru: wajibTapTerminalGuru,
      wajib_guru_beririsan: kegiatanPolicy.wajibGuruBeririsan,
      wajib_position_codes: kegiatanPolicy.orgPositionCodes,
    };
  }

  /**
   * Cek konfigurasi sekolah: apakah guru beririsan wajib tap di Terminal Unified Kegiatan (default: true).
   * Jika false, guru disediakan kartu Sesi Kegiatan di Universal KBM untuk selfie mandiri.
   */
  async isWajibTapTerminalKegiatanGuru(tenantId: string): Promise<boolean> {
    const cfg = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'WAJIB_TAP_TERMINAL_KEGIATAN_GURU' },
      select: { value: true },
    });
    return cfg?.value !== 'false';
  }

  /**
   * Selfie Mandiri Kegiatan Guru (saat mode Wajib Tap Terminal = Nonaktif / opsional).
   * Mencatat HADIR + foto_bukti di AbsenGuru milik Sesi Kegiatan untuk memberi pengampunan telat KBM pertama.
   */
  async selfieGuruKegiatan(
    tenantId: string,
    userId: string,
    payload: {
      sesi_id?: string;
      jadwal_kegiatan_id?: string;
      jenis_kegiatan?: string;
      foto_bukti: string;
      catatan?: string;
    }
  ) {
    if (!userId) {
      throw new Error('Autentikasi user diperlukan');
    }
    if (!payload?.foto_bukti || typeof payload.foto_bukti !== 'string' || !payload.foto_bukti.trim()) {
      throw new Error('Foto bukti selfie kegiatan wajib dilampirkan');
    }

    const guru = await prisma.guru.findFirst({
      where: { tenant_id: tenantId, user_id: userId },
      select: { id: true, nama_guru: true },
    });
    if (!guru) {
      throw new Error('Akun Anda tidak terhubung dengan data Guru');
    }

    const now = new Date();
    const tz = await getTenantTimezone(tenantId);
    const tzOffset = getTenantOffsetString(tz);
    const todayStr = this.getTodayDateStr(tz);
    const hariEnum = this.getHariEnum(todayStr, tz);
    const startOfDay = new Date(`${todayStr}T00:00:00.000${tzOffset}`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999${tzOffset}`);

    // 1. Upload foto bukti ke storage jika berupa data URL base64
    let finalFotoUrl = payload.foto_bukti.trim();
    if (finalFotoUrl.startsWith('data:image/')) {
      try {
        const commaIdx = finalFotoUrl.indexOf(',');
        if (commaIdx !== -1) {
          const header = finalFotoUrl.substring(0, commaIdx);
          const base64Data = finalFotoUrl.substring(commaIdx + 1);
          const mimeMatch = header.match(/data:([^;]+)/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const buffer = Buffer.from(base64Data, 'base64');
          const ext = mimeType.split('/')[1] || 'jpeg';
          const fileName = `${Date.now()}_${guru.id.slice(0, 8)}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
          const storageKey = `uploads/tenants/${tenantId}/kegiatan-guru/${fileName}`;
          await storageService.uploadBuffer(storageKey, buffer, { contentType: mimeType });
          finalFotoUrl = `/api/${storageKey}`;
        }
      } catch (storageErr) {
        console.error('[UnifiedKegiatanService.selfieGuruKegiatan] Upload photo error:', storageErr);
      }
    }

    // 2. Resolve atau materialisasi SesiAbsensi kegiatan hari ini
    let parentSesi: any = null;
    if (payload.sesi_id && !String(payload.sesi_id).startsWith('keg_virtual_')) {
      parentSesi = await prisma.sesiAbsensi.findFirst({
        where: { id: payload.sesi_id, tenant_id: tenantId },
        include: { JadwalKegiatan: true },
      });
    }

    if (!parentSesi && payload.jadwal_kegiatan_id) {
      parentSesi = await prisma.sesiAbsensi.findFirst({
        where: {
          tenant_id: tenantId,
          jadwal_kegiatan_id: payload.jadwal_kegiatan_id,
          tanggal: { gte: startOfDay, lte: endOfDay },
        },
        include: { JadwalKegiatan: true },
        orderBy: { created_at: 'asc' },
      });
    }

    if (!parentSesi && payload.jadwal_kegiatan_id) {
      const jadwal = await prisma.jadwalKegiatan.findFirst({
        where: { id: payload.jadwal_kegiatan_id, tenant_id: tenantId },
      });
      if (jadwal) {
        const [activeTp, activeSem, sampleKelas] = await Promise.all([
          prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
          prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
          prisma.kelas.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
        ]);
        if (activeTp && activeSem && sampleKelas) {
          const startStr = (jadwal.waktu_mulai || '06:30').slice(0, 5);
          const endStr = (jadwal.waktu_selesai || '08:00').slice(0, 5);
          parentSesi = await prisma.sesiAbsensi.create({
            data: {
              tenant_id: tenantId,
              kelas_id: sampleKelas.id,
              tahun_pelajaran_id: jadwal.tahun_pelajaran_id || activeTp.id,
              semester_id: jadwal.semester_id || activeSem.id,
              tanggal: startOfDay,
              waktu_mulai: new Date(`${todayStr}T${startStr}:00.000${tzOffset}`),
              waktu_selesai: new Date(`${todayStr}T${endStr}:00.000${tzOffset}`),
              jenis_kegiatan: jadwal.nama || payload.jenis_kegiatan || 'KEGIATAN',
              jadwal_kegiatan_id: jadwal.id,
              status: 'BERLANGSUNG',
              sumber_sesi: 'TEMPLATE',
            },
            include: { JadwalKegiatan: true },
          });
        }
      }
    }

    if (!parentSesi) {
      const jenisTarget = payload.jenis_kegiatan || 'KETARUNAAN';
      const sesiToday = await this.getSesiHariIni(tenantId, {
        tanggal: todayStr,
        jenis_kegiatan: jenisTarget,
        jadwal_kegiatan_id: payload.jadwal_kegiatan_id,
      });
      if (sesiToday?.id) {
        parentSesi = await prisma.sesiAbsensi.findUnique({
          where: { id: sesiToday.id },
          include: { JadwalKegiatan: true },
        });
      }
    }

    if (!parentSesi) {
      const jenisTarget = payload.jenis_kegiatan || 'KETARUNAAN';
      const resolvedSiklus = await this.resolveSiklusJadwal(tenantId, jenisTarget, hariEnum);
      const activeJadwal = resolvedSiklus.jadwal;
      const [activeTp, activeSem, sampleKelas] = await Promise.all([
        prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
        prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
        prisma.kelas.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
      ]);
      if (activeJadwal && activeTp && activeSem && sampleKelas) {
        const startStr = (activeJadwal.waktu_mulai || '06:30').slice(0, 5);
        const endStr = (activeJadwal.waktu_selesai || '08:00').slice(0, 5);
        parentSesi = await prisma.sesiAbsensi.create({
          data: {
            tenant_id: tenantId,
            kelas_id: sampleKelas.id,
            tahun_pelajaran_id: activeTp.id,
            semester_id: activeSem.id,
            tanggal: startOfDay,
            waktu_mulai: new Date(`${todayStr}T${startStr}:00.000${tzOffset}`),
            waktu_selesai: new Date(`${todayStr}T${endStr}:00.000${tzOffset}`),
            jenis_kegiatan: activeJadwal.nama || jenisTarget,
            jadwal_kegiatan_id: activeJadwal.id,
            status: 'BERLANGSUNG',
            sumber_sesi: 'TEMPLATE',
          },
          include: { JadwalKegiatan: true },
        });
      }
    }

    if (!parentSesi) {
      throw new Error('Sesi kegiatan hari ini tidak ditemukan');
    }

    if (parentSesi.status === 'MENDATANG') {
      await prisma.sesiAbsensi.update({
        where: { id: parentSesi.id },
        data: { status: 'BERLANGSUNG', updated_at: now },
      }).catch(() => {});
    }

    const namaKegiatan = parentSesi.JadwalKegiatan?.nama || parentSesi.jenis_kegiatan || 'Kegiatan';
    const existing = await prisma.absenGuru.findUnique({
      where: {
        sesi_id_guru_id: {
          sesi_id: parentSesi.id,
          guru_id: guru.id,
        },
      },
    });

    const alreadyPresent = existing?.status === 'HADIR' && Boolean(existing?.waktu_tap);
    const effectiveTap = alreadyPresent ? existing!.waktu_tap! : now;
    const catatanFinal = payload.catatan || `Hadir via Selfie Kegiatan (${namaKegiatan})`;

    await prisma.absenGuru.upsert({
      where: {
        sesi_id_guru_id: {
          sesi_id: parentSesi.id,
          guru_id: guru.id,
        },
      },
      update: {
        status: 'HADIR',
        waktu_tap: effectiveTap,
        foto_bukti: finalFotoUrl,
        catatan: alreadyPresent ? (existing?.catatan || catatanFinal) : catatanFinal,
        updated_at: now,
      },
      create: {
        tenant_id: tenantId,
        sesi_id: parentSesi.id,
        guru_id: guru.id,
        status: 'HADIR',
        waktu_tap: effectiveTap,
        foto_bukti: finalFotoUrl,
        catatan: catatanFinal,
        tahun_pelajaran_id: parentSesi.tahun_pelajaran_id,
        semester_id: parentSesi.semester_id,
        created_at: now,
        updated_at: now,
      },
    });

    emitDomainEvent({
      event_type: 'SESI_UPDATED',
      tenant_id: tenantId,
      source_service: 'unified-kegiatan.service',
      payload: {
        sesi_id: parentSesi.id,
        guru_id: guru.id,
        jenis_kegiatan: namaKegiatan,
      },
    }).catch(() => {});

    return {
      success: true,
      message: alreadyPresent
        ? `Foto bukti selfie ${namaKegiatan} diperbarui. Pengampunan telat KBM beririsan tetap aktif.`
        : `Selfie kehadiran ${namaKegiatan} berhasil dicatat. Pengampunan keterlambatan KBM pertama Anda aktif.`,
      sesi_id: parentSesi.id,
      guru_id: guru.id,
      foto_bukti: finalFotoUrl,
      waktu_tap: effectiveTap.toISOString(),
      already_present: alreadyPresent,
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
      // Cari sesi kegiatan yang aktif hari ini (dinamis sesuai siklus 5 kegiatan hari ini)
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

    // Jika sesi hari ini belum ter-generate oleh cron, materialisasi otomatis dari JadwalKegiatan siklus hari ini
    if (!parentSesi) {
      const jenisTarget = payload.jenis_kegiatan || 'KETARUNAAN';
      const resolvedSiklus = await this.resolveSiklusJadwal(tenantId, jenisTarget, hariEnum);
      const activeJadwal = resolvedSiklus.jadwal;
      const [activeTp, activeSem, sampleKelas] = await Promise.all([
        prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
        prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
        prisma.kelas.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
      ]);

      if (activeJadwal && activeTp && activeSem && sampleKelas) {
        const tz = await getTenantTimezone(tenantId);
        const tzOffset = getTenantOffsetString(tz);
        const startStr = (activeJadwal.waktu_mulai || '06:30').slice(0, 5);
        const endStr = (activeJadwal.waktu_selesai || '08:00').slice(0, 5);
        parentSesi = await prisma.sesiAbsensi.create({
          data: {
            tenant_id: tenantId,
            kelas_id: sampleKelas.id,
            tahun_pelajaran_id: activeTp.id,
            semester_id: activeSem.id,
            tanggal: new Date(`${todayStr}T00:00:00.000${tzOffset}`),
            waktu_mulai: new Date(`${todayStr}T${startStr}:00.000${tzOffset}`),
            waktu_selesai: new Date(`${todayStr}T${endStr}:00.000${tzOffset}`),
            jenis_kegiatan: activeJadwal.nama || jenisTarget,
            jadwal_kegiatan_id: activeJadwal.id,
            status: 'BERLANGSUNG',
            sumber_sesi: 'TEMPLATE',
          },
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

    // 1. Catat murni di AbsenGuru milik Sesi Kegiatan (idempoten penuh: pertahankan waktu_tap awal jika sudah HADIR)
    const existingGuruKegiatan = await prisma.absenGuru.findUnique({
      where: {
        sesi_id_guru_id: {
          sesi_id: activeSesiId,
          guru_id: payload.guru_id,
        },
      },
    });
    const preserveGuruTap = existingGuruKegiatan?.status === 'HADIR' && existingGuruKegiatan?.waktu_tap;
    const effectiveGuruTap = payload.status === 'HADIR' ? (preserveGuruTap ? existingGuruKegiatan.waktu_tap : now) : undefined;

    await prisma.absenGuru.upsert({
      where: {
        sesi_id_guru_id: {
          sesi_id: activeSesiId,
          guru_id: payload.guru_id,
        },
      },
      update: {
        status: payload.status,
        waktu_tap: effectiveGuruTap,
        catatan: existingGuruKegiatan?.status === 'HADIR' && payload.status === 'HADIR'
          ? (existingGuruKegiatan.catatan || payload.catatan || `Hadir via Terminal Kegiatan (${namaKegiatan})`)
          : (payload.catatan || `Hadir via Terminal Kegiatan (${namaKegiatan})`),
        updated_at: now,
      },
      create: {
        tenant_id: tenantId,
        sesi_id: activeSesiId,
        guru_id: payload.guru_id,
        status: payload.status,
        waktu_tap: effectiveGuruTap,
        catatan: payload.catatan || `Hadir via Terminal Kegiatan (${namaKegiatan})`,
        tahun_pelajaran_id: parentSesi.tahun_pelajaran_id,
        semester_id: parentSesi.semester_id,
        created_at: now,
        updated_at: now,
      },
    });

    // 2. Grace Period / Pengampunan Telat KBM (TIDAK langsung membuka/menghadirkan guru di KBM!)
    // Guru wajib membuka sesi atau retake foto langsung di sesi KBM pertamanya agar tidak menjadi celah mangkir.
    let hasOverlappingKbm = false;

    if (payload.status === 'HADIR') {
      const kegiatanMulai = parentSesi.JadwalKegiatan?.waktu_mulai || '06:30';
      const kegiatanSelesai = parentSesi.JadwalKegiatan?.waktu_selesai || '08:00';

      const overlappingKbms = await prisma.jadwalKBM.findMany({
        where: {
          tenant_id: tenantId,
          guru_id: payload.guru_id,
          hari: hariEnum,
        },
        select: {
          id: true,
          jam_mulai: true,
          jam_selesai: true,
        },
      });

      hasOverlappingKbm = overlappingKbms.some((kbm) =>
        this.isTimeOverlapping(kegiatanMulai, kegiatanSelesai, kbm.jam_mulai, kbm.jam_selesai)
      );
    }

    return {
      success: true,
      message: hasOverlappingKbm
        ? `Presensi kegiatan dicatat — pengampunan keterlambatan aktif saat guru membuka sesi KBM pertamanya`
        : `Presensi pendamping berhasil dicatat`,
      synced_kbm: false,
      grace_kbm_applied: hasOverlappingKbm,
      kbm_sesi_id: undefined,
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

    // 1. Prioritas 1: Cari Guru / Pembina berdasarkan id, no_rfid, NIP, atau NUPTK
    const guru = await prisma.guru.findFirst({
      where: {
        tenant_id: tenantId,
        OR: [
          { id: token },
          { no_rfid: token },
          { nip: token },
          { nuptk: token },
        ],
      },
    });

    if (guru) {
      const jenis = payload.jenis_kegiatan || 'KETARUNAAN';
      const todayStr = this.getTodayDateStr();
      const hariEnum = this.getHariEnum(todayStr);

      // Smart Routing & Multi-Slot Sync untuk Guru saat terdapat ≥ 2 slot paralel hari ini
      // (mis. Ketarunaan Kelas X 06:30–07:50 & Apel Datang Kelas XI 07:00–07:15):
      // 1× tap kartu guru otomatis dicatat pada seluruh slot paralel tempat guru tersebut bertugas
      // (Wali Kelas sesuai rombel target, Guru KBM beririsan di rombel target, atau Jabatan Lintas Kelas).
      let matchedParallelJadwals: any[] = [];
      if (jenis.toUpperCase() === 'KETARUNAAN') {
        const resolvedSiklus = await this.resolveSiklusJadwal(tenantId, jenis, hariEnum);
        const curTime = resolvedSiklus.currentTimeStr;
        const isAfternoon = curTime >= '13:00';
        const todayCandidates = (resolvedSiklus.todaySchedules || []).filter((s) => {
          const siklus = this.classifySiklusType(s.nama || s.jenis_kegiatan);
          return isAfternoon ? siklus === 'APEL_SORE' : siklus !== 'APEL_SORE';
        });

        if (todayCandidates.length > 1) {
          const [guruOrgAssigns, guruKbmsToday] = await Promise.all([
            guru.user_id
              ? prisma.organizationalAssignment.findMany({
                  where: {
                    tenant_id: tenantId,
                    user_id: guru.user_id,
                    is_active: true,
                    Position: { is_active: true },
                  },
                  include: { Position: { select: { id: true, code: true } } },
                })
              : Promise.resolve([]),
            prisma.jadwalKBM.findMany({
              where: {
                tenant_id: tenantId,
                guru_id: guru.id,
                hari: hariEnum,
              },
              select: { kelas_id: true, jam_mulai: true, jam_selesai: true },
            }),
          ]);

          for (const slot of todayCandidates) {
            const slotPolicy = await getEffectivePolicyForJadwalKegiatan(
              tenantId,
              slot.id,
              slot.nama,
              slot.jenis_kegiatan
            );
            const slotSemua = Boolean(slot.target_semua_kelas);
            const slotKelasSet = new Set<string>(
              !slotSemua && Array.isArray(slot.target_kelas_ids) ? slot.target_kelas_ids : []
            );
            const isSlotRestricted = !slotSemua && slotKelasSet.size > 0;

            const hasOrgDutyInSlot = guruOrgAssigns.some((a: any) => {
              const posId = a.Position?.id;
              const posCode = String(a.Position?.code || '').toUpperCase();
              const isAllowedPos = slotPolicy.wajibPositionsConfigured
                ? Boolean(posId && slotPolicy.orgPositionIds.includes(posId))
                : slotPolicy.orgPositionCodes.includes(posCode);
              if (!isAllowedPos) return false;
              if (posCode === 'WALIKELAS' && isSlotRestricted) {
                return Boolean(a.kelas_id && slotKelasSet.has(a.kelas_id));
              }
              return true;
            });

            const hasKbmInSlot =
              slotPolicy.wajibGuruBeririsan &&
              guruKbmsToday.some((kbm) => {
                if (isSlotRestricted && (!kbm.kelas_id || !slotKelasSet.has(kbm.kelas_id))) {
                  return false;
                }
                return this.isTimeOverlapping(
                  slot.waktu_mulai,
                  slot.waktu_selesai,
                  kbm.jam_mulai,
                  kbm.jam_selesai
                );
              });

            if (hasOrgDutyInSlot || hasKbmInSlot) {
              matchedParallelJadwals.push(slot);
            }
          }
        }
      }

      if (matchedParallelJadwals.length > 0) {
        let primaryTapResult: any = null;
        const recordedNames: string[] = [];

        for (const slot of matchedParallelJadwals) {
          const sesiSlot = await this.getSesiHariIni(tenantId, {
            tanggal: todayStr,
            jadwal_kegiatan_id: slot.id,
            jenis_kegiatan: jenis,
          });
          const res = await this.tapPendamping(tenantId, {
            guru_id: guru.id,
            sesi_id: sesiSlot?.id,
            status: 'HADIR',
            jenis_kegiatan: jenis,
            jadwal_kegiatan_id: slot.id,
            catatan: `Hadir via Scanner RFID Universal (${slot.nama})`,
          });
          if (!primaryTapResult) primaryTapResult = res;
          recordedNames.push(slot.nama);
        }

        return {
          ...primaryTapResult,
          message:
            recordedNames.length > 1
              ? `Presensi ${guru.nama_guru} tercatat pada ${recordedNames.join(' & ')}`
              : primaryTapResult?.message || `Presensi ${guru.nama_guru} tercatat pada ${recordedNames[0]}`,
          action: 'HADIR_GURU',
          entity_type: 'GURU',
          guru: {
            id: guru.id,
            nama_guru: guru.nama_guru,
            nip: guru.nip,
            foto: guru.foto || null,
            jenis_ptk: (guru as any).jenis_ptk || null,
          },
        };
      }

      let sesiId = payload.sesi_id;

      if (!sesiId) {
        const sesiToday = await this.getSesiHariIni(tenantId, {
          tanggal: todayStr,
          jadwal_kegiatan_id: payload.jadwal_kegiatan_id,
          jenis_kegiatan: jenis,
        });
        sesiId = sesiToday?.id;
      }

      // Panggil engine 1 Tap 2 Record untuk Guru/Pembina
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
        action: 'HADIR_GURU',
        entity_type: 'GURU',
        guru: {
          id: guru.id,
          nama_guru: guru.nama_guru,
          nip: guru.nip,
          foto: guru.foto || null,
          jenis_ptk: (guru as any).jenis_ptk || null,
        },
      };
    }

    // 2. Prioritas 2: Cari Siswa / Taruna berdasarkan id, no_rfid, NIS, atau NISN
    const siswa = await prisma.siswa.findFirst({
      where: {
        tenant_id: tenantId,
        OR: [
          { id: token },
          { no_rfid: token },
          { nis: token },
          { nisn: token },
        ],
      },
      include: {
        Kelas: true,
      },
    });

    if (!siswa) {
      throw new Error(`Kartu RFID atau identitas "${token}" tidak terdaftar di sistem (Guru maupun Siswa)`);
    }

    // Cari SiswaAkademik aktif siswa
    const sa = await prisma.siswaAkademik.findFirst({
      where: {
        siswa_id: siswa.id,
        status: 'AKTIF',
      },
      include: {
        kelas: true,
        tahunPelajaran: true,
        semester: true,
      },
    });

    const [activeTp, activeSem] = await Promise.all([
      prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
      prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
    ]);
    const fallbackTp = activeTp || (await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId }, select: { id: true } }));
    const fallbackSem = activeSem || (await prisma.semester.findFirst({ where: { tenant_id: tenantId }, select: { id: true } }));

    const targetKelasId = sa?.kelas_id || siswa.kelas_id;
    const targetKelasNama = sa?.kelas?.nama_kelas || siswa.Kelas?.nama_kelas || '-';
    const targetTingkat = sa?.kelas?.tingkat || (siswa.Kelas as any)?.tingkat || null;
    const targetTpId = sa?.tahun_pelajaran_id || fallbackTp?.id || 'default-tp';
    const targetSemId = sa?.semester_id || fallbackSem?.id || 'default-sem';

    const jenis = payload.jenis_kegiatan || 'KETARUNAAN';
    const todayStr = this.getTodayDateStr();
    const hariEnum = this.getHariEnum(todayStr);
    const dateRange = this.getDateRange(todayStr);

    // Resolusi siklus jadwal kegiatan hari ini (Upacara, Ketarunaan, Dhuha, Apel)
    // Smart Rombel Routing: jika ada jadwal paralel beda rombel/tingkat (mis. Ketarunaan Kelas X 06:30–07:50
    // dan Ketarunaan Kelas XI 06:30–07:30), otomatis arahkan siswa ke slot jadwal yang sesuai rombelnya.
    const resolvedSiklus = await this.resolveSiklusJadwal(tenantId, jenis, hariEnum);
    const todayCandidates = resolvedSiklus.todaySchedules || [];
    const curTime = resolvedSiklus.currentTimeStr;

    const matchesStudentRombel = (j: any) =>
      !targetKelasId ||
      Boolean(j.target_semua_kelas) ||
      (Array.isArray(j.target_kelas_ids) && j.target_kelas_ids.includes(targetKelasId));

    const isExactStudentRombel = (j: any) =>
      Boolean(targetKelasId) &&
      !j.target_semua_kelas &&
      Array.isArray(j.target_kelas_ids) &&
      j.target_kelas_ids.includes(targetKelasId);

    const isInScheduleWindow = (j: any) => {
      if (!j.waktu_mulai || !j.waktu_selesai) return false;
      return curTime >= String(j.waktu_mulai).slice(0, 5) && curTime <= String(j.waktu_selesai).slice(0, 5);
    };

    const rombelMatchedToday = todayCandidates.filter(matchesStudentRombel);
    let activeJadwal = resolvedSiklus.jadwal;

    if (rombelMatchedToday.length === 1) {
      activeJadwal = rombelMatchedToday[0];
    } else if (rombelMatchedToday.length > 1) {
      // 1. Utamakan slot yang sedang berlangsung & cocok rombel spesifik
      const inWindowMatched = rombelMatchedToday.filter(isInScheduleWindow);
      if (inWindowMatched.length > 0) {
        activeJadwal = inWindowMatched.find(isExactStudentRombel) || inWindowMatched[0];
      } else {
        // 2. Utamakan pagi vs sore berdasarkan jam saat ini, lalu rombel spesifik
        const isAfternoon = curTime >= '13:00';
        const bucketMatched = rombelMatchedToday.filter((j) =>
          isAfternoon
            ? this.classifySiklusType(j.nama || j.jenis_kegiatan) === 'APEL_SORE'
            : this.classifySiklusType(j.nama || j.jenis_kegiatan) !== 'APEL_SORE'
        );
        const pool = bucketMatched.length > 0 ? bucketMatched : rombelMatchedToday;
        activeJadwal = pool.find(isExactStudentRombel) || pool[0];
      }
    }

    const effectiveJadwalId = activeJadwal?.id || payload.jadwal_kegiatan_id;

    // Cari sesi kegiatan yang sesuai untuk kelas siswa tersebut hari ini
    let studentSesi: any = null;
    if (targetKelasId) {
      studentSesi = await prisma.sesiAbsensi.findFirst({
        where: {
          tenant_id: tenantId,
          kelas_id: targetKelasId,
          tanggal: { gte: dateRange.gte, lte: dateRange.lte },
          OR: [
            ...(effectiveJadwalId ? [{ jadwal_kegiatan_id: effectiveJadwalId }] : []),
            { jenis_kegiatan: { contains: jenis, mode: 'insensitive' as const } },
            ...(activeJadwal?.nama ? [{ jenis_kegiatan: { contains: activeJadwal.nama, mode: 'insensitive' as const } }] : []),
            ...(activeJadwal?.nama ? [{ JadwalKegiatan: { nama: { contains: activeJadwal.nama, mode: 'insensitive' as const } } }] : []),
          ],
        },
        orderBy: { waktu_mulai: 'asc' },
      });
    }

    // Jika sesi kegiatan kelas ini belum ada hari ini, materialisasi otomatis dengan status BERLANGSUNG
    if (!studentSesi && targetKelasId) {
      const tz = await getTenantTimezone(tenantId);
      const tzOffset = getTenantOffsetString(tz);
      const startStr = (activeJadwal?.waktu_mulai || '06:30').slice(0, 5);
      const endStr = (activeJadwal?.waktu_selesai || '08:00').slice(0, 5);
      const sessionName = activeJadwal?.nama || (jenis.toUpperCase() === 'KETARUNAAN' ? 'Ketarunaan' : jenis);

      studentSesi = await prisma.sesiAbsensi.create({
        data: {
          tenant_id: tenantId,
          kelas_id: targetKelasId,
          tahun_pelajaran_id: targetTpId,
          semester_id: targetSemId,
          tanggal: new Date(`${todayStr}T00:00:00.000${tzOffset}`),
          waktu_mulai: new Date(`${todayStr}T${startStr}:00.000${tzOffset}`),
          waktu_selesai: new Date(`${todayStr}T${endStr}:00.000${tzOffset}`),
          jenis_kegiatan: sessionName,
          jadwal_kegiatan_id: effectiveJadwalId || null,
          status: 'BERLANGSUNG',
          sumber_sesi: 'TEMPLATE',
        },
      });
    } else if (!studentSesi && payload.sesi_id) {
      studentSesi = await prisma.sesiAbsensi.findUnique({
        where: { id: payload.sesi_id },
      });
    }

    if (!studentSesi) {
      throw new Error(`Sesi kegiatan ${jenis} untuk kelas ${targetKelasNama} belum dapat dibuat atau ditemukan.`);
    }

    // Buka sesi jika masih MENDATANG
    if (studentSesi.status === 'MENDATANG' || studentSesi.status === 'BELUM_DIMULAI') {
      studentSesi = await prisma.sesiAbsensi.update({
        where: { id: studentSesi.id },
        data: { status: 'BERLANGSUNG' },
      });
    }

    // Hitung toleransi keterlambatan
    const now = new Date();
    const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let isLate = false;
    let menitTerlambat = 0;

    if (studentSesi.waktu_mulai) {
      const TOLERANSI_KEGIATAN_MENIT = 15;
      const diffMs = now.getTime() - studentSesi.waktu_mulai.getTime();
      if (diffMs > TOLERANSI_KEGIATAN_MENIT * 60 * 1000) {
        isLate = true;
        menitTerlambat = Math.floor(diffMs / 60000);
      }
    }

    // Ambil atau resolve SiswaAkademik aktif
    let finalSaId = sa?.id;
    if (!finalSaId) {
      const fallbackSa = await prisma.siswaAkademik.findFirst({
        where: { siswa_id: siswa.id },
        select: { id: true },
      });
      finalSaId = fallbackSa?.id;
    }

    if (!finalSaId) {
      throw new Error(`Data akademik siswa ${siswa.nama_siswa} tidak valid atau belum terdaftar.`);
    }

    // Upsert AbsenSiswa pada sesi kegiatan tersebut (idempoten penuh: pertahankan waktu_tap & status terlambat awal jika sudah HADIR)
    const existingAbsen = await prisma.absenSiswa.findFirst({
      where: {
        sesi_id: studentSesi.id,
        siswa_akademik_id: finalSaId,
      },
    });

    const alreadyHadirKegiatan = existingAbsen?.status === 'HADIR';
    const effectiveIsLate = alreadyHadirKegiatan ? Boolean(existingAbsen?.is_terlambat) : isLate;
    const effectiveMenitTelat = alreadyHadirKegiatan ? (existingAbsen?.menit_keterlambatan ?? 0) : (isLate ? menitTerlambat : 0);
    const effectiveTapTime = alreadyHadirKegiatan && existingAbsen?.waktu_tap ? existingAbsen.waktu_tap : now;

    if (existingAbsen) {
      await prisma.absenSiswa.update({
        where: {
          id_created_at: {
            id: existingAbsen.id,
            created_at: (existingAbsen as any).created_at,
          },
        },
        data: {
          status: 'HADIR',
          is_terlambat: effectiveIsLate,
          menit_keterlambatan: effectiveMenitTelat,
          waktu_tap: effectiveTapTime,
          catatan: alreadyHadirKegiatan ? (existingAbsen.catatan || `Hadir via Terminal Kegiatan (${jenis})`) : `Hadir via Terminal Kegiatan (${jenis})`,
          updated_at: now,
        },
      });
    } else {
      await prisma.absenSiswa.create({
        data: {
          tenant_id: tenantId,
          sesi_id: studentSesi.id,
          siswa_id: siswa.id,
          siswa_akademik_id: finalSaId,
          status: 'HADIR',
          is_terlambat: effectiveIsLate,
          menit_keterlambatan: effectiveMenitTelat,
          waktu_tap: effectiveTapTime,
          kelas_id_snapshot: targetKelasId || undefined,
          kelas_nama_snapshot: targetKelasNama,
          tingkat_snapshot: targetTingkat,
          tahun_pelajaran_id_snapshot: targetTpId || undefined,
          catatan: `Hadir via Terminal Kegiatan (${jenis})`,
        },
      });
    }

    // 2b. Eksekusi 1-Tap 2-Record (Dual Tap) untuk Siswa: sinkronkan ke Sesi KBM kelas yang beririsan jamnya
    let syncedKbm = false;
    const jadwalKbmOpened: string[] = [];

    if (targetKelasId) {
      const kegiatanMulai = activeJadwal?.waktu_mulai || '06:30';
      const kegiatanSelesai = activeJadwal?.waktu_selesai || '08:00';

      const classKbms = await prisma.jadwalKBM.findMany({
        where: {
          tenant_id: tenantId,
          kelas_id: targetKelasId,
          hari: hariEnum,
        },
        orderBy: { slot_index: 'asc' },
      });

      const overlappingKbms = classKbms.filter((kbm) =>
        this.isTimeOverlapping(kegiatanMulai, kegiatanSelesai, kbm.jam_mulai, kbm.jam_selesai)
      );

      if (overlappingKbms.length > 0) {
        const tz = await getTenantTimezone(tenantId);
        const tzOffset = getTenantOffsetString(tz);
        const firstOverlap = overlappingKbms[0];

        // Cari seluruh slot berurutan untuk guru+mapel yang sama pada hari ini
        const relatedSlots = classKbms.filter(
          (s) => s.guru_id === firstOverlap.guru_id && s.mapel_id === firstOverlap.mapel_id
        );
        const firstSlot = relatedSlots[0] || firstOverlap;
        const lastSlot = relatedSlots[relatedSlots.length - 1] || firstOverlap;
        const activeScheduleIds = relatedSlots.map((s) => s.id);

        const waktuMulaiSesi = new Date(`${todayStr}T${(firstSlot.jam_mulai || '07:00').slice(0, 5)}:00.000${tzOffset}`);
        const waktuSelesaiSesi = new Date(`${todayStr}T${(lastSlot.jam_selesai || '08:30').slice(0, 5)}:00.000${tzOffset}`);

        let kbmSesi = await prisma.sesiAbsensi.findFirst({
          where: {
            tenant_id: tenantId,
            OR: [
              { jadwal_kbm_id: { in: activeScheduleIds } },
              {
                kelas_id: firstOverlap.kelas_id,
                mapel_id: firstOverlap.mapel_id,
                jenis_kegiatan: 'KBM',
              },
            ],
            tanggal: new Date(todayStr),
          },
        });

        if (!kbmSesi) {
          kbmSesi = await prisma.sesiAbsensi.create({
            data: {
              tenant_id: tenantId,
              jadwal_kbm_id: firstSlot.id,
              kelas_id: firstOverlap.kelas_id,
              guru_id: firstOverlap.guru_id,
              mapel_id: firstOverlap.mapel_id,
              tahun_pelajaran_id: firstOverlap.tahun_pelajaran_id,
              semester_id: firstOverlap.semester_id,
              jenis_kegiatan: 'KBM',
              status: 'BERLANGSUNG',
              tanggal: new Date(todayStr),
              waktu_mulai: waktuMulaiSesi,
              waktu_selesai: waktuSelesaiSesi,
              created_at: now,
              updated_at: now,
            },
          });
        } else if (kbmSesi.status === 'MENDATANG' || kbmSesi.status === 'BELUM_DIMULAI') {
          kbmSesi = await prisma.sesiAbsensi.update({
            where: { id: kbmSesi.id },
            data: {
              status: 'BERLANGSUNG',
              waktu_mulai: kbmSesi.waktu_mulai || waktuMulaiSesi,
              waktu_selesai: kbmSesi.waktu_selesai || waktuSelesaiSesi,
              updated_at: now,
            },
          });
        }

        const existingKbmAbsen = await prisma.absenSiswa.findFirst({
          where: {
            sesi_id: kbmSesi.id,
            siswa_akademik_id: finalSaId,
          },
        });

        const kbmCatatan = `Hadir via Dual-Tap Kegiatan + KBM (${jenis})`;
        if (existingKbmAbsen) {
          const alreadyHadirKbm = existingKbmAbsen.status === 'HADIR';
          await prisma.absenSiswa.update({
            where: {
              id_created_at: {
                id: existingKbmAbsen.id,
                created_at: (existingKbmAbsen as any).created_at,
              },
            },
            data: {
              status: 'HADIR',
              is_terlambat: alreadyHadirKbm ? Boolean(existingKbmAbsen.is_terlambat) : effectiveIsLate,
              menit_keterlambatan: alreadyHadirKbm ? (existingKbmAbsen.menit_keterlambatan ?? 0) : effectiveMenitTelat,
              waktu_tap: (alreadyHadirKbm && existingKbmAbsen.waktu_tap) ? existingKbmAbsen.waktu_tap : effectiveTapTime,
              catatan: alreadyHadirKbm ? (existingKbmAbsen.catatan || kbmCatatan) : kbmCatatan,
              updated_at: now,
            },
          });
        } else {
          await prisma.absenSiswa.create({
            data: {
              tenant_id: tenantId,
              sesi_id: kbmSesi.id,
              siswa_id: siswa.id,
              siswa_akademik_id: finalSaId,
              status: 'HADIR',
              is_terlambat: effectiveIsLate,
              menit_keterlambatan: effectiveMenitTelat,
              waktu_tap: effectiveTapTime,
              kelas_id_snapshot: targetKelasId || undefined,
              kelas_nama_snapshot: targetKelasNama,
              tingkat_snapshot: targetTingkat,
              tahun_pelajaran_id_snapshot: targetTpId || undefined,
              catatan: kbmCatatan,
            },
          });
        }

        syncedKbm = true;
        jadwalKbmOpened.push(kbmSesi.id);
      }
    }

    // Emit non-blocking domain event hanya pada tap pertama (idempoten: tidak spam notifikasi Orang Tua saat tap ulang)
    if (!alreadyHadirKegiatan) {
      emitDomainEvent({
        event_type: 'attendance.session.tap',
        tenant_id: tenantId,
        source_service: 'unified-kegiatan',
        payload: {
          student_id: siswa.id,
          sesi_id: studentSesi.id,
          status: effectiveIsLate ? 'TERLAMBAT' : 'HADIR',
          jenis_kegiatan: jenis,
          mapel: jenis,
          keterangan: `Kegiatan ${jenis}${effectiveIsLate ? ` (Terlambat ${effectiveMenitTelat} menit)` : ''}`,
          tap_time: effectiveTapTime.toISOString(),
          source: 'UNIFIED_KEGIATAN',
        },
      }).catch(() => {});
    }

    return {
      success: true,
      action: 'HADIR_SISWA',
      entity_type: 'SISWA',
      status: 'HADIR',
      is_terlambat: effectiveIsLate,
      already_tapped: alreadyHadirKegiatan,
      synced_kbm: syncedKbm,
      jadwal_kbm_opened: jadwalKbmOpened,
      message: alreadyHadirKegiatan
        ? `Sudah tercatat hadir sebelumnya: ${siswa.nama_siswa} (${targetKelasNama})`
        : effectiveIsLate
        ? `Presensi taruna terlambat: ${siswa.nama_siswa} (${targetKelasNama})`
        : syncedKbm
        ? `Dual-Tap Berhasil (Kegiatan + KBM): ${siswa.nama_siswa} (${targetKelasNama})`
        : `Presensi taruna/siswa berhasil dicatat: ${siswa.nama_siswa} (${targetKelasNama})`,
      jam: jamStr,
      siswa: {
        id: siswa.id,
        nama_siswa: siswa.nama_siswa,
        nis: siswa.nis,
        nisn: siswa.nisn,
        nama_kelas: targetKelasNama,
        foto: (siswa as any).foto_profile_url || (siswa as any).foto || null,
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
    scope_periode?: '1_tahun' | '1_semester' | '1_bulan' | 'kustom';
    bulan_ym?: string;
    mode_agenda?: 'SEMUA_SIKLUS' | 'APEL_PAGI' | 'UPACARA' | 'KETARUNAAN' | 'LATIHAN_KETARUNAAN' | 'DUHA' | 'APEL_SORE';
  }) {
    const jenis = params?.jenis_kegiatan || 'KETARUNAAN';
    const isKetarunaanRadar = jenis.toUpperCase().includes('KETARUNAAN');
    const modeAgenda = params?.mode_agenda || 'SEMUA_SIKLUS';

    const activeTp = params?.tahun_pelajaran_id
      ? { id: params.tahun_pelajaran_id }
      : await prisma.tahunPelajaran.findFirst({
          where: { tenant_id: tenantId, is_active: true },
        });

    // Jika radar KETARUNAAN, ambil daftar kelas peserta ketarunaan (misal 20 Rombel Kelas X)
    // dan libatkan seluruh siklus apel disiplin taruna: Upacara (Senin), Ketarunaan (Sel,Rab,Kam,Sab), Dhuha (Jum'at), & Apel Sore
    let ketarunaanTargetKelasIds: string[] = [];
    if (isKetarunaanRadar) {
      const ketJadwal = params?.jadwal_kegiatan_id
        ? await prisma.jadwalKegiatan.findUnique({ where: { id: params.jadwal_kegiatan_id } })
        : await prisma.jadwalKegiatan.findFirst({
            where: {
              tenant_id: tenantId,
              OR: [
                { nama: { contains: 'KETARUNAAN', mode: 'insensitive' } },
                { jenis_kegiatan: { contains: 'KETARUNAAN', mode: 'insensitive' } },
              ],
            },
          });

      if (ketJadwal && !ketJadwal.target_semua_kelas && Array.isArray(ketJadwal.target_kelas_ids)) {
        ketarunaanTargetKelasIds = (ketJadwal.target_kelas_ids as any[]).map(String).filter(Boolean);
      }
    }

    const baseSesiWhere: any = {
      tenant_id: tenantId,
      ...(activeTp?.id ? { tahun_pelajaran_id: activeTp.id } : {}),
    };

    if (isKetarunaanRadar) {
      if (ketarunaanTargetKelasIds.length > 0) {
        baseSesiWhere.kelas_id = { in: ketarunaanTargetKelasIds };
      }
      baseSesiWhere.OR = [
        { jenis_kegiatan: { in: ['UPACARA', 'Upacara', 'KETARUNAAN', 'Ketarunaan', 'DUHA', 'Duha', 'APEL_SORE', 'Apel Pulang', 'Apel Pulang Siswa'] } },
        { JadwalKegiatan: { nama: { in: ['Upacara', 'Ketarunaan', 'Duha', 'Apel Pulang'] } } },
      ];
    } else {
      baseSesiWhere.OR = [
        { jenis_kegiatan: { contains: jenis, mode: 'insensitive' } },
        { JadwalKegiatan: { nama: { contains: jenis, mode: 'insensitive' } } },
      ];
      if (params?.jadwal_kegiatan_id) {
        baseSesiWhere.jadwal_kegiatan_id = params.jadwal_kegiatan_id;
      }
    }

    const allYearSesiRaw = await prisma.sesiAbsensi.findMany({
      where: baseSesiWhere,
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

    // Saring keluar sesi placeholder/template MENDATANG yang belum pernah dieksekusi (0 AbsenSiswa & 0 AbsenGuru)
    const allExecutedYearSesi = allYearSesiRaw.filter(
      (s) => !(s.status === 'MENDATANG' && s._count.AbsenSiswa === 0 && s._count.AbsenGuru === 0)
    );
    const basePool = allExecutedYearSesi.length > 0 ? allExecutedYearSesi : allYearSesiRaw;

    // Daftar bulan unik yang memiliki sesi terlaksana (misal ['2026-10', '2026-09'])
    const availableMonthsSet = new Set<string>();
    for (const s of basePool) {
      availableMonthsSet.add(s.tanggal.toISOString().slice(0, 7));
    }
    const available_months = Array.from(availableMonthsSet).sort().reverse();

    // Terapkan filter Scope Periode (1 Tahun / 1 Semester / 1 Bulan / Kustom)
    let periodFilteredPool = [...basePool];
    const scope = params?.scope_periode;

    if (scope === '1_semester') {
      const targetSemId = params?.semester_id
        ? params.semester_id
        : (await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }))?.id;
      if (targetSemId) {
        const semFiltered = periodFilteredPool.filter((s) => s.semester_id === targetSemId);
        if (semFiltered.length > 0) periodFilteredPool = semFiltered;
      }
    } else if (scope === '1_bulan') {
      if (params?.bulan_ym && params.bulan_ym !== 'latest_30d') {
        periodFilteredPool = periodFilteredPool.filter((s) => s.tanggal.toISOString().slice(0, 7) === params.bulan_ym);
      } else if (periodFilteredPool.length > 0) {
        const maxDateMs = periodFilteredPool[periodFilteredPool.length - 1].tanggal.getTime();
        const minDateMs = maxDateMs - 30 * 24 * 3600 * 1000;
        periodFilteredPool = periodFilteredPool.filter((s) => {
          const t = s.tanggal.getTime();
          return t >= minDateMs && t <= maxDateMs;
        });
      }
    } else if (params?.tanggal_mulai || params?.tanggal_selesai) {
      const gteMs = params.tanggal_mulai ? new Date(`${params.tanggal_mulai}T00:00:00.000Z`).getTime() : 0;
      const lteMs = params.tanggal_selesai ? new Date(`${params.tanggal_selesai}T23:59:59.999Z`).getTime() : Number.MAX_SAFE_INTEGER;
      const dateFiltered = periodFilteredPool.filter((s) => {
        const t = s.tanggal.getTime();
        return t >= gteMs && t <= lteMs;
      });
      if (dateFiltered.length > 0 || scope === 'kustom') {
        periodFilteredPool = dateFiltered;
      } else if (periodFilteredPool.length > 0) {
        const maxDateMs = periodFilteredPool[periodFilteredPool.length - 1].tanggal.getTime();
        const minDateMs = maxDateMs - 30 * 24 * 3600 * 1000;
        periodFilteredPool = periodFilteredPool.filter((s) => s.tanggal.getTime() >= minDateMs && s.tanggal.getTime() <= maxDateMs);
      }
    }

    // Helper klasifikasi 4 pilar agenda siklus taruna
    const classifyAgenda = (jenisStr: string): 'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE' => {
      const u = String(jenisStr || '').toUpperCase();
      if (u.includes('UPACARA')) return 'UPACARA';
      if (u.includes('DUHA') || u.includes('DHUHA')) return 'DUHA';
      if (u.includes('SORE') || u.includes('PULANG')) return 'APEL_SORE';
      return 'KETARUNAAN';
    };

    // Terapkan filter Mode Agenda (SEMUA_SIKLUS / APEL_PAGI / UPACARA / KETARUNAAN / DUHA / APEL_SORE)
    let sesiList = [...periodFilteredPool];
    if (isKetarunaanRadar && modeAgenda !== 'SEMUA_SIKLUS') {
      sesiList = periodFilteredPool.filter((s) => {
        const cat = classifyAgenda(s.jenis_kegiatan);
        if (modeAgenda === 'APEL_PAGI') return cat === 'UPACARA' || cat === 'KETARUNAAN' || cat === 'DUHA';
        if (modeAgenda === 'UPACARA') return cat === 'UPACARA';
        if (modeAgenda === 'DUHA') return cat === 'DUHA';
        if (modeAgenda === 'KETARUNAAN' || modeAgenda === 'LATIHAN_KETARUNAAN') return cat === 'KETARUNAAN';
        if (modeAgenda === 'APEL_SORE') return cat === 'APEL_SORE';
        return true;
      });
    }

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
        status_breakdown: { HADIR: 0, SAKIT: 0, IZIN: 0, ALPA: 0, DISPENSASI: 0, total: 0 },
        by_jurusan: [],
        pola_hari: [],
        at_risk_students: [],
        barometer_sertifikasi: {
          indeks_disiplin: 0,
          total_taruna: totalSiswaMaster,
          siap_sertifikasi: 0,
          butuh_pembinaan: 0,
          persen_kelayakan: 0,
        },
        available_months,
        taruna_ranking: {
          top_global: [],
          best_per_jurusan: [],
          top_by_jurusan: {},
          best_per_kelas: [],
          top_by_kelas: {},
        },
      };
    }

    const sesiIds = sesiList.map(s => s.id);
    const periodPoolIds = periodFilteredPool.map(s => s.id);

    // Ambil rekap kehadiran nyata dari AbsenSiswa untuk seluruh sesi periode ini (SSOT)
    const hadirPerSesiList = await prisma.absenSiswa.groupBy({
      by: ['sesi_id'],
      where: {
        sesi_id: { in: periodPoolIds },
        tenant_id: tenantId,
        status: 'HADIR',
      },
      _count: { id: true },
    });
    const hadirPerSesiMap = new Map<string, number>();
    for (const item of hadirPerSesiList) {
      hadirPerSesiMap.set(item.sesi_id, item._count.id);
    }

    // Hitung Breakdown 4 Pilar Siklus Agenda Taruna (Upacara Senin, Ketarunaan Sel-Kam-Sab, Dhuha Jum'at, Apel Sore)
    const AGENDA_META: Record<'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE', { nama: string; hari_label: string; deskripsi: string }> = {
      UPACARA: {
        nama: 'Upacara Bendera + Makan Lapangan',
        hari_label: 'Senin Pagi (06:30)',
        deskripsi: 'Apel upacara bendera dilanjutkan makan pagi bersama taruna di lapangan',
      },
      KETARUNAAN: {
        nama: 'Apel & Latihan Fisik Ketarunaan',
        hari_label: 'Selasa, Rabu, Kamis, Sabtu Pagi',
        deskripsi: 'Pembinaan fisik/mental taruna & makan pagi bersama di lapangan',
      },
      DUHA: {
        nama: 'Pembiasaan Dhuha + Pembinaan Taruna',
        hari_label: "Jum'at Pagi (06:30)",
        deskripsi: 'Ibadah Dhuha bersama dilanjutkan makan pagi taruna di lapangan',
      },
      APEL_SORE: {
        nama: 'Apel Sore / Apel Pulang Taruna',
        hari_label: 'Senin s/d Sabtu Sore (15:30)',
        deskripsi: 'Apel pengecekan akhir hari sebelum taruna kembali ke rumah',
      },
    };

    const agendaBuckets: Record<'UPACARA' | 'KETARUNAAN' | 'DUHA' | 'APEL_SORE', { dates: Set<string>; sesiCount: number; hadir: number; target: number }> = {
      UPACARA: { dates: new Set(), sesiCount: 0, hadir: 0, target: 0 },
      KETARUNAAN: { dates: new Set(), sesiCount: 0, hadir: 0, target: 0 },
      DUHA: { dates: new Set(), sesiCount: 0, hadir: 0, target: 0 },
      APEL_SORE: { dates: new Set(), sesiCount: 0, hadir: 0, target: 0 },
    };

    for (const s of periodFilteredPool) {
      const cat = classifyAgenda(s.jenis_kegiatan);
      const b = agendaBuckets[cat];
      b.dates.add(s.tanggal.toISOString().slice(0, 10));
      b.sesiCount += 1;
      b.hadir += hadirPerSesiMap.get(s.id) || 0;
      b.target += s._count.AbsenSiswa > 0 ? s._count.AbsenSiswa : 36;
    }

    const agenda_breakdown = (['UPACARA', 'KETARUNAAN', 'DUHA', 'APEL_SORE'] as const).map((kode) => {
      const b = agendaBuckets[kode];
      const meta = AGENDA_META[kode];
      return {
        kode,
        nama: meta.nama,
        hari_label: meta.hari_label,
        deskripsi: meta.deskripsi,
        total_pertemuan: b.dates.size,
        total_sesi_kelas: b.sesiCount,
        hadir: b.hadir,
        total_target: b.target,
        persen_hadir: b.target > 0 ? Math.min(100, Math.round((b.hadir / b.target) * 100)) : 0,
      };
    });

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
      select: { id: true, nama_kelas: true, tingkat: true, jurusan_id: true },
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
        targetKelas = 0;
        hadirKelas = 0;
      }

      const persenKelas = targetKelas > 0 && hadirKelas > 0 
        ? Math.round((hadirKelas / targetKelas) * 100) 
        : 0;

      byKelas.push({
        kelas_id: k.id,
        kelas_nama: k.nama_kelas,
        jurusan_id: k.jurusan_id,
        total: targetKelas, // Kumulatif target presensi seluruh sesi pertemuan
        total_siswa: countSiswa, // Kapasitas siswa aktif rombel
        hadir: hadirKelas,
        persen: Math.min(100, persenKelas),
      });
    }

    const totalSesi = trend.length;
    const targetClassCount = ketarunaanTargetKelasIds.length > 0 ? ketarunaanTargetKelasIds.length : 20;
    const totalPertemuanTaruna = isKetarunaanRadar && targetClassCount > 0
      ? Math.round(sesiList.length / targetClassCount)
      : totalSesi;

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
      total_pertemuan_taruna: totalPertemuanTaruna,
      total_sesi_kelas: sesiList.length,
      target_kelas_count: targetClassCount,
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
      persen: val.total > 0 && val.hadir > 0 ? Math.min(100, Math.round((val.hadir / val.total) * 100)) : 0,
    }));

    // ── ANALITIK TAMBAHAN 1: Status Breakdown (Donut Chart Analytics) ──
    const statusBreakdownRaw = await prisma.absenSiswa.groupBy({
      by: ['status'],
      where: {
        sesi_id: { in: sesiIds },
        tenant_id: tenantId,
      },
      _count: { id: true },
    });
    const status_breakdown = {
      HADIR: 0,
      SAKIT: 0,
      IZIN: 0,
      ALPA: 0,
      DISPENSASI: 0,
      total: 0,
    };
    for (const item of statusBreakdownRaw) {
      if (item.status in status_breakdown) {
        (status_breakdown as any)[item.status] = item._count.id;
        status_breakdown.total += item._count.id;
      }
    }

    // ── ANALITIK TAMBAHAN 2: Komparasi Lintas Program Keahlian (Department Benchmark) ──
    const allJurusan = await prisma.jurusan.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, nama: true, singkatan: true, kode: true, logo_url: true },
    });
    const jurusanMap = new Map<string, { id: string; nama: string; logo_url: string | null; total: number; hadir: number }>();
    for (const j of allJurusan) {
      jurusanMap.set(j.id, {
        id: j.id,
        nama: j.singkatan || j.kode || j.nama,
        logo_url: j.logo_url ?? null,
        total: 0,
        hadir: 0,
      });
    }
    jurusanMap.set('OTHER', { id: 'OTHER', nama: 'Umum / Lainnya', logo_url: null, total: 0, hadir: 0 });

    for (const bk of byKelas) {
      const jKey = bk.jurusan_id && jurusanMap.has(bk.jurusan_id) ? bk.jurusan_id : 'OTHER';
      const jEntry = jurusanMap.get(jKey)!;
      jEntry.total += bk.total;
      jEntry.hadir += bk.hadir;
    }

    const by_jurusan = Array.from(jurusanMap.values())
      .filter(j => j.total > 0 || j.hadir > 0)
      .map(j => ({
        jurusan_id: j.id,
        nama_jurusan: j.nama,
        logo_url: j.logo_url,
        total: j.total,
        hadir: j.hadir,
        persen: j.total > 0 && j.hadir > 0 ? Math.min(100, Math.round((j.hadir / j.total) * 100)) : 0,
      }))
      .sort((a, b) => b.persen - a.persen);

    // ── ANALITIK TAMBAHAN 3: Pola Hari Kehadiran (Day-of-Week Disciplinary Heatmap) ──
    const HARI_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
    const dayMap = new Map<number, { hari: string; total_pertemuan: number; total_persen: number; total_hadir: number; total_target: number }>();
    for (const t of trend) {
      const dNum = new Date(`${t.tanggal}T00:00:00Z`).getUTCDay();
      const cur = dayMap.get(dNum) || { hari: HARI_NAMES[dNum], total_pertemuan: 0, total_persen: 0, total_hadir: 0, total_target: 0 };
      cur.total_pertemuan += 1;
      cur.total_persen += t.persen_hadir_siswa;
      cur.total_hadir += t.hadir_siswa;
      cur.total_target += t.total_siswa;
      dayMap.set(dNum, cur);
    }
    const pola_hari = Array.from(dayMap.entries())
      .filter(([_, v]) => v.total_pertemuan > 0)
      .map(([dNum, v]) => ({
        day_index: dNum,
        hari: v.hari,
        total_pertemuan: v.total_pertemuan,
        avg_persen: Math.round(v.total_persen / v.total_pertemuan),
        total_hadir: v.total_hadir,
        total_target: v.total_target,
      }))
      .sort((a, b) => a.day_index - b.day_index);

    // ── ANALITIK TAMBAHAN 4: Early Warning Radar (Taruna Berisiko Alpa Tinggi) ──
    const atRiskAll = await prisma.absenSiswa.groupBy({
      by: ['siswa_id'],
      where: {
        sesi_id: { in: sesiIds },
        tenant_id: tenantId,
        status: 'ALPA',
      },
      _count: { id: true },
      having: { id: { _count: { gte: 2 } } },
      orderBy: { _count: { id: 'desc' } },
      take: 100,
    });
    const at_risk_total = atRiskAll.length;
    const atRiskRaw = atRiskAll.slice(0, 8);

    const studentIds = atRiskRaw.map(r => r.siswa_id).filter(Boolean) as string[];
    const studentsInfo = await prisma.siswa.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        nama_siswa: true,
        nis: true,
        foto: true,
        Kelas: {
          select: { nama_kelas: true },
        },
      },
    });
    const studentMap = new Map(studentsInfo.map(s => [s.id, s]));

    const at_risk_students = atRiskRaw.map(r => {
      const st = r.siswa_id ? studentMap.get(r.siswa_id) : undefined;
      return {
        siswa_id: r.siswa_id,
        nama_siswa: st?.nama_siswa || 'Siswa Taruna',
        nis: st?.nis || '-',
        foto: st?.foto || null,
        nama_kelas: st?.Kelas?.nama_kelas || '-',
        total_alpa: r._count.id,
      };
    });

    // ── ANALITIK TAMBAHAN 5: Barometer Kelulusan & Kesiapan Sertifikat Ketarunaan (Per-Taruna SSOT) ──
    const studentTotalRaw = await prisma.absenSiswa.groupBy({
      by: ['siswa_id'],
      where: {
        sesi_id: { in: sesiIds },
        tenant_id: tenantId,
      },
      _count: { id: true },
    });
    const studentHadirRaw = await prisma.absenSiswa.groupBy({
      by: ['siswa_id'],
      where: {
        sesi_id: { in: sesiIds },
        tenant_id: tenantId,
        status: { in: ['HADIR', 'DISPENSASI'] },
      },
      _count: { id: true },
    });
    const studentHadirMap = new Map(studentHadirRaw.map(r => [r.siswa_id, r._count.id]));

    let siapSertifikasi = 0;
    let butuhPendampingan = 0;
    for (const st of studentTotalRaw) {
      if (!st.siswa_id) continue;
      const hCount = studentHadirMap.get(st.siswa_id) || 0;
      const pct = st._count.id > 0 ? (hCount / st._count.id) * 100 : 0;
      if (pct >= 80) siapSertifikasi++;
      else butuhPendampingan++;
    }

    const totalTarunaPartisipan = siapSertifikasi + butuhPendampingan;
    const totalStudentsTarget = totalTarunaPartisipan > 0 ? totalTarunaPartisipan : totalSiswaMaster;
    const barometer_sertifikasi = {
      indeks_disiplin: avgPersenSiswa,
      total_taruna: totalStudentsTarget,
      siap_sertifikasi: siapSertifikasi,
      butuh_pembinaan: butuhPendampingan,
      persen_kelayakan: totalStudentsTarget > 0 ? Math.round((siapSertifikasi / totalStudentsTarget) * 100) : 0,
    };

    // ── ANALITIK TAMBAHAN 6: Hall of Fame & Peringkat Taruna Terbaik (Adil, Anti-Bias Backfill, Hitung Keterlambatan) ──
    const ketStudentStatusRaw = await prisma.absenSiswa.groupBy({
      by: ['siswa_id', 'status', 'is_terlambat'],
      where: {
        sesi_id: { in: sesiIds },
        tenant_id: tenantId,
      },
      _count: { id: true },
      _sum: { menit_keterlambatan: true },
    });

    const ketStudentMap = new Map<
      string,
      {
        HADIR: number;
        HADIR_TEPAT: number;
        TERLAMBAT: number;
        MENIT_TERLAMBAT: number;
        DISPENSASI: number;
        SAKIT: number;
        IZIN: number;
        ALPA: number;
        total: number;
      }
    >();

    for (const row of ketStudentStatusRaw) {
      if (!row.siswa_id) continue;
      const cur = ketStudentMap.get(row.siswa_id) || {
        HADIR: 0,
        HADIR_TEPAT: 0,
        TERLAMBAT: 0,
        MENIT_TERLAMBAT: 0,
        DISPENSASI: 0,
        SAKIT: 0,
        IZIN: 0,
        ALPA: 0,
        total: 0,
      };
      const stUpper = String(row.status || '').toUpperCase();
      if (stUpper === 'HADIR' || stUpper === 'TERLAMBAT') {
        cur.HADIR += row._count.id;
        if (row.is_terlambat || stUpper === 'TERLAMBAT') {
          cur.TERLAMBAT += row._count.id;
          cur.MENIT_TERLAMBAT += row._sum?.menit_keterlambatan || row._count.id * 15;
        } else {
          cur.HADIR_TEPAT += row._count.id;
        }
      } else if (stUpper === 'DISPENSASI' || stUpper === 'DISPEN') {
        cur.DISPENSASI += row._count.id;
      } else if (stUpper === 'SAKIT') {
        cur.SAKIT += row._count.id;
      } else if (stUpper === 'IZIN') {
        cur.IZIN += row._count.id;
      } else if (stUpper === 'ALPA') {
        cur.ALPA += row._count.id;
      }
      cur.total += row._count.id;
      ketStudentMap.set(row.siswa_id, cur);
    }

    // Deteksi komposisi sumber sesi: Backfill (Google Sheet) vs Realtime (Tap RFID / Terminal)
    let sesiBackfillCount = 0;
    let sesiRealtimeCount = 0;
    for (const s of sesiList) {
      const ketLower = String(s.keterangan || '').toLowerCase();
      if (ketLower.includes('staging') || ketLower.includes('backfill') || ketLower.includes('import')) {
        sesiBackfillCount++;
      } else {
        sesiRealtimeCount++;
      }
    }
    const totalSesiEvaluasi = sesiList.length;
    const persenDataBackfill = totalSesiEvaluasi > 0 ? Math.round((sesiBackfillCount / totalSesiEvaluasi) * 100) : 0;
    const isBackfillDominant = persenDataBackfill >= 50;

    // Ambil data keterlambatan nyata siswa di sekolah (KBM / Gerbang) sebagai faktor penalti kedisiplinan waktu
    const allRankedIds = Array.from(ketStudentMap.keys());
    const schoolLateRaw = await prisma.absenSiswa.groupBy({
      by: ['siswa_id'],
      where: {
        tenant_id: tenantId,
        siswa_id: { in: allRankedIds },
        is_terlambat: true,
        sesi_id: { notIn: sesiIds },
      },
      _count: { id: true },
      _sum: { menit_keterlambatan: true },
    });
    const schoolLateMap = new Map<string, { count: number; minutes: number }>();
    for (const r of schoolLateRaw) {
      if (!r.siswa_id) continue;
      schoolLateMap.set(r.siswa_id, {
        count: r._count.id,
        minutes: r._sum?.menit_keterlambatan || r._count.id * 10,
      });
    }

    // Ambil data apel pendukung (Upacara, Dhuha, Apel Sore) pada periode yang sama sebagai Tie-Breaker objektif
    const minPeriodeDate = sesiList[0]?.tanggal;
    const maxPeriodeDate = sesiList[sesiList.length - 1]?.tanggal;
    const supSesiList = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenantId,
        status: 'SELESAI',
        ...(activeTp?.id ? { tahun_pelajaran_id: activeTp.id } : {}),
        ...(minPeriodeDate && maxPeriodeDate
          ? {
              tanggal: {
                gte: new Date(minPeriodeDate.getTime() - 12 * 3600 * 1000),
                lte: new Date(maxPeriodeDate.getTime() + 12 * 3600 * 1000),
              },
            }
          : {}),
        jenis_kegiatan: { in: ['UPACARA', 'Upacara', 'APEL_SORE', 'Apel Pulang', 'DUHA', 'Duha'] },
      },
      select: { id: true },
    });
    const supSesiIds = supSesiList.map((s) => s.id);
    const supStudentMap = new Map<string, { HADIR: number; DISPENSASI: number; SAKIT: number; IZIN: number; ALPA: number; total: number }>();
    if (supSesiIds.length > 0) {
      const supRaw = await prisma.absenSiswa.groupBy({
        by: ['siswa_id', 'status'],
        where: { tenant_id: tenantId, sesi_id: { in: supSesiIds } },
        _count: { id: true },
      });
      for (const row of supRaw) {
        if (!row.siswa_id) continue;
        const cur = supStudentMap.get(row.siswa_id) || { HADIR: 0, DISPENSASI: 0, SAKIT: 0, IZIN: 0, ALPA: 0, total: 0 };
        if (row.status in cur) {
          (cur as any)[row.status] += row._count.id;
        }
        cur.total += row._count.id;
        supStudentMap.set(row.siswa_id, cur);
      }
    }

    const rankedProfiles = await prisma.siswa.findMany({
      where: { id: { in: allRankedIds } },
      select: {
        id: true,
        nama_siswa: true,
        nis: true,
        foto: true,
        kelas_id: true,
        SiswaAkademik: {
          where: activeTp?.id ? { tahun_pelajaran_id: activeTp.id } : { status: 'AKTIF' },
          take: 1,
          select: { kelas_id: true },
        },
      },
    });

    const kelasLookup = new Map(allKelas.map((k) => [k.id, k]));
    const jurusanLookup = new Map(allJurusan.map((j) => [j.id, j.singkatan || j.kode || j.nama]));

    const allRankedStudents: Array<any> = [];
    for (const prof of rankedProfiles) {
      const ks = ketStudentMap.get(prof.id);
      if (!ks || ks.total === 0) continue;

      const resolvedKelasId = prof.SiswaAkademik?.[0]?.kelas_id || prof.kelas_id || '';
      const kInfo = kelasLookup.get(resolvedKelasId);
      const resolvedJurusanId = kInfo?.jurusan_id || 'OTHER';
      const namaJurusan = jurusanLookup.get(resolvedJurusanId) || 'Umum';
      const namaKelas = kInfo?.nama_kelas || '-';

      const schLate = schoolLateMap.get(prof.id) || { count: 0, minutes: 0 };
      const totalTerlambat = ks.TERLAMBAT + schLate.count;
      const totalMenitTerlambat = ks.MENIT_TERLAMBAT + schLate.minutes;

      const persenHadir = Math.min(100, Math.round(((ks.HADIR + ks.DISPENSASI) / ks.total) * 100));
      const ketScore = Math.max(
        0,
        Math.min(
          100,
          (ks.HADIR_TEPAT * 100 +
            ks.TERLAMBAT * 75 +
            ks.DISPENSASI * 85 +
            ks.SAKIT * 40 +
            ks.IZIN * 30 -
            ks.ALPA * 25 -
            Math.min(25, ks.MENIT_TERLAMBAT * 0.5)) /
            ks.total
        )
      );

      const sup = supStudentMap.get(prof.id);
      const persenApelPendukung =
        sup && sup.total > 0
          ? Math.min(100, Math.round(((sup.HADIR + sup.DISPENSASI) / sup.total) * 100))
          : persenHadir;
      const supScore =
        sup && sup.total > 0
          ? Math.max(
              0,
              Math.min(
                100,
                (sup.HADIR * 100 + sup.DISPENSASI * 85 + sup.SAKIT * 40 + sup.IZIN * 30 - sup.ALPA * 20) / sup.total
              )
            )
          : ketScore;

      const latePenaltySekolah = Math.min(15, schLate.count * 1.5 + schLate.minutes * 0.05);
      const skorDisiplin = Number(Math.max(0, ketScore * 0.85 + supScore * 0.15 - latePenaltySekolah).toFixed(1));
      const predikat =
        skorDisiplin >= 95 && ks.ALPA === 0 && totalTerlambat === 0
          ? 'Bintang Taruna Utama'
          : skorDisiplin >= 88 && ks.ALPA === 0
          ? 'Taruna Teladan'
          : skorDisiplin >= 80
          ? 'Taruna Disiplin'
          : 'Taruna Aktif';

      const rankKey = `${skorDisiplin}_${persenHadir}_${totalTerlambat}_${totalMenitTerlambat}_${ks.ALPA}_${persenApelPendukung}`;

      allRankedStudents.push({
        rank: 0,
        is_tied: false,
        tied_count: 1,
        rank_key: rankKey,
        siswa_id: prof.id,
        nama_siswa: prof.nama_siswa,
        nis: prof.nis || '-',
        foto: prof.foto || null,
        kelas_id: resolvedKelasId,
        nama_kelas: namaKelas,
        jurusan_id: resolvedJurusanId,
        nama_jurusan: namaJurusan,
        total_sesi: ks.total,
        hadir: ks.HADIR,
        hadir_tepat_waktu: ks.HADIR_TEPAT,
        terlambat: totalTerlambat,
        total_menit_terlambat: totalMenitTerlambat,
        dispensasi: ks.DISPENSASI,
        sakit: ks.SAKIT,
        izin: ks.IZIN,
        alpa: ks.ALPA,
        persen_hadir: persenHadir,
        persen_apel_pendukung: persenApelPendukung,
        skor_disiplin: skorDisiplin,
        predikat,
        sumber_data: isBackfillDominant ? 'BACKFILL' : sesiBackfillCount > 0 ? 'HYBRID' : 'REALTIME',
      });
    }

    allRankedStudents.sort((a, b) => {
      if (b.skor_disiplin !== a.skor_disiplin) return b.skor_disiplin - a.skor_disiplin;
      if (b.persen_hadir !== a.persen_hadir) return b.persen_hadir - a.persen_hadir;
      if (a.terlambat !== b.terlambat) return a.terlambat - b.terlambat;
      if (a.total_menit_terlambat !== b.total_menit_terlambat) return a.total_menit_terlambat - b.total_menit_terlambat;
      if (b.hadir_tepat_waktu !== a.hadir_tepat_waktu) return b.hadir_tepat_waktu - a.hadir_tepat_waktu;
      if (a.alpa !== b.alpa) return a.alpa - b.alpa;
      if (b.persen_apel_pendukung !== a.persen_apel_pendukung) return b.persen_apel_pendukung - a.persen_apel_pendukung;
      return a.nama_siswa.localeCompare(b.nama_siswa);
    });

    // Hitung Dense / Shared Rank Global agar taruna dengan nilai identik mendapat Peringkat Bersama (Tidak bias abjad nama)
    const globalKeyCounts = new Map<string, number>();
    for (const s of allRankedStudents) {
      globalKeyCounts.set(s.rank_key, (globalKeyCounts.get(s.rank_key) || 0) + 1);
    }

    let currentDenseRank = 0;
    let prevRankKey = '';
    for (const s of allRankedStudents) {
      if (s.rank_key !== prevRankKey) {
        currentDenseRank++;
        prevRankKey = s.rank_key;
      }
      const tCount = globalKeyCounts.get(s.rank_key) || 1;
      s.rank = currentDenseRank;
      s.is_tied = tCount > 1;
      s.tied_count = tCount;
    }

    const allTiedRank1 = allRankedStudents.filter((s) => s.rank === 1);
    const topTiedScore = allRankedStudents[0]?.skor_disiplin || 0;

    // Untuk Top 20 Global: jika terdapat banyak taruna yang Tie #1 (karena data backfill),
    // distribusikan secara proporsional lintas kelas (Round-Robin per Rombel) agar tidak didominasi kelas X AKL 1 / huruf A
    let top_global: any[] = [];
    if (allTiedRank1.length > 1) {
      const byClassBuckets = new Map<string, any[]>();
      for (const s of allRankedStudents) {
        const arr = byClassBuckets.get(s.kelas_id) || [];
        arr.push(s);
        byClassBuckets.set(s.kelas_id, arr);
      }
      const classKeys = Array.from(byClassBuckets.keys());
      let round = 0;
      while (top_global.length < 20) {
        let addedInRound = false;
        for (const ck of classKeys) {
          const bucket = byClassBuckets.get(ck) || [];
          if (bucket[round]) {
            top_global.push({ ...bucket[round] });
            addedInRound = true;
            if (top_global.length >= 20) break;
          }
        }
        if (!addedInRound) break;
        round++;
      }
      top_global.sort((a, b) => a.rank - b.rank || b.skor_disiplin - a.skor_disiplin || a.nama_kelas.localeCompare(b.nama_kelas));
    } else {
      top_global = allRankedStudents.slice(0, 20).map((s) => ({ ...s }));
    }

    // Peringkat Per Jurusan (Dense Rank per Jurusan)
    const jurusanBuckets = new Map<string, any[]>();
    for (const s of allRankedStudents) {
      if (!s.jurusan_id) continue;
      const arr = jurusanBuckets.get(s.jurusan_id) || [];
      arr.push(s);
      jurusanBuckets.set(s.jurusan_id, arr);
    }

    const top_by_jurusan: Record<string, any[]> = {};
    const best_per_jurusan: any[] = [];
    for (const [jId, list] of jurusanBuckets.entries()) {
      const jKeyCounts = new Map<string, number>();
      for (const s of list) {
        jKeyCounts.set(s.rank_key, (jKeyCounts.get(s.rank_key) || 0) + 1);
      }
      let jRank = 0;
      let jPrevKey = '';
      const rankedInJurusan = list.map((s) => {
        if (s.rank_key !== jPrevKey) {
          jRank++;
          jPrevKey = s.rank_key;
        }
        const tc = jKeyCounts.get(s.rank_key) || 1;
        return { ...s, rank: jRank, is_tied: tc > 1, tied_count: tc };
      });
      top_by_jurusan[jId] = rankedInJurusan.slice(0, 15);
      if (rankedInJurusan[0]) {
        best_per_jurusan.push(rankedInJurusan[0]);
      }
    }
    best_per_jurusan.sort((a, b) => b.skor_disiplin - a.skor_disiplin || b.persen_hadir - a.persen_hadir);

    // Peringkat Per Kelas (Dense Rank per Kelas)
    const kelasBuckets = new Map<string, any[]>();
    for (const s of allRankedStudents) {
      if (!s.kelas_id) continue;
      const arr = kelasBuckets.get(s.kelas_id) || [];
      arr.push(s);
      kelasBuckets.set(s.kelas_id, arr);
    }

    const top_by_kelas: Record<string, any[]> = {};
    const best_per_kelas: any[] = [];
    for (const [kId, list] of kelasBuckets.entries()) {
      const kKeyCounts = new Map<string, number>();
      for (const s of list) {
        kKeyCounts.set(s.rank_key, (kKeyCounts.get(s.rank_key) || 0) + 1);
      }
      let kRank = 0;
      let kPrevKey = '';
      const rankedInKelas = list.map((s) => {
        if (s.rank_key !== kPrevKey) {
          kRank++;
          kPrevKey = s.rank_key;
        }
        const tc = kKeyCounts.get(s.rank_key) || 1;
        return { ...s, rank: kRank, is_tied: tc > 1, tied_count: tc };
      });
      top_by_kelas[kId] = rankedInKelas.slice(0, 15);
      if (rankedInKelas[0]) {
        best_per_kelas.push(rankedInKelas[0]);
      }
    }
    best_per_kelas.sort((a, b) => b.skor_disiplin - a.skor_disiplin || a.nama_kelas.localeCompare(b.nama_kelas));

    const taruna_ranking = {
      ranking_metadata: {
        total_sesi_dievaluasi: totalSesiEvaluasi,
        sesi_realtime_count: sesiRealtimeCount,
        sesi_backfill_count: sesiBackfillCount,
        persen_data_backfill: persenDataBackfill,
        is_backfill_dominant: isBackfillDominant,
        total_kandidat_sempurna: allTiedRank1.length,
        is_tie_at_top: allTiedRank1.length > 1,
        top_tied_score: topTiedScore,
      },
      top_global,
      all_tied_global: allTiedRank1.slice(0, 200),
      best_per_jurusan,
      top_by_jurusan,
      best_per_kelas,
      top_by_kelas,
    };

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
      status_breakdown,
      agenda_breakdown,
      by_jurusan,
      pola_hari,
      at_risk_students,
      at_risk_total,
      barometer_sertifikasi,
      available_months,
      taruna_ranking,
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
    } else if (jenis.toUpperCase() === 'KETARUNAAN') {
      const cycleTerms = ['KETARUNAAN', 'UPACARA', 'DUHA', 'DHUHA', 'APEL'];
      sesiWhere.OR = cycleTerms.flatMap((term) => [
        { jenis_kegiatan: { contains: term, mode: 'insensitive' as const } },
        { JadwalKegiatan: { nama: { contains: term, mode: 'insensitive' as const } } },
      ]);
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

