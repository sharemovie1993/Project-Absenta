const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const tenantName = 'SMKN 1 PURWAKARTA';
  const tenantRes = await client.query(
    'SELECT id, name, status FROM "Tenant" WHERE name = $1',
    [tenantName]
  );
  console.log('Tenant lookup:');
  console.log(JSON.stringify(tenantRes.rows, null, 2));

  if (tenantRes.rows.length === 0) {
    console.log('Tenant not found');
    await client.end();
    return;
  }

  const tenantId = tenantRes.rows[0].id;

  const jenisRes = await client.query(
    'SELECT nama, tipe, urutan, aktif FROM "JenisKegiatanMaster" WHERE tenant_id = $1 ORDER BY tipe, urutan, nama',
    [tenantId]
  );
  console.log('JenisKegiatanMaster for tenant:');
  console.log(JSON.stringify(jenisRes.rows, null, 2));

  const strukturRes = await client.query(
    'SELECT kode, nama, scope, is_active FROM "StrukturOrganisasi" WHERE tenant_id = $1 ORDER BY kode',
    [tenantId]
  );
  console.log('StrukturOrganisasi for tenant:');
  console.log(JSON.stringify(strukturRes.rows, null, 2));

  const guruRes = await client.query(
    'SELECT id, nama_guru, created_at FROM "Guru" WHERE tenant_id = $1 ORDER BY created_at DESC',
    [tenantId]
  );
  console.log('Guru for tenant (ordered by created_at desc):');
  console.log(JSON.stringify(guruRes.rows, null, 2));

  const guruStructRes = await client.query(
    'SELECT g.id as guru_id, g.nama_guru, s.kode, s.nama, gso.start_date, gso.end_date FROM "GuruStrukturOrganisasi" gso JOIN "Guru" g ON gso.guru_id = g.id JOIN "StrukturOrganisasi" s ON gso.struktur_organisasi_id = s.id WHERE gso.tenant_id = $1 AND gso.is_active = true ORDER BY g.created_at DESC, s.kode',
    [tenantId]
  );
  console.log('GuruStrukturOrganisasi for tenant:');
  console.log(JSON.stringify(guruStructRes.rows, null, 2));

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

