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
      try {
        const memberships = await prisma.anggotaKegiatanEskul.findMany({
          where: {
            tenant_id: tenantId,
            SiswaAkademik: { siswa_id: siswa.id }
          },
          include: { JenisKegiatanMaster: true },
          orderBy: { created_at: 'asc' }
        });
        const membershipEskuls = memberships
          .map(m => m.JenisKegiatanMaster?.nama)
          .filter((name): name is string => Boolean(name && name.trim().length > 0));

        const combinedEskuls = Array.from(new Set([
          siswa.ekskul_1,
          siswa.ekskul_2,
          ...membershipEskuls
        ])).filter((name): name is string => Boolean(name && name.trim().length > 0));

        (siswa as any).ekskuls = combinedEskuls;
        if (!siswa.ekskul_1 && combinedEskuls[0]) {
          (siswa as any).ekskul_1 = combinedEskuls[0];
        }
        if (!siswa.ekskul_2 && combinedEskuls[1]) {
          (siswa as any).ekskul_2 = combinedEskuls[1];
        }
      } catch {
        // Ignore
      }

      // Hydrate Koperasi Member Status
      try {
        const coopMember = await prisma.member.findFirst({
          where: {
            tenantId,
            OR: [
              { siswaId: siswa.id },
              { userId: userId }
            ],
            status: 'ACTIVE'
          }
        });
        (siswa as any).is_anggota_koperasi = Boolean(coopMember);
      } catch {
        // Ignore
      }

      // Hydrate Organizational Assignments (Tugas Tambahan & Jabatan Sekolah)
      try {
        const now = new Date();
        const activeTp = await prisma.tahunPelajaran.findFirst({
          where: { tenant_id: tenantId, is_active: true },
          select: { id: true, tahun: true },
        });

        const assignments = await prisma.organizationalAssignment.findMany({
          where: {
            tenant_id: tenantId,
            user_id: userId,
            is_active: true,
            AND: [
              { OR: [{ start_date: null }, { start_date: { lte: now } }] },
              { OR: [{ end_date: null }, { end_date: { gte: now } }] },
              activeTp?.id ? { OR: [{ tahun_pelajaran_id: null }, { tahun_pelajaran_id: activeTp.id }] } : {},
            ],
          },
          include: {
            Position: { select: { id: true, code: true, name: true, scope_type: true } },
            Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
            Unit: { select: { id: true, nama: true, singkatan: true, kode: true } },
            TahunPelajaran: { select: { id: true, tahun: true, is_active: true } },
          },
          orderBy: [{ created_at: 'desc' }]
        });

        (siswa as any).assignments = assignments.map((a: any) => ({
          id: a.id,
          position_id: a.position_id,
          position_code: a.Position?.code,
          position_name: a.Position?.name,
          custom_title: a.custom_title,
          is_leader: a.is_leader,
          kelas_id: a.kelas_id,
          kelas_nama: a.Kelas?.nama_kelas,
          unit_id: a.unit_id,
          unit_nama: a.Unit?.nama,
          tahun_pelajaran_id: a.tahun_pelajaran_id,
          tahun_pelajaran: a.TahunPelajaran?.tahun || activeTp?.tahun,
          start_date: a.start_date,
          end_date: a.end_date,
        }));

        const hasKm = assignments.some((a: any) => a.is_leader || (a.custom_title && a.custom_title.toLowerCase().includes('km')));
        const hasSekretaris = assignments.some((a: any) => a.custom_title && a.custom_title.toLowerCase().includes('sekretaris'));
        const hasPetugasKelas = assignments.some((a: any) => a.Position?.code === 'PETUGAS_KELAS');

        (siswa as any).is_km = hasKm;
        (siswa as any).is_sekretaris = hasSekretaris;
        (siswa as any).is_petugas_kelas = hasPetugasKelas;
        (siswa as any).petugas_title = assignments.find((a: any) => a.Position?.code === 'PETUGAS_KELAS')?.custom_title || (hasKm ? 'Ketua Murid (KM)' : hasSekretaris ? 'Sekretaris' : 'Petugas Kelas');
      } catch (err) {
        console.warn('[getSiswaMe] Failed to hydrate organizational assignments:', err);
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
        'alamat_ortu',
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

      const autoSendWa = Boolean((request.body as any)?.autoSendWa === true);
      const result = await siswaService.sendParentAccess(id, tenantId, scope, reqOrigin, autoSendWa);

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
      const tenantId = request.tenantId || request.user?.tenantId || request.user?.tenant_id;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: tenant_id not found', data: [] });
      }

      const history = await siswaService.getSiswaHistory(id, tenantId, scope);

      return reply.status(200).send({
        success: true,
        message: 'History retrieved successfully',
        data: history || [],
      });
    } catch (error: any) {
      console.error('Error getting siswa history:', error);
      if (error?.message?.includes('not found') || error?.message?.includes('tidak ditemukan')) {
        return reply.status(200).send({ 
          success: true, 
          message: 'Belum ada riwayat akademik',
          data: [] 
        });
      }
      // Graceful fallback for UI: return empty list with warning to avoid breaking student detail view
      return reply.status(200).send({ 
        success: true, 
        message: 'Belum ada riwayat akademik',
        data: []
      });
    }
  },

  async getSiswaTimeline(request: any, reply: any) {
    try {
      const { id: siswaId } = request.params;
      const tenantId = request.tenantId || request.user?.tenantId || request.user?.tenant_id;
      const userId = request.user?.id || request.user?.userId || '';

      if (!tenantId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: tenant_id not found', data: [] });
      }

      let capabilities: string[] = [];
      if (userId) {
        try {
          capabilities = await authorizationService.resolveUserCapabilities(userId, { user: request.user });
        } catch (capErr) {
          console.warn('Failed to resolve capabilities for timeline:', capErr);
          capabilities = [];
        }
      }

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
        data: timeline || []
      });
    } catch (error: any) {
      console.error('Get timeline error:', error);
      if (error?.message?.includes('tidak ditemukan') || error?.message?.includes('not found')) {
        return reply.status(200).send({
          success: true,
          data: []
        });
      }
      // Graceful fallback for UI: return empty list to prevent breaking student detail view
      return reply.status(200).send({ 
        success: true, 
        message: 'Belum ada linimasa',
        data: [] 
      });
    }
  },

  async recordAppTelemetry(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const userId = request.user?.id || request.user?.userId;

      if (!tenantId || !userId) {
        return reply.status(401).send({ success: false, message: 'Unauthorized: Missing credentials' });
      }

      const {
        is_installed = true,
        app_version,
        ota_version,
        device_model,
        device_os,
        device_uuid,
      } = request.body || {};

      const siswa = await prisma.siswa.findFirst({
        where: {
          tenant_id: tenantId,
          user_id: userId,
        },
        select: { id: true },
      });

      if (!siswa) {
        return reply.status(404).send({
          success: false,
          message: 'Profil siswa tidak ditemukan',
        });
      }

      const updated = await prisma.siswa.update({
        where: { id: siswa.id },
        data: {
          is_app_installed: Boolean(is_installed),
          app_version: app_version ? String(app_version) : undefined,
          ota_version: ota_version ? String(ota_version) : undefined,
          device_model: device_model ? String(device_model) : undefined,
          device_os: device_os ? String(device_os) : undefined,
          device_uuid: device_uuid ? String(device_uuid) : undefined,
          last_app_seen_at: new Date(),
        },
        select: {
          id: true,
          is_app_installed: true,
          app_version: true,
          ota_version: true,
          device_model: true,
          device_os: true,
          last_app_seen_at: true,
        },
      });

      return reply.status(200).send({
        success: true,
        message: 'Telemetry aplikasi siswa berhasil diperbarui',
        data: updated,
      });
    } catch (error: any) {
      console.error('Error in recordAppTelemetry:', error);
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Internal server error',
      });
    }
  },

  async getAppTelemetryStats(request: any, reply: any) {
    try {
      const tenantId = request.tenantId;
      const { kelas_id, jurusan_id } = request.query || {};
      const org = request.organizationalScope;

      const whereClause: any = {
        tenant_id: tenantId,
        status: 'AKTIF',
      };

      if (kelas_id) {
        whereClause.kelas_id = kelas_id;
      } else if (jurusan_id) {
        whereClause.OR = [
          { jurusan_id: jurusan_id },
          { Kelas: { jurusan_id: jurusan_id } },
        ];
      } else if (org?.is_unit_restricted && Array.isArray(org.unit_ids) && org.unit_ids.length > 0 && !org.tenant_wide) {
        whereClause.OR = [
          { jurusan_id: { in: org.unit_ids } },
          { Kelas: { jurusan_id: { in: org.unit_ids } } },
        ];
      } else if (org?.is_wali_kelas && Array.isArray(org.kelas_ids) && org.kelas_ids.length > 0 && !org.tenant_wide) {
        whereClause.kelas_id = { in: org.kelas_ids };
      }

      const [totalSiswa, totalInstalled] = await Promise.all([
        prisma.siswa.count({ where: whereClause }),
        prisma.siswa.count({ where: { ...whereClause, is_app_installed: true } }),
      ]);

      const percentage = totalSiswa > 0 ? Math.round((totalInstalled / totalSiswa) * 100) : 0;

      return reply.status(200).send({
        success: true,
        data: {
          total_siswa: totalSiswa,
          total_installed: totalInstalled,
          total_not_installed: Math.max(0, totalSiswa - totalInstalled),
          percentage,
        },
      });
    } catch (error: any) {
      console.error('Error in getAppTelemetryStats:', error);
      return reply.status(500).send({
        success: false,
        message: error?.message || 'Internal server error',
      });
    }
  }
};
