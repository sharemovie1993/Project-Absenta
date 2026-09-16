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

export class HubinPenempatanService extends HubinCommonHelper {
  async getPenempatan(tenantId: string, userId?: string, params?: { search?: string; page?: number; limit?: number; tahun_pelajaran_id?: string; semester_id?: string; status?: string; mitra_id?: string; pembimbing_id?: string; kelas_id?: string }, org?: any) {
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
                           user?.organizationalAssignments?.some((oa: any) => oa.Position?.code === 'HUBIN') ||
                           user?.Role?.rolePermissions?.some((rp: any) => rp.permission_id === 'hubin.partners.manage');

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

    if (params?.status) {
      andConditions.push({ status: params.status });
    }

    if (params?.tahun_pelajaran_id) {
      andConditions.push({
        OR: [
          { SiswaAkademik: { tahun_pelajaran_id: params.tahun_pelajaran_id } },
          { Siswa: { tahun_pelajaran_id: params.tahun_pelajaran_id } }
        ]
      });
    }

    if (params?.semester_id) {
      andConditions.push({
        OR: [
          { SiswaAkademik: { semester_id: params.semester_id } },
          { Siswa: { semester_id: params.semester_id } }
        ]
      });
    }

    if (params?.mitra_id) {
      andConditions.push({ mitra_id: params.mitra_id });
    }

    if (params?.pembimbing_id) {
      andConditions.push({ pembimbing_id: params.pembimbing_id });
    }

    if (params?.kelas_id) {
      andConditions.push({
        OR: [
          { SiswaAkademik: { kelas_id: params.kelas_id } },
          { Siswa: { kelas_id: params.kelas_id } }
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
              Kelas: { select: { id: true, nama_kelas: true } },
              TahunPelajaran: { select: { id: true, tahun: true } }
            } 
          },
          SiswaAkademik: {
            select: {
              id: true,
              tahun_pelajaran_id: true,
              semester_id: true,
              tahunPelajaran: { select: { id: true, tahun: true } },
              semester: { select: { id: true, nama_semester: true } }
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const includeConfig = {
      Siswa: {
        include: {
          Kelas: { select: { id: true, nama_kelas: true } }
        }
      },
      Mitra: { select: { nama: true, latitude: true, longitude: true, radius: true } },
      Pembimbing: { select: { nama_guru: true, no_hp: true } },
    };

    // Prioritas 1: PKL berstatus AKTIF yang tanggalnya masih berlaku
    const activePkl = await prisma.siswaPkl.findFirst({
      where: {
        tenant_id: tenantId,
        siswa_id: studentId,
        status: 'AKTIF',
        tanggal_mulai: { lte: today },
        OR: [
          { tanggal_selesai: null },
          { tanggal_selesai: { gte: today } },
        ],
      },
      orderBy: { tanggal_mulai: 'desc' },
      include: includeConfig,
    });

    if (activePkl) return activePkl;

    // Fallback: PKL terbaru apapun statusnya (untuk view riwayat absensi)
    return await prisma.siswaPkl.findFirst({
      where: { tenant_id: tenantId, siswa_id: studentId },
      orderBy: { tanggal_mulai: 'desc' },
      include: includeConfig,
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

    const targetTpId = data.tahun_pelajaran_id || siswa?.tahun_pelajaran_id;
    const targetSemId = data.semester_id || siswa?.semester_id;
    const targetKelasId = data.kelas_id || siswa?.kelas_id;

    let siswaAkademikId: string | undefined;
    if (targetTpId && targetSemId) {
      let sa = await prisma.siswaAkademik.findFirst({
        where: {
          siswa_id: data.siswa_id,
          tahun_pelajaran_id: targetTpId,
          semester_id: targetSemId
        }
      });
      if (!sa && targetKelasId) {
        try {
          sa = await prisma.siswaAkademik.create({
            data: {
              siswa_id: data.siswa_id,
              kelas_id: targetKelasId,
              tahun_pelajaran_id: targetTpId,
              semester_id: targetSemId,
              status: 'AKTIF'
            }
          });
        } catch (e: any) {
          sa = await prisma.siswaAkademik.findFirst({
            where: {
              siswa_id: data.siswa_id,
              tahun_pelajaran_id: targetTpId,
              semester_id: targetSemId
            }
          });
        }
      }
      siswaAkademikId = sa?.id;
    }

    const { tahun_pelajaran_id, semester_id, kelas_id, ...restData } = data;
    const createData: any = {
      ...restData,
      pembimbing_id: (data.pembimbing_id && String(data.pembimbing_id).trim() !== '') ? String(data.pembimbing_id).trim() : null,
      tanggal_mulai: data.tanggal_mulai ? new Date(data.tanggal_mulai) : new Date(),
      tanggal_selesai: data.tanggal_selesai ? new Date(data.tanggal_selesai) : null,
      tenant_id: tenantId,
      siswa_akademik_id: siswaAkademikId,
    };

    const result = await prisma.siswaPkl.create({
      data: createData,
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
    if ('pembimbing_id' in updateData) {
      updateData.pembimbing_id = (updateData.pembimbing_id && String(updateData.pembimbing_id).trim() !== '') ? String(updateData.pembimbing_id).trim() : null;
    }
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
    let items: Array<{
      siswa_id: string;
      mitra_id: string;
      pembimbing_id?: string | null;
      tanggal_mulai?: string | Date;
      tanggal_selesai?: string | Date | null;
      status?: string;
    }> = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (data && Array.isArray(data.siswa_ids)) {
      items = data.siswa_ids.map((sId: string) => ({
        siswa_id: sId,
        mitra_id: data.mitra_id,
        pembimbing_id: data.pembimbing_id,
        tanggal_mulai: data.tanggal_mulai,
        tanggal_selesai: data.tanggal_selesai,
        status: data.status,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        kelas_id: data.kelas_id,
      }));
    } else {
      throw new Error('Format data bulk penempatan tidak valid');
    }

    if (items.length === 0) {
      throw new Error('Daftar siswa penempatan tidak boleh kosong');
    }

    if (org && org.tenant_wide !== true) {
      if (org.is_unit_restricted === true && Array.isArray(org.unit_ids) && org.unit_ids.length > 0) {
        for (const item of items) {
          const student = await prisma.siswa.findFirst({
            where: {
              id: item.siswa_id,
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
    for (const item of items) {
      const siswa = await prisma.siswa.findUnique({
        where: { id: item.siswa_id },
        select: { kelas_id: true, tahun_pelajaran_id: true, semester_id: true, nama_siswa: true }
      });

      const targetTpId = (item as any).tahun_pelajaran_id || (data && (data as any).tahun_pelajaran_id) || siswa?.tahun_pelajaran_id;
      const targetSemId = (item as any).semester_id || (data && (data as any).semester_id) || siswa?.semester_id;
      const targetKelasId = (item as any).kelas_id || (data && (data as any).kelas_id) || siswa?.kelas_id;

      let siswaAkademikId: string | undefined;
      if (targetTpId && targetSemId) {
        let sa = await prisma.siswaAkademik.findFirst({
          where: {
            siswa_id: item.siswa_id,
            tahun_pelajaran_id: targetTpId,
            semester_id: targetSemId
          }
        });
        if (!sa && targetKelasId) {
          try {
            sa = await prisma.siswaAkademik.create({
              data: {
                siswa_id: item.siswa_id,
                kelas_id: targetKelasId,
                tahun_pelajaran_id: targetTpId,
                semester_id: targetSemId,
                status: 'AKTIF'
              }
            });
          } catch (e: any) {
            sa = await prisma.siswaAkademik.findFirst({
              where: {
                siswa_id: item.siswa_id,
                tahun_pelajaran_id: targetTpId,
                semester_id: targetSemId
              }
            });
          }
        }
        siswaAkademikId = sa?.id;
      }

      const res = await prisma.siswaPkl.create({
        data: {
          tenant_id: tenantId,
          siswa_id: item.siswa_id,
          siswa_akademik_id: siswaAkademikId,
          mitra_id: item.mitra_id,
          pembimbing_id: (item.pembimbing_id && String(item.pembimbing_id).trim() !== '') ? String(item.pembimbing_id).trim() : null,
          tanggal_mulai: item.tanggal_mulai ? new Date(item.tanggal_mulai) : new Date(),
          tanggal_selesai: item.tanggal_selesai ? new Date(item.tanggal_selesai) : null,
          status: item.status || 'AKTIF'
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
