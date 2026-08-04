/**
 * Helper modul kalkulasi cerdas alokasi JP (Struktur Kurikulum Target vs Actual Placed JP)
 * Digunakan untuk evaluasi status pemetaan jam pelajaran per kelas & per guru.
 */

export interface SmartJpStatus {
  actual: number;
  target: number;
  status: 'PAS' | 'SISA' | 'OVER' | 'KOSONG';
  statusDotClass: string;
  rightBadge: string;
  rightBadgeClass: string;
}

export function calculateSmartJpStatus(params: {
  mapelId: string;
  selectedGuruId?: string;
  selectedKelasId?: string;
  allJadwal: any[];
  targetJpMap?: Map<string, number>;
  defaultTarget?: number;
}): SmartJpStatus {
  const { mapelId, selectedGuruId, selectedKelasId, allJadwal, targetJpMap, defaultTarget = 2 } = params;

  const actualInClass = selectedKelasId 
    ? allJadwal.filter(j => j.kelas_id === selectedKelasId && (selectedGuruId ? j.guru_id === selectedGuruId : true) && j.mapel_id === mapelId).length
    : 0;

  const actualTotal = allJadwal.filter(j => 
    (selectedGuruId ? j.guru_id === selectedGuruId : true) && 
    j.mapel_id === mapelId
  ).length;

  const actual = selectedKelasId ? actualInClass : actualTotal;
  const target = (targetJpMap && targetJpMap.get(mapelId)) || defaultTarget;

  if (actual > target) {
    return {
      actual,
      target,
      status: 'OVER',
      statusDotClass: 'bg-rose-500 shadow-sm shadow-rose-500/50',
      rightBadge: `⚠️ ${actual}/${target} JP (Over +${actual - target})`,
      rightBadgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-extrabold',
    };
  }

  if (actual === target && target > 0) {
    return {
      actual,
      target,
      status: 'PAS',
      statusDotClass: 'bg-emerald-500 shadow-sm shadow-emerald-500/50',
      rightBadge: `✓ ${actual}/${target} JP (Pas)`,
      rightBadgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-extrabold',
    };
  }

  if (actual > 0) {
    return {
      actual,
      target,
      status: 'SISA',
      statusDotClass: 'bg-amber-500 shadow-sm shadow-amber-500/50',
      rightBadge: `${actual}/${target} JP (Sisa ${target - actual} JP)`,
      rightBadgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-extrabold',
    };
  }

  return {
    actual,
    target,
    status: 'KOSONG',
    statusDotClass: 'bg-slate-300 dark:bg-slate-600',
    rightBadge: `0/${target} JP (Belum)`,
    rightBadgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
  };
}

export function calculateClassJpStatus(params: {
  kelasId: string;
  allJadwal: any[];
  targetClassJpMap?: Map<string, number>;
  defaultTarget?: number;
}): SmartJpStatus {
  const { kelasId, allJadwal, targetClassJpMap, defaultTarget = 40 } = params;

  const actual = allJadwal.filter(j => j.kelas_id === kelasId).length;
  const target = (targetClassJpMap && targetClassJpMap.get(kelasId)) || defaultTarget;

  if (actual > target) {
    return {
      actual,
      target,
      status: 'OVER',
      statusDotClass: 'bg-rose-500 shadow-sm shadow-rose-500/50',
      rightBadge: `⚠️ ${actual}/${target} JP (Over +${actual - target})`,
      rightBadgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-extrabold',
    };
  }

  if (actual === target && target > 0) {
    return {
      actual,
      target,
      status: 'PAS',
      statusDotClass: 'bg-emerald-500 shadow-sm shadow-emerald-500/50',
      rightBadge: `✓ ${actual}/${target} JP (Pas)`,
      rightBadgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-extrabold',
    };
  }

  if (actual > 0) {
    return {
      actual,
      target,
      status: 'SISA',
      statusDotClass: 'bg-amber-500 shadow-sm shadow-amber-500/50',
      rightBadge: `${actual}/${target} JP (Sisa ${target - actual} JP)`,
      rightBadgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-extrabold',
    };
  }

  return {
    actual,
    target,
    status: 'KOSONG',
    statusDotClass: 'bg-slate-300 dark:bg-slate-600',
    rightBadge: `0/${target} JP (Belum)`,
    rightBadgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
  };
}
