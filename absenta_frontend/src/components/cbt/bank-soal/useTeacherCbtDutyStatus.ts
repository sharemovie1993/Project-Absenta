import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { kurikulumApi } from '@/api/kurikulum.api';
import { getMyJadwalKBM, getJadwalKBM, type JadwalKBM } from '@/api/attendance/jadwalKBM.api';
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
  mapelKode?: string;
  tingkat: number;
  tingkatRoman: string;
  targetJurusan?: string;
  rombelNames: string[];
  status: DutyCoverStatus;
  soalCount: number;
  bankSoal?: CbtBankSoal;
  masterAuthorName?: string;
  ownBank?: CbtBankSoal;     // Bank Soal Mandiri Milik Guru Sendiri
  mgmpBank?: CbtBankSoal;    // Bank Soal MGMP / Rekan Berbagi yang Beririsan
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

  // 1b. Ambil Jadwal KBM Mingguan Riil Guru (untuk melengkapi pemetaan rombel bila SK belum memiliki kelas_id spesifik)
  const { data: jadwalKBMRes, isLoading: isJadwalLoading } = useQuery({
    queryKey: ['guru-jadwal-kbm-for-duty', guruId],
    queryFn: async () => {
      try {
        const res = await getMyJadwalKBM({ weekly: 'true' } as any);
        const list = res?.data || (res as any)?.items;
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      } catch {
        // Fallback ke endpoint umum dengan filter guru_id
      }
      if (guruId) {
        try {
          const fallbackRes = await getJadwalKBM({ guru_id: guruId } as any);
          const fList = fallbackRes?.data || fallbackRes?.items;
          if (Array.isArray(fList)) return fList;
        } catch {
          // ignore
        }
      }
      return [];
    },
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

  const rawJadwalList: JadwalKBM[] = useMemo(() => {
    return Array.isArray(jadwalKBMRes) ? jadwalKBMRes : (jadwalKBMRes as any)?.data || [];
  }, [jadwalKBMRes]);

  const rawBankList: CbtBankSoal[] = useMemo(() => {
    return bankListRes?.items || (bankListRes as any)?.data?.items || [];
  }, [bankListRes]);

  // 3. Evaluasi Penugasan vs Ketercoveran Bank Soal dengan Granularitas Jurusan & Rekonsiliasi Jadwal
  const evaluation = useMemo(() => {
    const hasAssignments = rawAssignedList.length > 0 || rawJadwalList.length > 0;
    if (!guruId || !hasAssignments) {
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

    // Helper ekstraksi tingkat dari teks / angka
    const resolveTingkatHelper = (raw: any, textRef?: string): number => {
      let tNum = Number(raw);
      if (!tNum && textRef) {
        const match = textRef.match(/\b(X|XI|XII|10|11|12)\b/i);
        if (match) {
          const roman = match[1].toUpperCase();
          tNum = roman === 'XI' || roman === '11' ? 11 : roman === 'XII' || roman === '12' ? 12 : 10;
        }
      }
      if (!tNum) {
        tNum = raw === 'XI' ? 11 : raw === 'XII' ? 12 : 10;
      }
      return tNum;
    };

    // Helper ekstraksi jurusan dari nama kelas / jurusan
    const resolveJurusanKode = (kName?: string, jurRef?: any): string => {
      let jurKode =
        jurRef?.kode ||
        jurRef?.singkatan ||
        jurRef?.nama_jurusan;
      if (!jurKode && kName) {
        const tokens = kName.trim().split(/\s+/);
        if (tokens.length >= 2) {
          jurKode = tokens[1].toUpperCase();
        }
      }
      return (jurKode || 'UMUM').toUpperCase().trim();
    };

    // Indexing JadwalKBM riil mingguan guru untuk memperkaya kelas yang null di SK
    interface ScheduleClassItem {
      mapelId?: string;
      mapelName: string;
      kelasId?: string;
      namaKelas: string;
      tingkat: number;
      jurusanKode: string;
    }

    const scheduleByMapelKey = new Map<string, ScheduleClassItem[]>();
    const scheduleByMapelName = new Map<string, ScheduleClassItem[]>();

    rawJadwalList.forEach((j) => {
      const mName = j.Mapel?.nama_mapel || '';
      const kName = j.Kelas?.nama_kelas || '';
      if (!mName || !kName) return;

      const tNum = resolveTingkatHelper(j.Kelas?.tingkat, kName);
      const jurKode = resolveJurusanKode(kName);

      const item: ScheduleClassItem = {
        mapelId: j.mapel_id,
        mapelName: mName,
        kelasId: j.kelas_id,
        namaKelas: kName,
        tingkat: tNum,
        jurusanKode: jurKode,
      };

      if (j.mapel_id) {
        const mKey = `${j.mapel_id}_${tNum}`;
        if (!scheduleByMapelKey.has(mKey)) scheduleByMapelKey.set(mKey, []);
        scheduleByMapelKey.get(mKey)!.push(item);
      }

      const nameKey = `${mName.trim().toLowerCase()}_${tNum}`;
      if (!scheduleByMapelName.has(nameKey)) scheduleByMapelName.set(nameKey, []);
      scheduleByMapelName.get(nameKey)!.push(item);
    });

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
        mapelKode?: string;
        tingkat: number;
        jurusanMap: Map<string, JurusanGroup>;
      }
    >();

    // 1. Masukkan penugasan dari GuruMapel
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

      const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat;
      const kName = gm.Kelas?.nama_kelas || '';
      const tNum = resolveTingkatHelper(rawTingkat, kName);

      // Filter tingkat yang relevan dengan event jika event memiliki sasaran tingkat
      if (targetTingkat && targetTingkat.length > 0 && !targetTingkat.includes(tNum)) {
        return;
      }

      const mtKey = `${mId}_${tNum}`;
      if (!mapelTingkatMap.has(mtKey)) {
        mapelTingkatMap.set(mtKey, {
          mapelId: mId,
          mapelName,
          mapelKode: gm.Mapel?.kode_mapel,
          tingkat: tNum,
          jurusanMap: new Map<string, JurusanGroup>(),
        });
      }

      const mtEntry = mapelTingkatMap.get(mtKey)!;

      if (kName) {
        // Jika sudah ada nama kelas eksplisit dari GuruMapel
        const jurKode = resolveJurusanKode(kName, gm.Jurusan || (gm.Kelas as any)?.Jurusan);
        if (!mtEntry.jurusanMap.has(jurKode)) {
          mtEntry.jurusanMap.set(jurKode, {
            jurusanKode: jurKode,
            rombelNames: new Set<string>(),
          });
        }
        mtEntry.jurusanMap.get(jurKode)!.rombelNames.add(kName);
      } else {
        // Jika kelas_id di GuruMapel kosong, cari dari JadwalKBM yang matching
        const mKey = `${mId}_${tNum}`;
        const nameKey = `${mapelName.trim().toLowerCase()}_${tNum}`;
        const matchingSchedules = scheduleByMapelKey.get(mKey) || scheduleByMapelName.get(nameKey) || [];

        if (matchingSchedules.length > 0) {
          matchingSchedules.forEach((sch) => {
            if (!mtEntry.jurusanMap.has(sch.jurusanKode)) {
              mtEntry.jurusanMap.set(sch.jurusanKode, {
                jurusanKode: sch.jurusanKode,
                rombelNames: new Set<string>(),
              });
            }
            mtEntry.jurusanMap.get(sch.jurusanKode)!.rombelNames.add(sch.namaKelas);
          });
        } else {
          // Fallback jika tidak ada di JadwalKBM juga: Jadikan Rombel Umum
          const jurKode = resolveJurusanKode(undefined, gm.Jurusan);
          if (!mtEntry.jurusanMap.has(jurKode)) {
            mtEntry.jurusanMap.set(jurKode, {
              jurusanKode: jurKode,
              rombelNames: new Set<string>(),
            });
          }
          mtEntry.jurusanMap.get(jurKode)!.rombelNames.add(`Semua Rombel Tingkat ${formatTingkatRomawi(tNum)}`);
        }
      }
    });

    // 2. Masukkan jadwal dari JadwalKBM yang mungkin belum tercatat di GuruMapel
    rawJadwalList.forEach((j) => {
      const mId = j.mapel_id;
      const mName = j.Mapel?.nama_mapel;
      const kName = j.Kelas?.nama_kelas;
      if (!mName || !kName) return;

      const lowerName = mName.toLowerCase();
      if (
        lowerName.includes('bimbingan') ||
        lowerName.includes('konseling') ||
        lowerName.includes('bp/bk') ||
        lowerName.includes('bk')
      ) {
        return;
      }

      const tNum = resolveTingkatHelper(j.Kelas?.tingkat, kName);
      if (targetTingkat && targetTingkat.length > 0 && !targetTingkat.includes(tNum)) {
        return;
      }

      const mtKey = mId ? `${mId}_${tNum}` : `${mName.trim().toLowerCase()}_${tNum}`;
      if (!mapelTingkatMap.has(mtKey)) {
        // Cek apakah ada entry dengan nama mapel yang sama
        const existingByName = Array.from(mapelTingkatMap.values()).find(
          (e) => e.tingkat === tNum && e.mapelName.trim().toLowerCase() === mName.trim().toLowerCase()
        );
        if (existingByName) {
          const jurKode = resolveJurusanKode(kName);
          if (!existingByName.jurusanMap.has(jurKode)) {
            existingByName.jurusanMap.set(jurKode, {
              jurusanKode: jurKode,
              rombelNames: new Set<string>(),
            });
          }
          existingByName.jurusanMap.get(jurKode)!.rombelNames.add(kName);
          return;
        }

        mapelTingkatMap.set(mtKey, {
          mapelId: mId || mtKey,
          mapelName: mName,
          mapelKode: j.Mapel?.kode_mapel,
          tingkat: tNum,
          jurusanMap: new Map<string, JurusanGroup>(),
        });
      }

      const mtEntry = mapelTingkatMap.get(mtKey)!;
      const jurKode = resolveJurusanKode(kName);
      if (!mtEntry.jurusanMap.has(jurKode)) {
        mtEntry.jurusanMap.set(jurKode, {
          jurusanKode: jurKode,
          rombelNames: new Set<string>(),
        });
      }
      mtEntry.jurusanMap.get(jurKode)!.rombelNames.add(kName);
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
      const { mapelId, mapelName, mapelKode, tingkat, jurusanMap } = mt;
      const romanTingkat = formatTingkatRomawi(tingkat);
      const normMapelName = mapelName.trim().toLowerCase();

      // Kumpulkan bank soal yang relevan (by mapel_id ATAU nama mapel yang cocok)
      const candidateBanks = rawBankList.filter((b) => {
        const bName = (b.Mapel?.nama_mapel || b.MataPelajaran?.nama_mapel || b.judul || '').trim().toLowerCase();
        const isMatchMapel = b.mapel_id === mapelId || (bName && bName.includes(normMapelName));
        if (!isMatchMapel) return false;

        const bTingkat = resolveBankTingkatNumber(b);
        return bTingkat === tingkat || bTingkat === undefined;
      });

      // Pisahkan bank milik guru vs bank master MGMP (milik rekan sejawat atau beririsan)
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

      // Cek apakah ada varian spesifik per-jurusan
      const hasSpecificBanks = candidateBanks.some(
        (b) => b.jurusan && b.jurusan !== 'SEMUA' && b.jurusan !== 'UMUM'
      );

      const jurusanList = Array.from(jurusanMap.values());

      // KASUS 1: Ada Bank Soal Umum yang mencakup seluruh jurusan, dan tidak ada varian spesifik
      if ((ownGeneral || mgmpGeneral) && !hasSpecificBanks && jurusanList.length <= 1) {
        totalDuties++;
        const effectiveBank = ownGeneral || mgmpGeneral;
        const count = effectiveBank?.jumlah_soal || effectiveBank?._count?.Soal || 0;
        const allRombels = Array.from(
          new Set(jurusanList.flatMap((j) => Array.from(j.rombelNames)))
        );

        let status: DutyCoverStatus;
        if (count > 0) {
          status = ownGeneral ? 'COVERED_OWN' : 'COVERED_MGMP';
          coveredDuties++;
        } else {
          status = ownGeneral ? 'DRAFT_OWN' : 'DRAFT_MGMP';
          draftDuties++;
          draftTargets.push(`${mapelName} (Tingkat ${romanTingkat})`);
        }

        items.push({
          key: `${mapelId}_${tingkat}_ALL`,
          mapelId,
          mapelName,
          mapelKode,
          tingkat,
          tingkatRoman: romanTingkat,
          targetJurusan: undefined,
          rombelNames: allRombels.length > 0 ? allRombels : [`Semua Rombel Tingkat ${romanTingkat}`],
          status,
          soalCount: count,
          bankSoal: effectiveBank,
          masterAuthorName: ownGeneral ? undefined : mgmpGeneral?.Guru?.nama_guru,
          ownBank: ownGeneral,
          mgmpBank: mgmpGeneral,
        });
        return;
      }

      // KASUS 2: Evaluasi granular per-Jurusan
      jurusanList.forEach((jg) => {
        const { jurusanKode, rombelNames } = jg;
        totalDuties++;
        const rombelArr = Array.from(rombelNames);

        // Cari bank spesifik jurusan
        const ownSpecific = ownBanks.find(
          (b) => b.jurusan && b.jurusan.toUpperCase().trim() === jurusanKode
        );
        const mgmpSpecific = mgmpBanks.find(
          (b) => b.jurusan && b.jurusan.toUpperCase().trim() === jurusanKode
        );

        const effectiveOwn = ownSpecific || ownGeneral;
        const effectiveMgmp = mgmpSpecific || mgmpGeneral;
        const matchedBank = effectiveOwn || effectiveMgmp;

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
            mapelKode,
            tingkat,
            tingkatRoman: romanTingkat,
            targetJurusan: jurusanKode !== 'UMUM' ? jurusanKode : undefined,
            rombelNames: rombelArr.length > 0 ? rombelArr : [`Semua Rombel Tingkat ${romanTingkat}`],
            status,
            soalCount: count,
            bankSoal: matchedBank,
            masterAuthorName: isOwn ? undefined : matchedBank.Guru?.nama_guru,
            ownBank: effectiveOwn,
            mgmpBank: effectiveMgmp,
          });
        } else {
          // Belum pernah dibuat sama sekali (Mandiri maupun MGMP)
          uncreatedDuties++;
          uncreatedTargets.push(
            `${mapelName}${jurusanKode !== 'UMUM' ? ` Jurusan ${jurusanKode}` : ''} (Tingkat ${romanTingkat})`
          );

          items.push({
            key: `${mapelId}_${tingkat}_${jurusanKode}`,
            mapelId,
            mapelName,
            mapelKode,
            tingkat,
            tingkatRoman: romanTingkat,
            targetJurusan: jurusanKode !== 'UMUM' ? jurusanKode : undefined,
            rombelNames: rombelArr.length > 0 ? rombelArr : [`Semua Rombel Tingkat ${romanTingkat}`],
            status: 'PENDING',
            soalCount: 0,
            bankSoal: undefined,
            ownBank: undefined,
            mgmpBank: undefined,
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
  }, [guruId, rawAssignedList, rawJadwalList, rawBankList, targetTingkat]);

  return {
    isLoading: isMapelLoading || isJadwalLoading || isBankLoading,
    activeEventName: eventName || activeEvent?.nama_event || undefined,
    hasActiveEvent: Boolean(activeEvent),
    ...evaluation,
  };
}
