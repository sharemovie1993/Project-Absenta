import { randomUUID } from 'crypto';
import { prisma } from '@/utils/prisma';
import { organizationalContextCache } from '@/modules/auth/services/organizational-context-cache';



export interface WaliKelasStrukturAssignmentResponse {
  id: string;
  tenant_id: string;
  guru_id: string;
  struktur_organisasi_id: string;
  is_active: boolean;
  start_date: Date | null;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
  Guru?: { id: string; nama_guru: string; nip?: string | null };
  StrukturOrganisasi?: {
    id: string;
    kode: string;
    kelas_id?: string | null;
    Kelas?: { id: string; nama_kelas: string; tingkat: number };
  };
}

export interface AssignWaliKelasStrukturInput {
  kelas_id: string;
  guru_id: string;
}

export interface PaginatedWaliKelasStrukturAssignmentResponse {
  data: WaliKelasStrukturAssignmentResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WaliKelasItem {
  id: string;
  kelasNama: string;
  tingkat: number;
  guruNama: string;
  noHp?: string | null;
}

export interface DaftarWaliKelasResult {
  tenantId: string;
  items: WaliKelasItem[];
  totalCount: number;
}

export class WaliKelasService {
  /**
   * SHARED DOMAIN SERVICE METHOD:
   * Mengambil daftar penugasan Wali Kelas aktif di sekolah/tenant.
   * Dipakai bersama oleh Web API Controller & WA Chatbot Handler.
   */
  async getDaftarWaliKelasActive(tenantId: string): Promise<DaftarWaliKelasResult> {
    let waliAssignments: any[] = [];
    try {
      waliAssignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          is_active: true,
          kelas_id: { not: null },
          Position: { code: 'WALIKELAS' },
        },
        include: {
          Kelas: { select: { nama_kelas: true, tingkat: true } },
          User: { include: { Guru: { select: { nama_guru: true, no_hp: true } } } },
        },
        take: 100,
      });
    } catch {
      try {
        waliAssignments = await prisma.organizationalAssignment.findMany({
          where: {
            tenant_id: tenantId,
            is_active: true,
            kelas_id: { not: null },
            Position: { OR: [{ code: 'WALIKELAS' }, { name: { contains: 'Wali', mode: 'insensitive' } }] },
          },
          include: {
            Kelas: { select: { nama_kelas: true, tingkat: true } },
            User: { include: { Guru: { select: { nama_guru: true, no_hp: true } } } },
          },
          take: 100,
        });
      } catch {
        waliAssignments = [];
      }
    }

    // Sort berdasarkan nama kelas (tingkat lalu nama)
    waliAssignments.sort((a: any, b: any) => {
      const ka = `${a.Kelas?.tingkat || 0}-${a.Kelas?.nama_kelas || ''}`;
      const kb = `${b.Kelas?.tingkat || 0}-${b.Kelas?.nama_kelas || ''}`;
      return ka.localeCompare(kb);
    });

    const items: WaliKelasItem[] = waliAssignments.map((w: any) => ({
      id: w.id,
      kelasNama: w.Kelas?.nama_kelas || '-',
      tingkat: w.Kelas?.tingkat || 0,
      guruNama: w.User?.Guru?.nama_guru || w.User?.name || 'Belum ditentukan',
      noHp: w.User?.Guru?.no_hp || null,
    }));

    return {
      tenantId,
      items,
      totalCount: items.length,
    };
  }

  async resolveGuruIdForStrukturAssignments(tenantId: string, org: any, user: any, guruId?: string) {
    let resolvedGuruId = guruId;
    const roleName = user?.roleName || user?.Role?.name;
    
    // If not admin and is Guru, force their own Guru ID
    if (!resolvedGuruId && roleName === 'GURU' && user?.id) {
      const guru = await prisma.guru.findFirst({
        where: { tenant_id: tenantId, user_id: user.id },
        select: { id: true },
      });
      if (guru?.id) {
        const isTenantWide = org?.tenant_wide === true;
        if (!isTenantWide) {
          resolvedGuruId = guru.id;
        }
      }
    }
    return resolvedGuruId;
  }



  async getStrukturAssignments(
    tenantId: string,
    _org: any,
    params?: {
      page: number;
      limit: number;
      search?: string;
      guru_id?: string;
      kelas_id?: string;
      include_inactive?: boolean;
    }
  ): Promise<PaginatedWaliKelasStrukturAssignmentResponse> {

    const position = await prisma.organizationalPosition.findFirst({
      where: { tenant_id: tenantId, code: 'WALIKELAS' },
      select: { id: true },
    });
    if (!position?.id) {
      return {
        data: [],
        pagination: { page: params?.page || 1, limit: params?.limit || 10, total: 0, totalPages: 0 },
      };
    }

    const whereClause: any = {
      tenant_id: tenantId,
      position_id: position.id,
    };

    if (!params?.include_inactive) whereClause.is_active = true;
    if (params?.kelas_id) whereClause.kelas_id = params.kelas_id;

    if (params?.guru_id) {
      const guru = await prisma.guru.findFirst({
        where: { id: params.guru_id, tenant_id: tenantId },
        select: { user_id: true },
      });
      if (!guru?.user_id) {
        return {
          data: [],
          pagination: { page: params?.page || 1, limit: params?.limit || 10, total: 0, totalPages: 0 },
        };
      }
      whereClause.user_id = guru.user_id;
    }

    if (params?.search) {
      whereClause.OR = [
        { User: { Guru: { nama_guru: { contains: params.search, mode: 'insensitive' } } } },
        { User: { Guru: { nip: { contains: params.search, mode: 'insensitive' } } } },
        { Kelas: { nama_kelas: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const skip = (page - 1) * limit;

    const total = await prisma.organizationalAssignment.count({ where: whereClause });

    const data = await prisma.organizationalAssignment.findMany({
      where: whereClause,
      include: {
        User: { select: { id: true, Guru: { select: { id: true, nama_guru: true, nip: true } } } },
        Position: {
          select: {
            id: true,
            code: true,
          },
        },
        Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
      },
      orderBy: [{ created_at: 'desc' }],
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((a: any) => ({
        id: a.id,
        tenant_id: a.tenant_id,
        guru_id: String(a.User?.Guru?.id || ''),
        struktur_organisasi_id: a.position_id,
        is_active: Boolean(a.is_active),
        start_date: a.start_date,
        end_date: a.end_date,
        created_at: a.created_at,
        updated_at: a.updated_at,
        Guru: a.User?.Guru ? { id: a.User.Guru.id, nama_guru: a.User.Guru.nama_guru, nip: a.User.Guru.nip } : undefined,
        StrukturOrganisasi: {
          id: a.position_id,
          kode: String(a.Position?.code || 'WALIKELAS'),
          kelas_id: a.kelas_id,
          Kelas: a.Kelas ? { id: a.Kelas.id, nama_kelas: a.Kelas.nama_kelas, tingkat: a.Kelas.tingkat } : undefined,
        },
      })) as unknown as WaliKelasStrukturAssignmentResponse[],
      pagination: { page, limit, total, totalPages },
    };
  }

  async assignStrukturWaliKelas(
    tenantId: string,
    input: AssignWaliKelasStrukturInput
  ): Promise<WaliKelasStrukturAssignmentResponse> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const kelas = await prisma.kelas.findFirst({
      where: { id: input.kelas_id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!kelas) {
      throw new Error('Kelas not found');
    }

    const guru = await prisma.guru.findFirst({
      where: { id: input.guru_id, tenant_id: tenantId },
      select: { id: true, user_id: true },
    });
    if (!guru?.user_id) {
      throw new Error('Guru not found');
    }

    const position = await prisma.organizationalPosition.upsert({
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

    const existingWaliKelasStruktur = await prisma.organizationalAssignment.findFirst({
      where: {
        tenant_id: tenantId,
        is_active: true,
        position_id: position.id,
        user_id: guru.user_id,
        kelas_id: { not: input.kelas_id },
      },
      select: { id: true },
    });
    if (existingWaliKelasStruktur) {
      throw new Error('Guru is already assigned as wali kelas to another kelas');
    }

    if (guru.user_id) {
      await organizationalContextCache.invalidateUser(String(guru.user_id));
    }

    const assignment = await prisma.$transaction(async (tx) => {
      await tx.organizationalAssignment.updateMany({
        where: { tenant_id: tenantId, position_id: position.id, kelas_id: input.kelas_id, is_active: true },
        data: { is_active: false, end_date: new Date(), updated_at: new Date() },
      });

      const existing = await tx.organizationalAssignment.findFirst({
        where: { tenant_id: tenantId, user_id: guru.user_id, position_id: position.id, kelas_id: input.kelas_id },
        select: { id: true },
      });

      if (existing) {
        return tx.organizationalAssignment.update({
          where: { id: existing.id },
          data: { is_active: true, start_date: new Date(), end_date: null, updated_at: new Date() },
        });
      }

      return tx.organizationalAssignment.create({
        data: {
          id: randomUUID(),
          tenant_id: tenantId,
          position_id: position.id,
          user_id: guru.user_id,
          kelas_id: input.kelas_id,
          unit_id: null,
          start_date: new Date(),
          end_date: null,
          is_active: true,
          updated_at: new Date(),
        },
      });
    });

    // We must ensure the Wali Kelas has the required basic capabilities.
    const capabilitiesToInject = [
      'attendance.reports.view',
      'attendance.manage.session',
      'academic.students.view.list',
      'academic.view.kelas',
      'academic.manage.kelas'
    ];
    
    // Convert to the DB IDs assuming capabilities exactly match Permission IDs in schema.
    for (const capId of capabilitiesToInject) {
      await prisma.organizationalCapability.upsert({
        where: { position_id_permission_id: { position_id: position.id, permission_id: capId } },
        create: {
          position_id: position.id,
          permission_id: capId
        },
        update: {}
      });
    }

    const full = await prisma.organizationalAssignment.findFirst({
      where: { id: assignment.id, tenant_id: tenantId, position_id: position.id },
      include: {
        User: { select: { Guru: { select: { id: true, nama_guru: true, nip: true } } } },
        Position: { select: { code: true } },
        Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
      },
    });

    if (!full) throw new Error('Assignment not found');

    return {
      id: full.id,
      tenant_id: full.tenant_id,
      guru_id: String(full.User?.Guru?.id || ''),
      struktur_organisasi_id: full.position_id,
      is_active: Boolean(full.is_active),
      start_date: full.start_date,
      end_date: full.end_date,
      created_at: full.created_at,
      updated_at: full.updated_at,
      Guru: full.User?.Guru
        ? { id: full.User.Guru.id, nama_guru: full.User.Guru.nama_guru, nip: full.User.Guru.nip }
        : undefined,
      StrukturOrganisasi: {
        id: full.position_id,
        kode: String(full.Position?.code || 'WALIKELAS'),
        kelas_id: full.kelas_id,
        Kelas: full.Kelas ? { id: full.Kelas.id, nama_kelas: full.Kelas.nama_kelas, tingkat: full.Kelas.tingkat } : undefined,
      },
    };
  }

  async nonaktifStrukturAssignment(tenantId: string, id: string): Promise<void> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const position = await prisma.organizationalPosition.findFirst({
      where: { tenant_id: tenantId, code: 'WALIKELAS' },
      select: { id: true },
    });
    if (!position?.id) throw new Error('Assignment not found');

    const existing = await prisma.organizationalAssignment.findFirst({
      where: { id, tenant_id: tenantId, position_id: position.id },
      select: { id: true, user_id: true },
    });
    if (!existing) {
      throw new Error('Assignment not found');
    }

    await prisma.organizationalAssignment.update({
      where: { id },
      data: { is_active: false, end_date: new Date(), updated_at: new Date() },
    });

    if (existing.user_id) {
      await organizationalContextCache.invalidateUser(String(existing.user_id));
    }
  }

  async getBySiswa(
    tenantId: string,
    siswaId: string,
    _tahunPelajaranId?: string
  ): Promise<any | null> {
    const siswa = await prisma.siswa.findFirst({ where: { id: siswaId } });
    if (!siswa || (tenantId && siswa.tenant_id !== tenantId)) {
      return null;
    }

    let kelasId = siswa.kelas_id;
    if (!kelasId) return null;

    const position = await prisma.organizationalPosition.findFirst({
      where: { tenant_id: siswa.tenant_id, code: 'WALIKELAS' }
    });
    if (!position) return null;

    const wk = await prisma.organizationalAssignment.findFirst({
      where: { 
        kelas_id: kelasId, 
        tenant_id: siswa.tenant_id,
        position_id: position.id,
        is_active: true
      },
      include: {
        User: { select: { Guru: { select: { id: true, nama_guru: true } } } },
        Kelas: { select: { id: true, nama_kelas: true } }
      }
    });

    if (!wk) return null;

    return {
       id: wk.id,
       Guru: wk.User?.Guru,
       Kelas: wk.Kelas
    };
  }

  // ── SK Wali Kelas Arsip ──────────────────────────────────────────────────

  async saveSkArsip(tenantId: string, userId: string, data: {
    guru_id: string;
    nama_guru: string;
    nama_kelas: string;
    tahun_pelajaran: string;
    nomor_sk?: string;
    tanggal_sk?: string;
    halaman_html: any;
  }) {
    return await prisma.sKWaliKelasArsip.create({
      data: {
        tenant_id: tenantId,
        guru_id: data.guru_id,
        nama_guru: data.nama_guru,
        nama_kelas: data.nama_kelas,
        tahun_pelajaran: data.tahun_pelajaran,
        nomor_sk: data.nomor_sk || null,
        tanggal_sk: data.tanggal_sk || null,
        halaman_html: data.halaman_html,
        dicetak_oleh: userId,
      },
    });
  }

  async getSkArsipList(tenantId: string, filters?: { tahun_pelajaran?: string; guru_id?: string; search?: string }) {
    const where: any = { tenant_id: tenantId };
    if (filters?.tahun_pelajaran) where.tahun_pelajaran = filters.tahun_pelajaran;
    if (filters?.guru_id) where.guru_id = filters.guru_id;
    if (filters?.search) {
      where.OR = [
        { nama_guru: { contains: filters.search, mode: 'insensitive' } },
        { nama_kelas: { contains: filters.search, mode: 'insensitive' } },
        { nomor_sk: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return await prisma.sKWaliKelasArsip.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        tenant_id: true,
        guru_id: true,
        nama_guru: true,
        nama_kelas: true,
        tahun_pelajaran: true,
        nomor_sk: true,
        tanggal_sk: true,
        dicetak_oleh: true,
        created_at: true,
      },
    });
  }

  async getSkArsipById(tenantId: string, id: string) {
    return await prisma.sKWaliKelasArsip.findFirst({
      where: { id, tenant_id: tenantId },
    });
  }

  async deleteSkArsip(tenantId: string, id: string) {
    return await prisma.sKWaliKelasArsip.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }
}

export const waliKelasService = new WaliKelasService();

