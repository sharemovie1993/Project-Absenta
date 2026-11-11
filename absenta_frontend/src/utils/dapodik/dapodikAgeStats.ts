/**
 * dapodikAgeStats.ts
 * Utilitas perhitungan sebaran usia peserta didik khusus dari sumber data Dapodik
 * (Staging Snapshot / Live Web Service Dapodik) untuk kebutuhan Verval LPPD.
 */

import type { ReconciledStudent } from '@/api/dapodik.api';

export type DapodikAgeBucketKey =
  | 'under15'
  | 'age15'
  | 'age16'
  | 'age17'
  | 'age18'
  | 'over18';

export interface DapodikAgeBucketStat {
  key: DapodikAgeBucketKey;
  label: string;
  shortLabel: string;
  total: number;
  male: number;
  female: number;
}

export interface DapodikAgeTingkatRow {
  tingkat: string;
  under15: number;
  age15: number;
  age16: number;
  age17: number;
  age18: number;
  over18: number;
  unknown: number;
  total: number;
}

export interface DapodikAgeDistributionResult {
  referenceDate: string;
  totalDapodikStudents: number;
  validBirthDateCount: number;
  missingBirthDateCount: number;
  totalMale: number;
  totalFemale: number;
  buckets: DapodikAgeBucketStat[];
  byTingkat: DapodikAgeTingkatRow[];
}

const AGE_BUCKET_META: Array<{ key: DapodikAgeBucketKey; label: string; shortLabel: string }> = [
  { key: 'under15', label: 'Dibawah 15 Tahun', shortLabel: '< 15 Th' },
  { key: 'age15', label: '15 Tahun', shortLabel: '15 Th' },
  { key: 'age16', label: '16 Tahun', shortLabel: '16 Th' },
  { key: 'age17', label: '17 Tahun', shortLabel: '17 Th' },
  { key: 'age18', label: '18 Tahun', shortLabel: '18 Th' },
  { key: 'over18', label: 'Diatas 18 Tahun', shortLabel: '> 18 Th' },
];

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYmdParts(raw?: string | null): { y: number; m: number; d: number } | null {
  if (!raw) return null;
  const cleaned = String(raw).trim().split('T')[0];
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(cleaned);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/**
 * Menghitung usia genap (completed years) berdasarkan tanggal lahir vs tanggal acuan.
 */
export function computeCompletedAgeYears(
  birthDateRaw?: string | null,
  referenceDateRaw: string = getTodayIsoDate()
): number | null {
  const birth = parseYmdParts(birthDateRaw);
  const ref = parseYmdParts(referenceDateRaw) || parseYmdParts(getTodayIsoDate());
  if (!birth || !ref) return null;

  let age = ref.y - birth.y;
  if (ref.m < birth.m || (ref.m === birth.m && ref.d < birth.d)) {
    age -= 1;
  }
  return age >= 0 && age < 120 ? age : null;
}

function classifyAgeBucket(age: number): DapodikAgeBucketKey {
  if (age < 15) return 'under15';
  if (age === 15) return 'age15';
  if (age === 16) return 'age16';
  if (age === 17) return 'age17';
  if (age === 18) return 'age18';
  return 'over18';
}

function normalizeTingkatLabel(raw: any): string {
  const rawTingkat = String(raw?.tingkat_pendidikan_id ?? '').trim();
  if (rawTingkat === '10') return 'Kelas X';
  if (rawTingkat === '11') return 'Kelas XI';
  if (rawTingkat === '12') return 'Kelas XII';
  if (rawTingkat === '13') return 'Kelas XIII';

  const rombel = String(raw?.nama_rombel || raw?.rombel || '').trim().toUpperCase();
  if (/^(XIII|13)\b/.test(rombel)) return 'Kelas XIII';
  if (/^(XII|12)\b/.test(rombel)) return 'Kelas XII';
  if (/^(XI|11)\b/.test(rombel)) return 'Kelas XI';
  if (/^(X|10)\b/.test(rombel)) return 'Kelas X';
  return 'Lainnya';
}

function resolveTingkatOrder(label: string): number {
  if (label === 'Kelas X') return 1;
  if (label === 'Kelas XI') return 2;
  if (label === 'Kelas XII') return 3;
  if (label === 'Kelas XIII') return 4;
  return 99;
}

/**
 * Menghitung sebaran usia siswa yang bersumber murni dari Dapodik (`dapodikRaw`).
 * Baris dengan status `ABSENTA_ONLY` tidak dihitung agar sesuai 100% dengan Web Service/Staging Dapodik.
 */
export function computeDapodikAgeDistribution(
  students: ReconciledStudent[],
  referenceDate: string = getTodayIsoDate()
): DapodikAgeDistributionResult {
  const bucketMap = new Map<DapodikAgeBucketKey, DapodikAgeBucketStat>();
  for (const meta of AGE_BUCKET_META) {
    bucketMap.set(meta.key, {
      key: meta.key,
      label: meta.label,
      shortLabel: meta.shortLabel,
      total: 0,
      male: 0,
      female: 0,
    });
  }

  const tingkatMap = new Map<string, DapodikAgeTingkatRow>();

  let totalDapodikStudents = 0;
  let validBirthDateCount = 0;
  let missingBirthDateCount = 0;
  let totalMale = 0;
  let totalFemale = 0;

  for (const student of students) {
    // Pastikan sumber murni dari Dapodik
    if (!student.dapodikRaw || student.status === 'ABSENTA_ONLY') {
      continue;
    }

    totalDapodikStudents += 1;

    const dRaw = student.dapodikRaw;
    const jkChar = String(dRaw?.jenis_kelamin || student.jenis_kelamin || '')
      .trim()
      .toUpperCase()
      .charAt(0);
    const isFemale = jkChar === 'P';
    if (isFemale) {
      totalFemale += 1;
    } else {
      totalMale += 1;
    }

    const tingkat = normalizeTingkatLabel(dRaw);
    let tingkatRow = tingkatMap.get(tingkat);
    if (!tingkatRow) {
      tingkatRow = {
        tingkat,
        under15: 0,
        age15: 0,
        age16: 0,
        age17: 0,
        age18: 0,
        over18: 0,
        unknown: 0,
        total: 0,
      };
      tingkatMap.set(tingkat, tingkatRow);
    }
    tingkatRow.total += 1;

    const birthStr = dRaw?.tanggal_lahir || student.tanggal_lahir;
    const age = computeCompletedAgeYears(birthStr, referenceDate);

    if (age === null) {
      missingBirthDateCount += 1;
      tingkatRow.unknown += 1;
      continue;
    }

    validBirthDateCount += 1;
    const bucketKey = classifyAgeBucket(age);
    const bucket = bucketMap.get(bucketKey)!;
    bucket.total += 1;
    if (isFemale) {
      bucket.female += 1;
    } else {
      bucket.male += 1;
    }
    tingkatRow[bucketKey] += 1;
  }

  const byTingkat = Array.from(tingkatMap.values()).sort(
    (a, b) => resolveTingkatOrder(a.tingkat) - resolveTingkatOrder(b.tingkat)
  );

  return {
    referenceDate,
    totalDapodikStudents,
    validBirthDateCount,
    missingBirthDateCount,
    totalMale,
    totalFemale,
    buckets: AGE_BUCKET_META.map((m) => bucketMap.get(m.key)!),
    byTingkat,
  };
}
