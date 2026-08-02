import { prisma } from '@/utils/prisma';
import { RoleName } from '../../../../constants/enums';
import { isSystemSuperAdmin } from '../../../../utils/rbac';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

/**
 * CATATAN DESAIN OPSI B (STRICT OPERATIONAL STATUS) & PRINSIP SAAS:
 * 
 * AKTIVASI SEMESTER vs SINKRONISASI:
 * 
 * 1. SINKRONISASI (Data Population):
 *    - Proses membuat/memperbarui snapshot SiswaAkademik.
 *    - TIDAK mengubah status administratif menjadi operasional.
 *    - Hanya memastikan data snapshot tersedia.
 * 
 * 2. AKTIVASI SEMESTER (Operational Trigger):
 *    - Satu-satunya proses yang mengubah status NAIK/TINGGAL -> AKTIF.
 *    - Menandai semester resmi dimulai secara operasional.
 * 
 * ALUR PROSES:
 * Saat semester diaktifkan:
 * 1. Sistem mencari semua record SiswaAkademik di semester tersebut.
 * 2. Record dengan status 'NAIK' atau 'TINGGAL' di-update menjadi 'AKTIF'.
 * 3. Record dengan status 'PINDAH' atau 'LULUS' TETAP (tidak diubah).
 */

export interface CreateSemesterInput {
  nama_semester: string;
  tahun_pelajaran_id: string;
  is_active?: boolean;
}

export interface UpdateSemesterInput {
  nama_semester?: string;
  tahun_pelajaran_id?: string;
  is_active?: boolean;
}

export interface SemesterResponse {
  id: string;
  tenant_id: string;
  nama_semester: string;
  tahun_pelajaran_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  TahunPelajaran: {
    id: string;
    tahun: string;
    is_active: boolean;
  };
  _count?: {
    SesiAbsensi: number;
    Siswa: number;
  };
}

export class SemesterService {
  async getAllSemester(requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<SemesterResponse[]> {
    let whereClause: any = {};

    // Only SUPERADMIN from system tenant can bypass tenant filter
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const semester = await prisma.semester.findMany({
      where: whereClause,
      include: {
        TahunPelajaran: {
          select: {
            id: true,
            tahun: true,
            is_active: true,
          },
        },
        _count: {
          select: {
            SesiAbsensi: true,
            Siswa: true,
          },
        },
      },
      orderBy: [
        { TahunPelajaran: { tahun: 'desc' } },
        { nama_semester: 'asc' },
      ],
    });

    return semester as SemesterResponse[];
  }

  async getSemesterById(semesterId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<SemesterResponse | null> {
    let whereClause: any = { id: semesterId };

    // Only SUPERADMIN from system tenant can bypass tenant filter
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const semester = await prisma.semester.findFirst({
      where: whereClause,
      include: {
        TahunPelajaran: {
          select: {
            id: true,
            tahun: true,
            is_active: true,
          },
        },
        _count: {
          select: {
            SesiAbsensi: true,
            Siswa: true,
          },
        },
      },
    });

    return semester as SemesterResponse | null;
  }

  async createSemester(input: CreateSemesterInput, tenantId: string): Promise<SemesterResponse> {
    // Check if tahun pelajaran exists and belongs to the same tenant
    const tahunPelajaran = await prisma.tahunPelajaran.findFirst({
      where: {
        id: input.tahun_pelajaran_id,
        tenant_id: tenantId,
      },
    });

    if (!tahunPelajaran) {
      throw new Error('Tahun pelajaran not found in this tenant');
    }

    // Check if semester name is unique within the same tahun pelajaran
    const existingSemester = await prisma.semester.findFirst({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: input.tahun_pelajaran_id,
        nama_semester: input.nama_semester,
      },
    });

    if (existingSemester) {
      throw new Error('Semester name already exists in this tahun pelajaran');
    }

    // Validate semester name format (should be like "Ganjil", "Genap", "1", "2")
    const validSemesterNames = ['Ganjil', 'Genap', '1', '2'];
    if (!validSemesterNames.includes(input.nama_semester)) {
      throw new Error('Nama semester must be one of: Ganjil, Genap, 1, or 2');
    }

    const semester = await prisma.semester.create({
      data: {
        tenant_id: tenantId,
        nama_semester: input.nama_semester,
        tahun_pelajaran_id: input.tahun_pelajaran_id,
        is_active: input.is_active ?? false,
      },
      include: {
        TahunPelajaran: {
          select: {
            id: true,
            tahun: true,
            is_active: true,
          },
        },
        _count: {
          select: {
            SesiAbsensi: true,
            Siswa: true,
          },
        },
      },
    });

    return semester as SemesterResponse;
  }

  async updateSemester(semesterId: string, input: UpdateSemesterInput, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<SemesterResponse> {
    // ⛔ is_active DILARANG diubah via updateSemester.
    // Gunakan setActiveSemester (PUT /:id/activate) untuk mengaktifkan.
    // Gunakan deactivateSemester (PUT /:id/deactivate) untuk menonaktifkan.
    if (typeof input.is_active === 'boolean') {
      throw new Error(
        'Tidak dapat mengubah status aktif semester melalui endpoint ini. ' +
        'Gunakan endpoint /activate atau /deactivate untuk menjaga konsistensi data.'
      );
    }

    // Check if semester exists and user has permission
    let whereClause: any = { id: semesterId };
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const existingSemester = await prisma.semester.findFirst({
      where: whereClause,
    });

    if (!existingSemester) {
      throw new Error('Semester not found or insufficient permissions');
    }

    // Check if tahun pelajaran exists and belongs to the same tenant (if provided)
    if (input.tahun_pelajaran_id) {
      const tahunPelajaran = await prisma.tahunPelajaran.findFirst({
        where: {
          id: input.tahun_pelajaran_id,
          tenant_id: existingSemester.tenant_id,
        },
      });

      if (!tahunPelajaran) {
        throw new Error('Tahun pelajaran not found in this tenant');
      }
    }

    // Check if semester name is unique within the same tahun pelajaran (if provided and different from current)
    if (input.nama_semester && 
        (input.nama_semester !== existingSemester.nama_semester || 
         (input.tahun_pelajaran_id && input.tahun_pelajaran_id !== existingSemester.tahun_pelajaran_id))) {
      
      const tahunPelajaranId = input.tahun_pelajaran_id || existingSemester.tahun_pelajaran_id;
      
      const existingName = await prisma.semester.findFirst({
        where: {
          tenant_id: existingSemester.tenant_id,
          tahun_pelajaran_id: tahunPelajaranId,
          nama_semester: input.nama_semester,
          id: { not: semesterId },
        },
      });

      if (existingName) {
        throw new Error('Semester name already exists in this tahun pelajaran');
      }

      // Validate semester name format if provided
      const validSemesterNames = ['Ganjil', 'Genap', '1', '2'];
      if (!validSemesterNames.includes(input.nama_semester)) {
        throw new Error('Nama semester must be one of: Ganjil, Genap, 1, or 2');
      }
    }

    const semester = await prisma.semester.update({
      where: { id: semesterId },
      data: {
        ...(input.nama_semester && { nama_semester: input.nama_semester }),
        ...(input.tahun_pelajaran_id && { tahun_pelajaran_id: input.tahun_pelajaran_id }),
        // is_active TIDAK diproses di sini
      },
      include: {
        TahunPelajaran: {
          select: {
            id: true,
            tahun: true,
            is_active: true,
          },
        },
        _count: {
          select: {
            SesiAbsensi: true,
            Siswa: true,
          },
        },
      },
    });

    return semester as SemesterResponse;
  }

  async deleteSemester(semesterId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<void> {
    // Check if semester exists and user has permission
    let whereClause: any = { id: semesterId };
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const existingSemester = await prisma.semester.findFirst({
      where: whereClause,
    });

    if (!existingSemester) {
      throw new Error('Semester not found or insufficient permissions');
    }

    const links = await prisma.semester.findFirst({
      where: { id: semesterId },
      include: {
        TahunPelajaran: { select: { tahun: true } },
        _count: { 
          select: { 
            SesiAbsensi: true, 
            Siswa: true,
            SiswaAkademik: true,
            AbsenGuru: true,
            JadwalKBM: true
          } 
        },
      },
    });

    if (links) {
      const counts = links._count;
      const detailParts: string[] = [];
      if (counts.SesiAbsensi > 0) detailParts.push(`${counts.SesiAbsensi} Sesi Absensi`);
      if (counts.Siswa > 0) detailParts.push(`${counts.Siswa} Siswa`);
      if (counts.SiswaAkademik > 0) detailParts.push(`${counts.SiswaAkademik} Riwayat Akademik`);
      if (counts.AbsenGuru > 0) detailParts.push(`${counts.AbsenGuru} Absensi Guru`);
      if (counts.JadwalKBM > 0) detailParts.push(`${counts.JadwalKBM} Jadwal Pelajaran`);

      if (detailParts.length > 0) {
        const tp = String(links.TahunPelajaran?.tahun || '');
        const detail = detailParts.join(', ');
        const msg = tp
          ? `Tidak dapat menghapus semester karena masih digunakan di: ${detail}. Tahun Pelajaran: ${tp}.`
          : `Tidak dapat menghapus semester karena masih digunakan di: ${detail}.`;
        throw new Error(msg);
      }
    }

    await prisma.semester.delete({
      where: { id: semesterId },
    });
  }

  // Additional method to get semester by tahun pelajaran
  async getSemesterByTahunPelajaran(tahunPelajaranId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<SemesterResponse[]> {
    let whereClause: any = { tahun_pelajaran_id: tahunPelajaranId };

    // Only SUPERADMIN from system tenant can bypass tenant filter
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const semester = await prisma.semester.findMany({
      where: whereClause,
      include: {
        TahunPelajaran: {
          select: {
            id: true,
            tahun: true,
            is_active: true,
          },
        },
        _count: {
          select: {
            SesiAbsensi: true,
            Siswa: true,
          },
        },
      },
      orderBy: {
        nama_semester: 'asc',
      },
    });

    return semester as SemesterResponse[];
  }

  // Additional method to get active semester
  async getActiveSemester(requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<SemesterResponse[]> {
    let whereClause: any = { is_active: true };

    // Only SUPERADMIN from system tenant can bypass tenant filter
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const semester = await prisma.semester.findMany({
      where: whereClause,
      include: {
        TahunPelajaran: {
          select: {
            id: true,
            tahun: true,
            is_active: true,
          },
        },
        _count: {
          select: {
            SesiAbsensi: true,
            Siswa: true,
          },
        },
      },
      orderBy: [
        { TahunPelajaran: { tahun: 'desc' } },
        { nama_semester: 'asc' },
      ],
    });

    return semester as SemesterResponse[];
  }

  // Method to set active semester
  async setActiveSemester(semesterId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<SemesterResponse> {
    // Check if semester exists and user has permission
    let whereClause: any = { id: semesterId };
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const existingSemester = await prisma.semester.findFirst({
      where: whereClause,
      include: {
        TahunPelajaran: true
      }
    });

    if (!existingSemester) {
      throw new Error('Semester not found or insufficient permissions');
    }

    // Execute everything in a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deactivate all other semesters in the same tenant
      await tx.semester.updateMany({
        where: {
          tenant_id: existingSemester.tenant_id,
          id: { not: semesterId },
        },
        data: {
          is_active: false,
        },
      });

      // 2. Activate the selected semester
      const updatedSemester = await tx.semester.update({
        where: { id: semesterId },
        data: { is_active: true },
        include: {
          TahunPelajaran: {
            select: {
              id: true,
              tahun: true,
              is_active: true,
            },
          },
          _count: {
            select: {
              SesiAbsensi: true,
              Siswa: true,
            },
          },
        },
      });

      // 3. AUTO-SYNC YEAR: Deactivate all other Academic Years in the same tenant
      await tx.tahunPelajaran.updateMany({
        where: {
          tenant_id: existingSemester.tenant_id,
          id: { not: existingSemester.tahun_pelajaran_id },
        },
        data: {
          is_active: false,
        },
      });

      // 4. AUTO-SYNC YEAR: Activate the parent Academic Year
      await tx.tahunPelajaran.update({
        where: { id: existingSemester.tahun_pelajaran_id },
        data: { is_active: true },
      });

      // 5. AUTO-ACTIVATE STUDENTS: Set NAIK/TINGGAL to AKTIF
      await tx.siswaAkademik.updateMany({
        where: {
          semester_id: semesterId,
          status: {
            in: ['NAIK', 'TINGGAL']
          }
        },
        data: {
          status: 'AKTIF'
        }
      });

      return updatedSemester;
    });

    await cacheInvalidationService.invalidateAcademicCache(existingSemester.tenant_id);
    return result as SemesterResponse;
  }

  /**
   * Nonaktifkan semester tanpa mengaktifkan semester lain.
   * Digunakan ketika toggle dimatikan dari UI.
   */
  async deactivateSemester(semesterId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<SemesterResponse> {
    let whereClause: any = { id: semesterId };
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const existingSemester = await prisma.semester.findFirst({ where: whereClause });
    if (!existingSemester) {
      throw new Error('Semester not found or insufficient permissions');
    }

    const updated = await prisma.semester.update({
      where: { id: semesterId },
      data: { is_active: false },
      include: {
        TahunPelajaran: { select: { id: true, tahun: true, is_active: true } },
        _count: { select: { SesiAbsensi: true, Siswa: true } },
      },
    });

    await cacheInvalidationService.invalidateAcademicCache(existingSemester.tenant_id);
    return updated as SemesterResponse;
  }
}

export const semesterService = new SemesterService();
