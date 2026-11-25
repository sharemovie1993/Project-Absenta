import type { CbtBankSoal } from '@/types/cbt.types';
import { isGeneralBankJurusan, parseBankJurusanTokens, parseStrictTingkatValue } from './cbtDutyEngine';

export interface OccupiedJurusanInfo {
  jurusanCode: string;
  guruName: string;
  judul: string;
  bankId: string;
  tingkat: string;
}

export interface JurusanOccupancyResult {
  occupiedMap: Map<string, OccupiedJurusanInfo>;
  isGeneralOccupied: boolean;
  generalInfo?: OccupiedJurusanInfo;
  isJurusanOccupied: (jurusanCode: string) => boolean;
  getOccupiedInfo: (jurusanCode: string) => OccupiedJurusanInfo | undefined;
}

/**
 * Helper Evaluasi Ketersediaan Sasaran Jurusan pada Bank Soal
 * Mencegah duplikasi bank soal untuk mata pelajaran & tingkat kelas yang sama,
 * sekaligus mengizinkan pembagian rombel mandiri dalam 1 jurusan yang sama (misal X TKJ 1&2 oleh Bu Maya, X TKJ 3 oleh Bu Rini).
 */
export function evaluateJurusanOccupancy(params: {
  existingBanks?: CbtBankSoal[] | null;
  currentEditingBankId?: string | null;
  targetTingkat?: string | null;
  currentGuruId?: string | null;
  isSharedMode?: boolean;
}): JurusanOccupancyResult {
  const { existingBanks, currentEditingBankId, targetTingkat, currentGuruId, isSharedMode } = params;
  const occupiedMap = new Map<string, OccupiedJurusanInfo>();
  let isGeneralOccupied = false;
  let generalInfo: OccupiedJurusanInfo | undefined;

  if (!Array.isArray(existingBanks) || existingBanks.length === 0) {
    return {
      occupiedMap,
      isGeneralOccupied: false,
      isJurusanOccupied: () => false,
      getOccupiedInfo: () => undefined,
    };
  }

  const cleanTargetTingkat = (targetTingkat || '').trim().toUpperCase();
  const targetTingkatNum = parseStrictTingkatValue(targetTingkat);

  existingBanks.forEach((b) => {
    // Abaikan bank soal yang sedang dalam mode edit (tidak memblokir diri sendiri)
    if (currentEditingBankId && b.id === currentEditingBankId) {
      return;
    }

    // Pastikan tingkat cocok jika targetTingkat ditentukan (mendukung multi-jenjang 1..13 / I..XIII)
    if (cleanTargetTingkat && cleanTargetTingkat !== 'SEMUA') {
      const bTingkatNum = parseStrictTingkatValue(b.tingkat_num ?? b.tingkat);
      const bTingkatStr = (b.tingkat || '').trim().toUpperCase();
      if (targetTingkatNum && bTingkatNum) {
        if (bTingkatNum !== targetTingkatNum) return;
      } else if (bTingkatStr && bTingkatStr !== cleanTargetTingkat && bTingkatStr !== 'SEMUA') {
        return;
      }
    }

    // ATURAN ARSITEKTUR KELAS & JURUSAN:
    // Jika sebuah bank soal adalah MANDIRI (b.is_shared === false):
    // Bank tersebut hanya milik rombel binaan guru bersangkutan, DILARANG mengunci jurusan untuk guru lain!
    // Contoh: Bu Maya membuat MTK A mandiri untuk X TKJ 1 & 2. Bu Rini (pengampu X TKJ 3) TIDAK BOLEH terkunci.
    if (!b.is_shared && currentGuruId && b.guru_id !== currentGuruId) {
      return;
    }

    // Jika guru sedang membuat paket MANDIRI (isSharedMode === false), naskah MGMP rekan tidak boleh
    // memblokir jika guru ini memang belum ter-cover atau ingin membuat naskah mandiri untuk kelasnya
    if (!isSharedMode && b.is_shared && currentGuruId && b.guru_id !== currentGuruId) {
      const isExplicitContributor = (b.Kontributor || []).some((c: any) => c.guru_id === currentGuruId);
      if (!isExplicitContributor) {
        return;
      }
    }

    const guruName = b.Guru?.nama_guru || 'Guru Pengampu';

    if (isGeneralBankJurusan(b.jurusan, b)) {
      // Menandai bahwa paket bank soal reguler / umum untuk semua rombel sudah ada
      isGeneralOccupied = true;
      generalInfo = {
        jurusanCode: 'SEMUA',
        guruName,
        judul: b.judul || b.kode_bank,
        bankId: b.id,
        tingkat: b.tingkat,
      };
      occupiedMap.set('SEMUA', generalInfo);
    } else {
      // Menandai jurusan spesifik (baik berdasarkan ID mutlak maupun kode jurusan)
      const tokens = parseBankJurusanTokens(b.jurusan);
      if (Array.isArray(b.target_jurusan_ids)) {
        b.target_jurusan_ids.forEach((id) => {
          if (id && !tokens.includes(id.toUpperCase())) tokens.push(id.toUpperCase());
        });
      } else if (b.jurusan_id && !tokens.includes(b.jurusan_id.toUpperCase())) {
        tokens.push(b.jurusan_id.toUpperCase());
      }

      tokens.forEach((code) => {
        const info: OccupiedJurusanInfo = {
          jurusanCode: code,
          guruName,
          judul: b.judul || b.kode_bank,
          bankId: b.id,
          tingkat: b.tingkat,
        };
        occupiedMap.set(code, info);
      });
    }
  });

  return {
    occupiedMap,
    isGeneralOccupied,
    generalInfo,
    isJurusanOccupied: (jurusanCode: string) => {
      const cleanCode = (jurusanCode || '').trim().toUpperCase();
      if (!cleanCode || cleanCode === 'SEMUA') {
        return isGeneralOccupied;
      }
      // Jika master naskah umum (semua jurusan) sudah ada, maka seluruh jurusan otomatis ter-cover / occupied
      return isGeneralOccupied || occupiedMap.has(cleanCode);
    },
    getOccupiedInfo: (jurusanCode: string) => {
      const cleanCode = (jurusanCode || '').trim().toUpperCase();
      if (!cleanCode || cleanCode === 'SEMUA') {
        return generalInfo;
      }
      return occupiedMap.get(cleanCode) || (isGeneralOccupied ? generalInfo : undefined);
    },
  };
}
