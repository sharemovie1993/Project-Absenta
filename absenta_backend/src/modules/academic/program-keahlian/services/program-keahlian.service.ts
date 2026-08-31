import { prisma } from '@/utils/prisma';
import { RoleName } from '../../../../constants/enums';
import { isSystemSuperAdmin } from '@/utils/rbac';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export interface CreateProgramKeahlianInput {
  nama: string;
  kode?: string | null;
  singkatan?: string | null;
  bidang_keahlian?: string | null;
}

export interface UpdateProgramKeahlianInput {
  nama?: string;
  kode?: string | null;
  singkatan?: string | null;
  bidang_keahlian?: string | null;
}

export interface ProgramKeahlianResponse {
  id: string;
  tenant_id: string;
  nama: string;
  kode?: string | null;
  singkatan?: string | null;
  bidang_keahlian?: string | null;
  created_at: Date;
  updated_at: Date;
  _count?: {
    Jurusan: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface PaginatedProgramKeahlianResponse {
  data: ProgramKeahlianResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ProgramKeahlianService {
  async getAllProgramKeahlian(
    requestingUserRole: RoleName,
    requestingUserTenantId?: string,
    params?: PaginationParams
  ): Promise<PaginatedProgramKeahlianResponse> {
    let whereClause: any = {};

    // Only system SUPERADMIN can see all; others are tenant-scoped
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    // Add search functionality
    if (params?.search) {
      whereClause.OR = [
        { nama: { contains: params.search, mode: 'insensitive' } },
        { kode: { contains: params.search, mode: 'insensitive' } },
        { bidang_keahlian: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Calculate pagination
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const skip = (page - 1) * limit;

    // Auto-link any unlinked Jurusan in the tenant to matching ProgramKeahlian
    if (requestingUserTenantId) {
      try {
        const unlinkedJurusans = await prisma.jurusan.findMany({
          where: { tenant_id: requestingUserTenantId, program_keahlian_id: null },
          select: { id: true, nama: true, kode: true, singkatan: true }
        });

        if (unlinkedJurusans.length > 0) {
          const allPrograms = await prisma.programKeahlian.findMany({
            where: { tenant_id: requestingUserTenantId },
            select: { id: true, nama: true, kode: true, singkatan: true }
          });

          const MAPPING_RULES: { keywords: string[]; programKodeOrName: string[] }[] = [
            { keywords: ['AKL', 'AKUNTANSI'], programKodeOrName: ['AKL', 'AKUNTANSI DAN KEUANGAN LEMBAGA'] },
            { keywords: ['KUL', 'KLN', 'KULINER', 'TATA BOGA'], programKodeOrName: ['KLN', 'KUL', 'KULINER'] },
            { keywords: ['PH', 'PHT', 'PERHOTELAN', 'TATA HIDANG'], programKodeOrName: ['PH', 'PHT', 'PERHOTELAN'] },
            { keywords: ['TOI', 'TAV', 'ELEKTRONIKA', 'AUDIO VIDEO', 'OTOMASI'], programKodeOrName: ['TE', 'TEKNIK ELEKTRONIKA'] },
            { keywords: ['TKR', 'TSM', 'OTOMOTIF', 'KENDARAAN RINGAN', 'SEPEDA MOTOR', 'TBSM'], programKodeOrName: ['TO', 'TEKNIK OTOMOTIF'] },
            { keywords: ['TKJ', 'TJKT', 'JARINGAN', 'KOMPUTER', 'RPL', 'PPLG', 'PERANGKAT LUNAK'], programKodeOrName: ['TJKT', 'PPLG', 'TEKNIK JARINGAN KOMPUTER DAN TELEKOMUNIKASI', 'PENGEMBANGAN PERANGKAT LUNAK DAN GIM'] },
            { keywords: ['TP', 'MESIN', 'PEMESINAN', 'BUBUT', 'FRAIS'], programKodeOrName: ['TM', 'TEKNIK MESIN'] },
            { keywords: ['TITL', 'LISTRIK', 'KETENAGALISTRIKAN', 'INSTALASI'], programKodeOrName: ['TKL', 'TEKNIK KETENAGALISTRIKAN'] },
            { keywords: ['DKV', 'DESAIN KOMUNIKASI VISUAL', 'MULTIMEDIA', 'ANIMASI'], programKodeOrName: ['DKV', 'DESAIN KOMUNIKASI VISUAL', 'ANIMASI'] },
            { keywords: ['BDP', 'PEMASARAN', 'BISNIS DIGITAL'], programKodeOrName: ['PM', 'PEMASARAN'] },
            { keywords: ['OTKP', 'MPLB', 'PERKANTORAN'], programKodeOrName: ['MPLB', 'MANAJEMEN PERKANTORAN DAN LAYANAN BISNIS'] },
            { keywords: ['TKP', 'DPIB', 'BANGUNAN', 'ARSITEKTUR', 'KONSTRUKSI'], programKodeOrName: ['TKP', 'DPIB', 'TEKNIK KONSTRUKSI DAN PERUMAHAN'] },
            { keywords: ['BUSANA', 'TATA BUSANA'], programKodeOrName: ['BSN', 'BUSANA'] }
          ];

          for (const jur of unlinkedJurusans) {
            const jurStr = `${jur.nama} ${jur.kode || ''} ${jur.singkatan || ''}`.toUpperCase();
            
            let matchedProg = allPrograms.find(p => {
              const pCode = (p.kode || '').toUpperCase();
              const pName = p.nama.toUpperCase();
              const jCode = (jur.kode || '').toUpperCase();
              const jSingkatan = (jur.singkatan || '').toUpperCase();
              return (pCode && (jCode === pCode || jSingkatan === pCode)) ||
                     (jur.nama && pName.includes(jur.nama.toUpperCase())) ||
                     (jur.nama && jur.nama.toUpperCase().includes(pName));
            });

            if (!matchedProg) {
              for (const rule of MAPPING_RULES) {
                const matchesJur = rule.keywords.some(kw => jurStr.includes(kw));
                if (matchesJur) {
                  matchedProg = allPrograms.find(p => {
                    const pCode = (p.kode || '').toUpperCase();
                    const pName = p.nama.toUpperCase();
                    return rule.programKodeOrName.some(target => pCode === target || pName.includes(target) || target.includes(pName));
                  });
                  if (matchedProg) break;
                }
              }
            }

            if (matchedProg) {
              await prisma.jurusan.update({
                where: { id: jur.id },
                data: { program_keahlian_id: matchedProg.id }
              });
            }
          }
        }
      } catch (err) {
        console.warn('Auto-link Jurusan to ProgramKeahlian skipped:', err);
      }
    }

    // Get total count
    const total = await prisma.programKeahlian.count({ where: whereClause });

    // Get paginated data
    const programKeahlian = await prisma.programKeahlian.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            Jurusan: true,
          },
        },
      },
      orderBy: [{ nama: 'asc' }],
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: programKeahlian as ProgramKeahlianResponse[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getProgramKeahlianById(
    id: string,
    requestingUserRole: RoleName,
    requestingUserTenantId?: string
  ): Promise<ProgramKeahlianResponse | null> {
    let whereClause: any = { id };

    // Only system SUPERADMIN can view any; others are tenant-scoped
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    const programKeahlian = await prisma.programKeahlian.findFirst({
      where: whereClause,
      include: {
        _count: {
          select: {
            Jurusan: true,
          },
        },
      },
    });

    return programKeahlian as ProgramKeahlianResponse | null;
  }

  async createProgramKeahlian(
    input: CreateProgramKeahlianInput,
    tenantId: string
  ): Promise<ProgramKeahlianResponse> {
    // Check if nama is unique within tenant
    const existingNama = await prisma.programKeahlian.findFirst({
      where: {
        tenant_id: tenantId,
        nama: input.nama,
      },
    });

    if (existingNama) {
      throw new Error('Nama Program Keahlian sudah ada dalam tenant ini');
    }

    // Check if kode is unique within tenant (if provided)
    if (input.kode) {
      const existingKode = await prisma.programKeahlian.findFirst({
        where: {
          tenant_id: tenantId,
          kode: input.kode,
        },
      });

      if (existingKode) {
        throw new Error('Kode Program Keahlian sudah ada dalam tenant ini');
      }
    }

    const programKeahlian = await prisma.programKeahlian.create({
      data: {
        tenant_id: tenantId,
        nama: input.nama,
        kode: input.kode,
        singkatan: input.singkatan,
        bidang_keahlian: input.bidang_keahlian,
      },
      include: {
        _count: {
          select: {
            Jurusan: true,
          },
        },
      },
    });

    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    await cacheInvalidationService.invalidateAcademicCache(tenantId);
    return programKeahlian as ProgramKeahlianResponse;
  }

  async updateProgramKeahlian(
    id: string,
    input: UpdateProgramKeahlianInput,
    requestingUserRole: RoleName,
    requestingUserTenantId?: string
  ): Promise<ProgramKeahlianResponse> {
    let whereClause: any = { id };

    // Only system SUPERADMIN can update any; others are tenant-scoped
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    // Check if exists
    const existing = await prisma.programKeahlian.findFirst({
      where: whereClause,
    });

    if (!existing) {
      throw new Error('Program Keahlian tidak ditemukan atau bukan milik tenant ini');
    }

    // Check if new nama is unique within tenant (if provided)
    if (input.nama && input.nama !== existing.nama) {
      const duplicateName = await prisma.programKeahlian.findFirst({
        where: {
          tenant_id: existing.tenant_id,
          nama: input.nama,
          id: { not: id },
        },
      });

      if (duplicateName) {
        throw new Error('Nama Program Keahlian sudah ada dalam tenant ini');
      }
    }

    // Check if new kode is unique within tenant (if provided)
    if (input.kode && input.kode !== existing.kode) {
      const duplicateKode = await prisma.programKeahlian.findFirst({
        where: {
          tenant_id: existing.tenant_id,
          kode: input.kode,
          id: { not: id },
        },
      });

      if (duplicateKode) {
        throw new Error('Kode Program Keahlian sudah ada dalam tenant ini');
      }
    }

    const updated = await prisma.programKeahlian.update({
      where: { id },
      data: {
        ...(input.nama && { nama: input.nama }),
        ...(input.kode !== undefined && { kode: input.kode }),
        ...(input.singkatan !== undefined && { singkatan: input.singkatan }),
        ...(input.bidang_keahlian !== undefined && { bidang_keahlian: input.bidang_keahlian }),
      },
      include: {
        _count: {
          select: {
            Jurusan: true,
          },
        },
      },
    });

    await cacheInvalidationService.invalidateStrukturTree(existing.tenant_id);
    await cacheInvalidationService.invalidateAcademicCache(existing.tenant_id);
    return updated as ProgramKeahlianResponse;
  }

  async removeProgramKeahlian(
    id: string,
    requestingUserRole: RoleName,
    requestingUserTenantId?: string
  ): Promise<void> {
    let whereClause: any = { id };

    // Only system SUPERADMIN can delete any; others are tenant-scoped
    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    // Check if exists
    const existing = await prisma.programKeahlian.findFirst({
      where: whereClause,
      include: {
        _count: {
          select: {
            Jurusan: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error('Program Keahlian tidak ditemukan atau bukan milik tenant ini');
    }

    // Check if still has related Jurusan (Konsentrasi Keahlian)
    if (existing._count.Jurusan > 0) {
      throw new Error(
        'Tidak dapat menghapus Program Keahlian yang masih memiliki Konsentrasi Keahlian'
      );
    }

    await prisma.programKeahlian.delete({
      where: { id },
    });

    await cacheInvalidationService.invalidateStrukturTree(existing.tenant_id);
    await cacheInvalidationService.invalidateAcademicCache(existing.tenant_id);
  }
}

export const programKeahlianService = new ProgramKeahlianService();
