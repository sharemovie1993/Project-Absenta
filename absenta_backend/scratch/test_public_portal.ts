import { publicPortalService } from '../src/modules/public-portal/services/public-portal.service';

async function run() {
  console.log('=== TESTING PUBLIC PORTAL SERVICE (MULTI-TENANT MULTI-JENJANG) ===\n');

  // Test 1: Resolve Tenant by Subdomain
  console.log('1. Resolving tenant by slug "smkn1pld"...');
  const tenant = await publicPortalService.resolveTenant('smkn1pld');
  console.log('   Result:', tenant);

  if (!tenant) {
    console.error('❌ Tenant smkn1pld not resolved!');
    process.exit(1);
  }

  // Test 2: Get School Profile
  console.log('\n2. Fetching School Profile...');
  const profile = await publicPortalService.getSchoolProfile(tenant.id);
  console.log('   Nama Sekolah:', profile?.nama);
  console.log('   Jenjang:', profile?.jenjang);
  console.log('   Stats:', profile?.stats);
  console.log('   Web CMS Hero Title:', profile?.web_config?.hero_title);
  console.log('   Web CMS Theme Color:', profile?.web_config?.theme_color);

  // Test 3: Get Programs (Jurusan)
  console.log('\n3. Fetching Programs (Jurusan SMK)...');
  const programs = await publicPortalService.getPrograms(tenant.id);
  console.log(`   Found ${programs.length} programs:`);
  programs.forEach((p) => {
    console.log(`   - [${p.kode || '-'}] ${p.nama} (${p.jumlah_kelas} kelas aktif)`);
  });

  // Test 4: Get Staff Directory
  console.log('\n4. Fetching Staff Directory (PTK)...');
  const staff = await publicPortalService.getStaffDirectory(tenant.id);
  console.log(`   Found ${staff.length} staff members.`);
  const sample = staff.slice(0, 3);
  sample.forEach((s) => {
    console.log(`   - ${s.nama_guru} (${s.jenis_ptk}) - Mapel: [${s.mata_pelajaran.join(', ')}]`);
  });

  // Test 5: Get Hubin Data (Vokasi)
  console.log('\n5. Fetching Hubin Vokasi...');
  const hubin = await publicPortalService.getHubinData(tenant.id);
  console.log('   Mitra DUDI count:', hubin.mitra.length);
  console.log('   Lowongan BKK count:', hubin.lowongan.length);
  console.log('   TEFA projects count:', hubin.tefa_projects.length);

  // Test 6: Get Facilities
  console.log('\n6. Fetching Sarpras Facilities...');
  const facilities = await publicPortalService.getFacilities(tenant.id);
  console.log(`   Found ${facilities.length} facility locations.`);
  facilities.slice(0, 3).forEach((f) => console.log(`   - ${f.nama}`));

  // Test 7: Get Articles
  console.log('\n7. Fetching Articles & News...');
  const articles = await publicPortalService.getArticles(tenant.id, { page: 1, limit: 5 });
  console.log(`   Articles found: ${articles.total}`);

  console.log('\n✅ ALL PUBLIC PORTAL TESTS COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
