import { prisma } from '@/utils/prisma';
import { findBestMatch } from '@/utils/normalization';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export interface CreateKelasInput {
  nama_kelas: string;
  tingkat: number;
  jurusan_id?: string | null;
  guru_id?: string | null; // For wali kelas assignment
  jam_masuk?: string | null;
  jam_pulang?: string | null;
  is_active?: boolean;
}

export interface UpdateKelasInput {
  nama_kelas?: string;
  tingkat?: number;
  jurusan_id?: string | null;
  guru_id?: string | null; // For wali kelas assignment
  jam_masuk?: string | null;
  jam_pulang?: string | null;
  is_active?: boolean;
}

export interface KelasResponse {
  id: string;
  tenant_id: string;
  nama_kelas: string;
  tingkat: number;
  jurusan_id: string;
  is_active: boolean;
  jam_masuk?: string | null;
  jam_pulang?: string | null;
  created_at: Date;
  updated_at: Date;
  Jurusan?: {
    id: string;
    nama: string;
  } | null;
  WaliKelas?: {
    id: string;
    Guru: {
      id: string;
      nama_guru: string;
    };
  }[];
  _count?: {
    Siswa: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  is_active?: boolean;
  tingkat?: number;
  jurusan_id?: string;
}

export interface PaginatedKelasResponse {
  data: KelasResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class KelasService {
  private withDerivedWaliKelas(kelas: any): KelasResponse {
    const assignments: Array<{ id: string; Guru: { id: string; nama_guru: string } }> = [];
    const orgAssigns: any[] = Array.isArray(kelas?.OrganizationalAssignments) ? kelas.OrganizationalAssignments : [];
    for (const a of orgAssigns) {
      const g = a?.User?.Guru;
      if (a?.id && g?.id && g?.nama_guru) {
        assignments.push({ id: a.id, Guru: { id: g.id, nama_guru: g.nama_guru } });
      }
    }

    const { OrganizationalAssignments, ...rest } = kelas;
    return { ...rest, WaliKelas: assignments };
  }

  private buildSarprasLocationName(namaKelas: string, jurusanNama?: string | null): string {
    return jurusanNama
      ? `Ruang Kelas ${namaKelas} (${jurusanNama})`
      : `Ruang Kelas ${namaKelas}`;
  }

  async getAllKelas(tenantId: string, org: any, params?: PaginationParams): Promise<PaginatedKelasResponse> {
    const whereClause: any = { tenant_id: tenantId };

    // Filter tingkat based on sekolah's jenjang
    const sekolah = await prisma.sekolah.findFirst({
      where: { tenant_id: tenantId }
    });

    if (sekolah && sekolah.jenjang) {
      const jg = sekolah.jenjang.toUpperCase();
      let allowedTingkat: number[] = [];
      if (jg === 'SD' || jg === 'MI') {
        allowedTingkat = [1, 2, 3, 4, 5, 6];
      } else if (jg === 'SMP' || jg === 'MTs') {
        allowedTingkat = [7, 8, 9];
      } else if (jg === 'SMA' || jg === 'MA') {
        allowedTingkat = [10, 11, 12];
      } else if (jg === 'SMK' || jg === 'MAK') {
        allowedTingkat = [10, 11, 12, 13];
      }

      if (allowedTingkat.length > 0) {
        if (params?.tingkat !== undefined) {
          const reqTingkat = Number(params.tingkat);
          if (allowedTingkat.includes(reqTingkat)) {
            whereClause.tingkat = reqTingkat;
          } else {
            whereClause.tingkat = -1; // Force empty result if requested levels don't match the jenjang
          }
        } else {
          whereClause.tingkat = { in: allowedTingkat };
        }
      }
    } else {
      if (params?.tingkat !== undefined) {
        whereClause.tingkat = Number(params.tingkat);
      }
    }

    if (params?.is_active !== undefined) {
      whereClause.is_active = params.is_active;
    }
    if (params?.jurusan_id !== undefined) {
      whereClause.jurusan_id = params.jurusan_id;
    }

    // Apply Isolate/Scope filter from Organization Engine
    if (org && org.tenant_wide !== true) {
      if (org.is_unit_restricted === true && Array.isArray(org.unit_ids) && org.unit_ids.length > 0) {
        whereClause.jurusan_id = { in: org.unit_ids };
      } else if (Array.isArray(org.kelas_ids) && org.kelas_ids.length > 0) {
        whereClause.id = { in: org.kelas_ids };
      } else {
        // No assigned classes, return empty
        return {
          data: [],
          pagination: { page: params?.page || 1, limit: params?.limit || 10, total: 0, totalPages: 0 },
        };
      }
    }

    // Add search functionality
    if (params?.search) {
      const searchWhere = {
        OR: [
          { nama_kelas: { contains: params.search, mode: 'insensitive' } },
          { Jurusan: { nama: { contains: params.search, mode: 'insensitive' } } },
          {
            OrganizationalAssignments: {
              some: {
                is_active: true,
                Position: { code: 'WALIKELAS' },
                User: { Guru: { nama_guru: { contains: params.search, mode: 'insensitive' } } },
              },
            },
          },
        ],
      };
      
      // Merge with existing whereClause
      if (whereClause.id) {
          whereClause.AND = [
              { id: whereClause.id },
              searchWhere
          ];
          delete whereClause.id;
      } else {
          Object.assign(whereClause, searchWhere);
      }
    }

    // Calculate pagination
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.kelas.count({ where: whereClause });

    // Get paginated data
    const kelas = await prisma.kelas.findMany({
      where: whereClause,
      include: {
        Jurusan: {
          select: {
            id: true,
            nama: true,
            program_keahlian_id: true,
          },
        },
        OrganizationalAssignments: {
          where: {
            is_active: true,
            Position: { code: 'WALIKELAS' },
          },
          include: {
            User: { select: { Guru: { select: { id: true, nama_guru: true } } } },
          },
        },
        _count: {
          select: {
            Siswa: {
              where: { status: 'AKTIF' }
            },
          },
        },
      },
      orderBy: [
        { tingkat: 'asc' },
        { nama_kelas: 'asc' },
      ],
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: kelas.map((k: any) => this.withDerivedWaliKelas(k)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getKelasById(kelasId: string, tenantId: string, org: any): Promise<KelasResponse | null> {
    const whereClause: any = { id: kelasId, tenant_id: tenantId };

    // Validate access scope
    if (org && org.tenant_wide !== true) {
      if (!Array.isArray(org.kelas_ids) || !org.kelas_ids.includes(kelasId)) {
        return null;
      }
    }

    const kelas = await prisma.kelas.findFirst({
      where: whereClause,
      include: {
        Jurusan: {
          select: {
            id: true,
            nama: true,
            program_keahlian_id: true,
          },
        },
        OrganizationalAssignments: {
          where: {
            is_active: true,
            Position: { code: 'WALIKELAS' },
          },
          include: {
            User: { select: { Guru: { select: { id: true, nama_guru: true } } } },
          },
        },
        _count: {
          select: {
            Siswa: {
              where: { status: 'AKTIF' }
            },
          },
        },
      },
    });

    if (!kelas) return null;
    return this.withDerivedWaliKelas(kelas);
  }

  async getKelasReference(tenantId: string, org: any, params?: { includeInactive?: boolean }): Promise<{ id: string; nama_kelas: string; tingkat: number; jurusan: string }[]> {
    let whereClause: any = { tenant_id: tenantId };
    
    if (!params?.includeInactive) {
      whereClause.is_active = true;
    }

    // Filter tingkat based on sekolah's jenjang
    const sekolah = await prisma.sekolah.findFirst({
      where: { tenant_id: tenantId }
    });

    if (sekolah && sekolah.jenjang) {
      const jg = sekolah.jenjang.toUpperCase();
      let allowedTingkat: number[] = [];
      if (jg === 'SD' || jg === 'MI') {
        allowedTingkat = [1, 2, 3, 4, 5, 6];
      } else if (jg === 'SMP' || jg === 'MTs') {
        allowedTingkat = [7, 8, 9];
      } else if (jg === 'SMA' || jg === 'MA') {
        allowedTingkat = [10, 11, 12];
      } else if (jg === 'SMK' || jg === 'MAK') {
        allowedTingkat = [10, 11, 12, 13];
      }

      if (allowedTingkat.length > 0) {
        whereClause.tingkat = { in: allowedTingkat };
      }
    }
    
    // Apply Isolate/Scope filter from Organization Engine
    if (org && org.tenant_wide !== true) {
      if (Array.isArray(org.kelas_ids) && org.kelas_ids.length > 0) {
        whereClause.id = { in: org.kelas_ids };
      } else {
        return [];
      }
    }

    const kelas = await prisma.kelas.findMany({
      where: whereClause,
      include: {
        Jurusan: { select: { nama: true } },
      },
      orderBy: { nama_kelas: 'asc' },
    });

    return kelas.map((k: any) => ({
      id: k.id,
      nama_kelas: k.nama_kelas,
      tingkat: k.tingkat,
      jurusan: k.Jurusan?.nama || '',
    }));
  }

  async createKelas(input: CreateKelasInput, tenantId: string, _org: any): Promise<KelasResponse> {
    if (!tenantId) {
      throw new Error('Tenant ID is required for creating kelas');
    }

    // Normalize empty string to null to prevent Postgres foreign key constraint error
    const normalizedJurusanId = input.jurusan_id && input.jurusan_id.trim() !== '' ? input.jurusan_id : null;

    // Check if kelas name is unique within tenant, tingkat, and jurusan
    const existingKelas = await prisma.kelas.findFirst({
      where: {
        tenant_id: tenantId,
        nama_kelas: input.nama_kelas,
        tingkat: input.tingkat,
        jurusan_id: normalizedJurusanId,
      },
    });

    if (existingKelas) {
      throw new Error('Nama kelas sudah ada untuk tingkat dan jurusan yang sama');
    }

    // Check if jurusan exists and is in the same tenant (if provided)
    if (normalizedJurusanId) {
      const jurusan = await prisma.jurusan.findFirst({
        where: {
          id: normalizedJurusanId,
          tenant_id: tenantId,
        },
      });

      if (!jurusan) {
        throw new Error('Jurusan not found or not in the same tenant');
      }
    }

    // Check if guru exists and is in the same tenant (if provided for wali kelas)
    if (input.guru_id) {
      const guru = await prisma.guru.findFirst({
        where: {
          id: input.guru_id,
          tenant_id: tenantId,
        },
        select: { id: true, user_id: true },
      });

      if (!guru) {
        throw new Error('Guru not found or not in the same tenant');
      }



      const position = await prisma.organizationalPosition.findFirst({
        where: { tenant_id: tenantId, code: 'WALIKELAS' },
        select: { id: true },
      });
      if (position?.id && guru.user_id) {
        const existingWaliKelasAssignment = await prisma.organizationalAssignment.findFirst({
          where: {
            tenant_id: tenantId,
            position_id: position.id,
            user_id: guru.user_id,
            is_active: true,
          },
          select: { id: true },
        });
        if (existingWaliKelasAssignment) {
          throw new Error('Guru is already assigned as wali kelas to another kelas');
        }
      }
    }



    // Use transaction to create kelas and wali kelas
    const result = await prisma.$transaction(async (tx) => {
      // Create kelas first
      const kelas = await tx.kelas.create({
        data: {
          tenant_id: tenantId,
          nama_kelas: input.nama_kelas,
          tingkat: input.tingkat,
          jurusan_id: normalizedJurusanId,
          jam_masuk: input.jam_masuk,
          jam_pulang: input.jam_pulang,
          is_active: input.is_active !== undefined ? input.is_active : true,
        },
      });

      if (input.guru_id) {
        const guru = await tx.guru.findFirst({
          where: { id: input.guru_id, tenant_id: tenantId },
          select: { user_id: true },
        });
        if (guru?.user_id) {
          const position = await tx.organizationalPosition.upsert({
            where: { tenant_id_code: { tenant_id: tenantId, code: 'WALIKELAS' } },
            create: {
              tenant_id: tenantId,
              code: 'WALIKELAS',
              name: 'Wali Kelas',
              scope_type: 'academic',
              unit_type: 'kelas',
              is_active: true,
              updated_at: new Date(),
            },
            update: { updated_at: new Date(), is_active: true },
          });

          await tx.organizationalAssignment.updateMany({
            where: { tenant_id: tenantId, position_id: position.id, kelas_id: kelas.id, is_active: true },
            data: { is_active: false, end_date: new Date(), updated_at: new Date() },
          });

          const existingAssignment = await tx.organizationalAssignment.findFirst({
            where: { tenant_id: tenantId, position_id: position.id, user_id: guru.user_id, kelas_id: kelas.id },
            select: { id: true },
          });

          if (existingAssignment) {
            await tx.organizationalAssignment.update({
              where: { id: existingAssignment.id },
              data: { is_active: true, start_date: new Date(), end_date: null, updated_at: new Date() },
            });
          } else {
            await tx.organizationalAssignment.create({
              data: {
                tenant_id: tenantId,
                position_id: position.id,
                user_id: guru.user_id,
                kelas_id: kelas.id,
                unit_id: null,
                start_date: new Date(),
                end_date: null,
                is_active: true,
                updated_at: new Date(),
              } as any,
            });
          }
        }
      }

      // Automatically create a default Sarpras Location for the new Class
      try {
        const jurusanForLoc = normalizedJurusanId
          ? await tx.jurusan.findUnique({ where: { id: normalizedJurusanId }, select: { nama: true } })
          : null;
        const locName = this.buildSarprasLocationName(kelas.nama_kelas, jurusanForLoc?.nama);

        const existingLoc = await tx.sarprasLocation.findFirst({
          where: { tenant_id: tenantId, nama: locName }
        });
        if (existingLoc) {
          await tx.sarprasLocation.update({
            where: { id: existingLoc.id },
            data: {
              kelas_id: kelas.id,
              unit_id: normalizedJurusanId,
              deleted_at: null
            }
          });
        } else {
          await tx.sarprasLocation.create({
            data: {
              tenant_id: tenantId,
              nama: locName,
              kelas_id: kelas.id,
              unit_id: normalizedJurusanId,
              deskripsi: `Ruang kelas untuk ${kelas.nama_kelas} tingkat ${kelas.tingkat}`
            }
          });
        }
      } catch (err) {
        console.warn('Failed to create automatic Sarpras Location for Kelas:', err);
      }

      return kelas;
    });

    // Fetch the complete kelas with relations
    const kelas = await prisma.kelas.findUnique({
      where: { id: result.id },
      include: {
        Jurusan: {
          select: {
            id: true,
            nama: true,
          },
        },
        OrganizationalAssignments: {
          where: { is_active: true, Position: { code: 'WALIKELAS' } },
          include: { User: { select: { Guru: { select: { id: true, nama_guru: true } } } } },
        },
        _count: {
          select: {
            Siswa: true,
          },
        },
      },
    });

    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    return this.withDerivedWaliKelas(kelas!);
  }

  async updateKelas(kelasId: string, input: UpdateKelasInput, tenantId: string, org: any): Promise<KelasResponse> {
    // Check if kelas exists and user has permission
    const whereClause: any = { id: kelasId, tenant_id: tenantId };

    // Normalize empty string to null to prevent Postgres foreign key constraint error
    const normalizedJurusanId = input.jurusan_id !== undefined
      ? (input.jurusan_id && input.jurusan_id.trim() !== '' ? input.jurusan_id : null)
      : undefined;

    // Apply Isolate/Scope filter from Organization Engine
    if (org && org.tenant_wide !== true) {
      if (!Array.isArray(org.kelas_ids) || !org.kelas_ids.includes(kelasId)) {
        throw new Error('Forbidden: You do not have access to this kelas');
      }
    }

    const existingKelas = await prisma.kelas.findFirst({
      where: whereClause,
    });

    if (!existingKelas) {
      throw new Error('Kelas not found or insufficient permissions');
    }

    // Check if kelas name is unique within tenant, tingkat, and jurusan (if provided or changed)
    if (input.nama_kelas || input.tingkat !== undefined || normalizedJurusanId !== undefined) {
      const targetNama = input.nama_kelas ?? existingKelas.nama_kelas;
      const targetTingkat = input.tingkat ?? existingKelas.tingkat;
      const targetJurusan = normalizedJurusanId !== undefined ? normalizedJurusanId : existingKelas.jurusan_id;

      const existingName = await prisma.kelas.findFirst({
        where: {
          tenant_id: existingKelas.tenant_id,
          nama_kelas: targetNama,
          tingkat: targetTingkat,
          jurusan_id: targetJurusan,
          id: { not: kelasId },
        },
      });

      if (existingName) {
        throw new Error('Nama kelas sudah ada untuk tingkat dan jurusan yang sama');
      }
    }

    // Check if jurusan exists and is in the same tenant (if provided)
    if (normalizedJurusanId) {
      const jurusan = await prisma.jurusan.findFirst({
        where: {
          id: normalizedJurusanId,
          tenant_id: existingKelas.tenant_id,
        },
      });

      if (!jurusan) {
        throw new Error('Jurusan not found or not in the same tenant');
      }
    }

    // Check if guru exists and is in the same tenant (if provided for wali kelas)
    if (input.guru_id) {
      const guru = await prisma.guru.findFirst({
        where: {
          id: input.guru_id,
          tenant_id: existingKelas.tenant_id,
        },
        select: { id: true, user_id: true },
      });

      if (!guru) {
        throw new Error('Guru not found or not in the same tenant');
      }



      const position = await prisma.organizationalPosition.findFirst({
        where: { tenant_id: existingKelas.tenant_id, code: 'WALIKELAS' },
        select: { id: true },
      });
      if (position?.id && guru.user_id) {
        const existingWaliKelasAssignment = await prisma.organizationalAssignment.findFirst({
          where: {
            tenant_id: existingKelas.tenant_id,
            position_id: position.id,
            user_id: guru.user_id,
            is_active: true,
            kelas_id: { not: kelasId },
          },
          select: { id: true },
        });
        if (existingWaliKelasAssignment) {
          throw new Error('Guru is already assigned as wali kelas to another kelas');
        }
      }
    }



    // Use transaction to update kelas and handle wali kelas
    await prisma.$transaction(async (tx) => {
      // Prepare update data with only defined fields
      const updateData: any = {};
      if (input.nama_kelas !== undefined) updateData.nama_kelas = input.nama_kelas;
      if (input.tingkat !== undefined) updateData.tingkat = input.tingkat;
      if (normalizedJurusanId !== undefined) updateData.jurusan_id = normalizedJurusanId;
      if (input.jam_masuk !== undefined) updateData.jam_masuk = input.jam_masuk;
      if (input.jam_pulang !== undefined) updateData.jam_pulang = input.jam_pulang;
      if (input.is_active !== undefined) updateData.is_active = input.is_active;

      // Update kelas
      await tx.kelas.update({
        where: { id: kelasId },
        data: updateData,
      });

      // Handle wali kelas assignment scoped by active tahun pelajaran
      if (input.guru_id !== undefined) {
        const tenantId = existingKelas.tenant_id;
        const position = await tx.organizationalPosition.upsert({
          where: { tenant_id_code: { tenant_id: tenantId, code: 'WALIKELAS' } },
          create: {
            tenant_id: tenantId,
            code: 'WALIKELAS',
            name: 'Wali Kelas',
            scope_type: 'academic',
            unit_type: 'kelas',
            is_active: true,
            updated_at: new Date(),
          },
          update: { updated_at: new Date(), is_active: true },
        });

        await tx.organizationalAssignment.updateMany({
          where: { tenant_id: tenantId, position_id: position.id, kelas_id: kelasId, is_active: true },
          data: { is_active: false, end_date: new Date(), updated_at: new Date() },
        });

        if (input.guru_id) {
          const guru = await tx.guru.findFirst({
            where: { id: input.guru_id, tenant_id: tenantId },
            select: { user_id: true },
          });
          if (guru?.user_id) {
            const existingAssignment = await tx.organizationalAssignment.findFirst({
              where: { tenant_id: tenantId, position_id: position.id, user_id: guru.user_id, kelas_id: kelasId },
              select: { id: true },
            });
            if (existingAssignment) {
              await tx.organizationalAssignment.update({
                where: { id: existingAssignment.id },
                data: { is_active: true, start_date: new Date(), end_date: null, updated_at: new Date() },
              });
            } else {
              await tx.organizationalAssignment.create({
                data: {
                  tenant_id: tenantId,
                  position_id: position.id,
                  user_id: guru.user_id,
                  kelas_id: kelasId,
                  unit_id: null,
                  start_date: new Date(),
                  end_date: null,
                  is_active: true,
                  updated_at: new Date(),
                } as any,
              });
            }
          }
        }
      }

      // Automatically create/update the default Sarpras Location for the Class
      try {
        const targetUnitId = normalizedJurusanId !== undefined ? normalizedJurusanId : existingKelas.jurusan_id;
        const jurusanForLoc = targetUnitId
          ? await tx.jurusan.findUnique({ where: { id: targetUnitId }, select: { nama: true } })
          : null;

        const targetName = this.buildSarprasLocationName(
          input.nama_kelas !== undefined ? input.nama_kelas : existingKelas.nama_kelas,
          jurusanForLoc?.nama
        );
        const targetDesc = `Ruang kelas untuk ${input.nama_kelas !== undefined ? input.nama_kelas : existingKelas.nama_kelas} tingkat ${input.tingkat !== undefined ? input.tingkat : existingKelas.tingkat}`;

        const existingLoc = await tx.sarprasLocation.findFirst({
          where: { kelas_id: kelasId, tenant_id: existingKelas.tenant_id }
        });

        if (existingLoc) {
          await tx.sarprasLocation.update({
            where: { id: existingLoc.id },
            data: {
              nama: targetName,
              deskripsi: targetDesc,
              unit_id: targetUnitId,
              deleted_at: null
            }
          });
        } else {
          const duplicateNameLoc = await tx.sarprasLocation.findFirst({
            where: { tenant_id: existingKelas.tenant_id, nama: targetName }
          });
          if (duplicateNameLoc) {
            await tx.sarprasLocation.update({
              where: { id: duplicateNameLoc.id },
              data: {
                kelas_id: kelasId,
                unit_id: targetUnitId,
                deleted_at: null
              }
            });
          } else {
            await tx.sarprasLocation.create({
              data: {
                tenant_id: existingKelas.tenant_id,
                nama: targetName,
                kelas_id: kelasId,
                unit_id: targetUnitId,
                deskripsi: targetDesc
              }
            });
          }
        }
      } catch (err) {
        console.warn('Failed to sync automatic Sarpras Location for Kelas:', err);
      }
    });

    // Fetch the complete kelas with relations
    const kelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
      include: {
        Jurusan: {
          select: {
            id: true,
            nama: true,
          },
        },
        OrganizationalAssignments: {
          where: { is_active: true, Position: { code: 'WALIKELAS' } },
          include: { User: { select: { Guru: { select: { id: true, nama_guru: true } } } } },
        },
        _count: {
          select: {
            Siswa: true,
          },
        },
      },
    });

    return this.withDerivedWaliKelas(kelas!);
  }

  async deleteKelas(kelasId: string, tenantId: string, org: any): Promise<void> {
    // Check if kelas exists and user has permission
    const whereClause: any = { id: kelasId, tenant_id: tenantId };

    // Apply Isolate/Scope filter from Organization Engine
    if (org && org.tenant_wide !== true) {
      if (!Array.isArray(org.kelas_ids) || !org.kelas_ids.includes(kelasId)) {
        throw new Error('Forbidden: You do not have access to this kelas');
      }
    }

    const existingKelas = await prisma.kelas.findFirst({
      where: whereClause,
    });

    if (!existingKelas) {
      throw new Error('Kelas not found or insufficient permissions');
    }

    // Check if kelas has related records that prevent deletion
    const relatedRecords = await prisma.kelas.findFirst({
      where: { id: kelasId },
      include: {
        _count: {
          select: {
            Siswa: true,
            SiswaAkademik: true,
            SesiAbsensi: true,
            KelasMapel: true,
            JadwalKBM: true,
            OrganizationalAssignments: true,
            PelanggaranSiswa: true,
          },
        },
      },
    });

    if (relatedRecords) {
      const counts = relatedRecords._count;
      if (counts.Siswa > 0) throw new Error('Tidak dapat menghapus kelas yang masih memiliki siswa terdaftar');
      if (counts.SiswaAkademik > 0) throw new Error('Tidak dapat menghapus kelas yang memiliki riwayat data akademik siswa');
      if (counts.SesiAbsensi > 0) throw new Error('Tidak dapat menghapus kelas yang memiliki catatan sesi absensi');
      if (counts.KelasMapel > 0) throw new Error('Tidak dapat menghapus kelas yang masih memiliki daftar mata pelajaran (Kelas Mapel)');
      if (counts.JadwalKBM > 0) throw new Error('Tidak dapat menghapus kelas yang memiliki data jadwal pelajaran');
      if (counts.OrganizationalAssignments > 0) throw new Error('Tidak dapat menghapus kelas yang memiliki penugasan organisasi (misal: Wali Kelas)');
      if (counts.PelanggaranSiswa > 0) throw new Error('Tidak dapat menghapus kelas yang memiliki catatan pelanggaran siswa');
    }

    // Soft-delete and rename the corresponding location to release the unique constraint
    try {
      const locations = await prisma.sarprasLocation.findMany({
        where: { kelas_id: kelasId, tenant_id: tenantId }
      });
      for (const loc of locations) {
        await prisma.sarprasLocation.update({
          where: { id: loc.id },
          data: {
            nama: `${loc.nama} (Dihapus ${Date.now()})`,
            deleted_at: new Date()
          }
        });
      }
    } catch (err) {
      console.warn('Failed to delete automatic Sarpras Location for Kelas:', err);
    }

    await prisma.kelas.delete({
      where: { id: kelasId },
    });
  }

  async importFromExcel(data: any[], scope: { tenantId: string; org: any }) {
    const { tenantId, org } = scope;
    if (!tenantId) {
      throw new Error('Tenant ID is required for import');
    }

    let created = 0;
    let updated = 0;
    const errors: any[] = [];

    // Pre-fetch references for cache
    const [jurusans, gurus, sekolah] = await Promise.all([
      prisma.jurusan.findMany({ where: { tenant_id: tenantId } }),
      prisma.guru.findMany({ where: { tenant_id: tenantId } }),
      prisma.sekolah.findFirst({ where: { tenant_id: tenantId } }),
    ]);
    const isSmkMak = ['SMK', 'MAK'].includes(sekolah?.jenjang?.toUpperCase() || '');

    for (const [index, row] of data.entries()) {
      const rowNumber = row.__rowNum || (index + 2);
      try {
        const namaKelas = row.nama_kelas ? String(row.nama_kelas).trim() : '';
        const tingkat = row.tingkat ? parseInt(row.tingkat) : 0;
        const jurusanName = row.jurusan ? String(row.jurusan).trim() : '';
        const waliKelasName = row.wali_kelas ? String(row.wali_kelas).trim() : '';

        if (isSmkMak && !jurusanName) {
          throw new Error('Kolom jurusan wajib diisi untuk sekolah SMK/MAK');
        }

        if (!namaKelas || !tingkat) {
          throw new Error('Kolom nama_kelas dan tingkat wajib diisi');
        }

        // Find Jurusan (with typo tolerance)
        let jurusanId: string | null = null;
        if (jurusanName) {
          const jurusanMatch = findBestMatch(jurusanName, jurusans.map(j => j.nama));
          const jurusan = jurusans.find(j => j.nama === jurusanMatch.match);
          if (!jurusan) {
            throw new Error(`Jurusan '${jurusanName}' tidak ditemukan`);
          }
          jurusanId = jurusan.id;
        }

        // Find Wali Kelas (Optional)
        let guruId = undefined;
        if (waliKelasName) {
          const guruMatch = findBestMatch(waliKelasName, gurus.map(g => g.nama_guru));
          const guru = gurus.find(g => g.nama_guru === guruMatch.match);
          if (guru) {
            guruId = guru.id;
          } else {
            throw new Error(`Guru '${waliKelasName}' tidak ditemukan`);
          }
        }

        // Check existence
        const existingKelas = await prisma.kelas.findFirst({
          where: {
            tenant_id: tenantId,
            nama_kelas: namaKelas,
            tingkat: tingkat,
            jurusan_id: jurusanId,
          },
        });

        if (existingKelas) {
          // Update
          await this.updateKelas(existingKelas.id, {
             nama_kelas: namaKelas,
             tingkat: tingkat,
             jurusan_id: jurusanId,
             guru_id: guruId,
             jam_masuk: row.jam_masuk,
             jam_pulang: row.jam_pulang
          }, tenantId, org);
          updated++;
        } else {
          // Create
          await this.createKelas({
            nama_kelas: namaKelas,
            tingkat: tingkat,
            jurusan_id: jurusanId,
            guru_id: guruId,
            jam_masuk: row.jam_masuk,
            jam_pulang: row.jam_pulang
          }, tenantId, org);
          created++;
        }

      } catch (err: any) {
        errors.push({ row: rowNumber, message: err.message });
      }
    }

    return { created, updated, errors };
  }
}

export const kelasService = new KelasService();
