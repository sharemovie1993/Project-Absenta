import { prisma } from '@/utils/prisma';
import { applyDataScope } from '@/utils/applyDataScope';
import { DataScope } from '@/types/fastify';
import { GuruResponse } from '../guru.service';
import { PRISMA_GURU_USER_SELECT, enrichGuruWithUser } from '../helpers/guru-mapper.helper';

export async function getGuruByIdQuery(
  guruId: string,
  scope: DataScope
): Promise<GuruResponse | null> {
  let whereClause: any = { id: guruId };

  // Apply Tenant Scope
  whereClause = applyDataScope(whereClause, { tenantId: scope.tenantId });

  const guru = await prisma.guru.findFirst({
    where: whereClause,
    include: {
      User: PRISMA_GURU_USER_SELECT,
    },
  });

  return enrichGuruWithUser(guru) as GuruResponse | null;
}
