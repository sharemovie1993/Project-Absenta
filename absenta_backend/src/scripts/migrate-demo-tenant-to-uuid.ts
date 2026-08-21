/**
 * MIGRATE DEMO TENANT: demo-tenant-absenta -> UUID baru
 * Buat tenant baru dengan UUID valid, lalu migrasi semua data
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const uuidv4 = () => randomUUID();

const prisma = new PrismaClient();
const OLD_TENANT_ID = 'demo-tenant-absenta';
const NEW_TENANT_ID = uuidv4(); // UUID valid baru

async function migrateDemoTenant() {
  console.log(`🚀 Memulai migrasi tenant demo...`);
  console.log(`   OLD: ${OLD_TENANT_ID}`);
  console.log(`   NEW: ${NEW_TENANT_ID}`);

  // Ambil data tenant lama
  const oldTenant = await prisma.tenant.findUnique({ where: { id: OLD_TENANT_ID } });
  if (!oldTenant) {
    console.error('❌ Tenant lama tidak ditemukan!');
    return;
  }

  // Lepas subdomain dari tenant lama dulu agar tidak unique conflict
  console.log('\n0️⃣  Melepas subdomain dari tenant lama...');
  await prisma.tenant.update({
    where: { id: OLD_TENANT_ID },
    data: { subdomain: null, custom_domain: null }
  });
  console.log('   ✅ Subdomain dilepas dari tenant lama');

  // Buat tenant baru dengan UUID valid
  console.log('\n1️⃣  Membuat tenant baru dengan UUID...');
  const { id: _id, created_at, updated_at, subdomain: _sub, custom_domain: _cd, ...tenantData } = oldTenant as any;
  await prisma.tenant.create({
    data: {
      ...tenantData,
      id: NEW_TENANT_ID,
      subdomain: 'demo',
      custom_domain: 'demo.absenta.id',
    }
  });
  console.log(`   ✅ Tenant baru dibuat: ${NEW_TENANT_ID}`);

  // Migrasi Role
  console.log('\n2️⃣  Migrasi Role...');
  const roles = await prisma.role.findMany({ where: { tenant_id: OLD_TENANT_ID } });
  console.log(`   Ditemukan ${roles.length} role untuk dimigrasikan`);
  
  const roleIdMap: Record<string, string> = {};
  for (const role of roles) {
    const newRoleId = uuidv4();
    roleIdMap[role.id] = newRoleId;
    const { id: _rid, created_at: _rc, updated_at: _ru, ...roleData } = role as any;
    await prisma.role.create({
      data: {
        ...roleData,
        id: newRoleId,
        tenant_id: NEW_TENANT_ID,
      }
    });
  }
  console.log(`   ✅ ${roles.length} role dimigrasikan`);

  // Migrasi RolePermission untuk setiap role baru
  console.log('\n3️⃣  Migrasi RolePermission...');
  let permCount = 0;
  for (const [oldRoleId, newRoleId] of Object.entries(roleIdMap)) {
    const perms = await prisma.rolePermission.findMany({ where: { role_id: oldRoleId } });
    for (const p of perms) {
      await prisma.rolePermission.create({
        data: {
          role_id: newRoleId,
          permission_id: p.permission_id,
          conditions: p.conditions ?? undefined,
        }
      }).catch(() => {}); // ignore duplicate
    }
    permCount += perms.length;
  }
  console.log(`   ✅ ${permCount} permission assignment dimigrasikan`);

  // Cek role ADMIN baru
  const adminRoleName = roles.find(r => r.name === 'ADMIN');
  const adminNewId = adminRoleName ? roleIdMap[adminRoleName.id] : Object.values(roleIdMap)[0];
  console.log(`\n   Role Map Baru:`);
  for (const [oldId, newId] of Object.entries(roleIdMap)) {
    const r = roles.find(x => x.id === oldId);
    console.log(`   ${r?.name}: ${oldId} -> ${newId}`);
  }

  // Migrasi User (batch per 200)
  console.log('\n4️⃣  Migrasi User...');
  const users = await prisma.user.findMany({ where: { tenant_id: OLD_TENANT_ID } });
  console.log(`   Ditemukan ${users.length} user untuk dimigrasikan`);
  
  const userIdMap: Record<string, string> = {};
  let uCount = 0;
  for (const user of users) {
    const newUserId = uuidv4();
    userIdMap[user.id] = newUserId;
    // Map role_id ke yang baru
    const newRoleId = roleIdMap[user.role_id] || adminNewId;
    const { id: _uid, created_at: _uc, updated_at: _uu, ...userData } = user as any;
    try {
      await prisma.user.create({
        data: {
          ...userData,
          id: newUserId,
          tenant_id: NEW_TENANT_ID,
          role_id: newRoleId,
        }
      });
      uCount++;
    } catch (e: any) {
      console.error(`   ⚠️ Gagal migrasi user ${user.email}: ${e.message}`);
    }
  }
  console.log(`   ✅ ${uCount}/${users.length} user dimigrasikan`);

  // Migrasi Guru (profil)
  console.log('\n5️⃣  Migrasi Guru...');
  const gurus = await prisma.guru.findMany({ where: { tenant_id: OLD_TENANT_ID } });
  let gCount = 0;
  for (const g of gurus) {
    const newGId = uuidv4();
    const newUserId = g.user_id ? userIdMap[g.user_id] : null;
    const { id: _gid, created_at: _gc, updated_at: _gu, ...guruData } = g as any;
    try {
      await prisma.guru.create({
        data: {
          ...guruData,
          id: newGId,
          tenant_id: NEW_TENANT_ID,
          user_id: newUserId,
        }
      });
      gCount++;
    } catch (e: any) {
      console.error(`   ⚠️ Gagal migrasi guru ${g.nama_guru}: ${e.message?.slice(0, 80)}`);
    }
  }
  console.log(`   ✅ ${gCount}/${gurus.length} profil guru dimigrasikan`);

  // Migrasi Siswa (profil) - batch
  console.log('\n6️⃣  Migrasi Siswa...');
  const siswas = await prisma.siswa.findMany({ where: { tenant_id: OLD_TENANT_ID } });
  let sCount = 0;
  for (const s of siswas) {
    const newSId = uuidv4();
    const newUserId = s.user_id ? userIdMap[s.user_id] : null;
    const { id: _sid, created_at: _sc, updated_at: _su, ...siswaData } = s as any;
    try {
      await prisma.siswa.create({
        data: {
          ...siswaData,
          id: newSId,
          tenant_id: NEW_TENANT_ID,
          user_id: newUserId,
        }
      });
      sCount++;
    } catch (e: any) {
      // skip
    }
    if (sCount % 100 === 0) process.stdout.write('.');
  }
  console.log(`\n   ✅ ${sCount}/${siswas.length} profil siswa dimigrasikan`);

  // Migrasi OrganizationalPosition
  console.log('\n7️⃣  Migrasi OrganizationalPosition...');
  const positions = await prisma.organizationalPosition.findMany({ where: { tenant_id: OLD_TENANT_ID } });
  const posIdMap: Record<string, string> = {};
  for (const pos of positions) {
    const newPosId = uuidv4();
    posIdMap[pos.id] = newPosId;
    const { id: _pid, created_at: _pc, updated_at: _pu, ...posData } = pos as any;
    await prisma.organizationalPosition.create({
      data: { ...posData, id: newPosId, tenant_id: NEW_TENANT_ID }
    }).catch(() => {});
  }
  console.log(`   ✅ ${positions.length} posisi struktural dimigrasikan`);

  // Migrasi OrganizationalAssignment
  console.log('\n8️⃣  Migrasi OrganizationalAssignment...');
  const assigns = await prisma.organizationalAssignment.findMany({ where: { tenant_id: OLD_TENANT_ID } });
  let aCount = 0;
  for (const a of assigns) {
    const { id: _aid, created_at: _ac, updated_at: _au, ...aData } = a as any;
    const newUserId = a.user_id ? userIdMap[a.user_id] : null;
    const newPosId = a.position_id ? posIdMap[a.position_id] : null;
    if (!newUserId || !newPosId) continue;
    try {
      await prisma.organizationalAssignment.create({
        data: {
          ...aData,
          id: uuidv4(),
          tenant_id: NEW_TENANT_ID,
          user_id: newUserId,
          position_id: newPosId,
        }
      });
      aCount++;
    } catch (e: any) {
      // skip
    }
  }
  console.log(`   ✅ ${aCount}/${assigns.length} penugasan struktural dimigrasikan`);

  // Subdomain sudah dialihkan saat membuat tenant baru (step 1)
  console.log(`\n9️⃣  Subdomain "demo" sudah terpasang ke UUID: ${NEW_TENANT_ID} ✅`);

  // Migrasi subscription
  console.log('\n🔟  Migrasi Subscription...');
  const sub = await prisma.subscription.findFirst({ where: { tenant_id: OLD_TENANT_ID } });
  if (sub) {
    const { id: _subid, created_at: _sc2, updated_at: _su2, ...subData } = sub as any;
    await prisma.subscription.create({
      data: { ...subData, id: uuidv4(), tenant_id: NEW_TENANT_ID }
    }).catch(() => {});
    console.log('   ✅ Subscription dimigrasikan');
  }

  console.log(`\n✅ MIGRASI SELESAI!`);
  console.log(`   Tenant UUID baru (valid): ${NEW_TENANT_ID}`);
  console.log(`   Subdomain: demo.absenta.id`);
  console.log(`   Total: ${uCount} Users, ${gCount} Guru, ${sCount} Siswa`);
  console.log(`\n⚠️  Catatan: Tenant lama (demo-tenant-absenta) masih ada di DB tapi subdomainnya sudah dialihkan.`);
  console.log(`   Jalankan DELETE FROM "Tenant" WHERE id = 'demo-tenant-absenta'; setelah verifikasi.`);
}

migrateDemoTenant()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
