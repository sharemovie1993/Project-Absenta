import { getAllSiswaQuery } from '../modules/academic/siswa/services/queries/get-all-siswa.query';

async function main() {
  console.log('--- TEST QUERY ---');

  // XII TSM 1 class ID for smk6jkt
  const kelasId = '98be5f34-73d4-4db0-a5bf-f26487d1acb7';
  const tenantId = 'b4b316ce-c4cf-4519-a7a1-c0d3284d8745'; // smk6jkt tenant ID

  const result = await getAllSiswaQuery(
    { tenantId, org: { tenant_wide: true } },
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
