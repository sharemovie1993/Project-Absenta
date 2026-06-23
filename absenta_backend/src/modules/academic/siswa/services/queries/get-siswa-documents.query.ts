import { prisma } from '@/utils/prisma';

export async function getSiswaDocumentsQuery(params: {
  tenantId: string;
  siswaId: string;
}) {
  const { tenantId, siswaId } = params;

  const docs = await prisma.siswaDocument.findMany({
    where: { siswa_id: siswaId, tenant_id: tenantId },
    orderBy: { created_at: 'desc' }
  });

  return docs;
}
