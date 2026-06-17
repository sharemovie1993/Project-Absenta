import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const jobdeskService = {
  /**
   * Mengambil data jobdesk gabungan (Role + Seluruh Posisi Organisasi Aktif) untuk user tertentu
   */
  async getMyJobdesk(userId: string) {
    // 1. Query user dengan relasi Role & Penugasan Jabatan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Role: {
          include: {
            jobdesk: true,
          },
        },
        organizationalAssignments: {
          where: { is_active: true },
          include: {
            Position: {
              include: {
                jobdesk: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('User tidak ditemukan');
    }

    // 2. Format data Role Jobdesk
    const roleJobdesk = user.Role.jobdesk
      ? {
          role_name: user.Role.name,
          description: user.Role.jobdesk.description,
          tasks: (user.Role.jobdesk.tasks as string[]) || [],
        }
      : null;

    // 3. Format data Position Jobdesks dari seluruh penugasan jabatan yang aktif
    const positionJobdesks = user.organizationalAssignments
      .map((assign) => {
        const pos = assign.Position;
        if (!pos.jobdesk) return null;
        return {
          position_id: pos.id,
          position_code: pos.code,
          position_name: pos.name,
          description: pos.jobdesk.description,
          tasks: (pos.jobdesk.tasks as string[]) || [],
          order: pos.order ?? 0,
        };
      })
      .filter(Boolean) as Array<{
      position_id: string;
      position_code: string;
      position_name: string;
      description: string | null;
      tasks: string[];
      order: number;
    }>;

    // 4. Urutkan dari jabatan tertinggi ke terendah (nilai order terkecil ke terbesar)
    positionJobdesks.sort((a, b) => a.order - b.order);

    return {
      roleJobdesk,
      positionJobdesks,
    };
  },

  /**
   * Mengambil seluruh jobdesk Role untuk tenant tertentu
   */
  async getAllRoleJobdesks(tenantId: string | null) {
    return prisma.role.findMany({
      where: {
        tenant_id: tenantId,
      },
      include: {
        jobdesk: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  },

  /**
   * Update atau Create (Upsert) jobdesk untuk Role tertentu (Sinkronisasi Global berdasarkan Nama Peran)
   */
  async updateRoleJobdesk(roleId: string, description: string | null, tasks: string[]) {
    // Pastikan role exist
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new Error('Role tidak ditemukan');
    }

    // Cari seluruh role yang memiliki nama yang sama (case-insensitive) di seluruh tenant/global
    const matchingRoles = await prisma.role.findMany({
      where: {
        name: {
          equals: role.name,
          mode: 'insensitive'
        }
      }
    });

    let mainUpdated = null;
    for (const r of matchingRoles) {
      const res = await prisma.roleJobdesk.upsert({
        where: { role_id: r.id },
        update: {
          description,
          tasks,
        },
        create: {
          role_id: r.id,
          description,
          tasks,
        },
      });
      if (r.id === roleId) {
        mainUpdated = res;
      }
    }

    return mainUpdated || prisma.roleJobdesk.findFirst({ where: { role_id: roleId } });
  },

  /**
   * Mengambil seluruh jobdesk Jabatan Organisasi (Position) untuk tenant tertentu
   */
  async getAllPositionJobdesks(tenantId: string) {
    return prisma.organizationalPosition.findMany({
      where: {
        tenant_id: tenantId,
      },
      include: {
        jobdesk: true,
      },
      orderBy: {
        order: 'asc',
      },
    });
  },

  /**
   * Update atau Create (Upsert) jobdesk untuk Jabatan Organisasi tertentu (Sinkronisasi Global berdasarkan Kode Jabatan)
   */
  async updatePositionJobdesk(positionId: string, description: string | null, tasks: string[]) {
    // Pastikan position exist
    const position = await prisma.organizationalPosition.findUnique({ where: { id: positionId } });
    if (!position) {
      throw new Error('Jabatan Organisasi tidak ditemukan');
    }

    // Cari seluruh posisi organisasi yang memiliki kode yang sama di seluruh tenant
    const matchingPositions = await prisma.organizationalPosition.findMany({
      where: {
        code: position.code
      }
    });

    let mainUpdated = null;
    for (const pos of matchingPositions) {
      const res = await prisma.positionJobdesk.upsert({
        where: { position_id: pos.id },
        update: {
          description,
          tasks,
        },
        create: {
          position_id: pos.id,
          description,
          tasks,
        },
      });
      if (pos.id === positionId) {
        mainUpdated = res;
      }
    }

    return mainUpdated || prisma.positionJobdesk.findFirst({ where: { position_id: positionId } });
  },
};
