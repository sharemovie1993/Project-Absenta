import { sesiLifecycleService } from './sesi-lifecycle.service';
import { sesiTapEngineService } from './sesi-tap-engine.service';
import { sesiCloseNotifyService } from './sesi-close-notify.service';
import { sesiHelperService } from './sesi-helper.service';

/**
 * SesiAbsensiService (Facade Pattern)
 * Modularized Architecture for Sesi Absensi Domain.
 * Delegates execution to domain-focused services while maintaining 100% Backward Compatibility.
 */
export class SesiAbsensiService {
  private static instance: SesiAbsensiService;

  public static getInstance(): SesiAbsensiService {
    if (!SesiAbsensiService.instance) {
      SesiAbsensiService.instance = new SesiAbsensiService();
    }
    return SesiAbsensiService.instance;
  }

  // --- Domain 1: Session Lifecycle (CRUD & Query) ---
  async create(tenantId: string, org: any, payload: any, userId: string) {
    return sesiLifecycleService.create(tenantId, org, payload, userId);
  }

  async list(tenantId: string, org: any, query: any) {
    return sesiLifecycleService.list(tenantId, org, query);
  }

  async updateStatus(tenantId: string, org: any, sesiId: string, status: string) {
    return sesiLifecycleService.updateStatus(tenantId, org, sesiId, status);
  }

  async update(tenantId: string, org: any, id: string, data: any) {
    return sesiLifecycleService.update(tenantId, org, id, data);
  }

  async remove(tenantId: string, org: any, id: string, userId: string) {
    return sesiLifecycleService.remove(tenantId, org, id, userId);
  }

  async listByTanggal(tenantId: string, tanggal: Date) {
    return sesiLifecycleService.listByTanggal(tenantId, tanggal);
  }

  // --- Domain 2: Tap Engine & Unified Presensi ---
  async tapSiswa(tenantId: string, org: any, sesi_id: string, data: any, userId: string) {
    return sesiTapEngineService.tapSiswa(tenantId, org, sesi_id, data, userId);
  }

  async updateAbsenGuru(tenantId: string, org: any, id: string, guruId: string, data: any) {
    return sesiTapEngineService.updateAbsenGuru(tenantId, org, id, guruId, data);
  }

  async listAbsenSiswa(tenantId: string, org: any, sesi_id: string, userId: string) {
    return sesiTapEngineService.listAbsenSiswa(tenantId, org, sesi_id, userId);
  }

  async getPresensiTerpaduSesi(tenantId: string, org: any, sesi_id: string, userId: string) {
    return sesiTapEngineService.listAbsenSiswa(tenantId, org, sesi_id, userId);
  }

  async propagateGateAbsenceToSessions(tenantId: string, siswaId: string, status: string, tanggal: Date | string) {
    return sesiTapEngineService.propagateGateAbsenceToSessions(tenantId, siswaId, status, tanggal);
  }

  async pullAttendanceFromOverlappingPembiasaan(tenantId: string, targetSesi: any) {
    return sesiTapEngineService.pullAttendanceFromOverlappingPembiasaan(tenantId, targetSesi);
  }

  // --- Domain 3: Journal, Close & Notification Queue ---
  async upsertProgresMateri(tenantId: string, org: any, sesiId: string, payload: any) {
    return sesiCloseNotifyService.upsertProgresMateri(tenantId, org, sesiId, payload);
  }

  async handleSessionClose(tenantId: string, sesiId: string, _sesi: any) {
    return sesiCloseNotifyService.handleSessionClose(tenantId, sesiId, _sesi);
  }

  async finalizeSessionAndNotify(tenantId: string, sesiId: string) {
    return sesiCloseNotifyService.finalizeSessionAndNotify(tenantId, sesiId);
  }

  // --- Domain 4: Helpers & Summary ---
  async summaryById(tenantId: string, org: any, id: string) {
    return sesiHelperService.summaryById(tenantId, org, id);
  }

  async checkPetugasActive(userId: string, tenantId: string, org: any) {
    return sesiHelperService.checkPetugasActive(userId, tenantId, org);
  }

  async enrichWithSummary(tenantId: string, sessions: any[]) {
    return sesiHelperService.enrichWithSummary(tenantId, sessions);
  }

  async attachJenisKegiatanMeta(tenantId: string, sessions: any[]) {
    return sesiHelperService.attachJenisKegiatanMeta(tenantId, sessions);
  }

  async publishRedisEvent(channel: string, payload: any) {
    return sesiHelperService.publishRedisEvent(channel, payload);
  }
}

export const sesiService = SesiAbsensiService.getInstance();
