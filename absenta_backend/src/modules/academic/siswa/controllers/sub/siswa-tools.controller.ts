// @ts-nocheck
import { smartReadSheet } from '@/utils/excel-import.utils';
import { findBestMatch } from '@/utils/normalization';
import { prisma } from '@/utils/prisma';
import * as XLSX from 'xlsx-js-style';
import { SiswaService } from '../../services/siswa.service';
import { storageService } from '@/infra/storage/storage.service';
import { kelasService } from '../../../kelas/services/kelas.service';
import { getPaginationParams } from '@/utils/pagination';
import { RoleName } from '@/constants/enums';
import { authorizationService } from '@/modules/auth/services/authorization.service';

const siswaService = new SiswaService();

export const siswaToolsController = {
  async checkAcademicStatus(_request: any, reply: any) {
    try {
      const request = _request;
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });

      const body = request.body || {};
      const idsRaw = body.ids || body.student_ids || body.siswa_ids;
      const ids: string[] = Array.isArray(idsRaw) ? idsRaw.map(String).filter(Boolean) : [];
      const yearId = body.year_id ? String(body.year_id) : undefined;
      const semesterId = body.semester_id ? String(body.semester_id) : undefined;

      if (!yearId || !semesterId) {
        return reply.status(400).send({ success: false, message: 'year_id dan semester_id wajib diisi' });
      }

      const map = await siswaService.checkAcademicStatus(String(tenantId), ids, String(yearId), String(semesterId));
      return reply.status(200).send({ success: true, message: 'OK', data: map });
    } catch (e: any) {
      return reply.status(500).send({ success: false, message: e.message || 'Error checking status' });
    }
  },
async getAcademicRegistrationStats(_request: any, reply: any) {
    try {
      const request = _request;
      const tenantId = request.tenantId;
      if (!tenantId) return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });

      const yearId = request.query?.year_id ? String(request.query.year_id) : undefined;
      const semesterId = request.query?.semester_id ? String(request.query.semester_id) : undefined;
      if (!yearId || !semesterId) {
        return reply.status(400).send({ success: false, message: 'year_id dan semester_id wajib diisi' });
      }

      const dataScope = (request as any).dataScope; // { kelasIds, tenantWide, ... }

      const stats = await siswaService.getAcademicRegistrationStats(String(tenantId), String(yearId), String(semesterId), dataScope);
      return reply.status(200).send({ success: true, message: 'OK', data: stats });
    } catch (e: any) {
      return reply.status(500).send({ success: false, message: e.message || 'Error getting stats' });
    }
  },
async generateRfidForSiswa(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      const result = await siswaService.generateRfidForSiswa(String(tenantId), String(id));
      return reply.status(200).send({
        success: true,
        message: result.already_set ? 'RFID already set' : 'RFID generated',
        data: { id: result.id, no_rfid: result.no_rfid }
      });
    } catch (error) {
      console.error('Error generate RFID for siswa:', error);
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  },
async generateRfidBulk(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { kelas_id } = request.query || {};

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      const result = await siswaService.generateRfidBulk(String(tenantId), kelas_id ? String(kelas_id) : undefined);
      return reply.status(200).send({ success: true, message: 'RFID bulk generation completed', data: result });
    } catch (error) {
      console.error('Error generate RFID bulk:', error);
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  },
async generateNisMassal(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { ordered_kelas_ids } = request.body || {};

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      const result = await siswaService.generateNisMassal(
        { orderedKelasIds: Array.isArray(ordered_kelas_ids) ? ordered_kelas_ids : undefined },
        { tenantId: String(tenantId), org: scope }
      );

      return reply.status(200).send({
        success: true,
        message: `Generate NIS selesai: ${result.generated} berhasil, ${result.skipped} dilewati`,
        data: result
      });
    } catch (error: any) {
      console.error('Error generate NIS massal:', error);
      return reply.status(500).send({ success: false, message: error?.message || 'Internal server error' });
    }
  },
async getNisWizardPreview(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized' });
      }
      const data = await siswaService.getNisWizardPreview(String(tenantId));
      return reply.status(200).send({ success: true, data });
    } catch (error: any) {
      console.error('Error NIS wizard preview:', error);
      return reply.status(500).send({ success: false, message: error?.message || 'Internal server error' });
    }
  },
async pairRfidBulk(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { kelas_id, rfids } = request.body;

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      if (!kelas_id || !Array.isArray(rfids)) {
        return reply.status(400).send({ success: false, message: 'Invalid payload: kelas_id and rfids (array) are required' });
      }

      const result = await siswaService.pairRfidBulk(String(tenantId), String(kelas_id), rfids);
      return reply.status(200).send({
        success: true,
        message: `Successfully paired ${result.total_paired} RFIDs`,
        data: result
      });
    } catch (error) {
      console.error('Error pair RFID bulk:', error);
      return reply.status(error instanceof Error ? 400 : 500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  },
async syncSiswaAkademik(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Tenant ID required' });
      }

      const body = request.body || {};
      const tahun_pelajaran_id = body.tahun_pelajaran_id ? String(body.tahun_pelajaran_id) : undefined;
      const semester_id = body.semester_id ? String(body.semester_id) : undefined;
      const kelas_id = body.kelas_id ? String(body.kelas_id) : undefined;
      const result = await siswaService.syncSiswaAkademikWithDefaults({
        tenantId: String(tenantId),
        tahun_pelajaran_id,
        semester_id,
        kelas_id,
        userId: request.user?.id
      });
      return reply.status(200).send({ success: true, message: 'Sinkronisasi SiswaAkademik berhasil', data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Internal server error';
      if (msg === 'Tahun Pelajaran tidak valid' || msg === 'Tahun Pelajaran aktif tidak ditemukan' || msg === 'Semester tidak valid' || msg === 'Semester aktif tidak ditemukan') {
        return reply.status(400).send({ success: false, message: msg });
      }
      return reply.status(500).send({ success: false, message: 'Internal server error' });
    }
  },
async mapPpdbStudents(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const org = (request as any).organizationalScope;

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: tenant_id not found' });
      }

      const { siswa_ids, target_kelas_id } = request.body || {};
      if (!Array.isArray(siswa_ids) || siswa_ids.length === 0) {
        return reply.status(400).send({ success: false, message: 'siswa_ids wajib berupa array yang tidak kosong' });
      }
      if (!target_kelas_id) {
        return reply.status(400).send({ success: false, message: 'target_kelas_id wajib diisi' });
      }

      const result = await siswaService.mapPpdbStudents(tenantId, org, {
        siswaIds: siswa_ids,
        targetKelasId: target_kelas_id
      });

      return reply.status(200).send({
        success: true,
        message: `Pemetaan PPDB selesai. Berhasil: ${result.success}, Gagal: ${result.failed}`,
        data: result
      });
    } catch (error: any) {
      console.error('PPDB mapping error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to map PPDB students' });
    }
  },
async normalizeWaPhones(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: tenant_id not found' });
      }

      const result = await siswaService.normalizeWaPhones(tenantId);
      return reply.status(200).send({
        success: true,
        message: 'Normalisasi nomor WhatsApp siswa & ortu berhasil dijalankan',
        data: result,
      });
    } catch (error: any) {
      console.error('Error normalizing siswa WA phones:', error);
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal melakukan normalisasi nomor WhatsApp siswa',
      });
    }
  }
};
