import { prisma } from '@/utils/prisma';
import { organizationalContextCache } from '@/modules/auth/services/organizational-context-cache';
import { STRUKTUR_CAPABILITIES } from '@/config/position-capabilities';
import { DEFAULT_STRUKTUR_ORGANISASI } from '@/config/organization-structure';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { CacheService } from '@/utils/cache.service';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { CACHE_KEYS } from '@/constants/cache-keys';

export interface CreateStrukturInput {
  kode: string;
  nama: string;
  deskripsi?: string;
  scope: string;
  kelas_id?: string | null;
}

export interface UpdateStrukturInput {
  kode?: string;
  nama?: string;
  deskripsi?: string;
  scope?: string;
  kelas_id?: string | null;
  is_active?: boolean;
}

export interface AssignGuruInput {
  guru_id: string;
  struktur_id: string;
  start_date?: Date;
  end_date?: Date;
  kelas_id?: string | null;
  unit_id?: string | null;
  jenis_kegiatan_id?: string | null;
}

export interface AssignSiswaInput {
  siswa_id: string;
  struktur_id: string;
  kelas_id?: string;
  start_date?: Date;
  end_date?: Date;
  unit_id?: string | null;
}

export class StrukturOrganisasiService {
  async isUserAuthorizedForPosition(userId: string, positionId: string, tenantId: string): Promise<boolean> {
    // 1. Check Global Admin Capability
    const isAdmin = await authorizationService.hasUserPermission(userId, 'academic.structures.update');
    if (isAdmin) return true;

    // 2. Check Contextual Ownership (Active Assignment)
    const assignment = await prisma.organizationalAssignment.findFirst({
      where: {
        position_id: positionId,
        user_id: userId,
        is_active: true,
        tenant_id: tenantId,
      },
    });

    return !!assignment;
  }

  private async invalidateUsersByPosition(positionId: string) {
    const assigns = await prisma.organizationalAssignment.findMany({
      where: { position_id: positionId, is_active: true },
      select: { user_id: true },
    });
    const userIds = Array.from(new Set(assigns.map((a) => String(a.user_id)).filter(Boolean)));
    await Promise.all(userIds.map((uid) => organizationalContextCache.invalidateUser(uid)));
  }

  async getTree(tenantId: string) {
    const cacheKey = CACHE_KEYS.ACADEMIC.STRUKTUR_TREE(tenantId);
    const cached = await CacheService.getInstance().get<any>(cacheKey);
    if (cached) return cached;

    const list = await prisma.organizationalPosition.findMany({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { order: 'asc' },
      include: {
        organizationalAssigns: {
          where: { is_active: true },
          orderBy: { updated_at: 'asc' },
          include: {
            User: {
              include: {
                Guru: { select: { id: true, nama_guru: true, nip: true } },
                Siswa: { select: { id: true, nama_siswa: true, nis: true } },
              },
            },
            Unit: { select: { id: true, nama: true, singkatan: true, kode: true } },
            Kelas: { select: { id: true, nama_kelas: true, tingkat: true } }
          },
        },
      },
    }) as any[];

    // Fetch master data for auto-filling required slots
    const allJurusans = await prisma.jurusan.findMany({ 
      where: { tenant_id: tenantId },
      select: { id: true, nama: true, singkatan: true, kode: true }
    });
    
    const allKelas = await prisma.kelas.findMany({
      where: { 
        tenant_id: tenantId,
        is_active: true
      },
      select: { id: true, nama_kelas: true, tingkat: true }
    });

    const allEskuls = await prisma.jenisKegiatanMaster.findMany({
      where: { tenant_id: tenantId, tipe: 'ESKUL', aktif: true },
      select: { id: true, nama: true }
    });
    allEskuls.sort((a, b) => {
      const isAOsis = a.nama.toUpperCase().includes('OSIS');
      const isBOsis = b.nama.toUpperCase().includes('OSIS');
      if (isAOsis && !isBOsis) return -1;
      if (!isAOsis && isBOsis) return 1;
      return a.nama.localeCompare(b.nama);
    });

    const grouped: Record<string, any[]> = {};
    for (const pos of list) {
      if (!grouped[pos.code]) grouped[pos.code] = [];
      
      const assignments = pos.organizationalAssigns;
      const members = assignments.map((a: any) => {
        let name = 'Unknown';
        let details = '';
        if (a.User?.Guru) {
          name = a.User.Guru.nama_guru;
          details = a.User.Guru.nip ? `NIP: ${a.User.Guru.nip}` : 'GURU';
        } else if (a.User?.Siswa) {
          name = a.User.Siswa.nama_siswa;
          details = a.User.Siswa.nis ? `NIS: ${a.User.Siswa.nis}` : 'SISWA';
        }

        return {
          id: a.id,
          userId: a.user_id,
          unit_id: a.unit_id,
          kelas_id: a.kelas_id,
          jenis_kegiatan_id: a.jenis_kegiatan_id,
          tingkat: a.Kelas?.tingkat || null,
          unit_kode: a.Unit?.singkatan || a.Unit?.kode || a.Kelas?.nama_kelas || null,
          type: a.User?.Guru ? 'GURU' : 'SISWA',
          name,
          details,
          updated_at: a.updated_at,
          structId: pos.id,
          structName: pos.name,
        };
      });

      // INTELLIGENT AUTO-FILLING LOGIC
      // If position requires context (KAPROG, KABENG, WALIKELAS, etc.), ensure ALL entities are represented
      if (['KAPROG', 'KABENG', 'TOOLMAN'].includes(pos.code)) {
        // Create a node for EACH Jurusan
        for (const jurusan of allJurusans) {
          const assignedMember = members.find((m: any) => m.unit_id === jurusan.id);
          grouped[pos.code].push({
            id: pos.id,
            kode: pos.code,
            nama: pos.name,
            deskripsi: null,
            parent_id: null,
            scope: pos.scope_type,
            unit_id: jurusan.id, // Direct binding to Jurusan
            unit_name: jurusan.nama,
            unit_kode: jurusan.singkatan || jurusan.kode,
            members: assignedMember ? [assignedMember] : [], // Empty array means "BELUM DI-SET"
          });
        }
      } else if (['WALIKELAS', 'PETUGAS_KELAS'].includes(pos.code)) {
        // Create a node for EACH Kelas
        for (const kelas of allKelas) {
          const assignedMember = members.find((m: any) => m.kelas_id === kelas.id);
          grouped[pos.code].push({
            id: pos.id,
            kode: pos.code,
            nama: pos.name,
            deskripsi: null,
            parent_id: null,
            scope: pos.scope_type,
            kelas_id: kelas.id,
            kelas_name: kelas.nama_kelas,
            tingkat: kelas.tingkat,
            members: assignedMember ? [assignedMember] : [],
          });
        }
      } else if (pos.code === 'PEMBINA_ESKUL') {
        // Create a node for EACH Eskul
        for (const eskul of allEskuls) {
          const assignedMembers = members.filter((m: any) => m.jenis_kegiatan_id === eskul.id);
          grouped[pos.code].push({
            id: pos.id,
            kode: pos.code,
            nama: pos.name,
            deskripsi: null,
            parent_id: null,
            scope: pos.scope_type,
            jenis_kegiatan_id: eskul.id,
            eskul_name: eskul.nama,
            members: assignedMembers,
          });
        }
      } else {
        // Regular positions (Kepsek, Waka, etc.)
        grouped[pos.code].push({
          id: pos.id,
          kode: pos.code,
          nama: pos.name,
          deskripsi: null,
          parent_id: null,
          scope: pos.scope_type,
          members,
        });
      }
    }

    await CacheService.getInstance().set(cacheKey, grouped, 300);
    return grouped;
  }

  async findAll(tenantId: string, filters: { is_active?: boolean; search?: string }) {
    const where: any = { tenant_id: tenantId };
    if (filters.is_active !== undefined) where.is_active = filters.is_active;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { scope_type: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.organizationalPosition.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { organizationalAssigns: true, organizationalCaps: true } },
      },
    });
  }

  async findById(tenantId: string, id: string) {
    return prisma.organizationalPosition.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        organizationalCaps: { select: { permission_id: true, conditions: true } },
        organizationalAssigns: {
          where: { is_active: true },
          include: {
            User: {
              include: {
                Guru: true,
                Siswa: true
              }
            }
          }
        },
        _count: { select: { organizationalAssigns: true, organizationalCaps: true } },
      },
    });
  }

  async create(tenantId: string, input: CreateStrukturInput) {
    const code = String(input.kode || '').trim().toUpperCase();
    const name = String(input.nama || '').trim();
    const scope_type = String(input.scope || '').trim();
    const unit_type = input.kelas_id ? 'kelas' : null;
    if (!code || !name || !scope_type) throw new Error('kode, nama, scope are required');

    const created = await prisma.organizationalPosition.create({
      data: {
        tenant_id: tenantId,
        code,
        name,
        scope_type,
        unit_type,
        is_active: true,
        updated_at: new Date(),
      },
    });

    // Auto-seed capabilities if code matches a standard code
    if ((STRUKTUR_CAPABILITIES as any)[code]) {
      await this.seedCapabilitiesForPosition(created.id, code);
    }

    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    return created;
  }

  async update(tenantId: string, id: string, input: UpdateStrukturInput) {
    const existing = await prisma.organizationalPosition.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!existing) throw new Error('Struktur not found');

    const updated = await prisma.organizationalPosition.update({
      where: { id },
      data: {
        code: input.kode !== undefined ? String(input.kode).trim().toUpperCase() : undefined,
        name: input.nama !== undefined ? String(input.nama).trim() : undefined,
        scope_type: input.scope !== undefined ? String(input.scope).trim() : undefined,
        unit_type: input.kelas_id !== undefined ? (input.kelas_id ? 'kelas' : null) : undefined,
        is_active: input.is_active !== undefined ? Boolean(input.is_active) : undefined,
        updated_at: new Date(),
      },
    });

    await this.invalidateUsersByPosition(id);
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    return updated;
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.organizationalPosition.findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!existing) throw new Error('Struktur not found');

    await this.invalidateUsersByPosition(id);
    await prisma.organizationalPosition.delete({ where: { id } });
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
  }

  async getPermissions(tenantId: string, strukturId: string) {
    const position = await prisma.organizationalPosition.findFirst({
      where: { id: strukturId, tenant_id: tenantId },
      select: { id: true },
    });
    if (!position) throw new Error('Struktur not found');

    const perms = await prisma.organizationalCapability.findMany({
      where: { position_id: strukturId },
      select: { permission_id: true },
    });
    return perms.map((p) => String(p.permission_id));
  }

  async updatePermissions(tenantId: string, strukturId: string, permissionIds: string[]) {
    const position = await prisma.organizationalPosition.findFirst({
      where: { id: strukturId, tenant_id: tenantId },
      select: { id: true },
    });
    if (!position) throw new Error('Struktur not found');

    const caps = Array.from(new Set((permissionIds || []).map((x) => String(x)).filter(Boolean)));
    await prisma.$transaction(async (tx) => {
      await tx.organizationalCapability.deleteMany({
        where: {
          position_id: strukturId,
          ...(caps.length > 0 ? { permission_id: { notIn: caps } } : {}),
        },
      });

      if (caps.length > 0) {
        await tx.organizationalCapability.createMany({
          data: caps.map((permission_id) => ({ position_id: strukturId, permission_id })),
          skipDuplicates: true,
        });
      }

      await tx.organizationalPosition.update({
        where: { id: strukturId },
        data: { updated_at: new Date() },
      });
    });

    await this.invalidateUsersByPosition(strukturId);
    return this.getPermissions(tenantId, strukturId);
  }

  async distributePermissions(tenantId: string, strukturId: string) {
    const source = await prisma.organizationalPosition.findFirst({
      where: { id: strukturId, tenant_id: tenantId },
      select: { id: true, scope_type: true },
    });
    if (!source) throw new Error('Struktur not found');

    const sourceCaps = await prisma.organizationalCapability.findMany({
      where: { position_id: strukturId },
      select: { permission_id: true },
    });
    const caps = Array.from(new Set(sourceCaps.map((c) => String(c.permission_id)).filter(Boolean)));

    const targets = await prisma.organizationalPosition.findMany({
      where: { tenant_id: tenantId, scope_type: source.scope_type },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      for (const t of targets) {
        await tx.organizationalCapability.deleteMany({ where: { position_id: t.id } });
        if (caps.length > 0) {
          await tx.organizationalCapability.createMany({
            data: caps.map((permission_id) => ({ position_id: t.id, permission_id })),
            skipDuplicates: true,
          });
        }
        await tx.organizationalPosition.update({
          where: { id: t.id },
          data: { updated_at: new Date() },
        });
      }
    });

    await Promise.all(targets.map((t) => this.invalidateUsersByPosition(t.id)));
    return { affected: targets.length };
  }

  async assignGuru(tenantId: string, input: AssignGuruInput) {
    const guru = await prisma.guru.findFirst({
      where: { id: input.guru_id, tenant_id: tenantId },
      select: { user_id: true },
    });
    if (!guru?.user_id) throw new Error('Guru not found');

    const position = await prisma.organizationalPosition.findFirst({
      where: { id: input.struktur_id, tenant_id: tenantId },
      select: { id: true, code: true },
    });
    if (!position) throw new Error('Struktur not found');

    // [LAPIS 1: Conflict of Interest prevention]
    // Mencegah user dengan role global ADMIN ditunjuk sebagai Bendahara Koperasi
    const userWithRole = await prisma.user.findUnique({
      where: { id: guru.user_id },
      include: { Role: true }
    });
    if (userWithRole?.Role?.name === 'ADMIN' && position.code === 'BENDAHARA_KOPERASI') {
      throw new Error('User dengan role ADMIN Sekolah tidak boleh ditunjuk sebagai Bendahara Koperasi untuk menghindari Conflict of Interest.');
    }

    // [PROFESSIONAL VALIDATION] Ensure unit_id or kelas_id or jenis_kegiatan_id is provided for specific roles
    const needsUnit = ['KAPROG', 'KABENG', 'TOOLMAN'].includes(position.code);
    const needsKelas = ['WALIKELAS'].includes(position.code);
    const needsEskul = ['PEMBINA_ESKUL'].includes(position.code);

    if (needsUnit && !input.unit_id) {
      throw new Error(`Jabatan ${position.code} wajib memilih Jurusan/Unit Kerja.`);
    }
    if (needsKelas && !input.kelas_id) {
      throw new Error(`Jabatan ${position.code} wajib memilih Kelas.`);
    }
    if (needsEskul && !input.jenis_kegiatan_id) {
      throw new Error(`Jabatan ${position.code} wajib memilih Ekstrakurikuler.`);
    }

    const existing = await prisma.organizationalAssignment.findFirst({
      where: {
        tenant_id: tenantId,
        position_id: input.struktur_id,
        user_id: guru.user_id,
        kelas_id: input.kelas_id || null,
        jenis_kegiatan_id: input.jenis_kegiatan_id || null,
      },
      select: { id: true },
    });

    const isMultiStaffRole = ['KURIKULUM', 'KESISWAAN', 'HUBIN', 'SARPRAS', 'BPBK', 'GERBANG', 'PETUGAS_ABSENSI', 'PEMBINA_ESKUL', 'TU_PERSURATAN', 'TU_KEUANGAN', 'TU_KEPEGAWAIAN', 'TU_SARPRAS'].includes(position.code);

    const kelasId = input.kelas_id ? String(input.kelas_id) : null;
    const unitId = input.unit_id ? String(input.unit_id) : null;

    // [IDEMPOTENSI & CONSTRAINT KAPROG / KABENG / TOOLMAN] 1 Jurusan = 1 Pejabat & 1 Guru = 1 Unit Kerja
    if (['KAPROG', 'KABENG', 'TOOLMAN'].includes(position.code) && unitId) {
      // 1. Menonaktifkan pejabat terdahulu pada unit/jurusan yang sama
      const previousAssignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          position_id: input.struktur_id,
          unit_id: unitId,
          user_id: { not: guru.user_id },
          is_active: true,
        },
        select: { id: true, user_id: true }
      });

      if (previousAssignments.length > 0) {
        await prisma.organizationalAssignment.updateMany({
          where: { id: { in: previousAssignments.map(p => p.id) } },
          data: { is_active: false, end_date: new Date(), updated_at: new Date() }
        });
        await Promise.all(
          previousAssignments.map(p => organizationalContextCache.invalidateUser(String(p.user_id)))
        );
      }

      // 2. Menonaktifkan penugasan pejabat ini di jurusan/unit kerja LAIN untuk posisi yang sama
      const otherAssignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          position_id: input.struktur_id,
          user_id: guru.user_id,
          unit_id: { not: unitId },
          is_active: true,
        },
        select: { id: true }
      });

      if (otherAssignments.length > 0) {
        await prisma.organizationalAssignment.updateMany({
          where: { id: { in: otherAssignments.map(o => o.id) } },
          data: { is_active: false, end_date: new Date(), updated_at: new Date() }
        });
      }
    }

    // [IDEMPOTENSI & CONSTRAINT WALI KELAS] Seperti Petugas Kelas: 1 Kelas = 1 Wali Kelas & 1 Guru = 1 Kelas Wali
    if (position.code === 'WALIKELAS' && kelasId) {
      // 1. Menonaktifkan Wali Kelas terdahulu pada kelas yang sama
      const previousAssignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          position_id: input.struktur_id,
          kelas_id: kelasId,
          user_id: { not: guru.user_id },
          is_active: true,
        },
        select: { id: true, user_id: true }
      });

      if (previousAssignments.length > 0) {
        await prisma.organizationalAssignment.updateMany({
          where: { id: { in: previousAssignments.map(p => p.id) } },
          data: { is_active: false, end_date: new Date(), updated_at: new Date() }
        });
        await Promise.all(
          previousAssignments.map(p => organizationalContextCache.invalidateUser(String(p.user_id)))
        );
      }

      // 2. Menonaktifkan penugasan WALIKELAS guru ini di kelas-kelas LAIN
      const otherAssignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          position_id: input.struktur_id,
          user_id: guru.user_id,
          kelas_id: { not: kelasId },
          is_active: true,
        },
        select: { id: true }
      });

      if (otherAssignments.length > 0) {
        await prisma.organizationalAssignment.updateMany({
          where: { id: { in: otherAssignments.map(o => o.id) } },
          data: { is_active: false, end_date: new Date(), updated_at: new Date() }
        });
      }
    }

    if (!isMultiStaffRole && position.code !== 'WALIKELAS') {
      await prisma.organizationalAssignment.updateMany({
        where: {
          tenant_id: tenantId,
          position_id: input.struktur_id,
          unit_id: input.unit_id || null,
          kelas_id: input.kelas_id || null,
          jenis_kegiatan_id: input.jenis_kegiatan_id || null,
          is_active: true,
          NOT: { user_id: guru.user_id }
        },
        data: { is_active: false, end_date: new Date(), updated_at: new Date() }
      });
    }

    if (existing) {
      const updated = await prisma.organizationalAssignment.update({
        where: { id: existing.id },
        data: {
          is_active: true,
          start_date: input.start_date || new Date(),
          end_date: input.end_date || null,
          kelas_id: input.kelas_id || null,
          unit_id: input.unit_id || null,
          jenis_kegiatan_id: input.jenis_kegiatan_id || null,
          updated_at: new Date(),
        },
      });

      await organizationalContextCache.invalidateUser(String(guru.user_id));
      return updated;
    }

    const created = await prisma.organizationalAssignment.create({
      data: {
        tenant_id: tenantId,
        position_id: input.struktur_id,
        user_id: guru.user_id,
        kelas_id: input.kelas_id || null,
        unit_id: input.unit_id || null,
        jenis_kegiatan_id: input.jenis_kegiatan_id || null,
        is_active: true,
        start_date: input.start_date || new Date(),
        end_date: input.end_date || null,
        updated_at: new Date(),
      } as any,
    });

    await organizationalContextCache.invalidateUser(String(guru.user_id));
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    return created;
  }

  async removeGuru(tenantId: string, guruId: string, strukturId: string) {
    // [SMART REMOVAL] Check if guruId is actually an Assignment ID first
    const directAssignment = await prisma.organizationalAssignment.findFirst({
      where: { id: guruId, tenant_id: tenantId },
      include: {
        Position: {
          select: { code: true }
        }
      }
    });

    if (directAssignment) {
      await prisma.organizationalAssignment.update({
        where: { id: directAssignment.id },
        data: { is_active: false, end_date: new Date(), updated_at: new Date() }
      });

      await organizationalContextCache.invalidateUser(String(directAssignment.user_id));
      return;
    }

    // Fallback to legacy behavior (By Guru ID)
    const guru = await prisma.guru.findFirst({
      where: { id: guruId, tenant_id: tenantId },
      select: { user_id: true },
    });
    if (!guru?.user_id) return;



    await prisma.organizationalAssignment.updateMany({
      where: {
        tenant_id: tenantId,
        position_id: strukturId,
        user_id: guru.user_id,
        is_active: true
      },
      data: { is_active: false, end_date: new Date(), updated_at: new Date() },
    });

    await organizationalContextCache.invalidateUser(String(guru.user_id));
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
  }

  async assignSiswa(tenantId: string, input: AssignSiswaInput) {
    const siswa = await prisma.siswa.findFirst({
      where: { id: input.siswa_id, tenant_id: tenantId },
      select: { user_id: true },
    });
    if (!siswa?.user_id) throw new Error('Siswa not found');

    const position = await prisma.organizationalPosition.findFirst({
      where: { id: input.struktur_id, tenant_id: tenantId },
      select: { id: true, code: true },
    });
    if (!position) throw new Error('Struktur not found');

    // [PROFESSIONAL VALIDATION] Ensure unit_id or kelas_id is provided for specific roles
    const needsUnit = ['KAPROG', 'KABENG', 'TOOLMAN'].includes(position.code);
    const needsKelas = ['WALIKELAS', 'PETUGAS_KELAS'].includes(position.code);

    if (needsUnit && !input.unit_id) {
      throw new Error(`Jabatan ${position.code} wajib memilih Jurusan/Unit Kerja.`);
    }
    if (needsKelas && !input.kelas_id) {
      throw new Error(`Jabatan ${position.code} wajib memilih Kelas.`);
    }

    const kelasId = input.kelas_id ? String(input.kelas_id) : null;

    // Otomatis menonaktifkan penugasan petugas terdahulu pada kelas yang sama & bersihkan cachenya
    if (position.code === 'PETUGAS_KELAS' && kelasId) {
      const previousAssignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          position_id: input.struktur_id,
          kelas_id: kelasId,
          user_id: { not: siswa.user_id },
          is_active: true,
        },
        select: { id: true, user_id: true }
      });

      if (previousAssignments.length > 0) {
        await prisma.organizationalAssignment.updateMany({
          where: { id: { in: previousAssignments.map(p => p.id) } },
          data: { is_active: false, end_date: new Date(), updated_at: new Date() }
        });
        await Promise.all(
          previousAssignments.map(p => organizationalContextCache.invalidateUser(String(p.user_id)))
        );
      }

      // Otomatis menonaktifkan penugasan user ini di kelas-kelas LAIN untuk posisi yang sama
      await prisma.organizationalAssignment.updateMany({
        where: {
          tenant_id: tenantId,
          position_id: input.struktur_id,
          user_id: siswa.user_id,
          kelas_id: { not: kelasId },
          is_active: true,
        },
        data: { is_active: false, end_date: new Date(), updated_at: new Date() }
      });
    }

    const existing = await prisma.organizationalAssignment.findFirst({
      where: {
        tenant_id: tenantId,
        position_id: input.struktur_id,
        user_id: siswa.user_id,
        kelas_id: kelasId,
      },
      select: { id: true },
    });

    if (existing) {
      const updated = await prisma.organizationalAssignment.update({
        where: { id: existing.id },
        data: {
          is_active: true,
          start_date: input.start_date || new Date(),
          end_date: input.end_date || null,
          kelas_id: kelasId,
          unit_id: input.unit_id || null,
          updated_at: new Date(),
        },
      });
      await organizationalContextCache.invalidateUser(String(siswa.user_id));
      return updated;
    }

    const created = await prisma.organizationalAssignment.create({
      data: {
        tenant_id: tenantId,
        position_id: input.struktur_id,
        user_id: siswa.user_id,
        kelas_id: kelasId,
        unit_id: input.unit_id || null,
        is_active: true,
        start_date: input.start_date || new Date(),
        end_date: input.end_date || null,
        updated_at: new Date(),
      } as any,
    });

    await organizationalContextCache.invalidateUser(String(siswa.user_id));
    await cacheInvalidationService.invalidateStrukturTree(tenantId);
    return created;
  }

  async removeSiswa(tenantId: string, siswaId: string, strukturId: string) {
    // [SMART REMOVAL] Check if siswaId is actually an Assignment ID first
    const directAssignment = await prisma.organizationalAssignment.findFirst({
      where: { id: siswaId, tenant_id: tenantId }
    });

    if (directAssignment) {
      await prisma.organizationalAssignment.update({
        where: { id: directAssignment.id },
        data: { is_active: false, end_date: new Date(), updated_at: new Date() }
      });
      await organizationalContextCache.invalidateUser(String(directAssignment.user_id));
      return;
    }

    // Fallback to legacy behavior (By Siswa ID)
    const siswa = await prisma.siswa.findFirst({
      where: { id: siswaId, tenant_id: tenantId },
      select: { user_id: true },
    });
    if (!siswa?.user_id) return;

    await prisma.organizationalAssignment.updateMany({
      where: {
        tenant_id: tenantId,
        position_id: strukturId,
        user_id: siswa.user_id,
      },
      data: { is_active: false, end_date: new Date(), updated_at: new Date() },
    });

    await organizationalContextCache.invalidateUser(String(siswa.user_id));
  }

  async initializeTenant(tenantId: string) {
    for (const def of DEFAULT_STRUKTUR_ORGANISASI) {
      const pos = await prisma.organizationalPosition.upsert({
        where: { tenant_id_code: { tenant_id: tenantId, code: def.kode } },
        update: {
          name: def.nama,
          scope_type: def.scope_type,
          unit_type: def.scope, // Map functional area to unit_type
          order: def.order,
          is_active: true,
        },
        create: {
          tenant_id: tenantId,
          code: def.kode,
          name: def.nama,
          scope_type: def.scope_type,
          unit_type: def.scope,
          order: def.order,
          is_active: true,
          updated_at: new Date(),
        },
      });

      await this.seedCapabilitiesForPosition(pos.id, pos.code);
    }
  }

  async seedAllCapabilities() {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      await this.initializeTenant(tenant.id);
      await this.seedCapabilitiesForTenant(tenant.id);
    }
  }

  async seedCapabilitiesForTenant(tenantId: string) {
    const positions = await prisma.organizationalPosition.findMany({
      where: { tenant_id: tenantId, is_active: true },
    });

    for (const pos of positions) {
      await this.seedCapabilitiesForPosition(pos.id, pos.code);
    }
  }

  private async seedCapabilitiesForPosition(positionId: string, code: string) {
    const caps = (STRUKTUR_CAPABILITIES as any)[code] as string[] | undefined;
    if (!caps || caps.length === 0) return;

    // Filter only permissions that exist in our Permission table to avoid FK errors
    const validPermissions = await prisma.permission.findMany({
      where: { id: { in: caps } },
      select: { id: true }
    });
    const validIds = validPermissions.map(p => p.id);

    if (validIds.length === 0) return;

    // Idempotent sync: delete existing and createMany
    await prisma.organizationalCapability.deleteMany({
      where: { position_id: positionId }
    });

    await prisma.organizationalCapability.createMany({
      data: validIds.map(permission_id => ({
        position_id: positionId,
        permission_id
      })),
      skipDuplicates: true
    });

    // Clear cache - Invalidate all users in this tenant as a safe measure or skip
    // For now we don't have invalidateByPosition, and since this is init/seed, 
    // there are likely no users to invalidate yet.
  }

  async logDistributeStrukturPermissions(params: {
    tenantId: string;
    userId: string;
    strukturId: string;
    sourcePermissionIds: string[];
    affectedCount: number;
    ip?: string;
  }) {
    await prisma.activityLog.create({
      data: {
        tenant_id: params.tenantId,
        user_id: params.userId,
        action: 'ADMIN_DISTRIBUTE_STRUKTUR_PERMISSIONS',
        entity: 'STRUKTUR_ORGANISASI',
        entity_id: String(params.strukturId),
        metadata: JSON.stringify({
          struktur_id: String(params.strukturId),
          source_permission_ids: params.sourcePermissionIds,
          affected_count: params.affectedCount,
          ip: params.ip,
        }),
      },
    });
  }

  async logAdminUpdateStrukturPermissions(params: {
    tenantId: string;
    userId: string;
    strukturId: string;
    previousPermissionIds: string[];
    newPermissionIds: string[];
    ip?: string;
  }) {
    await prisma.activityLog.create({
      data: {
        tenant_id: params.tenantId,
        user_id: params.userId,
        action: 'ADMIN_UPDATE_STRUKTUR_PERMISSIONS',
        entity: 'STRUKTUR_ORGANISASI',
        entity_id: String(params.strukturId),
        metadata: JSON.stringify({
          struktur_id: String(params.strukturId),
          previous_permission_ids: params.previousPermissionIds,
          new_permission_ids: params.newPermissionIds,
          ip: params.ip,
        }),
      },
    });
  }
}

export const strukturOrganisasiService = new StrukturOrganisasiService();

