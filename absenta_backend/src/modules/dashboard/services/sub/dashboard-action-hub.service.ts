// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { DashboardCommonHelper } from './dashboard-common.helper';
import { Hari } from '@prisma/client';
import { NilaiService } from '@/modules/rapor/services/nilai.service';
import { CbtSettingsService } from '@/modules/cbt/services/cbt-settings.service';
import { HubinPenilaianService } from '@/modules/hubin/services/sub/hubin-penilaian.service';
import { STRUKTUR_CODES } from '@/config/organization-structure';

export interface UnifiedActionItem {
  id: string;
  division: 'KURIKULUM' | 'RAPOR' | 'KESISWAAN' | 'PIKET' | 'HUBIN' | 'SARPRAS' | 'BPBK' | 'TU' | 'KOPERASI' | 'CBT';
  urgency: 'CRITICAL' | 'TODAY' | 'UPCOMING' | 'INFO';
  title: string;
  subtitle: string;
  badgeText: string;
  deadline?: string | null;
  progress?: {
    current: number;
    total: number;
    percent: number;
    label: string;
    variant?: 'rose' | 'amber' | 'indigo' | 'emerald';
  };
  action: {
    label: string;
    type: 'NAVIGATE' | 'MODAL';
    target: string;
    payload?: Record<string, any>;
  };
  sourceModule: {
    table: string;
    entityId: string;
  };
  /** Sekat jabatan: tugas ini muncul karena peran apa (Guru, Kajur, Piket, dst) */
  roleGroup?: ActionRoleGroup;
}

export interface ActionRoleGroup {
  key: string;
  label: string;
  order: number;
}

/**
 * SSOT pemetaan tugas → jabatan berdasarkan prefix id item.
 * Tambahkan baris baru di sini saat menambah detektor untuk jabatan lain
 * (mis. KURIKULUM, WALIKELAS, KESISWAAN).
 */
const ROLE_GROUP_RULES: Array<{ prefixes: string[]; group: ActionRoleGroup }> = [
  { prefixes: ['kbm_journal_', 'perangkat_', 'rapor_task_', 'cbt_bank_soal_', 'cbt_author_live_'], group: { key: 'GURU', label: 'Sebagai Guru', order: 1 } },
  { prefixes: ['kaprog_'], group: { key: 'KAPROG', label: 'Sebagai Kajur', order: 2 } },
  { prefixes: ['hubin_staff_'], group: { key: 'HUBIN', label: 'Sebagai Staf Hubin', order: 3 } },
  { prefixes: ['kurikulum_'], group: { key: 'KURIKULUM', label: 'Sebagai Kurikulum', order: 4 } },
  { prefixes: ['walas_'], group: { key: 'WALIKELAS', label: 'Sebagai Wali Kelas', order: 4 } },
  { prefixes: ['pkl_nilai_pembimbing_'], group: { key: 'PEMBIMBING_PKL', label: 'Sebagai Pembimbing PKL', order: 5 } },
  { prefixes: ['pkl_nilai_sidang_'], group: { key: 'PENGUJI_PKL', label: 'Sebagai Penguji Sidang PKL', order: 6 } },
  { prefixes: ['cbt_pengawas_'], group: { key: 'PENGAWAS_CBT', label: 'Sebagai Pengawas Ujian (CBT)', order: 7 } },
  { prefixes: ['piket_duty_'], group: { key: 'PIKET', label: 'Sebagai Guru Piket', order: 8 } },
  { prefixes: ['upacara_duty_'], group: { key: 'UPACARA', label: 'Sebagai Petugas Upacara', order: 9 } },
  { prefixes: ['sarpras_loan_'], group: { key: 'PEMINJAM_SARPRAS', label: 'Sebagai Peminjam Sarpras', order: 10 } },
];

const FALLBACK_ROLE_GROUP: ActionRoleGroup = { key: 'LAINNYA', label: 'Tugas Lainnya', order: 99 };

function resolveRoleGroup(itemId: string): ActionRoleGroup {
  const rule = ROLE_GROUP_RULES.find(r => r.prefixes.some(p => itemId.startsWith(p)));
  return rule ? rule.group : FALLBACK_ROLE_GROUP;
}

export interface ActionHubSummary {
  total: number;
  critical: number;
  today: number;
  upcoming: number;
}

export interface ActionHubResult {
  summary: ActionHubSummary;
  actions: UnifiedActionItem[];
}

interface CacheEntry {
  data: ActionHubResult;
  expiresAt: number;
}

const actionHubCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 1000; // 10 detik in-memory TTL

export class DashboardActionHubService {
  private helper = new DashboardCommonHelper();
  private hubinPenilaianService = new HubinPenilaianService();

  async getMyActionHub(tenantId: string, userId: string): Promise<ActionHubResult> {
    const cacheKey = `${tenantId}:${userId}`;
    const nowTimestamp = Date.now();
    const cached = actionHubCache.get(cacheKey);

    if (cached && cached.expiresAt > nowTimestamp) {
      return cached.data;
    }

    // 1. Resolve Guru Profile
    const guru = await prisma.guru.findFirst({
      where: { user_id: userId, tenant_id: tenantId },
      select: { id: true, nama_guru: true, nip: true }
    });
    const guruId = guru?.id;

    const { startOfDay, endOfDay, dateStr, timeZone } = await this.helper.resolveDayRange(tenantId);

    // 2. Query seluruh modul secara paralel (Promise.allSettled)
    const results = await Promise.allSettled([
      guruId ? this.detectKbmJournalDebts(tenantId, guruId, startOfDay, endOfDay, timeZone) : Promise.resolve([]),
      guruId ? this.detectOverlappingPembiasaanTasks(tenantId, guruId, startOfDay, endOfDay, timeZone) : Promise.resolve([]),
      guruId ? this.detectPiketDuty(tenantId, guruId, dateStr, timeZone) : Promise.resolve([]),
      guruId ? this.detectUpacaraDuty(tenantId, guruId, startOfDay) : Promise.resolve([]),
      guruId ? this.detectPklTasks(tenantId, guruId) : Promise.resolve([]),
      this.detectRaporTasks(tenantId, userId, guruId),
      this.detectSarprasLoanTasks(tenantId, userId, startOfDay),
      guruId ? this.detectPerangkatAjarTasks(tenantId, guruId) : Promise.resolve([]),
      guruId ? this.detectCbtBankSoalTasks(tenantId, guruId) : Promise.resolve([]),
      guruId ? this.detectCbtLiveAuthorTasks(tenantId, guruId) : Promise.resolve([]),
      guruId ? this.detectCbtPengawasTasks(tenantId, guruId) : Promise.resolve([]),
      this.detectKaprogTpDudiTasks(tenantId, userId, guruId),
      this.detectHubinStaffPklReminderTasks(tenantId, userId),
    ]);

    // 3. Konsolidasi seluruh item yang sukses diambil
    let allActions: UnifiedActionItem[] = [];
    results.forEach((res) => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        allActions = allActions.concat(res.value);
      }
    });

    // 3b. Tandai sekat jabatan tiap tugas (Sebagai Guru / Kajur / Piket, dst)
    allActions = allActions.map((a) => ({ ...a, roleGroup: a.roleGroup || resolveRoleGroup(a.id) }));

    // 4. Urutkan berdasarkan bobot urgensi: CRITICAL > TODAY > UPCOMING > INFO
    const urgencyOrder: Record<string, number> = {
      CRITICAL: 1,
      TODAY: 2,
      UPCOMING: 3,
      INFO: 4,
    };
    allActions.sort((a, b) => (urgencyOrder[a.urgency] ?? 5) - (urgencyOrder[b.urgency] ?? 5));

    // 5. Hitung ringkasan
    const summary: ActionHubSummary = {
      total: allActions.length,
      critical: allActions.filter(a => a.urgency === 'CRITICAL').length,
      today: allActions.filter(a => a.urgency === 'TODAY').length,
      upcoming: allActions.filter(a => a.urgency === 'UPCOMING' || a.urgency === 'INFO').length,
    };

    const finalResult: ActionHubResult = {
      summary,
      actions: allActions,
    };

    actionHubCache.set(cacheKey, {
      data: finalResult,
      expiresAt: nowTimestamp + CACHE_TTL_MS,
    });

    return finalResult;
  }

  // --- DETECTOR 1: Hutang Jurnal KBM (Modul Kurikulum/Absensi) ---
  private async detectKbmJournalDebts(
    tenantId: string, 
    guruId: string, 
    startOfDay: Date, 
    endOfDay: Date,
    timeZone?: string
  ): Promise<UnifiedActionItem[]> {
    try {
      // Periksa sesi mengajar hari ini atau 2 hari ke belakang yang pernah dibuka/selesai tapi belum ada ProgresMateri
      const pastThreeDays = new Date(startOfDay.getTime() - (2 * 24 * 60 * 60 * 1000));
      
      const unjournaledSessions = await prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          OR: [
            { guru_id: guruId },
            { guru_pelaksana_id: guruId }
          ],
          status: { in: ['BERLANGSUNG', 'SELESAI'] },
          tanggal: { gte: pastThreeDays, lte: endOfDay },
          ProgresMateri: { is: null }
        },
        include: {
          Kelas: { select: { id: true, nama_kelas: true } },
          Mapel: { select: { id: true, nama_mapel: true } }
        },
        orderBy: { tanggal: 'desc' },
        take: 5
      });

      return unjournaledSessions.map(sesi => {
        const tgl = new Date(sesi.tanggal);
        const tglStr = tgl.toLocaleDateString('id-ID', {
          timeZone: timeZone || 'Asia/Jakarta',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });

        let timeLabel = '';
        if (sesi.waktu_mulai) {
          const wMulai = new Date(sesi.waktu_mulai).toLocaleTimeString('id-ID', {
            timeZone: timeZone || 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
          });
          timeLabel = ` • ${wMulai} WIB`;
        } else if (sesi.slot_kbm) {
          timeLabel = ` • Slot ${sesi.slot_kbm}`;
        }

        const mapelName = sesi.Mapel?.nama_mapel || 'KBM';
        const kelasName = sesi.Kelas?.nama_kelas || 'Kelas';

        return {
          id: `kbm_journal_${sesi.id}`,
          division: 'KURIKULUM',
          urgency: 'CRITICAL',
          title: 'Hutang Jurnal KBM',
          subtitle: `${mapelName} • ${kelasName} (${tglStr}${timeLabel})`,
          badgeText: 'Perlu Diisi',
          action: {
            label: 'Isi Jurnal ➔',
            type: 'MODAL',
            target: 'JURNAL_KBM_MODAL',
            payload: {
              id: sesi.id,
              kelas_nama: sesi.Kelas?.nama_kelas,
              mapel_nama: sesi.Mapel?.nama_mapel,
              kegiatan: `${mapelName} di ${kelasName} (${tglStr})`
            }
          },
          sourceModule: {
            table: 'SesiAbsensi',
            entityId: sesi.id
          }
        };
      });
    } catch (e) {
      return [];
    }
  }

  // --- DETECTOR 1B: Irisan Jam KBM dengan Kegiatan Pembiasaan (Ketarunaan / Dhuha) ---
  private async detectOverlappingPembiasaanTasks(
    tenantId: string,
    guruId: string,
    startOfDay: Date,
    endOfDay: Date,
    timeZone?: string
  ): Promise<UnifiedActionItem[]> {
    try {
      const tz = timeZone || 'Asia/Jakarta';
      const now = new Date();
      const dayName = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now).toUpperCase();
      const dayEnumMap: Record<string, Hari> = {
        SUN: Hari.MINGGU,
        MON: Hari.SENIN,
        TUE: Hari.SELASA,
        WED: Hari.RABU,
        THU: Hari.KAMIS,
        FRI: Hari.JUMAT,
        SAT: Hari.SABTU,
      };
      const todayHari = dayEnumMap[dayName];
      if (!todayHari) return [];

      const [activeTp, activeSem] = await Promise.all([
        prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
        prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
      ]);

      const kbmWhere: any = {
        tenant_id: tenantId,
        guru_id: guruId,
        hari: todayHari,
      };
      if (activeTp?.id) kbmWhere.tahun_pelajaran_id = activeTp.id;
      if (activeSem?.id) kbmWhere.semester_id = activeSem.id;

      const kbmList = await prisma.jadwalKBM.findMany({
        where: kbmWhere,
        include: {
          Mapel: { select: { nama_mapel: true } },
          Kelas: { select: { nama_kelas: true } },
        },
        orderBy: { jam_mulai: 'asc' },
      });

      if (kbmList.length === 0) return [];

      const kegiatanList = await prisma.jadwalKegiatan.findMany({
        where: { tenant_id: tenantId, aktif: true },
      });

      const parseMin = (t?: string | null) => {
        if (!t || !t.includes(':')) return null;
        const [h, m] = t.split(':').map(Number);
        return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
      };

      const todayStr = String(todayHari).toUpperCase();
      const items: UnifiedActionItem[] = [];

      for (const keg of kegiatanList) {
        if (/pulang/i.test(keg.nama || '')) continue;
        const days: string[] = Array.isArray(keg.hari)
          ? keg.hari.map((d: any) => String(d).trim().toUpperCase())
          : String(keg.hari || '').split(',').map((d) => d.trim().toUpperCase());
        if (!days.includes(todayStr)) continue;

        const kegStart = parseMin(keg.waktu_mulai) ?? 0;
        const kegEnd = parseMin(keg.waktu_selesai);
        if (kegEnd === null || kegStart >= 12 * 60) continue;

        const overlappingKbm = kbmList.find((kbm) => {
          const kbmStart = parseMin(kbm.jam_mulai);
          const kbmEnd = parseMin(kbm.jam_selesai) ?? (kbmStart !== null ? kbmStart + 45 : null);
          if (kbmStart === null || kbmEnd === null) return false;
          return kegEnd > kbmStart && kegStart < kbmEnd;
        });

        if (!overlappingKbm) continue;

        // Cek apakah guru sudah absen di Terminal Unified Kegiatan hari ini
        const alreadyTapped = await prisma.absenGuru.findFirst({
          where: {
            tenant_id: tenantId,
            guru_id: guruId,
            status: { in: ['HADIR', 'TERLAMBAT', 'TEPAT_WAKTU'] },
            SesiAbsensi: {
              tanggal: { gte: startOfDay, lte: endOfDay },
              OR: [
                { jadwal_kegiatan_id: keg.id },
                ...(keg.jenis_kegiatan ? [{ jenis_kegiatan: keg.jenis_kegiatan }] : []),
              ],
            },
          },
          select: { id: true },
        });

        if (alreadyTapped) continue;

        const mapelName = overlappingKbm.Mapel?.nama_mapel || 'KBM';
        const kelasName = overlappingKbm.Kelas?.nama_kelas || '';

        items.push({
          id: `pembiasaan_overlap_${keg.id}`,
          division: 'KESISWAAN',
          urgency: 'CRITICAL',
          roleGroup: { key: 'GURU', label: 'Sebagai Guru', order: 1 },
          title: `Wajib Hadir Fisik: ${keg.nama}`,
          subtitle: `Jam KBM ${mapelName}${kelasName ? ` (${kelasName})` : ''} pukul ${overlappingKbm.jam_mulai} WIB beririsan dengan ${keg.nama} (${keg.waktu_mulai}–${keg.waktu_selesai} WIB). Hadir fisik & presensi melalui Panitia ${keg.nama} di lokasi agar tidak dianggap telat saat presensi KBM.`,
          badgeText: 'Wajib Hadir Fisik',
          action: {
            label: 'Lihat Jadwal KBM ➔',
            type: 'NAVIGATE',
            target: '/dashboard?tab=kbm',
          },
          sourceModule: {
            table: 'JadwalKegiatan',
            entityId: keg.id,
          },
        });
      }

      return items;
    } catch (e) {
      console.warn('[ActionHub] detectOverlappingPembiasaanTasks error:', e);
      return [];
    }
  }

  // --- DETECTOR 2: Piket KBM Harian & Mingguan (Modul Kesiswaan/Piket) ---
  private async detectPiketDuty(
    tenantId: string, 
    guruId: string, 
    dateStr: string, 
    timeZone?: string
  ): Promise<UnifiedActionItem[]> {
    try {
      // 1. Dapatkan periode Tahun Pelajaran & Semester aktif
      const [activeTp, activeSem] = await Promise.all([
        prisma.tahunPelajaran.findFirst({
          where: { tenant_id: tenantId, is_active: true },
          select: { id: true }
        }),
        prisma.semester.findFirst({
          where: { tenant_id: tenantId, is_active: true },
          select: { id: true }
        })
      ]);

      const whereCondition: any = {
        tenant_id: tenantId,
        guru_id: guruId,
      };
      if (activeTp?.id) whereCondition.tahun_pelajaran_id = activeTp.id;
      if (activeSem?.id) whereCondition.semester_id = activeSem.id;

      const piketList = await prisma.jadwalPiketGuru.findMany({
        where: whereCondition,
      });

      if (!piketList || piketList.length === 0) return [];

      const dayMap: Record<Hari, number> = {
        [Hari.MINGGU]: 0,
        [Hari.SENIN]: 1,
        [Hari.SELASA]: 2,
        [Hari.RABU]: 3,
        [Hari.KAMIS]: 4,
        [Hari.JUMAT]: 5,
        [Hari.SABTU]: 6,
      };

      const dayDisplayNames: Record<Hari, string> = {
        [Hari.MINGGU]: 'Minggu',
        [Hari.SENIN]: 'Senin',
        [Hari.SELASA]: 'Selasa',
        [Hari.RABU]: 'Rabu',
        [Hari.KAMIS]: 'Kamis',
        [Hari.JUMAT]: 'Jumat',
        [Hari.SABTU]: 'Sabtu',
      };

      // Hitung indeks hari saat ini sesuai tanggal operasional sekolah
      const targetDate = new Date(`${dateStr}T12:00:00Z`);
      const currentDayIndex = targetDate.getUTCDay();

      const actionItems: UnifiedActionItem[] = [];

      for (const piket of piketList) {
        const piketDayIndex = dayMap[piket.hari];
        if (piketDayIndex === undefined) continue;

        // Jarak hari ke depan (0 = hari ini, 1 = besok, ..., 6 = 6 hari lagi)
        const diffDays = (piketDayIndex - currentDayIndex + 7) % 7;
        const hariLabel = dayDisplayNames[piket.hari] || piket.hari;

        // Susun format waktu operasional piket (Jam & Slot)
        const timeStr = piket.jam_mulai && piket.jam_selesai 
          ? `Pukul ${piket.jam_mulai} - ${piket.jam_selesai} WIB`
          : piket.jam_mulai 
          ? `Mulai ${piket.jam_mulai} WIB`
          : null;
        const slotStr = piket.slot_mulai && piket.slot_selesai
          ? `Slot ${piket.slot_mulai} - ${piket.slot_selesai}`
          : null;
        const posText = piket.pos_piket || 'Pos Piket Utama';

        let dutySubtitle = posText;
        if (timeStr && slotStr) {
          dutySubtitle += ` • ${timeStr} (${slotStr})`;
        } else if (timeStr) {
          dutySubtitle += ` • ${timeStr}`;
        } else if (slotStr) {
          dutySubtitle += ` • ${slotStr}`;
        } else {
          dutySubtitle += ' • Sepanjang Hari';
        }

        if (diffDays === 0) {
          // Bertugas Hari Ini (TODAY)
          actionItems.push({
            id: `piket_duty_today_${piket.id}`,
            division: 'PIKET',
            urgency: 'TODAY',
            title: 'Jadwal Piket KBM Hari Ini',
            subtitle: dutySubtitle,
            badgeText: 'Hari Ini',
            deadline: piket.jam_selesai ? `${piket.jam_selesai} WIB` : null,
            action: {
              label: 'Buka Piket ➔',
              type: 'NAVIGATE',
              target: '/dashboard?tab=kelola&subtab=GURU_KBM'
            },
            sourceModule: {
              table: 'JadwalPiketGuru',
              entityId: piket.id
            }
          });
        } else {
          // Jadwal Bertugas Mendatang (UPCOMING)
          const relativeText = diffDays === 1 ? 'Besok' : `${diffDays} hari lagi`;
          actionItems.push({
            id: `piket_duty_upcoming_${piket.id}`,
            division: 'PIKET',
            urgency: 'UPCOMING',
            title: `Jadwal Piket: ${hariLabel}`,
            subtitle: dutySubtitle,
            badgeText: `${hariLabel} (${relativeText})`,
            deadline: piket.jam_mulai ? `${piket.jam_mulai} WIB` : null,
            action: {
              label: 'Buka Piket ➔',
              type: 'NAVIGATE',
              target: '/dashboard?tab=kelola&subtab=GURU_KBM'
            },
            sourceModule: {
              table: 'JadwalPiketGuru',
              entityId: piket.id
            }
          });
        }
      }

      // Urutkan item piket: TODAY duluan, lalu UPCOMING terdekat
      actionItems.sort((a, b) => {
        if (a.urgency === 'TODAY' && b.urgency !== 'TODAY') return -1;
        if (b.urgency === 'TODAY' && a.urgency !== 'TODAY') return 1;
        return 0;
      });

      return actionItems;
    } catch (e) {
      return [];
    }
  }

  // --- DETECTOR 3: Pembina Upacara Terdekat (Modul Kesiswaan) ---
  private async detectUpacaraDuty(tenantId: string, guruId: string, startOfDay: Date): Promise<UnifiedActionItem[]> {
    try {
      const nextWeek = new Date(startOfDay.getTime() + (7 * 24 * 60 * 60 * 1000));

      const upacara = await prisma.jadwalPembinaUpacara.findFirst({
        where: {
          tenant_id: tenantId,
          guru_id: guruId,
          tanggal: { gte: startOfDay, lte: nextWeek },
          status: 'DIJADWALKAN'
        },
        include: {
          KelasPetugas: { select: { nama_kelas: true } }
        },
        orderBy: { tanggal: 'asc' }
      });

      if (!upacara) return [];

      const tglFormatted = new Date(upacara.tanggal).toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      });

      return [{
        id: `upacara_duty_${upacara.id}`,
        division: 'KESISWAAN',
        urgency: 'UPCOMING',
        title: 'Petugas Pembina Upacara',
        subtitle: `Tema: ${upacara.tema_amanat || 'Kedisiplinan'} • ${upacara.KelasPetugas?.nama_kelas ? 'Petugas: ' + upacara.KelasPetugas.nama_kelas : 'Upacara Bendera'}`,
        badgeText: tglFormatted,
        action: {
          label: 'Detail Upacara ➔',
          type: 'NAVIGATE',
          target: '/dashboard?tab=kelola'
        },
        sourceModule: {
          table: 'JadwalPembinaUpacara',
          entityId: upacara.id
        }
      }];
    } catch (e) {
      return [];
    }
  }

  // --- DETECTOR 4: Penginputan Nilai PKL & Nilai Sidang (Modul Hubin) ---
  private async detectPklTasks(tenantId: string, guruId: string): Promise<UnifiedActionItem[]> {
    try {
      const activeTp = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true },
      });

      const tpFilter = activeTp?.id
        ? {
            OR: [
              { Siswa: { tahun_pelajaran_id: activeTp.id } },
              { SiswaAkademik: { tahun_pelajaran_id: activeTp.id } },
            ],
          }
        : {};

      const items: UnifiedActionItem[] = [];

      // 1. Channel Penginputan Nilai PKL (Kandidat Guru dari Ploting Penempatan Siswa PKL)
      const bimbinganStudents = await prisma.siswaPkl.findMany({
        where: {
          tenant_id: tenantId,
          pembimbing_id: guruId,
          status: { in: ['AKTIF', 'SELESAI'] },
          ...tpFilter,
        },
        select: {
          id: true,
          instruktur_nama: true,
          penanggung_jawab_nama: true,
          nilai_akhir_pkl: true,
          hard_kompetensi_teknis: true,
          hard_sop_k3lh: true,
          hard_alur_bisnis: true,
          soft_kedisiplinan: true,
          soft_kerajinan_inisiatif: true,
          soft_kerjasama: true,
          soft_kejujuran: true,
          soft_tanggung_jawab: true,
          nilai_json: true,
          Siswa: { select: { status: true } },
        },
      });

      const isPositiveScore = (v: unknown) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v)) && Number(v) > 0;
      const isExemptedPkl = (row: any) => {
        const st = String(row?.Siswa?.status || 'AKTIF').toUpperCase();
        const sanggah = (row?.nilai_json as any)?.pkl_sanggah;
        return st !== 'AKTIF' || (sanggah?.active === true && sanggah?.status !== 'REJECTED');
      };

      const activeBimbinganStudents = bimbinganStudents.filter((s) => !isExemptedPkl(s));

      if (activeBimbinganStudents.length > 0) {
        const totalBimbingan = activeBimbinganStudents.length;
        const assessedBimbingan = activeBimbinganStudents.filter((s) => {
          const all8Scores = [
            s.hard_kompetensi_teknis,
            s.hard_sop_k3lh,
            s.hard_alur_bisnis,
            s.soft_kedisiplinan,
            s.soft_kerajinan_inisiatif,
            s.soft_kerjasama,
            s.soft_kejujuran,
            s.soft_tanggung_jawab,
          ].every(isPositiveScore);
          const hasPimpinan = typeof s.penanggung_jawab_nama === 'string' && s.penanggung_jawab_nama.trim().length > 0;
          const hasInstruktur = typeof s.instruktur_nama === 'string' && s.instruktur_nama.trim().length > 0;
          return all8Scores && hasPimpinan && hasInstruktur;
        }).length;
        const unassessedBimbingan = totalBimbingan - assessedBimbingan;

        items.push({
          id: `pkl_nilai_pembimbing_${guruId}`,
          division: 'HUBIN',
          urgency: unassessedBimbingan > 0 ? 'CRITICAL' : 'INFO',
          title: 'Penginputan Nilai PKL',
          subtitle: unassessedBimbingan > 0
            ? `${totalBimbingan} Siswa bimbingan PKL (${unassessedBimbingan} belum dinilai)`
            : `${totalBimbingan} Siswa bimbingan PKL (Semua telah dinilai)`,
          badgeText: unassessedBimbingan > 0 ? `${unassessedBimbingan} Belum Dinilai` : 'Lengkap',
          progress: {
            current: assessedBimbingan,
            total: totalBimbingan,
            percent: Math.round((assessedBimbingan / totalBimbingan) * 100),
            label: `${assessedBimbingan}/${totalBimbingan} Dinilai`,
            variant: 'rose',
          },
          action: {
            label: 'Input Nilai ➔',
            type: 'NAVIGATE',
            target: '/dashboard?tab=pembimbing_pkl&subtab=penilaian',
          },
          sourceModule: {
            table: 'SiswaPkl',
            entityId: guruId,
          },
        });
      }

      // 2. Channel Penginputan Nilai Sidang (Kandidat Guru dari Ploting Penguji Sidang PKL)
      const sidangStudents = await prisma.siswaPkl.findMany({
        where: {
          tenant_id: tenantId,
          status: { in: ['AKTIF', 'SELESAI'] },
          nilai_json: {
            path: ['penguji_id'],
            equals: guruId,
          },
          ...tpFilter,
        },
        select: {
          id: true,
          nilai_json: true,
          Siswa: { select: { status: true } },
        },
      });

      const activeSidangStudents = sidangStudents.filter((s) => !isExemptedPkl(s));

      if (activeSidangStudents.length > 0) {
        const totalSidang = activeSidangStudents.length;
        const assessedSidang = activeSidangStudents.filter((s) => {
          const nJson = (s.nilai_json as any) || {};
          return [
            nJson.sidang_portofolio,
            nJson.sidang_materi,
            nJson.sidang_komunikasi,
            nJson.sidang_sikap,
          ].every(isPositiveScore);
        }).length;
        const unassessedSidang = totalSidang - assessedSidang;

        items.push({
          id: `pkl_nilai_sidang_${guruId}`,
          division: 'HUBIN',
          urgency: unassessedSidang > 0 ? 'CRITICAL' : 'INFO',
          title: 'Penginputan Nilai Sidang PKL',
          subtitle: unassessedSidang > 0
            ? `${totalSidang} Siswa uji sidang PKL (${unassessedSidang} belum dinilai sidang)`
            : `${totalSidang} Siswa uji sidang PKL (Semua telah dinilai sidang)`,
          badgeText: unassessedSidang > 0 ? `${unassessedSidang} Belum Diuji` : 'Lengkap',
          progress: {
            current: assessedSidang,
            total: totalSidang,
            percent: Math.round((assessedSidang / totalSidang) * 100),
            label: `${assessedSidang}/${totalSidang} Teruji`,
            variant: 'rose',
          },
          action: {
            label: 'Nilai Sidang ➔',
            type: 'NAVIGATE',
            target: '/dashboard?tab=ringkasan&subtab=sidang_guru',
          },
          sourceModule: {
            table: 'SiswaPkl',
            entityId: guruId,
          },
        });
      }

      return items;
    } catch (e) {
      return [];
    }
  }

  // --- DETECTOR 4B: Formulasi TP DU/DI (Khusus Kepala Jurusan / Kaprog) ---
  private async detectKaprogTpDudiTasks(
    tenantId: string,
    userId: string,
    guruId?: string
  ): Promise<UnifiedActionItem[]> {
    try {
      const now = new Date();

      // 1. Ambil penugasan organisasi aktif user sebagai KAPROG / KAJUR
      const assignments = await prisma.organizationalAssignment.findMany({
        where: {
          user_id: userId,
          tenant_id: tenantId,
          is_active: true,
          AND: [
            { OR: [{ start_date: null }, { start_date: { lte: now } }] },
            { OR: [{ end_date: null }, { end_date: { gte: now } }] },
          ],
          Position: {
            OR: [
              { code: STRUKTUR_CODES.KAPROG },
              { code: { contains: 'KAPROG', mode: 'insensitive' } },
              { code: { contains: 'KAJUR', mode: 'insensitive' } },
              { name: { contains: 'Ketua Jurusan', mode: 'insensitive' } },
              { name: { contains: 'Kepala Program', mode: 'insensitive' } },
            ],
          },
        },
        include: {
          Unit: {
            select: { id: true, nama: true, singkatan: true, kode: true },
          },
        },
      });

      if (!assignments || assignments.length === 0) {
        return [];
      }

      // Ambil tahun pelajaran aktif
      const activeTp = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, tahun: true },
      });

      const items: UnifiedActionItem[] = [];

      for (const assignment of assignments) {
        const jurusan = assignment.Unit;
        if (!jurusan) continue;

        try {
          const pklSummary = await this.hubinPenilaianService.getKaprogPklSummary(
            tenantId,
            userId,
            jurusan.id,
            undefined,
            { tahunPelajaranId: activeTp?.id }
          );

          const tpStatus = pklSummary?.tpStatus || {
            totalMitra: 0,
            filledMitra: 0,
            pendingMitra: 0,
            completionPercentage: 100,
          };

          const totalMitra = tpStatus.totalMitra || 0;
          const filledMitra = tpStatus.filledMitra || 0;
          const pendingMitra = tpStatus.pendingMitra || 0;
          const completionPercentage = tpStatus.completionPercentage || 0;
          const jurusanLabel = jurusan.singkatan || jurusan.nama;

          if (pendingMitra > 0) {
            items.push({
              id: `kaprog_tp_dudi_${jurusan.id}`,
              division: 'HUBIN',
              urgency: 'CRITICAL',
              title: `Formulasi TP DU/DI — ${jurusanLabel}`,
              subtitle: `Anda seorang Kajur. Ada pekerjaan pengisian rumusan Tujuan Pembelajaran (TP) PKL untuk ${pendingMitra} dari ${totalMitra} Mitra Industri.${
                (tpStatus.rolloverAvailableCount || 0) > 0
                  ? ` ${tpStatus.rolloverAvailableCount} di antaranya bisa disalin dari rumusan tahun lalu.`
                  : ''
              }`,
              badgeText: `${pendingMitra} Mitra Belum Diisi`,
              progress: {
                current: filledMitra,
                total: totalMitra,
                percent: completionPercentage,
                label: `${filledMitra}/${totalMitra} Mitra Terformulasi`,
                variant: 'rose',
              },
              action: {
                label: 'Isi TP DUDI ➔',
                type: 'NAVIGATE',
                target: `/dashboard?tab=kaprog&subtab=pkl&jurusan_id=${jurusan.id}`,
              },
              sourceModule: {
                table: 'SettingDeskripsiPkl',
                entityId: jurusan.id,
              },
            });
          } else if (totalMitra > 0 && pendingMitra === 0) {
            items.push({
              id: `kaprog_tp_dudi_${jurusan.id}`,
              division: 'HUBIN',
              urgency: 'INFO',
              title: `Formulasi TP DU/DI — ${jurusanLabel}`,
              subtitle: `Anda seorang Kajur. Seluruh rumusan Tujuan Pembelajaran (TP) PKL untuk ${totalMitra} Mitra Industri telah lengkap.`,
              badgeText: 'Lengkap',
              progress: {
                current: totalMitra,
                total: totalMitra,
                percent: 100,
                label: `${totalMitra}/${totalMitra} Mitra Selesai`,
                variant: 'emerald',
              },
              action: {
                label: 'Lihat Formulasi ➔',
                type: 'NAVIGATE',
                target: `/dashboard?tab=kaprog&subtab=pkl&jurusan_id=${jurusan.id}`,
              },
              sourceModule: {
                table: 'SettingDeskripsiPkl',
                entityId: jurusan.id,
              },
            });
          }

          // ── KANAL 2 KAJUR: Ploting Guru Penguji Sidang PKL ──
          const plotingStatus = (pklSummary as any)?.plotingPengujiStatus || {
            totalSiswa: 0,
            sudahDiplot: 0,
            belumDiplot: 0,
            completionPercentage: 100,
          };

          const totalSiswaPloting = plotingStatus.totalSiswa || 0;
          const sudahDiplot = plotingStatus.sudahDiplot || 0;
          const belumDiplot = plotingStatus.belumDiplot || 0;
          const completionPloting = plotingStatus.completionPercentage || 0;

          if (belumDiplot > 0) {
            items.push({
              id: `kaprog_ploting_penguji_${jurusan.id}`,
              division: 'HUBIN',
              urgency: 'CRITICAL',
              title: `Ploting Penguji Sidang PKL — ${jurusanLabel}`,
              subtitle: `Anda seorang Kajur. Ada pekerjaan ploting Guru Penguji Sidang PKL untuk ${belumDiplot} dari ${totalSiswaPloting} siswa PKL.`,
              badgeText: `${belumDiplot} Belum Diplot`,
              progress: {
                current: sudahDiplot,
                total: totalSiswaPloting,
                percent: completionPloting,
                label: `${sudahDiplot}/${totalSiswaPloting} Terploting`,
                variant: 'rose',
              },
              action: {
                label: 'Ploting Penguji ➔',
                type: 'NAVIGATE',
                target: `/dashboard?tab=kaprog&subtab=ploting_penguji&jurusan_id=${jurusan.id}`,
              },
              sourceModule: {
                table: 'SiswaPkl',
                entityId: jurusan.id,
              },
            });
          } else if (totalSiswaPloting > 0 && belumDiplot === 0) {
            items.push({
              id: `kaprog_ploting_penguji_${jurusan.id}`,
              division: 'HUBIN',
              urgency: 'INFO',
              title: `Ploting Penguji Sidang PKL — ${jurusanLabel}`,
              subtitle: `Anda seorang Kajur. Seluruh siswa PKL (${totalSiswaPloting} siswa) telah selesai diplot Penguji Sidang.`,
              badgeText: 'Lengkap',
              progress: {
                current: totalSiswaPloting,
                total: totalSiswaPloting,
                percent: 100,
                label: `${totalSiswaPloting}/${totalSiswaPloting} Terploting`,
                variant: 'emerald',
              },
              action: {
                label: 'Lihat Ploting ➔',
                type: 'NAVIGATE',
                target: `/dashboard?tab=kaprog&subtab=ploting_penguji&jurusan_id=${jurusan.id}`,
              },
              sourceModule: {
                table: 'SiswaPkl',
                entityId: jurusan.id,
              },
            });
          }

          // ── KANAL 3 KAJUR: Monitoring & Ingatkan Pembimbing PKL (Input Nilai DUDI + Identitas Pimpinan/Instruktur) ──
          const penilaianStatus = (pklSummary as any)?.penilaianStatus || {
            totalSiswaPkl: 0,
            sudahDinilaiDudi: 0,
            belumDinilaiDudi: 0,
            unassessedPembimbingCount: 0,
            unassessedPengujiCount: 0,
            sudahSidang: 0,
            belumSidang: 0,
          };

          const totalSiswaNilai = penilaianStatus.totalSiswaPkl || 0;
          const sudahDinilai = penilaianStatus.sudahDinilaiDudi || 0;
          const belumDinilai = penilaianStatus.belumDinilaiDudi || 0;
          const unassessedPembimbing = penilaianStatus.unassessedPembimbingCount || 0;
          const percentNilai = totalSiswaNilai > 0 ? Math.round((sudahDinilai / totalSiswaNilai) * 100) : 100;

          if (belumDinilai > 0) {
            items.push({
              id: `kaprog_reminder_pembimbing_${jurusan.id}`,
              division: 'HUBIN',
              urgency: 'CRITICAL',
              title: `Monitoring Nilai Pembimbing PKL — ${jurusanLabel}`,
              subtitle: unassessedPembimbing > 0
                ? `Anda seorang Kajur. Ada ${belumDinilai} dari ${totalSiswaNilai} siswa PKL yang belum lengkap 8 komponen nilai DUDI & identitas Pimpinan/Instruktur oleh ${unassessedPembimbing} Guru Pembimbing PKL. Segera ingatkan pembimbing!`
                : `Anda seorang Kajur. Ada ${belumDinilai} dari ${totalSiswaNilai} siswa PKL yang belum lengkap 8 komponen nilai DUDI & identitas Pimpinan/Instruktur.`,
              badgeText: `${belumDinilai} Belum Lengkap`,
              progress: {
                current: sudahDinilai,
                total: totalSiswaNilai,
                percent: percentNilai,
                label: `${sudahDinilai}/${totalSiswaNilai} Lengkap`,
                variant: 'rose',
              },
              action: {
                label: 'Ingatkan Pembimbing ➔',
                type: 'NAVIGATE',
                target: `/dashboard?tab=kaprog&subtab=nilai_pkl&jurusan_id=${jurusan.id}`,
              },
              sourceModule: {
                table: 'SiswaPkl',
                entityId: jurusan.id,
              },
            });
          } else if (totalSiswaNilai > 0 && belumDinilai === 0) {
            items.push({
              id: `kaprog_reminder_pembimbing_${jurusan.id}`,
              division: 'HUBIN',
              urgency: 'INFO',
              title: `Monitoring Nilai Pembimbing PKL — ${jurusanLabel}`,
              subtitle: `Anda seorang Kajur. Seluruh siswa PKL (${totalSiswaNilai} siswa) telah lengkap 8 komponen nilai DUDI & identitas Pimpinan/Instruktur.`,
              badgeText: 'Lengkap',
              progress: {
                current: totalSiswaNilai,
                total: totalSiswaNilai,
                percent: 100,
                label: `${totalSiswaNilai}/${totalSiswaNilai} Lengkap`,
                variant: 'emerald',
              },
              action: {
                label: 'Lihat Nilai PKL ➔',
                type: 'NAVIGATE',
                target: `/dashboard?tab=kaprog&subtab=nilai_pkl&jurusan_id=${jurusan.id}`,
              },
              sourceModule: {
                table: 'SiswaPkl',
                entityId: jurusan.id,
              },
            });
          }

          // ── KANAL 4 KAJUR: Monitoring & Ingatkan Penguji Sidang PKL (Input 4 Komponen Nilai Sidang) ──
          const sudahSidang = penilaianStatus.sudahSidang || 0;
          const belumSidang = penilaianStatus.belumSidang || 0;
          const unassessedPenguji = penilaianStatus.unassessedPengujiCount || 0;
          const percentSidang = totalSiswaNilai > 0 ? Math.round((sudahSidang / totalSiswaNilai) * 100) : 100;

          if (belumSidang > 0) {
            items.push({
              id: `kaprog_reminder_penguji_${jurusan.id}`,
              division: 'HUBIN',
              urgency: 'CRITICAL',
              title: `Monitoring Nilai Sidang PKL — ${jurusanLabel}`,
              subtitle: unassessedPenguji > 0
                ? `Anda seorang Kajur. Ada ${belumSidang} dari ${totalSiswaNilai} siswa PKL yang belum lengkap 4 komponen nilai Sidang oleh ${unassessedPenguji} Guru Penguji Sidang. Segera ingatkan penguji!`
                : `Anda seorang Kajur. Ada ${belumSidang} dari ${totalSiswaNilai} siswa PKL yang belum lengkap 4 komponen nilai Sidang PKL.`,
              badgeText: `${belumSidang} Belum Sidang`,
              progress: {
                current: sudahSidang,
                total: totalSiswaNilai,
                percent: percentSidang,
                label: `${sudahSidang}/${totalSiswaNilai} Teruji`,
                variant: 'rose',
              },
              action: {
                label: 'Ingatkan Penguji ➔',
                type: 'NAVIGATE',
                target: `/dashboard?tab=kaprog&subtab=sidang_pkl&jurusan_id=${jurusan.id}`,
              },
              sourceModule: {
                table: 'SiswaPkl',
                entityId: jurusan.id,
              },
            });
          } else if (totalSiswaNilai > 0 && belumSidang === 0) {
            items.push({
              id: `kaprog_reminder_penguji_${jurusan.id}`,
              division: 'HUBIN',
              urgency: 'INFO',
              title: `Monitoring Nilai Sidang PKL — ${jurusanLabel}`,
              subtitle: `Anda seorang Kajur. Seluruh siswa PKL (${totalSiswaNilai} siswa) telah lengkap 4 komponen nilai Sidang PKL.`,
              badgeText: 'Lengkap',
              progress: {
                current: totalSiswaNilai,
                total: totalSiswaNilai,
                percent: 100,
                label: `${totalSiswaNilai}/${totalSiswaNilai} Teruji`,
                variant: 'emerald',
              },
              action: {
                label: 'Lihat Nilai Sidang ➔',
                type: 'NAVIGATE',
                target: `/dashboard?tab=kaprog&subtab=sidang_pkl&jurusan_id=${jurusan.id}`,
              },
              sourceModule: {
                table: 'SiswaPkl',
                entityId: jurusan.id,
              },
            });
          }
        } catch (innerErr) {
          // Fail gracefully per jurusan
        }
      }

      return items;
    } catch (error) {
      return [];
    }
  }

  // --- DETECTOR 4C: Staf Hubin — Ingatkan Kaprog Terkait Nilai PKL & Sidang Belum Tuntas ---
  private async detectHubinStaffPklReminderTasks(
    tenantId: string,
    userId: string
  ): Promise<UnifiedActionItem[]> {
    try {
      const now = new Date();
      const hubinAssignment = await prisma.organizationalAssignment.findFirst({
        where: {
          user_id: userId,
          tenant_id: tenantId,
          is_active: true,
          AND: [
            { OR: [{ start_date: null }, { start_date: { lte: now } }] },
            { OR: [{ end_date: null }, { end_date: { gte: now } }] },
          ],
          Position: {
            OR: [
              { code: STRUKTUR_CODES.HUBIN },
              { code: { contains: 'HUBIN', mode: 'insensitive' } },
              { name: { contains: 'Hubin', mode: 'insensitive' } },
              { name: { contains: 'Hubungan Industri', mode: 'insensitive' } },
            ],
          },
        },
        select: { id: true },
      });

      if (!hubinAssignment) return [];

      const [activeTp, jurusans] = await Promise.all([
        prisma.tahunPelajaran.findFirst({
          where: { tenant_id: tenantId, is_active: true },
          select: { id: true },
        }),
        prisma.jurusan.findMany({
          where: { tenant_id: tenantId },
          select: { id: true, nama: true, singkatan: true },
          orderBy: { nama: 'asc' },
        }),
      ]);

      if (!jurusans || jurusans.length === 0) return [];

      const summaries = await Promise.all(
        jurusans.map(async (j) => {
          try {
            const pklSummary = await this.hubinPenilaianService.getKaprogPklSummary(
              tenantId,
              '',
              j.id,
              undefined,
              { tahunPelajaranId: activeTp?.id }
            );
            return { jurusan: j, pklSummary };
          } catch {
            return null;
          }
        })
      );

      let totalSiswaAll = 0;
      let totalSudahNilai = 0;
      let totalBelumNilai = 0;
      let totalSudahSidang = 0;
      let totalBelumSidang = 0;
      const incompleteNilaiJurusans: string[] = [];
      const incompleteSidangJurusans: string[] = [];

      for (const entry of summaries) {
        if (!entry || !entry.pklSummary) continue;
        const ps = (entry.pklSummary as any).penilaianStatus || {};
        const total = ps.totalSiswaPkl || 0;
        if (total === 0) continue;

        const label = entry.jurusan.singkatan || entry.jurusan.nama;
        const sudahNilai = ps.sudahDinilaiDudi || 0;
        const belumNilai = ps.belumDinilaiDudi || 0;
        const sudahSidang = ps.sudahSidang || 0;
        const belumSidang = ps.belumSidang || 0;

        totalSiswaAll += total;
        totalSudahNilai += sudahNilai;
        totalBelumNilai += belumNilai;
        totalSudahSidang += sudahSidang;
        totalBelumSidang += belumSidang;

        if (belumNilai > 0) incompleteNilaiJurusans.push(`${label} (${belumNilai})`);
        if (belumSidang > 0) incompleteSidangJurusans.push(`${label} (${belumSidang})`);
      }

      if (totalSiswaAll === 0) return [];

      const items: UnifiedActionItem[] = [];
      const percentNilai = Math.round((totalSudahNilai / totalSiswaAll) * 100);
      const percentSidang = Math.round((totalSudahSidang / totalSiswaAll) * 100);

      // Kanal 1: Pengingat Nilai PKL (DUDI) ke Kaprog
      if (totalBelumNilai > 0) {
        const previewJurusan = incompleteNilaiJurusans.slice(0, 4).join(', ') +
          (incompleteNilaiJurusans.length > 4 ? ` +${incompleteNilaiJurusans.length - 4} jurusan` : '');
        items.push({
          id: `hubin_staff_reminder_nilai_pkl_${tenantId}`,
          division: 'HUBIN',
          urgency: 'CRITICAL',
          title: 'Ingatkan Kaprog: Nilai PKL Belum Tuntas',
          subtitle: `Anda sebagai Staf Hubin. Ada ${totalBelumNilai} dari ${totalSiswaAll} siswa PKL belum lengkap nilai DUDI pada ${incompleteNilaiJurusans.length} jurusan (${previewJurusan}). Segera ingatkan Kaprog terkait!`,
          badgeText: `${totalBelumNilai} Belum Tuntas`,
          progress: {
            current: totalSudahNilai,
            total: totalSiswaAll,
            percent: percentNilai,
            label: `${totalSudahNilai}/${totalSiswaAll} Siswa (${percentNilai}%)`,
            variant: 'rose',
          },
          action: {
            label: 'Pantau Nilai PKL ➔',
            type: 'NAVIGATE',
            target: '/dashboard?tab=hubin&subtab=nilai',
          },
          sourceModule: {
            table: 'SiswaPkl',
            entityId: tenantId,
          },
        });
      } else {
        items.push({
          id: `hubin_staff_reminder_nilai_pkl_${tenantId}`,
          division: 'HUBIN',
          urgency: 'INFO',
          title: 'Monitoring Nilai PKL Seluruh Jurusan',
          subtitle: `Anda sebagai Staf Hubin. Seluruh nilai PKL (${totalSiswaAll} siswa) di semua jurusan telah tuntas dilengkapi.`,
          badgeText: 'Tuntas',
          progress: {
            current: totalSiswaAll,
            total: totalSiswaAll,
            percent: 100,
            label: `${totalSiswaAll}/${totalSiswaAll} Siswa (100%)`,
            variant: 'emerald',
          },
          action: {
            label: 'Lihat Nilai PKL ➔',
            type: 'NAVIGATE',
            target: '/dashboard?tab=hubin&subtab=nilai',
          },
          sourceModule: {
            table: 'SiswaPkl',
            entityId: tenantId,
          },
        });
      }

      // Kanal 2: Pengingat Nilai Sidang PKL ke Kaprog
      if (totalBelumSidang > 0) {
        const previewSidang = incompleteSidangJurusans.slice(0, 4).join(', ') +
          (incompleteSidangJurusans.length > 4 ? ` +${incompleteSidangJurusans.length - 4} jurusan` : '');
        items.push({
          id: `hubin_staff_reminder_nilai_sidang_${tenantId}`,
          division: 'HUBIN',
          urgency: 'CRITICAL',
          title: 'Ingatkan Kaprog: Nilai Sidang PKL Belum Tuntas',
          subtitle: `Anda sebagai Staf Hubin. Ada ${totalBelumSidang} dari ${totalSiswaAll} siswa PKL belum lengkap nilai Sidang pada ${incompleteSidangJurusans.length} jurusan (${previewSidang}). Segera ingatkan Kaprog terkait!`,
          badgeText: `${totalBelumSidang} Belum Tuntas`,
          progress: {
            current: totalSudahSidang,
            total: totalSiswaAll,
            percent: percentSidang,
            label: `${totalSudahSidang}/${totalSiswaAll} Siswa (${percentSidang}%)`,
            variant: 'rose',
          },
          action: {
            label: 'Pantau Nilai Sidang ➔',
            type: 'NAVIGATE',
            target: '/dashboard?tab=hubin&subtab=nilai',
          },
          sourceModule: {
            table: 'SiswaPkl',
            entityId: tenantId,
          },
        });
      } else {
        items.push({
          id: `hubin_staff_reminder_nilai_sidang_${tenantId}`,
          division: 'HUBIN',
          urgency: 'INFO',
          title: 'Monitoring Nilai Sidang PKL Seluruh Jurusan',
          subtitle: `Anda sebagai Staf Hubin. Seluruh nilai Sidang PKL (${totalSiswaAll} siswa) di semua jurusan telah tuntas dilengkapi.`,
          badgeText: 'Tuntas',
          progress: {
            current: totalSiswaAll,
            total: totalSiswaAll,
            percent: 100,
            label: `${totalSiswaAll}/${totalSiswaAll} Siswa (100%)`,
            variant: 'emerald',
          },
          action: {
            label: 'Lihat Nilai Sidang ➔',
            type: 'NAVIGATE',
            target: '/dashboard?tab=hubin&subtab=nilai',
          },
          sourceModule: {
            table: 'SiswaPkl',
            entityId: tenantId,
          },
        });
      }

      return items;
    } catch {
      return [];
    }
  }

  // --- DETECTOR 5: Rapor & Penginputan Nilai (Modul Rapor) ---
  private async detectRaporTasks(tenantId: string, userId: string, guruId?: string): Promise<UnifiedActionItem[]> {
    try {
      // Panggil engine resmi yang sama persis dengan halaman /rapor/input-nilai
      const progress = await NilaiService.getTeacherProgress(
        tenantId,
        { id: userId, roleName: 'GURU' },
        {}
      );

      if (progress && progress.tasks && progress.total_tasks > 0) {
        const tasks = progress.tasks;
        const uniqueMapelNames = Array.from(new Set(tasks.map((t: any) => t.nama_mapel).filter(Boolean)));
        const mapelLabel = uniqueMapelNames.length === 1 
          ? uniqueMapelNames[0] 
          : uniqueMapelNames.length > 1 
          ? `${uniqueMapelNames.length} Mata Pelajaran`
          : 'Akademik';

        const uncompletedCount = (progress.empty_tasks || 0) + (progress.partial_tasks || 0);

        return [{
          id: `rapor_task_${userId}`,
          division: 'RAPOR',
          urgency: uncompletedCount > 0 ? 'UPCOMING' : 'INFO',
          title: 'Penginputan Nilai Rapor & Formatif',
          subtitle: `Mengampu ${progress.total_tasks} rombel kelas binaan (${mapelLabel})`,
          badgeText: `${progress.total_tasks} Rombel`,
          progress: {
            current: progress.completed_tasks || 0,
            total: progress.total_tasks,
            percent: progress.percentage || 0,
            label: `${progress.completed_tasks || 0}/${progress.total_tasks} Dinilai`
          },
          action: {
            label: 'Input Nilai ➔',
            type: 'NAVIGATE',
            target: '/dashboard?tab=ringkasan&subtab=nilai'
          },
          sourceModule: {
            table: 'NilaiSiswa',
            entityId: userId
          }
        }];
      }

      // STRICT: Tidak menggunakan fallback. Jika tidak ada tugas aktif dari NilaiService, return empty.
      return [];
    } catch (e) {
      return [];
    }
  }

  // --- DETECTOR 6: Peminjaman Aset Sarpras (Modul Sarpras) ---
  private async detectSarprasLoanTasks(tenantId: string, userId: string, startOfDay: Date): Promise<UnifiedActionItem[]> {
    try {
      const tomorrow = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000));

      const loans = await prisma.sarprasLoan.findMany({
        where: {
          tenant_id: tenantId,
          peminjam_id: userId,
          status: { in: ['APPROVED', 'DIPINJAM', 'ACTIVE', 'OVERDUE'] }
        },
        include: {
          Asset: { select: { nama: true, kode: true } }
        },
        take: 2
      });

      return loans.map(loan => {
        const isOverdue = loan.status === 'OVERDUE' || (loan.tanggal_kembali_plan && new Date(loan.tanggal_kembali_plan) < startOfDay);
        return {
          id: `sarpras_loan_${loan.id}`,
          division: 'SARPRAS',
          urgency: isOverdue ? 'CRITICAL' : 'TODAY',
          title: 'Pengembalian Aset Sarpras',
          subtitle: `Aset: ${(loan.Asset as any)?.nama || 'Barang Sekolah'} (${(loan.Asset as any)?.kode || '-'})`,
          badgeText: isOverdue ? 'Terlambat' : 'Jatuh Tempo',
          action: {
            label: 'Lihat Aset ➔',
            type: 'NAVIGATE',
            target: '/sarpras/inventory'
          },
          sourceModule: {
            table: 'SarprasLoan',
            entityId: loan.id
          }
        };
      });
    } catch (e) {
      return [];
    }
  }

  // --- DETECTOR 7: Kelengkapan & Revisi Perangkat Ajar (Modul Kurikulum/Pedagogik) ---
  private async detectPerangkatAjarTasks(
    tenantId: string,
    guruId: string
  ): Promise<UnifiedActionItem[]> {
    try {
      // 1. Dapatkan periode Tahun Pelajaran & Semester aktif
      const [activeTp, activeSem] = await Promise.all([
        prisma.tahunPelajaran.findFirst({
          where: { tenant_id: tenantId, is_active: true },
          select: { id: true, tahun: true }
        }),
        prisma.semester.findFirst({
          where: { tenant_id: tenantId, is_active: true },
          select: { id: true, nama_semester: true }
        })
      ]);

      const actionItems: UnifiedActionItem[] = [];

      // A. CEK 1: Dokumen yang berstatus REJECTED (Perlu Revisi dari Kurikulum)
      const rejectedDocs = await prisma.perangkatAjar.findMany({
        where: {
          tenant_id: tenantId,
          guru_id: guruId,
          status: 'REJECTED',
          ...(activeTp?.id ? { tahun_pelajaran_id: activeTp.id } : {})
        },
        include: {
          Mapel: { select: { nama_mapel: true } }
        },
        orderBy: { updated_at: 'desc' },
        take: 3
      });

      for (const doc of rejectedDocs) {
        actionItems.push({
          id: `perangkat_rejected_${doc.id}`,
          division: 'KURIKULUM',
          urgency: 'CRITICAL',
          title: 'Perangkat Ajar Perlu Revisi',
          subtitle: `${doc.judul} (${doc.Mapel?.nama_mapel || doc.jenis}) • ${doc.catatan_reviewer ? 'Catatan: ' + doc.catatan_reviewer : 'Perlu perbaikan sesuai catatan kurikulum'}`,
          badgeText: 'Perlu Revisi',
          action: {
            label: 'Perbaiki Dokumen ➔',
            type: 'NAVIGATE',
            target: '/dashboard?tab=ringkasan&subtab=perangkat'
          },
          sourceModule: {
            table: 'PerangkatAjar',
            entityId: doc.id
          }
        });
      }

      // B. CEK 2: Periksa kelengkapan perangkat ajar untuk Mapel yang diampu guru di TP Aktif
      if (activeTp?.id) {
        const [guruMapelRows, jadwalRows] = await Promise.all([
          prisma.guruMapel.findMany({
            where: {
              tenant_id: tenantId,
              guru_id: guruId,
              OR: [
                { tahun_pelajaran_id: activeTp.id },
                { tahun_pelajaran_id: null }
              ]
            },
            select: { mapel_id: true, Mapel: { select: { id: true, nama_mapel: true } } }
          }),
          prisma.jadwalKBM.findMany({
            where: {
              tenant_id: tenantId,
              tahun_pelajaran_id: activeTp.id,
              OR: [
                { guru_id: guruId },
                { guru_pelaksana_id: guruId }
              ],
              mapel_id: { not: null }
            },
            select: { mapel_id: true, Mapel: { select: { id: true, nama_mapel: true } } }
          })
        ]);

        const assignedMapelMap = new Map<string, string>();
        guruMapelRows.forEach((r: any) => {
          if (r.mapel_id && r.Mapel?.nama_mapel) assignedMapelMap.set(r.mapel_id, r.Mapel.nama_mapel);
        });
        jadwalRows.forEach((r: any) => {
          if (r.mapel_id && r.Mapel?.nama_mapel) assignedMapelMap.set(r.mapel_id, r.Mapel.nama_mapel);
        });

        if (assignedMapelMap.size > 0) {
          const uploadedDocs = await prisma.perangkatAjar.findMany({
            where: {
              tenant_id: tenantId,
              guru_id: guruId,
              tahun_pelajaran_id: activeTp.id
            },
            select: { mapel_id: true, status: true }
          });

          const uploadedMapelIds = new Set(uploadedDocs.map((d: any) => d.mapel_id));
          const unsubmittedMapels: string[] = [];

          assignedMapelMap.forEach((namaMapel, mapelId) => {
            if (!uploadedMapelIds.has(mapelId)) {
              unsubmittedMapels.push(namaMapel);
            }
          });

          if (unsubmittedMapels.length > 0) {
            const completedCount = assignedMapelMap.size - unsubmittedMapels.length;
            const totalCount = assignedMapelMap.size;
            const percent = Math.round((completedCount / totalCount) * 100);

            actionItems.push({
              id: `perangkat_unsubmitted_${guruId}`,
              division: 'KURIKULUM',
              urgency: unsubmittedMapels.length === totalCount ? 'TODAY' : 'UPCOMING',
              title: 'Kelengkapan Perangkat Ajar',
              subtitle: `Belum mengunggah berkas (${unsubmittedMapels.slice(0, 2).join(', ')}${unsubmittedMapels.length > 2 ? ' +' + (unsubmittedMapels.length - 2) + ' lainnya' : ''}) • TP ${activeTp.tahun || 'Aktif'}`,
              badgeText: `${completedCount}/${totalCount} Mapel`,
              progress: {
                current: completedCount,
                total: totalCount,
                percent,
                label: `${completedCount}/${totalCount} Terunggah`
              },
              action: {
                label: 'Unggah Perangkat ➔',
                type: 'NAVIGATE',
                target: '/dashboard?tab=ringkasan&subtab=perangkat'
              },
              sourceModule: {
                table: 'PerangkatAjar',
                entityId: guruId
              }
            });
          }
        }
      }

      return actionItems;
    } catch (e) {
      return [];
    }
  }

  /**
   * 8. Deteksi Tugas Pembuatan & Pengisian Bank Soal CBT Guru
   */
  private async detectCbtBankSoalTasks(tenantId: string, guruId: string): Promise<UnifiedActionItem[]> {
    try {
      const [activeTp, sekolahInfo, activeEvent] = await Promise.all([
        prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } }),
        prisma.sekolah.findFirst({ where: { tenant_id: tenantId }, select: { jenjang: true, durasi_smk: true } }),
        CbtSettingsService.getActiveEvent(tenantId),
      ]);
      if (!activeTp) return [];

      // Cakupan tingkat mutlak: ikuti target_tingkat event aktif, atau rentang jenjang tenant jika belum diset
      const jenjangUpper = String(sekolahInfo?.jenjang || 'SMK').toUpperCase();
      const defaultTingkatByJenjang =
        jenjangUpper === 'SD' || jenjangUpper === 'MI'
          ? [1, 2, 3, 4, 5, 6]
          : jenjangUpper === 'SMP' || jenjangUpper === 'MTS'
          ? [7, 8, 9]
          : jenjangUpper === 'SMK' || jenjangUpper === 'MAK'
          ? sekolahInfo?.durasi_smk === '4_TAHUN'
            ? [10, 11, 12, 13]
            : [10, 11, 12]
          : [10, 11, 12];
      const targetTingkat: number[] =
        Array.isArray(activeEvent?.target_tingkat) && activeEvent.target_tingkat.length > 0
          ? activeEvent.target_tingkat.map(Number).filter((n: number) => !Number.isNaN(n))
          : defaultTingkatByJenjang;

      const [guruMapelRows, jadwalRows, candidateBanks] = await Promise.all([
        prisma.guruMapel.findMany({
          where: { guru_id: guruId },
          include: {
            Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true, tingkat: true } },
            Kelas: {
              select: {
                id: true,
                nama_kelas: true,
                tingkat: true,
                jurusan_id: true,
                Jurusan: { select: { id: true, kode: true, singkatan: true, nama: true } },
              },
            },
            Jurusan: { select: { id: true, kode: true, singkatan: true, nama: true } },
          },
        }),
        prisma.jadwalKBM.findMany({
          where: {
            tenant_id: tenantId,
            tahun_pelajaran_id: activeTp.id,
            OR: [{ guru_id: guruId }, { guru_pelaksana_id: guruId }],
            mapel_id: { not: null },
          },
          include: {
            Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true, tingkat: true } },
            Kelas: {
              select: {
                id: true,
                nama_kelas: true,
                tingkat: true,
                jurusan_id: true,
                Jurusan: { select: { id: true, kode: true, singkatan: true, nama: true } },
              },
            },
          },
        }),
        prisma.cbtBankSoal.findMany({
          where: {
            tenant_id: tenantId,
            OR: [
              { guru_id: guruId },
              { Kontributor: { some: { guru_id: guruId } } },
            ],
          },
          include: {
            Kontributor: true,
          },
        }),
      ]);

      const ROMAN_MAP: Record<string, number> = {
        I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6,
        VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12, XIII: 13,
      };
      const ROMAN_LABELS: Record<number, string> = {
        1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
        7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII', 13: 'XIII',
      };

      const parseStrictTingkat = (raw: unknown): number | null => {
        if (raw === null || raw === undefined || raw === '') return null;
        const n = Number(raw);
        if (Number.isInteger(n) && n >= 1 && n <= 13) return n;
        if (typeof raw === 'string') {
          return ROMAN_MAP[raw.toUpperCase().trim()] ?? null;
        }
        return null;
      };

      const isNonAcademicDuty = (name: string, jenisKegiatan?: string | null): boolean => {
        if (jenisKegiatan && String(jenisKegiatan).toUpperCase() !== 'KBM') return true;
        const lower = (name || '').toLowerCase().trim();
        const nonAcademicKeywords = [
          'piket', 'tugas piket', 'bimbingan', 'konseling', 'bp/bk', 'bk',
          'upacara', 'apel', 'literasi', 'istirahat', 'sholat', 'duha', 'dzuhur',
          'ekskul', 'ekstrakurikuler', 'kokurikuler', 'wali kelas', 'p5',
          'projek penguatan', 'keagamaan', 'senam',
        ];
        return nonAcademicKeywords.some((kw) => lower.includes(kw));
      };

      const resolveStrictJurusan = (jurRef?: any, kelasRef?: any): { jurusanId?: string; jurusanKode: string } => {
        const jur = kelasRef?.Jurusan || jurRef;
        const jurusanId: string | undefined = kelasRef?.jurusan_id || jur?.id || undefined;
        const rawCode = jur?.kode || jur?.singkatan || jur?.nama || '';
        const clean = String(rawCode).toUpperCase().trim();
        const jurusanKode = !clean || clean === 'SEMUA' || clean === 'UMUM' ? 'UMUM' : clean;
        return { jurusanId, jurusanKode };
      };

      const mapelTingkatMap = new Map<string, any>();

      const registerRow = (
        mId: string,
        mName: string,
        mKode: string | undefined,
        rawTingkat: any,
        kName: string | undefined,
        jurRef: any,
        kelasRef: any,
        jenisKegiatan?: string | null
      ) => {
        if (!mId || !mName || isNonAcademicDuty(mName, jenisKegiatan)) return;
        // Mutlak tanpa fallback ke Tingkat 10 bila tingkat belum terikat ke kelas/mapel
        const tNum = parseStrictTingkat(rawTingkat);
        if (!tNum) return;
        if (targetTingkat.length > 0 && !targetTingkat.includes(tNum)) return;

        const { jurusanId, jurusanKode } = resolveStrictJurusan(jurRef, kelasRef);
        const key = `${mId}_${tNum}`;
        if (!mapelTingkatMap.has(key)) {
          mapelTingkatMap.set(key, {
            mapelId: mId,
            mapelName: mName,
            mapelKode: mKode,
            tingkat: tNum,
            jurusanMap: new Map<string, any>(),
          });
        }

        const entry = mapelTingkatMap.get(key);
        const jKey = jurusanId || jurusanKode;
        if (!entry.jurusanMap.has(jKey)) {
          entry.jurusanMap.set(jKey, {
            jurusanId,
            jurusanKode,
            rombelNames: new Set<string>(),
          });
        }
        if (kName) entry.jurusanMap.get(jKey).rombelNames.add(kName);
      };

      // Daftarkan dari JadwalKBM riil terlebih dahulu (punya kelas_id & Kelas.tingkat eksak)
      const kbmKeys = new Set<string>();
      for (const j of jadwalRows) {
        const tNum = parseStrictTingkat(j.Kelas?.tingkat ?? j.Mapel?.tingkat);
        if (j.mapel_id && tNum) {
          kbmKeys.add(`${j.mapel_id}_${tNum}`);
        }
        registerRow(
          j.mapel_id!,
          j.Mapel?.nama_mapel || '',
          j.Mapel?.kode_mapel ?? undefined,
          j.Kelas?.tingkat ?? j.Mapel?.tingkat,
          j.Kelas?.nama_kelas,
          null,
          j.Kelas,
          (j as any).jenis_kegiatan
        );
      }

      for (const gm of guruMapelRows) {
        const tNum = parseStrictTingkat(gm.Kelas?.tingkat ?? gm.Mapel?.tingkat);
        if (!tNum) continue;
        // Jika SK memiliki kelas_id eksplisit atau belum ada entri KBM spesifik pada mapel+tingkat ini, daftarkan
        if (gm.kelas_id || !kbmKeys.has(`${gm.mapel_id}_${tNum}`)) {
          registerRow(
            gm.mapel_id,
            gm.Mapel?.nama_mapel || '',
            gm.Mapel?.kode_mapel ?? undefined,
            gm.Kelas?.tingkat ?? gm.Mapel?.tingkat,
            gm.Kelas?.nama_kelas,
            gm.Jurusan,
            gm.Kelas
          );
        }
      }

      let totalDuties = 0;
      let coveredDuties = 0;
      const uncompletedList: string[] = [];

      const isGeneralBank = (b: any) => {
        if (b.jurusan_id) return false;
        if (Array.isArray(b.target_jurusan_ids) && b.target_jurusan_ids.length > 0) return false;
        const r = (b.jurusan || '').toUpperCase().trim();
        return !r || r === 'SEMUA' || r === 'UMUM';
      };

      for (const mt of mapelTingkatMap.values()) {
        const { mapelId, mapelName, tingkat, jurusanMap } = mt;
        const roman = ROMAN_LABELS[tingkat] || String(tingkat);

        // Pencocokan mutlak mapel_id + tingkat_num (tanpa fallback nama mapel / wildcard tingkat)
        const relatedBanks = candidateBanks.filter((b: any) => {
          if (b.mapel_id !== mapelId) return false;
          const bTingkatNum = parseStrictTingkat(b.tingkat_num ?? b.tingkat);
          return bTingkatNum === tingkat;
        });

        const generalBank = relatedBanks.find(isGeneralBank);
        const hasSpecificBanks = relatedBanks.some((b: any) => !isGeneralBank(b));
        const jurusanList = Array.from(jurusanMap.values());

        if (generalBank && !hasSpecificBanks) {
          totalDuties++;
          if (generalBank.jumlah_soal > 0) {
            coveredDuties++;
          } else {
            uncompletedList.push(`${mapelName} (Tingkat ${roman})`);
          }
          continue;
        }

        for (const jg of jurusanList) {
          const { jurusanId, jurusanKode } = jg;
          totalDuties++;
          const jCode = jurusanKode !== 'UMUM' ? jurusanKode : undefined;

          const matchedBank =
            relatedBanks.find((b: any) => {
              if (jurusanId) {
                if (b.jurusan_id && b.jurusan_id === jurusanId) return true;
                if (Array.isArray(b.target_jurusan_ids) && b.target_jurusan_ids.includes(jurusanId)) return true;
              }
              if (!b.jurusan || !jCode) return false;
              const parts = String(b.jurusan).toUpperCase().split(/[,;/|]+/).map((s: string) => s.trim()).filter(Boolean);
              return parts.includes(jCode);
            }) || generalBank;

          const label =
            jCode && !mapelName.toUpperCase().includes(jCode)
              ? `${mapelName} Jurusan ${jCode} (Tingkat ${roman})`
              : `${mapelName} (Tingkat ${roman})`;

          if (matchedBank && matchedBank.jumlah_soal > 0) {
            coveredDuties++;
          } else {
            uncompletedList.push(label);
          }
        }
      }

      if (totalDuties === 0 || coveredDuties >= totalDuties) {
        return [];
      }

      const percent = Math.round((coveredDuties / totalDuties) * 100);
      const eventLabel = activeEvent?.nama_event || `TP ${activeTp.tahun}`;

      return [{
        id: `cbt_bank_soal_${guruId}`,
        division: 'CBT',
        urgency: 'CRITICAL',
        title: 'Pembuatan Bank Soal CBT',
        subtitle: `Belum dibuat: ${uncompletedList.slice(0, 2).join(', ')}${uncompletedList.length > 2 ? ' +' + (uncompletedList.length - 2) + ' lainnya' : ''} • ${eventLabel}`,
        badgeText: `${coveredDuties}/${totalDuties} Siap`,
        progress: {
          current: coveredDuties,
          total: totalDuties,
          percent,
          label: `${coveredDuties}/${totalDuties} Siap (${percent}%)`,
          variant: 'rose',
        },
        action: {
          label: 'Buat Bank Soal ➔',
          type: 'NAVIGATE',
          target: '/dashboard?tab=ringkasan&subtab=cbt'
        },
        sourceModule: {
          table: 'CbtBankSoal',
          entityId: guruId
        }
      }];
    } catch (e) {
      return [];
    }
  }

  /**
   * 9. Deteksi Tugas Pengawasan Ujian CBT (Pra-Ujian & Sesi Berlangsung)
   */
  private async detectCbtPengawasTasks(tenantId: string, guruId: string): Promise<UnifiedActionItem[]> {
    try {
      const [activeTp, activeSem] = await Promise.all([
        prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
        prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
      ]);

      const mySchedules = await prisma.cbtJadwalUjian.findMany({
        where: {
          tenant_id: tenantId,
          status: { notIn: ['COMPLETED', 'ARCHIVED'] },
          ...(activeTp?.id ? { tahun_pelajaran_id: activeTp.id } : {}),
          ...(activeSem?.id ? { semester_id: activeSem.id } : {}),
          OR: [
            { setting_keamanan: { path: ['pengawas_1_id'], equals: guruId } },
            { setting_keamanan: { path: ['pengawas_2_id'], equals: guruId } },
            { setting_keamanan: { path: ['proktor_id'], equals: guruId } },
          ],
        },
        select: {
          id: true,
          nama_sesi: true,
          tanggal_mulai: true,
          tanggal_selesai: true,
          status: true,
          setting_keamanan: true,
          durasi_menit: true,
          BankSoal: {
            select: {
              judul: true,
              Mapel: { select: { nama_mapel: true } },
            },
          },
        },
        orderBy: { tanggal_mulai: 'asc' },
      });

      if (!mySchedules || mySchedules.length === 0) return [];

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      // Cari sesi live aktif
      const liveSessions = mySchedules.filter((j) => {
        if (j.status === 'ACTIVE') return true;
        const start = new Date(j.tanggal_mulai);
        const end = new Date(j.tanggal_selesai);
        return start <= now && now <= end;
      });

      // Cari sesi hari ini
      const todaySessions = mySchedules.filter((j) => {
        return (j.tanggal_mulai?.toISOString?.() || '').slice(0, 10) === todayStr;
      });

      if (liveSessions.length > 0) {
        const live = liveSessions[0];
        const cfg = (live.setting_keamanan as any) || {};
        const room = cfg.ruang_ujian || cfg.ruang_ujian_nama || 'Ruang Ujian';
        const mapel = live.BankSoal?.Mapel?.nama_mapel || live.BankSoal?.judul || 'Ujian CBT';

        return [{
          id: `cbt_pengawas_live_${guruId}`,
          division: 'CBT',
          urgency: 'CRITICAL',
          title: 'Sesi Pengawasan CBT Sedang Berlangsung',
          subtitle: `Segera buka meja monitoring: ${room} • ${mapel} (${live.durasi_menit} Menit)`,
          badgeText: 'LIVE BERLANGSUNG',
          progress: {
            current: 0,
            total: 1,
            variant: 'rose',
          },
          action: {
            label: 'Masuk Meja Pengawas ➔',
            type: 'NAVIGATE',
            target: '/dashboard?tab=ringkasan&subtab=pengawas_cbt',
          },
          sourceModule: {
            table: 'CbtJadwalUjian',
            entityId: live.id,
          },
        }];
      }

      if (todaySessions.length > 0) {
        const first = todaySessions[0];
        const cfg = (first.setting_keamanan as any) || {};
        const room = cfg.ruang_ujian || cfg.ruang_ujian_nama || 'Ruang Ujian';
        const mapel = first.BankSoal?.Mapel?.nama_mapel || first.BankSoal?.judul || 'Ujian CBT';

        return [{
          id: `cbt_pengawas_today_${guruId}`,
          division: 'CBT',
          urgency: 'TODAY',
          title: 'Jadwal Pengawasan CBT Hari Ini',
          subtitle: `${todaySessions.length} Sesi Terjadwal • Mulai di ${room} (${mapel})`,
          badgeText: `${todaySessions.length} Sesi Hari Ini`,
          progress: {
            current: 0,
            total: todaySessions.length,
            variant: 'amber',
          },
          action: {
            label: 'Buka Jadwal & Meja Pengawas ➔',
            type: 'NAVIGATE',
            target: '/dashboard?tab=ringkasan&subtab=pengawas_cbt',
          },
          sourceModule: {
            table: 'CbtJadwalUjian',
            entityId: first.id,
          },
        }];
      }

      // Fase Pra-Ujian (Upcoming / Mendatang)
      return [{
        id: `cbt_pengawas_upcoming_${guruId}`,
        division: 'CBT',
        urgency: 'UPCOMING',
        title: 'Jadwal Pengawasan Ujian CBT',
        subtitle: `Terplotting di ${mySchedules.length} Sesi Pengawasan Ruang Ujian (Fase Pra-Ujian)`,
        badgeText: `${mySchedules.length} Sesi Terdaftar`,
        action: {
          label: 'Lihat Jadwal Pengawasan ➔',
          type: 'NAVIGATE',
          target: '/dashboard?tab=ringkasan&subtab=pengawas_cbt',
        },
        sourceModule: {
          table: 'CbtJadwalUjian',
          entityId: guruId,
        },
      }];
    } catch (e) {
      return [];
    }
  }

  /**
   * 10. Deteksi Bank Soal Guru yang Sedang Digunakan Live dalam Ujian CBT
   */
  private async detectCbtLiveAuthorTasks(tenantId: string, guruId: string): Promise<UnifiedActionItem[]> {
    try {
      const [activeTp, activeSem] = await Promise.all([
        prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
        prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }),
      ]);

      const liveSchedules = await prisma.cbtJadwalUjian.findMany({
        where: {
          tenant_id: tenantId,
          status: { in: ['ACTIVE', 'PAUSED'] },
          ...(activeTp?.id ? { tahun_pelajaran_id: activeTp.id } : {}),
          ...(activeSem?.id ? { semester_id: activeSem.id } : {}),
          BankSoal: {
            OR: [
              { guru_id: guruId },
              { Kontributor: { some: { guru_id: guruId } } },
            ],
          },
        },
        select: {
          id: true,
          nama_sesi: true,
          status: true,
          durasi_menit: true,
          tanggal_mulai: true,
          tanggal_selesai: true,
          setting_keamanan: true,
          BankSoal: {
            select: {
              id: true,
              judul: true,
              Mapel: { select: { nama_mapel: true } },
            },
          },
          Peserta: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { tanggal_mulai: 'asc' },
      });

      if (!liveSchedules || liveSchedules.length === 0) return [];

      return liveSchedules.map((schedule) => {
        const totalPeserta = schedule.Peserta?.length || 0;
        const selesaiCount = schedule.Peserta?.filter((p) => p.status === 'FINISHED').length || 0;
        const sedangCount = schedule.Peserta?.filter((p) => p.status === 'IN_PROGRESS').length || 0;
        const mapelNama = schedule.BankSoal?.Mapel?.nama_mapel || schedule.BankSoal?.judul || 'Mata Pelajaran';
        const percent = totalPeserta > 0 ? Math.round((selesaiCount / totalPeserta) * 100) : 0;
        const statusLabel = schedule.status === 'PAUSED' ? ' (Sesi Dijeda)' : '';

        return {
          id: `cbt_author_live_${schedule.id}`,
          division: 'CBT',
          urgency: 'CRITICAL',
          title: `🔴 Soal Anda Live: ${mapelNama}${statusLabel}`,
          subtitle: `Sesi ${schedule.nama_sesi} • Bank Soal "${schedule.BankSoal?.judul || '-'}" • ${sedangCount} sedang mengerjakan, ${selesaiCount} selesai (${totalPeserta} siswa)`,
          badgeText: '🔴 SOAL LIVE BERLANGSUNG',
          progress: {
            current: selesaiCount,
            total: totalPeserta > 0 ? totalPeserta : 1,
            percent,
            label: `${selesaiCount}/${totalPeserta} Siswa Selesai (${percent}%)`,
            variant: 'rose',
          },
          action: {
            label: 'Pantau Sesi Ujian ➔',
            type: 'NAVIGATE',
            target: `/dashboard?tab=ringkasan&subtab=cbt&mode=sesi&sesi_id=${schedule.id}`,
          },
          sourceModule: {
            table: 'CbtJadwalUjian',
            entityId: schedule.id,
          },
        };
      });
    } catch (e) {
      return [];
    }
  }
}

export const dashboardActionHubService = new DashboardActionHubService();
