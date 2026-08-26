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

export class HubinAbsensiService {
  async getAbsensiSiswa(tenantId: string, siswaPklId: string, params?: { page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;

    const where = { tenant_id: tenantId, siswa_pkl_id: siswaPklId };

    const [total, data] = await Promise.all([
      prisma.absensiPkl.count({ where }),
      prisma.absensiPkl.findMany({
        where,
        orderBy: { tanggal: 'desc' },
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

  async checkIn(tenantId: string, siswaPklId: string, data: { latitude: number; longitude: number; accuracy?: number; kegiatan?: string; image_url?: string; is_dinas_luar?: boolean; address_snapshot?: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get PKL detail to check geofence
    const pkl = await prisma.siswaPkl.findUnique({
      where: { id: siswaPklId },
      include: { Mitra: true }
    });
    if (!pkl) throw new Error('Data penempatan PKL tidak ditemukan');

    // Anti-Fraud: Accuracy Validation (Standard SaaS Enterprise Audit)
    if (data.accuracy !== undefined && data.accuracy < 1) {
       console.warn(`[Anti-Fraud] Suspicious accuracy detected: ${data.accuracy}m for SiswaPkl: ${siswaPklId}`);
    }

    const targetLat = pkl.lat_override || pkl.Mitra.latitude;
    const targetLon = pkl.lon_override || pkl.Mitra.longitude;
    const radius = pkl.radius_override || pkl.Mitra.radius || 100;

    // Advanced Geofencing Refinement: Caching last known good location for weak signal areas
    if (data.accuracy && data.accuracy > 100 && targetLat && targetLon) {
      const lastGood = await prisma.absensiPkl.findFirst({
        where: {
          siswa_pkl_id: siswaPklId,
          is_outside_radius: false,
          latitude_masuk: { not: null },
          longitude_masuk: { not: null },
        },
        orderBy: { tanggal: 'desc' },
      });

      if (lastGood && lastGood.latitude_masuk && lastGood.longitude_masuk) {
        const distToLastGood = this.calculateDistance(
          data.latitude,
          data.longitude,
          lastGood.latitude_masuk,
          lastGood.longitude_masuk
        );
        // If they are within 150m of their last known good check-in location, we assume they are at the same site
        if (distToLastGood < 150) {
          console.log(`[Geofencing-Cache] Weak signal. Caching applied. Dist to last good: ${Math.round(distToLastGood)}m`);
          data.latitude = lastGood.latitude_masuk;
          data.longitude = lastGood.longitude_masuk;
        }
      }
    }

    let isOutsideRadius = false;
    let distanceMeters = 0;

    if (targetLat && targetLon) {
      const distance = this.calculateDistance(
        data.latitude,
        data.longitude,
        targetLat,
        targetLon
      );
      distanceMeters = Math.round(distance);

      if (distance > radius) {
        // Jika siswa mencentang "Dinas Luar" atau jika profilnya "Flexible Location"
        if (data.is_dinas_luar || pkl.is_flexible_location) {
          isOutsideRadius = true;
        } else {
          throw new Error(`Anda berada di luar jangkauan area PKL (${Math.round(distance)}m). Jika Anda sedang tugas luar, silakan gunakan mode 'Dinas Luar'.`);
        }
      }
    }

    // Check if already checked in today
    const existing = await prisma.absensiPkl.findFirst({
      where: {
        siswa_pkl_id: siswaPklId,
        tanggal: today
      }
    });

    if (existing) {
      const res = await prisma.absensiPkl.update({
        where: { id: existing.id },
        data: {
          jam_masuk: new Date(),
          latitude_masuk: data.latitude,
          longitude_masuk: data.longitude,
          kegiatan: data.kegiatan,
          image_url: data.image_url,
          is_outside_radius: isOutsideRadius,
          distance_meters: distanceMeters,
          address_snapshot: data.address_snapshot || existing.address_snapshot
        }
      });
      await cacheInvalidationService.invalidateHubinCache(tenantId);
      return res;
    }

    const res = await prisma.absensiPkl.create({
      data: {
        tenant_id: tenantId,
        siswa_pkl_id: siswaPklId,
        tanggal: today,
        jam_masuk: new Date(),
        latitude_masuk: data.latitude,
        longitude_masuk: data.longitude,
        kegiatan: data.kegiatan,
        image_url: data.image_url,
        status: 'HADIR',
        is_outside_radius: isOutsideRadius,
        distance_meters: distanceMeters,
        address_snapshot: data.address_snapshot,
        // Jika di luar radius, otomatis belum terverifikasi meskipun ada bypass global (opsional)
        is_verified: isOutsideRadius ? false : false 
      }
    });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return res;
  }

  async checkOut(tenantId: string, siswaPklId: string, data: { latitude: number; longitude: number; accuracy?: number; kegiatan?: string; image_url?: string; is_dinas_luar?: boolean; address_snapshot?: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.absensiPkl.findFirst({
      where: {
        tenant_id: tenantId,
        siswa_pkl_id: siswaPklId,
        tanggal: today
      }
    });

    if (!existing) {
      throw new Error('Anda belum melakukan Check-In hari ini');
    }

    // Anti-Fraud: Accuracy Validation
    if (data.accuracy !== undefined && data.accuracy < 1) {
       console.warn(`[Anti-Fraud] Suspicious accuracy detected: ${data.accuracy}m during Check-Out`);
    }

    // Geofencing check for Checkout (Optional, usually less strict)
    // But we still record if they are outside
    const pkl = await prisma.siswaPkl.findUnique({
      where: { id: siswaPklId },
      include: { Mitra: true }
    });
    let isOutsideRadius = existing.is_outside_radius;
    if (pkl && (pkl.lat_override || pkl.Mitra.latitude)) {
      const targetLat = pkl.lat_override || pkl.Mitra.latitude as number;
      const targetLon = pkl.lon_override || pkl.Mitra.longitude as number;
      const radius = pkl.radius_override || pkl.Mitra.radius || 100;

      // Advanced Geofencing Refinement: Caching last known good location for weak signal areas
      if (data.accuracy && data.accuracy > 100) {
        const lastGood = await prisma.absensiPkl.findFirst({
          where: {
            siswa_pkl_id: siswaPklId,
            is_outside_radius: false,
            latitude_masuk: { not: null },
            longitude_masuk: { not: null },
          },
          orderBy: { tanggal: 'desc' },
        });

        if (lastGood && lastGood.latitude_masuk && lastGood.longitude_masuk) {
          const distToLastGood = this.calculateDistance(
            data.latitude,
            data.longitude,
            lastGood.latitude_masuk,
            lastGood.longitude_masuk
          );
          if (distToLastGood < 150) {
            console.log(`[Geofencing-Cache] Weak signal during checkout. Using last known good location. Dist: ${Math.round(distToLastGood)}m`);
            data.latitude = lastGood.latitude_masuk;
            data.longitude = lastGood.longitude_masuk;
          }
        }
      }

      const distance = this.calculateDistance(data.latitude, data.longitude, targetLat, targetLon);
      if (distance > radius) {
        isOutsideRadius = true;
      }
    }
    const res = await prisma.absensiPkl.update({
      where: { id: existing.id },
      data: {
        jam_pulang: new Date(),
        latitude_pulang: data.latitude,
        longitude_pulang: data.longitude,
        kegiatan: data.kegiatan || existing.kegiatan,
        image_url_out: data.image_url || existing.image_url_out,
        is_outside_radius: isOutsideRadius,
        address_snapshot: data.address_snapshot || existing.address_snapshot
      }
    });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return res;
  }

  async updateLogbook(tenantId: string, siswaPklId: string, data: { kegiatan: string; absensiId?: string; image_url?: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let existing;
    if (data.absensiId) {
      existing = await prisma.absensiPkl.findFirst({
        where: { id: data.absensiId, tenant_id: tenantId }
      });
    } else {
      existing = await prisma.absensiPkl.findFirst({
        where: {
          tenant_id: tenantId,
          siswa_pkl_id: siswaPklId,
          tanggal: today
        }
      });
    }

    if (!existing) {
      throw new Error('Data absensi tidak ditemukan');
    }

    const res = await prisma.absensiPkl.update({
      where: { id: existing.id },
      data: {
        kegiatan: data.kegiatan,
        image_url: data.image_url || existing.image_url
      }
    });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return res;
  }

  async syncOfflineLogbook(
    tenantId: string, 
    siswaPklId: string, 
    logs: Array<{ 
      tanggal: string; 
      jam_masuk: string; 
      jam_pulang?: string; 
      kegiatan: string; 
      latitude_masuk: number; 
      longitude_masuk: number; 
      latitude_pulang?: number; 
      longitude_pulang?: number; 
      accuracy?: number; 
      is_dinas_luar?: boolean; 
      address_snapshot?: string;
    }>
  ) {
    const pkl = await prisma.siswaPkl.findUnique({
      where: { id: siswaPklId },
      include: { Mitra: true }
    });

    if (!pkl) throw new Error('Data penempatan PKL tidak ditemukan');

    const results: any[] = [];

    for (const log of logs) {
      try {
        const logDate = new Date(log.tanggal);
        logDate.setHours(0, 0, 0, 0);

        let isOutsideRadius = false;
        let distanceMeters = 0;

        const targetLat = pkl.lat_override || pkl.Mitra.latitude;
        const targetLon = pkl.lon_override || pkl.Mitra.longitude;
        const radius = pkl.radius_override || pkl.Mitra.radius || 100;

        // Geofencing Check for check-in location
        if (targetLat && targetLon) {
          const distance = this.calculateDistance(
            log.latitude_masuk,
            log.longitude_masuk,
            targetLat,
            targetLon
          );
          distanceMeters = Math.round(distance);

          if (distance > radius) {
            isOutsideRadius = true; // Flag as outside radius
          }
        }

        // Check if absensi for this date already exists
        const existing = await prisma.absensiPkl.findFirst({
          where: {
            siswa_pkl_id: siswaPklId,
            tanggal: logDate
          }
        });

        const entryData = {
          tenant_id: tenantId,
          siswa_pkl_id: siswaPklId,
          tanggal: logDate,
          jam_masuk: new Date(log.jam_masuk),
          jam_pulang: log.jam_pulang ? new Date(log.jam_pulang) : null,
          latitude_masuk: log.latitude_masuk,
          longitude_masuk: log.longitude_masuk,
          latitude_pulang: log.latitude_pulang !== undefined ? log.latitude_pulang : null,
          longitude_pulang: log.longitude_pulang !== undefined ? log.longitude_pulang : null,
          kegiatan: log.kegiatan,
          is_outside_radius: isOutsideRadius,
          distance_meters: distanceMeters,
          address_snapshot: log.address_snapshot || null,
          is_verified: !isOutsideRadius, // automatically verify if inside radius
          status: 'HADIR'
        };

        let savedRecord;
        if (existing) {
          savedRecord = await prisma.absensiPkl.update({
            where: { id: existing.id },
            data: entryData
          });
        } else {
          savedRecord = await prisma.absensiPkl.create({
            data: entryData
          });
        }

        results.push({
          tanggal: log.tanggal,
          status: 'SUCCESS',
          id: savedRecord.id,
          is_outside_radius: isOutsideRadius
        });
      } catch (err: any) {
        results.push({
          tanggal: log.tanggal,
          status: 'FAILED',
          error: err.message
        });
      }
    }
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return results;
  }


  async addKunjungan(tenantId: string, id: string, data: any, requesterId?: string, org?: any) {
    if (requesterId) {
      await this.ensureOwnership(tenantId, id, requesterId, org);
    }
    const existing = await prisma.siswaPkl.findFirst({
      where: { id, tenant_id: tenantId }
    });
    if (!existing) throw new Error('Data penempatan PKL tidak ditemukan');

    let kunjunganList: any[] = [];
    if (existing.kunjungan_json) {
      if (Array.isArray(existing.kunjungan_json)) {
        kunjunganList = existing.kunjungan_json;
      } else {
        try {
          kunjunganList = JSON.parse(existing.kunjungan_json as string);
        } catch (e) {
          kunjunganList = [];
        }
      }
    }

    kunjunganList.push({
      id: crypto.randomBytes(8).toString('hex'),
      tanggal: new Date().toISOString(),
      ...data
    });

    const res = await prisma.siswaPkl.update({ 
      where: { id },
      data: {
        kunjungan_json: kunjunganList
      }
    });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return res;
  }

  async submitJurnalPortofolio(tenantId: string, id: string, data: { file_url: string }) {
    const res = await prisma.siswaPkl.update({
      where: { id, tenant_id: tenantId },
      data: {
        jurnal_json: {
          file_url: data.file_url,
          status: 'MENUNGGU_REVIEW',
          submitted_at: new Date().toISOString()
        }
      }
    });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return res;
  }

  async reviewJurnalPortofolio(tenantId: string, id: string, data: { status: string; catatan?: string }, requesterId?: string, org?: any) {
    if (requesterId) {
      await this.ensureOwnership(tenantId, id, requesterId, org);
    }
    const existing = await prisma.siswaPkl.findFirst({
      where: { id, tenant_id: tenantId }
    });
    if (!existing) throw new Error('Data penempatan PKL tidak ditemukan');

    let currentJurnal: any = {};
    if (existing.jurnal_json) {
      if (typeof existing.jurnal_json === 'object') {
        currentJurnal = existing.jurnal_json;
      } else {
        try {
          currentJurnal = JSON.parse(existing.jurnal_json as string);
        } catch (e) {
          // ignore
        }
      }
    }

    const res = await prisma.siswaPkl.update({
      where: { id },
      data: {
        jurnal_json: {
          ...currentJurnal,
          status: data.status,
          catatan_revisi: data.catatan || '',
          reviewed_at: new Date().toISOString()
        }
      }
    });
    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return res;
  }

}
