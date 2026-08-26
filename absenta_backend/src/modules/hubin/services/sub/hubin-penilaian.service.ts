// @ts-nocheck
import { prisma } from '@/utils/prisma';
import crypto from 'crypto';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import { studentResolverService } from '@/services/student-resolver.service';
import { waGatewayService } from '@/services/wa-gateway.service';
import { getRedisConnection } from '@/queue/redis';
import { cacheService } from '@/utils/cache.service';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '@/constants/cache-keys';
import { HubinCommonHelper } from './hubin-common.helper';

export class HubinPenilaianService {
  async updatePenilaian(tenantId: string, id: string, nilai: any, requesterId?: string, org?: any) {
    if (requesterId) {
      await this.ensureOwnership(tenantId, id, requesterId, org);
    }
    const res = await prisma.siswaPkl.update({
      where: { id, tenant_id: tenantId },
      data: {
        nilai_json: nilai
      }
    });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return res;
  }


  private async ensureOwnership(tenantId: string, id: string, userId: string, org?: any) {
    // Enterprise Scoping: prioritize organizationalScope from middleware
    if (org) {
      if (org.tenant_wide === true) return true;
      
      // Jika bukan tenant_wide, dia harus pembimbing dari siswa pkl tersebut
      const pkl = await prisma.siswaPkl.findFirst({
        where: { id, tenant_id: tenantId },
        include: { Siswa: true }
      });

      if (!pkl) throw new Error('Data penempatan PKL tidak ditemukan');

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { Guru: true }
      });

      if (user?.Guru?.id && pkl.pembimbing_id !== user.Guru.id) {
        throw new Error('Anda tidak memiliki akses ke data siswa ini');
      }
      return true;
    }

    // Fallback for legacy
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        Guru: true,
        Role: { include: { rolePermissions: true } },
        organizationalAssignments: {
          where: { is_active: true },
          include: { Position: true }
        }
      }
    });

    const isGlobalHubin = user?.Role?.name === 'ADMIN' || 
                         user?.organizationalAssignments.some((oa: any) => oa.Position.code === 'HUBIN') ||
                         user?.Role?.rolePermissions.some((rp: any) => rp.permission_id === 'hubin.partners.manage');

    if (isGlobalHubin) return true;

    const pkl = await prisma.siswaPkl.findFirst({
      where: { id, tenant_id: tenantId }
    });

    if (!pkl) throw new Error('Data penempatan PKL tidak ditemukan');

    if (user?.Guru?.id && pkl.pembimbing_id !== user.Guru.id) {
      throw new Error('Anda tidak memiliki akses ke data siswa ini');
    }

    return true;
  }

  private async updateConfig(tenantId: string, key: string, value: string) {
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key }
    });
    if (existing) {
      return await prisma.config.update({
        where: { id: existing.id },
        data: { value }
      });
    } else {
      return await prisma.config.create({
        data: { tenant_id: tenantId, key, value }
      });
    }
  }

  async getSettings(tenantId: string) {
    const configUrl = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'HUBIN_GOOGLE_DRIVE_FOLDER_URL' }
    });
    const configMode = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: 'HUBIN_GOOGLE_DRIVE_MODE' }
    });
    return {
      folderUrl: configUrl?.value || '',
      driveMode: configMode?.value || 'simulated'
    };
  }

  async updateSettings(tenantId: string, data: { folderUrl: string; driveMode: string }) {
    await this.updateConfig(tenantId, 'HUBIN_GOOGLE_DRIVE_FOLDER_URL', data.folderUrl);
    await this.updateConfig(tenantId, 'HUBIN_GOOGLE_DRIVE_MODE', data.driveMode);
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return { success: true };
  }

  async verifyAbsensi(tenantId: string, id: string, requesterId?: string, org?: any) {
    if (requesterId) {
      // For absensi, we need to get the SiswaPkl ID first to check ownership
      const absensi = await prisma.absensiPkl.findFirst({
        where: { id, tenant_id: tenantId }
      });
      if (absensi) {
        await this.ensureOwnership(tenantId, absensi.siswa_pkl_id, requesterId, org);
      }
    }
    
    const res = await prisma.absensiPkl.update({
      where: { id },
      data: {
        is_verified: true,
        verified_by: requesterId,
        verifikasi_at: new Date()
      }
    });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return res;
  }

  // --- 5. MANAJEMEN RIWAYAT MoU (MoU History) ---

  async getTefaOrders(tenantId: string, params?: { search?: string; statusProyek?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (params?.statusProyek) where.status_proyek = params.statusProyek;
    if (params?.search) {
      where.nama_proyek = { contains: params.search, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      prisma.hubinTefaOrder.count({ where }),
      prisma.hubinTefaOrder.findMany({
        where,
        include: {
          Mitra: { select: { nama: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createTefaOrder(tenantId: string, data: any, actorUserId?: string | null) {
    const result = await prisma.hubinTefaOrder.create({
      data: {
        ...data,
        tenant_id: tenantId,
        nilai_kontrak: data.nilai_kontrak ? parseFloat(data.nilai_kontrak) : null,
        tanggal_mulai: data.tanggal_mulai ? new Date(data.tanggal_mulai) : null,
        tanggal_target: data.tanggal_target ? new Date(data.tanggal_target) : null
      }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_TEFA_CREATE', 'HubinTefaOrder', result.id, { nama_proyek: result.nama_proyek });
    return result;
  }

  async updateTefaOrder(tenantId: string, id: string, data: any, actorUserId?: string | null) {
    const updateData = { ...data };
    if (data.nilai_kontrak) updateData.nilai_kontrak = parseFloat(data.nilai_kontrak);
    if (data.tanggal_mulai) updateData.tanggal_mulai = new Date(data.tanggal_mulai);
    if (data.tanggal_target) updateData.tanggal_target = new Date(data.tanggal_target);
    
    const result = await prisma.hubinTefaOrder.update({
      where: { id, tenant_id: tenantId },
      data: updateData
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_TEFA_UPDATE', 'HubinTefaOrder', id, { nama_proyek: result.nama_proyek });
    return result;
  }

  async deleteTefaOrder(tenantId: string, id: string, actorUserId?: string | null) {
    const result = await prisma.hubinTefaOrder.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_TEFA_DELETE', 'HubinTefaOrder', id, { nama_proyek: result.nama_proyek });
    return result;
  }

  /**
   * Helper: Calculate distance between two points in meters (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async getRecentActivity(tenantId: string, limit: number = 15) {
    const logs = await prisma.activityLog.findMany({
      where: {
        tenant_id: tenantId,
        action: { startsWith: 'HUBIN_' }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        User: { select: { full_name: true } }
      }
    });

    return logs.map(log => ({
      id: log.id,
      action: log.action,
      actor: log.User?.full_name || 'System / Anonim',
      entity: log.entity,
      entity_id: log.entity_id,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      created_at: log.created_at
    }));
  }

  async verifySiswaPklOwnership(tenantId: string, siswaPklId: string, siswaId: string): Promise<boolean> {
    const pkl = await prisma.siswaPkl.findFirst({
      where: { tenant_id: tenantId, id: siswaPklId, siswa_id: siswaId }
    });
    return !!pkl;
  }

  /**
   * 🏭 BATCH UPSERT NILAI PKL (HARD SKILL, SOFT SKILL, ABSENSI, & CERTIFICATE INFO)
   * Formula: Nilai Akhir PKL = Rata-rata (3 Hard Skills + 5 Soft Skills)
   */
  async upsertNilaiPklBatch(
    tenantId: string,
    scores: Array<{
      siswa_pkl_id: string;
      instruktur_nama?: string | null;
      penanggung_jawab_nama?: string | null;
      alamat_dudi?: string | null;
      hard_kompetensi_teknis?: number | null;
      hard_sop_k3lh?: number | null;
      hard_alur_bisnis?: number | null;
      soft_kedisiplinan?: number | null;
      soft_kerajinan_inisiatif?: number | null;
      soft_kerjasama?: number | null;
      soft_kejujuran?: number | null;
      soft_tanggung_jawab?: number | null;
      catatan_pkl?: string | null;
      sakit_pkl?: number | null;
      izin_pkl?: number | null;
      alpa_pkl?: number | null;
      nomor_sertifikat?: string | null;
      deskripsi_tp?: string | null;
    }>
  ) {
    const operations = scores.map((item) => {
      // Collect non-null grades to compute Nilai Akhir PKL
      const gradeList = [
        item.hard_kompetensi_teknis,
        item.hard_sop_k3lh,
        item.hard_alur_bisnis,
        item.soft_kedisiplinan,
        item.soft_kerajinan_inisiatif,
        item.soft_kerjasama,
        item.soft_kejujuran,
        item.soft_tanggung_jawab,
      ].filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

      let nilaiAkhir: number | null = null;
      let predikat: string | null = null;

      if (gradeList.length > 0) {
        const sum = gradeList.reduce((acc, curr) => acc + curr, 0);
        nilaiAkhir = Number((sum / gradeList.length).toFixed(2));

        if (nilaiAkhir >= 90) predikat = 'Sangat Baik';
        else if (nilaiAkhir >= 80) predikat = 'Baik';
        else if (nilaiAkhir >= 70) predikat = 'Cukup';
        else predikat = 'Kurang';
      }

      return prisma.siswaPkl.update({
        where: { id: item.siswa_pkl_id },
        data: {
          instruktur_nama: item.instruktur_nama ?? undefined,
          penanggung_jawab_nama: item.penanggung_jawab_nama ?? undefined,
          alamat_dudi: item.alamat_dudi ?? undefined,
          hard_kompetensi_teknis: item.hard_kompetensi_teknis ?? undefined,
          hard_sop_k3lh: item.hard_sop_k3lh ?? undefined,
          hard_alur_bisnis: item.hard_alur_bisnis ?? undefined,
          soft_kedisiplinan: item.soft_kedisiplinan ?? undefined,
          soft_kerajinan_inisiatif: item.soft_kerajinan_inisiatif ?? undefined,
          soft_kerjasama: item.soft_kerjasama ?? undefined,
          soft_kejujuran: item.soft_kejujuran ?? undefined,
          soft_tanggung_jawab: item.soft_tanggung_jawab ?? undefined,
          nilai_akhir_pkl: nilaiAkhir,
          predikat_pkl: predikat,
          catatan_pkl: item.catatan_pkl ?? undefined,
          sakit_pkl: item.sakit_pkl ?? undefined,
          izin_pkl: item.izin_pkl ?? undefined,
          alpa_pkl: item.alpa_pkl ?? undefined,
          nomor_sertifikat: item.nomor_sertifikat ?? undefined,
          deskripsi_tp: item.deskripsi_tp ?? undefined,
        },
      });
    });

    const results = await prisma.$transaction(operations);

    // Auto Invalidate PKL Cache
    void cacheInvalidationService.invalidatePklCache(tenantId);
    return results;
  }

  /**
   * ⚡ GET REKAP PKL SISWA (WITH FAST-PATH REDIS CACHING)
   */
  async getRekapPklSiswa(
    tenantId: string,
    params?: { kelas_id?: string; status?: string; search?: string }
  ) {
    const cacheKey = CACHE_KEYS.HUBIN.PKL_REKAP(tenantId, params?.kelas_id);

    return await cacheService.getOrSet(
      cacheKey,
      async () => {
        const where: any = { tenant_id: tenantId };
        if (params?.status) where.status = params.status;
        if (params?.kelas_id) {
          where.Siswa = { kelas_id: params.kelas_id };
        }
        if (params?.search) {
          where.Siswa = {
            ...where.Siswa,
            nama_siswa: { contains: params.search, mode: 'insensitive' },
          };
        }

        const list = await prisma.siswaPkl.findMany({
          where,
          include: {
            Siswa: {
              select: {
                id: true,
                nama_siswa: true,
                nis: true,
                nisn: true,
                tempat_lahir: true,
                tanggal_lahir: true,
                Kelas: { select: { nama_kelas: true } },
              },
            },
            Mitra: { select: { id: true, nama: true, alamat: true } },
            Pembimbing: { select: { id: true, nama_guru: true, nip: true } },
          },
          orderBy: { Siswa: { nama_siswa: 'asc' } },
        });

        return list;
      },
      CACHE_TTL.DASHBOARD
    );
  }

  /**
   * 📜 SETTING DESKRIPSI TP DUDI (OLEH KAPROG / KAJUR)
   */
  async upsertSettingDeskripsiPkl(
    tenantId: string,
    data: { mitra_id: string; jurusan_id?: string | null; deskripsi_tp: string }
  ) {
    const result = await prisma.settingDeskripsiPkl.upsert({
      where: {
        tenant_id_mitra_id_jurusan_id: {
          tenant_id: tenantId,
          mitra_id: data.mitra_id,
          jurusan_id: data.jurusan_id || '',
        },
      },
      update: {
        deskripsi_tp: data.deskripsi_tp,
      },
      create: {
        tenant_id: tenantId,
        mitra_id: data.mitra_id,
        jurusan_id: data.jurusan_id || null,
        deskripsi_tp: data.deskripsi_tp,
      },
    });

    void cacheInvalidationService.invalidatePklCache(tenantId);
    return result;
  }

  async getSettingDeskripsiPklList(tenantId: string, mitraId?: string) {
    const where: any = { tenant_id: tenantId };
    if (mitraId) where.mitra_id = mitraId;

    return await prisma.settingDeskripsiPkl.findMany({
      where,
      include: {
        Mitra: { select: { id: true, nama: true } },
        Jurusan: { select: { id: true, nama: true, singkatan: true } },
      },
      orderBy: { Mitra: { nama: 'asc' } },
    });
  }

  /**
   * 📜 GET SERTIFIKAT PKL DATA (HALAMAN DEPAN & BELAKANG)
   */
  async getSertifikatPklData(tenantId: string, siswaPklId: string) {
    const pkl = await prisma.siswaPkl.findFirst({
      where: { id: siswaPklId, tenant_id: tenantId },
      include: {
        Siswa: {
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            nisn: true,
            tempat_lahir: true,
            tanggal_lahir: true,
            Kelas: { select: { nama_kelas: true, tingkat: true } },
            Jurusan: { select: { nama: true, singkatan: true } },
          },
        },
        Mitra: true,
        Pembimbing: { select: { nama_guru: true, nip: true } },
        Tenant: { select: { name: true, logo_url: true } },
      },
    });

    if (!pkl) throw new Error('Data penempatan PKL tidak ditemukan');

    // Auto-generate nomor sertifikat jika belum ada
    if (!pkl.nomor_sertifikat) {
      const count = await prisma.siswaPkl.count({
        where: { tenant_id: tenantId, NOT: { nomor_sertifikat: null } },
      });
      const nomorUrut = String(count + 1).padStart(4, '0');
      const generatedNomor = `425.1/${nomorUrut}/SMKN1PLD-KCD Wil.IV`;

      await prisma.siswaPkl.update({
        where: { id: pkl.id },
        data: { nomor_sertifikat: generatedNomor },
      });
      pkl.nomor_sertifikat = generatedNomor;
    }

    return pkl;
  }
}
