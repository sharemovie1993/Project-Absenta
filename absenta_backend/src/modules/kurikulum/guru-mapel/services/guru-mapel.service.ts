import { prisma } from '@/utils/prisma';
import { RoleName } from '../../../../constants/enums';
import { isSystemSuperAdmin } from '../../../../utils/rbac';
import { findBestMatch } from '../../../../utils/normalization';

export interface CreateGuruMapelInput {
  guru_id: string;
  mapel_id: string;
  kelas_id?: string | null;
  jurusan_id?: string | null;
}

export interface GuruMapelResponse {
  id: string;
  tenant_id: string;
  guru_id: string;
  mapel_id: string;
  kelas_id?: string | null;
  jurusan_id?: string | null;
  created_at: Date;
  Guru?: {
    id: string;
    nama_guru: string;
  };
  Mapel?: {
    id: string;
    nama_mapel: string;
    kode_mapel?: string;
  };
  Kelas?: {
    id: string;
    nama_kelas: string;
  };
  Jurusan?: {
    id: string;
    nama: string;
  };
}

export class GuruMapelService {
  async listAssignments(
    requestingUserRole: RoleName,
    requestingUserTenantId: string | undefined,
    filters?: { guru_id?: string; mapel_id?: string; kelas_id?: string; jurusan_id?: string }
  ): Promise<GuruMapelResponse[]> {
    const whereClause: any = {};

    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    if (filters?.guru_id) whereClause.guru_id = filters.guru_id;
    if (filters?.mapel_id) whereClause.mapel_id = filters.mapel_id;
    if (filters?.kelas_id) whereClause.kelas_id = filters.kelas_id;
    if (filters?.jurusan_id) whereClause.jurusan_id = filters.jurusan_id;

    const data = await prisma.guruMapel.findMany({
      where: whereClause,
      include: {
        Guru: { select: { id: true, nama_guru: true, max_jp: true } },
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        Kelas: { select: { id: true, nama_kelas: true } },
        Jurusan: { select: { id: true, nama: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return data as unknown as GuruMapelResponse[];
  }

  async assignMapelToGuru(tenantId: string, input: CreateGuruMapelInput): Promise<GuruMapelResponse> {
    // Ensure Guru exists in tenant
    const guru = await prisma.guru.findFirst({
      where: { id: input.guru_id, tenant_id: tenantId },
    });
    if (!guru) {
      throw new Error('Guru not found or not in the same tenant');
    }

    // Ensure Mapel exists in tenant
    const mapel = await prisma.mapel.findFirst({
      where: { id: input.mapel_id, tenant_id: tenantId },
    });
    if (!mapel) {
      throw new Error('Mapel not found or not in the same tenant');
    }

    // Prevent duplicate assignment
    const existing = await prisma.guruMapel.findFirst({
      where: {
        tenant_id: tenantId,
        guru_id: input.guru_id,
        mapel_id: input.mapel_id,
        kelas_id: input.kelas_id || null,
        jurusan_id: input.jurusan_id || null
      },
    });
    if (existing) {
      throw new Error('Assignment already exists');
    }

    const created = await prisma.guruMapel.create({
      data: {
        tenant_id: tenantId,
        guru_id: input.guru_id,
        mapel_id: input.mapel_id,
        kelas_id: input.kelas_id || null,
        jurusan_id: input.jurusan_id || null
      },
      include: {
        Guru: { select: { id: true, nama_guru: true } },
        Mapel: { select: { id: true, nama_mapel: true } },
        Kelas: { select: { id: true, nama_kelas: true } },
        Jurusan: { select: { id: true, nama: true } },
      },
    });

    return created as unknown as GuruMapelResponse;
  }

  async removeAssignment(
    assignmentId: string,
    requestingUserRole: RoleName,
    requestingUserTenantId?: string
  ): Promise<void> {
    // Restrict deletion within tenant for non-system-superadmin
    const record = await prisma.guruMapel.findFirst({ where: { id: assignmentId } });
    if (!record) {
      throw new Error('Assignment not found');
    }

    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId) && record.tenant_id !== requestingUserTenantId) {
      throw new Error('Insufficient permissions');
    }

    await prisma.guruMapel.delete({ where: { id: assignmentId } });
  }

  async importFromExcel(data: any[], tenantId: string): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    // Pre-fetch all Guru and Mapel for this tenant
    const [gurus, mapels] = await Promise.all([
      prisma.guru.findMany({ where: { tenant_id: tenantId, jenis_ptk: 'PENDIDIK' }, select: { id: true, nama_guru: true } }),
      prisma.mapel.findMany({ where: { tenant_id: tenantId }, select: { id: true, nama_mapel: true, kode_mapel: true } })
    ]);

    const guruNames = gurus.map(g => g.nama_guru);
    const mapelNames = mapels.map(m => m.nama_mapel);
    const mapelKodes = mapels.map(m => m.kode_mapel).filter(Boolean) as string[];

    for (const [index, row] of data.entries()) {
      const rowNumber = row.__rowNum || (index + 2);
      try {
        const inputGuru = row.nama_guru || row.guru;
        const inputMapel = row.nama_mapel || row.mapel || row.kode_mapel;

        if (!inputGuru || !inputMapel) {
          throw new Error('Kolom Nama Guru dan Nama Mapel wajib diisi.');
        }

        // Smart Match Guru
        const guruMatch = findBestMatch(String(inputGuru), guruNames);
        if (!guruMatch.match) {
          throw new Error(`Guru '${inputGuru}' tidak ditemukan.`);
        }
        const guru = gurus.find(g => g.nama_guru === guruMatch.match);

        // Smart Match Mapel (Check Name first, then Code)
        let mapelMatch = findBestMatch(String(inputMapel), mapelNames);
        if (!mapelMatch.match) {
          // Try matching by Code
          mapelMatch = findBestMatch(String(inputMapel), mapelKodes);
        }

        if (!mapelMatch.match) {
          throw new Error(`Mata Pelajaran '${inputMapel}' tidak ditemukan.`);
        }
        
        const mapel = mapels.find(m => m.nama_mapel === mapelMatch.match || m.kode_mapel === mapelMatch.match);

        if (!guru || !mapel) throw new Error('Data referensi tidak valid.');

        // Assign
        await this.assignMapelToGuru(tenantId, {
          guru_id: guru.id,
          mapel_id: mapel.id
        });

        success++;
      } catch (error: any) {
        failed++;
        errors.push({
          row: rowNumber,
          error: error.message
        });
      }
    }

    return { success, failed, errors };
  }
}

export const guruMapelService = new GuruMapelService();
