import { sendResponse, sendError } from '../../../utils/response';
import { SuratKeluarService } from '../services/surat-keluar.service';
import { cacheService } from '../../../utils/cache.service';
import { prisma } from '../../../utils/prisma';

export class SuratKeluarController {
  static async getAll(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const result = await SuratKeluarService.getAll(tenant_id, req.query);
      return sendResponse(reply, 200, true, 'Surat keluar berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil data surat keluar', error);
    }
  }

  static async getById(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await SuratKeluarService.getById(tenant_id, id);
      if (!result) return sendError(reply, 404, 'Surat keluar tidak ditemukan');
      return sendResponse(reply, 200, true, 'Detail surat keluar berhasil diambil', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil detail surat keluar', error);
    }
  }

  static async create(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const result = await SuratKeluarService.create(tenant_id, userId, req.body);
      return sendResponse(reply, 201, true, 'Surat keluar berhasil dibuat', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal membuat surat keluar', error);
    }
  }

  static async update(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      const result = await SuratKeluarService.update(tenant_id, id, req.body);
      return sendResponse(reply, 200, true, 'Surat keluar berhasil diperbarui', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memperbarui surat keluar', error);
    }
  }

  static async delete(req: any, reply: any) {
    try {
      const { tenant_id } = req.user!;
      const { id } = req.params;
      await SuratKeluarService.delete(tenant_id, id);
      return sendResponse(reply, 200, true, 'Surat keluar berhasil dihapus');
    } catch (error) {
      return sendError(reply, 500, 'Gagal menghapus surat keluar', error);
    }
  }

  static async sign(req: any, reply: any) {
    try {
      const { tenant_id, id: userId } = req.user!;
      const { id } = req.params;
      const { status } = req.body; // DIKIRIM or DITOLAK
      const result = await SuratKeluarService.sign(tenant_id, id, userId, status);
      return sendResponse(reply, 200, true, 'Surat keluar berhasil diproses persetujuan', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal memproses persetujuan surat', error);
    }
  }

  static async getQuickApproveDetail(req: any, reply: any) {
    try {
      const { token } = req.params;
      const cacheKey = `surat-keluar:quick-approve-token:${token}`;
      const cached = await cacheService.get<any>(cacheKey);
      if (!cached) {
        return sendError(reply, 404, 'Token persetujuan tidak valid atau sudah kedaluwarsa');
      }

      const { suratKeluarId, tenantId } = cached;
      const suratKeluar = await prisma.suratKeluar.findUnique({
        where: { id: suratKeluarId },
        include: {
          Siswa: {
            select: {
              nama_siswa: true,
              nis: true,
              Kelas: { select: { nama_kelas: true } }
            }
          },
          CreatedBy: { select: { full_name: true } }
        }
      });

      if (!suratKeluar) {
        return sendError(reply, 404, 'Draft surat keluar tidak ditemukan');
      }

      // Fetch corresponding PemanggilanOrangTua details
      let pemanggilan = null;
      if (cached.pemanggilanId) {
        pemanggilan = await prisma.pemanggilanOrangTua.findUnique({
          where: { id: cached.pemanggilanId }
        });
      }

      if (!pemanggilan && suratKeluar.siswa_id) {
        pemanggilan = await prisma.pemanggilanOrangTua.findFirst({
          where: {
            siswa_id: suratKeluar.siswa_id,
            tenant_id: tenantId,
            status: 'BARU'
          },
          orderBy: { created_at: 'desc' }
        });
      }

      // Get School Profile info (Tenant)
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, logo_url: true }
      });

      return sendResponse(reply, 200, true, 'Detail quick approve berhasil diambil', {
        id: suratKeluar.id,
        nomor_surat: suratKeluar.nomor_surat,
        judul: suratKeluar.judul,
        tujuan_surat: suratKeluar.tujuan_surat,
        tanggal_surat: suratKeluar.tanggal_surat,
        isi_ringkas: suratKeluar.isi_ringkas,
        created_by: suratKeluar.CreatedBy?.full_name,
        siswa: suratKeluar.Siswa ? {
          nama: suratKeluar.Siswa.nama_siswa,
          nis: suratKeluar.Siswa.nis,
          kelas: suratKeluar.Siswa.Kelas?.nama_kelas
        } : null,
        pemanggilan: pemanggilan ? {
          alasan: pemanggilan.alasan,
          tanggal: pemanggilan.tanggal_pemanggilan,
          waktu: pemanggilan.waktu_pertemuan,
          tempat: pemanggilan.tempat_pertemuan
        } : null,
        sekolah: tenant ? {
          nama: tenant.name,
          logo: tenant.logo_url
        } : null
      });
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil detail persetujuan surat', error);
    }
  }

  static async postQuickApprove(req: any, reply: any) {
    try {
      const { token } = req.params;
      const cacheKey = `surat-keluar:quick-approve-token:${token}`;
      const cached = await cacheService.get<any>(cacheKey);
      if (!cached) {
        return sendError(reply, 404, 'Token persetujuan tidak valid atau sudah kedaluwarsa');
      }

      const { suratKeluarId, tenantId, kepsekUserId } = cached;
      
      // Perform approval / sign
      const result = await SuratKeluarService.sign(tenantId, suratKeluarId, kepsekUserId, 'DIKIRIM');

      // Delete cache token
      await cacheService.delete(cacheKey);

      return sendResponse(reply, 200, true, 'Surat keluar berhasil disetujui', result);
    } catch (error) {
      return sendError(reply, 500, 'Gagal menyetujui surat keluar', error);
    }
  }

  static async getParentPublicViewDetail(req: any, reply: any) {
    try {
      const { token } = req.params;
      const cacheKey = `surat-keluar:public-view-token:${token}`;
      const cached = await cacheService.get<any>(cacheKey);
      if (!cached) {
        return sendError(reply, 404, 'Token akses surat tidak valid atau sudah kedaluwarsa');
      }

      const { suratKeluarId, tenantId, pemanggilanId } = cached;
      
      // Fetch corresponding PemanggilanOrangTua details
      let pemanggilan = null;
      if (pemanggilanId) {
        pemanggilan = await prisma.pemanggilanOrangTua.findUnique({
          where: { id: pemanggilanId },
          include: {
            Siswa: {
              select: {
                id: true,
                nama_siswa: true,
                nis: true,
                Kelas: { select: { nama_kelas: true, id: true } }
              }
            }
          }
        });
      }

      // Fetch SuratKeluar if ID is present
      const suratKeluar = suratKeluarId
        ? await prisma.suratKeluar.findUnique({
            where: { id: suratKeluarId },
            include: {
              Siswa: {
                select: {
                  id: true,
                  nama_siswa: true,
                  nis: true,
                  Kelas: { select: { nama_kelas: true, id: true } }
                }
              },
              CreatedBy: { select: { full_name: true } }
            }
          })
        : null;

      // Fallback search for pemanggilan if not found by ID but suratKeluar exists
      if (!pemanggilan && suratKeluar?.siswa_id) {
        pemanggilan = await prisma.pemanggilanOrangTua.findFirst({
          where: {
            siswa_id: suratKeluar.siswa_id,
            tenant_id: tenantId,
            status: 'DIKIRIM'
          },
          include: {
            Siswa: {
              select: {
                id: true,
                nama_siswa: true,
                nis: true,
                Kelas: { select: { nama_kelas: true, id: true } }
              }
            }
          },
          orderBy: { created_at: 'desc' }
        });
      }

      if (!pemanggilan && !suratKeluar) {
        return sendError(reply, 404, 'Surat panggilan tidak ditemukan');
      }

      // Resolve final student info
      const resolvedSiswa = suratKeluar?.Siswa || pemanggilan?.Siswa || null;

      // Get School Profile info (Tenant)
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      // Fetch active structure list
      const assignments = await prisma.organizationalAssignment.findMany({
        where: { tenant_id: tenantId, is_active: true },
        include: {
          User: {
            select: {
              full_name: true,
              Guru: { select: { nip: true } }
            }
          },
          Position: true
        }
      });

      const strukturList = assignments.map(a => ({
        id: a.id,
        nama: a.User?.full_name || '',
        nip: a.User?.Guru?.nip || '',
        jabatan: a.Position?.name || '',
        kode_jabatan: a.Position?.code || ''
      }));

      // Generate fallback fields if SuratKeluar is null (e.g. in bypass mode)
      const yr = pemanggilan ? new Date(pemanggilan.tanggal_pemanggilan).getFullYear() : new Date().getFullYear();
      const resolvedNomor = suratKeluar?.nomor_surat || `800 / ${resolvedSiswa?.nis || '___'} / BK / ${yr}`;
      const resolvedJudul = suratKeluar?.judul || `Surat Panggilan Orang Tua (BK): ${resolvedSiswa?.nama_siswa || 'Siswa'}`;
      const resolvedTujuan = suratKeluar?.tujuan_surat || 'Orang Tua / Wali Siswa';
      const resolvedTanggal = suratKeluar?.tanggal_surat || (pemanggilan ? pemanggilan.created_at.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      const resolvedIsi = suratKeluar?.isi_ringkas || `Digenerasikan dari modul BP/BK - Pemanggilan Orang Tua. Alasan: ${pemanggilan?.alasan || ''}`;
      const resolvedCreatedBy = suratKeluar?.CreatedBy?.full_name || 'Guru Bimbingan Konseling';

      return sendResponse(reply, 200, true, 'Detail surat publik berhasil diambil', {
        id: suratKeluar?.id || pemanggilan?.id || '',
        nomor_surat: resolvedNomor,
        judul: resolvedJudul,
        tujuan_surat: resolvedTujuan,
        tanggal_surat: resolvedTanggal,
        isi_ringkas: resolvedIsi,
        created_by: resolvedCreatedBy,
        siswa: resolvedSiswa ? {
          id: resolvedSiswa.id,
          nama: resolvedSiswa.nama_siswa,
          nis: resolvedSiswa.nis,
          kelas: resolvedSiswa.Kelas?.nama_kelas,
          kelas_id: resolvedSiswa.Kelas?.id
        } : null,
        pemanggilan: pemanggilan ? {
          alasan: pemanggilan.alasan,
          tanggal: pemanggilan.tanggal_pemanggilan,
          waktu: pemanggilan.waktu_pertemuan,
          tempat: pemanggilan.tempat_pertemuan
        } : null,
        sekolah: tenant,
        tenantInfo: tenant,
        strukturList
      });
    } catch (error) {
      return sendError(reply, 500, 'Gagal mengambil detail surat publik', error);
    }
  }
}