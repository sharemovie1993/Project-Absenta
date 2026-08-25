import { prisma } from '@/utils/prisma';
import { findBestMatch } from '@/utils/normalization';
import { RoleName } from '../../../../constants/enums';
import { isSystemSuperAdmin } from '../../../../utils/rbac';
import { DataScope } from '../../../../types/fastify';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';



export interface CreateMapelInput {
  nama_mapel: string;
  kode_mapel?: string | null;
  tingkat?: number | null;
  deskripsi?: string | null;
}

export interface UpdateMapelInput {
  nama_mapel?: string;
  kode_mapel?: string | null;
  tingkat?: number | null;
  deskripsi?: string | null;
}

export interface MapelResponse {
  id: string;
  tenant_id: string;
  nama_mapel: string;
  kode_mapel: string | null;
  tingkat: number | null;
  created_at: Date;
  updated_at: Date;
  _count?: {
    GuruMapel: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  kelas_id?: string;
  tingkat?: number;
}

export interface PaginatedMapelResponse {
  data: MapelResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const mapelService = {
  async getAllMapel(requestingUserRole: RoleName, requestingUserTenantId?: string, params?: PaginationParams): Promise<PaginatedMapelResponse> {
    try {
      let whereClause: any = {};

      // Apply tenant filtering unless SUPERADMIN from system tenant
      if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
        whereClause.tenant_id = requestingUserTenantId;
      }

      // Filter by kelas_id mapped in JadwalKBM (with fallback to class tingkat)
      if (params?.kelas_id && requestingUserTenantId) {
        const scheduledMapel = await prisma.jadwalKBM.findMany({
          where: {
            tenant_id: requestingUserTenantId,
            kelas_id: params.kelas_id,
          },
          select: { mapel_id: true },
        });

        const mapelIds = Array.from(new Set(scheduledMapel.map((j) => j.mapel_id).filter(Boolean)));

        if (mapelIds.length > 0) {
          whereClause.id = { in: mapelIds };
        } else {
          // Fallback to class tingkat if no schedule exists yet
          const kelas = await prisma.kelas.findFirst({
            where: { id: params.kelas_id, tenant_id: requestingUserTenantId },
          });
          if (kelas && kelas.tingkat) {
            const numTingkat = Number(kelas.tingkat);
            if (!isNaN(numTingkat)) {
              whereClause.OR = [{ tingkat: numTingkat }, { tingkat: null }];
            }
          }
        }
      } else if (params?.tingkat !== undefined) {
        whereClause.OR = [{ tingkat: params.tingkat }, { tingkat: null }];
      }

      // Add search functionality
      if (params?.search) {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { nama_mapel: { contains: params.search, mode: 'insensitive' } },
              { kode_mapel: { contains: params.search, mode: 'insensitive' } },
            ],
          },
        ];
      }

      // Calculate pagination
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const skip = (page - 1) * limit;

      // Get total count
      const total = await prisma.mapel.count({ where: whereClause });

      // Get paginated data
      const mapel = await prisma.mapel.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              GuruMapel: true,
            },
          },
        },
        orderBy: [
          { tingkat: 'asc' },
          { nama_mapel: 'asc' },
        ],
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: mapel as MapelResponse[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      console.error('Error in getAllMapel:', error);
      throw error;
    }
  },

  async getMapelById(mapelId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<MapelResponse | null> {
    let whereClause: any = { id: mapelId };

    // Only SUPERADMIN from system tenant can bypass tenant filter
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const mapel = await prisma.mapel.findFirst({
      where: whereClause,
      include: {
        _count: {
          select: {
            GuruMapel: true,
          },
        },
      },
    });

    return mapel as MapelResponse | null;
  },

  async createMapel(input: CreateMapelInput, tenantId: string): Promise<MapelResponse> {
    // Check if mapel name is unique within tenant and tingkat
    // We treat 'undefined' tingkat as 'null' for uniqueness check if it's not provided,
    // but typically inputs should be explicit. 
    // If input.tingkat is undefined, createData.tingkat becomes null (by omission).
    const existingMapel = await prisma.mapel.findFirst({
      where: {
        tenant_id: tenantId,
        nama_mapel: input.nama_mapel,
        tingkat: input.tingkat ?? null, // Check specific tingkat or null
      },
    });

    if (existingMapel) {
      throw new Error('Mapel name already exists in this tenant for this tingkat');
    }

    // Check if kode_mapel is unique within tenant (if provided)
    if (input.kode_mapel) {
      const existingKode = await prisma.mapel.findFirst({
        where: {
          tenant_id: tenantId,
          kode_mapel: input.kode_mapel,
        },
      });

      if (existingKode) {
        throw new Error('Kode mapel already exists in this tenant');
      }
    }

    // Validate tingkat range (if provided)
    if (input.tingkat !== undefined && input.tingkat !== null && (input.tingkat < 1 || input.tingkat > 12)) {
      throw new Error('Tingkat must be between 1 and 12');
    }

    // Prepare create data with only defined fields
    const createData: any = {
      tenant_id: tenantId,
      nama_mapel: input.nama_mapel,
    };
    if (input.kode_mapel !== undefined) createData.kode_mapel = input.kode_mapel;
    if (input.tingkat !== undefined) createData.tingkat = input.tingkat;

    const mapel = await prisma.mapel.create({
      data: createData,
      include: {
        _count: {
          select: {
            GuruMapel: true,
          },
        },
      },
    });

    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    return mapel as MapelResponse;
  },

  async updateMapel(mapelId: string, input: UpdateMapelInput, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<MapelResponse> {
    // Check if mapel exists and user has permission
    let whereClause: any = { id: mapelId };
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const existingMapel = await prisma.mapel.findFirst({
      where: whereClause,
    });

    if (!existingMapel) {
      throw new Error('Mapel not found or insufficient permissions');
    }

    // Check if mapel name/tingkat combination is unique within tenant
    // We need to check conflict if name OR tingkat is being updated
    if (input.nama_mapel !== undefined || input.tingkat !== undefined) {
      const targetName = input.nama_mapel ?? existingMapel.nama_mapel;
      // Use nullish coalescing to handle 0 as valid tingkat if applicable, though typically 1-12
      // existingMapel.tingkat can be null
      const targetTingkat = input.tingkat !== undefined ? input.tingkat : existingMapel.tingkat;

      // Only check if the resulting combination is different from current (though id: { not: mapelId } handles self-match)
      // But we specifically want to block if the *new* combination exists on *another* record.
      const existingConflict = await prisma.mapel.findFirst({
        where: {
          tenant_id: existingMapel.tenant_id,
          nama_mapel: targetName,
          tingkat: targetTingkat,
          id: { not: mapelId },
        },
      });

      if (existingConflict) {
        throw new Error('Mapel name already exists in this tenant for this tingkat');
      }
    }

    // Check if kode_mapel is unique within tenant (if provided and different from current)
    if (input.kode_mapel && input.kode_mapel !== existingMapel.kode_mapel) {
      const existingKode = await prisma.mapel.findFirst({
        where: {
          tenant_id: existingMapel.tenant_id,
          kode_mapel: input.kode_mapel,
          id: { not: mapelId },
        },
      });

      if (existingKode) {
        throw new Error('Kode mapel already exists in this tenant');
      }
    }

    // Validate tingkat range (if provided)
    if (input.tingkat !== undefined && input.tingkat !== null && (input.tingkat < 1 || input.tingkat > 12)) {
      throw new Error('Tingkat must be between 1 and 12');
    }

    // Prepare update data with only defined fields
    const updateData: any = {};
    if (input.nama_mapel !== undefined) updateData.nama_mapel = input.nama_mapel;
    if (input.kode_mapel !== undefined) updateData.kode_mapel = input.kode_mapel;
    if (input.tingkat !== undefined) updateData.tingkat = input.tingkat;

    const mapel = await prisma.mapel.update({
      where: { id: mapelId },
      data: updateData,
      include: {
        _count: {
          select: {
            GuruMapel: true,
          },
        },
      },
    });

    await cacheInvalidationService.invalidateAcademicCache(existingMapel.tenant_id);
    return mapel as MapelResponse;
  },

  async deleteMapel(mapelId: string, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<void> {
    // Check if mapel exists and user has permission
    let whereClause: any = { id: mapelId };
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const existingMapel = await prisma.mapel.findFirst({
      where: whereClause,
    });

    if (!existingMapel) {
      throw new Error('Mapel not found or insufficient permissions');
    }

    // Check if mapel has related records that prevent deletion
    const relatedRecords = await prisma.mapel.findFirst({
      where: { id: mapelId },
      include: {
        _count: {
          select: {
            GuruMapel: true,
            StrukturKurikulum: true,
            KelasMapel: true,
          },
        },
      },
    });

    if (relatedRecords?._count.GuruMapel && relatedRecords._count.GuruMapel > 0) {
      throw new Error('Tidak dapat menghapus mata pelajaran yang masih memiliki pengampu (Guru Mapel)');
    }

    if (relatedRecords?._count.StrukturKurikulum && relatedRecords._count.StrukturKurikulum > 0) {
      throw new Error('Tidak dapat menghapus mata pelajaran yang sudah terdaftar di Struktur Kurikulum');
    }

    if (relatedRecords?._count.KelasMapel && relatedRecords._count.KelasMapel > 0) {
      throw new Error('Tidak dapat menghapus mata pelajaran yang masih terhubung dengan Data Kelas');
    }

    await prisma.mapel.delete({
      where: { id: mapelId },
    });

    await cacheInvalidationService.invalidateAcademicCache(existingMapel.tenant_id);
  },

  async importFromExcel(data: any[], scope: DataScope) {
    if (!scope.tenantId) {
      throw new Error('Tenant ID is required for import');
    }
    const tenantId = scope.tenantId;
    let created = 0;
    let updated = 0;
    const errors: any[] = [];

    // Pre-fetch all mapels for fuzzy matching
    const allMapels = await prisma.mapel.findMany({ where: { tenant_id: tenantId } });
    const mapelNames = allMapels.map(m => m.nama_mapel);

    for (const [index, row] of data.entries()) {
      const rowNumber = row.__rowNum || (index + 2);
      try {
        const nama = row.nama_mapel ? String(row.nama_mapel).trim() : '';
        const kode = row.kode_mapel ? String(row.kode_mapel).trim() : undefined;
        const tingkat = row.tingkat ? parseInt(row.tingkat) : undefined;

        if (!nama) {
          throw new Error('Missing required field: nama_mapel');
        }

        let existingMapel = null;

        // Priority 1: Check by Kode Mapel (if provided) - This is the best unique identifier
        if (kode) {
          existingMapel = await prisma.mapel.findUnique({
            where: {
              tenant_id_kode_mapel: {
                tenant_id: tenantId,
                kode_mapel: kode
              }
            }
          });
        }

        // Priority 2: If no code provided or not found by code, fallback to Name + Tingkat check (with fuzzy)
        if (!existingMapel) {
          const match = findBestMatch(nama, mapelNames);
          if (match.match) {
             // Find all matching by name (fuzzy) then filter by tingkat
             const possibleMatches = allMapels.filter(m => m.nama_mapel === match.match);
             existingMapel = possibleMatches.find(m => m.tingkat === tingkat) || null;
          }
        }

        if (existingMapel) {
          // Update
          await this.updateMapel(existingMapel.id, { nama_mapel: nama, kode_mapel: kode, tingkat }, RoleName.ADMIN, tenantId);
          updated++;
        } else {
          // Create
          await this.createMapel({ nama_mapel: nama, kode_mapel: kode, tingkat }, tenantId);
          created++;
        }
      } catch (err: any) {
        errors.push({ row: rowNumber, message: err.message });
      }
    }

    return { created, updated, errors };
  },

  // Additional method to get mapel by tingkat
  async getMapelByTingkat(tingkat: number, requestingUserRole: RoleName, requestingUserTenantId?: string): Promise<MapelResponse[]> {
    let whereClause: any = { tingkat };

    // Only SUPERADMIN from system tenant can bypass tenant filter
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const mapel = await prisma.mapel.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            GuruMapel: true,
          },
        },
      },
      orderBy: {
        nama_mapel: 'asc',
      },
    });

    return mapel as MapelResponse[];
  }

};
