import type { CbtBankSoal } from '@/types/cbt.types';

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
 * Mencegah duplikasi bank soal untuk mata pelajaran & tingkat kelas yang sama.
 */
export function evaluateJurusanOccupancy(params: {
  existingBanks?: CbtBankSoal[] | null;
  currentEditingBankId?: string | null;
  targetTingkat?: string | null;
}): JurusanOccupancyResult {
  const { existingBanks, currentEditingBankId, targetTingkat } = params;
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

  existingBanks.forEach((b) => {
    // Abaikan bank soal yang sedang dalam mode edit (tidak memblokir diri sendiri)
    if (currentEditingBankId && b.id === currentEditingBankId) {
      return;
    }

    // Pastikan tingkat cocok jika targetTingkat ditentukan
    if (cleanTargetTingkat && cleanTargetTingkat !== 'SEMUA') {
      const bTingkat = (b.tingkat || '').trim().toUpperCase();
      if (bTingkat && bTingkat !== cleanTargetTingkat && bTingkat !== 'SEMUA') {
        return;
      }
    }

    const guruName = b.Guru?.nama_guru || 'Guru Pengampu';
    const rawJurusan = (b.jurusan || '').trim().toUpperCase();

    if (!rawJurusan || rawJurusan === 'SEMUA' || rawJurusan === 'UMUM') {
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
      // Menandai jurusan spesifik (bisa single 'KUL' maupun multi 'KUL, PHT')
      const codes = rawJurusan
        .split(/[,;/|]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      codes.forEach((code) => {
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
