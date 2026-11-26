import { Prisma } from '@prisma/client';
import { prisma } from '../../../utils/prisma';
import { applyDataScope } from '../../../utils/applyDataScope';
import { DataScope } from '../../../types/fastify';
import { cacheService } from '../../../utils/cache.service';
import { cacheInvalidationService } from '../../../utils/cache-invalidation.service';
import { CACHE_KEYS, CACHE_TTL } from '../../../constants/cache-keys';
import { getTenantTimezone, getTenantDayRangeUTC } from '../../../utils/timezone.utils';

export class PelanggaranService {
  static async create(tenantId: string, data: {
    siswa_id: string;
    tanggal: Date;
    jenis_pelanggaran: string;
    poin: number;
    keterangan?: string;
    status?: string;
  }) {
    // Ambil info akademik saat ini dari data Siswa dengan verifikasi tenant_id ketat
    const siswa = await prisma.siswa.findFirst({
      where: { id: data.siswa_id, tenant_id: tenantId },
      select: { kelas_id: true, tahun_pelajaran_id: true, semester_id: true }
    });

    if (!siswa) {
      throw new Error('Siswa tidak ditemukan atau tidak terdaftar di instansi sekolah ini');
    }

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

    const violation = await prisma.pelanggaranSiswa.create({
      data: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        siswa_akademik_id: siswaAkademikId,
        kelas_id: siswa?.kelas_id || undefined,
        tanggal: data.tanggal,
        jenis_pelanggaran: data.jenis_pelanggaran,
        poin: data.poin,
        keterangan: data.keterangan,
        status: data.status || 'BARU',
      },
    });

    // Real-time EWS alert integration
    try {
      const { BpbkService } = await import('../../bpbk/services/bpbk.service');
      const ewsList = await BpbkService.calculateEwsForSiswa(tenantId);
      const studentEws = ewsList.find((e: any) => e.siswa.id === data.siswa_id);
      if (studentEws && studentEws.riskLevel === 'HIGH') {
        const bkTeachers = await prisma.user.findMany({
          where: {
            tenant_id: tenantId,
            Role: {
              rolePermissions: {
                some: {
                  permission_id: 'bk.cases.manage'
                }
              }
            }
          },
          select: { id: true }
        });
        if (bkTeachers.length > 0) {
          const { notificationService } = await import('../../../services/notification.service');
          const studentName = studentEws.siswa.nama_siswa || studentEws.siswa.nama || 'Siswa';
          for (const teacher of bkTeachers) {
            await notificationService.sendInApp(
              teacher.id,
              'PERINGATAN DINI: Siswa Berisiko Tinggi (Pelanggaran Baru)',
              `Siswa ${studentName} terdeteksi berisiko TINGGI (Skor EWS: ${studentEws.riskScore}) setelah dicatat melakukan pelanggaran "${data.jenis_pelanggaran}".`
            );
          }
        }
      }
    } catch (ewsErr) {
      console.error('[EWS INTEGRATION ERROR] Failed to run real-time EWS alert:', ewsErr);
    }

    // Invalidate Cache setelah create
    await PelanggaranService.invalidateCache(tenantId, data.siswa_id);

    return violation;
  }

  static async update(tenantId: string, id: string, data: {
    tanggal?: Date;
    jenis_pelanggaran?: string;
    poin?: number;
    keterangan?: string;
    status?: string;
  }) {
    // Verify ownership
    const existing = await prisma.pelanggaranSiswa.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Pelanggaran not found');
    }

    const updated = await prisma.pelanggaranSiswa.update({
      where: { id },
      data,
    });

    // Invalidate Cache setelah update
    await PelanggaranService.invalidateCache(tenantId, existing.siswa_id);

    return updated;
  }

  static async delete(tenantId: string, id: string) {
    const existing = await prisma.pelanggaranSiswa.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existing) {
      throw new Error('Pelanggaran not found');
    }

    const deleted = await prisma.pelanggaranSiswa.delete({
      where: { id },
    });

    // Invalidate Cache setelah delete
    await PelanggaranService.invalidateCache(tenantId, existing.siswa_id);

    return deleted;
  }

  /**
   * Invalidate Redis/In-Memory Cache untuk data Pelanggaran & Analitik Kedisiplinan
   */
  static async invalidateCache(tenantId: string, siswaId?: string) {
    try {
      await cacheInvalidationService.invalidatePelanggaranCache(tenantId, siswaId);
    } catch (err) {
      console.warn('[PelanggaranService] Non-blocking cache invalidation notice:', (err as any)?.message);
    }
  }

  static async getAll(tenantId: string, query: {
    page?: number;
    limit?: number;
    search?: string;
    siswa_id?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }, scope?: DataScope) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const jurusanId = (query as any).jurusan_id;

    const cleanSearch = (query.search || '').trim();

    // 1. Coba baca dari Redis/Memory Cache (Hanya untuk query default tanpa keyword search ad-hoc)
    if (!cleanSearch) {
      const cacheKey = CACHE_KEYS.KESISWAAN.PELANGGARAN_LIST(
        tenantId,
        page,
        limit,
        '',
        ((query as any).kelas_id || jurusanId),
        query.status
      );

      try {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          console.log(`[PelanggaranService] ⚡ Cache HIT for key: ${cacheKey}`);
          return cached;
        }
      } catch (cacheErr) {
        console.warn('[PelanggaranService] Non-blocking cache read notice:', (cacheErr as any)?.message);
      }
    }

    const andConditions: Prisma.PelanggaranSiswaWhereInput[] = [
      { tenant_id: tenantId }
    ];

    if (scope) {
      let scopedWhere: Prisma.PelanggaranSiswaWhereInput = {};
      scopedWhere = applyDataScope(scopedWhere, scope);
      if (scope.userId) {
        scopedWhere.Siswa = { user_id: scope.userId };
        delete (scopedWhere as any).user_id;
      }
      andConditions.push(scopedWhere);
    }

    if (query.siswa_id) {
      andConditions.push({ siswa_id: query.siswa_id });
    }

    if ((query as any).kelas_id) {
      andConditions.push({ kelas_id: (query as any).kelas_id });
    }

    if (jurusanId) {
      andConditions.push({
        Kelas: { jurusan_id: jurusanId }
      });
    }

    if ((query as any).tahun_pelajaran_id) {
      // Izinkan data sesuai ID TP atau data historis di mana tahun_pelajaran_id masih null
      andConditions.push({
        OR: [
          { tahun_pelajaran_id: (query as any).tahun_pelajaran_id },
          { tahun_pelajaran_id: null }
        ]
      });
    }

    if ((query as any).semester_id) {
      andConditions.push({
        OR: [
          { semester_id: (query as any).semester_id },
          { semester_id: null }
        ]
      });
    }

    if (query.status) {
      andConditions.push({ status: query.status });
    }

    if (query.startDate || query.endDate) {
      const tz = await getTenantTimezone(tenantId);
      const startStr = query.startDate || query.endDate!;
      const endStr = query.endDate || query.startDate!;
      const startRange = getTenantDayRangeUTC(startStr, tz);
      const endRange = getTenantDayRangeUTC(endStr, tz);
      andConditions.push({
        tanggal: {
          gte: startRange.startUTC,
          lte: endRange.endUTC,
        }
      });
    }

    if (cleanSearch) {
      andConditions.push({
        OR: [
          { jenis_pelanggaran: { contains: cleanSearch, mode: 'insensitive' } },
          { keterangan: { contains: cleanSearch, mode: 'insensitive' } },
          { status: { contains: cleanSearch, mode: 'insensitive' } },
          { Siswa: { nama_siswa: { contains: cleanSearch, mode: 'insensitive' } } },
          { Siswa: { nis: { contains: cleanSearch, mode: 'insensitive' } } },
          { Siswa: { nisn: { contains: cleanSearch, mode: 'insensitive' } } },
          { Kelas: { nama_kelas: { contains: cleanSearch, mode: 'insensitive' } } },
          { Siswa: { Kelas: { nama_kelas: { contains: cleanSearch, mode: 'insensitive' } } } },
        ]
      });
    }

    const where: Prisma.PelanggaranSiswaWhereInput = {
      AND: andConditions
    };

    console.log(`[PelanggaranService] Final Where Clause:`, JSON.stringify(where, null, 2));

    const [total, list] = await Promise.all([
      prisma.pelanggaranSiswa.count({ where }),
      prisma.pelanggaranSiswa.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { tanggal: 'desc' },
        include: {
          Siswa: {
            select: {
              id: true,
              nama_siswa: true,
              nis: true,
              Kelas: {
                select: {
                  id: true,
                  nama_kelas: true,
                  jurusan_id: true,
                },
              },
            },
          },
          Kelas: {
            select: {
              id: true,
              nama_kelas: true,
              jurusan_id: true,
            },
          },
        },
      }),
    ]);

    const resultPayload = {
      list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    // 2. Simpan ke Cache via cacheService (Hanya untuk query umum tanpa keyword pencarian bebas)
    if (!cleanSearch) {
      const cacheKey = CACHE_KEYS.KESISWAAN.PELANGGARAN_LIST(
        tenantId,
        page,
        limit,
        '',
        ((query as any).kelas_id || jurusanId),
        query.status
      );
      try {
        await cacheService.set(cacheKey, resultPayload, CACHE_TTL.DEFAULT);
        console.log(`[PelanggaranService] 💾 Cache WRITE for key: ${cacheKey}`);
      } catch (cacheErr) {
        console.warn('[PelanggaranService] Non-blocking cache write notice:', (cacheErr as any)?.message);
      }
    }

    return resultPayload;
  }

  static async getById(tenantId: string, id: string) {
    const cacheKey = CACHE_KEYS.KESISWAAN.PELANGGARAN_DETAIL(tenantId, id);
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}

    const res = await prisma.pelanggaranSiswa.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        Siswa: {
          select: {
            id: true,
            nama_siswa: true,
            nis: true,
            Kelas: true,
          },
        },
      },
    });

    if (res) {
      try {
        await cacheService.set(cacheKey, res, CACHE_TTL.DEFAULT);
      } catch (e) {}
    }
    return res;
  }

  static async getAnalytics(tenantId: string, query: { year?: number }) {
    const year = Number(query.year) || new Date().getFullYear();

    const cacheKey = CACHE_KEYS.KESISWAAN.PELANGGARAN_ANALYTICS(tenantId, year);
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        console.log(`[PelanggaranService] ⚡ Cache HIT for analytics key: ${cacheKey}`);
        return cached;
      }
    } catch (cacheErr) {
      console.warn('[PelanggaranService] Non-blocking cache read notice:', (cacheErr as any)?.message);
    }

    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year}-12-31T23:59:59.999Z`);

    const list = await prisma.pelanggaranSiswa.findMany({
      where: {
        tenant_id: tenantId,
        tanggal: { gte: start, lte: end },
      },
      select: {
        tanggal: true,
        poin: true,
        jenis_pelanggaran: true,
      },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      bulan: i + 1,
      nama_bulan: new Date(2026, i, 1).toLocaleString('id-ID', { month: 'long' }),
      total_kasus: 0,
      total_poin: 0,
    }));

    const kategoriMap = new Map<string, number>();

    list.forEach((p) => {
      const monthIdx = new Date(p.tanggal).getMonth();
      if (monthIdx >= 0 && monthIdx < 12) {
        months[monthIdx].total_kasus += 1;
        months[monthIdx].total_poin += p.poin || 0;
      }
      const cat = p.jenis_pelanggaran || 'Umum';
      kategoriMap.set(cat, (kategoriMap.get(cat) || 0) + 1);
    });

    const kategori = Array.from(kategoriMap.entries()).map(([name, count]) => ({
      kategori: name,
      jumlah: count,
    }));

    const analyticsPayload = {
      trend_bulanan: months,
      distribusi_kategori: kategori,
    };

    try {
      await cacheService.set(cacheKey, analyticsPayload, CACHE_TTL.DASHBOARD);
      console.log(`[PelanggaranService] 💾 Cache WRITE for analytics key: ${cacheKey}`);
    } catch (cacheErr) {
      console.warn('[PelanggaranService] Non-blocking cache write notice:', (cacheErr as any)?.message);
    }

    return analyticsPayload;
  }

  /**
   * SSOT Pengumpulan Data Divisi Kesiswaan terscope ke Konteks Akademik Aktif (TP & Semester Aktif)
   * Menghitung kehadiran siswa unik di KBM, tren vs kemarin, gerbang terlambat, izin keluar piket,
   * rombel 100% hadir vs alpa, early warning alpa berturut-turut, dan tren penurunan pelanggaran.
   */
  static async getAcademicScopedKesiswaanSummary(tenantId: string, tanggal: string) {
    const tz = await getTenantTimezone(tenantId);
    const { startUTC, endUTC } = getTenantDayRangeUTC(tanggal, tz);

    const dateObj = new Date(`${tanggal}T12:00:00+07:00`);
    const prevDate = new Date(dateObj);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().slice(0, 10);
    const { startUTC: prevStartUTC, endUTC: prevEndUTC } = getTenantDayRangeUTC(prevDateStr, tz);

    const [activeTp, activeSem] = await Promise.all([
      prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, tahun: true },
      }),
      prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, nama_semester: true },
      }),
    ]);

    const academicContext = activeTp
      ? `${activeTp.tahun}${activeSem ? ` (${activeSem.nama_semester})` : ''}`
      : 'Konteks Aktif';

    const activeSiswaFilter: any = activeTp
      ? {
          status: 'AKTIF',
          SiswaAkademik: {
            some: {
              tahun_pelajaran_id: activeTp.id,
              ...(activeSem ? { semester_id: activeSem.id } : {}),
              status: 'AKTIF',
            },
          },
        }
      : { status: 'AKTIF' };

    const sesiAcademicScope: any = {
      ...(activeTp ? { tahun_pelajaran_id: activeTp.id } : {}),
      ...(activeSem ? { semester_id: activeSem.id } : {}),
    };

    const week1Start = new Date(startUTC.getTime() - 6 * 24 * 3600 * 1000);
    const week2End = new Date(week1Start.getTime() - 1);
    const week2Start = new Date(week1Start.getTime() - 7 * 24 * 3600 * 1000);

    const violationAcademicScope: any = activeTp
      ? {
          OR: [
            { tahun_pelajaran_id: activeTp.id, ...(activeSem ? { semester_id: activeSem.id } : {}) },
            { tahun_pelajaran_id: null, Siswa: activeSiswaFilter },
          ],
        }
      : {};

    const [
      scopedSiswaCount,
      fallbackSiswaCount,
      todayAbsenList,
      prevAbsenList,
      siswaTerlambat,
      ikList,
      pelanggaranMingguIni,
      pelanggaranMingguLalu,
      pelanggaranSemesterTotal,
      pelanggaranSemesterSelesai,
    ] = await Promise.all([
      prisma.siswa.count({ where: { tenant_id: tenantId, ...activeSiswaFilter } }),
      prisma.siswa.count({ where: { tenant_id: tenantId, status: 'AKTIF' } }),
      prisma.absenSiswa.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: startUTC, lte: endUTC },
          ...(activeTp ? { SesiAbsensi: sesiAcademicScope } : {}),
        },
        select: {
          siswa_id: true,
          status: true,
          kelas_nama_snapshot: true,
          Siswa: { select: { nama_siswa: true } },
          SiswaAkademik: {
            select: {
              siswa: { select: { nama_siswa: true } },
              kelas: { select: { nama_kelas: true } },
            },
          },
        },
      }),
      prisma.absenSiswa.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: prevStartUTC, lte: prevEndUTC },
          status: { in: ['HADIR', 'TERLAMBAT'] },
          ...(activeTp ? { SesiAbsensi: sesiAcademicScope } : {}),
        },
        select: { siswa_id: true },
        distinct: ['siswa_id'],
      }),
      prisma.absenGerbangSiswa.count({
        where: {
          tenant_id: tenantId,
          is_terlambat: true,
          created_at: { gte: startUTC, lte: endUTC },
          Siswa: activeSiswaFilter,
        },
      }),
      prisma.izinKeluarSiswa.findMany({
        where: {
          tenant_id: tenantId,
          created_at: { gte: startUTC, lte: endUTC },
          ...(activeTp
            ? {
                SiswaAkademik: {
                  tahun_pelajaran_id: activeTp.id,
                  ...(activeSem ? { semester_id: activeSem.id } : {}),
                },
              }
            : {}),
        },
        include: {
          SiswaAkademik: {
            include: {
              siswa: { select: { nama_siswa: true } },
              kelas: { select: { nama_kelas: true } },
            },
          },
        },
        orderBy: { jam_keluar: 'desc' },
      }),
      prisma.pelanggaranSiswa.count({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: week1Start, lte: endUTC },
          ...violationAcademicScope,
        },
      }),
      prisma.pelanggaranSiswa.count({
        where: {
          tenant_id: tenantId,
          tanggal: { gte: week2Start, lte: week2End },
          ...violationAcademicScope,
        },
      }),
      prisma.pelanggaranSiswa.count({
        where: {
          tenant_id: tenantId,
          ...violationAcademicScope,
        },
      }),
      prisma.pelanggaranSiswa.count({
        where: {
          tenant_id: tenantId,
          status: 'SELESAI',
          ...violationAcademicScope,
        },
      }),
    ]);

    const totalSiswaAktif = scopedSiswaCount > 0 ? scopedSiswaCount : fallbackSiswaCount;

    // Deduplicate status kehadiran per siswa unik (prioritas: HADIR > SAKIT > IZIN > ALPA)
    const statusPriority: Record<string, number> = { HADIR: 4, TERLAMBAT: 4, SAKIT: 3, IZIN: 2, ALPA: 1 };
    const siswaStatusMap = new Map<
      string,
      { status: 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA'; nama: string; kelas: string }
    >();

    for (const row of todayAbsenList) {
      if (!row.siswa_id) continue;
      const raw = (row.status || '').toUpperCase();
      const normalized: 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA' =
        raw === 'HADIR' || raw === 'TERLAMBAT'
          ? 'HADIR'
          : raw === 'SAKIT'
          ? 'SAKIT'
          : raw === 'IZIN'
          ? 'IZIN'
          : 'ALPA';
      const prio = statusPriority[normalized] || 1;
      const existing = siswaStatusMap.get(row.siswa_id);
      if (!existing || prio > (statusPriority[existing.status] || 0)) {
        const nama =
          row.Siswa?.nama_siswa || row.SiswaAkademik?.siswa?.nama_siswa || 'Siswa';
        const kelas =
          row.kelas_nama_snapshot || row.SiswaAkademik?.kelas?.nama_kelas || 'Kelas';
        siswaStatusMap.set(row.siswa_id, { status: normalized, nama, kelas });
      }
    }

    let siswaHadir = 0;
    let siswaSakit = 0;
    let siswaIzin = 0;
    let siswaAlpa = 0;
    const mapKelas = new Map<string, { hadir: number; alpa: number; sakitIzin: number }>();
    const todayAlpaStudents: Array<{ siswaId: string; nama: string; kelas: string }> = [];

    siswaStatusMap.forEach((val, siswaId) => {
      if (val.status === 'HADIR') siswaHadir++;
      else if (val.status === 'SAKIT') siswaSakit++;
      else if (val.status === 'IZIN') siswaIzin++;
      else if (val.status === 'ALPA') {
        siswaAlpa++;
        todayAlpaStudents.push({ siswaId, nama: val.nama, kelas: val.kelas });
      }

      if (val.kelas) {
        if (!mapKelas.has(val.kelas)) {
          mapKelas.set(val.kelas, { hadir: 0, alpa: 0, sakitIzin: 0 });
        }
        const kObj = mapKelas.get(val.kelas)!;
        if (val.status === 'HADIR') kObj.hadir++;
        else if (val.status === 'ALPA') kObj.alpa++;
        else kObj.sakitIzin++;
      }
    });

    const persentaseSiswa =
      totalSiswaAktif > 0
        ? Math.min(100, Math.round((siswaHadir / totalSiswaAktif) * 100))
        : siswaHadir > 0
        ? 100
        : 0;

    const kemarinHadir = prevAbsenList.length;
    const kemarinKehadiranPct =
      totalSiswaAktif > 0
        ? Math.min(100, Math.round((kemarinHadir / totalSiswaAktif) * 100))
        : null;
    const kehadiranDeltaPct =
      kemarinKehadiranPct !== null
        ? Math.round((persentaseSiswa - kemarinKehadiranPct) * 10) / 10
        : null;

    let topRombelAlpa: Array<{ kelasNama: string; alpaCount: number }> = [];
    let rombelSempurna: string[] = [];
    mapKelas.forEach((val, kName) => {
      if (val.hadir > 0 && val.alpa === 0 && val.sakitIzin === 0) {
        rombelSempurna.push(kName);
      }
      if (val.alpa > 0) {
        topRombelAlpa.push({ kelasNama: kName, alpaCount: val.alpa });
      }
    });
    topRombelAlpa.sort((a, b) => b.alpaCount - a.alpaCount);
    topRombelAlpa = topRombelAlpa.slice(0, 4);
    rombelSempurna = rombelSempurna.slice(0, 4);

    // Early Warning: Siswa Alpa Berturut-turut (7 hari terakhir pada TP/Semester aktif)
    const consecutiveAlpaItems: Array<{ nama: string; kelas: string; count: number }> = [];
    if (todayAlpaStudents.length > 0) {
      const candidateAlpa = todayAlpaStudents.slice(0, 15);
      const pastAlpaRows = await prisma.absenSiswa.findMany({
        where: {
          tenant_id: tenantId,
          siswa_id: { in: candidateAlpa.map((s) => s.siswaId) },
          status: 'ALPA',
          created_at: { gte: week1Start, lt: startUTC },
          ...(activeTp ? { SesiAbsensi: sesiAcademicScope } : {}),
        },
        select: { siswa_id: true, created_at: true },
      });

      const distinctDaysBySiswa = new Map<string, Set<string>>();
      for (const r of pastAlpaRows) {
        if (!r.siswa_id) continue;
        const dKey = r.created_at.toISOString().slice(0, 10);
        if (!distinctDaysBySiswa.has(r.siswa_id)) {
          distinctDaysBySiswa.set(r.siswa_id, new Set());
        }
        distinctDaysBySiswa.get(r.siswa_id)!.add(dKey);
      }

      for (const cand of candidateAlpa) {
        const pastDays = distinctDaysBySiswa.get(cand.siswaId)?.size || 0;
        const totalAlpaDays = pastDays + 1;
        if (totalAlpaDays >= 2) {
          consecutiveAlpaItems.push({
            nama: cand.nama,
            kelas: cand.kelas,
            count: totalAlpaDays,
          });
        }
      }
      consecutiveAlpaItems.sort((a, b) => b.count - a.count);
    }

    const siswaIzinKeluar = ikList.length;
    const izinKeluarItems = ikList.slice(0, 5).map((ik) => {
      const jamK = ik.jam_keluar
        ? new Date(ik.jam_keluar).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: tz,
          })
        : '-';
      const jamB = ik.jam_kembali
        ? new Date(ik.jam_kembali).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: tz,
          })
        : undefined;
      return {
        nama: ik.SiswaAkademik?.siswa?.nama_siswa || 'Siswa',
        kelas: ik.SiswaAkademik?.kelas?.nama_kelas || 'Kelas',
        alasan: ik.alasan,
        status: ik.status === 'KEMBALI' ? 'Sudah Kembali' : 'Masih di Luar',
        jamKeluar: jamK,
        jamKembali: jamB,
      };
    });

    let pelanggaranDeltaPct: number | null = null;
    if (pelanggaranMingguLalu > 0) {
      pelanggaranDeltaPct = Math.round(
        ((pelanggaranMingguIni - pelanggaranMingguLalu) / pelanggaranMingguLalu) * 100
      );
    } else if (pelanggaranMingguIni === 0) {
      pelanggaranDeltaPct = 0;
    }

    const progresPenangananPelanggaranPct =
      pelanggaranSemesterTotal > 0
        ? Math.round((pelanggaranSemesterSelesai / pelanggaranSemesterTotal) * 100)
        : 100;

    return {
      academicContext,
      totalSiswaAktif,
      siswaHadir,
      siswaSakit,
      siswaIzin,
      siswaAlpa,
      persentaseSiswa,
      kemarinKehadiranPct,
      kehadiranDeltaPct,
      siswaTerlambat,
      siswaIzinKeluar,
      izinKeluarItems,
      topRombelAlpa,
      rombelSempurna,
      consecutiveAlpaItems,
      pelanggaranMingguIni,
      pelanggaranMingguLalu,
      pelanggaranDeltaPct,
      pelanggaranSemesterTotal,
      pelanggaranSemesterSelesai,
      progresPenangananPelanggaranPct,
    };
  }
}
