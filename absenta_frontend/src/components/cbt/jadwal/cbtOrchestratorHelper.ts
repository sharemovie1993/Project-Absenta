import type { CbtBankSoal, CbtJadwalUjian } from '@/types/cbt.types';
import { localDateTimeInputToISO } from '@/utils/attendance/time';
import { resolveBankTingkatNumber } from './cbtJadwalHelper';
import {
  isNonAcademicMapel,
  resolveStrictBankTingkat,
  resolveStrictTingkat,
} from '../bank-soal/cbtDutyEngine';
import { detectNodeTingkat } from '@/components/spasial/denahTingkatHelper';
import { resolveCbtEventPrefix, formatCanonicalSesiUjian, formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';

// ==========================================
// 1. DATA STRUCTURES & INTERFACES
// ==========================================

export interface KelasRoomMapping {
  kelas_id: string;
  nama_kelas: string;
  tingkat: number;
  jurusan_id?: string;
  kode_jurusan?: string;
  nama_jurusan?: string;
  slot_ruang: string; // Misal: 'R.01'
  nama_ruang: string; // Misal: 'Ruang 01'
  kapasitas?: number;
}

export interface ExamSessionSlot {
  session_index: number; // 1, 2, 3
  nama_sesi: string; // Misal: 'Sesi 1'
  jam_mulai: string; // Misal: '07:30'
  jam_selesai: string; // Misal: '08:30'
  durasi_menit: number; // Misal: 60
}

export interface ExamDayConfig {
  day_index: number;
  nama_hari: string; // 'Senin', 'Selasa', 'Rabu', etc.
  tanggal: string; // 'YYYY-MM-DD'
  sessions: ExamSessionSlot[];
}

/**
 * Konfigurasi Slot Multi-Jurusan (DDPK / Produktif Kejuruan).
 * Memetakan kode_jurusan atau jurusan_id -> bank_soal_id (atau auto_mapel_id).
 */
export interface MultiJurusanSlotConfig {
  title?: string; // Misal: "DDPK Kejuruan" atau "Mapel Produktif"
  assignments: Record<string, string>; // kode_jurusan / jurusan_id -> bank_soal_id
}

export const MULTI_JURUSAN_PREFIX = '__MULTI_JURUSAN__:';

export function isMultiJurusanSlot(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith(MULTI_JURUSAN_PREFIX);
}

export function serializeMultiJurusanSlot(config: MultiJurusanSlotConfig): string {
  return `${MULTI_JURUSAN_PREFIX}${JSON.stringify(config)}`;
}

export function parseMultiJurusanSlot(value?: string | null): MultiJurusanSlotConfig | null {
  if (!isMultiJurusanSlot(value)) return null;
  try {
    const jsonStr = (value as string).slice(MULTI_JURUSAN_PREFIX.length);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to parse multi-jurusan slot config:', err);
    return null;
  }
}

export function extractAllBankIdsFromMatrixValue(val?: string | null): string[] {
  if (!val) return [];
  if (isMultiJurusanSlot(val)) {
    const parsed = parseMultiJurusanSlot(val);
    if (!parsed?.assignments) return [];
    return Object.values(parsed.assignments).filter(Boolean);
  }
  return [val];
}

/**
 * Key matrix: `${day_index}_${session_index}_${tingkat}` => bank_soal_id atau serialized MultiJurusanSlotConfig
 */
export type TimetableMatrixState = Record<string, string>;

// ==========================================
// 2. KELAS-CENTRIC ROOM PLOTTING ENGINE (R.01 - R.n)
// ==========================================

const STORAGE_PREFIX = 'absenta_cbt_room_mappings_';

export function getStorageKeyRoomMappings(tenantId?: string, eventId?: string): string {
  const t = tenantId || 'global';
  return eventId ? `${STORAGE_PREFIX}${t}_evt_${eventId}` : `${STORAGE_PREFIX}${t}`;
}

export interface PersistedRoomStoragePayload {
  version: number;
  mappings: KelasRoomMapping[];
  mapObj: Record<string, { slot_ruang: string; nama_ruang: string }>;
  updated_at: string;
}

export function loadPersistedRoomMappingsList(tenantId?: string, eventId?: string): KelasRoomMapping[] | null {
  try {
    // Isolasi ketat per eventId: jangan fallback ke key global tenant agar mapping TP/event lain tidak bocor
    if (!eventId) return null;
    const rawEvent = localStorage.getItem(getStorageKeyRoomMappings(tenantId, eventId));
    if (!rawEvent) return null;
    const parsed = JSON.parse(rawEvent);
    if (parsed && Array.isArray(parsed.mappings) && parsed.mappings.length > 0) {
      return parsed.mappings;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadPersistedRoomMappings(
  tenantId?: string,
  eventId?: string
): Record<string, { slot_ruang: string; nama_ruang: string }> | null {
  try {
    // Isolasi ketat per eventId: jangan fallback ke key global tenant agar mapping TP/event lain tidak bocor
    if (!eventId) return null;
    const rawEvent = localStorage.getItem(getStorageKeyRoomMappings(tenantId, eventId));
    if (!rawEvent) return null;
    const parsed = JSON.parse(rawEvent);
    if (parsed?.mapObj && typeof parsed.mapObj === 'object') return parsed.mapObj;
    if (parsed && typeof parsed === 'object' && !parsed.mappings) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function savePersistedRoomMappings(
  mappings: KelasRoomMapping[],
  tenantId?: string,
  eventId?: string
): void {
  try {
    if (!eventId) return;
    const mapObj: Record<string, { slot_ruang: string; nama_ruang: string }> = {};
    mappings.forEach((m) => {
      mapObj[m.kelas_id] = { slot_ruang: m.slot_ruang, nama_ruang: m.nama_ruang };
    });

    const payload: PersistedRoomStoragePayload = {
      version: 2,
      mappings,
      mapObj,
      updated_at: new Date().toISOString(),
    };

    const payloadStr = JSON.stringify(payload);
    localStorage.setItem(getStorageKeyRoomMappings(tenantId, eventId), payloadStr);
  } catch (err) {
    console.warn('Gagal menyimpan mapping ruang ke localStorage:', err);
  }
}

/**
 * Menugaskan kelas ke slot ruang tertentu (Room-Centric).
 * Ruang tetap statis (R.01, R.02, dst). Kelas yang berpindah / bertukar ruangan.
 * Jika kelas yang dipilih sebelumnya berada di ruang lain, lakukan SWAP 1-on-1 otomatis.
 */
export function assignClassToRoomSlot(
  mappings: KelasRoomMapping[],
  targetSlotRuang: string,
  newKelasId: string,
  rawKelasList: any[]
): KelasRoomMapping[] {
  const targetRoom = mappings.find((m) => m.slot_ruang === targetSlotRuang);
  if (!targetRoom || targetRoom.kelas_id === newKelasId) return mappings;

  const oldKelasId = targetRoom.kelas_id;

  // Temukan room lain yang saat ini ditempati oleh newKelasId
  const previousRoomForNewClass = mappings.find((m) => m.kelas_id === newKelasId);

  // Ambil data master kelas
  const newClassData = rawKelasList.find((k) => k.id === newKelasId);
  const oldClassData = rawKelasList.find((k) => k.id === oldKelasId);

  const getJurusanKode = (k: any) =>
    k?.kode_jurusan ||
    k?.Jurusan?.kode ||
    k?.Jurusan?.singkatan ||
    k?.Jurusan?.ProgramKeahlian?.kode ||
    k?.Jurusan?.ProgramKeahlian?.singkatan ||
    k?.Jurusan?.kode_jurusan;

  const getJurusanNama = (k: any) =>
    k?.nama_jurusan ||
    k?.Jurusan?.nama ||
    k?.Jurusan?.nama_jurusan ||
    k?.Jurusan?.ProgramKeahlian?.nama ||
    k?.Jurusan?.singkatan ||
    getJurusanKode(k);

  return mappings.map((m) => {
    // 1. Ruang target menerima kelas baru
    if (m.slot_ruang === targetSlotRuang) {
      return {
        ...m,
        kelas_id: newKelasId,
        nama_kelas: newClassData?.nama_kelas || newClassData?.nama || m.nama_kelas,
        tingkat: Number(newClassData?.tingkat) || m.tingkat,
        jurusan_id: newClassData?.jurusan_id,
        kode_jurusan: getJurusanKode(newClassData),
        nama_jurusan: getJurusanNama(newClassData),
        kapasitas: newClassData?.kapasitas || m.kapasitas || 36,
      };
    }

    // 2. Ruang lama asal newKelasId menerima kelas lama dari targetRoom (SWAP 1-on-1)
    if (previousRoomForNewClass && m.slot_ruang === previousRoomForNewClass.slot_ruang) {
      return {
        ...m,
        kelas_id: oldKelasId,
        nama_kelas: oldClassData?.nama_kelas || oldClassData?.nama || m.nama_kelas,
        tingkat: Number(oldClassData?.tingkat) || m.tingkat,
        jurusan_id: oldClassData?.jurusan_id,
        kode_jurusan: getJurusanKode(oldClassData),
        nama_jurusan: getJurusanNama(oldClassData),
        kapasitas: oldClassData?.kapasitas || m.kapasitas || 36,
      };
    }

    return m;
  });
}

/**
 * Menggeser kelas antar dua ruang bersebelahan (Room-Centric).
 * Ruang dan nama fisik tetap di tempat, hanya kelas yang bertukar ruang.
 */
export function swapClassesBetweenNeighborRooms(
  mappings: KelasRoomMapping[],
  index: number,
  direction: 'UP' | 'DOWN'
): KelasRoomMapping[] {
  const targetIndex = direction === 'UP' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= mappings.length) return mappings;

  const roomA = mappings[index];
  const roomB = mappings[targetIndex];

  const next = [...mappings];
  // roomA tetap memegang slot_ruang & nama_ruang miliknya, tetapi menerima kelas milik roomB
  next[index] = {
    ...roomA,
    kelas_id: roomB.kelas_id,
    nama_kelas: roomB.nama_kelas,
    tingkat: roomB.tingkat,
    jurusan_id: roomB.jurusan_id,
    kode_jurusan: roomB.kode_jurusan,
    nama_jurusan: roomB.nama_jurusan,
    kapasitas: roomB.kapasitas,
  };
  // roomB tetap memegang slot_ruang & nama_ruang miliknya, tetapi menerima kelas milik roomA
  next[targetIndex] = {
    ...roomB,
    kelas_id: roomA.kelas_id,
    nama_kelas: roomA.nama_kelas,
    tingkat: roomA.tingkat,
    jurusan_id: roomA.jurusan_id,
    kode_jurusan: roomA.kode_jurusan,
    nama_jurusan: roomA.nama_jurusan,
    kapasitas: roomA.kapasitas,
  };

  return next;
}

/**
 * Menukar (SWAP) slot kode ruang antar dua kelas secara 1-on-1 tanpa duplikasi.
 * Jika kelas A memegang slot_1 dan memilih slot_2 milik kelas B:
 * - Kelas A menjadi memegang slot_2
 * - Kelas B menjadi memegang slot_1
 */
export function swapRoomSlotBetweenClasses(
  mappings: KelasRoomMapping[],
  sourceKelasId: string,
  targetSlotRuang: string
): KelasRoomMapping[] {
  const currentItem = mappings.find((m) => m.kelas_id === sourceKelasId);
  if (!currentItem) return mappings;

  const currentSlot = currentItem.slot_ruang;
  if (currentSlot === targetSlotRuang) return mappings;

  // Temukan item lain yang saat ini memegang targetSlotRuang
  const otherItem = mappings.find((m) => m.slot_ruang === targetSlotRuang);

  return mappings.map((m) => {
    if (m.kelas_id === sourceKelasId) {
      return {
        ...m,
        slot_ruang: targetSlotRuang,
      };
    }
    if (otherItem && m.kelas_id === otherItem.kelas_id) {
      return {
        ...m,
        slot_ruang: currentSlot,
      };
    }
    return m;
  });
}

/**
 * Menggeser urutan alokasi slot ruang (naik/turun) antar baris kelas bersebelahan.
 */
export function moveRoomMappingOrder(
  mappings: KelasRoomMapping[],
  index: number,
  direction: 'UP' | 'DOWN'
): KelasRoomMapping[] {
  const targetIndex = direction === 'UP' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= mappings.length) return mappings;

  const itemA = mappings[index];
  const itemB = mappings[targetIndex];

  // Tukar slot_ruang kedua item agar kelas di index sekarang mendapat slot itemB
  const slotA = itemA.slot_ruang;
  const slotB = itemB.slot_ruang;

  const next = [...mappings];
  next[index] = { ...itemA, slot_ruang: slotB };
  next[targetIndex] = { ...itemB, slot_ruang: slotA };

  return next;
}

/**
 * Menghasilkan slot ruang berurutan R.01 s/d R.n (n = total kelas).
 * Mengelompokkan dan mengurutkan berdasarkan Tingkat ASC, lalu Nama Kelas ASC.
 */
export function generateClassRoomMappings(
  rawKelasList: any[],
  prefix = 'R.'
): KelasRoomMapping[] {
  if (!rawKelasList || !Array.isArray(rawKelasList) || rawKelasList.length === 0) {
    return [];
  }

  // Hanya ambil kelas yang aktif di sekolah
  const activeList = rawKelasList.filter((k) => {
    if (k.is_active === false) return false;
    const statusText = String((k as any).status || '').toUpperCase();
    if (statusText === 'NONAKTIF' || statusText === 'INACTIVE') return false;
    return true;
  });

  // Sort secara hierarkis: Tingkat ASC -> Kode Jurusan -> Nama Kelas
  const sorted = [...activeList].sort((a, b) => {
    const numA = Number(a.tingkat) || 0;
    const numB = Number(b.tingkat) || 0;
    if (numA !== numB) return numA - numB;

    const jurA = a.Jurusan?.kode_jurusan || a.Jurusan?.nama_jurusan || '';
    const jurB = b.Jurusan?.kode_jurusan || b.Jurusan?.nama_jurusan || '';
    if (jurA !== jurB) return jurA.localeCompare(jurB);

    const nameA = a.nama_kelas || a.nama || '';
    const nameB = b.nama_kelas || b.nama || '';
    return nameA.localeCompare(nameB);
  });

  const total = sorted.length;
  const padLength = total > 99 ? 3 : 2;

  return sorted.map((k, idx) => {
    const numStr = String(idx + 1).padStart(padLength, '0');
    const slotCode = `${prefix}${numStr}`;
    const roomName = `Ruang ${numStr}`;

    const jurKode =
      k.kode_jurusan ||
      k.Jurusan?.kode ||
      k.Jurusan?.singkatan ||
      k.Jurusan?.ProgramKeahlian?.kode ||
      k.Jurusan?.ProgramKeahlian?.singkatan ||
      k.Jurusan?.kode_jurusan;
    const jurNama =
      k.nama_jurusan ||
      k.Jurusan?.nama ||
      k.Jurusan?.nama_jurusan ||
      k.Jurusan?.ProgramKeahlian?.nama ||
      k.Jurusan?.singkatan ||
      jurKode;

    return {
      kelas_id: k.id,
      nama_kelas: k.nama_kelas || k.nama || `Kelas ${idx + 1}`,
      tingkat: Number(k.tingkat) || 10,
      jurusan_id: k.jurusan_id,
      kode_jurusan: jurKode,
      nama_jurusan: jurNama,
      slot_ruang: slotCode,
      nama_ruang: roomName,
      kapasitas: k.kapasitas || 36,
    };
  });
}

/**
 * Mengelompokkan KelasRoomMapping ke dalam Map berdasarkan Tingkat untuk rendering struktur pohon/accordion
 */
export function groupMappingsByTingkat(
  mappings: KelasRoomMapping[]
): Map<number, KelasRoomMapping[]> {
  const map = new Map<number, KelasRoomMapping[]>();
  mappings.forEach((item) => {
    const t = item.tingkat;
    if (!map.has(t)) {
      map.set(t, []);
    }
    map.get(t)!.push(item);
  });
  return map;
}

// ==========================================
// 3. DEFAULT TIMETABLE GENERATORS
// ==========================================

export const INDONESIAN_DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

/**
 * Mengonversi string format 'YYYY-MM-DD' menjadi nama hari Indonesia yang presisi (kebal timezone UTC shift).
 */
export function getNamaHariIndo(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const dt = new Date(y, m, d);
      return INDONESIAN_DAY_NAMES[dt.getDay()] || '';
    }
  }
  const fallbackDate = new Date(dateStr);
  return !isNaN(fallbackDate.getTime()) ? INDONESIAN_DAY_NAMES[fallbackDate.getDay()] || '' : '';
}

export function createDefaultExamDays(startDateStr: string, totalDays = 5): ExamDayConfig[] {
  const days: ExamDayConfig[] = [];
  const startParts = (startDateStr || '').trim().split('-');
  let baseDate: Date;
  if (startParts.length === 3) {
    baseDate = new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10));
  } else {
    baseDate = new Date(startDateStr);
  }

  let addedDays = 0;
  let offset = 0;

  while (addedDays < totalDays) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + offset);
    offset++;

    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0) {
      // Lewati hari Minggu
      continue;
    }

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    const isoDate = `${y}-${m}-${dt}`;

    days.push({
      day_index: addedDays + 1,
      nama_hari: getNamaHariIndo(isoDate) || INDONESIAN_DAY_NAMES[dayOfWeek],
      tanggal: isoDate,
      sessions: [
        {
          session_index: 1,
          nama_sesi: 'Sesi 1',
          jam_mulai: '07:30',
          jam_selesai: '08:30',
          durasi_menit: 60,
        },
        {
          session_index: 2,
          nama_sesi: 'Sesi 2',
          jam_mulai: '09:00',
          jam_selesai: '10:00',
          durasi_menit: 60,
        },
        {
          session_index: 3,
          nama_sesi: 'Sesi 3',
          jam_mulai: '10:30',
          jam_selesai: '11:30',
          durasi_menit: 60,
        },
      ],
    });

    addedDays++;
  }

  return days;
}

// ==========================================
// 4. BULK SCHEDULE PAYLOAD BUILDER
// ==========================================

export interface BuildMassScheduleParams {
  eventPrefix: string;
  days: ExamDayConfig[];
  matrix: TimetableMatrixState;
  bankList: CbtBankSoal[];
  rawGuruMapel?: any[];
  roomMappings: KelasRoomMapping[];
  activeTpId: string;
  activeSemId: string;
  generationMode: 'per_rombel_ruang' | 'per_tingkat';
  toleransiTerlambatMenit?: number;
  tokenRefreshInterval?: number;
  strictBrowserGuard?: boolean;
  eventId?: string;
  targetTingkat?: number[];
}

export function buildMassSchedulePayloads(params: BuildMassScheduleParams): any[] {
  const {
    eventPrefix,
    days,
    matrix,
    bankList,
    rawGuruMapel,
    roomMappings,
    activeTpId,
    activeSemId,
    generationMode,
    toleransiTerlambatMenit = 15,
    tokenRefreshInterval = 0,
    strictBrowserGuard = true,
    eventId,
    targetTingkat,
  } = params;

  const bankMap = new Map(bankList.map((b) => [b.id, b]));
  const roomMapByKelasId = new Map(roomMappings.map((m) => [m.kelas_id, m]));
  const groupedRoomsByTingkat = groupMappingsByTingkat(roomMappings);

  // Standardisasi Nomenklatur SSOT: Gunakan prefix kanonikal (PSAS, PSAT, PSTS, PSAJ, UKK, TRYOUT)
  const canonicalEventPrefix = resolveCbtEventPrefix(eventPrefix);

  const payloads: any[] = [];

  days.forEach((day) => {
    day.sessions.forEach((session) => {
      // Loop seluruh tingkat yang tersedia di roomMappings
      Array.from(groupedRoomsByTingkat.keys()).forEach((tingkat) => {
        // Kepatuhan Regulasi Event: Abaikan tingkat di luar sasaran event aktif
        if (targetTingkat && targetTingkat.length > 0 && !targetTingkat.includes(tingkat)) {
          return;
        }

        const matrixKey = `${day.day_index}_${session.session_index}_${tingkat}`;
        const rawBankVal = matrix[matrixKey];
        if (!rawBankVal) return;

        const classesInTingkat = groupedRoomsByTingkat.get(tingkat) || [];
        if (classesInTingkat.length === 0) return;

        const startIso = localDateTimeInputToISO(`${day.tanggal}T${session.jam_mulai}`);
        const endIso = localDateTimeInputToISO(`${day.tanggal}T${session.jam_selesai}`);

        const isMulti = isMultiJurusanSlot(rawBankVal);

        if (isMulti) {
          // ========================================================
          // OPSI MULTI-JURUSAN (DDPK Kelas 10 / Produktif Kelas 11-12)
          // Memetakan masing-masing rombel ke bank soal jurusannya masing-masing
          // ========================================================
          const multiConfig = parseMultiJurusanSlot(rawBankVal);
          const assignments = multiConfig?.assignments || {};

          classesInTingkat.forEach((cls) => {
            const targetBankId =
              (cls.jurusan_id && assignments[cls.jurusan_id]) ||
              (cls.kode_jurusan && assignments[cls.kode_jurusan]);

            if (!targetBankId) return;

            const bank = bankMap.get(targetBankId);
            if (!bank) return;

            const mapelName = bank.Mapel?.nama_mapel || bank.MataPelajaran?.nama_mapel || bank.judul;
            const rMapping = roomMapByKelasId.get(cls.kelas_id);
            const slotRuang = rMapping?.slot_ruang || `R.01`;
            const namaRuang = rMapping?.nama_ruang || slotRuang;

            payloads.push({
              bank_soal_id: bank.id,
              tahun_pelajaran_id: activeTpId,
              semester_id: activeSemId,
              nama_sesi: formatCanonicalSesiUjian({
                eventPrefix: canonicalEventPrefix,
                mapelName,
                targetJurusan: bank.jurusan,
                namaKelas: cls.nama_kelas,
                slotRuang,
              }),
              tanggal_mulai: startIso,
              tanggal_selesai: endIso,
              durasi_menit: session.durasi_menit || bank.alokasi_menit || 60,
              toleransi_terlambat_menit: toleransiTerlambatMenit,
              target_kelas_ids: [cls.kelas_id],
              setting_keamanan: {
                lock_device: true,
                block_tab_switch: true,
                max_violations: 3,
                shuffle_questions: true,
                shuffle_options: true,
                show_result_instant: false,
                auto_transfer_rapor: false,
                ruang_ujian: slotRuang,
                ruang_ujian_nama: namaRuang,
                nama_sesi_waktu: session.nama_sesi,
                token_refresh_interval: tokenRefreshInterval,
                strict_browser_guard: strictBrowserGuard,
                event_id: eventId,
              },
            });
          });
        } else {
          // OPSI STANDAR (MAPEL UMUM PARALEL SETINGKAT)
          // Mendukung rawBankVal berupa mapel_id (standar baru) maupun bank_soal_id (backward-compatibility)
          const directBank = bankMap.get(rawBankVal);
          const targetMapelId = directBank?.mapel_id || rawBankVal;

          // Cari seluruh bank soal untuk mapel ini di tingkat ini
          const candidateBanks = bankList.filter((b) => {
            if (b.mapel_id !== targetMapelId) return false;
            const bTingkat = resolveBankTingkatNumber(b);
            if (bTingkat !== undefined && bTingkat !== tingkat) return false;
            return true;
          });

          // Jika tidak ada bank soal sama sekali di candidateBanks dan directBank juga tidak ada, abaikan
          if (candidateBanks.length === 0 && !directBank) return;

          const defaultFallbackBank = directBank || candidateBanks[0];

          const resolveBankForClass = (cls: (typeof classesInTingkat)[number]): CbtBankSoal | null => {
            // 1. Prioritas tertinggi: Bank soal milik guru pengampu rombel ini (atau yang eksplisit dibagikan kepadanya via Kontributor)
            if (rawGuruMapel && Array.isArray(rawGuruMapel)) {
              const gmAssignment = rawGuruMapel.find(
                (gm: any) => gm.kelas_id === cls.kelas_id && gm.mapel_id === targetMapelId
              );
              if (gmAssignment?.guru_id) {
                const ownGuruBank = candidateBanks.find((b) => b.guru_id === gmAssignment.guru_id);
                if (ownGuruBank) return ownGuruBank;
                const sharedToGuruBank = candidateBanks.find(
                  (b) =>
                    b.Kontributor &&
                    b.Kontributor.some((c) => c.guru_id === gmAssignment.guru_id && c.can_edit_soal !== false)
                );
                if (sharedToGuruBank) return sharedToGuruBank;
              }
            }

            // 2. Bank soal spesifik jurusan (id mutlak atau kode jurusan)
            const clsJurId = cls.jurusan_id;
            const clsJurCode = (cls.kode_jurusan || '').toUpperCase().trim();
            const specificBank = candidateBanks.find((b) => {
              if (clsJurId) {
                if (b.jurusan_id && b.jurusan_id === clsJurId) return true;
                if (Array.isArray(b.target_jurusan_ids) && b.target_jurusan_ids.includes(clsJurId)) return true;
              }
              if (!b.jurusan || !clsJurCode) return false;
              const bJurUpper = b.jurusan.toUpperCase().trim();
              return bJurUpper === clsJurCode || bJurUpper.includes(clsJurCode) || clsJurCode.includes(bJurUpper);
            });
            if (specificBank) return specificBank;

            // 3. Fallback ke bank soal kandidat pertama yang paling siap (jumlah soal terbanyak)
            if (candidateBanks.length > 0) {
              const sorted = [...candidateBanks].sort(
                (a, b) => (b.jumlah_soal || b._count?.Soal || 0) - (a.jumlah_soal || a._count?.Soal || 0)
              );
              return sorted[0];
            }

            return defaultFallbackBank || null;
          };

          if (generationMode === 'per_rombel_ruang') {
            // OPSI A (KONTRAK RESMI KELAS-CENTRIK): 1 Jadwal Ujian untuk setiap Ruang/Rombel
            classesInTingkat.forEach((cls) => {
              const effectiveBank = resolveBankForClass(cls);
              if (!effectiveBank) return;
              const mapelName = effectiveBank.Mapel?.nama_mapel || effectiveBank.MataPelajaran?.nama_mapel || effectiveBank.judul;
              const jurTag = effectiveBank.jurusan ? ` [${effectiveBank.jurusan}]` : '';
              const rMapping = roomMapByKelasId.get(cls.kelas_id);
              const slotRuang = rMapping?.slot_ruang || `R.01`;
              const namaRuang = rMapping?.nama_ruang || slotRuang;

              payloads.push({
                bank_soal_id: effectiveBank.id,
                tahun_pelajaran_id: activeTpId,
                semester_id: activeSemId,
                nama_sesi: formatCanonicalSesiUjian({
                  eventPrefix: canonicalEventPrefix,
                  mapelName,
                  targetJurusan: effectiveBank.jurusan,
                  namaKelas: cls.nama_kelas,
                  slotRuang,
                }),
                tanggal_mulai: startIso,
                tanggal_selesai: endIso,
                durasi_menit: session.durasi_menit || effectiveBank.alokasi_menit || 60,
                toleransi_terlambat_menit: toleransiTerlambatMenit,
                target_kelas_ids: [cls.kelas_id],
                setting_keamanan: {
                  lock_device: true,
                  block_tab_switch: true,
                  max_violations: 3,
                  shuffle_questions: true,
                  shuffle_options: true,
                  show_result_instant: false,
                  auto_transfer_rapor: false,
                  ruang_ujian: slotRuang,
                  ruang_ujian_nama: namaRuang,
                  nama_sesi_waktu: session.nama_sesi,
                  token_refresh_interval: tokenRefreshInterval,
                  strict_browser_guard: strictBrowserGuard,
                  event_id: eventId,
                },
              });
            });
          } else {
            // OPSI B: 1 Jadwal Terpadu per Tingkat (Dikelompokkan secara Cerdas jika ada Varian Jurusan)
            const groupsByBank = new Map<string, { bank: CbtBankSoal; classes: typeof classesInTingkat }>();

            classesInTingkat.forEach((cls) => {
              const effectiveBank = resolveBankForClass(cls);
              if (!effectiveBank) return;
              if (!groupsByBank.has(effectiveBank.id)) {
                groupsByBank.set(effectiveBank.id, { bank: effectiveBank, classes: [] });
              }
              groupsByBank.get(effectiveBank.id)!.classes.push(cls);
            });

            groupsByBank.forEach(({ bank: effectiveBank, classes: groupedClasses }) => {
              const kelasRoomMap: Record<string, { slot_ruang: string; nama_ruang: string }> = {};
              groupedClasses.forEach((cls) => {
                const rMapping = roomMapByKelasId.get(cls.kelas_id);
                if (rMapping) {
                  kelasRoomMap[cls.kelas_id] = {
                    slot_ruang: rMapping.slot_ruang,
                    nama_ruang: rMapping.nama_ruang,
                  };
                }
              });

              const cleanJur = (effectiveBank.jurusan || '').trim().toUpperCase();
              const jurTag = cleanJur && cleanJur !== 'SEMUA' && cleanJur !== 'UMUM' ? ` (${cleanJur})` : '';

              payloads.push({
                bank_soal_id: effectiveBank.id,
                tahun_pelajaran_id: activeTpId,
                semester_id: activeSemId,
                nama_sesi: `${canonicalEventPrefix} - ${mapelName}${jurTag} (Tingkat ${formatTingkatRomawi(tingkat)} - ${session.nama_sesi})`,
                tanggal_mulai: startIso,
                tanggal_selesai: endIso,
                durasi_menit: session.durasi_menit || effectiveBank.alokasi_menit || 60,
                toleransi_terlambat_menit: toleransiTerlambatMenit,
                target_kelas_ids: groupedClasses.map((c) => c.kelas_id),
                setting_keamanan: {
                  lock_device: true,
                  block_tab_switch: true,
                  max_violations: 3,
                  shuffle_questions: true,
                  shuffle_options: true,
                  show_result_instant: false,
                  auto_transfer_rapor: false,
                  kelas_room_map: kelasRoomMap,
                  room_mappings: kelasRoomMap,
                  ruang_ujian: 'Multi-Ruang Kelas',
                  nama_sesi_waktu: session.nama_sesi,
                  token_refresh_interval: tokenRefreshInterval,
                  strict_browser_guard: strictBrowserGuard,
                  event_id: eventId,
                },
              });
            });
          }
        }
      });
    });
  });

  return payloads;
}

// ==========================================
// 4. TIMETABLE MATRIX PERSISTENCE & AUTO-RECONSTRUCTION
// ==========================================

export interface PersistedMatrixState {
  matrix: TimetableMatrixState;
  days?: ExamDayConfig[];
  eventPrefix?: string;
  generationMode?: 'per_rombel_ruang' | 'per_tingkat';
  savedAt: number;
}

const MATRIX_STORAGE_PREFIX = 'absenta_cbt_matrix_state_';

export function getStorageKeyMatrix(
  tenantId?: string,
  tpId?: string,
  semId?: string,
  eventId?: string
): string {
  const base = `${MATRIX_STORAGE_PREFIX}${tenantId || 'global'}_${tpId || 'tp'}_${semId || 'sem'}`;
  return eventId ? `${base}_${eventId}` : base;
}

export function loadPersistedMatrixState(
  tenantId?: string,
  tpId?: string,
  semId?: string,
  eventId?: string
): PersistedMatrixState | null {
  try {
    // 1. Coba baca state spesifik event jika eventId ada
    if (eventId) {
      const specificRaw = localStorage.getItem(getStorageKeyMatrix(tenantId, tpId, semId, eventId));
      if (specificRaw) return JSON.parse(specificRaw);
    }
    // 2. Fallback ke state umum per TP/Semester
    const raw = localStorage.getItem(getStorageKeyMatrix(tenantId, tpId, semId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function savePersistedMatrixState(
  payload: {
    matrix: TimetableMatrixState;
    days?: ExamDayConfig[];
    eventPrefix?: string;
    generationMode?: 'per_rombel_ruang' | 'per_tingkat';
  },
  tenantId?: string,
  tpId?: string,
  semId?: string,
  eventId?: string
): void {
  try {
    const data: PersistedMatrixState = {
      ...payload,
      savedAt: Date.now(),
    };
    const key = getStorageKeyMatrix(tenantId, tpId, semId, eventId);
    localStorage.setItem(key, JSON.stringify(data));
    // Jika ada eventId, simpan juga salinan fallback ke key umum agar kompatibel
    if (eventId) {
      localStorage.setItem(getStorageKeyMatrix(tenantId, tpId, semId), JSON.stringify(data));
    }
  } catch (err) {
    console.warn('Gagal menyimpan matriks ke localStorage:', err);
  }
}

/**
 * Rekonstruksi otomatis matriks dari jadwal yang sudah pernah diterbitkan di database
 * Sekaligus menyinkronkan jam mulai, jam selesai, dan durasi menit sesi dari DB.
 */
export function reconstructMatrixFromExistingSchedules(
  existingSchedules: any[],
  baseDays: ExamDayConfig[],
  bankList: CbtBankSoal[],
  roomMappings?: KelasRoomMapping[]
): { matrix: TimetableMatrixState; days: ExamDayConfig[] } {
  if (!existingSchedules || !Array.isArray(existingSchedules) || existingSchedules.length === 0) {
    return { matrix: {}, days: baseDays || [] };
  }

  const bankMap = new Map(bankList.map((b) => [b.id, b]));
  const roomByKelasId = new Map((roomMappings || []).map((r) => [r.kelas_id, r]));
  const reconstructed: TimetableMatrixState = {};
  const firstBankIdByKey: Record<string, string> = {};
  const firstJurIdByKey: Record<string, string> = {};
  const workingDays: ExamDayConfig[] = JSON.parse(JSON.stringify(baseDays || []));

  existingSchedules.forEach((j) => {
    if (!j.bank_soal_id || !j.tanggal_mulai) return;

    const bank = bankMap.get(j.bank_soal_id);
    const targetKelasIds: string[] = Array.isArray(j.target_kelas_ids) ? j.target_kelas_ids : [];
    const matchedRoom = targetKelasIds.map((id) => roomByKelasId.get(id)).find(Boolean);
    const tingkat =
      matchedRoom?.tingkat ??
      (bank ? resolveBankTingkatNumber(bank) : (j.BankSoal?.tingkat ? Number(j.BankSoal.tingkat) : undefined));
    if (tingkat === undefined) return;

    // Ambil tanggal lokal YYYY-MM-DD
    const jDate = new Date(j.tanggal_mulai);
    if (Number.isNaN(jDate.getTime())) return;
    const y = jDate.getFullYear();
    const m = String(jDate.getMonth() + 1).padStart(2, '0');
    const dt = String(jDate.getDate()).padStart(2, '0');
    const jDateStr = `${y}-${m}-${dt}`;

    let targetDay = workingDays.find((d) => d.tanggal === jDateStr);
    if (!targetDay) {
      targetDay = {
        day_index: workingDays.length + 1,
        nama_hari: getNamaHariIndo(jDateStr) || INDONESIAN_DAY_NAMES[jDate.getDay()] || `Hari ke-${workingDays.length + 1}`,
        tanggal: jDateStr,
        sessions: [],
      };
      workingDays.push(targetDay);
      workingDays.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
      workingDays.forEach((d, idx) => {
        d.day_index = idx + 1;
      });
    }

    const sec = j.setting_keamanan as any;
    const sessLabel = sec?.nama_sesi_waktu;

    const h = String(jDate.getHours()).padStart(2, '0');
    const min = String(jDate.getMinutes()).padStart(2, '0');
    const jTime = `${h}:${min}`;

    const endDate = j.tanggal_selesai ? new Date(j.tanggal_selesai) : null;
    const endH = endDate ? String(endDate.getHours()).padStart(2, '0') : '09';
    const endMin = endDate ? String(endDate.getMinutes()).padStart(2, '0') : '00';
    const endJTime = `${endH}:${endMin}`;

    let matchedSess = targetDay.sessions.find((s) => s.nama_sesi === sessLabel);
    if (!matchedSess) {
      // Cocokkan jam mulai HH:MM
      matchedSess = targetDay.sessions.find((s) => s.jam_mulai === jTime);
    }

    if (matchedSess) {
      // SINKRONISASI JAM DARI DATABASE: Pastikan jam sesi mengikuti jadwal yang terbit di DB
      matchedSess.jam_mulai = jTime;
      matchedSess.jam_selesai = endJTime;
      matchedSess.durasi_menit = j.durasi_menit || matchedSess.durasi_menit || 60;
    } else {
      // Rekonstruksi slot sesi baru jika belum ada di targetDay
      const sessMatch = (sessLabel || j.nama_sesi || '').match(/Sesi\s*(\d+)/i);
      const sessIdx = sessMatch ? parseInt(sessMatch[1], 10) : (targetDay.sessions.length + 1);

      matchedSess = {
        session_index: sessIdx,
        nama_sesi: sessLabel || `Sesi ${sessIdx}`,
        jam_mulai: jTime,
        jam_selesai: endJTime,
        durasi_menit: j.durasi_menit || 60,
      };
      targetDay.sessions.push(matchedSess);
      targetDay.sessions.sort((a, b) => a.session_index - b.session_index);
    }

    if (matchedSess) {
      const key = `${targetDay.day_index}_${matchedSess.session_index}_${tingkat}`;
      const existingVal = reconstructed[key];
      const thisBank = bankMap.get(j.bank_soal_id);
      const thisMapelId = thisBank?.mapel_id || (j.BankSoal as any)?.mapel_id;
      const effectiveVal = thisMapelId || j.bank_soal_id;

      // Resolusi jurusan mutlak dari target_kelas_ids -> roomMappings (tanpa parsing nama rombel)
      const absJurId = matchedRoom?.jurusan_id || matchedRoom?.kode_jurusan || thisBank?.jurusan || '';

      if (!existingVal) {
        reconstructed[key] = effectiveVal;
        firstBankIdByKey[key] = j.bank_soal_id;
        if (absJurId) firstJurIdByKey[key] = absJurId;
      } else if (isMultiJurusanSlot(existingVal)) {
        const multiConfig = parseMultiJurusanSlot(existingVal) || {
          title: 'DDPK / Produktif Kejuruan',
          assignments: {},
        };
        if (absJurId) {
          multiConfig.assignments[absJurId] = j.bank_soal_id;
        }
        reconstructed[key] = serializeMultiJurusanSlot(multiConfig);
      } else if (j.bank_soal_id !== firstBankIdByKey[key]) {
        const firstBankId = firstBankIdByKey[key];
        const firstBank = firstBankId ? bankMap.get(firstBankId) : undefined;
        const firstMapelId = firstBank?.mapel_id || existingVal;
        const firstJurId = firstJurIdByKey[key] || firstBank?.jurusan || '';

        if (thisMapelId && firstMapelId === thisMapelId) {
          // Mapel reguler sama (meskipun ada varian bank soal per jurusan/guru) -> tetap mapel_id tunggal, jangan diubah menjadi DDPK/Multi-Jurusan
          reconstructed[key] = thisMapelId;
        } else {
          // Multi-jurusan terdeteksi (pertahankan bank soal & jurusan pertama agar tidak hilang)
          const multiConfig: MultiJurusanSlotConfig = {
            title: tingkat === 10 ? 'DDPK Kejuruan' : 'DDPK / Produktif Kejuruan',
            assignments: {},
          };
          if (firstJurId && firstBankId) {
            multiConfig.assignments[firstJurId] = firstBankId;
          }
          if (absJurId) {
            multiConfig.assignments[absJurId] = j.bank_soal_id;
          }
          reconstructed[key] = serializeMultiJurusanSlot(multiConfig);
        }
      }
    }
  });

  return { matrix: reconstructed, days: workingDays };
}

// ==========================================
// 6. SHARED PARSER & FILTER HELPERS
// ==========================================

export function parseScheduleRoomAndClass(j: CbtJadwalUjian, overrideRoom?: string) {
  const rawRoom = (overrideRoom || j.setting_keamanan?.ruang_ujian || '').trim();
  const namaSesi = j.nama_sesi || '';

  let rombel = '-';
  let roomCode = rawRoom;

  // Ambil kurung TERAKHIR agar tidak salah membaca singkatan event seperti (ASAS)/(PSAS)
  const allMatches = Array.from(namaSesi.matchAll(/\(([^()]+)\)/g));
  if (allMatches.length > 0) {
    const inner = allMatches[allMatches.length - 1][1];
    const parts = inner.split(' - ');
    if (parts.length >= 2) {
      rombel = parts[0].trim();
      if (!roomCode) roomCode = parts[1].trim();
    } else {
      const cleaned = inner.trim();
      if (!['ASAS', 'PSAS', 'PSTS', 'SAS', 'SAT', 'STS'].includes(cleaned.toUpperCase())) {
        rombel = cleaned;
      }
    }
  }

  if (!roomCode) {
    roomCode = j.setting_keamanan?.ruang_ujian_nama || j.nama_sesi || 'R.XX';
  }

  const detectedTingkat =
    detectNodeTingkat({
      label_sub: rombel,
      catatan: j.BankSoal?.tingkat,
    }) || 10;

  return {
    roomCode,
    rombel,
    tingkat: detectedTingkat,
  };
}

export function filterEffectiveJadwalList(
  jadwalList: CbtJadwalUjian[],
  activeEventId?: string,
  targetTingkat?: number[],
  roomMappings?: KelasRoomMapping[]
): CbtJadwalUjian[] {
  const roomByKelasId = new Map((roomMappings || []).map((r) => [r.kelas_id, r]));

  return (jadwalList || []).filter((j) => {
    // 0. Sesi remedial dikelola mandiri oleh Guru Mapel, bukan ruang bilik reguler panitia
    if ((j.setting_keamanan as any)?.is_remedial) return false;

    if (activeEventId && j.setting_keamanan?.event_id) {
      if (j.setting_keamanan.event_id !== activeEventId) return false;
    }
    if (targetTingkat && targetTingkat.length > 0) {
      const targetKelasIds: string[] = Array.isArray(j.target_kelas_ids) ? j.target_kelas_ids : [];
      const matchedRoom = targetKelasIds.map((id) => roomByKelasId.get(id)).find(Boolean);
      const bankTingkat = j.BankSoal?.tingkat ? Number(j.BankSoal.tingkat) : undefined;
      const absTingkat =
        matchedRoom?.tingkat ??
        (bankTingkat && !Number.isNaN(bankTingkat) ? bankTingkat : parseScheduleRoomAndClass(j).tingkat);
      if (!targetTingkat.includes(absTingkat)) return false;
    }
    return true;
  });
}

export function detectSupervisorConflicts(jadwalList: CbtJadwalUjian[]): Set<string> {
  const conflicts = new Set<string>();
  for (let i = 0; i < jadwalList.length; i++) {
    const a = jadwalList[i];
    const pA = a.setting_keamanan?.pengawas_1_id || (a as any).pengawas_guru_id;
    if (!pA) continue;
    const startA = new Date(a.tanggal_mulai).getTime();
    const endA = new Date(a.tanggal_selesai).getTime();

    for (let k = i + 1; k < jadwalList.length; k++) {
      const b = jadwalList[k];
      const pB = b.setting_keamanan?.pengawas_1_id || (b as any).pengawas_guru_id;
      if (!pB || pA !== pB) continue;

      const startB = new Date(b.tanggal_mulai).getTime();
      const endB = new Date(b.tanggal_selesai).getTime();

      if (startA < endB && startB < endA) {
        conflicts.add(a.id);
        conflicts.add(b.id);
      }
    }
  }
  return conflicts;
}

// ==========================================
// 7. STEP READINESS ENGINE (KETUNTASAN OPERASIONAL)
// ==========================================

export type CbtPanitiaPhase =
  | 'fase_1_soal'
  | 'fase_2_ruang'
  | 'fase_3_jadwal'
  | 'fase_4_pengawas'
  | 'fase_5_monitor';

export interface PhaseReadinessResult {
  id: CbtPanitiaPhase;
  title: string;
  isDone: boolean;
  scorePercent: number; // 0 - 100
  badgeLabel: string;   // max 2 words e.g. "5 Siap", "20 Rombel", "20 Sesi", "Aman", "Live"
  detailText: string;   // detailed tooltip
  statusColor: 'emerald' | 'amber' | 'indigo' | 'slate' | 'rose';
  hasWarning?: boolean;
}

export function evaluateStep1Soal(params: {
  rawGuruMapel?: any[];
  bankList: CbtBankSoal[];
  targetTingkat?: number[];
  tenantId?: string;
}): PhaseReadinessResult {
  const { rawGuruMapel = [], bankList = [], targetTingkat, tenantId = 'default' } = params;

  if (rawGuruMapel.length > 0) {
    const banksByMapelTingkat = new Map<string, CbtBankSoal[]>();

    bankList.forEach((b) => {
      const tNum = resolveStrictBankTingkat(b);
      const mId = b.mapel_id;
      if (!mId || !tNum) return;

      const mtKey = `${mId}_${tNum}`;
      if (!banksByMapelTingkat.has(mtKey)) {
        banksByMapelTingkat.set(mtKey, []);
      }
      banksByMapelTingkat.get(mtKey)!.push(b);
    });

    const mapelPaketMap = new Map<string, { isReady: boolean; soalCount: number }>();

    rawGuruMapel.forEach((gm: any) => {
      const gId = gm.guru_id;
      const mId = gm.mapel_id;
      if (!gId || !mId) return;

      const mapelName = gm.Mapel?.nama_mapel || '';
      if (isNonAcademicMapel(mapelName)) {
        return;
      }

      const tNum = resolveStrictTingkat(gm);
      if (!tNum) return;

      if (targetTingkat && targetTingkat.length > 0 && !targetTingkat.includes(tNum)) {
        return;
      }

      const mtKey = `${mId}_${tNum}`;
      if (!mapelPaketMap.has(mtKey)) {
        const candidateBanks = banksByMapelTingkat.get(mtKey) || [];
        const maxSoal = candidateBanks.reduce((max, b) => {
          const count = b.jumlah_soal || b._count?.Soal || 0;
          return Math.max(max, count);
        }, 0);
        const hasReadyMaster = maxSoal > 0;

        mapelPaketMap.set(mtKey, {
          isReady: hasReadyMaster,
          soalCount: maxSoal,
        });
      }
    });

    const paketList = Array.from(mapelPaketMap.values());
    const totalPaket = paketList.length;
    const readyPaket = paketList.filter((p) => p.isReady).length;
    const isDone = totalPaket > 0 && readyPaket >= totalPaket;
    const score = totalPaket > 0 ? Math.round((readyPaket / totalPaket) * 100) : 0;

    return {
      id: 'fase_1_soal',
      title: 'Soal',
      isDone,
      scorePercent: score,
      badgeLabel: isDone ? `${readyPaket} Siap` : `${readyPaket}/${totalPaket} Siap`,
      detailText: isDone
        ? `✓ Seluruh ${readyPaket} Paket Mapel Ujian Siap Digunakan`
        : `⚠️ ${totalPaket - readyPaket} dari ${totalPaket} Paket Mapel Belum Terisi Soal`,
      statusColor: isDone ? 'emerald' : totalPaket > 0 ? 'amber' : 'slate',
    };
  }

  const scopedBanks = bankList.filter((b) => {
    if (!targetTingkat || targetTingkat.length === 0) return true;
    const num = resolveBankTingkatNumber(b);
    return num !== undefined ? targetTingkat.includes(num) : true;
  });

  const readyBanks = scopedBanks.filter((b) => (b.jumlah_soal || b._count?.Soal || 0) > 0);
  const total = scopedBanks.length;
  const ready = readyBanks.length;
  const isDone = total > 0 && ready >= total;
  const score = total > 0 ? Math.round((ready / total) * 100) : 0;

  return {
    id: 'fase_1_soal',
    title: 'Soal',
    isDone,
    scorePercent: score,
    badgeLabel: isDone ? `${ready} Siap` : `${ready}/${total} Siap`,
    detailText: isDone
      ? `✓ Seluruh ${ready} Bank Soal Siap Digunakan`
      : `⚠️ ${total - ready} Bank Soal Belum Memiliki Butir Soal`,
    statusColor: isDone ? 'emerald' : total > 0 ? 'amber' : 'slate',
  };
}

export function evaluateStep2Ruang(params: {
  scopedKelasList: any[];
  roomMappings: KelasRoomMapping[];
}): PhaseReadinessResult {
  const { scopedKelasList, roomMappings } = params;
  const totalKelas = scopedKelasList.length;
  const mappedKelas = roomMappings.filter(
    (m) => scopedKelasList.some((k) => k.id === m.kelas_id) && !!(m.slot_ruang && m.slot_ruang.trim())
  ).length;

  const isDone = totalKelas > 0 && mappedKelas >= totalKelas;
  const score = totalKelas > 0 ? Math.round((mappedKelas / totalKelas) * 100) : 0;

  return {
    id: 'fase_2_ruang',
    title: 'Ruang',
    isDone,
    scorePercent: score,
    badgeLabel: isDone ? `${mappedKelas} Rombel` : `${mappedKelas}/${totalKelas} Rombel`,
    detailText: isDone
      ? `✓ Seluruh ${mappedKelas} Rombel Terpetakan ke Ruang Ujian`
      : `⚠️ ${totalKelas - mappedKelas} Rombel Belum Memiliki Alokasi Ruang`,
    statusColor: isDone ? 'emerald' : totalKelas > 0 ? 'amber' : 'slate',
  };
}

export function evaluateStep3Jadwal(params: {
  effectiveJadwalList: CbtJadwalUjian[];
}): PhaseReadinessResult {
  const { effectiveJadwalList } = params;
  const count = effectiveJadwalList.length;
  const isDone = count > 0;

  return {
    id: 'fase_3_jadwal',
    title: 'Jadwal',
    isDone,
    scorePercent: isDone ? 100 : 0,
    badgeLabel: isDone ? `${count} Sesi` : 'Belum Terbit',
    detailText: isDone
      ? `✓ ${count} Sesi Ujian Resmi Terbit di Database`
      : '⚠️ Jadwal Ujian Belum Diterbitkan ke Database',
    statusColor: isDone ? 'emerald' : 'slate',
  };
}

export function evaluateStep4Pengawas(params: {
  effectiveJadwalList: CbtJadwalUjian[];
  conflictJadwalIds?: Set<string>;
}): PhaseReadinessResult {
  const { effectiveJadwalList, conflictJadwalIds } = params;
  const totalSesi = effectiveJadwalList.length;
  const plottedSesi = effectiveJadwalList.filter(
    (j) => !!(j.setting_keamanan?.pengawas_1_id || (j as any).pengawas_guru_id)
  ).length;

  const conflicts = conflictJadwalIds ?? detectSupervisorConflicts(effectiveJadwalList);
  const conflictCount = conflicts.size;
  const hasWarning = conflictCount > 0;
  const isDone = totalSesi > 0 && plottedSesi === totalSesi && conflictCount === 0;
  const score = totalSesi > 0 ? Math.round((plottedSesi / totalSesi) * 100) : 0;

  let badgeLabel = `${plottedSesi}/${totalSesi} Terplot`;
  let detailText = `⚠️ ${totalSesi - plottedSesi} Sesi Ujian Belum Ada Pengawas`;
  let statusColor: 'emerald' | 'amber' | 'rose' | 'slate' = 'amber';

  if (hasWarning) {
    badgeLabel = `${conflictCount} Bentrok`;
    detailText = `⚠️ Terdeteksi ${conflictCount} Penugasan Pengawas Bentrok Jam`;
    statusColor = 'rose';
  } else if (isDone) {
    badgeLabel = '100% Aman';
    detailText = `✓ Seluruh ${plottedSesi} Sesi Terplot Pengawas & Bebas Bentrok`;
    statusColor = 'emerald';
  } else if (totalSesi === 0) {
    badgeLabel = '0 Sesi';
    detailText = 'Belum Ada Jadwal Sesi Ujian untuk Diplot Pengawas';
    statusColor = 'slate';
  }

  return {
    id: 'fase_4_pengawas',
    title: 'Pengawas',
    isDone,
    scorePercent: score,
    badgeLabel,
    detailText,
    statusColor,
    hasWarning,
  };
}

export function evaluateStep5Monitoring(params: {
  effectiveJadwalList: CbtJadwalUjian[];
}): PhaseReadinessResult {
  const { effectiveJadwalList } = params;
  const totalSesi = effectiveJadwalList.length;
  const activeCount = effectiveJadwalList.filter((j) => j.status === 'ACTIVE').length;
  const draftCount = effectiveJadwalList.filter((j) => j.status === 'DRAFT').length;
  const completedCount = effectiveJadwalList.filter(
    (j) => j.status === 'COMPLETED' || (j.status as string) === 'FINISHED'
  ).length;

  const isDone = totalSesi > 0 && completedCount === totalSesi;
  const isRunning = activeCount > 0;
  const score = totalSesi > 0 ? Math.round((completedCount / totalSesi) * 100) : 0;

  let badgeLabel = 'Standby';
  let detailText = 'Menunggu Pelaksanaan Ujian';
  let statusColor: 'emerald' | 'indigo' | 'slate' = 'slate';

  if (isDone) {
    badgeLabel = 'Selesai';
    detailText = `✓ Seluruh ${totalSesi} Ruang Selesai Melaksanakan Ujian`;
    statusColor = 'emerald';
  } else if (isRunning) {
    badgeLabel = `${activeCount} Live`;
    detailText = `● ${activeCount} Ruang Sedang Aktif Ujian Berlangsung`;
    statusColor = 'emerald';
  } else if (draftCount > 0) {
    badgeLabel = `${draftCount} Siap`;
    detailText = `${draftCount} Ruang Siap Diaktifkan Serentak`;
    statusColor = 'indigo';
  }

  return {
    id: 'fase_5_monitor',
    title: 'Monitoring',
    isDone,
    scorePercent: score,
    badgeLabel,
    detailText,
    statusColor,
  };
}
