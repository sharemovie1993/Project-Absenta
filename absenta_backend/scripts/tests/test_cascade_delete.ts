
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Cascade Delete Test...');
  
  // 1. Create Dummy Tenant
  const tenantId = `test-cascade-${Date.now()}`;
  console.log(`Creating tenant: ${tenantId}`);
  
  await prisma.tenant.create({
    data: {
      id: tenantId,
      name: 'Cascade Test Tenant',
      // slug removed (not in schema)
      status: 'ACTIVE',
    }
  });

  // 2. Create Child Data
  console.log('Creating child data...');

  // Role
  const roleId = `role-${tenantId}`;
  await prisma.role.create({
    data: {
      id: roleId,
      tenant_id: tenantId,
      name: 'Test Role'
    }
  });
  
  // User
  const userId = `user-${tenantId}`;
  await prisma.user.create({
    data: {
      id: userId,
      email: `test-${tenantId}@example.com`,
      password: 'hashedpassword',
      role_id: roleId, // Fixed: use role_id
      full_name: 'Test Admin',
      tenant_id: tenantId
    }
  });

  // OrangTua
  const otId = `ot-${tenantId}`;
  await prisma.orangTua.create({
    data: {
      id: otId,
      tenant_id: tenantId,
      nama: 'Test Parent'
    }
  });

  // ParentPushSubscription (Nested Risk - No TenantID)
  // This depends on OrangTua cascade
  await prisma.parentPushSubscription.create({
    data: {
      orang_tua_id: otId,
      endpoint: `https://fcm.googleapis.com/${Date.now()}`,
      keys_json: {}
    }
  });

  // Jurusan (Required for Kelas)
  const jurusanId = `jurusan-${tenantId}`;
  await prisma.jurusan.create({
    data: {
      id: jurusanId,
      tenant_id: tenantId,
      nama: 'IPA',
      kode: 'IPA'
    }
  });

  // Kelas
  const kelasId = `kelas-${tenantId}`;
  await prisma.kelas.create({
    data: {
      id: kelasId,
      tenant_id: tenantId,
      nama_kelas: 'X-A',
      tingkat: 10,
      jurusan_id: jurusanId // Fixed: added jurusan_id
    }
  });

  // Siswa
  const siswaId = `siswa-${tenantId}`;
  await prisma.siswa.create({
    data: {
      id: siswaId,
      tenant_id: tenantId,
      nama_siswa: 'Test Student', // Fixed: nama -> nama_siswa
      nis: `NIS-${Date.now()}`,
      nisn: `NISN-${Date.now()}`,
      jenis_kelamin: 'L',
      kelas_id: kelasId
    }
  });

  // StrukturOrganisasi
  const strukturId = `struktur-${tenantId}`;
  await prisma.strukturOrganisasi.create({
    data: {
      id: strukturId,
      tenant_id: tenantId,
      kode: `ST-${Date.now().toString().slice(-4)}`,
      nama: 'Test Struktur',
      scope: 'academic'
    }
  });

  // SiswaStrukturOrganisasi (Nested Risk - Has TenantID)
  await prisma.siswaStrukturOrganisasi.create({
    data: {
      tenant_id: tenantId,
      siswa_id: siswaId,
      struktur_organisasi_id: strukturId
    }
  });

  // 3. Verify Data Exists
  console.log('Verifying data existence...');
  const countOt = await prisma.orangTua.count({ where: { tenant_id: tenantId } });
  const countPush = await prisma.parentPushSubscription.count({ where: { OrangTua: { tenant_id: tenantId } } });
  const countSiswaStruktur = await prisma.siswaStrukturOrganisasi.count({ where: { tenant_id: tenantId } });
  
  if (countOt === 0 || countPush === 0 || countSiswaStruktur === 0) throw new Error('Failed to create test data');
  console.log(`Created: ${countOt} OrangTua, ${countPush} PushSubscription, ${countSiswaStruktur} SiswaStruktur`);

  // 4. Delete Tenant
  console.log('Deleting Tenant...');
  await prisma.tenant.delete({
    where: { id: tenantId }
  });

  // 5. Verify Cleanup
  console.log('Verifying cleanup...');
  const checkTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const checkOt = await prisma.orangTua.count({ where: { tenant_id: tenantId } });
  const checkPush = await prisma.parentPushSubscription.count({ where: { OrangTua: { tenant_id: tenantId } } });
  const checkUser = await prisma.user.count({ where: { tenant_id: tenantId } });
  const checkSiswa = await prisma.siswa.count({ where: { tenant_id: tenantId } });
  const checkStruktur = await prisma.strukturOrganisasi.count({ where: { tenant_id: tenantId } });
  const checkSiswaStruktur = await prisma.siswaStrukturOrganisasi.count({ where: { tenant_id: tenantId } });

  console.log('Cleanup Results:', {
    tenant: checkTenant ? 'EXISTS' : 'GONE',
    orangTua: checkOt,
    pushSub: checkPush,
    user: checkUser,
    siswa: checkSiswa,
    struktur: checkStruktur,
    siswaStruktur: checkSiswaStruktur
  });

  if (checkTenant || checkOt > 0 || checkPush > 0 || checkUser > 0 || checkSiswa > 0 || checkStruktur > 0 || checkSiswaStruktur > 0) {
    throw new Error('Cascade Delete FAILED: Orphan records found');
  }

  console.log('SUCCESS: All records deleted via Cascade.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
