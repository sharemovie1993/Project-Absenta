import { prisma } from '@/utils/prisma';
import { RoleName } from '../../../../constants/enums';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export interface CreateTahunPelajaranInput {
  tahun: string;
  is_active?: boolean;
}

export interface UpdateTahunPelajaranInput {
  tahun?: string;
  is_active?: boolean;
}

export interface TahunPelajaranResponse {
  id: string;
  tenant_id: string;
  tahun: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  _count?: {
    Siswa: number;
    Semester: number;
  };
}

export class TahunPelajaranService {
  async getAllTahunPelajaran(requestingUserRole: RoleName, requestingUserTenantId?: string, status?: string): Promise<TahunPelajaranResponse[]> {
    let whereClause: any = {};

    // Only system SUPERADMIN can see all tahun pelajaran; others are tenant-scoped
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    if (status === 'ACTIVE') {
      whereClause.is_active = true;
    } else if (status === 'INACTIVE') {
      whereClause.is_active = false;
    }

    const list = await prisma.tahunPelajaran.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            Siswa: true,
            Semester: true,
            SiswaAkademik: true,
          },
        },
      },
      orderBy: {
        tahun: 'desc',
      },
    });

    return await this.attachDistinctStudentCounts(list);
  }

  private async attachDistinctStudentCounts(items: any[]): Promise<any[]> {
    return Promise.all(
      items.map(async (tp) => {
        // 1. Histori Siswa (distinct unique students ever enrolled in this school year)
        const distinctAkademik = await prisma.siswaAkademik.groupBy({
          by: ['siswa_id'],
          where: { tahun_pelajaran_id: tp.id },
        });

        let historiCount = distinctAkademik.length;
        if (historiCount === 0 && tp._count?.Siswa) {
          historiCount = tp._count.Siswa;
        }

        // 2. Siswa Aktif: Current active students for this active school year
        let siswaAktifCount = 0;
        if (tp.is_active) {
          siswaAktifCount = await prisma.siswa.count({
            where: {
              tenant_id: tp.tenant_id,
              tahun_pelajaran_id: tp.id,
              status: 'AKTIF',
            },
          });
        }

        return {
          ...tp,
          _count: {
            ...tp._count,
            Siswa: siswaAktifCount,
            SiswaAktif: siswaAktifCount,
            HistoriSiswa: historiCount,
            SiswaAkademik: historiCount,
          },
        };
      })
    );
  }

  async getTahunPelajaranById(tahunPelajaranId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<TahunPelajaranResponse | null> {
    let whereClause: any = { id: tahunPelajaranId };

    // Only system SUPERADMIN can view any tahun pelajaran; others are tenant-scoped
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const item = await prisma.tahunPelajaran.findFirst({
      where: whereClause,
      include: {
        _count: {
          select: {
            Siswa: true,
            Semester: true,
            SiswaAkademik: true,
          },
        },
      },
    });

    if (!item) return null;
    const [result] = await this.attachDistinctStudentCounts([item]);
    return result as TahunPelajaranResponse;
  }

  async createTahunPelajaran(input: CreateTahunPelajaranInput, tenantId: string): Promise<TahunPelajaranResponse> {
    // Check if tahun is unique within tenant
    const existingTahun = await prisma.tahunPelajaran.findFirst({
      where: {
        tenant_id: tenantId,
        tahun: input.tahun,
      },
    });

    if (existingTahun) {
      throw new Error('Tahun pelajaran already exists in this tenant');
    }

    // Validate tahun format (should be like "2023/2024")
    const tahunPattern = /^\d{4}\/\d{4}$/;
    if (!tahunPattern.test(input.tahun)) {
      throw new Error('Tahun format should be YYYY/YYYY (e.g., 2023/2024)');
    }

    // Extract years and validate they are consecutive
    const years = input.tahun.split('/').map(Number);
    const startYear = years[0];
    const endYear = years[1];
    if (!startYear || !endYear || endYear !== startYear + 1) {
      throw new Error('Tahun pelajaran must be consecutive years (e.g., 2023/2024)');
    }

    // Wrap in a transaction to ensure atomic creation of Tahun Pelajaran and its two semesters
    const tahunPelajaran = await prisma.$transaction(async (tx) => {
      if (input.is_active) {
        // Deactivate all other school years in the same tenant
        await tx.tahunPelajaran.updateMany({
          where: {
            tenant_id: tenantId,
          },
          data: {
            is_active: false,
          },
        });

        // Deactivate all other semesters in the same tenant
        await tx.semester.updateMany({
          where: {
            tenant_id: tenantId,
          },
          data: {
            is_active: false,
          },
        });
      }

      // Create new Tahun Pelajaran
      const createdTahun = await tx.tahunPelajaran.create({
        data: {
          tenant_id: tenantId,
          tahun: input.tahun,
          is_active: input.is_active ? true : false,
        },
      });

      // Create Semester Ganjil
      await tx.semester.create({
        data: {
          tenant_id: tenantId,
          nama_semester: 'Ganjil',
          tahun_pelajaran_id: createdTahun.id,
          is_active: input.is_active ? true : false, // Active if Year is active
        },
      });

      // Create Semester Genap
      await tx.semester.create({
        data: {
          tenant_id: tenantId,
          nama_semester: 'Genap',
          tahun_pelajaran_id: createdTahun.id,
          is_active: false, // Always inactive at start of school year
        },
      });

      // Fetch the created year with counts for response
      return await tx.tahunPelajaran.findUnique({
        where: { id: createdTahun.id },
        include: {
          _count: {
            select: {
              Siswa: true,
              Semester: true,
            },
          },
        },
      });
    });

    return tahunPelajaran as TahunPelajaranResponse;
  }

  async updateTahunPelajaran(tahunPelajaranId: string, input: UpdateTahunPelajaranInput, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<TahunPelajaranResponse> {
    // Check if tahun pelajaran exists and user has permission
    let whereClause: any = { id: tahunPelajaranId };
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const existingTahunPelajaran = await prisma.tahunPelajaran.findFirst({
      where: whereClause,
    });

    if (!existingTahunPelajaran) {
      throw new Error('Tahun pelajaran not found or insufficient permissions');
    }

    // Check if tahun is unique within tenant (if provided and different from current)
    if (input.tahun && input.tahun !== existingTahunPelajaran.tahun) {
      const existingTahun = await prisma.tahunPelajaran.findFirst({
        where: {
          tenant_id: existingTahunPelajaran.tenant_id,
          tahun: input.tahun,
          id: { not: tahunPelajaranId },
        },
      });

      if (existingTahun) {
        throw new Error('Tahun pelajaran already exists in this tenant');
      }

      // Validate tahun format if provided
      const tahunPattern = /^\d{4}\/\d{4}$/;
      if (!tahunPattern.test(input.tahun)) {
        throw new Error('Tahun format should be YYYY/YYYY (e.g., 2023/2024)');
      }

      // Extract years and validate they are consecutive
      const years = input.tahun.split('/').map(Number);
      const startYear = years[0];
      const endYear = years[1];
      if (!startYear || !endYear || endYear !== startYear + 1) {
        throw new Error('Tahun pelajaran must be consecutive years (e.g., 2023/2024)');
      }
    }

    // Build update data dynamically to avoid exactOptionalPropertyTypes issues
    const updateData: any = {};
    if (input.tahun !== undefined) updateData.tahun = input.tahun;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    if (input.is_active === true) {
      await prisma.tahunPelajaran.updateMany({
        where: {
          tenant_id: existingTahunPelajaran.tenant_id,
          id: { not: tahunPelajaranId },
        },
        data: {
          is_active: false,
        },
      });
    }

    const tahunPelajaran = await prisma.tahunPelajaran.update({
      where: { id: tahunPelajaranId },
      data: updateData,
      include: {
        _count: {
          select: {
            Siswa: true,
            Semester: true,
          },
        },
      },
    });

    return tahunPelajaran as TahunPelajaranResponse;
  }

  async deleteTahunPelajaran(tahunPelajaranId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<void> {
    // Check if tahun pelajaran exists and user has permission
    let whereClause: any = { id: tahunPelajaranId };
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const existingTahunPelajaran = await prisma.tahunPelajaran.findFirst({
      where: whereClause,
    });

    if (!existingTahunPelajaran) {
      throw new Error('Tahun pelajaran not found or insufficient permissions');
    }

    // Check if tahun pelajaran has related records that prevent deletion
    const relatedRecords = await prisma.tahunPelajaran.findFirst({
      where: { id: tahunPelajaranId },
      include: {
        _count: {
          select: {
            Semester: true,
            Siswa: true,
            SesiAbsensi: true,
            SesiGerbang: true,
            SiswaAkademik: true,
            AbsenGuru: true,
            JadwalKBM: true,
            StrukturKurikulum: true,
          },
        },
      },
    });

    if (relatedRecords) {
      const counts = relatedRecords._count;
      if (counts.Semester > 0) throw new Error('Tidak dapat menghapus tahun pelajaran yang masih memiliki data Semester');
      if (counts.Siswa > 0) throw new Error('Tidak dapat menghapus tahun pelajaran yang masih memiliki data Siswa');
      if (counts.SesiAbsensi > 0) throw new Error('Tidak dapat menghapus tahun pelajaran yang memiliki catatan Sesi Absensi');
      if (counts.SesiGerbang > 0) throw new Error('Tidak dapat menghapus tahun pelajaran yang memiliki catatan Sesi Gerbang');
      if (counts.SiswaAkademik > 0) throw new Error('Tidak dapat menghapus tahun pelajaran yang memiliki riwayat data akademik siswa');
      if (counts.AbsenGuru > 0) throw new Error('Tidak dapat menghapus tahun pelajaran yang memiliki catatan absensi guru');
      if (counts.JadwalKBM > 0) throw new Error('Tidak dapat menghapus tahun pelajaran yang memiliki data jadwal pelajaran');
      if (counts.StrukturKurikulum > 0) throw new Error('Tidak dapat menghapus tahun pelajaran yang memiliki data Struktur Kurikulum');
    }

    await prisma.tahunPelajaran.delete({
      where: { id: tahunPelajaranId },
    });
  }

  // Additional method to get active tahun pelajaran
  async getActiveTahunPelajaran(requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<TahunPelajaranResponse[]> {
    let whereClause: any = { is_active: true };

    // Only system SUPERADMIN can see all active tahun pelajaran; others are tenant-scoped
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const list = await prisma.tahunPelajaran.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            Siswa: true,
            Semester: true,
            SiswaAkademik: true,
          },
        },
      },
      orderBy: {
        tahun: 'desc',
      },
    });

    return await this.attachDistinctStudentCounts(list);
  }

  // Consolidated single-active getter
  async getActiveTahunPelajaranSingle(requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<TahunPelajaranResponse | null> {
    let whereClause: any = { is_active: true };
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }
    const item = await prisma.tahunPelajaran.findFirst({
      where: whereClause,
      include: {
        _count: {
          select: {
            Siswa: true,
            Semester: true,
            SiswaAkademik: true,
          },
        },
      },
      orderBy: {
        tahun: 'desc',
      },
    });
    if (!item) return null;
    const [result] = await this.attachDistinctStudentCounts([item]);
    return result as TahunPelajaranResponse | null;
  }
  // Additional method to set tahun pelajaran as active (and deactivate others)
  async setActiveTahunPelajaran(tahunPelajaranId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<TahunPelajaranResponse> {
    // Check if tahun pelajaran exists and user has permission
    let whereClause: any = { id: tahunPelajaranId };
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const existingTahunPelajaran = await prisma.tahunPelajaran.findFirst({
      where: whereClause,
    });

    if (!existingTahunPelajaran) {
      throw new Error('Tahun pelajaran not found or insufficient permissions');
    }

    // Deactivate all other tahun pelajaran in the same tenant
    await prisma.tahunPelajaran.updateMany({
      where: {
        tenant_id: existingTahunPelajaran.tenant_id,
        id: { not: tahunPelajaranId },
      },
      data: {
        is_active: false,
      },
    });

    // Activate the selected tahun pelajaran
    const tahunPelajaran = await prisma.tahunPelajaran.update({
      where: { id: tahunPelajaranId },
      data: {
        is_active: true,
      },
      include: {
        _count: {
          select: {
            Siswa: true,
            Semester: true,
            SiswaAkademik: true,
          },
        },
      },
    });

    await cacheInvalidationService.invalidateAcademicCache(existingTahunPelajaran.tenant_id);
    return tahunPelajaran as TahunPelajaranResponse;
  }
}

export const tahunPelajaranService = new TahunPelajaranService();
