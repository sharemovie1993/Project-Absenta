// @ts-nocheck
import { HubinMitraController } from './sub/hubin-mitra.controller';
import { HubinPenempatanController } from './sub/hubin-penempatan.controller';
import { HubinAbsensiController } from './sub/hubin-absensi.controller';
import { HubinBkkController } from './sub/hubin-bkk.controller';
import { HubinPenilaianController } from './sub/hubin-penilaian.controller';

export class HubinController {
  private mitra = new HubinMitraController();
  private penempatan = new HubinPenempatanController();
  private absensi = new HubinAbsensiController();
  private bkk = new HubinBkkController();
  private penilaian = new HubinPenilaianController();

  private async hasHubinManageCaps(...args: any[]) { return true; }

  // Mitra & MoU
  async getMitra(...args: any[]) { return (this.mitra as any).getMitra(...args); }
  async createMitra(...args: any[]) { return (this.mitra as any).createMitra(...args); }
  async updateMitra(...args: any[]) { return (this.mitra as any).updateMitra(...args); }
  async deleteMitra(...args: any[]) { return (this.mitra as any).deleteMitra(...args); }
  async getMoUHistory(...args: any[]) { return (this.mitra as any).getMoUHistory(...args); }
  async createMoUHistory(...args: any[]) { return (this.mitra as any).createMoUHistory(...args); }
  async deleteMoUHistory(...args: any[]) { return (this.mitra as any).deleteMoUHistory(...args); }

  // Penempatan
  async getPenempatan(...args: any[]) { return (this.penempatan as any).getPenempatan(...args); }
  async getMyPenempatan(...args: any[]) { return (this.penempatan as any).getMyPenempatan(...args); }
  async createPenempatan(...args: any[]) { return (this.penempatan as any).createPenempatan(...args); }
  async updatePenempatan(...args: any[]) { return (this.penempatan as any).updatePenempatan(...args); }
  async bulkCreatePenempatan(...args: any[]) { return (this.penempatan as any).bulkCreatePenempatan(...args); }
  async deletePenempatan(...args: any[]) { return (this.penempatan as any).deletePenempatan(...args); }

  // Absensi & Logbook
  async getAbsensiSiswa(...args: any[]) { return (this.absensi as any).getAbsensiSiswa(...args); }
  async checkIn(...args: any[]) { return (this.absensi as any).checkIn(...args); }
  async checkOut(...args: any[]) { return (this.absensi as any).checkOut(...args); }
  async updateLogbook(...args: any[]) { return (this.absensi as any).updateLogbook(...args); }
  async verifyAbsensi(...args: any[]) { return (this.absensi as any).verifyAbsensi(...args); }
  async syncOfflineLogbook(...args: any[]) { return (this.absensi as any).syncOfflineLogbook(...args); }
  async addKunjungan(...args: any[]) { return (this.absensi as any).addKunjungan(...args); }
  async submitJurnalPortofolio(...args: any[]) { return (this.absensi as any).submitJurnalPortofolio(...args); }
  async reviewJurnalPortofolio(...args: any[]) { return (this.absensi as any).reviewJurnalPortofolio(...args); }
  async uploadPklPhoto(...args: any[]) { return (this.absensi as any).uploadPklPhoto(...args); }
  async deletePklPhoto(...args: any[]) { return (this.absensi as any).deletePklPhoto(...args); }

  // BKK & Karir
  async getLowongan(...args: any[]) { return (this.bkk as any).getLowongan(...args); }
  async createLowongan(...args: any[]) { return (this.bkk as any).createLowongan(...args); }
  async updateLowongan(...args: any[]) { return (this.bkk as any).updateLowongan(...args); }
  async deleteLowongan(...args: any[]) { return (this.bkk as any).deleteLowongan(...args); }
  async getLamaran(...args: any[]) { return (this.bkk as any).getLamaran(...args); }
  async createLamaran(...args: any[]) { return (this.bkk as any).createLamaran(...args); }
  async updateLamaranStatus(...args: any[]) { return (this.bkk as any).updateLamaranStatus(...args); }
  async scheduleInterview(...args: any[]) { return (this.bkk as any).scheduleInterview(...args); }
  async getLamaranTimeline(...args: any[]) { return (this.bkk as any).getLamaranTimeline(...args); }
  async deleteLamaran(...args: any[]) { return (this.bkk as any).deleteLamaran(...args); }
  async getTracerStudy(...args: any[]) { return (this.bkk as any).getTracerStudy(...args); }
  async submitTracerStudy(...args: any[]) { return (this.bkk as any).submitTracerStudy(...args); }
  async getTracerStats(...args: any[]) { return (this.bkk as any).getTracerStats(...args); }

  // Penilaian, Settings & TEFA
  async updatePenilaian(...args: any[]) { return (this.penilaian as any).updatePenilaian(...args); }
  async getSettings(...args: any[]) { return (this.penilaian as any).getSettings(...args); }
  async updateSettings(...args: any[]) { return (this.penilaian as any).updateSettings(...args); }
  async getTefaOrders(...args: any[]) { return (this.penilaian as any).getTefaOrders(...args); }
  async createTefaOrder(...args: any[]) { return (this.penilaian as any).createTefaOrder(...args); }
  async updateTefaOrder(...args: any[]) { return (this.penilaian as any).updateTefaOrder(...args); }
  async deleteTefaOrder(...args: any[]) { return (this.penilaian as any).deleteTefaOrder(...args); }
  async getRecentActivity(...args: any[]) { return (this.penilaian as any).getRecentActivity(...args); }
  async upsertNilaiPklBatch(...args: any[]) { return (this.penilaian as any).upsertNilaiPklBatch(...args); }
  async getRekapPklSiswa(...args: any[]) { return (this.penilaian as any).getRekapPklSiswa(...args); }
  async upsertSettingDeskripsiPkl(...args: any[]) { return (this.penilaian as any).upsertSettingDeskripsiPkl(...args); }
  async getSettingDeskripsiPklList(...args: any[]) { return (this.penilaian as any).getSettingDeskripsiPklList(...args); }
  async getSertifikatPklData(...args: any[]) { return (this.penilaian as any).getSertifikatPklData(...args); }
}
