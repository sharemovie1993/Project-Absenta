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
      totalKelas10,
      totalKelas11,
      totalKelas12,
      totalSiswa,
      totalGuru,
      totalMapel,
      totalSemester,
      totalTahunPelajaran
    ] = await Promise.all([
      // Total Jurusan
      prisma.jurusan.count({
        where: whereClause
      }),
      
      // Total Kelas (only active)
      prisma.kelas.count({
        where: {
          ...kelasWhereClause,
          is_active: true
        }
      }),

      // Active Kelas Tingkat 10
      prisma.kelas.count({
        where: {
          ...kelasWhereClause,
          tingkat: 10,
          is_active: true
        }
      }),

      // Active Kelas Tingkat 11
      prisma.kelas.count({
        where: {
          ...kelasWhereClause,
          tingkat: 11,
          is_active: true
        }
      }),

      // Active Kelas Tingkat 12
      prisma.kelas.count({
        where: {
          ...kelasWhereClause,
          tingkat: 12,
          is_active: true
        }
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
      total_jurusan: totalJurusan,
      total_kelas: totalKelas,
      total_kelas_10: totalKelas10,
      total_kelas_11: totalKelas11,
      total_kelas_12: totalKelas12,
      total_siswa: totalSiswa,
      total_guru: totalGuru,
      total_mapel: totalMapel,
      total_semester: totalSemester,
      total_tahun_pelajaran: totalTahunPelajaran,
      tahun_pelajaran: activeTahunPelajaran,
      semester: activeSemester
    };
  }
}