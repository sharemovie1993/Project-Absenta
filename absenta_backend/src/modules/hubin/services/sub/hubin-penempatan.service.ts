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

export class HubinPenempatanService {
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
          kelas_id: siswa.kelas_id || undefined,
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
    await cacheInvalidationService.invalidateHubinCache(tenantId, data.siswa_id);
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
    await cacheInvalidationService.invalidateHubinCache(tenantId, result.siswa_id);
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
            kelas_id: siswa.kelas_id || undefined,
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
    await cacheInvalidationService.invalidateHubinCache(tenantId);
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
    await cacheInvalidationService.invalidateHubinCache(tenantId, result.siswa_id);
    return result;
  }

  /**
   * --- 3. ABSENSI & LOGBOOK PKL ---
   */
}
