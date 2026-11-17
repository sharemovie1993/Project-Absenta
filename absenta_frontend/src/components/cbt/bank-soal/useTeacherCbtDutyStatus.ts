import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { kurikulumApi } from '@/api/kurikulum.api';
import { cbtApi } from '@/api/cbt.api';
import type { CbtBankSoal } from '@/types/cbt.types';
import type { GuruMapel } from '@/types/academic';
import { useCbtOperationMode } from '../cbtModeHelper';
import { resolveBankTingkatNumber } from '../jadwal/cbtJadwalHelper';
import { formatTingkatRomawi } from './cbtAsesmenHelper';

export type DutyCoverStatus =
  | 'COVERED_OWN'   // Siap pakai (mandiri & ada butir soal)
  | 'COVERED_MGMP'  // Siap pakai (di-cover master MGMP rekan guru & ada butir soal)
  | 'DRAFT_OWN'     // Draf mandiri (bank soal sudah dibuat, tapi masih 0 butir soal)
  | 'DRAFT_MGMP'    // Draf MGMP (master MGMP sudah ada, tapi masih 0 butir soal)
  | 'PENDING';      // Belum ada bank soal sama sekali

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
  draftDuties: number;
  uncreatedDuties: number;
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
        draftDuties: 0,
        uncreatedDuties: 0,
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
        draftDuties: 0,
        uncreatedDuties: 0,
        pendingDuties: 0,
        completionPercentage: 100,
        isFullyExempt: false,
        hasNoDuties: true,
        items: [],
        pendingJurusanSummary: undefined,
      };
    }

    const items: TeacherDutyItem[] = [];
    const draftTargets: string[] = [];
    const uncreatedTargets: string[] = [];
    let totalDuties = 0;
    let coveredDuties = 0;
    let draftDuties = 0;
    let uncreatedDuties = 0;

    mapelTingkatList.forEach((mt) => {
      const { mapelId, mapelName, tingkat, jurusanMap } = mt;
      const romanTingkat = formatTingkatRomawi(tingkat);

      // Kumpulkan bank soal yang relevan pada mapel & tingkat ini
      const candidateBanks = rawBankList.filter((b) => {
        if (b.mapel_id !== mapelId) return false;
        const bTingkat = resolveBankTingkatNumber(b);
        return bTingkat === tingkat || bTingkat === undefined;
      });

      // Pisahkan bank milik guru vs bank master MGMP (yang di-share atau guru sebagai kontributor)
      const ownBanks = candidateBanks.filter((b) => b.guru_id === guruId);
      const mgmpBanks = candidateBanks.filter(
        (b) =>
          b.guru_id !== guruId &&
          (b.status === 'PUBLISHED' ||
            Boolean(b.is_shared) ||
            Boolean(b.Kontributor && b.Kontributor.some((c) => c.guru_id === guruId)))
      );

      // Helper Bank Soal Umum (mencakup SEMUA jurusan / UMUM / tanpa jurusan)
      const isGeneralBank = (b: CbtBankSoal) => {
        const rawJur = (b.jurusan || '').toUpperCase().trim();
        return !rawJur || rawJur === 'SEMUA' || rawJur === 'UMUM';
      };

      const ownGeneral = ownBanks.find(isGeneralBank);
      const mgmpGeneral = mgmpBanks.find(isGeneralBank);
      const effectiveGeneralBank = ownGeneral || mgmpGeneral;

      // Cek apakah ada bank soal spesifik jurusan untuk tingkat ini
      const hasSpecificBanks = candidateBanks.some(
        (b) => b.jurusan && b.jurusan !== 'SEMUA' && b.jurusan !== 'UMUM'
      );

      const jurusanList = Array.from(jurusanMap.values());

      // KASUS 1: Ada Bank Soal Umum yang mencakup seluruh jurusan, dan tidak ada varian spesifik yang bentrok
      if (effectiveGeneralBank && !hasSpecificBanks) {
        totalDuties++;
        const isOwn = effectiveGeneralBank === ownGeneral;
        const count = effectiveGeneralBank.jumlah_soal || effectiveGeneralBank._count?.Soal || 0;
        const allRombels = Array.from(
          new Set(jurusanList.flatMap((j) => Array.from(j.rombelNames)))
        );

        let status: DutyCoverStatus;
        if (count > 0) {
          status = isOwn ? 'COVERED_OWN' : 'COVERED_MGMP';
          coveredDuties++;
        } else {
          status = isOwn ? 'DRAFT_OWN' : 'DRAFT_MGMP';
          draftDuties++;
          draftTargets.push(`${mapelName} (Tingkat ${romanTingkat})`);
        }

        items.push({
          key: `${mapelId}_${tingkat}_ALL`,
          mapelId,
          mapelName,
          tingkat,
          tingkatRoman: romanTingkat,
          targetJurusan: undefined,
          rombelNames: allRombels,
          status,
          soalCount: count,
          bankSoal: effectiveGeneralBank,
          masterAuthorName: isOwn ? undefined : effectiveGeneralBank.Guru?.nama_guru,
        });
        return;
      }

      // KASUS 2: Evaluasi granular per-Jurusan
      jurusanList.forEach((jg) => {
        const { jurusanKode, rombelNames } = jg;
        totalDuties++;
        const rombelArr = Array.from(rombelNames);

        // Cari bank yang paling spesifik terlebih dahulu
        const ownSpecific = ownBanks.find(
          (b) => b.jurusan && b.jurusan.toUpperCase().trim() === jurusanKode
        );
        const mgmpSpecific = mgmpBanks.find(
          (b) => b.jurusan && b.jurusan.toUpperCase().trim() === jurusanKode
        );

        // Prioritas pencocokan:
        // 1. Bank Mandiri Spesifik Jurusan
        // 2. Bank MGMP Spesifik Jurusan
        // 3. Fallback Bank Mandiri Umum
        // 4. Fallback Bank MGMP Umum
        const matchedBank = ownSpecific || mgmpSpecific || ownGeneral || mgmpGeneral;

        if (matchedBank) {
          const isOwn = matchedBank.guru_id === guruId;
          const count = matchedBank.jumlah_soal || matchedBank._count?.Soal || 0;
          let status: DutyCoverStatus;

          if (count > 0) {
            status = isOwn ? 'COVERED_OWN' : 'COVERED_MGMP';
            coveredDuties++;
          } else {
            status = isOwn ? 'DRAFT_OWN' : 'DRAFT_MGMP';
            draftDuties++;
            draftTargets.push(
              `${mapelName}${jurusanKode !== 'UMUM' ? ` Jurusan ${jurusanKode}` : ''} (Tingkat ${romanTingkat})`
            );
          }

          items.push({
            key: `${mapelId}_${tingkat}_${jurusanKode}`,
            mapelId,
            mapelName,
            tingkat,
            tingkatRoman: romanTingkat,
            targetJurusan: jurusanKode !== 'UMUM' ? jurusanKode : undefined,
            rombelNames: rombelArr,
            status,
            soalCount: count,
            bankSoal: matchedBank,
            masterAuthorName: isOwn ? undefined : matchedBank.Guru?.nama_guru,
          });
        } else {
          // Benar-benar belum pernah dibuat sama sekali
          uncreatedDuties++;
          uncreatedTargets.push(
            `${mapelName}${jurusanKode !== 'UMUM' ? ` Jurusan ${jurusanKode}` : ''} (Tingkat ${romanTingkat})`
          );

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
        }
      });
    });

    const pendingDuties = totalDuties - coveredDuties;
    const completionPercentage = totalDuties > 0 ? Math.round((coveredDuties / totalDuties) * 100) : 100;
    const isFullyExempt = totalDuties > 0 && coveredDuties === totalDuties;

    const summaryParts: string[] = [];
    if (uncreatedTargets.length > 0) {
      summaryParts.push(`Belum dibuat: ${uncreatedTargets.join(', ')}`);
    }
    if (draftTargets.length > 0) {
      summaryParts.push(`Masih draf (0 butir soal): ${draftTargets.join(', ')}`);
    }
    const pendingJurusanSummary = summaryParts.length > 0 ? summaryParts.join('; ') : undefined;

    return {
      totalDuties,
      coveredDuties,
      draftDuties,
      uncreatedDuties,
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
