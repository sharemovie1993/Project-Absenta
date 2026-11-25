import type { CbtBankSoal } from '@/types/cbt.types';
import type { GuruMapel } from '@/types/academic';
import { formatTingkatRomawi } from './cbtAsesmenHelper';

export type DutyCoverStatus =
  | 'COVERED_OWN'
  | 'COVERED_MGMP'
  | 'DRAFT_OWN'
  | 'DRAFT_MGMP'
  | 'PENDING';

export interface TeacherDutyItem {
  key: string;
  mapelId: string;
  mapelName: string;
  mapelKode?: string;
  tingkat: number;
  tingkatRoman: string;
  targetJurusan?: string;
  targetJurusanId?: string;
  teachingJurusans?: string[];
  teachingJurusanIds?: string[];
  rombelNames: string[];
  status: DutyCoverStatus;
  soalCount: number;
  bankSoal?: CbtBankSoal;
  masterAuthorName?: string;
  ownBank?: CbtBankSoal;
  mgmpBank?: CbtBankSoal;
}

export interface ParallelColleagueItem {
  id: string;
  name: string;
  tingkatNum: number;
  kelasNames: string[];
  matchedJurusanKelas: string[];
}

const NON_ACADEMIC_KEYWORDS = [
  'piket',
  'tugas piket',
  'bimbingan',
  'konseling',
  'bp/bk',
  'bk',
  'upacara',
  'apel',
  'literasi',
  'istirahat',
  'sholat',
  'duha',
  'dzuhur',
  'ekskul',
  'ekstrakurikuler',
  'kokurikuler',
  'wali kelas',
  'p5',
  'projek penguatan',
  'keagamaan',
  'senam',
];

export function isNonAcademicMapel(name?: string): boolean {
  const lower = (name || '').toLowerCase().trim();
  if (!lower) return false;
  return NON_ACADEMIC_KEYWORDS.some((kw) => lower.includes(kw));
}

const ROMAN_TO_TINGKAT: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
  XIII: 13,
};

/**
 * Konversi nilai tingkat multi-jenjang (SD/MI 1-6, SMP/MTs 7-9, SMA/MA 10-12, SMK/MAK 10-13).
 * NOL fallback parsing nama kelas atau judul.
 */
export function parseStrictTingkatValue(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const num = Number(raw);
  if (Number.isInteger(num) && num >= 1 && num <= 13) return num;
  if (typeof raw === 'string') {
    const up = raw.toUpperCase().trim();
    if (ROMAN_TO_TINGKAT[up]) return ROMAN_TO_TINGKAT[up];
  }
  return null;
}

/**
 * Resolusi tingkat mutlak dari relasi DB (Kelas.tingkat atau Mapel.tingkat).
 * Mendukung seluruh jenjang (SD/MI, SMP/MTs, SMA/MA, SMK/MAK). NOL fallback parsing nama kelas.
 */
export function resolveStrictTingkat(gm: GuruMapel | any): number | null {
  return parseStrictTingkatValue(gm?.Kelas?.tingkat ?? gm?.Mapel?.tingkat);
}

/**
 * Resolusi tingkat mutlak pada Bank Soal dari kolom `tingkat` DB.
 * Mendukung seluruh jenjang (SD/MI, SMP/MTs, SMA/MA, SMK/MAK). NOL fallback parsing judul bank soal.
 */
export function resolveStrictBankTingkat(bank: CbtBankSoal | any): number | null {
  return parseStrictTingkatValue(bank?.tingkat);
}

/**
 * Resolusi jurusan mutlak dari relasi resmi Kelas.Jurusan / GM.Jurusan.
 * NOL fallback parsing nama kelas.
 */
export function resolveStrictJurusan(gm: GuruMapel | any): {
  jurusanId?: string;
  jurusanKode: string;
} {
  const jur = gm?.Kelas?.Jurusan || gm?.Jurusan;
  const jurusanId: string | undefined =
    gm?.Kelas?.jurusan_id || jur?.id || gm?.jurusan_id || undefined;
  const rawCode = jur?.kode || jur?.singkatan || jur?.kode_jurusan || jur?.nama || '';
  const clean = String(rawCode).toUpperCase().trim();
  const jurusanKode = !clean || clean === 'SEMUA' || clean === 'UMUM' ? 'UMUM' : clean;
  return { jurusanId, jurusanKode };
}

export function isGeneralBankJurusan(jurusan?: string | null): boolean {
  const clean = (jurusan || '').toUpperCase().trim();
  return !clean || clean === 'SEMUA' || clean === 'UMUM';
}

export function parseBankJurusanTokens(jurusan?: string | null): string[] {
  if (!jurusan) return [];
  return jurusan
    .toUpperCase()
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter((s) => Boolean(s) && s !== 'SEMUA' && s !== 'UMUM');
}

/**
 * Pencocokan mutlak Bank Soal terhadap (mapelId, tingkat) tanpa fallback nama.
 */
export function isStrictBankForMapelTingkat(
  bank: CbtBankSoal,
  mapelId: string,
  tingkat: number
): boolean {
  if (!bank.mapel_id || bank.mapel_id !== mapelId) return false;
  const bTingkat = resolveStrictBankTingkat(bank);
  return bTingkat === tingkat;
}

/**
 * Evaluasi mutlak apakah seorang guru ter-cover oleh bank soal rekan (MGMP / Kontributor).
 * NOL fallback alias atau parsing nama kelas.
 */
export function isStrictMgmpBankCoveringAssignment(params: {
  bank: CbtBankSoal;
  guruId: string;
  jurusanId?: string;
  jurusanKode?: string;
  mgmpSharedIds?: string[];
  allowSharedByJurusan?: boolean;
}): boolean {
  const { bank, guruId, jurusanId, jurusanKode, mgmpSharedIds, allowSharedByJurusan = false } = params;
  if (bank.guru_id === guruId) return false;

  const isExplicitContributor =
    Boolean(bank.Kontributor && bank.Kontributor.some((c) => c.guru_id === guruId && c.can_edit_soal !== false)) ||
    Boolean(mgmpSharedIds && mgmpSharedIds.includes(guruId));
  if (isExplicitContributor) return true;

  const isSharedOrPublished = Boolean(bank.is_shared || bank.status === 'PUBLISHED');
  if (!isSharedOrPublished) return false;

  if (isGeneralBankJurusan(bank.jurusan)) {
    return !bank.Kontributor || bank.Kontributor.length === 0 || allowSharedByJurusan;
  }

  if (!allowSharedByJurusan) return false;

  const tokens = parseBankJurusanTokens(bank.jurusan);
  if (jurusanId && tokens.includes(jurusanId.toUpperCase())) return true;
  if (jurusanKode && jurusanKode !== 'UMUM' && tokens.includes(jurusanKode.toUpperCase())) return true;
  return false;
}

/**
 * SSOT: Evaluasi daftar kewajiban (Duty) guru dari SK Penugasan GuruMapel.
 */
export function evaluateTeacherDutiesSSOT(params: {
  guruId?: string;
  guruMapelList: GuruMapel[];
  bankList: CbtBankSoal[];
  targetTingkat?: number[];
}) {
  const { guruId, guruMapelList, bankList, targetTingkat } = params;

  if (!guruId || guruMapelList.length === 0) {
    return {
      totalDuties: 0,
      coveredDuties: 0,
      draftDuties: 0,
      uncreatedDuties: 0,
      pendingDuties: 0,
      completionPercentage: 100,
      isFullyExempt: false,
      hasNoDuties: true,
      items: [] as TeacherDutyItem[],
      pendingJurusanSummary: undefined as string | undefined,
    };
  }

  interface JurusanGroup {
    jurusanKey: string;
    jurusanId?: string;
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

  guruMapelList.forEach((gm) => {
    const mId = gm.mapel_id;
    if (!mId) return;

    const mapelName = gm.Mapel?.nama_mapel || 'Mata Pelajaran';
    if (isNonAcademicMapel(mapelName)) return;

    const tNum = resolveStrictTingkat(gm);
    if (!tNum) return;
    if (targetTingkat && targetTingkat.length > 0 && !targetTingkat.includes(tNum)) return;

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
    const { jurusanId, jurusanKode } = resolveStrictJurusan(gm);
    const jKey = jurusanId || jurusanKode;
    const kName = gm.Kelas?.nama_kelas || `Semua Rombel Tingkat ${formatTingkatRomawi(tNum)}`;

    if (!mtEntry.jurusanMap.has(jKey)) {
      mtEntry.jurusanMap.set(jKey, {
        jurusanKey: jKey,
        jurusanId,
        jurusanKode,
        rombelNames: new Set<string>(),
      });
    }
    mtEntry.jurusanMap.get(jKey)!.rombelNames.add(kName);
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
      items: [] as TeacherDutyItem[],
      pendingJurusanSummary: undefined as string | undefined,
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

    const candidateBanks = bankList.filter((b) => isStrictBankForMapelTingkat(b, mapelId, tingkat));
    const ownBanks = candidateBanks.filter((b) => b.guru_id === guruId);
    const mgmpBanks = candidateBanks.filter((b) =>
      isStrictMgmpBankCoveringAssignment({ bank: b, guruId, allowSharedByJurusan: false })
    );

    const ownGeneral = ownBanks.find((b) => isGeneralBankJurusan(b.jurusan));
    const mgmpGeneral = mgmpBanks.find((b) => isGeneralBankJurusan(b.jurusan));
    const hasSpecificBanks = candidateBanks.some((b) => !isGeneralBankJurusan(b.jurusan));
    const jurusanList = Array.from(jurusanMap.values());

    if ((ownGeneral || mgmpGeneral) && !hasSpecificBanks) {
      totalDuties++;
      const effectiveBank = ownGeneral || mgmpGeneral;
      const count = effectiveBank?.jumlah_soal || effectiveBank?._count?.Soal || 0;
      const allRombels = Array.from(new Set(jurusanList.flatMap((j) => Array.from(j.rombelNames))));

      let status: DutyCoverStatus;
      if (count > 0) {
        status = ownGeneral ? 'COVERED_OWN' : 'COVERED_MGMP';
        coveredDuties++;
      } else {
        status = ownGeneral ? 'DRAFT_OWN' : 'DRAFT_MGMP';
        draftDuties++;
        draftTargets.push(`${mapelName} (Tingkat ${romanTingkat})`);
      }

      const allTeachingJurusans = Array.from(
        new Set(jurusanList.map((j) => j.jurusanKode).filter((c) => c && c !== 'UMUM'))
      );
      const allTeachingJurusanIds = Array.from(
        new Set(jurusanList.map((j) => j.jurusanId).filter((id): id is string => Boolean(id)))
      );

      items.push({
        key: `${mapelId}_${tingkat}_ALL`,
        mapelId,
        mapelName,
        mapelKode,
        tingkat,
        tingkatRoman: romanTingkat,
        targetJurusan: undefined,
        targetJurusanId: undefined,
        teachingJurusans: allTeachingJurusans,
        teachingJurusanIds: allTeachingJurusanIds,
        rombelNames: allRombels,
        status,
        soalCount: count,
        bankSoal: effectiveBank,
        masterAuthorName: ownGeneral ? undefined : mgmpGeneral?.Guru?.nama_guru,
        ownBank: ownGeneral,
        mgmpBank: mgmpGeneral,
      });
      return;
    }

    jurusanList.forEach((jg) => {
      const { jurusanKey, jurusanId, jurusanKode, rombelNames } = jg;
      totalDuties++;
      const rombelArr = Array.from(rombelNames);
      const jCode = jurusanKode !== 'UMUM' ? jurusanKode : undefined;

      const matchBankSpecific = (b: CbtBankSoal) => {
        const tokens = parseBankJurusanTokens(b.jurusan);
        if (jurusanId && tokens.includes(jurusanId.toUpperCase())) return true;
        return Boolean(jCode && tokens.includes(jCode));
      };

      const ownSpecific = ownBanks.find(matchBankSpecific);
      const mgmpSpecific = mgmpBanks.find(matchBankSpecific);
      const matchedBank = ownSpecific || ownGeneral || mgmpSpecific || mgmpGeneral;

      const targetLabel =
        jCode && !mapelName.toUpperCase().includes(jCode)
          ? `${mapelName} Jurusan ${jCode} (Tingkat ${romanTingkat})`
          : `${mapelName} (Tingkat ${romanTingkat})`;

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
          draftTargets.push(targetLabel);
        }

        items.push({
          key: `${mapelId}_${tingkat}_${jurusanKey}`,
          mapelId,
          mapelName,
          mapelKode,
          tingkat,
          tingkatRoman: romanTingkat,
          targetJurusan: jCode,
          targetJurusanId: jurusanId,
          teachingJurusans: jCode ? [jCode] : [],
          teachingJurusanIds: jurusanId ? [jurusanId] : [],
          rombelNames: rombelArr,
          status,
          soalCount: count,
          bankSoal: matchedBank,
          masterAuthorName: isOwn ? undefined : matchedBank.Guru?.nama_guru,
          ownBank: ownSpecific || ownGeneral,
          mgmpBank: mgmpSpecific || mgmpGeneral,
        });
      } else {
        uncreatedDuties++;
        uncreatedTargets.push(targetLabel);
        items.push({
          key: `${mapelId}_${tingkat}_${jurusanKey}`,
          mapelId,
          mapelName,
          mapelKode,
          tingkat,
          tingkatRoman: romanTingkat,
          targetJurusan: jCode,
          targetJurusanId: jurusanId,
          teachingJurusans: jCode ? [jCode] : [],
          teachingJurusanIds: jurusanId ? [jurusanId] : [],
          rombelNames: rombelArr,
          status: 'PENDING',
          soalCount: 0,
        });
      }
    });
  });

  const pendingDuties = draftDuties + uncreatedDuties;
  const completionPercentage = totalDuties > 0 ? Math.round((coveredDuties / totalDuties) * 100) : 100;
  const allPendingSummary = [...uncreatedTargets, ...draftTargets];

  return {
    totalDuties,
    coveredDuties,
    draftDuties,
    uncreatedDuties,
    pendingDuties,
    completionPercentage,
    isFullyExempt: false,
    hasNoDuties: false,
    items,
    pendingJurusanSummary: allPendingSummary.length > 0 ? allPendingSummary.join(', ') : undefined,
  };
}

/**
 * SSOT: Daftar rekan guru paralel untuk Guru Picker MGMP (3 Tier Mutlak tanpa fallback).
 */
export function findParallelColleaguesSSOT(params: {
  mapelId: string;
  tingkatNum: number | null;
  targetJurusanTokens: string[];
  currentGuruId: string;
  guruMapelList: GuruMapel[];
}): ParallelColleagueItem[] {
  const { mapelId, tingkatNum, targetJurusanTokens, currentGuruId, guruMapelList } = params;
  const map = new Map<string, ParallelColleagueItem>();

  const hasSpecificJurusan =
    targetJurusanTokens.length > 0 &&
    !targetJurusanTokens.includes('SEMUA') &&
    !targetJurusanTokens.includes('UMUM');

  guruMapelList.forEach((gm) => {
    if (gm.mapel_id !== mapelId) return;
    const gId = gm.guru_id;
    const gName = gm.Guru?.nama_guru;
    if (!gId || gId === currentGuruId || !gName) return;

    const gmTingkat = resolveStrictTingkat(gm);
    if (!gmTingkat) return;
    if (tingkatNum && gmTingkat !== tingkatNum) return;

    const { jurusanId, jurusanKode } = resolveStrictJurusan(gm);
    const isMatchJurusan = !hasSpecificJurusan
      ? true
      : targetJurusanTokens.some(
          (tok) =>
            (jurusanId && tok === jurusanId.toUpperCase()) ||
            (jurusanKode !== 'UMUM' && tok === jurusanKode)
        );

    if (hasSpecificJurusan && !isMatchJurusan) return;

    if (!map.has(gId)) {
      map.set(gId, {
        id: gId,
        name: gName,
        tingkatNum: gmTingkat,
        kelasNames: [],
        matchedJurusanKelas: [],
      });
    }

    const entry = map.get(gId)!;
    const kName = gm.Kelas?.nama_kelas || '';
    if (kName && !entry.kelasNames.includes(kName)) {
      entry.kelasNames.push(kName);
      if (isMatchJurusan) {
        entry.matchedJurusanKelas.push(kName);
      }
    }
  });

  return Array.from(map.values());
}
