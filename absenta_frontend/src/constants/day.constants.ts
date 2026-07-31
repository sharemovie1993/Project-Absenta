export type HariKey = 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU' | 'MINGGU';

export interface DayOption {
  id: HariKey;
  value: HariKey;
  label: string;
  shortLabel: string;
  short: string;
  isWeekend: boolean;
}

export const HARI_LIST: DayOption[] = [
  { id: 'SENIN', value: 'SENIN', label: 'Senin', shortLabel: 'Sen', short: 'Sen', isWeekend: false },
  { id: 'SELASA', value: 'SELASA', label: 'Selasa', shortLabel: 'Sel', short: 'Sel', isWeekend: false },
  { id: 'RABU', value: 'RABU', label: 'Rabu', shortLabel: 'Rab', short: 'Rab', isWeekend: false },
  { id: 'KAMIS', value: 'KAMIS', label: 'Kamis', shortLabel: 'Kam', short: 'Kam', isWeekend: false },
  { id: 'JUMAT', value: 'JUMAT', label: 'Jumat', shortLabel: 'Jum', short: 'Jum', isWeekend: false },
  { id: 'SABTU', value: 'SABTU', label: 'Sabtu', shortLabel: 'Sab', short: 'Sab', isWeekend: true },
  { id: 'MINGGU', value: 'MINGGU', label: 'Minggu', shortLabel: 'Min', short: 'Min', isWeekend: true },
];

export const ALL_HARI_KEYS: HariKey[] = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
export const WORKDAYS_HARI_KEYS: HariKey[] = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

export const getDayOption = (key?: string): DayOption | undefined => {
  if (!key) return undefined;
  const upper = key.trim().toUpperCase() as HariKey;
  return HARI_LIST.find((d) => d.id === upper);
};

export const getDayLabel = (key?: string, fallback = ''): string => {
  const opt = getDayOption(key);
  return opt ? opt.label : fallback || key || '';
};

export const getDayShortLabel = (key?: string, fallback = ''): string => {
  const opt = getDayOption(key);
  return opt ? opt.shortLabel : fallback || key || '';
};
