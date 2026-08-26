// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { AbsensiMode } from '@/constants/enums';
import { formatTenantTime, getTenantTimezone, getTenantOffsetString, getTenantDayRange } from '@/utils/timezone.utils';
import { sesiLifecycleService, SesiLifecycleService } from '@/modules/attendance/sesi-absensi/services/sesi-lifecycle.service';
import { DashboardCommonHelper } from './dashboard-common.helper';

export class DashboardRoleStatsService {
  private helper = new DashboardCommonHelper();
  private resolveDayRange(...args: any[]) { return this.helper.resolveDayRange(...args); }

  async getHubinStats(tenantId: string, userId?: string) {
    let guruId: string | undefined;
    let isGlobalHubin = false;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          Guru: true,
          Role: {
            include: {
              rolePermissions: true
            }
          }
        }
      });

      guruId = user?.Guru?.id;
      
      // Check if user has global hubin management capability
      // If they do, they see everything. If not, they only see their assigned students.
      const permissions = user?.Role?.rolePermissions.map(rp => rp.permission_id) || [];
      isGlobalHubin = permissions.includes('hubin.partners.manage') || user?.Role?.name === 'ADMIN';
    }

    const baseWhere: any = { tenant_id: tenantId };
    const pklWhere: any = { tenant_id: tenantId };

    if (!isGlobalHubin && guruId) {
      pklWhere.pembimbing_id = guruId;
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
      tracedAlumni
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
      })
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

    return {
      totalMitra,
      totalSiswaPkl,
      pklAktif,
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
      recentPkl: recentPkl.map(p => ({
        id: p.id,
        siswa: p.Siswa.nama_siswa,
        mitra: p.Mitra.nama,
        status: p.status,
        tanggal: p.tanggal_mulai.toISOString()
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
