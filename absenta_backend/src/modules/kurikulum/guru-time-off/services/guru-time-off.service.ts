import { prisma } from '@/utils/prisma';
import { Hari } from '@prisma/client';

export interface SaveTimeOffInput {
  guru_id: string;
  time_offs: {
    hari: Hari;
    slot_index: number | null; // null = full day
    keterangan?: string;
  }[];
}

export class GuruTimeOffService {
  async getTimeOffByGuru(tenantId: string, guruId: string) {
    const list = await prisma.guruTimeOff.findMany({
      where: {
        tenant_id: tenantId,
        guru_id: guruId
      },
      orderBy: [{ hari: 'asc' }, { slot_index: 'asc' }]
    });

    return list;
  }

  async getAllTenantTimeOffs(tenantId: string) {
    return prisma.guruTimeOff.findMany({
      where: { tenant_id: tenantId },
      include: {
        Guru: {
          select: { id: true, nama_guru: true }
        }
      }
    });
  }

  async saveGuruTimeOffs(tenantId: string, input: SaveTimeOffInput) {
    const { guru_id, time_offs } = input;

    // Execute in transaction: clear existing for this guru and re-insert
    return prisma.$transaction(async (tx) => {
      // 1. Clear existing time-offs for this guru
      await tx.guruTimeOff.deleteMany({
        where: { tenant_id: tenantId, guru_id }
      });

      // 2. Insert new time-offs
      if (time_offs && time_offs.length > 0) {
        await tx.guruTimeOff.createMany({
          data: time_offs.map(t => ({
            tenant_id: tenantId,
            guru_id,
            hari: t.hari,
            slot_index: t.slot_index ?? null,
            keterangan: t.keterangan || null
          }))
        });
      }

      return tx.guruTimeOff.findMany({
        where: { tenant_id: tenantId, guru_id }
      });
    });
  }

  async deleteTimeOff(tenantId: string, id: string) {
    const record = await prisma.guruTimeOff.findFirst({
      where: { id, tenant_id: tenantId }
    });

    if (!record) {
      throw new Error('Data time-off tidak ditemukan');
    }

    await prisma.guruTimeOff.delete({ where: { id } });
    return { success: true };
  }
}

export const guruTimeOffService = new GuruTimeOffService();
