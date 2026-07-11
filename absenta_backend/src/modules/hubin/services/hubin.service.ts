import { prisma } from '../../../utils/prisma';
import crypto from 'crypto';
import { activityLogService } from '../../activity/services/activity-log.service';
import { studentResolverService } from '../../../services/student-resolver.service';
import { waGatewayService } from '../../../services/wa-gateway.service';
import { getRedisConnection } from '@/queue/redis';

export class HubinService {
  private log(tenantId: string, userId: string | null, event: string, entity: string, entityId?: string | null, metadata?: any) {
    try {
      activityLogService.logEvent({
        event_type: event,
        tenant_id: tenantId,
        user_id: userId,
        entity,
        entity_id: entityId,
        metadata
      });

      // Emit real-time event via Redis Pub/Sub
      queueMicrotask(async () => {
        try {
          const redis = getRedisConnection();
          let actorName = 'System / Anonim';
          if (userId) {
            const userObj = await prisma.user.findUnique({
              where: { id: userId },
              select: { full_name: true }
            });
            if (userObj?.full_name) {
              actorName = userObj.full_name;
            }
          }
          const payload = {
            id: crypto.randomUUID(),
            action: event,
            actor: actorName,
            entity,
            entity_id: entityId,
            metadata: metadata || null,
            created_at: new Date().toISOString(),
            tenant_id: tenantId
          };
          await redis.publish('events:hubin_activity_update', JSON.stringify(payload));
        } catch (wsErr) {
          console.error('[WS HUBIN LOG] Failed to publish real-time update:', wsErr);
        }
      });
    } catch (err) {
      console.error(`Failed to log HUBIN event ${event}:`, err);
    }
  }

  /**
   * --- 1. MANAJEMEN MITRA INDUSTRI ---
   */
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
    return result;
  }

  async deleteMitra(tenantId: string, id: string, actorUserId?: string | null) {
    const result = await prisma.mitraIndustri.delete({
      where: { id, tenant_id: tenantId },
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_MITRA_DELETE', 'MitraIndustri', id, { nama: result.nama });
    return result;
  }

  /**
   * --- 2. MANAJEMEN PENEMPATAN PKL ---
   */
  async getPenempatan(tenantId: string, userId?: string, params?: { search?: string; page?: number; limit?: number }, org?: any) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;
    
    let where: any = { tenant_id: tenantId };
    let andConditions: any[] = [];

    // Enterprise Scoping Logic
    if (org) {
      if (org.tenant_wide !== true) {
        if (org.is_unit_restricted === true && Array.isArray(org.unit_ids) && org.unit_ids.length > 0) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { Guru: true }
          });
          const scopeOr: any[] = [
            {
              Siswa: {
                Kelas: {
                  jurusan_id: { in: org.unit_ids }
                }
              }
            }
          ];
          if (user?.Guru?.id) {
            scopeOr.push({ pembimbing_id: user.Guru.id });
          }
          andConditions.push({ OR: scopeOr });
        } else {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { Guru: true }
          });
          if (user?.Guru?.id) {
            andConditions.push({ pembimbing_id: user.Guru.id });
          }
        }
      }
    } else if (userId) {
      // Fallback untuk legacy / non-middleware calls
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          Guru: true,
          Role: {
            include: { rolePermissions: true }
          },
          organizationalAssignments: {
            where: { is_active: true },
            include: { Position: true }
          }
        }
      });

      const isGlobalHubin = user?.Role?.name === 'ADMIN' || 
                           user?.organizationalAssignments.some((oa: any) => oa.Position.code === 'HUBIN') ||
                           user?.Role?.rolePermissions.some((rp: any) => rp.permission_id === 'hubin.partners.manage');

      if (!isGlobalHubin && user?.Guru?.id) {
        andConditions.push({ pembimbing_id: user.Guru.id });
      }
    }

    if (params?.search) {
      andConditions.push({
        OR: [
          { Siswa: { nama_siswa: { contains: params.search, mode: 'insensitive' } } },
          { Mitra: { nama: { contains: params.search, mode: 'insensitive' } } },
          { Pembimbing: { nama_guru: { contains: params.search, mode: 'insensitive' } } },
        ]
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [total, data] = await Promise.all([
      prisma.siswaPkl.count({ where }),
      prisma.siswaPkl.findMany({
        where,
        include: {
          Siswa: { 
            include: { 
              Kelas: { select: { id: true, nama_kelas: true } } 
            } 
          },
          Mitra: { select: { nama: true, latitude: true, longitude: true, radius: true, alamat: true } },
          Pembimbing: { select: { nama_guru: true, no_hp: true } },
          AbsensiPkl: {
            orderBy: { tanggal: 'desc' },
            take: 1
          }
        },
        orderBy: { created_at: 'desc' },
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

  async getPenempatanBySiswa(tenantId: string, userId: string) {
    const studentId = await studentResolverService.resolveSiswaId(tenantId, userId);
    if (!studentId) return null;

    return await prisma.siswaPkl.findFirst({
      where: { tenant_id: tenantId, siswa_id: studentId },
      include: {
        Siswa: { 
          include: { 
            Kelas: { select: { id: true, nama_kelas: true } } 
          } 
        },
        Mitra: { select: { nama: true, latitude: true, longitude: true, radius: true } },
        Pembimbing: { select: { nama_guru: true, no_hp: true } },
      },
    });
  }

  async createPenempatan(tenantId: string, data: any, actorUserId?: string | null, org?: any) {
    if (org && org.tenant_wide !== true) {
      if (org.is_unit_restricted === true && Array.isArray(org.unit_ids) && org.unit_ids.length > 0) {
        const student = await prisma.siswa.findFirst({
          where: {
            id: data.siswa_id,
            tenant_id: tenantId,
            Kelas: {
              jurusan_id: { in: org.unit_ids }
            }
          }
        });
        if (!student) {
          throw new Error('Akses ditolak: Siswa tidak berada di bawah program keahlian Anda.');
        }
      }
    }

    // Ambil info akademik saat ini
    const siswa = await prisma.siswa.findUnique({
      where: { id: data.siswa_id },
      select: { kelas_id: true, tahun_pelajaran_id: true, semester_id: true, nama_siswa: true }
    });

    let siswaAkademikId: string | undefined;
    if (siswa && siswa.tahun_pelajaran_id && siswa.semester_id) {
      const sa = await prisma.siswaAkademik.findFirst({
        where: {
          siswa_id: data.siswa_id,
          kelas_id: siswa.kelas_id,
          tahun_pelajaran_id: siswa.tahun_pelajaran_id,
          semester_id: siswa.semester_id
        }
      });
      siswaAkademikId = sa?.id;
    }

    const result = await prisma.siswaPkl.create({
      data: {
        ...data,
        tenant_id: tenantId,
        siswa_akademik_id: siswaAkademikId,
      },
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_PKL_PLACE', 'SiswaPkl', result.id, { siswa_nama: siswa?.nama_siswa });
    return result;
  }

  async updatePenempatan(tenantId: string, id: string, data: any, actorUserId?: string | null, org?: any) {
    if (org && org.tenant_wide !== true) {
      if (org.is_unit_restricted === true && Array.isArray(org.unit_ids) && org.unit_ids.length > 0) {
        const user = await prisma.user.findUnique({
          where: { id: actorUserId || '' },
          include: { Guru: true }
        });
        const existing = await prisma.siswaPkl.findFirst({
          where: {
            id,
            tenant_id: tenantId,
            OR: [
              {
                Siswa: {
                  Kelas: {
                    jurusan_id: { in: org.unit_ids }
                  }
                }
              },
              ...(user?.Guru?.id ? [{ pembimbing_id: user.Guru.id }] : [])
            ]
          }
        });
        if (!existing) {
          throw new Error('Akses ditolak: Penempatan siswa tidak berada di bawah program keahlian Anda.');
        }
      }
    }

    const updateData: any = { ...data };
    if (updateData.tanggal_mulai) {
      updateData.tanggal_mulai = new Date(updateData.tanggal_mulai);
    }
    if (updateData.tanggal_selesai !== undefined) {
      updateData.tanggal_selesai = updateData.tanggal_selesai ? new Date(updateData.tanggal_selesai) : null;
    }

    const result = await prisma.siswaPkl.update({
      where: { id, tenant_id: tenantId },
      data: updateData,
      include: { Siswa: { select: { nama_siswa: true } } }
    });

    this.log(tenantId, actorUserId || null, 'HUBIN_PKL_UPDATE', 'SiswaPkl', id, { 
      siswa_nama: result.Siswa?.nama_siswa, 
      status: result.status 
    });
    return result;
  }

  async bulkCreatePenempatan(tenantId: string, data: any, actorUserId?: string | null, org?: any) {
    const { siswa_ids, mitra_id, pembimbing_id, tanggal_mulai, tanggal_selesai, status } = data;
    if (!Array.isArray(siswa_ids) || siswa_ids.length === 0) {
      throw new Error('siswa_ids must be a non-empty array');
    }

    if (org && org.tenant_wide !== true) {
      if (org.is_unit_restricted === true && Array.isArray(org.unit_ids) && org.unit_ids.length > 0) {
        for (const siswaId of siswa_ids) {
          const student = await prisma.siswa.findFirst({
            where: {
              id: siswaId,
              tenant_id: tenantId,
              Kelas: {
                jurusan_id: { in: org.unit_ids }
              }
            }
          });
          if (!student) {
            throw new Error('Akses ditolak: Salah satu siswa tidak berada di bawah program keahlian Anda.');
          }
        }
      }
    }

    const results = [];
    for (const siswaId of siswa_ids) {
      const siswa = await prisma.siswa.findUnique({
        where: { id: siswaId },
        select: { kelas_id: true, tahun_pelajaran_id: true, semester_id: true, nama_siswa: true }
      });

      let siswaAkademikId: string | undefined;
      if (siswa && siswa.tahun_pelajaran_id && siswa.semester_id) {
        const sa = await prisma.siswaAkademik.findFirst({
          where: {
            siswa_id: siswaId,
            kelas_id: siswa.kelas_id,
            tahun_pelajaran_id: siswa.tahun_pelajaran_id,
            semester_id: siswa.semester_id
          }
        });
        siswaAkademikId = sa?.id;
      }

      const res = await prisma.siswaPkl.create({
        data: {
          tenant_id: tenantId,
          siswa_id: siswaId,
          siswa_akademik_id: siswaAkademikId,
          mitra_id,
          pembimbing_id: pembimbing_id || null,
          tanggal_mulai: tanggal_mulai ? new Date(tanggal_mulai) : new Date(),
          tanggal_selesai: tanggal_selesai ? new Date(tanggal_selesai) : null,
          status: status || 'AKTIF'
        }
      });

      this.log(tenantId, actorUserId || null, 'HUBIN_PKL_PLACE', 'SiswaPkl', res.id, { siswa_nama: siswa?.nama_siswa });
      results.push(res);
    }
    return results;
  }

  async deletePenempatan(tenantId: string, id: string, actorUserId?: string | null, org?: any) {
    if (org && org.tenant_wide !== true) {
      if (org.is_unit_restricted === true && Array.isArray(org.unit_ids) && org.unit_ids.length > 0) {
        const user = await prisma.user.findUnique({
          where: { id: actorUserId || '' },
          include: { Guru: true }
        });
        const existing = await prisma.siswaPkl.findFirst({
          where: {
            id,
            tenant_id: tenantId,
            OR: [
              {
                Siswa: {
                  Kelas: {
                    jurusan_id: { in: org.unit_ids }
                  }
                }
              },
              ...(user?.Guru?.id ? [{ pembimbing_id: user.Guru.id }] : [])
            ]
          }
        });
        if (!existing) {
          throw new Error('Akses ditolak: Penempatan siswa tidak berada di bawah program keahlian Anda.');
        }
      }
    }

    const result = await prisma.siswaPkl.delete({
      where: { id, tenant_id: tenantId },
      include: { Siswa: { select: { nama_siswa: true } } }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_PKL_REMOVE', 'SiswaPkl', id, { siswa_nama: result.Siswa?.nama_siswa });
    return result;
  }

  /**
   * --- 3. ABSENSI & LOGBOOK PKL ---
   */
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
      return await prisma.absensiPkl.update({
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
    }

    return await prisma.absensiPkl.create({
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
    return await prisma.absensiPkl.update({
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

    return await prisma.absensiPkl.update({
      where: { id: existing.id },
      data: {
        kegiatan: data.kegiatan,
        image_url: data.image_url || existing.image_url
      }
    });
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

    return results;
  }

  async updatePenilaian(tenantId: string, id: string, nilai: any, requesterId?: string, org?: any) {
    if (requesterId) {
      await this.ensureOwnership(tenantId, id, requesterId, org);
    }
    return await prisma.siswaPkl.update({
      where: { id, tenant_id: tenantId },
      data: {
        nilai_json: nilai
      }
    });
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

    return await prisma.siswaPkl.update({ 
      where: { id },
      data: {
        kunjungan_json: kunjunganList
      }
    });
  }

  async submitJurnalPortofolio(tenantId: string, id: string, data: { file_url: string }) {
    return await prisma.siswaPkl.update({
      where: { id, tenant_id: tenantId },
      data: {
        jurnal_json: {
          file_url: data.file_url,
          status: 'MENUNGGU_REVIEW',
          submitted_at: new Date().toISOString()
        }
      }
    });
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

    return await prisma.siswaPkl.update({
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
    
    return await prisma.absensiPkl.update({
      where: { id },
      data: {
        is_verified: true,
        verified_by: requesterId,
        verifikasi_at: new Date()
      }
    });
  }

  // --- 5. MANAJEMEN RIWAYAT MoU (MoU History) ---
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
    return history;
  }

  async deleteMoUHistory(tenantId: string, id: string, actorUserId?: string | null) {
    const result = await prisma.hubinMoUHistory.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_MOU_DELETE', 'HubinMoUHistory', id, { mou_nomor: result.mou_nomor });
    return result;
  }

  // --- 6. BURSA KERJA KHUSUS (BKK) - LOWONGAN ---
  async getLowongan(tenantId: string, params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (params?.status) {
      where.status = params.status;
    }
    if (params?.search) {
      where.OR = [
        { judul_posisi: { contains: params.search, mode: 'insensitive' } },
        { perusahaan_nama: { contains: params.search, mode: 'insensitive' } },
        { deskripsi: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await Promise.all([
      prisma.hubinLowongan.count({ where }),
      prisma.hubinLowongan.findMany({
        where,
        include: {
          Mitra: { select: { nama: true, alamat: true } }
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

  async createLowongan(tenantId: string, data: any, actorUserId?: string | null) {
    const result = await prisma.hubinLowongan.create({
      data: {
        ...data,
        tenant_id: tenantId,
        tanggal_tutup: new Date(data.tanggal_tutup),
        kuota: data.kuota ? parseInt(data.kuota) : 1
      }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_LOWONGAN_CREATE', 'HubinLowongan', result.id, { posisi: result.judul_posisi });
    return result;
  }

  async updateLowongan(tenantId: string, id: string, data: any, actorUserId?: string | null) {
    const updateData = { ...data };
    if (data.tanggal_tutup) updateData.tanggal_tutup = new Date(data.tanggal_tutup);
    if (data.kuota) updateData.kuota = parseInt(data.kuota);
    const result = await prisma.hubinLowongan.update({
      where: { id, tenant_id: tenantId },
      data: updateData
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_LOWONGAN_UPDATE', 'HubinLowongan', id, { posisi: result.judul_posisi });
    return result;
  }

  async deleteLowongan(tenantId: string, id: string, actorUserId?: string | null) {
    const result = await prisma.hubinLowongan.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_LOWONGAN_DELETE', 'HubinLowongan', id, { posisi: result.judul_posisi });
    return result;
  }

  // --- 7. BURSA KERJA KHUSUS (BKK) - LAMARAN ---
  async getLamaran(tenantId: string, params?: { lowonganId?: string; status?: string; siswaId?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (params?.lowonganId) where.lowongan_id = params.lowonganId;
    if (params?.status) where.status_seleksi = params.status;
    if (params?.siswaId) where.siswa_id = params.siswaId;

    const [total, data] = await Promise.all([
      prisma.hubinLamaran.count({ where }),
      prisma.hubinLamaran.findMany({
        where,
        include: {
          Lowongan: { select: { judul_posisi: true, perusahaan_nama: true } },
          Siswa: { 
            select: { 
              nama_siswa: true, 
              nis: true, 
              no_hp: true,
              User: { select: { email: true } }
            } 
          }
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

  async createLamaran(tenantId: string, data: any, actorUserId?: string | null) {
    const result = await prisma.hubinLamaran.create({
      data: { ...data, tenant_id: tenantId }
    });
    // Create initial log entry
    await (prisma as any).hubinLamaranLog.create({
      data: {
        lamaran_id: result.id,
        tenant_id: tenantId,
        status_dari: null,
        status_ke: 'TERKIRIM',
        catatan: 'Lamaran berhasil dikirim',
        created_by: actorUserId || null,
      }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_LAMARAN_CREATE', 'HubinLamaran', result.id, { lowongan_id: result.lowongan_id });
    return result;
  }

  async updateLamaranStatus(
    tenantId: string,
    id: string,
    status: string,
    catatan?: string,
    actorUserId?: string | null
  ) {
    // Fetch current status before update (for log)
    const current = await prisma.hubinLamaran.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        Siswa: { 
          select: { 
            id: true,
            nama_siswa: true, 
            no_hp: true,
            tanggal_keluar: true,
            tahun_pelajaran_id: true
          } 
        },
        Lowongan: { select: { judul_posisi: true, perusahaan_nama: true } },
      }
    });
    if (!current) throw new Error('Lamaran tidak ditemukan');

    const result = await prisma.hubinLamaran.update({
      where: { id, tenant_id: tenantId },
      data: { status_seleksi: status, catatan }
    });

    // Write audit log
    await (prisma as any).hubinLamaranLog.create({
      data: {
        lamaran_id: id,
        tenant_id: tenantId,
        status_dari: current.status_seleksi,
        status_ke: status,
        catatan: catatan || null,
        created_by: actorUserId || null,
      }
    });

    this.log(tenantId, actorUserId || null, 'HUBIN_LAMARAN_STATUS', 'HubinLamaran', id, { status_seleksi: status });

    // Send WA notification to alumni (soft — won't throw if WA not connected)
    const noHp = current.Siswa?.no_hp;
    if (noHp) {
      const statusLabels: Record<string, string> = {
        PROSES: 'sedang diproses secara administrasi',
        INTERVIEW: 'dijadwalkan untuk interview',
        DITERIMA: 'DITERIMA! 🎉 Selamat!',
        DITOLAK: 'tidak berhasil pada seleksi kali ini',
      };
      const label = statusLabels[status];
      if (label) {
        const pesan = [
          `*[Absenta - BKK Notifikasi]*`,
          `Halo ${current.Siswa?.nama_siswa || 'Alumni'},`,
          ``,
          `Lamaran Anda untuk posisi *${current.Lowongan?.judul_posisi}* di *${current.Lowongan?.perusahaan_nama}* ${label}.`,
          status === 'DITOLAK' && catatan ? `\nCatatan: ${catatan}` : '',
          ``,
          `Pantau terus status lamaran Anda di platform Absenta.`,
        ].filter(Boolean).join('\n');
        waGatewayService.sendMessageSoft(tenantId, noHp, pesan);
      }
    }

    // Automate Tracer Study if status is DITERIMA
    if (status === 'DITERIMA' && current.siswa_id) {
      try {
        let graduationYear = new Date().getFullYear();
        
        if (current.Siswa?.tanggal_keluar) {
          graduationYear = new Date(current.Siswa.tanggal_keluar).getFullYear();
        } else if (current.Siswa?.tahun_pelajaran_id) {
          const tapel = await prisma.tahunPelajaran.findFirst({
            where: { id: current.Siswa.tahun_pelajaran_id }
          });
          if (tapel?.tahun) {
            const parts = tapel.tahun.split('/');
            if (parts.length === 2) {
              const parsed = parseInt(parts[1]);
              if (!isNaN(parsed)) {
                graduationYear = parsed;
              }
            }
          }
        }

        await prisma.hubinTracerStudy.upsert({
          where: { siswa_id: current.siswa_id },
          update: {
            status_alumni: 'BEKERJA',
            perusahaan_nama: current.Lowongan?.perusahaan_nama || null,
            posisi: current.Lowongan?.judul_posisi || null,
            deleted_at: null,
          },
          create: {
            tenant_id: tenantId,
            siswa_id: current.siswa_id,
            tahun_lulus: graduationYear,
            status_alumni: 'BEKERJA',
            perusahaan_nama: current.Lowongan?.perusahaan_nama || null,
            posisi: current.Lowongan?.judul_posisi || null,
          }
        });

        this.log(tenantId, actorUserId || null, 'HUBIN_TRACER_SUBMIT', 'HubinTracerStudy', current.siswa_id, { 
          status_alumni: 'BEKERJA', 
          auto: true 
        });
      } catch (err) {
        console.error('[BKK-Tracer-Otomasi] Gagal update tracer study:', err);
      }
    }

    return result;
  }

  async deleteLamaran(tenantId: string, id: string, actorUserId?: string | null) {
    const current = await prisma.hubinLamaran.findFirst({
      where: { id, tenant_id: tenantId, deleted_at: null },
      include: {
        Siswa: { select: { nama_siswa: true } },
        Lowongan: { select: { judul_posisi: true } }
      }
    });
    if (!current) throw new Error('Lamaran tidak ditemukan atau sudah dihapus');

    const result = await prisma.hubinLamaran.update({
      where: { id, tenant_id: tenantId },
      data: { deleted_at: new Date() }
    });

    await (prisma as any).hubinLamaranLog.create({
      data: {
        lamaran_id: id,
        tenant_id: tenantId,
        status_dari: current.status_seleksi,
        status_ke: 'DELETED',
        catatan: 'Lamaran direset oleh koordinator BKK',
        created_by: actorUserId || null,
      }
    });

    this.log(tenantId, actorUserId || null, 'HUBIN_LAMARAN_DELETE', 'HubinLamaran', id, {
      siswa_nama: current.Siswa?.nama_siswa,
      posisi: current.Lowongan?.judul_posisi
    });
    return result;
  }

  /**
   * Jadwalkan interview untuk sebuah lamaran.
   * Otomatis memindahkan status ke INTERVIEW dan menyimpan detail jadwal di log.
   */
  async scheduleInterview(
    tenantId: string,
    lamaranId: string,
    data: {
      tanggal: string;
      lokasi?: string;
      link?: string;
      pesan?: string;
      narahubung?: string;
    },
    actorUserId?: string | null
  ) {
    const current = await prisma.hubinLamaran.findFirst({
      where: { id: lamaranId, tenant_id: tenantId },
      include: {
        Siswa: { select: { nama_siswa: true, no_hp: true } },
        Lowongan: { select: { judul_posisi: true, perusahaan_nama: true } },
      }
    });
    if (!current) throw new Error('Lamaran tidak ditemukan');

    const result = await prisma.hubinLamaran.update({
      where: { id: lamaranId, tenant_id: tenantId },
      data: { status_seleksi: 'INTERVIEW' }
    });

    const interviewDate = new Date(data.tanggal);

    // Write detailed log
    await (prisma as any).hubinLamaranLog.create({
      data: {
        lamaran_id: lamaranId,
        tenant_id: tenantId,
        status_dari: current.status_seleksi,
        status_ke: 'INTERVIEW',
        catatan: data.pesan || 'Interview dijadwalkan',
        interview_tanggal: interviewDate,
        interview_lokasi: data.lokasi || null,
        interview_link: data.link || null,
        interview_pesan: data.pesan || null,
        interview_narahubung: data.narahubung || null,
        created_by: actorUserId || null,
      }
    });

    this.log(tenantId, actorUserId || null, 'HUBIN_LAMARAN_INTERVIEW', 'HubinLamaran', lamaranId, { tanggal: data.tanggal });

    // WA notification with interview details
    const noHp = current.Siswa?.no_hp;
    if (noHp) {
      const tanggalStr = interviewDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const waktuStr = interviewDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
      const pesan = [
        `*[Absenta - BKK Undangan Interview]*`,
        `Halo ${current.Siswa?.nama_siswa || 'Alumni'},`,
        ``,
        `Anda diundang untuk *Interview* posisi *${current.Lowongan?.judul_posisi}* di *${current.Lowongan?.perusahaan_nama}*.`,
        ``,
        `📅 *Jadwal:* ${tanggalStr}, ${waktuStr}`,
        data.lokasi ? `📍 *Lokasi:* ${data.lokasi}` : '',
        data.link ? `🔗 *Link Meet:* ${data.link}` : '',
        data.narahubung ? `👤 *Narahubung:* ${data.narahubung}` : '',
        data.pesan ? `\n📝 ${data.pesan}` : '',
        ``,
        `Semoga sukses! — Tim BKK`,
      ].filter(Boolean).join('\n');
      waGatewayService.sendMessageSoft(tenantId, noHp, pesan);
    }

    return result;
  }

  /**
   * Ambil riwayat/timeline log perubahan status sebuah lamaran.
   */
  async getLamaranTimeline(tenantId: string, lamaranId: string) {
    return await (prisma as any).hubinLamaranLog.findMany({
      where: { lamaran_id: lamaranId, tenant_id: tenantId },
      orderBy: { created_at: 'asc' },
    });
  }

  // --- 8. TRACER STUDY ALUMNI ---
  async getTracerStudy(tenantId: string, params?: { search?: string; tahunLulus?: number; statusAlumni?: string; page?: number; limit?: number; forceSiswaId?: string }) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;

    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (params?.forceSiswaId) {
      where.siswa_id = params.forceSiswaId;
    }
    if (params?.tahunLulus) where.tahun_lulus = parseInt(params.tahunLulus as any);
    if (params?.statusAlumni) where.status_alumni = params.statusAlumni;
    if (params?.search && !params?.forceSiswaId) {
      where.Siswa = {
        OR: [
          { nama_siswa: { contains: params.search, mode: 'insensitive' } },
          { nis: { contains: params.search, mode: 'insensitive' } },
          { User: { username: { contains: params.search, mode: 'insensitive' } } }
        ]
      };
    }

    const [total, data] = await Promise.all([
      prisma.hubinTracerStudy.count({ where }),
      prisma.hubinTracerStudy.findMany({
        where,
        include: {
          Siswa: { select: { nama_siswa: true, nis: true } }
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

  async submitTracerStudy(tenantId: string, siswaId: string, data: any, actorUserId?: string | null) {
    const result = await prisma.hubinTracerStudy.upsert({
      where: { siswa_id: siswaId },
      update: {
        ...data,
        deleted_at: null,
        tahun_lulus: data.tahun_lulus ? parseInt(data.tahun_lulus) : undefined
      },
      create: {
        ...data,
        siswa_id: siswaId,
        tenant_id: tenantId,
        tahun_lulus: data.tahun_lulus ? parseInt(data.tahun_lulus) : new Date().getFullYear()
      }
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_TRACER_SUBMIT', 'HubinTracerStudy', result.id, { status_alumni: result.status_alumni });
    return result;
  }

  async getTracerStats(tenantId: string) {
    const groups = await prisma.hubinTracerStudy.groupBy({
      by: ['status_alumni'],
      where: { tenant_id: tenantId, deleted_at: null },
      _count: { status_alumni: true }
    });

    const stats = {
      BEKERJA: 0,
      KULIAH: 0,
      WIRAUSAHA: 0,
      MENCARI_KERJA: 0
    };

    groups.forEach(g => {
      const key = g.status_alumni as keyof typeof stats;
      if (stats[key] !== undefined) {
        stats[key] = g._count.status_alumni;
      }
    });

    return stats;
  }

  // --- 9. TEFA ORDERS ---
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
}
