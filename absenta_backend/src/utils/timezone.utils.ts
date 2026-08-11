import { prisma } from './prisma';

export const TZ_OFFSET: Record<string, number> = {
  'Asia/Jakarta': 7,
  'Asia/Makassar': 8,
  'Asia/Jayapura': 9,
};

export const TZ_OFFSET_STR: Record<string, string> = {
  'Asia/Jakarta': '+07:00',
  'Asia/Makassar': '+08:00',
  'Asia/Jayapura': '+09:00',
};

export function getTenantOffsetString(timezone?: string | null): string {
  const tz = String(timezone || 'Asia/Jakarta').trim();
  return TZ_OFFSET_STR[tz] || '+07:00';
}

export const TZ_LABEL: Record<string, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

/**
 * Resolves configured tenant timezone from SystemConfig (Default: 'Asia/Jakarta')
 */
export async function getTenantTimezone(tenantId?: string | null): Promise<string> {
  if (!tenantId) return 'Asia/Jakarta';

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

  return 'Asia/Jakarta';
}

/**
 * Returns time zone label suffix (e.g. 'WIB', 'WITA', 'WIT')
 */
export function getTimezoneLabel(timezone?: string | null): string {
  const tz = String(timezone || 'Asia/Jakarta').trim();
  return TZ_LABEL[tz] || 'WIB';
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

  const tz = String(timezone || 'Asia/Jakarta').trim();
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
 * Example: '2026-07-31' in Asia/Makassar (UTC+8) ->
 * startUTC: 2026-07-30T16:00:00.000Z, endUTC: 2026-07-31T15:59:59.999Z
 */
export function getTenantDayRangeUTC(dateStr: string, timezone?: string | null): { startUTC: Date; endUTC: Date } {
  const tz = String(timezone || 'Asia/Jakarta').trim();
  const offsetHours = TZ_OFFSET[tz] ?? 7;
  const offsetSign = offsetHours >= 0 ? '+' : '-';
  const offsetStr = `${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;

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
