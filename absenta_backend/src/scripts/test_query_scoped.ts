import { getAllSiswaQuery } from '../modules/academic/siswa/services/queries/get-all-siswa.query';
import { prisma } from '../utils/prisma';

async function main() {
  console.log('--- TEST SCOPED QUERY ---');

  // XII TSM 2 class ID
  const kelasId = '7a9ae5c5-b8a5-44e2-a8da-92e7b2affa30';
  const tenantId = 'b4b316ce-c4cf-4519-a7a1-c0d3284d8745'; // smk6jkt tenant ID

  // Let's find a staff user or admin user to get their organizationalScope
  const user = await prisma.user.findFirst({
    where: {
      tenant_id: tenantId
    }
  });

  if (!user) {
    console.error('No admin user found!');
    return;
  }
  console.log(`Found user: ${user.full_name} (${user.id})`);

  // Let's simulate organizationalScope like the middleware does
  // In our system, the organizationalScope is injected in middleware. Let's see what is inside by manually constructing it.
  // Generally it has tenant_wide: false or true. Let's test with tenant_wide: false and allowed kelas_ids
  const allowedKelas = await prisma.kelas.findMany({
    where: { tenant_id: tenantId },
    select: { id: true }
  });
  const kelasIds = allowedKelas.map(k => k.id);

  const org = {
    tenant_wide: false,
    is_unit_restricted: false,
    kelas_ids: kelasIds
  };

  const result = await getAllSiswaQuery(
    { tenantId, org },
    {
      page: 1,
      limit: 10,
      kelas_id: kelasId,
      status: 'AKTIF'
    }
  );

  console.log('Total returned:', result.data.length);
  console.log('Returned students:');
  for (const s of result.data) {
    console.log(`- ${s.nama_siswa} (Status: ${s.status})`);
  }
}

main().catch(console.error);
