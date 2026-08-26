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

export const siswaProfileController = {
  async getSiswaMe(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = request.user?.id || request.user?.userId;

      if (!tenantId || !userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Missing credentials' });
      }

      const siswa = await prisma.siswa.findFirst({
        where: {
          tenant_id: tenantId,
          user_id: userId,
        },
        include: {
          User: {
            select: {
              id: true,
              email: true,
              full_name: true,
            },
          },
          Kelas: {
            include: {
              Jurusan: true,
            },
          },
          Jurusan: true,
          TahunPelajaran: true,
          Semester: true,
        },
      });

      if (!siswa) {
        return reply.status(404).send({
          success: false,
          message: 'Profil siswa untuk pengguna ini tidak ditemukan',
          data: null,
        });
      }

      // Bidirectional Hydration: Ensure ekskul memberships are hydrated from AnggotaKegiatanEskul
      if (!siswa.ekskul_1 && !siswa.ekskul_2) {
        try {
          const memberships = await prisma.anggotaKegiatanEskul.findMany({
            where: {
              tenant_id: tenantId,
              SiswaAkademik: { siswa_id: siswa.id }
            },
            include: { JenisKegiatanMaster: true },
            orderBy: { created_at: 'asc' }
          });
          if (memberships.length > 0) {
            (siswa as any).ekskul_1 = memberships[0]?.JenisKegiatanMaster?.nama || null;
            if (memberships.length > 1) {
              (siswa as any).ekskul_2 = memberships[1]?.JenisKegiatanMaster?.nama || null;
            }
          }
        } catch {
          // Ignore
        }
      }

      return reply.status(200).send({
        success: true,
        message: 'Profil siswa me retrieved successfully',
        data: siswa,
      });
    } catch (error: any) {
      console.error('Error in getSiswaMe:', error);
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Internal server error',
        data: null,
      });
    }
  },

  async updateSiswaMe(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = request.user?.id || request.user?.userId;

      if (!tenantId || !userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Missing credentials' });
      }

      const siswa = await prisma.siswa.findFirst({
        where: {
          tenant_id: tenantId,
          user_id: userId,
        },
      });

      if (!siswa) {
        return reply.status(404).send({
          success: false,
          message: 'Profil siswa tidak ditemukan',
          data: null,
        });
      }

      const body = request.body || {};
      const allowedFields = [
        'nisn',
        'nik',
        'tempat_lahir',
        'tanggal_lahir',
        'jenis_kelamin',
        'tinggi_badan',
        'berat_badan',
        'agama',
        'hobi',
        'cita_cita',
        'is_osis',
        'is_mpk',
        'ekskul_1',
        'ekskul_2',
        'no_hp',
        'alamat',
        'dusun',
        'kelurahan',
        'kecamatan',
        'kabupaten',
        'provinsi',
        'rt',
        'rw',
        'kode_pos',
        'lintang',
        'bujur',
        'koordinat',
        'transportasi',
        'nama_ayah',
        'nik_ayah',
        'no_hp_ayah',
        'pekerjaan_ayah',
        'pendidikan_ayah',
        'penghasilan_ayah',
        'nama_ibu',
        'nik_ibu',
        'no_hp_ibu',
        'pekerjaan_ibu',
        'pendidikan_ibu',
        'penghasilan_ibu',
        'nama_wali',
        'nik_wali',
        'hubungan_wali',
        'no_hp_wali',
        'pekerjaan_wali',
        'penghasilan_wali',
        'no_hp_ortu',
        'anak_ke',
        'kebutuhan_khusus',
        'penerima_kps',
        'penerima_kip',
        'no_kip',
        'sekolah_asal',
        'no_ijazah_smp',
        'foto',
      ];

      const updateData: any = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          if ((field === 'tanggal_lahir' || field === 'tanggal_masuk' || field === 'tanggal_keluar') && body[field]) {
            updateData[field] = new Date(body[field]);
          } else if ((field === 'tinggi_badan' || field === 'berat_badan' || field === 'anak_ke') && body[field] !== undefined) {
            updateData[field] = body[field] === null || body[field] === '' ? null : Number(body[field]);
          } else if ((field === 'is_osis' || field === 'is_mpk' || field === 'penerima_kps' || field === 'penerima_kip') && body[field] !== undefined) {
            updateData[field] = Boolean(body[field]);
          } else {
            updateData[field] = body[field];
          }
        }
      }

      const updated = await prisma.siswa.update({
        where: { id: siswa.id },
        data: updateData,
        include: {
          Kelas: {
            include: {
              Jurusan: true,
            },
          },
          Jurusan: true,
        },
      });

      return reply.status(200).send({
        success: true,
        message: 'Profil siswa berhasil diperbarui',
        data: updated,
      });
    } catch (error: any) {
      console.error('Error in updateSiswaMe:', error);
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Gagal memperbarui profil siswa',
        data: null,
      });
    }
  },
async getSiswaById(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const siswa = await siswaService.getSiswaById(id, tenantId, scope);

      if (!siswa) {
        return reply.status(404).send({
          success: false,
          message: 'Siswa not found'
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Siswa retrieved successfully',
        data: siswa,
      });
    } catch (error) {
      console.error('Error getting siswa by ID:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  },
async sendParentAccess(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const reqOrigin = request.headers.origin || 
        (request.headers.host ? `${request.protocol || 'http'}://${request.headers.host}` : undefined);

      const result = await siswaService.sendParentAccess(id, tenantId, scope, reqOrigin);

      return reply.status(200).send({
        success: true,
        message: result.message,
        waSent: result.waSent,
        waError: result.waError,
        data: result.target
      });

    } catch (error: any) {
      console.error('Error sending parent access:', error);
      
      if (error.message === 'Siswa not found') {
         return reply.status(404).send({ success: false, message: error.message });
      }
      
      if (error.message.includes('Orang Tua')) {
        return reply.status(400).send({ success: false, message: error.message });
      }

      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
      });
    }
  },
async getSiswaHistory(request: any, reply: any) {
    try {
      const scope = (request as any).organizationalScope;
      const tenantId = request.tenantId;
      const { id } = request.params;

      if (!tenantId) {
        reply.status(401);
        return { success: false, message: 'Unauthorized: tenant_id not found' };
      }

      const history = await siswaService.getSiswaHistory(id, tenantId, scope);

      return reply.status(200).send({
        success: true,
        message: 'History retrieved successfully',
        data: history,
      });
    } catch (error: any) {
      console.error('Error getting siswa history:', error);
      return reply.status(error.message === 'Siswa not found' ? 404 : 500).send({ 
        success: false, 
        message: error.message || 'Internal server error' 
      });
    }
  },
async getSiswaTimeline(request: any, reply: any) {
    try {
      const { id: siswaId } = request.params;
      const tenantId = request.tenantId;
      const userId = request.user.id;
      const capabilities = await authorizationService.resolveUserCapabilities(userId, { user: request.user });

      const timeline = await siswaService.getSiswaTimeline({
        tenantId,
        siswaId,
        userContext: {
          id: userId,
          capabilities
        }
      });

      return reply.status(200).send({
        success: true,
        data: timeline
      });
    } catch (error: any) {
      console.error('Get timeline error:', error);
      return reply.status(500).send({ success: false, message: error.message || 'Failed to retrieve timeline' });
    }
  }
};
