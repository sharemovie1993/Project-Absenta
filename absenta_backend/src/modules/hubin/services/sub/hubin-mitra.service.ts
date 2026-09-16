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

export class HubinMitraService extends HubinCommonHelper {
  async getMitra(tenantId: string, params?: { search?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;
    
    const where: any = { tenant_id: tenantId };
    
    if (params?.search) {
      where.OR = [
        { nama: { contains: params.search, mode: 'insensitive' } },
        { bidang: { contains: params.search, mode: 'insensitive' } },
        { alamat: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.mitraIndustri.count({ where }),
      prisma.mitraIndustri.findMany({
        where,
        orderBy: { nama: 'asc' },
        skip,
        take: limit,
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

  async getMitraDetail(tenantId: string, id: string) {
    return await prisma.mitraIndustri.findFirst({
      where: { id, tenant_id: tenantId },
    });
  }

  async createMitra(tenantId: string, data: any, actorUserId?: string | null) {
    const result = await prisma.mitraIndustri.create({
      data: {
        ...data,
        tenant_id: tenantId,
      },
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_MITRA_CREATE', 'MitraIndustri', result.id, { nama: result.nama });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return result;
  }

  async updateMitra(tenantId: string, id: string, data: any, userId?: string, org?: any) {
    if (userId) {
      let isGlobalHubin = org?.tenant_wide === true;

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

      if (!org) {
        isGlobalHubin = !!(
          user?.Role?.name === 'ADMIN' || 
          user?.Role?.name === 'SUPERADMIN' ||
          user?.organizationalAssignments?.some((oa: any) => oa.Position?.code === 'HUBIN') ||
          user?.Role?.rolePermissions?.some((rp: any) => rp.permission_id === 'hubin.partners.manage')
        );
      }

      if (!isGlobalHubin) {
        // Jika bukan Hubin Global, cek apakah dia pembimbing di mitra ini
        const isPembimbingHere = await prisma.siswaPkl.findFirst({
          where: { mitra_id: id, pembimbing_id: user?.Guru?.id, tenant_id: tenantId }
        });

        if (!isPembimbingHere) {
          throw new Error('Anda tidak memiliki otoritas untuk memperbarui data mitra ini');
        }

        // Proteksi Data: Pembimbing hanya boleh update kontak/lokasi
        const safeData = {
          alamat: data.alamat,
          kontak: data.kontak,
          latitude: data.latitude,
          longitude: data.longitude,
          radius: data.radius
        };
        
        return await prisma.mitraIndustri.update({
          where: { id, tenant_id: tenantId },
          data: safeData,
        });
      }
    }

    const result = await prisma.mitraIndustri.update({
      where: { id, tenant_id: tenantId },
      data,
    });
    this.log(tenantId, userId || null, 'HUBIN_MITRA_UPDATE', 'MitraIndustri', id, { nama: result.nama });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return result;
  }

  async deleteMitra(tenantId: string, id: string, actorUserId?: string | null) {
    const result = await prisma.mitraIndustri.delete({
      where: { id, tenant_id: tenantId },
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_MITRA_DELETE', 'MitraIndustri', id, { nama: result.nama });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return result;
  }

  async importMitraFromRows(
    tenantId: string,
    rows: any[],
    actorUserId?: string | null,
    onProgress?: (data: { current: number; total: number; progress: number; created: number; updated: number; skipped: number; failed: number }) => void
  ) {
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failCount = 0;
    const errors: Array<{ row: number; nama: string; reason: string }> = [];

    const BATCH_SIZE = 15;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (row, batchIdx) => {
        const rowNumber = row.__rowNum || (i + batchIdx + 2);
        const cleanStr = (val: any) => {
          if (val === undefined || val === null) return null;
          const str = String(val).trim();
          return str.length > 0 ? str : null;
        };

        const nama = String(row.nama || row.nama_mitra || row.nama_perusahaan || '').trim();

        // Cek apakah seluruh baris ini kosong (misalnya baris sisa template Excel hingga baris 3000)
        const hasAnyContent = Boolean(
          nama ||
          cleanStr(row.bidang) ||
          cleanStr(row.alamat) ||
          cleanStr(row.kontak) ||
          cleanStr(row.pic_nama) ||
          cleanStr(row.pic_telepon) ||
          cleanStr(row.pic_email) ||
          cleanStr(row.mou_nomor) ||
          cleanStr(row.kompetensi_keahlian)
        );

        if (!hasAnyContent) {
          // Baris kosong diabaikan secara senyap tanpa dianggap sebagai kesalahan
          return;
        }

        if (!nama) {
          failCount++;
          errors.push({ 
            row: rowNumber, 
            nama: '-', 
            message: 'Nama mitra / perusahaan wajib diisi',
            reason: 'Nama mitra / perusahaan wajib diisi' 
          });
          return;
        }

        try {
          const latitude = (row.latitude !== undefined && row.latitude !== null && row.latitude !== '') 
            ? parseFloat(String(row.latitude)) 
            : null;
          const longitude = (row.longitude !== undefined && row.longitude !== null && row.longitude !== '') 
            ? parseFloat(String(row.longitude)) 
            : null;
          const radius = (row.radius !== undefined && row.radius !== null && row.radius !== '') 
            ? parseInt(String(row.radius), 10) 
            : 100;
          const kuota_pkl = (row.kuota_pkl !== undefined && row.kuota_pkl !== null && row.kuota_pkl !== '') 
            ? parseInt(String(row.kuota_pkl), 10) 
            : 0;

          let mou_tanggal_mulai: Date | null = null;
          if (row.mou_tanggal_mulai) {
            const d = new Date(row.mou_tanggal_mulai);
            if (!isNaN(d.getTime())) mou_tanggal_mulai = d;
          }

          let mou_tanggal_berakhir: Date | null = null;
          if (row.mou_tanggal_berakhir) {
            const d = new Date(row.mou_tanggal_berakhir);
            if (!isNaN(d.getTime())) mou_tanggal_berakhir = d;
          }

          const dataToSave = {
            bidang: cleanStr(row.bidang),
            alamat: cleanStr(row.alamat),
            kontak: cleanStr(row.kontak),
            latitude: (latitude !== null && !isNaN(latitude)) ? latitude : null,
            longitude: (longitude !== null && !isNaN(longitude)) ? longitude : null,
            radius: (radius !== null && !isNaN(radius)) ? radius : 100,
            pic_nama: cleanStr(row.pic_nama),
            pic_jabatan: cleanStr(row.pic_jabatan),
            pic_telepon: cleanStr(row.pic_telepon),
            pic_email: cleanStr(row.pic_email),
            mou_nomor: cleanStr(row.mou_nomor),
            mou_tanggal_mulai,
            mou_tanggal_berakhir,
            mou_status: cleanStr(row.mou_status) || 'AKTIF',
            kuota_pkl: (kuota_pkl !== null && !isNaN(kuota_pkl)) ? kuota_pkl : 0,
            kompetensi_keahlian: cleanStr(row.kompetensi_keahlian),
          };

          const existing = await prisma.mitraIndustri.findFirst({
            where: {
              tenant_id: tenantId,
              nama: { equals: nama, mode: 'insensitive' }
            }
          });

          if (existing) {
            await prisma.mitraIndustri.update({
              where: { id: existing.id },
              data: {
                ...dataToSave,
                nama: existing.nama
              }
            });
            updatedCount++;
          } else {
            await prisma.mitraIndustri.create({
              data: {
                tenant_id: tenantId,
                nama,
                ...dataToSave
              }
            });
            createdCount++;
          }
        } catch (err: any) {
          failCount++;
          errors.push({
            row: rowNumber,
            nama,
            message: err.message || 'Gagal menyimpan baris data',
            reason: err.message || 'Gagal menyimpan baris data'
          });
        }
      }));

      if (onProgress) {
        const current = Math.min(rows.length, i + BATCH_SIZE);
        const progress = Math.round((current / rows.length) * 100);
        onProgress({
          current,
          total: rows.length,
          progress,
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
          failed: failCount
        });
      }
    }

    this.log(tenantId, actorUserId || null, 'HUBIN_MITRA_IMPORT', 'MitraIndustri', null, {
      total: rows.length,
      created: createdCount,
      updated: updatedCount,
      failed: failCount,
      skipped: skippedCount
    });

    await cacheInvalidationService.invalidateHubinCache(tenantId);

    return {
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      failed: failCount,
      errors
    };
  }

  /**
   * --- 2. MANAJEMEN PENEMPATAN PKL ---
   */

  async getMoUHistory(tenantId: string, mitraId: string) {
    return await prisma.hubinMoUHistory.findMany({
      where: { tenant_id: tenantId, mitra_id: mitraId, deleted_at: null },
      orderBy: { tanggal_mulai: 'desc' }
    });
  }

  async createMoUHistory(tenantId: string, mitraId: string, data: any, actorUserId?: string | null) {
    const history = await prisma.hubinMoUHistory.create({
      data: {
        ...data,
        mitra_id: mitraId,
        tenant_id: tenantId,
        tanggal_mulai: data.tanggal_mulai ? new Date(data.tanggal_mulai) : new Date(),
        tanggal_selesai: data.tanggal_selesai ? new Date(data.tanggal_selesai) : new Date()
      }
    });

    await prisma.mitraIndustri.update({
      where: { id: mitraId },
      data: {
        mou_nomor: data.mou_nomor,
        mou_tanggal_mulai: data.tanggal_mulai ? new Date(data.tanggal_mulai) : null,
        mou_tanggal_berakhir: data.tanggal_selesai ? new Date(data.tanggal_selesai) : null,
        mou_status: 'AKTIF'
      }
    });

    this.log(tenantId, actorUserId || null, 'HUBIN_MOU_CREATE', 'HubinMoUHistory', history.id, { mou_nomor: history.mou_nomor });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return history;
  }

  async deleteMoUHistory(tenantId: string, id: string, actorUserId?: string | null) {
    const result = await prisma.hubinMoUHistory.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_MOU_DELETE', 'HubinMoUHistory', id, { mou_nomor: result.mou_nomor });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return result;
  }

  // --- 6. BURSA KERJA KHUSUS (BKK) - LOWONGAN ---
}
