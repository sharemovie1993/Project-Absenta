// @ts-nocheck
import { BpbkCommonHelper } from './sub/bpbk-common.helper';
import { BpbkKasusService } from './sub/bpbk-kasus.service';
import { BpbkKonselingService } from './sub/bpbk-konseling.service';
import { BpbkPemanggilanService } from './sub/bpbk-pemanggilan.service';
import { BpbkHomeVisitService } from './sub/bpbk-homevisit.service';
import { BpbkAsesmenService } from './sub/bpbk-asesmen.service';
import { BpbkAnalyticsService } from './sub/bpbk-analytics.service';

/**
 * BpbkService (Facade)
 * Menyediakan delegasi murni untuk seluruh modul Bimbingan Konseling (BP/BK)
 */
export class BpbkService {
  // === Helpers ===
  static async getWaliKelasClassIds(...args: any[]) { return (BpbkCommonHelper as any).getWaliKelasClassIds(...args); }
  static async isUserWaliKelasOfStudent(...args: any[]) { return (BpbkCommonHelper as any).isUserWaliKelasOfStudent(...args); }
  static async buildVisibilityFilter(...args: any[]) { return (BpbkCommonHelper as any).buildVisibilityFilter(...args); }
  static async verifyOwner(...args: any[]) { return (BpbkCommonHelper as any).verifyOwner(...args); }

  // === Kasus BK ===
  static async createKasusBK(...args: any[]) { return (BpbkKasusService as any).createKasusBK(...args); }
  static async updateKasusBK(...args: any[]) { return (BpbkKasusService as any).updateKasusBK(...args); }
  static async deleteKasusBK(...args: any[]) { return (BpbkKasusService as any).deleteKasusBK(...args); }
  static async restoreKasusBK(...args: any[]) { return (BpbkKasusService as any).restoreKasusBK(...args); }
  static async closeKasusBK(...args: any[]) { return (BpbkKasusService as any).closeKasusBK(...args); }
  static async reopenKasusBK(...args: any[]) { return (BpbkKasusService as any).reopenKasusBK(...args); }
  static async getKasusBKById(...args: any[]) { return (BpbkKasusService as any).getKasusBKById(...args); }
  static async getAllKasusBK(...args: any[]) { return (BpbkKasusService as any).getAllKasusBK(...args); }

  // === Konseling ===
  static async createKonseling(...args: any[]) { return (BpbkKonselingService as any).createKonseling(...args); }
  static async updateKonseling(...args: any[]) { return (BpbkKonselingService as any).updateKonseling(...args); }
  static async deleteKonseling(...args: any[]) { return (BpbkKonselingService as any).deleteKonseling(...args); }
  static async restoreKonseling(...args: any[]) { return (BpbkKonselingService as any).restoreKonseling(...args); }
  static async getAllKonseling(...args: any[]) { return (BpbkKonselingService as any).getAllKonseling(...args); }

  // === Pemanggilan Ortu ===
  static async triggerParentNotification(...args: any[]) { return (BpbkPemanggilanService as any).triggerParentNotification(...args); }
  static async triggerPrincipalNotification(...args: any[]) { return (BpbkPemanggilanService as any).triggerPrincipalNotification(...args); }
  static async sendSummonsToParentWhatsApp(...args: any[]) { return (BpbkPemanggilanService as any).sendSummonsToParentWhatsApp(...args); }
  static async createPemanggilan(...args: any[]) { return (BpbkPemanggilanService as any).createPemanggilan(...args); }
  static async updatePemanggilan(...args: any[]) { return (BpbkPemanggilanService as any).updatePemanggilan(...args); }
  static async deletePemanggilan(...args: any[]) { return (BpbkPemanggilanService as any).deletePemanggilan(...args); }
  static async restorePemanggilan(...args: any[]) { return (BpbkPemanggilanService as any).restorePemanggilan(...args); }
  static async getAllPemanggilan(...args: any[]) { return (BpbkPemanggilanService as any).getAllPemanggilan(...args); }

  // === Home Visit ===
  static async createHomeVisit(...args: any[]) { return (BpbkHomeVisitService as any).createHomeVisit(...args); }
  static async updateHomeVisit(...args: any[]) { return (BpbkHomeVisitService as any).updateHomeVisit(...args); }
  static async deleteHomeVisit(...args: any[]) { return (BpbkHomeVisitService as any).deleteHomeVisit(...args); }
  static async restoreHomeVisit(...args: any[]) { return (BpbkHomeVisitService as any).restoreHomeVisit(...args); }
  static async getAllHomeVisits(...args: any[]) { return (BpbkHomeVisitService as any).getAllHomeVisits(...args); }

  // === Asesmen & Rujukan ===
  static async createAsesmen(...args: any[]) { return (BpbkAsesmenService as any).createAsesmen(...args); }
  static async updateAsesmen(...args: any[]) { return (BpbkAsesmenService as any).updateAsesmen(...args); }
  static async deleteAsesmen(...args: any[]) { return (BpbkAsesmenService as any).deleteAsesmen(...args); }
  static async restoreAsesmen(...args: any[]) { return (BpbkAsesmenService as any).restoreAsesmen(...args); }
  static async getAllAsesmen(...args: any[]) { return (BpbkAsesmenService as any).getAllAsesmen(...args); }
  static async createRujukan(...args: any[]) { return (BpbkAsesmenService as any).createRujukan(...args); }
  static async updateRujukan(...args: any[]) { return (BpbkAsesmenService as any).updateRujukan(...args); }
  static async deleteRujukan(...args: any[]) { return (BpbkAsesmenService as any).deleteRujukan(...args); }
  static async restoreRujukan(...args: any[]) { return (BpbkAsesmenService as any).restoreRujukan(...args); }
  static async getAllRujukan(...args: any[]) { return (BpbkAsesmenService as any).getAllRujukan(...args); }

  // === Analytics & Dashboard ===
  static async getDashboardStats(...args: any[]) { return (BpbkAnalyticsService as any).getDashboardStats(...args); }
  static async getEwsWeights(...args: any[]) { return (BpbkAnalyticsService as any).getEwsWeights(...args); }
  static async updateEwsWeights(...args: any[]) { return (BpbkAnalyticsService as any).updateEwsWeights(...args); }
  static async getCalendarEvents(...args: any[]) { return (BpbkAnalyticsService as any).getCalendarEvents(...args); }
  static async calculateEwsForSiswa(...args: any[]) { return (BpbkAnalyticsService as any).calculateEwsForSiswa(...args); }
  static async getReportsData(...args: any[]) { return (BpbkAnalyticsService as any).getReportsData(...args); }
  static async getStudentRiskTrend(...args: any[]) { return (BpbkAnalyticsService as any).getStudentRiskTrend(...args); }
  static async getWaliKelasDashboardData(...args: any[]) { return (BpbkAnalyticsService as any).getWaliKelasDashboardData(...args); }
  static async getAuditLogsData(...args: any[]) { return (BpbkAnalyticsService as any).getAuditLogsData(...args); }
}
