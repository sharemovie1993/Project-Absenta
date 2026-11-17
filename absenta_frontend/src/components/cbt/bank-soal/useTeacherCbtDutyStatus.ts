import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { kurikulumApi } from '@/api/kurikulum.api';
import { cbtApi } from '@/api/cbt.api';
import type { CbtBankSoal } from '@/types/cbt.types';
import type { GuruMapel } from '@/types/academic';
import { useCbtOperationMode } from '../cbtModeHelper';
import { resolveBankTingkatNumber } from '../jadwal/cbtJadwalHelper';
import { formatTingkatRomawi } from './cbtAsesmenHelper';

export type DutyCoverStatus = 'COVERED_OWN' | 'COVERED_MGMP' | 'PENDING';

export interface TeacherDutyItem {
  key: string;
  mapelId: string;
  mapelName: string;
  tingkat: number;
  tingkatRoman: string;
  targetJurusan?: string;
  rombelNames: string[];
  status: DutyCoverStatus;
  soalCount: number;
  bankSoal?: CbtBankSoal;
  masterAuthorName?: string;
}

export interface TeacherCbtDutyStatusResult {
  isLoading: boolean;
  activeEventName?: string;
  hasActiveEvent: boolean;
  totalDuties: number;
  coveredDuties: number;
  pendingDuties: number;
  completionPercentage: number;
  isFullyExempt: boolean;
  hasNoDuties: boolean;
  items: TeacherDutyItem[];
  pendingJurusanSummary?: string;
}

export function useTeacherCbtDutyStatus(guruId?: string): TeacherCbtDutyStatusResult {
  const { activeEvent, eventName, targetTingkat } = useCbtOperationMode();

  // 1. Ambil Penugasan SK Mengajar Guru (GuruMapel)
  const { data: assignedMapelsRes, isLoading: isMapelLoading } = useQuery({
    queryKey: ['guru-assigned-mapels-for-duty', guruId],
    queryFn: () => (guruId ? kurikulumApi.getGuruMapel(guruId).catch(() => null) : null),
    enabled: Boolean(guruId),
    staleTime: 60 * 1000,
  });

  // 2. Ambil Bank Soal Relevan (milik sendiri + master MGMP yang di-share ke guru ini)
  const { data: bankListRes, isLoading: isBankLoading } = useQuery({
    queryKey: ['cbt-bank-soal-for-teacher-duty', guruId],
    queryFn: () =>
      guruId
        ? cbtApi
            .getBankSoalList({
              guru_id: guruId,
              limit: 200,
            })
            .catch(() => null)
        : null,
    enabled: Boolean(guruId),
    staleTime: 30 * 1000,
  });

  const rawAssignedList: GuruMapel[] = useMemo(() => {
    return assignedMapelsRes?.data || [];
  }, [assignedMapelsRes]);

  const rawBankList: CbtBankSoal[] = useMemo(() => {
    return bankListRes?.items || (bankListRes as any)?.data?.items || [];
  }, [bankListRes]);

  // 3. Evaluasi Penugasan vs Ketercoveran Bank Soal dengan Granularitas Jurusan
  const evaluation = useMemo(() => {
    if (!guruId || rawAssignedList.length === 0) {
      return {
        totalDuties: 0,
        coveredDuties: 0,
        pendingDuties: 0,
        completionPercentage: 100,
        isFullyExempt: false,
        hasNoDuties: true,
        items: [],
        pendingJurusanSummary: undefined,
      };
    }

    // Kelompokkan penugasan mengajar per Mapel & Tingkat, lalu breakdown per Jurusan
    interface JurusanGroup {
      jurusanKode: string;
      rombelNames: Set<string>;
    }

    const mapelTingkatMap = new Map<
      string,
      {
        mapelId: string;
        mapelName: string;
        tingkat: number;
        jurusanMap: Map<string, JurusanGroup>;
      }
    >();

    rawAssignedList.forEach((gm) => {
      const mId = gm.mapel_id;
      if (!mId) return;

      const mapelName = gm.Mapel?.nama_mapel || 'Mata Pelajaran';
      const lowerName = mapelName.toLowerCase();

      // Abaikan BK / Bimbingan Konseling yang tidak memiliki tes tulis CBT
      if (
        lowerName.includes('bimbingan') ||
        lowerName.includes('konseling') ||
        lowerName.includes('bp/bk') ||
        lowerName.includes('bk')
      ) {
        return;
      }

      // Deteksi tingkat kelas
      const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat;
      let tNum = Number(rawTingkat);
      if (!tNum && gm.Kelas?.nama_kelas) {
        const match = gm.Kelas.nama_kelas.match(/\b(X|XI|XII|10|11|12)\b/i);
        if (match) {
          const roman = match[1].toUpperCase();
          tNum = roman === 'XI' || roman === '11' ? 11 : roman === 'XII' || roman === '12' ? 12 : 10;
        }
      }
      if (!tNum) {
        tNum = rawTingkat === 'XI' ? 11 : rawTingkat === 'XII' ? 12 : 10;
      }

      // Filter tingkat yang relevan dengan event jika event memiliki sasaran tingkat
      if (targetTingkat && targetTingkat.length > 0 && !targetTingkat.includes(tNum)) {
        return;
      }

      const mtKey = `${mId}_${tNum}`;
      if (!mapelTingkatMap.has(mtKey)) {
        mapelTingkatMap.set(mtKey, {
          mapelId: mId,
          mapelName,
          tingkat: tNum,
          jurusanMap: new Map<string, JurusanGroup>(),
        });
      }

      const mtEntry = mapelTingkatMap.get(mtKey)!;
      const kName = gm.Kelas?.nama_kelas || '';

      // Ekstraksi kode konsentrasi keahlian / jurusan dari rombel
      let jurKode =
        (gm.Jurusan as any)?.kode ||
        (gm.Jurusan as any)?.singkatan ||
        (gm.Kelas as any)?.Jurusan?.kode;
      if (!jurKode && kName) {
        const tokens = kName.split(/\s+/);
        if (tokens.length >= 2) {
          jurKode = tokens[1].toUpperCase();
        }
      }
      jurKode = (jurKode || 'UMUM').toUpperCase().trim();

      if (!mtEntry.jurusanMap.has(jurKode)) {
        mtEntry.jurusanMap.set(jurKode, {
          jurusanKode: jurKode,
          rombelNames: new Set<string>(),
        });
      }

      if (kName) {
        mtEntry.jurusanMap.get(jurKode)!.rombelNames.add(kName);
      }
    });

    const mapelTingkatList = Array.from(mapelTingkatMap.values());
    if (mapelTingkatList.length === 0) {
      return {
        totalDuties: 0,
        coveredDuties: 0,
        pendingDuties: 0,
        completionPercentage: 100,
        isFullyExempt: false,
        hasNoDuties: true,
        items: [],
        pendingJurusanSummary: undefined,
      };
    }

    const items: TeacherDutyItem[] = [];
    const pendingTargets: string[] = [];
    let totalDuties = 0;
    let coveredDuties = 0;

    mapelTingkatList.forEach((mt) => {
      const { mapelId, mapelName, tingkat, jurusanMap } = mt;
      const romanTingkat = formatTingkatRomawi(tingkat);

      // Kumpulkan bank soal yang relevan pada mapel & tingkat ini
      const candidateBanks = rawBankList.filter((b) => {
        if (b.mapel_id !== mapelId) return false;
        const bTingkat = resolveBankTingkatNumber(b);
        return bTingkat === tingkat || bTingkat === undefined;
      });

      // Cek apakah ada Bank Soal UMUM (tanpa spesifikasi jurusan / 'SEMUA')
      const generalOwnBank = candidateBanks.find(
        (b) =>
          b.guru_id === guruId &&
          (b.jumlah_soal || b._count?.Soal || 0) > 0 &&
          (!b.jurusan || b.jurusan === 'SEMUA' || b.jurusan === 'UMUM')
      );

      const generalMgmpBank = candidateBanks.find((b) => {
        const count = b.jumlah_soal || b._count?.Soal || 0;
        if (count === 0) return false;
        const rawJur = (b.jurusan || '').toUpperCase().trim();
        const isGeneral = !rawJur || rawJur === 'SEMUA' || rawJur === 'UMUM';
        if (!isGeneral) return false;
        return (
          b.status === 'PUBLISHED' ||
          (b.Kontributor && b.Kontributor.some((c) => c.guru_id === guruId))
        );
      });

      const effectiveGeneralBank = generalOwnBank || generalMgmpBank;

      // Cek apakah ada bank soal spesifik jurusan yang dibuat untuk tingkat ini
      const hasSpecificBanks = candidateBanks.some(
        (b) => b.jurusan && b.jurusan !== 'SEMUA' && b.jurusan !== 'UMUM'
      );

      const jurusanList = Array.from(jurusanMap.values());

      // KASUS 1: Ada Bank Soal Umum yang mencakup seluruh jurusan, dan tidak ada varian spesifik yang bentrok
      if (effectiveGeneralBank && !hasSpecificBanks) {
        totalDuties++;
        coveredDuties++;
        const isOwn = effectiveGeneralBank === generalOwnBank;
        const count = effectiveGeneralBank.jumlah_soal || effectiveGeneralBank._count?.Soal || 0;

        const allRombels = Array.from(
          new Set(jurusanList.flatMap((j) => Array.from(j.rombelNames)))
        );

        items.push({
          key: `${mapelId}_${tingkat}_ALL`,
          mapelId,
          mapelName,
          tingkat,
          tingkatRoman: romanTingkat,
          targetJurusan: undefined,
          rombelNames: allRombels,
          status: isOwn ? 'COVERED_OWN' : 'COVERED_MGMP',
          soalCount: count,
          bankSoal: effectiveGeneralBank,
          masterAuthorName: isOwn ? undefined : effectiveGeneralBank.Guru?.nama_guru,
        });
        return;
      }

      // KASUS 2: Evaluasi granular per-Jurusan
      // (Terjadi saat guru membuat bank soal spesifik untuk 1 jurusan tertentu seperti KUL,
      //  sehingga jurusan lain seperti PHT atau TSM tetap harus dibuatkan/di-cover)
      jurusanList.forEach((jg) => {
        const { jurusanKode, rombelNames } = jg;
        totalDuties++;
        const rombelArr = Array.from(rombelNames);

        // 1. Cek Bank Soal Mandiri spesifik untuk jurusan ini
        const specificOwnBank = candidateBanks.find(
          (b) =>
            b.guru_id === guruId &&
            (b.jumlah_soal || b._count?.Soal || 0) > 0 &&
            b.jurusan &&
            b.jurusan.toUpperCase().trim() === jurusanKode
        );

        if (specificOwnBank) {
          coveredDuties++;
          const count = specificOwnBank.jumlah_soal || specificOwnBank._count?.Soal || 0;
          items.push({
            key: `${mapelId}_${tingkat}_${jurusanKode}`,
            mapelId,
            mapelName,
            tingkat,
            tingkatRoman: romanTingkat,
            targetJurusan: jurusanKode !== 'UMUM' ? jurusanKode : undefined,
            rombelNames: rombelArr,
            status: 'COVERED_OWN',
            soalCount: count,
            bankSoal: specificOwnBank,
          });
          return;
        }

        // 2. Cek Bank Soal Master MGMP spesifik untuk jurusan ini
        const specificMgmpBank = candidateBanks.find((b) => {
          const count = b.jumlah_soal || b._count?.Soal || 0;
          if (count === 0) return false;
          if (!b.jurusan || b.jurusan.toUpperCase().trim() !== jurusanKode) return false;
          return (
            b.status === 'PUBLISHED' ||
            (b.Kontributor && b.Kontributor.some((c) => c.guru_id === guruId))
          );
        });

        if (specificMgmpBank) {
          coveredDuties++;
          const count = specificMgmpBank.jumlah_soal || specificMgmpBank._count?.Soal || 0;
          items.push({
            key: `${mapelId}_${tingkat}_${jurusanKode}`,
            mapelId,
            mapelName,
            tingkat,
            tingkatRoman: romanTingkat,
            targetJurusan: jurusanKode !== 'UMUM' ? jurusanKode : undefined,
            rombelNames: rombelArr,
            status: 'COVERED_MGMP',
            soalCount: count,
            bankSoal: specificMgmpBank,
            masterAuthorName: specificMgmpBank.Guru?.nama_guru || 'Rekan MGMP',
          });
          return;
        }

        // 3. Fallback: Jika ada bank umum yang berlaku untuk semua jurusan
        if (effectiveGeneralBank) {
          coveredDuties++;
          const isOwn = effectiveGeneralBank === generalOwnBank;
          const count = effectiveGeneralBank.jumlah_soal || effectiveGeneralBank._count?.Soal || 0;
          items.push({
            key: `${mapelId}_${tingkat}_${jurusanKode}`,
            mapelId,
            mapelName,
            tingkat,
            tingkatRoman: romanTingkat,
            targetJurusan: jurusanKode !== 'UMUM' ? jurusanKode : undefined,
            rombelNames: rombelArr,
            status: isOwn ? 'COVERED_OWN' : 'COVERED_MGMP',
            soalCount: count,
            bankSoal: effectiveGeneralBank,
            masterAuthorName: isOwn ? undefined : effectiveGeneralBank.Guru?.nama_guru,
          });
          return;
        }

        // 4. Belum ada bank soal untuk jurusan ini
        pendingTargets.push(`${jurusanKode} (Tingkat ${romanTingkat})`);
        items.push({
          key: `${mapelId}_${tingkat}_${jurusanKode}`,
          mapelId,
          mapelName,
          tingkat,
          tingkatRoman: romanTingkat,
          targetJurusan: jurusanKode !== 'UMUM' ? jurusanKode : undefined,
          rombelNames: rombelArr,
          status: 'PENDING',
          soalCount: 0,
        });
      });
    });

    const pendingDuties = totalDuties - coveredDuties;
    const completionPercentage = totalDuties > 0 ? Math.round((coveredDuties / totalDuties) * 100) : 100;
    const isFullyExempt = totalDuties > 0 && coveredDuties === totalDuties;

    const pendingJurusanSummary =
      pendingTargets.length > 0 ? pendingTargets.join(', ') : undefined;

    return {
      totalDuties,
      coveredDuties,
      pendingDuties,
      completionPercentage,
      isFullyExempt,
      hasNoDuties: false,
      items,
      pendingJurusanSummary,
    };
  }, [guruId, rawAssignedList, rawBankList, targetTingkat]);

  return {
    isLoading: isMapelLoading || isBankLoading,
    activeEventName: eventName || activeEvent?.nama_event || undefined,
    hasActiveEvent: Boolean(activeEvent),
    ...evaluation,
  };
}
