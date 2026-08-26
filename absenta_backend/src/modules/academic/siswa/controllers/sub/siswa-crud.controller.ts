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

export const siswaCrudController = {
  async bulkResetPassword(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const payload = request.body;

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: tenant_id not found' });
      }

      const result = await siswaService.bulkResetPassword(tenantId, scope, payload);
      return reply.send(result);
    } catch (error: any) {
      console.error('Error in bulkResetPassword siswa:', error);
      return reply.status(400).send({
        success: false,
        message: error?.message || 'Gagal memproses reset password massal siswa.',
      });
    }
  },
async getAllSiswa(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }
      
      // Extract pagination parameters with enforcement
      const { page, limit } = getPaginationParams(request);
      
      const search = request.query.search as string;
      let user_id = (request.query.user_id as string | undefined) || undefined;
      const role = request.user?.roleName || request.user?.role?.name;
      if (role === RoleName.SISWA) {
        user_id = request.user.id || request.user.userId;
      }
      const kelas_id = request.query.kelas_id as string | undefined;
      const status = request.query.status as string | undefined;
      const context = request.query.context as string | undefined;
      const tingkat = request.query.tingkat as string | undefined;
      const gender = request.query.gender as string | undefined;
      
      const search_fields_param = request.query.search_fields as string | undefined;
      const searchFields = search_fields_param ? search_fields_param.split(',').map(f => f.trim()) : undefined;

      const result = await siswaService.getAllSiswa(tenantId, scope, {
        page,
        limit,
        search,
        user_id,
        kelas_id,
        status,
        searchFields,
        context,
        tingkat,
        gender,
      });

      return reply.status(200).send({
        success: true,
        message: 'Siswa retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error getting all siswa:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },
async bulkUpdateStatus(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      
      const rawBody = request.body;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      // Normalize payload: support both 'ids'/'siswaIds' and 'keterangan'/'alasan'
      const payload: any = {
        siswaIds: rawBody.siswaIds || rawBody.ids || [],
        status: rawBody.status,
        tanggal: rawBody.tanggal ? new Date(rawBody.tanggal) : undefined,
        alasan: rawBody.alasan || rawBody.keterangan,
      };

      const result = await siswaService.bulkUpdateStatus(tenantId, scope, payload);

      return reply.status(200).send({
        success: true,
        message: 'Status siswa berhasil diperbarui',
        data: result,
      });
    } catch (error) {
      console.error('Error bulk update siswa status:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  },
async createSiswa(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;

      const input: any = request.body;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      // Validate required fields (business rules): nama_siswa, kelas_id, tahun_pelajaran_id, semester_id
      if (!input.nama_siswa || !input.kelas_id || !input.tahun_pelajaran_id || !input.semester_id) {
        return reply.status(400).send({
          success: false,
          message: 'Missing required fields: nama_siswa, kelas_id, tahun_pelajaran_id, semester_id',
          data: null,
        });
      }

      // Convert date strings to Date objects if provided
      if (input.tanggal_lahir) {
        input.tanggal_lahir = new Date(input.tanggal_lahir);
      }
      if (input.tanggal_masuk) {
        input.tanggal_masuk = new Date(input.tanggal_masuk);
      }
      if (input.tanggal_keluar) {
        input.tanggal_keluar = new Date(input.tanggal_keluar);
      }
      if (input.tinggi_badan !== undefined) {
        input.tinggi_badan = input.tinggi_badan === null || input.tinggi_badan === '' ? null : Number(input.tinggi_badan);
      }
      if (input.berat_badan !== undefined) {
        input.berat_badan = input.berat_badan === null || input.berat_badan === '' ? null : Number(input.berat_badan);
      }

      const siswa = await siswaService.createSiswa(input, tenantId, scope);

      return reply.status(201).send({
        success: true,
        message: 'Siswa created successfully',
        data: siswa,
      });
    } catch (error) {
      console.error('Error creating siswa:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('already exists') || 
            error.message.includes('not found') ||
            error.message.includes('already has a siswa profile')) {
          return reply.status(400).send({
            success: false,
            message: error.message,
            data: null,
          });
          return;
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },
async updateSiswa(request: any, reply: any) {
    try {
      let scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;

      const user = request.user;

      // Ownership Check: Siswa biasa hanya boleh mengedit profil mereka sendiri
      if (user?.roleName === RoleName.SISWA) {
        const targetSiswa = await prisma.siswa.findUnique({
          where: { id }
        });

        if (!targetSiswa) {
          return reply.status(404).send({
            success: false,
            message: 'Profil siswa tidak ditemukan',
          });
        }

        if (targetSiswa.user_id !== user.id) {
          return reply.status(403).send({
            success: false,
            message: 'Forbidden: Anda tidak diperbolehkan memperbarui profil siswa lain.',
          });
        }

        // Bypass organizational scope restriction for self-update
        scope = null;
      }

      const input: any = request.body;

      // Convert date strings to Date objects if provided
      if (input.tanggal_lahir) {
        input.tanggal_lahir = new Date(input.tanggal_lahir);
      }
      if (input.tanggal_masuk) {
        input.tanggal_masuk = new Date(input.tanggal_masuk);
      }
      if (input.tanggal_keluar) {
        input.tanggal_keluar = new Date(input.tanggal_keluar);
      }
      if (input.tinggi_badan !== undefined) {
        input.tinggi_badan = input.tinggi_badan === null || input.tinggi_badan === '' ? null : Number(input.tinggi_badan);
      }
      if (input.berat_badan !== undefined) {
        input.berat_badan = input.berat_badan === null || input.berat_badan === '' ? null : Number(input.berat_badan);
      }

      const siswa = await siswaService.updateSiswa(id, input, tenantId, scope, request.user?.id);

      return reply.status(200).send({
        success: true,
        message: 'Siswa updated successfully',
        data: siswa,
      });
    } catch (error: any) {
      console.error('Error updating siswa:', error);
      
      if (error.message.includes('not found') || error.message.includes('Forbidden') || error.message.includes('own siswa data')) {
         const status = error.message.includes('not found') ? 404 : 403;
         return reply.status(status).send({ success: false, message: error.message });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },
async deleteSiswa(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;

      // Permissions are handled by requireCapability middleware
      
      await siswaService.deleteSiswa(id, tenantId, scope);

      return reply.status(200).send({
        success: true,
        message: 'Siswa deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Error deleting siswa:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found') || 
            error.message.includes('insufficient permissions') ||
            error.message.includes('Cannot delete') ||
            error.message.includes('Tidak dapat menghapus')) {
          return reply.status(400).send({
            success: false,
            message: error.message,
            data: null,
          });
          return;
        }
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },
async deleteAll(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      
      if (!tenantId) {
         return reply.status(400).send({ success: false, message: 'Tenant ID required' });
      }

      const result = await siswaService.deleteAllSiswa(tenantId);

      return reply.status(200).send({
        success: true,
        message: `Berhasil menghapus ${result.count} data siswa`,
        data: result,
      });
    } catch (error: any) {
      console.error('Error deleteAll siswa:', error);
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Internal server error',
        data: null,
      });
    }
  },
async completeSiswaExit(request: any, reply: any) {
    try {
      const { id: siswaId } = request.params;
      const tenantId = request.tenantId;
      const actorUserId = request.user?.id || request.user?.userId;

      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ success: false, message: 'File bukti Dapodik wajib diupload' });
      }

      const status = String(file.fields?.status?.value || 'KELUAR').toUpperCase();
      const alasan = file.fields?.alasan?.value ? String(file.fields.alasan.value).trim() : undefined;

      const result = await siswaService.completeSiswaExit({
        tenantId,
        siswaId,
        status,
        alasan,
        actorUserId,
        file
      });

      return reply.status(200).send({
        success: true,
        message: 'Proses keluar siswa berhasil diselesaikan',
        data: result
      });
    } catch (error: any) {
      console.error('Complete exit error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to complete student exit' });
    }
  },
async getSiswaExitBundle(request: any, reply: any) {
    try {
      const { id: siswaId } = request.params;
      const tenantId = request.tenantId;

      const { zipBuffer, filename } = await siswaService.getSiswaExitBundle({
        tenantId,
        siswaId
      });

      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return reply.send(zipBuffer);
    } catch (error: any) {
      console.error('Get exit bundle error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to generate exit bundle' });
    }
  }
};
