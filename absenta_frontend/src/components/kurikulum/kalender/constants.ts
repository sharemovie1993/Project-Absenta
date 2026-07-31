export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

import { HARI_LIST, ALL_HARI_KEYS } from '../../../constants/day.constants';

export const DAY_NAMES = HARI_LIST.map(d => d.shortLabel);
export const INDONESIAN_DAY_NAMES = ['MINGGU', ...ALL_HARI_KEYS.slice(0, 6)];

export interface JenisOption {
  value: string;
  label: string;
  textColorClass: string;
  bgColorClass: string;
  borderColorClass: string;
  dotColorClass: string;
}

export const JENIS_OPTIONS: JenisOption[] = [
  { 
    value: 'LIBUR_NASIONAL', 
    label: 'Libur Nasional', 
    textColorClass: 'text-red-650 dark:text-red-400', 
    bgColorClass: 'bg-red-500/10 dark:bg-red-500/20 border-red-500/20', 
    borderColorClass: 'border-l-red-500',
    dotColorClass: 'bg-red-500'
  },
  { 
    value: 'LIBUR_SEKOLAH', 
    label: 'Libur Sekolah', 
    textColorClass: 'text-amber-600 dark:text-amber-400', 
    bgColorClass: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20', 
    borderColorClass: 'border-l-amber-500',
    dotColorClass: 'bg-amber-500'
  },
  { 
    value: 'PTS', 
    label: 'Sumatif Tengah Semester (STS)', 
    textColorClass: 'text-blue-600 dark:text-blue-400', 
    bgColorClass: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20', 
    borderColorClass: 'border-l-blue-500',
    dotColorClass: 'bg-blue-500'
  },
  { 
    value: 'PAS', 
    label: 'Sumatif Akhir Semester (SAS)', 
    textColorClass: 'text-indigo-600 dark:text-indigo-400', 
    bgColorClass: 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/20', 
    borderColorClass: 'border-l-indigo-500',
    dotColorClass: 'bg-indigo-500'
  },
  { 
    value: 'KEGIATAN', 
    label: 'Kegiatan Sekolah', 
    textColorClass: 'text-emerald-600 dark:text-emerald-400', 
    bgColorClass: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20', 
    borderColorClass: 'border-l-emerald-500',
    dotColorClass: 'bg-emerald-500'
  },
  { 
    value: 'MINGGU_EFEKTIF', 
    label: 'Minggu Efektif', 
    textColorClass: 'text-slate-600 dark:text-slate-400', 
    bgColorClass: 'bg-slate-500/10 dark:bg-slate-500/20 border-slate-500/20', 
    borderColorClass: 'border-l-slate-400',
    dotColorClass: 'bg-slate-400'
  },
  { 
    value: 'LAINNYA', 
    label: 'Lainnya', 
    textColorClass: 'text-slate-500 dark:text-slate-400', 
    bgColorClass: 'bg-slate-400/10 dark:bg-slate-400/20 border-slate-400/20', 
    borderColorClass: 'border-l-slate-400',
    dotColorClass: 'bg-slate-400'
  },
];

export const getJenisOption = (jenis: string): JenisOption => {
  return JENIS_OPTIONS.find(j => j.value === jenis) ?? JENIS_OPTIONS[JENIS_OPTIONS.length - 1];
};
