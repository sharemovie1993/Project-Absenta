import { PrismaClient } from '@prisma/client';
import { DataScope, UserPayload } from '../../../types/fastify';
import { seedDefaultJenisKegiatanForTenant } from '../../academic/jenis-kegiatan-master/services/jenis-kegiatan-master.service';
import { seedDefaultJenisPelanggaranForTenant } from '../../kesiswaan/services/jenis-pelanggaran.service';
import { auditLogService } from '../../audit/services/audit-log.service';
import { strukturOrganisasiService } from '../../academic/struktur-organisasi/services/struktur-organisasi.service';
import { tenantEntitlementService } from '../../billing/services/tenant-entitlement.service';
import { ensureTenantBaseRoles } from '../../../database/seeds/seed_policies';

const prisma = new PrismaClient();

// Removed hardcoded DEFAULT_STRUKTUR_ORGANISASI in favor of shared config


export interface CreateTenantInput {
  name: string;
  absensi_mode?: 'SIMPLE' | 'MULTI_SESI';
}

export interface UpdateTenantInput {
  name?: string;
  absensi_mode?: 'SIMPLE' | 'MULTI_SESI';
  subdomain?: string;
  domain?: string;
  custom_domain?: string;
  logo_url?: string;
  status?: string;
  jam_masuk_default?: string;
  jam_pulang_default?: string;
  toleransi_keterlambatan_menit?: number;
  print_header_lines?: string[];
  logo_daerah_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  kepala_sekolah?: string;
  nip_kepala?: string;
  allow_manual_hadir_gate?: boolean;
  jenjang?: string | null;
  kurikulum?: string | null;
  durasi_smk?: string | null;
  kepala_sekolah_guru_id?: string | null;
  shift_jam_pelajaran?: any;
}

export interface TenantResponse {
  id: string;
  name: string;
  absensi_mode: 'SIMPLE' | 'MULTI_SESI';
  domain: string | null; // Mapped from subdomain for backward-compatibility
  subdomain: string | null;
  custom_domain: string | null;
  logo_url: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  total_users: number;
  jam_masuk_default?: string;
  jam_pulang_default?: string;
  toleransi_keterlambatan_menit?: number;
  deletion_requested_at?: Date | null;
}

export interface GetTenantsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedTenantsResponse {
  data: TenantResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class TenantService {
  async getAllTenants(
    scope: DataScope,
    params?: GetTenantsParams
  ): Promise<PaginatedTenantsResponse> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const search = params?.search;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    // Scope Enforcement
    if (scope.tenantId) {
      whereClause.id = scope.tenantId;
    }

    // Search Filter
    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: 'insensitive' } },
        { subdomain: { contains: search, mode: 'insensitive' } },
        { custom_domain: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } }
      ];

      if (whereClause.OR) {
        whereClause.AND = [
          { OR: whereClause.OR },
          { OR: searchConditions }
        ];
        delete whereClause.OR;
      } else {
        whereClause.OR = searchConditions;
      }
    }

    const [total, tenants] = await Promise.all([
      prisma.tenant.count({ where: whereClause }),
      prisma.tenant.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              users: true
            }
          }
        }
      })
    ]);

    const tenantsWithUserCount = tenants.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      absensi_mode: tenant.absensi_mode,
      domain: tenant.subdomain, // Backward compatibility
      subdomain: tenant.subdomain,
      custom_domain: tenant.custom_domain,
      logo_url: tenant.logo_url,
      status: tenant.status,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
      total_users: tenant._count.users,
      jam_masuk_default: tenant.jam_masuk_default,
      jam_pulang_default: tenant.jam_pulang_default,
      toleransi_keterlambatan_menit: tenant.toleransi_keterlambatan_menit,
      deletion_requested_at: tenant.deletion_requested_at,
    }));

    return {
      data: tenantsWithUserCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getTenantById(scope: DataScope, id: string): Promise<TenantResponse> {
    // Scope Check
    if (scope.tenantId && scope.tenantId !== id) {
      throw new Error('Forbidden');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Query print configs from Config table!
    const configs = await prisma.config.findMany({
      where: {
        tenant_id: id,
        key: {
          in: ['print_header_lines', 'logo_daerah_url', 'address', 'phone', 'email', 'website', 'ALLOW_MANUAL_HADIR_GATE', 'shift_jam_pelajaran']
        }
      }
    });

    const configMap = configs.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    let parsedLines: string[] = [];
    if (configMap['print_header_lines']) {
      try {
        parsedLines = JSON.parse(configMap['print_header_lines']);
      } catch (e) {
        parsedLines = [];
      }
    }

    let parsedShift: any = null;
    if (configMap['shift_jam_pelajaran']) {
      try {
        parsedShift = JSON.parse(configMap['shift_jam_pelajaran']);
      } catch (e) {
        parsedShift = null;
      }
    }

    // 1. Prioritas Utama: Cari dari Struktur Organisasi (Jabatan KEPALA_SEKOLAH)
    let kepalaSekolahNama = null;
    let kepalaSekolahNip = null;
    let kepalaSekolahGuruId = null;
    try {
      const activeKepsekAssignment = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: id,
          is_active: true,
          Position: {
            code: 'KEPALA_SEKOLAH'
          }
        },
        include: {
          User: {
            include: {
              Guru: true
            }
          }
        }
      }) as any;

      if (activeKepsekAssignment?.User?.Guru) {
        kepalaSekolahNama = activeKepsekAssignment.User.Guru.nama_guru;
        kepalaSekolahNip = activeKepsekAssignment.User.Guru.nip || '-';
        kepalaSekolahGuruId = activeKepsekAssignment.User.Guru.id || null;
      }
    } catch (e) {
      // safe fallback if position table is not fully initialized
    }

    // 2. Prioritas Kedua (Fallback): Cari dari data profile Sekolah
    let sekolahKota = null;
    let sekolahJenjang = null;
    let sekolahKurikulum = null;
    let sekolahDurasiSmk = null;
    try {
      const sekolah = await prisma.sekolah.findFirst({
        where: { tenant_id: id }
      });
      if (sekolah) {
        sekolahKota = sekolah.kota;
        sekolahJenjang = sekolah.jenjang;
        sekolahKurikulum = sekolah.kurikulum;
        sekolahDurasiSmk = sekolah.durasi_smk;
      }

      // Smart Fallback jika data jenjang di profil sekolah masih kosong/null
      if (!sekolahJenjang || sekolahJenjang === 'null') {
        const isSmkSubdomain = tenant.subdomain?.toLowerCase().includes('smk');
        const isSmkName = tenant.name?.toLowerCase().includes('smk');
        sekolahJenjang = (isSmkSubdomain || isSmkName) ? 'SMK' : null;
      }
    } catch (e) {
      // safe fallback
    }

    const has4TahunJurusan = await prisma.jurusan.findFirst({
      where: { tenant_id: id, durasi_jurusan: '4_TAHUN' }
    });

    const resolvedFeatures = await tenantEntitlementService.resolveTenantFeatures(id);

    return {
      id: tenant.id,
      name: tenant.name,
      absensi_mode: tenant.absensi_mode,
      domain: tenant.subdomain, // Backward compatibility
      subdomain: tenant.subdomain,
      custom_domain: tenant.custom_domain,
      logo_url: tenant.logo_url,
      status: tenant.status,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
      total_users: tenant._count.users,
      jam_masuk_default: tenant.jam_masuk_default,
      jam_pulang_default: tenant.jam_pulang_default,
      toleransi_keterlambatan_menit: tenant.toleransi_keterlambatan_menit,
      hari_sekolah: tenant.hari_sekolah,
      deletion_requested_at: tenant.deletion_requested_at,
      durasi_smk: sekolahDurasiSmk || tenant.durasi_smk || '3_TAHUN',
      has_4_tahun_jurusan: !!has4TahunJurusan,
      
      // Inject these custom configs!
      logo_daerah_url: configMap['logo_daerah_url'] || null,
      address: configMap['address'] || null,
      phone: configMap['phone'] || null,
      email: configMap['email'] || null,
      website: configMap['website'] || null,
      print_header_lines: parsedLines,
      allow_manual_hadir_gate: configMap['ALLOW_MANUAL_HADIR_GATE'] === 'true',
      shift_jam_pelajaran: parsedShift,

      // Hybrid Kepala Sekolah values
      kepala_sekolah: kepalaSekolahNama || null,
      nip_kepala: kepalaSekolahNip || null,
      kepala_sekolah_guru_id: kepalaSekolahGuruId || null,
      kota: sekolahKota || null,
      jenjang: sekolahJenjang || null,
      kurikulum: sekolahKurikulum || 'MERDEKA',
      features: resolvedFeatures || [],
    } as any;
  }

  async createTenant(input: CreateTenantInput): Promise<TenantResponse> {
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        name: input.name,
      },
    });

    if (existingTenant) {
      throw new Error('Tenant name already exists');
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: input.name,
        absensi_mode: input.absensi_mode || 'MULTI_SESI',
      },
    });

    await strukturOrganisasiService.initializeTenant(tenant.id);

    await ensureTenantBaseRoles(tenant.id);
    await seedDefaultJenisKegiatanForTenant(tenant.id);
    await seedDefaultJenisPelanggaranForTenant(tenant.id);

    return {
      id: tenant.id,
      name: tenant.name,
      absensi_mode: tenant.absensi_mode,
      domain: tenant.subdomain, // Backward compatibility
      subdomain: tenant.subdomain,
      custom_domain: tenant.custom_domain,
      logo_url: tenant.logo_url,
      status: tenant.status,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
      total_users: 0,
      jam_masuk_default: tenant.jam_masuk_default,
      jam_pulang_default: tenant.jam_pulang_default,
      toleransi_keterlambatan_menit: tenant.toleransi_keterlambatan_menit,
      deletion_requested_at: tenant.deletion_requested_at,
    };
  }

  async updateTenant(
    scope: DataScope,
    tenantId: string,
    input: UpdateTenantInput
  ): Promise<TenantResponse> {
    // Scope Check
    if (scope.tenantId && scope.tenantId !== tenantId) {
      throw new Error('Forbidden');
    }

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
    });

    if (!existingTenant) {
      throw new Error('Tenant not found');
    }

    // Check name uniqueness if changing name
    if (input.name && input.name !== existingTenant.name) {
      const nameExists = await prisma.tenant.findFirst({
        where: {
          name: input.name,
          id: { not: tenantId }
        }
      });
      if (nameExists) {
        throw new Error('Tenant name already exists');
      }
    }

    // Extract print settings and legacy fields
    const {
      domain,
      print_header_lines,
      logo_daerah_url,
      address,
      phone,
      email,
      website,
      kepala_sekolah,
      nip_kepala,
      allow_manual_hadir_gate,
      jenjang,
      kurikulum,
      durasi_smk,
      kepala_sekolah_guru_id,
      shift_jam_pelajaran,
      ...coreInput
    } = input;

    if (domain && !coreInput.subdomain) {
      (coreInput as any).subdomain = domain;
    }

    // Helper to upsert settings into general Config table
    const upsertConfig = async (key: string, value: string) => {
      const existing = await prisma.config.findFirst({
        where: { tenant_id: tenantId, key }
      });
      if (existing) {
        await prisma.config.update({
          where: { id: existing.id },
          data: { value }
        });
      } else {
        await prisma.config.create({
          data: { tenant_id: tenantId, key, value }
        });
      }
    };

    if (print_header_lines !== undefined) {
      await upsertConfig('print_header_lines', JSON.stringify(print_header_lines));
    }
    if (logo_daerah_url !== undefined) {
      await upsertConfig('logo_daerah_url', logo_daerah_url || '');
    }
    if (address !== undefined) {
      await upsertConfig('address', address || '');
    }
    if (phone !== undefined) {
      await upsertConfig('phone', phone || '');
    }
    if (email !== undefined) {
      await upsertConfig('email', email || '');
    }
    if (website !== undefined) {
      await upsertConfig('website', website || '');
    }
    if (allow_manual_hadir_gate !== undefined) {
      await upsertConfig('ALLOW_MANUAL_HADIR_GATE', allow_manual_hadir_gate ? 'true' : 'false');
    }
    if (shift_jam_pelajaran !== undefined) {
      await upsertConfig('shift_jam_pelajaran', JSON.stringify(shift_jam_pelajaran));
      await syncJadwalKBMTimes(tenantId, prisma);
    }

    // Save kepala_sekolah, nip_kepala, jenjang, kurikulum & durasi_smk in Sekolah table
    if (kepala_sekolah !== undefined || nip_kepala !== undefined || jenjang !== undefined || kurikulum !== undefined || durasi_smk !== undefined) {
      const sekolah = await prisma.sekolah.findFirst({
        where: { tenant_id: tenantId }
      });
      if (sekolah) {
        await prisma.sekolah.update({
          where: { id: sekolah.id },
          data: {
            kepala_sekolah: kepala_sekolah !== undefined ? kepala_sekolah : undefined,
            nip_kepala: nip_kepala !== undefined ? nip_kepala : undefined,
            jenjang: jenjang !== undefined ? jenjang : undefined,
            kurikulum: kurikulum !== undefined ? kurikulum : undefined,
            durasi_smk: durasi_smk !== undefined ? durasi_smk : undefined
          }
        });
      } else {
        await prisma.sekolah.create({
          data: {
            tenant_id: tenantId,
            nama: existingTenant.name,
            kepala_sekolah: kepala_sekolah || '',
            nip_kepala: nip_kepala || '',
            jenjang: jenjang || null,
            kurikulum: kurikulum || 'MERDEKA',
            durasi_smk: durasi_smk || '3_TAHUN'
          }
        });
      }
    }

    // Sync Kepala Sekolah to Struktur Organisasi & Sekolah table dynamically
    if (kepala_sekolah_guru_id !== undefined) {
      if (kepala_sekolah_guru_id) {
        const guru = await prisma.guru.findUnique({
          where: { id: kepala_sekolah_guru_id }
        });
        if (guru && guru.user_id) {
          // 1. Dapatkan atau buat posisi KEPALA_SEKOLAH
          let position = await prisma.organizationalPosition.findFirst({
            where: { tenant_id: tenantId, code: 'KEPALA_SEKOLAH' }
          });
          if (!position) {
            position = await prisma.organizationalPosition.create({
              data: {
                tenant_id: tenantId,
                name: 'Kepala Sekolah',
                code: 'KEPALA_SEKOLAH',
                scope_type: 'global',
                order: 5
              }
            });
          }

          // 2. Nonaktifkan penugasan Kepala Sekolah lama
          await prisma.organizationalAssignment.updateMany({
            where: {
              tenant_id: tenantId,
              position_id: position.id,
              is_active: true
            },
            data: { is_active: false }
          });

          // 3. Buat penugasan Kepala Sekolah baru
          await prisma.organizationalAssignment.create({
            data: {
              tenant_id: tenantId,
              position_id: position.id,
              user_id: guru.user_id,
              is_active: true
            }
          });

          // 4. Update data di table Sekolah agar sinkron
          const sekolah = await prisma.sekolah.findFirst({
            where: { tenant_id: tenantId }
          });
          if (sekolah) {
            await prisma.sekolah.update({
              where: { id: sekolah.id },
              data: {
                kepala_sekolah: guru.nama_guru,
                nip_kepala: guru.nip || '-'
              }
            });
          } else {
            await prisma.sekolah.create({
              data: {
                tenant_id: tenantId,
                nama: existingTenant.name,
                kepala_sekolah: guru.nama_guru,
                nip_kepala: guru.nip || '-'
              }
            });
          }
        }
      } else {
        // Jika diset ke kosong/null, nonaktifkan assignment kepsek aktif
        const position = await prisma.organizationalPosition.findFirst({
          where: { tenant_id: tenantId, code: 'KEPALA_SEKOLAH' }
        });
        if (position) {
          await prisma.organizationalAssignment.updateMany({
            where: {
              tenant_id: tenantId,
              position_id: position.id,
              is_active: true
            },
            data: { is_active: false }
          });
        }
        const sekolah = await prisma.sekolah.findFirst({
          where: { tenant_id: tenantId }
        });
        if (sekolah) {
          await prisma.sekolah.update({
            where: { id: sekolah.id },
            data: {
              kepala_sekolah: null,
              nip_kepala: null
            }
          });
        }
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: coreInput,
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    // Query configs to return freshly updated values
    const configs = await prisma.config.findMany({
      where: {
        tenant_id: tenantId,
        key: {
          in: ['print_header_lines', 'logo_daerah_url', 'address', 'phone', 'email', 'website', 'shift_jam_pelajaran']
        }
      }
    });

    const configMap = configs.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    let parsedLines: string[] = [];
    if (configMap['print_header_lines']) {
      try {
        parsedLines = JSON.parse(configMap['print_header_lines']);
      } catch (e) {
        parsedLines = [];
      }
    }

    let parsedShift: any = null;
    if (configMap['shift_jam_pelajaran']) {
      try {
        parsedShift = JSON.parse(configMap['shift_jam_pelajaran']);
      } catch (e) {
        parsedShift = null;
      }
    }

    // Resolve current hybrid kepala sekolah
    let currentKepsekNama = kepala_sekolah || null;
    let currentKepsekNip = nip_kepala || null;

    if (!currentKepsekNama) {
      try {
        const activeKepsekAssignment = await prisma.organizationalAssignment.findFirst({
          where: {
            tenant_id: tenantId,
            is_active: true,
            Position: {
              code: 'KEPALA_SEKOLAH'
            }
          },
          include: {
            User: {
              include: {
                Guru: true
              }
            }
          }
        }) as any;

        if (activeKepsekAssignment?.User?.Guru) {
          currentKepsekNama = activeKepsekAssignment.User.Guru.nama_guru;
          currentKepsekNip = activeKepsekAssignment.User.Guru.nip || '-';
        }
      } catch (e) {
        // safe ignore
      }
    }

    if (!currentKepsekNama) {
      try {
        const sekolah = await prisma.sekolah.findFirst({
          where: { tenant_id: tenantId }
        });
        if (sekolah) {
          currentKepsekNama = sekolah.kepala_sekolah;
          currentKepsekNip = sekolah.nip_kepala;
        }
      } catch (e) {
        // safe ignore
      }
    }

    return {
      id: tenant.id,
      name: tenant.name,
      absensi_mode: tenant.absensi_mode,
      domain: tenant.subdomain, // Backward compatibility
      subdomain: tenant.subdomain,
      custom_domain: tenant.custom_domain,
      logo_url: tenant.logo_url,
      status: tenant.status,
      created_at: tenant.created_at,
      updated_at: tenant.updated_at,
      total_users: tenant._count.users,
      jam_masuk_default: tenant.jam_masuk_default,
      jam_pulang_default: tenant.jam_pulang_default,
      toleransi_keterlambatan_menit: tenant.toleransi_keterlambatan_menit,
      deletion_requested_at: tenant.deletion_requested_at,
      
      // Inject these custom configs!
      logo_daerah_url: configMap['logo_daerah_url'] || null,
      address: configMap['address'] || null,
      phone: configMap['phone'] || null,
      email: configMap['email'] || null,
      website: configMap['website'] || null,
      print_header_lines: parsedLines,
      shift_jam_pelajaran: parsedShift,

      // Hybrid Kepala Sekolah values
      kepala_sekolah: currentKepsekNama || null,
      nip_kepala: currentKepsekNip || null,
    } as any;
  }

  async deleteTenant(id: string, currentUser: UserPayload, confirmationName: string, force: boolean = false): Promise<void> {
    if (currentUser.roleName !== 'SUPERADMIN' && currentUser.tenantId !== 'system') {
      throw new Error('Forbidden');
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new Error('Tenant not found');
    }

    if (existingTenant.name !== confirmationName) {
      throw new Error('Invalid confirmation');
    }

    if (existingTenant.status === 'ACTIVE' && !force) {
      throw new Error('Cannot delete active tenant without force flag');
    }

    auditLogService.logEvent({
      event_type: 'TENANT_DELETED_MANUAL',
      severity: 'CRITICAL',
      entity_type: 'TENANT',
      entity_id: id,
      tenant_id: id,
      user_id: currentUser.id,
      correlation_id: null,
      metadata: {
        tenant_name: existingTenant.name,
        status: existingTenant.status,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.tenant.delete({
        where: { id },
      });
    });
  }

  async requestDeletion(tenantId: string, currentUser: UserPayload): Promise<TenantResponse> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    if (currentUser.roleName === 'SUPERADMIN' || currentUser.tenantId === 'system') {
      // SUPERADMIN or Platform Staff can delete any tenant
    } else if (currentUser.roleName === 'ADMIN') {
      // ADMIN can only delete their own tenant
      if (currentUser.tenantId !== tenantId) {
        throw new Error('Forbidden');
      }
    } else {
      // USER and other roles cannot delete tenants
      throw new Error('Forbidden');
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'PENDING_DELETION',
        deletion_requested_at: new Date()
      },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return {
      id: updated.id,
      name: updated.name,
      absensi_mode: updated.absensi_mode,
      domain: updated.subdomain, // Backward compatibility
      subdomain: updated.subdomain,
      custom_domain: updated.custom_domain,
      logo_url: updated.logo_url,
      status: updated.status,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      total_users: updated._count.users,
      jam_masuk_default: updated.jam_masuk_default,
      jam_pulang_default: updated.jam_pulang_default,
      toleransi_keterlambatan_menit: updated.toleransi_keterlambatan_menit,
      deletion_requested_at: updated.deletion_requested_at,
    };
  }

  async cancelDeletion(tenantId: string, currentUser: UserPayload): Promise<TenantResponse> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('Tenant not found');

    if (currentUser.roleName === 'SUPERADMIN' || currentUser.tenantId === 'system') {
      // SUPERADMIN or Platform Staff can cancel deletion for any tenant
    } else if (currentUser.roleName === 'ADMIN') {
      // ADMIN can only cancel deletion for their own tenant
      if (currentUser.tenantId !== tenantId) {
        throw new Error('Forbidden');
      }
    } else {
      // USER and other roles cannot cancel deletion
      throw new Error('Forbidden');
    }

    if (tenant.status !== 'PENDING_DELETION') {
      throw new Error('Tenant is not pending deletion');
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'ACTIVE',
        deletion_requested_at: null
      },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return {
      id: updated.id,
      name: updated.name,
      absensi_mode: updated.absensi_mode,
      domain: updated.subdomain, // Backward compatibility
      subdomain: updated.subdomain,
      custom_domain: updated.custom_domain,
      logo_url: updated.logo_url,
      status: updated.status,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      total_users: updated._count.users,
      jam_masuk_default: updated.jam_masuk_default,
      jam_pulang_default: updated.jam_pulang_default,
      toleransi_keterlambatan_menit: updated.toleransi_keterlambatan_menit,
      deletion_requested_at: updated.deletion_requested_at,
    };
  }
}

export const tenantService = new TenantService();

export async function syncJadwalKBMTimes(tenantId: string, tx: any) {
  const config = await tx.config.findFirst({
    where: { tenant_id: tenantId, key: 'shift_jam_pelajaran' }
  });
  if (!config?.value) return;
  try {
    const shiftConfig = JSON.parse(config.value);
    const templates = await tx.jadwalKBM.findMany({
      where: { tenant_id: tenantId }
    });

    const SLOT_TIME: Record<number, { start: string; end: string }> = {
      1: { start: "07:00", end: "07:45" },
      2: { start: "07:45", end: "08:30" },
      3: { start: "08:30", end: "09:15" },
      4: { start: "09:35", end: "10:20" },
      5: { start: "10:20", end: "11:05" },
      6: { start: "11:05", end: "11:50" },
      7: { start: "12:30", end: "13:15" },
      8: { start: "13:15", end: "14:00" },
      9: { start: "14:00", end: "14:45" },
      10: { start: "14:45", end: "15:30" },
    };

    for (const temp of templates) {
      const assignedShiftId = shiftConfig.class_assignments?.[temp.kelas_id] || 'pagi';
      const shift = shiftConfig.shifts?.find((s: any) => s.id === assignedShiftId) || shiftConfig.shifts?.[0];
      let start = temp.jam_mulai;
      let end = temp.jam_selesai;
      if (shift) {
        const slot = shift.slots?.find((sl: any) => sl.slot === temp.slot_index);
        if (slot) {
          start = slot.start;
          end = slot.end;
        }
      } else {
        const fallback = SLOT_TIME[temp.slot_index];
        if (fallback) {
          start = fallback.start;
          end = fallback.end;
        }
      }

      if (start !== temp.jam_mulai || end !== temp.jam_selesai) {
        await tx.jadwalKBM.update({
          where: { id: temp.id },
          data: { jam_mulai: start, jam_selesai: end }
        });
      }
    }
  } catch (e) {
    console.error('Failed to sync jadwal template times during shift update', e);
  }
}
