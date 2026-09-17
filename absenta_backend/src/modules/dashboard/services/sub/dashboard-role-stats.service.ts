// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { AbsensiMode } from '@/constants/enums';
import { formatTenantTime, getTenantTimezone, getTenantOffsetString, getTenantDayRange } from '@/utils/timezone.utils';
import { sesiLifecycleService, SesiLifecycleService } from '@/modules/attendance/sesi-absensi/services/sesi-lifecycle.service';
import { DashboardCommonHelper } from './dashboard-common.helper';
import { STRUKTUR_CODES } from '@/config/organization-structure';

export class DashboardRoleStatsService {
  private helper = new DashboardCommonHelper();
  private resolveDayRange(...args: any[]) { return this.helper.resolveDayRange(...args); }

  async getHubinStats(tenantId: string, userId?: string) {
    let guruId: string | undefined;
    let isGlobalHubin = false;
    let isKaprog = false;
    let kaprogUnitIds: string[] = [];
    let isWalikelas = false;
    let walikelasKelasIds: string[] = [];

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          Guru: true,
          Role: {
            include: {
              rolePermissions: true
            }
          },
          organizationalAssignments: {
            where: { is_active: true },
            include: { Position: true }
          }
        }
      });

      guruId = user?.Guru?.id;
      
      // Mengacu pada position-capabilities.ts & STRUKTUR_CODES:
      const permissions = user?.Role?.rolePermissions.map(rp => rp.permission_id) || [];
      const assignedPositions = user?.organizationalAssignments?.map((oa: any) => oa.Position?.code) || [];

      // 1. Jabatan Struktural Eksekutif Hubin (tenant-wide scope):
      //    - STRUKTUR_CODES.HUBIN (Waka Hubin & Staf)
      //    - STRUKTUR_CODES.BKK (Ketua Bursa Kerja Khusus)
      //    - STRUKTUR_CODES.KEPALA_SEKOLAH (Pimpinan Satuan Pendidikan)
      const hasHubinExecutivePosition = assignedPositions.some(code => 
        code === STRUKTUR_CODES.HUBIN || 
        code === STRUKTUR_CODES.BKK || 
        code === STRUKTUR_CODES.KEPALA_SEKOLAH
      );

      // Jabatan Struktural KAPROG (Jurusan Scoped)
      const kaprogAssignments = user?.organizationalAssignments?.filter((oa: any) => 
        (oa.Position?.code === STRUKTUR_CODES.KAPROG || oa.Position?.code === 'KAPROG') && oa.unit_id
      ) || [];
      isKaprog = !hasHubinExecutivePosition && user?.Role?.name !== 'ADMIN' && kaprogAssignments.length > 0;
      if (isKaprog) {
        kaprogUnitIds = kaprogAssignments.map((a: any) => a.unit_id);
      }

      // Jabatan Struktural WALIKELAS (Kelas Scoped)
      const walikelasAssignments = user?.organizationalAssignments?.filter((oa: any) => 
        (oa.Position?.code === STRUKTUR_CODES.WALIKELAS || oa.Position?.code === 'WALIKELAS' || oa.Position?.code === 'WALI_KELAS') && oa.kelas_id
      ) || [];
      isWalikelas = !hasHubinExecutivePosition && user?.Role?.name !== 'ADMIN' && !isKaprog && walikelasAssignments.length > 0;
      if (isWalikelas) {
        walikelasKelasIds = walikelasAssignments.map((a: any) => a.kelas_id);
      }

      // 2. Kapabilitas Eksplisit Kanonikal (PoLP)
      const hasHubinManagementCap = 
        permissions.includes('dashboard.view.hubin') ||
        permissions.includes('hubin.pkl.manage') ||
        permissions.includes('hubin.partners.manage');

      if (isKaprog || isWalikelas) {
        isGlobalHubin = false;
      } else {
        isGlobalHubin = user?.Role?.name === 'ADMIN' ||
                        hasHubinExecutivePosition ||
                        hasHubinManagementCap;
      }
    }

    // Dapatkan Tahun Pelajaran yang sedang aktif di tenant
    const activeTp = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true }
    });

    const baseWhere: any = { tenant_id: tenantId };
    const pklWhere: any = { tenant_id: tenantId };

    if (isKaprog && kaprogUnitIds.length > 0) {
      pklWhere.Siswa = {
        OR: [
          { jurusan_id: { in: kaprogUnitIds } },
          { Kelas: { jurusan_id: { in: kaprogUnitIds } } }
        ]
      };
    } else if (isWalikelas && walikelasKelasIds.length > 0) {
      pklWhere.Siswa = {
        kelas_id: { in: walikelasKelasIds }
      };
    } else if (!isGlobalHubin && guruId) {
      pklWhere.pembimbing_id = guruId;
    }

    // Batasi siswa PKL pada Tahun Pelajaran yang sedang aktif jika ada
    if (activeTp) {
      pklWhere.OR = [
        { SiswaAkademik: { tahun_pelajaran_id: activeTp.id } },
        { Siswa: { tahun_pelajaran_id: activeTp.id } }
      ];
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get all unique student IDs with status LULUS or in SiswaAkademik with status LULUS
    const alumniStudents = await prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { status: 'LULUS' },
          { SiswaAkademik: { some: { status: 'LULUS' } } }
        ]
      },
      select: { id: true }
    });
    const totalAlumni = alumniStudents.length;

    const todayDateStr = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Asia/Jakarta', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).format(new Date());
    const todayDate = new Date(`${todayDateStr}T00:00:00.000Z`);

    const [
      totalMitra,
      totalSiswaPkl,
      pklAktif,
      pendingReports,
      mouExpiringCount,
      totalLowonganAktif,
      totalAlumniTraced,
      statusBekerjaCount,
      statusWirausahaCount,
      totalRecruitmentSuccess,
      topMitraGroup,
      tracedAlumni,
      todayAbsensiList,
      pklGradingList,
      tefaTotalOrders,
      tefaActiveOrders
    ] = await Promise.all([
      prisma.mitraIndustri.count({ where: baseWhere }),
      prisma.siswaPkl.count({ where: pklWhere }),
      prisma.siswaPkl.count({ where: { ...pklWhere, status: 'AKTIF' } }),
      prisma.absensiPkl.count({
        where: {
          SiswaPkl: pklWhere,
          is_verified: false
        }
      }),
      prisma.mitraIndustri.count({
        where: {
          ...baseWhere,
          mou_tanggal_berakhir: {
            gte: new Date(),
            lte: thirtyDaysFromNow
          }
        }
      }),
      prisma.hubinLowongan.count({
        where: {
          ...baseWhere,
          status: 'BUKA',
          deleted_at: null
        }
      }),
      prisma.hubinTracerStudy.count({
        where: { ...baseWhere, deleted_at: null }
      }),
      prisma.hubinTracerStudy.count({
        where: { ...baseWhere, status_alumni: 'BEKERJA', deleted_at: null }
      }),
      prisma.hubinTracerStudy.count({
        where: { ...baseWhere, status_alumni: 'WIRAUSAHA', deleted_at: null }
      }),
      prisma.hubinLamaran.count({
        where: { ...baseWhere, status_seleksi: 'DITERIMA', deleted_at: null }
      }),
      prisma.siswaPkl.groupBy({
        by: ['mitra_id'],
        where: { tenant_id: tenantId, status: 'AKTIF' },
        _count: { siswa_id: true },
        orderBy: { _count: { siswa_id: 'desc' } },
        take: 5
      }),
      prisma.hubinTracerStudy.findMany({
        where: {
          tenant_id: tenantId,
          status_alumni: { in: ['BEKERJA', 'WIRAUSAHA'] },
          deleted_at: null
        },
        include: {
          Siswa: {
            include: {
              Kelas: {
                include: {
                  Jurusan: true
                }
              }
            }
          }
        }
      }),
      prisma.absensiPkl.findMany({
        where: {
          tenant_id: tenantId,
          tanggal: todayDate,
          SiswaPkl: pklWhere
        },
        select: {
          id: true,
          status: true,
          is_verified: true
        }
      }),
      prisma.siswaPkl.findMany({
        where: pklWhere,
        select: {
          id: true,
          siswa_id: true,
          status: true,
          tanggal_selesai: true,
          nilai_akhir_pkl: true,
          nilai_json: true,
          nomor_sertifikat: true,
          hard_kompetensi_teknis: true
        }
      }),
      prisma.hubinTefaOrder.count({ where: { ...baseWhere, deleted_at: null } }),
      prisma.hubinTefaOrder.count({ where: { ...baseWhere, status_proyek: { in: ['PERENCANAAN', 'BERJALAN'] }, deleted_at: null } })
    ]);

    // Tracer Coverage
    const tracerCoverage = totalAlumni > 0 ? (totalAlumniTraced / totalAlumni) * 100 : 0;

    // Employment Rate
    const employmentRate = totalAlumniTraced > 0 ? ((statusBekerjaCount + statusWirausahaCount) / totalAlumniTraced) * 100 : 0;

    // Top Mitra Detail
    const topMitraIds = topMitraGroup.map(g => g.mitra_id);
    const topMitrasDetail = await prisma.mitraIndustri.findMany({
      where: { id: { in: topMitraIds } },
      select: { id: true, nama: true }
    });
    const topMitra = topMitraGroup.map(g => {
      const detail = topMitrasDetail.find(m => m.id === g.mitra_id);
      return {
        id: g.mitra_id,
        nama: detail?.nama || 'Tidak Diketahui',
        count: g._count.siswa_id
      };
    });

    // Top Jurusan Terserap
    const jurusanCounts: Record<string, { nama: string; count: number }> = {};
    tracedAlumni.forEach(ta => {
      const jurusan = ta.Siswa?.Kelas?.Jurusan;
      if (jurusan) {
        if (!jurusanCounts[jurusan.id]) {
          jurusanCounts[jurusan.id] = {
            nama: jurusan.nama,
            count: 0
          };
        }
        jurusanCounts[jurusan.id]!.count++;
      }
    });
    const topJurusanTerserap = Object.values(jurusanCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const tracerGroups = await prisma.hubinTracerStudy.groupBy({
      by: ['status_alumni'],
      where: { ...baseWhere, deleted_at: null },
      _count: { status_alumni: true }
    });

    const tracerStats = {
      BEKERJA: 0,
      KULIAH: 0,
      WIRAUSAHA: 0,
      MENCARI_KERJA: 0
    };

    tracerGroups.forEach(g => {
      const key = g.status_alumni as keyof typeof tracerStats;
      if (tracerStats[key] !== undefined) {
        tracerStats[key] = g._count.status_alumni;
      }
    });

    const recentPkl = await prisma.siswaPkl.findMany({
      where: pklWhere,
      include: {
        Siswa: { select: { nama_siswa: true } },
        Mitra: { select: { nama: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    const hadirToday = todayAbsensiList.filter(a => a.status === 'HADIR' || a.status === 'TERLAMBAT').length;
    const sakitToday = todayAbsensiList.filter(a => a.status === 'SAKIT').length;
    const izinToday = todayAbsensiList.filter(a => a.status === 'IZIN').length;
    const unverifiedToday = todayAbsensiList.filter(a => !a.is_verified).length;

    // Deduplikasi dan agregasi berbasis siswa_id unik (mencegah double-counting jika siswa mutasi/pindah DUDI)
    const uniqueSiswaIds = new Set<string>();
    const activeSiswaIds = new Set<string>();
    const overdueSiswaIds = new Set<string>();
    const gradingPerSiswa = new Map<string, { sudahDinilai: boolean; sertifikat: boolean }>();

    for (const p of pklGradingList) {
      uniqueSiswaIds.add(p.siswa_id);
      if (p.status === 'AKTIF') {
        const finishDate = p.tanggal_selesai ? new Date(p.tanggal_selesai) : null;
        if (finishDate) {
          finishDate.setHours(23, 59, 59, 999);
        }
        const isOverdue = finishDate !== null && finishDate.getTime() < todayDate.getTime();
        if (isOverdue) {
          overdueSiswaIds.add(p.siswa_id);
        } else {
          activeSiswaIds.add(p.siswa_id);
        }
      }
      const dudiAvg = (p.nilai_json as any)?.dudi_avg;
      const isGraded = (p.nilai_akhir_pkl !== null && p.nilai_akhir_pkl !== undefined) ||
                       (dudiAvg !== null && dudiAvg !== undefined) ||
                       (p.hard_kompetensi_teknis !== null && p.hard_kompetensi_teknis !== undefined);
      const hasCert = Boolean(p.nomor_sertifikat && p.nomor_sertifikat.trim() !== '');
      const curr = gradingPerSiswa.get(p.siswa_id) || { sudahDinilai: false, sertifikat: false };
      gradingPerSiswa.set(p.siswa_id, {
        sudahDinilai: curr.sudahDinilai || isGraded,
        sertifikat: curr.sertifikat || hasCert,
      });
    }

    // Jika seorang siswa memiliki record aktif yang masih in-season, jangan masukkan ke overdue
    for (const id of activeSiswaIds) {
      overdueSiswaIds.delete(id);
    }

    // Siswa yang praktiknya selesai (tidak lagi memiliki status AKTIF in-season maupun overdue)
    const finishedSiswaIds = new Set<string>();
    for (const p of pklGradingList) {
      if (p.status === 'SELESAI' && !activeSiswaIds.has(p.siswa_id) && !overdueSiswaIds.has(p.siswa_id)) {
        finishedSiswaIds.add(p.siswa_id);
      }
    }

    const totalUniqueSiswaPkl = uniqueSiswaIds.size;
    const resolvedPklAktif = activeSiswaIds.size;
    const resolvedPklOverdue = overdueSiswaIds.size;
    const resolvedPklSelesai = finishedSiswaIds.size;

    let sudahDinilaiCount = 0;
    let sertifikatTerbitCount = 0;
    let selesaiBelumDinilaiCount = 0;

    for (const [sId, info] of gradingPerSiswa.entries()) {
      if (info.sudahDinilai) sudahDinilaiCount++;
      if (info.sertifikat) sertifikatTerbitCount++;
      if (finishedSiswaIds.has(sId) && !info.sudahDinilai) {
        selesaiBelumDinilaiCount++;
      }
    }

    const belumDinilaiCount = Math.max(0, totalUniqueSiswaPkl - sudahDinilaiCount);
    const persenDinilai = totalUniqueSiswaPkl > 0 ? Math.round((sudahDinilaiCount / totalUniqueSiswaPkl) * 100) : 0;

    // Evaluasi 4 Fase Siklus PKL SSOT
    let fasePkl: 'IN_SEASON_ACTIVE' | 'ROLLING_MIXED' | 'POST_SEASON_EVALUATION' | 'OFF_SEASON_PREPARATION' = 'OFF_SEASON_PREPARATION';
    const totalFinishedOrOverdue = resolvedPklSelesai + resolvedPklOverdue;
    if (resolvedPklAktif > 0 && totalFinishedOrOverdue > 0) {
      fasePkl = 'ROLLING_MIXED';
    } else if (resolvedPklAktif > 0) {
      fasePkl = 'IN_SEASON_ACTIVE';
    } else if (belumDinilaiCount > 0) {
      fasePkl = 'POST_SEASON_EVALUATION';
    } else {
      fasePkl = 'OFF_SEASON_PREPARATION';
    }

    return {
      totalMitra,
      totalSiswaPkl: totalUniqueSiswaPkl,
      pklAktif: resolvedPklAktif,
      pklOverdue: resolvedPklOverdue,
      pklSelesai: resolvedPklSelesai,
      fasePkl,
      pendingReports,
      mouExpiringCount,
      totalLowonganAktif,
      totalAlumniTraced,
      tracerStats,
      tracerCoverage,
      employmentRate,
      topMitra,
      topJurusanTerserap,
      totalRecruitmentSuccess,
      tahunPelajaran: activeTp ? {
        id: activeTp.id,
        nama: activeTp.tahun,
        is_active: activeTp.is_active
      } : null,
      todayPresensi: {
        hadir: hadirToday,
        sakit: sakitToday,
        izin: izinToday,
        unverified: unverifiedToday,
        totalHariIni: todayAbsensiList.length
      },
      penilaianStats: {
        sudahDinilai: sudahDinilaiCount,
        belumDinilai: belumDinilaiCount,
        totalSiswaPkl: totalUniqueSiswaPkl,
        persenSelesai: persenDinilai,
        sertifikatTerbit: sertifikatTerbitCount,
        selesaiPraktikCount: resolvedPklSelesai,
        selesaiBelumDinilaiCount: selesaiBelumDinilaiCount
      },
      tefaStats: {
        totalOrders: tefaTotalOrders,
        activeOrders: tefaActiveOrders
      },
      recentPkl: recentPkl.map(p => ({
        id: p.id,
        siswa: p.Siswa?.nama_siswa || 'Siswa',
        mitra: p.Mitra?.nama || 'Mitra',
        status: p.status,
        tanggal: (p.tanggal_mulai || p.created_at).toISOString()
      }))
    };
  }

  /**
   * 🆕 Get Sarpras (Inventory) Stats
   */
  async getSarprasStats(tenantId: string) {
    const [totalAssets, totalLoaned, totalBroken] = await Promise.all([
      prisma.sarprasAsset.count({ where: { tenant_id: tenantId } }),
      prisma.sarprasLoan.count({ where: { tenant_id: tenantId, status: 'ACTIVE' } }),
      prisma.sarprasAsset.count({ where: { tenant_id: tenantId, kondisi: 'RUSAK' } })
    ]);

    const recentLoans = await prisma.sarprasLoan.findMany({
      where: { tenant_id: tenantId },
      include: {
        Asset: { select: { nama: true } },
        Peminjam: { select: { full_name: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    return {
      totalAssets,
      totalLoaned,
      totalBroken,
      recentLoans: recentLoans.map(l => ({
        id: l.id,
        asset: l.Asset.nama,
        borrower: l.Peminjam.full_name,
        status: l.status,
        date: l.tanggal_pinjam.toISOString()
      }))
    };
  }

  /**
   * 🆕 Get TU (Administration) Stats
   */
  async getTUStats(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [suratMasukCount, suratKeluarCount] = await Promise.all([
      prisma.suratMasuk.count({
        where: {
          tenant_id: tenantId,
          tanggal_terima: { gte: startOfMonth }
        }
      }),
      prisma.suratKeluar.count({
        where: {
          tenant_id: tenantId,
          tanggal_surat: { gte: startOfMonth }
        }
      })
    ]);

    const recentSuratMasuk = await prisma.suratMasuk.findMany({
      where: { tenant_id: tenantId },
      orderBy: { tanggal_terima: 'desc' },
      take: 5
    });

    return {
      suratMasukBulanIni: suratMasukCount,
      suratKeluarBulanIni: suratKeluarCount,
      recentSuratMasuk: recentSuratMasuk.map(s => ({
        id: s.id,
        nomor: s.nomor_surat,
        judul: s.judul,
        asal: s.asal_surat,
        tanggal: s.tanggal_terima.toISOString()
      }))
    };
  }

  /**
   * 🆕 Get Gerbang (Gate) Stats
   */
  async getGerbangStats(tenantId: string) {
    const { startOfDay: today, endOfDay } = await this.resolveDayRange(tenantId);

    const [totalTaps, masukCount, keluarCount] = await Promise.all([
      prisma.absenGerbangSiswa.count({
        where: {
          tenant_id: tenantId,
          created_at: { gte: today, lte: endOfDay }
        }
      }),
      prisma.absenGerbangSiswa.count({
        where: {
          tenant_id: tenantId,
          arah: 'GERBANG_DATANG',
          created_at: { gte: today, lte: endOfDay }
        }
      }),
      prisma.absenGerbangSiswa.count({
        where: {
          tenant_id: tenantId,
          arah: 'GERBANG_PULANG',
          created_at: { gte: today, lte: endOfDay }
        }
      })
    ]);

    const lastActivities = await prisma.absenGerbangSiswa.findMany({
      where: { tenant_id: tenantId },
      include: {
        Siswa: { select: { nama_siswa: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    return {
      total_taps_today: totalTaps,
      total_masuk: masukCount,
      total_keluar: keluarCount,
      active_devices: 1, // Placeholder until device monitoring implemented
      last_activity: lastActivities[0]?.created_at || new Date().toISOString(),
      recent_activities: lastActivities.map(l => ({
        id: l.id,
        siswa: l.Siswa.nama_siswa,
        arah: l.arah,
        waktu: l.created_at.toISOString()
      }))
    };
  }

  /**
   * 🆕 Get Petugas (Officer) Stats
   */
  async getPetugasStats(tenantId: string, userId: string) {
    const { startOfDay: today, endOfDay } = await this.resolveDayRange(tenantId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { Guru: true }
    });

    const guruId = user?.Guru?.id;

    const [totalSesi, sesiHariIni, sesiSelesai] = await Promise.all([
      prisma.sesiAbsensi.count({
        where: {
          tenant_id: tenantId,
          ...(guruId ? { guru_id: guruId } : {})
        }
      }),
      prisma.sesiAbsensi.count({
        where: {
          tenant_id: tenantId,
          ...(guruId ? { guru_id: guruId } : {}),
          tanggal: { gte: today, lte: endOfDay }
        }
      }),
      prisma.sesiAbsensi.count({
        where: {
          tenant_id: tenantId,
          ...(guruId ? { guru_id: guruId } : {}),
          status: 'SELESAI'
        }
      })
    ]);

    return {
      total_sesi: totalSesi,
      sesi_hari_ini: sesiHariIni,
      sesi_selesai: sesiSelesai,
    };
  }

  /**
   * 🆕 Get Kaprog (Kepala Program) Stats
   * - totalTeachers: jumlah guru di jurusan kaprog ini
   * - activeClasses: jumlah kelas aktif hari ini di jurusan ini
   * - supervisionCount: supervisi terjadwal hari ini
   */
  async getKaprogStats(tenantId: string, userId: string) {
    // Cari assignment Kaprog/Kepala Program untuk user ini
    const now = new Date();
    const assignment = await prisma.organizationalAssignment.findFirst({
      where: {
        user_id: userId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        is_active: true,
        AND: [
          { OR: [{ start_date: null }, { start_date: { lte: now } }] },
          { OR: [{ end_date: null }, { end_date: { gte: now } }] }
        ],
        Position: { code: { contains: 'KAPROG', mode: 'insensitive' } }
      },
      include: { Position: { select: { name: true, code: true } } }
    });

    const programName = assignment?.Position?.name?.replace(/KAPROG|KEPALA PROGRAM/gi, '').trim() || 'Jurusan';

    // Hitung guru di jurusan yang sama (berdasarkan mengajar di kelas jurusan yang sama)
    // Proxy: hitung guru yang punya sesi hari ini di tenant ini
    const { startOfDay: today, endOfDay } = await this.resolveDayRange(tenantId);

    const [totalTeachers, supervisionCount] = await Promise.all([
      prisma.guru.count({ where: { ...(tenantId ? { tenant_id: tenantId } : {}) } }),
      prisma.supervisiGuru.count({
        where: {
          ...(tenantId ? { tenant_id: tenantId } : {}),
          tanggal: { gte: today, lte: endOfDay }
        }
      })
    ]);

    // Hitung kelas aktif hari ini
    const activeSessions = await prisma.sesiAbsensi.count({
      where: {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        tanggal: { gte: today, lte: endOfDay },
        status: 'BERLANGSUNG'
      }
    });

    return {
      totalTeachers,
      activeClasses: activeSessions,
      supervisionCount,
      programName
    };
  }

  /**
   * 🆕 Get Toolman Stats
   * - toolsBorrowed: alat lab sedang dipinjam
   * - toolsAvailable: alat tersedia (tidak rusak, tidak dipinjam)
   * - damagedReports: alat rusak
   */
  async getToolmanStats(tenantId: string) {
    const where = tenantId ? { tenant_id: tenantId } : {};

    const [toolsBorrowed, totalAssets, damagedReports] = await Promise.all([
      prisma.sarprasLoan.count({
        where: { ...where, status: 'ACTIVE' }
      }),
      prisma.sarprasAsset.count({ where }),
      prisma.sarprasAsset.count({ where: { ...where, kondisi: 'RUSAK' } })
    ]);

    const toolsAvailable = Math.max(0, totalAssets - toolsBorrowed - damagedReports);

    return {
      toolsBorrowed,
      toolsAvailable,
      damagedReports
    };
  }

  /**
   * 🆕 Get Kabeng (Kepala Bengkel) Stats
   * - activeBengkel: ruang/bengkel yang aktif digunakan hari ini
   * - availableTools: alat tersedia di bengkel
   * - practiceSchedules: jadwal praktik hari ini
   */
  async getKabengStats(tenantId: string, userId: string) {
    const { startOfDay: today, endOfDay } = await this.resolveDayRange(tenantId);

    const where = tenantId ? { tenant_id: tenantId } : {};

    // Cari assignment Kabeng
    const now = new Date();
    const assignment = await prisma.organizationalAssignment.findFirst({
      where: {
        user_id: userId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        is_active: true,
        AND: [
          { OR: [{ start_date: null }, { start_date: { lte: now } }] },
          { OR: [{ end_date: null }, { end_date: { gte: now } }] }
        ],
        Position: { code: { contains: 'KABENG', mode: 'insensitive' } }
      },
      include: { Position: { select: { name: true } } }
    });

    const bengkelName = assignment?.Position?.name?.replace(/KABENG|KEPALA BENGKEL/gi, '').trim() || 'Bengkel';

    // Sesi praktik: sesi absensi yang berjalan hari ini (proxy untuk jadwal bengkel)
    const [activeBengkel, availableTools, practiceSchedules] = await Promise.all([
      // Ruang bengkel aktif: sesi dengan status BERLANGSUNG hari ini
      prisma.sesiAbsensi.count({
        where: { ...where, tanggal: { gte: today, lte: endOfDay }, status: 'BERLANGSUNG' }
      }),
      // Alat tersedia
      prisma.sarprasAsset.count({
        where: { ...where, kondisi: { not: 'RUSAK' } }
      }),
      // Jadwal praktik hari ini (total sesi hari ini)
      prisma.sesiAbsensi.count({
        where: { ...where, tanggal: { gte: today, lte: endOfDay } }
      })
    ]);

    return {
      activeBengkel,
      availableTools,
      practiceSchedules,
      bengkelName
    };
  }

  /**
   * 🆕 Get BKK (Bursa Kerja Khusus) Stats
   * - alumniPlaced: alumni yang sudah ditempatkan/bekerja (status PKL SELESAI)
   * - activeJobs: lowongan kerja aktif (jika ada model Job/Lowongan)
   * - pendingApplications: lamaran yang pending (dari siswaPkl yang belum aktif)
   */
  async getBkkStats(tenantId: string) {
    const where = tenantId ? { tenant_id: tenantId } : {};

    const [alumniPlaced, pendingApplications, activePkl] = await Promise.all([
      // Alumni yang sudah selesai PKL = sudah tersalur
      prisma.siswaPkl.count({ where: { ...where, status: 'SELESAI' } }),
      // Yang masih pending (belum disetujui/aktif)
      prisma.siswaPkl.count({ where: { ...where, status: { in: ['PENDING', 'MENUNGGU'] } } }),
      // PKL aktif sebagai proxy "lowongan yang diisi"
      prisma.siswaPkl.count({ where: { ...where, status: 'AKTIF' } })
    ]);

    return {
      alumniPlaced,
      activeJobs: activePkl, // PKL aktif sebagai proxy lowongan terisi
      pendingApplications
    };
  }

}
