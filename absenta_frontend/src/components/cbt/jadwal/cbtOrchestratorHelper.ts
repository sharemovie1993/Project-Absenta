import type { CbtBankSoal } from '@/types/cbt.types';
import { localDateTimeInputToISO } from '@/utils/attendance/time';

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

  // Sort secara hierarkis: Tingkat ASC -> Kode Jurusan -> Nama Kelas
  const sorted = [...rawKelasList].sort((a, b) => {
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
  } = params;

  const bankMap = new Map(bankList.map((b) => [b.id, b]));
  const roomMapByKelasId = new Map(roomMappings.map((m) => [m.kelas_id, m]));
  const groupedRoomsByTingkat = groupMappingsByTingkat(roomMappings);

  const payloads: any[] = [];

  days.forEach((day) => {
    day.sessions.forEach((session) => {
      // Loop seluruh tingkat yang tersedia di roomMappings
      Array.from(groupedRoomsByTingkat.keys()).forEach((tingkat) => {
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
              nama_sesi: `${eventPrefix} - ${mapelName} (${cls.nama_kelas} - ${slotRuang})`,
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
              },
            });
          });
        } else {
          // OPSI B: 1 Jadwal Terpadu per Tingkat
          payloads.push({
            bank_soal_id: bank.id,
            tahun_pelajaran_id: activeTpId,
            semester_id: activeSemId,
            nama_sesi: `${eventPrefix} - ${mapelName} (Tingkat ${tingkat} - ${session.nama_sesi})`,
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
              ruang_ujian: 'Multi-Ruang Kelas',
            },
          });
        }
      });
    });
  });

  return payloads;
}
