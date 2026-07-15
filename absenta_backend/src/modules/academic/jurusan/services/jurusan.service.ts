import { prisma } from '@/utils/prisma';
import { findBestMatch } from '@/utils/normalization';
import { RoleName } from '../../../../constants/enums';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { DataScope } from '../../../../types/fastify';

export interface CreateJurusanInput {
  nama: string;
  kode?: string | null;
  singkatan?: string | null;
  program_keahlian_id?: string | null;
}

export interface UpdateJurusanInput {
  nama?: string;
  kode?: string | null;
  singkatan?: string | null;
  program_keahlian_id?: string | null;
}

export interface JurusanResponse {
  id: string;
  tenant_id: string;
  nama: string;
  kode?: string | null;
  singkatan?: string | null;
  program_keahlian_id?: string | null;
  created_at: Date;
  updated_at: Date;
  _count?: {
    Kelas: number;
  };
  ProgramKeahlian?: {
    id: string;
    nama: string;
    kode?: string | null;
    singkatan?: string | null;
    bidang_keahlian?: string | null;
  } | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface PaginatedJurusanResponse {
  data: JurusanResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class JurusanService {
  async getAllJurusan(requestingUserRole: RoleName, requestingUserTenantId?: string, params?: PaginationParams): Promise<PaginatedJurusanResponse> {
    let whereClause: any = {};

    // Only system SUPERADMIN can see all jurusan, others are tenant-scoped
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    // Add search functionality
    if (params?.search) {
      whereClause.OR = [
        { nama: { contains: params.search, mode: 'insensitive' } },
        { kode: { contains: params.search, mode: 'insensitive' } },
        { singkatan: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    // Calculate pagination
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.jurusan.count({ where: whereClause });

    // Get paginated data
    const jurusan = await prisma.jurusan.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            Kelas: true,
          },
        },
        ProgramKeahlian: {
          select: { id: true, nama: true, kode: true, singkatan: true, bidang_keahlian: true }
        },
      },
      orderBy: [
        { nama: 'asc' },
      ],
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: jurusan as JurusanResponse[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getJurusanById(jurusanId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<JurusanResponse | null> {
    let whereClause: any = { id: jurusanId };

    // Only system SUPERADMIN can view any jurusan; others are tenant-scoped
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const jurusan = await prisma.jurusan.findFirst({
      where: whereClause,
      include: {
        _count: {
          select: {
            Kelas: true,
          },
        },
        ProgramKeahlian: {
          select: { id: true, nama: true, kode: true, singkatan: true, bidang_keahlian: true }
        },
      },
    });

    return jurusan as JurusanResponse | null;
  }

  async createJurusan(input: CreateJurusanInput, tenantId: string): Promise<JurusanResponse> {
    // Check if jurusan name is unique within tenant
    const existingJurusan = await prisma.jurusan.findFirst({
      where: {
        tenant_id: tenantId,
        nama: input.nama,
      },
    });

    if (existingJurusan) {
      throw new Error('Jurusan name already exists in this tenant');
    }

    // Check if kode is unique within tenant (if provided)
    if (input.kode) {
      const existingKode = await prisma.jurusan.findFirst({
        where: {
          tenant_id: tenantId,
          kode: input.kode,
        },
      });

      if (existingKode) {
        throw new Error('Jurusan code already exists in this tenant');
      }
    }

    const jurusan = await prisma.jurusan.create({
      data: {
        tenant_id: tenantId,
        nama: input.nama,
        kode: input.kode,
        singkatan: input.singkatan,
        ...(input.program_keahlian_id !== undefined && { program_keahlian_id: input.program_keahlian_id }),
      },
      include: {
        _count: {
          select: {
            Kelas: true,
          },
        },
        ProgramKeahlian: {
          select: { id: true, nama: true, kode: true, singkatan: true, bidang_keahlian: true }
        },
      },
    });

    // Automatically create a default Sarpras Location for the new Department
    // Using abbreviation (singkatan/kode) as per user request
    const abbr = input.singkatan || input.kode || input.nama.substring(0, 5).toUpperCase();
    try {
      await prisma.sarprasLocation.create({
        data: {
          tenant_id: tenantId,
          nama: `Lab Utama ${abbr}`,
          unit_id: jurusan.id,
          deskripsi: `Lokasi inventaris utama untuk jurusan ${input.nama}`
        }
      });
    } catch (err) {
      console.warn('Failed to create automatic Sarpras Location for Jurusan:', err);
    }

    return jurusan as JurusanResponse;
  }

  async updateJurusan(jurusanId: string, input: UpdateJurusanInput, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<JurusanResponse> {
    let whereClause: any = { id: jurusanId };

    // Only system SUPERADMIN can update any jurusan; others are tenant-scoped
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    // Check if jurusan exists
    const existingJurusan = await prisma.jurusan.findFirst({
      where: whereClause,
    });

    if (!existingJurusan) {
      throw new Error('Jurusan not found or not in the same tenant');
    }

    // Check if new name is unique within tenant (if provided)
    if (input.nama && input.nama !== existingJurusan.nama) {
      const duplicateName = await prisma.jurusan.findFirst({
        where: {
          tenant_id: existingJurusan.tenant_id,
          nama: input.nama,
          id: { not: jurusanId },
        },
      });

      if (duplicateName) {
        throw new Error('Jurusan name already exists in this tenant');
      }
    }

    // Check if new kode is unique within tenant (if provided)
    if (input.kode && input.kode !== existingJurusan.kode) {
      const duplicateKode = await prisma.jurusan.findFirst({
        where: {
          tenant_id: existingJurusan.tenant_id,
          kode: input.kode,
          id: { not: jurusanId },
        },
      });

      if (duplicateKode) {
        throw new Error('Jurusan code already exists in this tenant');
      }
    }

    const updatedJurusan = await prisma.jurusan.update({
      where: { id: jurusanId },
      data: {
        ...(input.nama && { nama: input.nama }),
        ...(input.kode !== undefined && { kode: input.kode }),
        ...(input.singkatan !== undefined && { singkatan: input.singkatan }),
        ...(input.program_keahlian_id !== undefined && { program_keahlian_id: input.program_keahlian_id }),
      },
      include: {
        _count: {
          select: {
            Kelas: true,
          },
        },
        ProgramKeahlian: {
          select: { id: true, nama: true, kode: true, singkatan: true, bidang_keahlian: true }
        },
      },
    });

    // Automatically update the default Sarpras Location name/abbr if name/singkatan/kode changes
    if (input.nama !== undefined || input.singkatan !== undefined || input.kode !== undefined) {
      const abbr = updatedJurusan.singkatan || updatedJurusan.kode || updatedJurusan.nama.substring(0, 5).toUpperCase();
      try {
        await prisma.sarprasLocation.updateMany({
          where: { unit_id: jurusanId, tenant_id: existingJurusan.tenant_id },
          data: {
            nama: `Lab Utama ${abbr}`,
            deskripsi: `Lokasi inventaris utama untuk jurusan ${updatedJurusan.nama}`
          }
        });
      } catch (err) {
        console.warn('Failed to update automatic Sarpras Location for Jurusan:', err);
      }
    }

    return updatedJurusan as JurusanResponse;
  }

  async removeJurusan(jurusanId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<void> {
    let whereClause: any = { id: jurusanId };

    // Only system SUPERADMIN can delete any jurusan; others are tenant-scoped
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    // Check if jurusan exists
    const existingJurusan = await prisma.jurusan.findFirst({
      where: whereClause,
      include: {
        _count: {
          select: {
            Kelas: true,
            StrukturKurikulum: true,
            organizationalAssigns: true,
          },
        },
      },
    });

    if (!existingJurusan) {
      throw new Error('Jurusan not found or not in the same tenant');
    }

    // Check if jurusan has associated entities
    if (existingJurusan._count.Kelas > 0) {
      throw new Error('Tidak dapat menghapus jurusan yang masih memiliki data kelas');
    }
    
    if (existingJurusan._count.StrukturKurikulum > 0) {
      throw new Error('Tidak dapat menghapus jurusan yang sudah terdaftar di Struktur Kurikulum');
    }

    if (existingJurusan._count.organizationalAssigns > 0) {
      throw new Error('Tidak dapat menghapus jurusan yang masih terhubung dengan Penugasan Organisasi');
    }

    // Soft-delete the corresponding location
    try {
      await prisma.sarprasLocation.updateMany({
        where: { unit_id: jurusanId, tenant_id: existingJurusan.tenant_id },
        data: { deleted_at: new Date() }
      });
    } catch (err) {
      console.warn('Failed to delete automatic Sarpras Location for Jurusan:', err);
    }

    await prisma.jurusan.delete({
      where: { id: jurusanId },
    });
  }

  async importFromExcel(data: any[], scope: DataScope) {
    if (!scope.tenantId) {
      throw new Error('Tenant ID is required for import');
    }
    const tenantId = scope.tenantId;
    let created = 0;
    let updated = 0;
    const errors: any[] = [];

    // Pre-fetch all jurusans for fuzzy matching
    const jurusans = await prisma.jurusan.findMany({ where: { tenant_id: tenantId } });
    const jurusanNames = jurusans.map(j => j.nama);

    for (const [index, row] of data.entries()) {
      const rowNumber = row.__rowNum || (index + 2);
      try {
        const nama = row.nama ? String(row.nama).trim() : '';
        const kode = row.kode ? String(row.kode).trim() : undefined;
        const singkatan = row.singkatan ? String(row.singkatan).trim() : undefined;
        const programKeahlianInput = row.program_keahlian ? String(row.program_keahlian).trim() : '';

        if (!nama) {
          throw new Error('Missing required field: nama');
        }

        // Handle Program Keahlian lookup/auto-creation
        let programKeahlianId: string | null = null;
        if (programKeahlianInput) {
          let pk = await prisma.programKeahlian.findFirst({
            where: {
              tenant_id: tenantId,
              OR: [
                { kode: { equals: programKeahlianInput, mode: 'insensitive' } },
                { nama: { equals: programKeahlianInput, mode: 'insensitive' } }
              ]
            }
          });

          if (!pk) {
            // Auto-generate code based on first letters of words
            const generatedKode = programKeahlianInput.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 5);
            const codeConflict = await prisma.programKeahlian.findFirst({
              where: { tenant_id: tenantId, kode: generatedKode }
            });

            pk = await prisma.programKeahlian.create({
              data: {
                tenant_id: tenantId,
                nama: programKeahlianInput,
                kode: codeConflict ? null : generatedKode
              }
            });
          }
          programKeahlianId = pk.id;
        }

        // Check if exists
        let existingJurusan = null;

        // Priority 1: Check by Kode (if provided) - This is the best unique identifier
        if (kode) {
          existingJurusan = await prisma.jurusan.findFirst({
            where: {
              tenant_id: tenantId,
              kode: kode
            }
          });
        }

        // Priority 2: If no code provided or not found by code, fallback to Name check (with fuzzy)
        if (!existingJurusan) {
          const match = findBestMatch(nama, jurusanNames);
          if (match.match) {
            existingJurusan = jurusans.find(j => j.nama === match.match) || null;
          }
        }

        if (existingJurusan) {
          // Update
          await this.updateJurusan(existingJurusan.id, { nama, kode, singkatan, program_keahlian_id: programKeahlianId }, RoleName.ADMIN, tenantId);
          updated++;
        } else {
          // Create
          await this.createJurusan({ nama, kode, singkatan, program_keahlian_id: programKeahlianId }, tenantId);
          created++;
        }
      } catch (err: any) {
        errors.push({ row: rowNumber, message: err.message });
      }
    }

    return { created, updated, errors };
  }

  async bulkWizardCreate(
    payload: {
      programs: Array<{ nama: string; kode: string; singkatan: string; bidang_keahlian?: string }>;
      jurusans: Array<{ nama: string; kode: string; singkatan: string; program_keahlian_kode: string }>;
    },
    tenantId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const programMap: Record<string, string> = {};

      // Load existing ProgramKeahlian to prevent duplicate key error
      const existingPrograms = await tx.programKeahlian.findMany({
        where: { tenant_id: tenantId }
      });
      existingPrograms.forEach(p => {
        if (p.kode) programMap[p.kode.toUpperCase()] = p.id;
      });

      // Insert missing ProgramKeahlian
      for (const prog of payload.programs) {
        const key = prog.kode.toUpperCase();
        if (!programMap[key]) {
          const newProg = await tx.programKeahlian.create({
            data: {
              tenant_id: tenantId,
              nama: prog.nama,
              kode: prog.kode,
              singkatan: prog.singkatan,
              bidang_keahlian: prog.bidang_keahlian || null
            }
          });
          programMap[key] = newProg.id;
        }
      }

      // Load existing Jurusan to prevent duplicate key error
      const existingJurusans = await tx.jurusan.findMany({
        where: { tenant_id: tenantId }
      });
      const existingJurusanKodes = new Set(existingJurusans.map(j => j.kode?.toUpperCase()).filter(Boolean));

      // Insert missing Jurusan & Auto Sarpras Location
      for (const jur of payload.jurusans) {
        const key = jur.kode.toUpperCase();
        if (!existingJurusanKodes.has(key)) {
          const programId = programMap[jur.program_keahlian_kode.toUpperCase()] || null;

          const newJur = await tx.jurusan.create({
            data: {
              tenant_id: tenantId,
              nama: jur.nama,
              kode: jur.kode,
              singkatan: jur.singkatan,
              program_keahlian_id: programId
            }
          });

          // Provision default Sarpras Lab location
          const abbr = jur.singkatan || jur.kode || jur.nama.substring(0, 5).toUpperCase();
          try {
            await tx.sarprasLocation.create({
              data: {
                tenant_id: tenantId,
                nama: `Lab Utama ${abbr}`,
                unit_id: newJur.id,
                deskripsi: `Lokasi inventaris utama untuk jurusan ${jur.nama}`
              }
            });
          } catch (err) {
            console.warn('Failed to create automatic Sarpras Location in bulk:', err);
          }
        }
      }

      return { success: true, message: 'Bulk wizard creation completed' };
    });
  }
}
