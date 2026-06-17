export const getTimezone = (): string => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('active_timezone') || 'Asia/Jakarta';
    }
  } catch {
    // Ignore error in non-browser env
    return 'Asia/Jakarta';
  }
  return 'Asia/Jakarta';
};

export const formatLocalDateTime = (d: Date): string => {
  const tz = getTimezone();
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d);
    
    const map: Record<string, string> = {};
    parts.forEach(p => map[p.type] = p.value);
    
    // Ensure 2 digits for consistency (though en-CA usually does it)
    const pad = (v?: string) => (v || '00').padStart(2, '0');
    return `${map.year}-${pad(map.month)}-${pad(map.day)}T${pad(map.hour)}:${pad(map.minute)}`;
  } catch {
    // Fallback if timezone invalid or Intl error
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
};

export const formatLocalTimeFromISO = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(String(iso));
  if (isNaN(d.getTime())) return '';
  const tz = getTimezone();
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const map: Record<string, string> = {};
    parts.forEach(p => map[p.type] = p.value);
    const pad = (v?: string) => (v || '00').padStart(2, '0');
    return `${pad(map.hour)}:${pad(map.minute)}`;
  } catch {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
};

export const roundTo5 = (d: Date): Date => {
  const nd = new Date(d.getTime());
  const minute = nd.getMinutes();
  const add = (5 - (minute % 5)) % 5;
  nd.setMinutes(minute + add, 0, 0);
  return nd;
};

export const getVirtualDate = (): Date => {
  try {
    if (typeof localStorage !== 'undefined') {
      const debugDate = localStorage.getItem('DEBUG_VIRTUAL_DATE');
      if (debugDate) {
        const d = new Date(debugDate);
        if (!isNaN(d.getTime())) return d;
      }
    }
  } catch {
    // Ignore error
  }
  return new Date();
};

export const toLocalDate = (d?: Date): string => {
  const target = d || getVirtualDate();
  const tz = getTimezone();
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(target);
  } catch {
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
};

export const toLocalMonth = (d?: Date): string => {
  return toLocalDate(d).slice(0, 7);
};

export const isSameLocalDay = (a: Date, b: Date): boolean => {
  return toLocalDate(a) === toLocalDate(b);
};

export const toLocalDayNameUpper = (d?: Date): 'MINGGU' | 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU' => {
  const target = d || getVirtualDate();
  const tz = getTimezone();
  try {
    const name = new Intl.DateTimeFormat('id-ID', { timeZone: tz, weekday: 'long' }).format(target);
    const upper = name.toUpperCase();
    if (upper.includes('MINGGU')) return 'MINGGU';
    if (upper.includes('SENIN')) return 'SENIN';
    if (upper.includes('SELASA')) return 'SELASA';
    if (upper.includes('RABU')) return 'RABU';
    if (upper.includes('KAMIS')) return 'KAMIS';
    if (upper.includes('JUMAT') || upper.includes('JUM\'AT')) return 'JUMAT';
    return 'SABTU';
  } catch {
    const idx = (d || new Date()).getDay();
    const days: any = ['MINGGU','SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU'];
    return days[idx] as any;
  }
};
