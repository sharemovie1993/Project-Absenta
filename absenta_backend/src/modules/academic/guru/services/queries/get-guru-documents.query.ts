import { prisma } from '@/utils/prisma';

export async function getGuruDocumentsQuery(params: {
  tenantId: string;
  guruId: string;
}) {
  const { tenantId, guruId } = params;

  const docs = await prisma.guruDocument.findMany({
    where: { guru_id: guruId, tenant_id: tenantId },
    orderBy: { created_at: 'desc' }
  });

  return docs;
}
