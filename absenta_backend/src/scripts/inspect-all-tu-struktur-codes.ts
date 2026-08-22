import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function inspectAllTuStrukturCodes() {
  console.log('🔍 [PEMERIKSAAN KODE STRUKTUR TU DI PRODUKSI & DEMO]...\n');

  for (const [tenantLabel, tenantId] of Object.entries({ 'PRODUKSI': PROD_ID, 'DEMO': DEMO_ID })) {
    console.log(`=== TENANT ${tenantLabel} ===`);
    const positions = await prisma.organizationalPosition.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { code: { startsWith: 'TU' } },
          { name: { contains: 'tata usaha', mode: 'insensitive' } },
          { name: { contains: 'persuratan', mode: 'insensitive' } },
          { name: { contains: 'keuangan', mode: 'insensitive' } },
          { name: { contains: 'kepegawaian', mode: 'insensitive' } }
        ]
      },
      include: {
        organizationalAssigns: {
          where: { is_active: true },
          include: {
            User: { select: { id: true, email: true, full_name: true } }
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    positions.forEach(p => {
      console.log(`- [${p.code}] ${p.name} (order: ${p.order}, scope: ${p.scope_type})`);
      p.organizationalAssigns.forEach(a => {
        console.log(`    ↳ Ditugaskan ke: ${a.User?.full_name} (${a.User?.email})`);
      });
    });
    console.log('');
  }
}

inspectAllTuStrukturCodes()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
