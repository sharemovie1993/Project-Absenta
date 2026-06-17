import { prisma } from '../../../utils/prisma';
import crypto from 'crypto';

export class HubinService {
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

  async createMitra(tenantId: string, data: any) {
    return await prisma.mitraIndustri.create({
      data: {
        ...data,
        tenant_id: tenantId,
      },
    });
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

    return await prisma.mitraIndustri.update({
      where: { id, tenant_id: tenantId },
      data,
    });
  }

  async deleteMitra(tenantId: string, id: string) {
    return await prisma.mitraIndustri.delete({
      where: { id, tenant_id: tenantId },
    });
  }

  /**
   * --- 2. MANAJEMEN PENEMPATAN PKL ---
   */
  async getPenempatan(tenantId: string, userId?: string, params?: { search?: string; page?: number; limit?: number }, org?: any) {
    const page = params?.page || 1;
    const limit = params?.limit || 100;
    const skip = (page - 1) * limit;
    
    let where: any = { tenant_id: tenantId };

    // Enterprise Scoping Logic
    if (org) {
      // Jika dia HUBIN (tenant_wide), dia bisa lihat semua.
      // Jika dia GURU (restricted), dia hanya bisa lihat bimbingannya.
      if (org.tenant_wide !== true) {
        // Cek apakah dia Guru
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { Guru: true }
        });
        
        if (user?.Guru?.id) {
          where.pembimbing_id = user.Guru.id;
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
        where.pembimbing_id = user.Guru.id;
      }
    }

    if (params?.search) {
      where.OR = [
        { Siswa: { nama_siswa: { contains: params.search, mode: 'insensitive' } } },
        { Mitra: { nama: { contains: params.search, mode: 'insensitive' } } },
        { Pembimbing: { nama_guru: { contains: params.search, mode: 'insensitive' } } },
      ];
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
    const student = await prisma.siswa.findFirst({
      where: { tenant_id: tenantId, user_id: userId },
      select: { id: true }
    });

    if (!student) return null;

    return await prisma.siswaPkl.findFirst({
      where: { tenant_id: tenantId, siswa_id: student.id },
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

  async createPenempatan(tenantId: string, data: any) {
    // Ambil info akademik saat ini
    const siswa = await prisma.siswa.findUnique({
      where: { id: data.siswa_id },
      select: { kelas_id: true, tahun_pelajaran_id: true, semester_id: true }
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

    return await prisma.siswaPkl.create({
      data: {
        ...data,
        tenant_id: tenantId,
        siswa_akademik_id: siswaAkademikId,
      },
    });
  }

  async updatePenempatan(tenantId: string, id: string, data: any) {
    return await prisma.siswaPkl.update({
      where: { id, tenant_id: tenantId },
      data,
    });
  }

  async deletePenempatan(tenantId: string, id: string) {
    return await prisma.siswaPkl.delete({
      where: { id, tenant_id: tenantId }
    });
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

    let isOutsideRadius = false;
    let distanceMeters = 0;
    
    // Geofencing Check
    const targetLat = pkl.lat_override || pkl.Mitra.latitude;
    const targetLon = pkl.lon_override || pkl.Mitra.longitude;
    const radius = pkl.radius_override || pkl.Mitra.radius || 100;

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
}
