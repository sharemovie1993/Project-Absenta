// @ts-nocheck
import { getTenantTimezone, getTenantDayRangeUTC } from '@/utils/timezone.utils';

export class DashboardCommonHelper {
  public async resolveDayRange(tenantId: string | null, tanggal?: string): Promise<{ startOfDay: Date; endOfDay: Date; dateStr: string; timeZone: string }> {
    const tz = await getTenantTimezone(tenantId);
    let dateStr = tanggal;
    if (!dateStr) {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      dateStr = formatter.format(new Date());
    }
    const { startUTC, endUTC } = getTenantDayRangeUTC(dateStr, tz);
    return { startOfDay: startUTC, endOfDay: endUTC, dateStr, timeZone: tz };
  }
}
