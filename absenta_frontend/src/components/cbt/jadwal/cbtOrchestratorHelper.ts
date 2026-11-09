import type { CbtBankSoal } from '@/types/cbt.types';
import { localDateTimeInputToISO } from '@/utils/attendance/time';
import { resolveBankTingkatNumber } from './cbtJadwalHelper';

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
  jam_selesai: string; // Misal: '09:00'
  durasi_menit: number; // Misal: 90
}

export interface ExamDayConfig {
  day_index: number;
  nama_hari: string; // 'Senin', 'Selasa', 'Rabu', etc.
  tanggal: string; // 'YYYY-MM-DD'
  sessions: ExamSessionSlot[];
}

/**
 * Key matrix: `${day_index}_${session_index}_${tingkat}` => bank_soal_id
 */
export type TimetableMatrixState = Record<string, string>;

// ==========================================
// 2. KELAS-CENTRIC ROOM PLOTTING ENGINE (R.01 - R.n)
// ==========================================

const STORAGE_PREFIX = 'absenta_cbt_room_mappings_';

export function getStorageKeyRoomMappings(tenantId?: string): string {
  return `${STORAGE_PREFIX}${tenantId || 'global'}`;
}

export function loadPersistedRoomMappings(tenantId?: string): Record<string, { slot_ruang: string; nama_ruang: string }> | null {
  try {
    const raw = localStorage.getItem(getStorageKeyRoomMappings(tenantId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function savePersistedRoomMappings(mappings: KelasRoomMapping[], tenantId?: string): void {
  try {
    const mapObj: Record<string, { slot_ruang: string; nama_ruang: string }> = {};
    mappings.forEach((m) => {
      mapObj[m.kelas_id] = { slot_ruang: m.slot_ruang, nama_ruang: m.nama_ruang };
    });
    localStorage.setItem(getStorageKeyRoomMappings(tenantId), JSON.stringify(mapObj));
  } catch (err) {
    console.warn('Gagal menyimpan mapping ruang ke localStorage:', err);
  }
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

    return {
      kelas_id: k.id,
      nama_kelas: k.nama_kelas || k.nama || `Kelas ${idx + 1}`,
      tingkat: Number(k.tingkat) || 10,
      jurusan_id: k.jurusan_id,
      kode_jurusan: k.Jurusan?.kode_jurusan || k.Jurusan?.singkatan,
      nama_jurusan: k.Jurusan?.nama_jurusan,
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

export function createDefaultExamDays(startDateStr: string, totalDays = 5): ExamDayConfig[] {
  const days: ExamDayConfig[] = [];
  const baseDate = new Date(startDateStr);
  const indonesianDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

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
      nama_hari: indonesianDays[dayOfWeek],
      tanggal: isoDate,
      sessions: [
        {
          session_index: 1,
          nama_sesi: 'Sesi 1',
          jam_mulai: '07:30',
          jam_selesai: '09:00',
          durasi_menit: 90,
        },
        {
          session_index: 2,
          nama_sesi: 'Sesi 2',
          jam_mulai: '09:30',
          jam_selesai: '11:00',
          durasi_menit: 90,
        },
        {
          session_index: 3,
          nama_sesi: 'Sesi 3',
          jam_mulai: '11:30',
          jam_selesai: '13:00',
          durasi_menit: 90,
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
    roomMappings,
    activeTpId,
    activeSemId,
    generationMode,
    toleransiTerlambatMenit = 15,
    tokenRefreshInterval = 15,
    strictBrowserGuard = true,
    eventId,
    targetTingkat,
  } = params;

  const bankMap = new Map(bankList.map((b) => [b.id, b]));
  const roomMapByKelasId = new Map(roomMappings.map((m) => [m.kelas_id, m]));
  const groupedRoomsByTingkat = groupMappingsByTingkat(roomMappings);

  // Standardisasi Nomenklatur: Ganti SAS/SAT/STS menjadi PSAS/PSAT/PSTS sesuai regulasi asesmen sumatif
  const rawPrefix = (eventPrefix || 'PSAS Ganjil').trim();
  const normalizedPrefix = rawPrefix
    .replace(/^SAS\b/i, 'PSAS')
    .replace(/^SAT\b/i, 'PSAT')
    .replace(/^STS\b/i, 'PSTS');

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
        const bankSoalId = matrix[matrixKey];
        if (!bankSoalId) return;

        const bank = bankMap.get(bankSoalId);
        if (!bank) return;

        const mapelName = bank.Mapel?.nama_mapel || bank.MataPelajaran?.nama_mapel || bank.judul;
        const classesInTingkat = groupedRoomsByTingkat.get(tingkat) || [];
        if (classesInTingkat.length === 0) return;

        const startIso = localDateTimeInputToISO(`${day.tanggal}T${session.jam_mulai}`);
        const endIso = localDateTimeInputToISO(`${day.tanggal}T${session.jam_selesai}`);

        if (generationMode === 'per_rombel_ruang') {
          // OPSI A (KONTRAK RESMI KELAS-CENTRIK): 1 Jadwal Ujian untuk setiap Ruang/Rombel
          classesInTingkat.forEach((cls) => {
            const rMapping = roomMapByKelasId.get(cls.kelas_id);
            const slotRuang = rMapping?.slot_ruang || `R.01`;
            const namaRuang = rMapping?.nama_ruang || slotRuang;

            payloads.push({
              bank_soal_id: bank.id,
              tahun_pelajaran_id: activeTpId,
              semester_id: activeSemId,
              nama_sesi: `${normalizedPrefix} - ${mapelName} (${cls.nama_kelas} - ${slotRuang})`,
              tanggal_mulai: startIso,
              tanggal_selesai: endIso,
              durasi_menit: session.durasi_menit || bank.alokasi_menit || 90,
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
          // OPSI B: 1 Jadwal Terpadu per Tingkat (Disertai Peta Ruang Fisik per Rombel Siswa)
          const kelasRoomMap: Record<string, { slot_ruang: string; nama_ruang: string }> = {};
          classesInTingkat.forEach((cls) => {
            const rMapping = roomMapByKelasId.get(cls.kelas_id);
            if (rMapping) {
              kelasRoomMap[cls.kelas_id] = {
                slot_ruang: rMapping.slot_ruang,
                nama_ruang: rMapping.nama_ruang,
              };
            }
          });

          payloads.push({
            bank_soal_id: bank.id,
            tahun_pelajaran_id: activeTpId,
            semester_id: activeSemId,
            nama_sesi: `${normalizedPrefix} - ${mapelName} (Tingkat ${tingkat} - ${session.nama_sesi})`,
            tanggal_mulai: startIso,
            tanggal_selesai: endIso,
            durasi_menit: session.durasi_menit || bank.alokasi_menit || 90,
            toleransi_terlambat_menit: toleransiTerlambatMenit,
            target_kelas_ids: classesInTingkat.map((c) => c.kelas_id),
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

export function getStorageKeyMatrix(tenantId?: string, tpId?: string, semId?: string): string {
  return `${MATRIX_STORAGE_PREFIX}${tenantId || 'global'}_${tpId || 'tp'}_${semId || 'sem'}`;
}

export function loadPersistedMatrixState(
  tenantId?: string,
  tpId?: string,
  semId?: string
): PersistedMatrixState | null {
  try {
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
  semId?: string
): void {
  try {
    const data: PersistedMatrixState = {
      ...payload,
      savedAt: Date.now(),
    };
    localStorage.setItem(getStorageKeyMatrix(tenantId, tpId, semId), JSON.stringify(data));
  } catch (err) {
    console.warn('Gagal menyimpan matriks ke localStorage:', err);
  }
}

/**
 * Rekonstruksi otomatis matriks dari jadwal yang sudah pernah diterbitkan di database
 */
export function reconstructMatrixFromExistingSchedules(
  existingSchedules: any[],
  days: ExamDayConfig[],
  bankList: CbtBankSoal[]
): TimetableMatrixState {
  if (!existingSchedules || !Array.isArray(existingSchedules) || existingSchedules.length === 0) {
    return {};
  }

  const bankMap = new Map(bankList.map((b) => [b.id, b]));
  const reconstructed: TimetableMatrixState = {};

  existingSchedules.forEach((j) => {
    if (!j.bank_soal_id || !j.tanggal_mulai) return;

    const bank = bankMap.get(j.bank_soal_id);
    const tingkat = bank ? resolveBankTingkatNumber(bank) : (j.BankSoal?.tingkat ? Number(j.BankSoal.tingkat) : undefined);
    if (tingkat === undefined) return;

    // Ambil tanggal lokal YYYY-MM-DD
    const jDate = new Date(j.tanggal_mulai);
    if (Number.isNaN(jDate.getTime())) return;
    const y = jDate.getFullYear();
    const m = String(jDate.getMonth() + 1).padStart(2, '0');
    const dt = String(jDate.getDate()).padStart(2, '0');
    const jDateStr = `${y}-${m}-${dt}`;

    const targetDay = days.find((d) => d.tanggal === jDateStr);
    if (!targetDay) return;

    const sec = j.setting_keamanan as any;
    const sessLabel = sec?.nama_sesi_waktu;

    let matchedSess = targetDay.sessions.find((s) => s.nama_sesi === sessLabel);
    if (!matchedSess) {
      // Cocokkan jam mulai HH:MM
      const h = String(jDate.getHours()).padStart(2, '0');
      const min = String(jDate.getMinutes()).padStart(2, '0');
      const jTime = `${h}:${min}`;
      matchedSess = targetDay.sessions.find((s) => s.jam_mulai === jTime);
    }

    if (!matchedSess && targetDay.sessions.length > 0) {
      matchedSess = targetDay.sessions[0];
    }

    if (matchedSess) {
      const key = `${targetDay.day_index}_${matchedSess.session_index}_${tingkat}`;
      reconstructed[key] = j.bank_soal_id;
    }
  });

  return reconstructed;
}
