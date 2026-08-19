import { prisma } from './prisma';
import { PLATFORM_TIMEZONE } from '../infra/jobEngine';

export const TZ_LABEL: Record<string, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
  'Asia/Singapore': 'SGT',
  UTC: 'UTC',
};

/**
 * Mendapatkan offset jam numerik secara dinamis untuk zona waktu IANA apapun
 */
export function getDynamicOffsetHours(timezone?: string | null): number {
  const tz = String(timezone || PLATFORM_TIMEZONE).trim();
  try {
    const probeDate = new Date();
    const offsetFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const tzPart = offsetFmt.formatToParts(probeDate).find((p) => p.type === 'timeZoneName')?.value || 'GMT+7';
    const match = tzPart.match(/GMT([+-]\d+)(?::(\d+))?/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) / 60 : 0;
      return h >= 0 ? h + m : h - m;
    }
  } catch {
    // Fallback jika timezone parsing gagal
  }
  return 7;
}

/**
 * Dynamic Dictionary: Mengembalikan offset jam untuk timezone IANA apapun
 */
export const TZ_OFFSET: Record<string, number> = new Proxy(
  {
    'Asia/Jakarta': 7,
    'Asia/Makassar': 8,
    'Asia/Jayapura': 9,
    'Asia/Singapore': 8,
    UTC: 0,
  },
  {
    get(target, prop: string) {
      if (typeof prop === 'string') {
        if (prop in target) return (target as any)[prop];
        return getDynamicOffsetHours(prop);
      }
      return 7;
    },
  }
);

export function getTenantOffsetString(timezone?: string | null): string {
  const offsetHours = getDynamicOffsetHours(timezone);
  const sign = offsetHours >= 0 ? '+' : '-';
  const absH = Math.floor(Math.abs(offsetHours));
  const absM = Math.round((Math.abs(offsetHours) - absH) * 60);
  return `${sign}${String(absH).padStart(2, '0')}:${String(absM).padStart(2, '0')}`;
}

/**
 * Resolves configured tenant timezone from SystemConfig (Fallback: PLATFORM_TIMEZONE dari .env)
 */
export async function getTenantTimezone(tenantId?: string | null): Promise<string> {
  if (!tenantId) return PLATFORM_TIMEZONE;

  try {
    const tzConfig = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'TIMEZONE' },
      select: { value: true },
    });
    if (tzConfig?.value && typeof tzConfig.value === 'string' && tzConfig.value.trim()) {
      return tzConfig.value.trim();
    }
  } catch (e) {
    console.error(`[TIMEZONE_UTILS] Error resolving timezone for tenant ${tenantId}:`, e);
  }

  return PLATFORM_TIMEZONE;
}

/**
 * Returns time zone label suffix (e.g. 'WIB', 'WITA', 'WIT', 'SGT')
 */
export function getTimezoneLabel(timezone?: string | null): string {
  const tz = String(timezone || PLATFORM_TIMEZONE).trim();
  return TZ_LABEL[tz] || tz.split('/').pop() || 'WIB';
}

/**
 * Formats a Date into HH:mm (or HH:mm Suffix) in tenant local timezone
 */
export function formatTenantTime(
  dt?: Date | string | null,
  timezone?: string | null,
  includeSuffix = true
): string {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '';

  const tz = String(timezone || PLATFORM_TIMEZONE).trim();
  try {
    const timeStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d).replace('.', ':');

    if (includeSuffix) {
      const suffix = getTimezoneLabel(tz);
      return `${timeStr} ${suffix}`;
    }
    return timeStr;
  } catch {
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return includeSuffix ? `${timeStr} ${getTimezoneLabel(tz)}` : timeStr;
  }
}

/**
 * Converts local YYYY-MM-DD date string in tenant timezone into exact UTC Date range for database queries.
 */
export function getTenantDayRangeUTC(dateStr: string, timezone?: string | null): { startUTC: Date; endUTC: Date } {
  const offsetStr = getTenantOffsetString(timezone);

  const startIso = `${dateStr}T00:00:00.000${offsetStr}`;
  const endIso = `${dateStr}T23:59:59.999${offsetStr}`;

  return {
    startUTC: new Date(startIso),
    endUTC: new Date(endIso),
  };
}

/**
 * Convenience helper returning { startOfDay, endOfDay } in UTC for database queries.
 */
export function getTenantDayRange(dateStr: string, timezone?: string | null): { startOfDay: Date; endOfDay: Date } {
  const { startUTC, endUTC } = getTenantDayRangeUTC(dateStr, timezone);
  return { startOfDay: startUTC, endOfDay: endUTC };
}
