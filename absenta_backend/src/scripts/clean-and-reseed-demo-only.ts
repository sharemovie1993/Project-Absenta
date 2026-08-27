import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedPolicies, ensureTenantBaseRoles } from '../database/seeds/seed_policies';
import { seedDemoFromSanitized } from '../database/seeds/seed_demo_from_sanitized';
import { unifyDemoClassEcosystem } from './unify-demo-class-ecosystem';
import { setupDemoParentMagicToken } from './setup-demo-parent-magic-token';

const prisma = new PrismaClient();
const DEMO_TENANT_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function main() {
  console.log('========================================================================');
  console.log('🌱 [PENYEMAIAN MURNI TENANT DEMO] Memulai Seeding Bersih Tenant Demo...');
  console.log('========================================================================\n');

  // 1. Pastikan System Tenant ada terlebih dahulu untuk Platform Roles
  console.log('🏢 [1/6] Menginisialisasi System Tenant...');
  let systemTenant = await prisma.tenant.findUnique({ where: { id: 'system' } });
  if (!systemTenant) {
    systemTenant = await prisma.tenant.create({
      data: {
        id: 'system',
        name: 'System Tenant',
        status: 'ACTIVE'
      }
    });
  }

  // 2. Seed Master Policies & Permissions & Platform Roles
  console.log('\n🛡️  [2/6] Menyemai Master Permission & Hak Akses Global...');
  await seedPolicies();

  // 3. Setup Superadmin User
  console.log('\n👑 [3/6] Menginisialisasi Akun Superadmin Platform...');
  let superadminRole = await prisma.role.findFirst({
    where: { name: 'SUPERADMIN', tenant_id: 'system' }
  });
  if (!superadminRole) {
    superadminRole = await prisma.role.create({
      data: {
        name: 'SUPERADMIN',
        tenant_id: 'system',
        is_system: true
      }
    });
  }

  const defaultHash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: {
      tenant_id_email: {
        tenant_id: 'system',
        email: 'superadmin@absenta.id'
      }
    },
    update: {
      full_name: 'Super Administrator',
      role_id: superadminRole.id,
      password: defaultHash,
      status: 'ACTIVE'
    },
    create: {
      email: 'superadmin@absenta.id',
      tenant_id: 'system',
      full_name: 'Super Administrator',
      role_id: superadminRole.id,
      password: defaultHash,
      status: 'ACTIVE'
    }
  });
  console.log('✅ Superadmin aktif: superadmin@absenta.id / password123');

  // 4. Seed Ulang Tenant Demo dari Dataset Tersanitasi
  console.log('\n🏫 [4/6] Menyemai Data Lengkap Tenant Demo dari Dataset Produksi Tersanitasi...');
  await seedDemoFromSanitized();

  // 5. Pastikan Base Roles dan Hak Akses di Tenant Demo
  console.log('\n🛡️  [5/6] Memastikan Struktur Peran & Hak Akses di Tenant Demo...');
  await ensureTenantBaseRoles(DEMO_TENANT_ID);

  // 6. Jalankan Penyelarasan Seluruh 16 Akun Peran Demo & Magic Token Orang Tua
  console.log('\n🎯 [6/6] Menyelaraskan seluruh 16 akun peran demo & magic token...');
  await unifyDemoClassEcosystem();
  await setupDemoParentMagicToken();

  // Audit Output
  const [tenantCount, userCount, guruCount, siswaCount, kelasCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.guru.count({ where: { tenant_id: DEMO_TENANT_ID } }),
    prisma.siswa.count({ where: { tenant_id: DEMO_TENANT_ID } }),
    prisma.kelas.count({ where: { tenant_id: DEMO_TENANT_ID } })
  ]);

  console.log('\n========================================================================');
  console.log('🎉 [SELESAI] Database Dev Berhasil Direset Murni HANYA Berisi Tenant Demo!');
  console.log(`- Jumlah Tenant: ${tenantCount} (Tenant Demo & System Superadmin)`);
  console.log(`- Total User Terdaftar: ${userCount}`);
  console.log(`- Total Guru di Demo: ${guruCount}`);
  console.log(`- Total Siswa di Demo: ${siswaCount}`);
  console.log(`- Total Kelas di Demo: ${kelasCount}`);
  console.log('========================================================================');
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error('❌ Error saat menyemai tenant demo:', e);
    prisma.$disconnect();
    process.exit(1);
  });
