import { prisma } from '../../../utils/prisma';

export class AcademicStatsService {
  
  /**
   * Get Academic Statistics
   * Returns total counts for all academic entities
   */
  async getAcademicStats(tenantId: string | null, dataScope?: any) {
    // Build where clause based on tenantId
    const whereClause: any = {};
    const siswaWhereClause: any = {};
    const kelasWhereClause: any = {};
    
    // If tenantId is provided, filter by tenant; otherwise get all data (SUPERADMIN)
    if (tenantId) {
      whereClause.tenant_id = tenantId;
      siswaWhereClause.tenant_id = tenantId;
      kelasWhereClause.tenant_id = tenantId;
    }

    // Apply class-level isolation for Wali Kelas:
    // dataScope.kelasIds is set when user has kelas assignments (e.g. WALIKELAS)
    // dataScope.tenantWide is true for admin/management roles who see all classes
    const kelasIds = dataScope?.kelasIds;
    const tenantWide = dataScope?.tenantWide;

    if (Array.isArray(kelasIds) && kelasIds.length > 0 && !tenantWide) {
      siswaWhereClause.kelas_id = { in: kelasIds };
      kelasWhereClause.id = { in: kelasIds };
    }

    // Get total counts for each academic entity
    const [
      totalJurusan,
      totalKelas,
      totalSiswa,
      totalGuru,
      totalMapel,
      totalSemester,
      totalTahunPelajaran,
      activeKelasByTingkat
    ] = await Promise.all([
      // Total Jurusan
      prisma.jurusan.count({
        where: whereClause
      }),
      
      // Total Kelas (all classes in database)
      prisma.kelas.count({
        where: kelasWhereClause
      }),
      
      // Total Siswa (only active students)
      prisma.siswa.count({
        where: {
          ...siswaWhereClause,
          status: 'AKTIF'
        }
      }),
      
      // Total Guru
      prisma.guru.count({
        where: whereClause
      }),
      
      // Total Mata Pelajaran
      prisma.mapel.count({
        where: whereClause
      }),
      
      // Total Semester
      prisma.semester.count({
        where: whereClause
      }),
      
      // Total Tahun Pelajaran
      prisma.tahunPelajaran.count({
        where: whereClause
      }),

      // Count active classes grouped by tingkat dynamically
      prisma.kelas.groupBy({
        by: ['tingkat'],
        where: {
          ...kelasWhereClause,
          is_active: true
        },
        _count: {
          id: true
        }
      })
    ]);

    // Get active Tahun Pelajaran and Semester
    const [activeTahunPelajaran, activeSemester] = await Promise.all([
      prisma.tahunPelajaran.findFirst({
        where: { ...whereClause, is_active: true }
      }),
      prisma.semester.findFirst({
        where: { ...whereClause, is_active: true }
      })
    ]);

    return {
      totalJurusan,
      totalKelas,
      totalSiswa,
      totalGuru,
      totalMapel,
      totalSemester,
      totalTahunPelajaran,
      activeKelasByTingkat: activeKelasByTingkat.map(g => ({ tingkat: g.tingkat, count: g._count.id })),
      activeTahunPelajaran,
      activeSemester
    };
  }

  /**
   * Get Yearly Comparison Stats
   * Returns student counts comparison between school years
   */
  async getYearlyComparison(tenantId: string) {
    const years = await prisma.tahunPelajaran.findMany({
      where: { tenant_id: tenantId },
      orderBy: { tahun: 'desc' },
      take: 5
    });

    const comparison = await Promise.all(years.map(async (year) => {
      const studentCount = await prisma.siswaAkademik.count({
        where: {
          tahun_pelajaran_id: year.id,
          status: 'AKTIF'
        }
      });

      const teacherCount = await prisma.guru.count({
        where: {
          tenant_id: tenantId,
          created_at: {
            lte: year.updated_at
          }
        }
      });

      return {
        year: year.tahun,
        students: studentCount,
        teachers: teacherCount,
        ratio: teacherCount > 0 ? (studentCount / teacherCount).toFixed(2) : 0
      };
    }));

    return comparison.reverse();
  }
}