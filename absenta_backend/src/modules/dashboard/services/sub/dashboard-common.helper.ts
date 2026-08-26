// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { AbsensiMode } from '@/constants/enums';
import { formatTenantTime, getTenantTimezone, getTenantOffsetString, getTenantDayRange } from '@/utils/timezone.utils';
import { sesiLifecycleService, SesiLifecycleService } from '@/modules/attendance/sesi-absensi/services/sesi-lifecycle.service';
import { DashboardCommonHelper } from './dashboard-common.helper';

export class DashboardCommonHelper {
  private async resolveDayRange(tenantId: string | null, tanggal?: string): Promise<{ startOfDay: Date; endOfDay: Date; dateStr: string; timeZone: string }> {
    const tz = await getTenantTimezone(tenantId);
    let dateStr = tanggal;
    if (!dateStr) {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
      dateStr = formatter.format(new Date());
    }
    const { startUTC, endUTC } = getTenantDayRangeUTC(dateStr, tz);
    return { startOfDay: startUTC, endOfDay: endUTC, dateStr, timeZone: tz };
  }

  /**
   * 1️⃣ Dashboard Overview - Ringkasan global per tenant untuk hari ini
   */
}
