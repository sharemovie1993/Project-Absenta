import { prisma } from '@/utils/prisma';
import { applyDataScope } from '@/utils/applyDataScope';
import { normalizePhone } from '@/utils/normalization';
import { userService } from '../../../user/services/user.service';
import { DataScope } from '../../../../types/fastify';
import { uploadGuruDocumentCommand } from './commands/upload-guru-document.command';
import { deleteGuruDocumentCommand } from './commands/delete-guru-document.command';
import { getGuruDocumentsQuery } from './queries/get-guru-documents.query';
import { MultipartFile } from '@fastify/multipart';
import { removeLidMappingByPhone } from '../../../whatsapp/services/wa-chatbot-resolver.service';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export interface CreateGuruInput {
  user_id?: string | null;
  nip?: string | null;
  nama_guru: string;
  no_rfid?: string | null;
  email?: string | null;
  // Kontak & Pribadi
  no_hp?: string | null;
  alamat?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: Date | string | null;
  jenis_kelamin?: string | null;
  agama?: string | null;
  status_kepegawaian?: string | null;
  pendidikan_terakhir?: string | null;
  jenis_ptk?: string | null;
  foto?: string | null;
}

export interface UpdateGuruInput {
  nip?: string | null;
  nama_guru?: string | null;
  no_rfid?: string | null;
  status?: string | null;
  email?: string | null;
  // Kontak & Pribadi
  no_hp?: string | null;
  alamat?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: Date | string | null;
  jenis_kelamin?: string | null;
  agama?: string | null;
  status_kepegawaian?: string | null;
  pendidikan_terakhir?: string | null;
  jenis_ptk?: string | null;
  foto?: string | null;
}

export interface GuruResponse {
  id: string;
  tenant_id: string;
  user_id: string;
  nip: string | null;
  nama_guru: string;
  no_rfid: string | null;
  email?: string | null;
  no_hp?: string | null;
  alamat?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: Date | null;
  jenis_kelamin?: string | null;
  agama?: string | null;
  status_kepegawaian?: string | null;
  pendidikan_terakhir?: string | null;
  jenis_ptk?: string | null;
  created_at: Date;
  updated_at: Date;
  User?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  user_id?: string;
  status_kepegawaian?: string;
  jenis_kelamin?: string;
  jenis_ptk?: string;
}

export interface PaginatedGuruResponse {
  data: GuruResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class GuruService {
  async getAllGuru(scope: DataScope, params?: PaginationParams): Promise<PaginatedGuruResponse> {
    let whereClause: any = {};

    // Apply Tenant Scope (Explicitly ignore userId to preserve existing behavior)
    whereClause = applyDataScope(whereClause, { tenantId: scope.tenantId });

    // Filter by user_id if provided
    if (params?.user_id) {
      whereClause.user_id = params.user_id;
    }

    if (params?.status_kepegawaian && params.status_kepegawaian !== 'ALL') {
      whereClause.status_kepegawaian = params.status_kepegawaian;
    }

    if (params?.jenis_kelamin && params.jenis_kelamin !== 'ALL') {
      whereClause.jenis_kelamin = params.jenis_kelamin;
    }

    if (params?.jenis_ptk && params.jenis_ptk !== 'ALL') {
      whereClause.jenis_ptk = params.jenis_ptk;
    }

    // Add search functionality
    if (params?.search) {
      const search = String(params.search || '').trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search);
      whereClause.OR = [
        ...(isUuid ? [{ id: search }] : []),
        { nama_guru: { contains: search, mode: 'insensitive' } },
        { nip: { contains: search, mode: 'insensitive' } },
        { no_rfid: { contains: search, mode: 'insensitive' } },
        { User: { email: { contains: search, mode: 'insensitive' } } },
        { User: { full_name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Calculate pagination
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.guru.count({ where: whereClause });

    // Get paginated data
    const guru = await prisma.guru.findMany({
      where: whereClause,
      include: {
        User: {
          select: {
            id: true,
            email: true,
            full_name: true,
            status: true,
            Role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    const enrichedGuru = guru.map((g: any) => {
      if (g.User) {
        g.email = g.User.email;
      }
      return g;
    });

    return {
      data: enrichedGuru as GuruResponse[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getGuruById(guruId: string, scope: DataScope): Promise<GuruResponse | null> {
    let whereClause: any = { id: guruId };

    // Apply Tenant Scope
    whereClause = applyDataScope(whereClause, { tenantId: scope.tenantId });

    const guru = await prisma.guru.findFirst({
      where: whereClause,
      include: {
        User: {
          select: {
            id: true,
            email: true,
            full_name: true,
            status: true,
          },
        },
      },
    });

    if (guru && (guru as any).User) {
      (guru as any).email = (guru as any).User.email;
    }

    return guru as GuruResponse | null;
  }

  /**
   * GET /academic/guru/me
   * Mengambil profil guru milik user yang sedang login,
   * dilengkapi dengan semua jabatan struktural aktif dari OrganizationalAssignment.
   * Respon diperkaya dengan field:
   *   - jabatan_list: array string kode posisi (misal ['WALI_KELAS', 'KURIKULUM'])
   *   - jabatan: string gabungan jabatan (untuk backward-compat)
   *   - wali_kelas_di: data kelas binaan (jika ada assignment berkelas)
   *   - unit: data jurusan (jika ada assignment berunit)
   */
  async getGuruMe(userId: string, tenantId: string): Promise<any | null> {
    // 1. Temukan record guru berdasarkan user_id
    const guru = await prisma.guru.findFirst({
      where: { user_id: userId, tenant_id: tenantId },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            full_name: true,
            status: true,
          },
        },
      },
    });

    if (!guru) return null;

    if (guru && (guru as any).User) {
      (guru as any).email = (guru as any).User.email;
    }

    // 2. Ambil semua OrganizationalAssignment aktif untuk user ini
    const assignments = await prisma.organizationalAssignment.findMany({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        is_active: true,
        OR: [
          { end_date: null },
          { end_date: { gte: new Date() } },
        ],
      },
      include: {
        Position: {
          select: {
            id: true,
            code: true,
            name: true,
            scope_type: true,
          },
        },
        Kelas: {
          select: {
            id: true,
            nama_kelas: true,
            tingkat: true,
          },
        },
        Unit: {
          select: {
            id: true,
            nama: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    // 3. Ekstrak data jabatan (cast to any[] — Prisma include types may not propagate)
    const assigns = assignments as any[];
    const jabatanList = assigns.map((a: any) => a.Position?.code ?? '').filter(Boolean);
    const jabatanNames = assigns.map((a: any) => a.Position?.name ?? '').filter(Boolean);
    const jabatan = jabatanNames.join(' / ') || null;

    // 4. Temukan assignment sebagai Wali Kelas (yang punya kelas_id)
    const waliKelasAssignment = assigns.find(
      (a: any) => a.kelas_id && (
        (a.Position?.code ?? '').toUpperCase().includes('WALI') ||
        a.Position?.scope_type === 'KELAS'
      )
    );

    // 5. Temukan unit/jurusan dari assignment (Kaprog, Kabeng)
    const unitAssignment = assigns.find((a: any) => a.Unit != null);

    return {
      ...guru,
      jabatan_list: jabatanList,
      jabatan,
      wali_kelas_di: waliKelasAssignment?.Kelas ?? null,
      unit: unitAssignment?.Unit ?? null,
      assignments: assigns.map((a: any) => ({
        position_code: a.Position?.code,
        position_name: a.Position?.name,
        scope_type: a.Position?.scope_type,
        kelas: a.Kelas,
        unit: a.Unit,
      })),
    };
  }


  async createGuru(input: CreateGuruInput, scope: DataScope): Promise<GuruResponse> {
    const tenantId = scope.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context is required for creating Guru');
    }

    // Auto-generate temporary NIP starting with 9999 if empty/null/invalid
    let nipToUse = input.nip ? String(input.nip).trim() : '';
    if (!nipToUse || nipToUse === '-' || nipToUse === 'KOSONG') {
      const generateTempNip = () => {
        let s = '9999';
        for (let i = 0; i < 6; i++) s += Math.floor(Math.random() * 10).toString();
        return s;
      };

      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateTempNip();
        const exists = await prisma.guru.findFirst({
          where: { tenant_id: tenantId, nip: candidate },
        });
        if (!exists) {
          nipToUse = candidate;
          break;
        }
      }
      if (!nipToUse) {
        nipToUse = '9999' + Date.now().toString().slice(-6);
      }
    }

    // Resolve or create associated user
    let associatedUserId: string | undefined = input.user_id ?? undefined;

    if (associatedUserId) {
      const user = await prisma.user.findFirst({
        where: {
          id: associatedUserId,
          tenant_id: tenantId,
        },
      });

      if (!user) {
        throw new Error('User not found or not in the same tenant');
      }

      const existingGuru = await prisma.guru.findFirst({
        where: {
          user_id: associatedUserId,
        },
      });

      if (existingGuru) {
        throw new Error('User already has a guru profile');
      }
    } else {
      // Auto-create user for this guru
      const fullName = input.nama_guru;
      const cleanNip = nipToUse.replace(/[^a-z0-9]+/gi, '');
      const cleanName = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

      // Default email is constructed from NIP@absenta.id (fallback to name if missing)
      const baseLocalPart = (cleanNip || cleanName || 'guru').slice(0, 32);
      const generatedEmail = `${baseLocalPart}@absenta.id`;

      let emailToUse = input.email && input.email.trim().length > 0 ? input.email.trim() : generatedEmail;

      const existingUserByEmail = await prisma.user.findFirst({
        where: { email: emailToUse, tenant_id: tenantId },
      });

      if (existingUserByEmail) {
        const suffix = Math.floor(Math.random() * 10000).toString();
        const parts = emailToUse.split('@');
        emailToUse = `${parts[0]}.${suffix}@${parts[1] || 'absenta.id'}`;
      }

      // Default temporary password
      // If DEFAULT_GURU_PASSWORD is not set, generate a random secure password
      const defaultPassword = process.env.DEFAULT_GURU_PASSWORD || require('crypto').randomBytes(8).toString('hex');

      const createdUser = await userService.createUser({
        email: emailToUse,
        password: defaultPassword,
        full_name: fullName,
        role: 'GURU',
        tenant_id: tenantId,
      });

      associatedUserId = createdUser.id;
    }

    const guru = await prisma.guru.create({
      data: {
        tenant_id: tenantId,
        user_id: associatedUserId!,
        nip: nipToUse,
        nama_guru: input.nama_guru,
        no_rfid: input.no_rfid || null,
        no_hp: input.no_hp ? normalizePhone(input.no_hp) : null,
        alamat: input.alamat ?? null,
        tempat_lahir: input.tempat_lahir ?? null,
        tanggal_lahir: input.tanggal_lahir ? new Date(input.tanggal_lahir) : null,
        jenis_kelamin: input.jenis_kelamin ?? null,
        agama: input.agama ?? null,
        status_kepegawaian: input.status_kepegawaian ?? null,
        pendidikan_terakhir: input.pendidikan_terakhir ?? null,
        jenis_ptk: input.jenis_ptk ?? 'PENDIDIK',
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            full_name: true,
          },
        },
      },
    });

    if (guru && (guru as any).User) {
      (guru as any).email = (guru as any).User.email;
    }

    await cacheInvalidationService.invalidateAcademicCache(tenantId);

    return guru as GuruResponse;
  }

  async updateGuru(guruId: string, input: UpdateGuruInput, scope: DataScope): Promise<GuruResponse> {
    // Check if guru exists
    let whereClause: any = { id: guruId };
    whereClause = applyDataScope(whereClause, { tenantId: scope.tenantId });

    const existingGuru = await prisma.guru.findFirst({
      where: whereClause,
    });

    if (!existingGuru) {
      throw new Error('Guru not found or insufficient permissions');
    }

    // Check if NIP is unique within tenant (if provided and different from current)
    if (input.nip && input.nip !== existingGuru.nip) {
      const existingNip = await prisma.guru.findFirst({
        where: {
          tenant_id: existingGuru.tenant_id,
          nip: input.nip,
          id: { not: guruId },
        },
      });

      if (existingNip) {
        throw new Error('NIP already exists in this tenant');
      }
    }

    // Sinkronisasi Email ke tabel User jika ada perubahan
    if (input.email !== undefined && input.email !== null && existingGuru.user_id) {
      const emailToUse = input.email.trim().toLowerCase();
      
      const currentUser = await prisma.user.findUnique({
        where: { id: existingGuru.user_id },
        select: { email: true }
      });

      if (currentUser && currentUser.email.toLowerCase() !== emailToUse) {
        const otherUser = await prisma.user.findFirst({
          where: {
            email: emailToUse,
            tenant_id: existingGuru.tenant_id,
            id: { not: existingGuru.user_id }
          }
        });

        if (otherUser) {
          throw new Error('Email sudah terdaftar untuk pengguna lain');
        }

        await prisma.user.update({
          where: { id: existingGuru.user_id },
          data: { email: emailToUse }
        });
      }
    }

    // Build update data object, only including defined fields
    const updateData: any = {};
    if (input.nip !== undefined) updateData.nip = input.nip;
    if (input.nama_guru !== undefined) updateData.nama_guru = input.nama_guru;
    if (input.no_rfid !== undefined) updateData.no_rfid = input.no_rfid;
    if (input.no_hp !== undefined) {
      const cleanPhone = input.no_hp ? normalizePhone(input.no_hp) : null;
      if (existingGuru.no_hp) {
        removeLidMappingByPhone(existingGuru.no_hp);
      }
      if (cleanPhone) {
        removeLidMappingByPhone(cleanPhone);
      }
      updateData.no_hp = cleanPhone;
      if (existingGuru.user_id) {
        await prisma.user.update({
          where: { id: existingGuru.user_id },
          data: { no_hp: cleanPhone }
        });
      }
    }
    if (input.alamat !== undefined) updateData.alamat = input.alamat;
    if (input.tempat_lahir !== undefined) updateData.tempat_lahir = input.tempat_lahir;
    if (input.tanggal_lahir !== undefined) updateData.tanggal_lahir = input.tanggal_lahir ? new Date(input.tanggal_lahir) : null;
    if (input.jenis_kelamin !== undefined) updateData.jenis_kelamin = input.jenis_kelamin;
    if (input.agama !== undefined) updateData.agama = input.agama;
    if (input.status_kepegawaian !== undefined) updateData.status_kepegawaian = input.status_kepegawaian;
    if (input.pendidikan_terakhir !== undefined) updateData.pendidikan_terakhir = input.pendidikan_terakhir;
    if (input.jenis_ptk !== undefined) updateData.jenis_ptk = input.jenis_ptk;
    if (input.foto !== undefined) updateData.foto = input.foto;

    const guru = await prisma.guru.update({
      where: { id: guruId },
      data: updateData,
      include: {
        User: {
          select: {
            id: true,
            email: true,
            full_name: true,
            status: true,
          },
        },
      },
    });

    // Sync status back to user if provided
    if (input.status && guru.user_id) {
      await prisma.user.update({
        where: { id: guru.user_id },
        data: { status: input.status },
      });
      // Refresh guru object with updated user status
      const updatedGuru: any = await prisma.guru.findUnique({
        where: { id: guruId },
        include: {
          User: {
            select: {
              id: true,
              email: true,
              full_name: true,
              status: true,
            },
          },
        },
      });

      if (updatedGuru && updatedGuru.User) {
        updatedGuru.email = updatedGuru.User.email;
      }

      await cacheInvalidationService.invalidateAcademicCache(existingGuru.tenant_id);
      return updatedGuru as GuruResponse;
    }

    if (guru && (guru as any).User) {
      (guru as any).email = (guru as any).User.email;
    }

    await cacheInvalidationService.invalidateAcademicCache(existingGuru.tenant_id);
    return guru as GuruResponse;
  }

  async deleteGuru(guruId: string, scope: DataScope): Promise<void> {
    // Check if guru exists
    let whereClause: any = { id: guruId };
    whereClause = applyDataScope(whereClause, { tenantId: scope.tenantId });

    const existingGuru = await prisma.guru.findFirst({
      where: whereClause,
    });

    if (!existingGuru) {
      throw new Error('Guru not found or insufficient permissions');
    }

    // Check if guru has related records that prevent deletion
    const relatedRecords = await prisma.guru.findFirst({
      where: { id: guruId },
      include: {
        _count: {
          select: {
            GuruMapel: true,
            SesiAbsensi: true,
            AbsenGuru: true,
            JadwalKBM: true,
            SupervisiGuru: true,
            SupervisiAsSupervisor: true,
            SiswaPkl: true,
            IzinKeluarSiswa: true,
          },
        },
      },
    });

    if (relatedRecords) {
      const counts = relatedRecords._count;
      if (counts.GuruMapel > 0) throw new Error('Tidak dapat menghapus guru yang masih mengampu mata pelajaran (Guru Mapel)');
      if (counts.SesiAbsensi > 0) throw new Error('Tidak dapat menghapus guru yang memiliki catatan sesi absensi');
      if (counts.AbsenGuru > 0) throw new Error('Tidak dapat menghapus guru yang memiliki riwayat kehadiran');
      if (counts.JadwalKBM > 0) throw new Error('Tidak dapat menghapus guru yang masih terdaftar di Jadwal Pelajaran');
      if (counts.SupervisiGuru > 0 || counts.SupervisiAsSupervisor > 0) throw new Error('Tidak dapat menghapus guru yang memiliki data Supervisi');
      if (counts.SiswaPkl > 0) throw new Error('Tidak dapat menghapus guru yang sedang menjadi pembimbing PKL');
      if (counts.IzinKeluarSiswa > 0) throw new Error('Tidak dapat menghapus guru yang memiliki data Izin Keluar Siswa');
    }

    // Check for Organizational Assignments (like Wali Kelas)
    if (existingGuru.user_id) {
      const orgAssignments = await prisma.organizationalAssignment.count({
        where: { user_id: existingGuru.user_id, is_active: true }
      });
      if (orgAssignments > 0) {
        throw new Error('Tidak dapat menghapus guru yang masih aktif dalam Struktur Organisasi (misal: Wali Kelas)');
      }
    }

    await prisma.$transaction(async (tx) => {
      if (existingGuru.user_id) {
        await tx.organizationalAssignment.deleteMany({
          where: { user_id: existingGuru.user_id },
        });
      }

      await tx.guru.delete({
        where: { id: guruId },
      });
      if (existingGuru.user_id) {
        // If deleting user, ensure we have permission to delete this user.
        // The fact that we found the guru means we have access to the guru record.
        // We just need to ensure we don't accidentally delete a user we shouldn't.
        // But the relationship is 1:1 and we are deleting the guru who owns this user account (in this context).
        // If the user is shared (which shouldn't be for Guru), it would be problematic, but Guru user is unique.
        // Cross-tenant check is already done by finding the guru in the tenant.
        
        await tx.user.delete({ where: { id: existingGuru.user_id } });
      }
    });
  }

  async importFromExcel(data: any[], scope: DataScope, onProgress?: (current: number, total: number) => void) {
    if (!scope.tenantId) {
      throw new Error('Tenant ID is required for import');
    }
    const tenantId = scope.tenantId;
    let created = 0;
    let updated = 0;
    const errors: any[] = [];
    const matchedGuruIds = new Set<string>();

    for (const [index, row] of data.entries()) {
      const rowNumber = row.__rowNum || (index + 2);
      try {
        const namaVal = row.nama_guru || row.nama_lengkap || row.nama || '';
        const nama = namaVal ? String(namaVal).trim() : '';
        
        // Handle NIP flexibly (accept number or string, generate if empty or '-')
        let nip: string | undefined = undefined;
        let isNipGenerated = false;
        if (row.nip !== undefined && row.nip !== null && String(row.nip).trim() !== '' && String(row.nip).trim() !== '-') {
          nip = String(row.nip).trim();
        } else {
          // Generate a placeholder NIP starting with 9999 (10 digits)
          let s = '9999';
          for (let i = 0; i < 6; i++) s += Math.floor(Math.random() * 10).toString();
          nip = s;
          isNipGenerated = true;
        }

        const email = row.email ? String(row.email).trim() : undefined;
        
        if (!nama) {
          throw new Error('Missing required field: nama_guru');
        }

        // Prepare input data
        const inputData: any = {
          nama_guru: nama,
          nip: nip,
          email: email,
          no_rfid: row.no_rfid ? String(row.no_rfid).trim() : undefined,
          no_hp: row.no_hp ? normalizePhone(row.no_hp) : undefined,
          alamat: row.alamat ? String(row.alamat).trim() : undefined,
          tempat_lahir: row.tempat_lahir ? String(row.tempat_lahir).trim() : undefined,
          jenis_kelamin: row.jenis_kelamin ? String(row.jenis_kelamin).trim() : undefined,
          agama: row.agama ? String(row.agama).trim() : undefined,
          status_kepegawaian: row.status_kepegawaian ? String(row.status_kepegawaian).trim() : undefined,
          pendidikan_terakhir: row.pendidikan_terakhir ? String(row.pendidikan_terakhir).trim() : undefined,
        };

        if (row.tanggal_lahir) {
             // Try to parse date
             const date = new Date(row.tanggal_lahir);
             if (!isNaN(date.getTime())) {
                 inputData.tanggal_lahir = date;
             }
        }

        // Try to find existing guru by NIP (if provided and NOT generated) or Email
        let existingGuru = null;

        if (nip && !isNipGenerated) {
          existingGuru = await prisma.guru.findFirst({
            where: {
              tenant_id: tenantId,
              nip: nip,
              id: { notIn: Array.from(matchedGuruIds) }
            }
          });
        }

        // If not found by NIP, try by email
        if (!existingGuru && email) {
          // Find user first
           const user = await prisma.user.findFirst({
             where: {
               email: email,
               tenant_id: tenantId
             }
           });

          if (user) {
            existingGuru = await prisma.guru.findFirst({
              where: {
                tenant_id: tenantId,
                user_id: user.id,
                id: { notIn: Array.from(matchedGuruIds) }
              }
            });
          }
        }

        // If still not found, try to match by exact Name to prevent duplicates
        if (!existingGuru) {
          existingGuru = await prisma.guru.findFirst({
            where: {
              tenant_id: tenantId,
              nama_guru: nama,
              id: { notIn: Array.from(matchedGuruIds) }
            }
          });
        }

        if (existingGuru) {
          // If NIP was generated but they already have a NIP in DB, preserve it!
          if (isNipGenerated && existingGuru.nip) {
            inputData.nip = existingGuru.nip;
          }
          // Update
          const updatedGuru = await this.updateGuru(existingGuru.id, inputData, scope);
          matchedGuruIds.add(updatedGuru.id);
          updated++;
        } else {
          // Create
          const createdGuru = await this.createGuru(inputData, scope);
          matchedGuruIds.add(createdGuru.id);
          created++;
        }
      } catch (err: any) {
        errors.push({ row: rowNumber, message: err.message });
      }
      onProgress?.(index + 1, data.length);
    }

    return { created, updated, errors };
  }

  async uploadGuruDocument(params: {
    tenantId: string;
    guruId: string;
    judul: string;
    kategori: string;
    actorUserId?: string;
    file: MultipartFile;
  }) {
    return uploadGuruDocumentCommand(params);
  }

  async deleteGuruDocument(params: {
    tenantId: string;
    guruId: string;
    documentId: string;
  }) {
    return deleteGuruDocumentCommand(params);
  }

  async getGuruDocuments(params: {
    tenantId: string;
    guruId: string;
  }) {
    return getGuruDocumentsQuery(params);
  }

  /**
   * SHARED DOMAIN SERVICE METHOD:
   * Memperbarui NIP Guru.
   */
  async updateGuruNip(guruId: string, newNip: string) {
    if (!newNip || !newNip.trim()) {
      throw new Error('Nomor NIP tidak boleh kosong.');
    }
    return prisma.guru.update({
      where: { id: guruId },
      data: { nip: newNip.trim() },
    });
  }

  /**
   * SHARED DOMAIN SERVICE METHOD:
   * Memperbarui Email Pengguna Guru (dengan pengecekan duplikasi).
   */
  async updateGuruEmail(userId: string, newEmail: string) {
    const cleanEmail = String(newEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error(`Format email (${newEmail}) tidak valid.`);
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        id: { not: userId },
      },
    });

    if (existingUser) {
      throw new Error(`Email ${cleanEmail} sudah digunakan oleh pengguna lain.`);
    }

    return prisma.user.update({
      where: { id: userId },
      data: { email: cleanEmail },
    });
  }
}

export const guruService = new GuruService();
