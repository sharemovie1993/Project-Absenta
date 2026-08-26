// @ts-nocheck
import { DashboardCommonHelper } from './sub/dashboard-common.helper';
import { DashboardExecutiveService } from './sub/dashboard-executive.service';
import { DashboardAttendanceStatsService } from './sub/dashboard-attendance-stats.service';
import { DashboardRoleStatsService } from './sub/dashboard-role-stats.service';

export class DashboardService {
  private helper = new DashboardCommonHelper();
  private executive = new DashboardExecutiveService();
  private attendance = new DashboardAttendanceStatsService();
  private role = new DashboardRoleStatsService();

  async resolveDayRange(...args: any[]) { return (this.helper as any).resolveDayRange(...args); }

  async getOverview(...args: any[]) { return (this.executive as any).getOverview(...args); }
  async getAnalyticsStats(...args: any[]) { return (this.executive as any).getAnalyticsStats(...args); }
  async getRecentTenantRegistrations(...args: any[]) { return (this.executive as any).getRecentTenantRegistrations(...args); }
  async getKepsekEscalations(...args: any[]) { return (this.executive as any).getKepsekEscalations(...args); }
  async getKurikulumMonitoringGlobal(...args: any[]) { return (this.executive as any).getKurikulumMonitoringGlobal(...args); }
  async getSupervisionSchedule(...args: any[]) { return (this.executive as any).getSupervisionSchedule(...args); }
  async getViolationStats(...args: any[]) { return (this.executive as any).getViolationStats(...args); }

  async getGuruAttendance(...args: any[]) { return (this.attendance as any).getGuruAttendance(...args); }
  async getGuruCapabilitiesData(...args: any[]) { return (this.attendance as any).getGuruCapabilitiesData(...args); }
  async getStatistikKelasHarian(...args: any[]) { return (this.attendance as any).getStatistikKelasHarian(...args); }
  async getStatistikKelasBulanan(...args: any[]) { return (this.attendance as any).getStatistikKelasBulanan(...args); }
  async getStatistikGuruHarian(...args: any[]) { return (this.attendance as any).getStatistikGuruHarian(...args); }
  async getGrafikSiswaBulanan(...args: any[]) { return (this.attendance as any).getGrafikSiswaBulanan(...args); }
  async getGrafikGuruBulanan(...args: any[]) { return (this.attendance as any).getGrafikGuruBulanan(...args); }
  async getGuruLeaderboard(...args: any[]) { return (this.attendance as any).getGuruLeaderboard(...args); }

  async getHubinStats(...args: any[]) { return (this.role as any).getHubinStats(...args); }
  async getSarprasStats(...args: any[]) { return (this.role as any).getSarprasStats(...args); }
  async getTUStats(...args: any[]) { return (this.role as any).getTUStats(...args); }
  async getGerbangStats(...args: any[]) { return (this.role as any).getGerbangStats(...args); }
  async getPetugasStats(...args: any[]) { return (this.role as any).getPetugasStats(...args); }
  async getKaprogStats(...args: any[]) { return (this.role as any).getKaprogStats(...args); }
  async getToolmanStats(...args: any[]) { return (this.role as any).getToolmanStats(...args); }
  async getKabengStats(...args: any[]) { return (this.role as any).getKabengStats(...args); }
  async getBkkStats(...args: any[]) { return (this.role as any).getBkkStats(...args); }
}
