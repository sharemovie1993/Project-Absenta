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

    // Enterprise Scoping & Domain-Isolated Authorization Logic
    let isGlobalHubin = false;
    let currentGuruId: string | null = null;
    let kaprogUnitIds: string[] = [];
    let walikelasKelasIds: string[] = [];

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          Guru: true,
          Role: {
            include: {
              rolePermissions: {
                include: { Permission: true }
              }
            }
          },
          organizationalAssignments: {
            where: { is_active: true },
            include: { Position: true }
          }
        }
      });

      if (user) {
        currentGuruId = user.Guru?.id || null;
        const roleName = user.Role?.name;
        const isGlobalAdmin = roleName === 'ADMIN' || roleName === 'SUPERADMIN';
        const positions = (user.organizationalAssignments || []).map(a => a.Position?.code).filter(Boolean);
        const isHubinLeader = positions.includes('HUBIN') || positions.includes('KEPALA_SEKOLAH');
        const perms = (user.Role?.rolePermissions || []).map(rp => rp.Permission?.id || (rp as any).permission_id).filter(Boolean);
        const hasHubinManage = perms.includes('hubin.pkl.manage') || perms.includes('hubin.partners.manage');

        isGlobalHubin = isGlobalAdmin || isHubinLeader || hasHubinManage;

        kaprogUnitIds = (user.organizationalAssignments || [])
          .filter(a => a.Position?.code === 'KAPROG' && a.unit_id)
          .map(a => a.unit_id!);

        walikelasKelasIds = (user.organizationalAssignments || [])
          .filter(a => (a.Position?.code === 'WALIKELAS' || a.Position?.code === 'WALI_KELAS') && a.kelas_id)
          .map(a => a.kelas_id!);
      }
    }

    if (!isGlobalHubin) {
      // Prioritas 1: Kaprog (Jurusan siswa atau pembimbing)
      if (kaprogUnitIds.length > 0 || (org?.is_unit_restricted && Array.isArray(org.unit_ids) && org.unit_ids.length > 0)) {
        const unitIds = kaprogUnitIds.length > 0 ? kaprogUnitIds : org.unit_ids;
        const scopeOr: any[] = [
          {
            Siswa: {
              OR: [
                { jurusan_id: { in: unitIds } },
                { Kelas: { jurusan_id: { in: unitIds } } }
              ]
            }
          }
        ];
        if (currentGuruId) {
          scopeOr.push({ pembimbing_id: currentGuruId });
        }
        andConditions.push({ OR: scopeOr });
      } else if (walikelasKelasIds.length > 0 || (Array.isArray(org?.kelas_ids) && org.kelas_ids.length > 0)) {
        // Prioritas 2: Wali Kelas
        const kelasIds = walikelasKelasIds.length > 0 ? walikelasKelasIds : org.kelas_ids;
        const scopeOr: any[] = [
          {
            Siswa: {
              kelas_id: { in: kelasIds }
            }
          }
        ];
        if (currentGuruId) {
          scopeOr.push({ pembimbing_id: currentGuruId });
        }
        andConditions.push({ OR: scopeOr });
      } else if (currentGuruId) {
        // Prioritas 3: Guru Pembimbing biasa (atau guru struktural lain seperti Gerbang/Piket yang kebetulan punya akun Guru)
        // Hanya boleh melihat penempatan di mana guru ini adalah PEMBIMBING!
        andConditions.push({ pembimbing_id: currentGuruId });
      } else {
        // Staf non-guru tanpa jabatan Hubin: Tidak memiliki hak akses ke data penempatan PKL siswa
        andConditions.push({ id: '__unauthorized_no_guru__' });
      }
    }

    if (params?.search) {
      andConditions.push({
        OR: [
          { Siswa: { nama_siswa: { contains: params.search, mode: 'insensitive' } } },
          { Siswa: { nis: { contains: params.search, mode: 'insensitive' } } },
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
              Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
              Jurusan: {
                select: {
                  id: true,
                  nama: true,
                  kode: true,
                  ProgramKeahlian: {
                    select: { id: true, nama: true }
                  }
                }
              },
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
          Mitra: { 
            select: { 
              id: true, 
              nama: true, 
              latitude: true, 
              longitude: true, 
              radius: true, 
              alamat: true, 
              pic_nama: true,
              SettingDeskripsiPkl: {
                select: { id: true, deskripsi_tp: true, jurusan_id: true }
              }
            } 
          },
          Pembimbing: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
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

    const pklIds = data.map((item: any) => item.id);
    const absensiCounts = pklIds.length > 0 ? await prisma.absensiPkl.groupBy({
      by: ['siswa_pkl_id', 'status'],
      where: {
        tenant_id: tenantId,
        siswa_pkl_id: { in: pklIds },
      },
      _count: { id: true },
    }) : [];

    const countMap = new Map<string, { sakit: number; izin: number; alpa: number; hadir: number }>();
    for (const row of absensiCounts) {
      if (!countMap.has(row.siswa_pkl_id)) {
        countMap.set(row.siswa_pkl_id, { sakit: 0, izin: 0, alpa: 0, hadir: 0 });
      }
      const c = countMap.get(row.siswa_pkl_id)!;
      const st = (row.status || '').toUpperCase();
      if (st === 'SAKIT') c.sakit += row._count.id;
      else if (st === 'IZIN') c.izin += row._count.id;
      else if (st === 'ALPA') c.alpa += row._count.id;
      else if (st === 'HADIR' || st === 'TERLAMBAT') c.hadir += row._count.id;
    }

    const enrichedData = data.map((item: any) => {
      const stats = countMap.get(item.id) || { sakit: 0, izin: 0, alpa: 0, hadir: 0 };
      return {
        ...item,
        auto_sakit: stats.sakit,
        auto_izin: stats.izin,
        auto_alpa: stats.alpa,
        auto_hadir: stats.hadir,
        sakit_pkl: item.sakit_pkl !== null && item.sakit_pkl !== undefined && item.sakit_pkl > 0 ? item.sakit_pkl : stats.sakit,
        izin_pkl: item.izin_pkl !== null && item.izin_pkl !== undefined && item.izin_pkl > 0 ? item.izin_pkl : stats.izin,
        alpa_pkl: item.alpa_pkl !== null && item.alpa_pkl !== undefined && item.alpa_pkl > 0 ? item.alpa_pkl : stats.alpa,
      };
    });

    return {
      data: enrichedData,
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

    const { tahun_pelajaran_id, semester_id, kelas_id, id: _id, tenant_id: _tid, ...restData } = data;
    const createData: any = {
      ...restData,
      pembimbing_id: (data.pembimbing_id && String(data.pembimbing_id).trim() !== '') ? String(data.pembimbing_id).trim() : null,
      tanggal_mulai: data.tanggal_mulai ? new Date(data.tanggal_mulai) : new Date(),
      tanggal_selesai: data.tanggal_selesai ? new Date(data.tanggal_selesai) : null,
      tenant_id: tenantId,
      siswa_akademik_id: siswaAkademikId,
    };

    // Cek kapasitas kuota mitra
    const mitra = data.mitra_id ? await prisma.mitraIndustri.findUnique({
      where: { id: data.mitra_id },
      select: { nama: true, kuota_pkl: true }
    }) : null;
    const currentActiveCount = data.mitra_id ? await prisma.siswaPkl.count({
      where: { tenant_id: tenantId, mitra_id: data.mitra_id, status: 'AKTIF' }
    }) : 0;
    const isOverQuota = (mitra?.kuota_pkl || 0) > 0 && currentActiveCount >= (mitra?.kuota_pkl || 0);

    const result = await prisma.siswaPkl.create({
      data: createData,
    });
    this.log(tenantId, actorUserId || null, 'HUBIN_PKL_PLACE', 'SiswaPkl', result.id, { 
      siswa_nama: siswa?.nama_siswa,
      mitra_nama: mitra?.nama,
      is_over_quota: isOverQuota,
      kuota_pkl: mitra?.kuota_pkl || 0,
      terisi_saat_plotting: currentActiveCount + 1
    });
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

    // Strip non-updatable relation scalar / non-model fields
    const { siswa_id, tahun_pelajaran_id, semester_id, kelas_id, tenant_id: _tid, id: _id, ...allowedData } = data;
    const updateData: any = { ...allowedData };

    if ('pembimbing_id' in updateData) {
      updateData.pembimbing_id = (updateData.pembimbing_id && String(updateData.pembimbing_id).trim() !== '') ? String(updateData.pembimbing_id).trim() : null;
    }
    if (updateData.tanggal_mulai) {
      updateData.tanggal_mulai = new Date(updateData.tanggal_mulai);
    }
    if (updateData.tanggal_selesai !== undefined) {
      updateData.tanggal_selesai = updateData.tanggal_selesai ? new Date(updateData.tanggal_selesai) : null;
    }

    // Resolve siswa_akademik_id jika konteks TP & semester berubah saat update
    if (tahun_pelajaran_id && semester_id) {
      const existingRecord = await prisma.siswaPkl.findUnique({
        where: { id },
        select: { siswa_id: true }
      });
      const targetSiswaId = existingRecord?.siswa_id;
      if (targetSiswaId) {
        let sa = await prisma.siswaAkademik.findFirst({
          where: {
            siswa_id: targetSiswaId,
            tahun_pelajaran_id,
            semester_id
          }
        });
        if (!sa) {
          const s = await prisma.siswa.findUnique({
            where: { id: targetSiswaId },
            select: { kelas_id: true }
          });
          const targetKelas = kelas_id || s?.kelas_id;
          if (targetKelas) {
            try {
              sa = await prisma.siswaAkademik.create({
                data: {
                  siswa_id: targetSiswaId,
                  kelas_id: targetKelas,
                  tahun_pelajaran_id,
                  semester_id,
                  status: 'AKTIF'
                }
              });
            } catch (e: any) {
              sa = await prisma.siswaAkademik.findFirst({
                where: {
                  siswa_id: targetSiswaId,
                  tahun_pelajaran_id,
                  semester_id
                }
              });
            }
          }
        }
        if (sa?.id) {
          updateData.siswa_akademik_id = sa.id;
        }
      }
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

    const firstMitraId = items[0]?.mitra_id;
    const mitra = firstMitraId ? await prisma.mitraIndustri.findUnique({
      where: { id: firstMitraId },
      select: { nama: true, kuota_pkl: true }
    }) : null;
    let runningActiveCount = firstMitraId ? await prisma.siswaPkl.count({
      where: { tenant_id: tenantId, mitra_id: firstMitraId, status: 'AKTIF' }
    }) : 0;

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

      runningActiveCount++;
      const isOverQuota = (mitra?.kuota_pkl || 0) > 0 && runningActiveCount > (mitra?.kuota_pkl || 0);

      this.log(tenantId, actorUserId || null, 'HUBIN_PKL_PLACE', 'SiswaPkl', res.id, { 
        siswa_nama: siswa?.nama_siswa,
        mitra_nama: mitra?.nama,
        is_over_quota: isOverQuota,
        kuota_pkl: mitra?.kuota_pkl || 0,
        terisi_saat_plotting: runningActiveCount
      });
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

  async mutasiPenempatan(
    tenantId: string,
    id: string,
    data: {
      tanggal_selesai_lama?: string | Date;
      mitra_id_baru: string;
      pembimbing_id_baru?: string | null;
      tanggal_mulai_baru: string | Date;
      tanggal_selesai_baru?: string | Date | null;
      catatan_mutasi?: string;
    },
    actorUserId?: string | null,
    org?: any
  ) {
    const existing = await prisma.siswaPkl.findFirst({
      where: { id, tenant_id: tenantId },
      include: { Siswa: { select: { nama_siswa: true, kelas_id: true, tahun_pelajaran_id: true, semester_id: true } } }
    });
    if (!existing) {
      throw new Error('Data penempatan asal tidak ditemukan');
    }

    if (org && org.tenant_wide !== true) {
      if (org.is_unit_restricted === true && Array.isArray(org.unit_ids) && org.unit_ids.length > 0) {
        const user = await prisma.user.findUnique({
          where: { id: actorUserId || '' },
          include: { Guru: true }
        });
        const hasAccess = await prisma.siswaPkl.findFirst({
          where: {
            id,
            tenant_id: tenantId,
            OR: [
              { Siswa: { Kelas: { jurusan_id: { in: org.unit_ids } } } },
              ...(user?.Guru?.id ? [{ pembimbing_id: user.Guru.id }] : [])
            ]
          }
        });
        if (!hasAccess) {
          throw new Error('Akses ditolak: Anda tidak memiliki akses untuk memutasi siswa ini.');
        }
      }
    }

    const tglSelesaiLama = data.tanggal_selesai_lama ? new Date(data.tanggal_selesai_lama) : new Date();
    const tglMulaiBaru = data.tanggal_mulai_baru ? new Date(data.tanggal_mulai_baru) : new Date();
    const tglSelesaiBaru = data.tanggal_selesai_baru ? new Date(data.tanggal_selesai_baru) : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Tutup penempatan lama
      const oldUpdated = await tx.siswaPkl.update({
        where: { id, tenant_id: tenantId },
        data: {
          status: 'SELESAI',
          tanggal_selesai: tglSelesaiLama,
          catatan_pkl: data.catatan_mutasi 
            ? `${existing.catatan_pkl ? existing.catatan_pkl + ' | ' : ''}Mutasi: ${data.catatan_mutasi}`
            : existing.catatan_pkl
        }
      });

      // 2. Buat penempatan baru
      const newPlacement = await tx.siswaPkl.create({
        data: {
          tenant_id: tenantId,
          siswa_id: existing.siswa_id,
          siswa_akademik_id: existing.siswa_akademik_id,
          mitra_id: data.mitra_id_baru,
          pembimbing_id: data.pembimbing_id_baru !== undefined 
            ? (data.pembimbing_id_baru && String(data.pembimbing_id_baru).trim() !== '' ? String(data.pembimbing_id_baru).trim() : null)
            : existing.pembimbing_id,
          tanggal_mulai: tglMulaiBaru,
          tanggal_selesai: tglSelesaiBaru,
          status: 'AKTIF'
        },
        include: {
          Mitra: { select: { nama: true } },
          Siswa: { select: { nama_siswa: true } }
        }
      });

      return { oldPlacement: oldUpdated, newPlacement };
    });

    this.log(tenantId, actorUserId || null, 'HUBIN_PKL_MUTASI', 'SiswaPkl', result.newPlacement.id, {
      siswa_nama: existing.Siswa?.nama_siswa,
      mitra_asal_id: existing.mitra_id,
      mitra_tujuan_id: data.mitra_id_baru,
      mitra_tujuan_nama: result.newPlacement.Mitra?.nama
    });

    await cacheInvalidationService.invalidateHubinCache(tenantId, existing.siswa_id);
    return result;
  }

  async bulkUpdateStatus(
    tenantId: string,
    data: {
      ids: string[];
      status: string;
      tanggal_selesai_aktual?: string | Date;
    },
    actorUserId?: string | null,
    org?: any
  ) {
    if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
      throw new Error('Daftar ID penempatan wajib diisi');
    }
    const validStatuses = ['AKTIF', 'SELESAI', 'BATAL'];
    if (!validStatuses.includes(data.status)) {
      throw new Error(`Status tidak valid. Harus salah satu dari: ${validStatuses.join(', ')}`);
    }

    const updatePayload: any = { status: data.status };
    if (data.status === 'SELESAI' && data.tanggal_selesai_aktual) {
      updatePayload.tanggal_selesai = new Date(data.tanggal_selesai_aktual);
    }

    const updateResult = await prisma.siswaPkl.updateMany({
      where: {
        tenant_id: tenantId,
        id: { in: data.ids }
      },
      data: updatePayload
    });

    this.log(tenantId, actorUserId || null, 'HUBIN_PKL_BULK_STATUS', 'SiswaPkl', null, {
      count: updateResult.count,
      status: data.status
    });

    await cacheInvalidationService.invalidateHubinCache(tenantId);
    return { count: updateResult.count, status: data.status };
  }
}
