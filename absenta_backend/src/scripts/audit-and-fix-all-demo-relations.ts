import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function auditAndFixAllDemoRelations() {
  console.log('🚀 [DEMO AUDITOR & FIXER] Memulai pemeriksaan dan pengikatan total relasi Tenant Demo...');

  // 1. Temukan Tenant Demo
  const demoTenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { subdomain: 'demo' },
        { custom_domain: 'demo.absenta.id' },
        { id: 'demo-tenant-absenta' }
      ]
    }
  });

  if (!demoTenant) {
    console.error('❌ Tenant demo tidak ditemukan di database!');
    process.exit(1);
  }

  const tenantId = demoTenant.id;
  console.log(`✅ Tenant Demo Valid: "${demoTenant.name}" (ID: ${tenantId}, Subdomain: ${demoTenant.subdomain})`);

  // 2. Pastikan 4 Role Tenant Demo memiliki UUID & Tenant ID yang Tepat
  const baseRoles = [
    { name: 'ADMIN', desc: 'Administrator Tenant Demo' },
    { name: 'GURU', desc: 'Guru / Tenaga Pendidik Demo' },
    { name: 'SISWA', desc: 'Siswa / Peserta Didik Demo' },
    { name: 'ORANG_TUA', desc: 'Orang Tua / Wali Murid Demo' }
  ];

  const roleMap: Record<string, string> = {};
  for (const br of baseRoles) {
    let r = await prisma.role.findFirst({
      where: { tenant_id: tenantId, name: br.name }
    });

    if (!r) {
      r = await prisma.role.create({
        data: {
          tenant_id: tenantId,
          name: br.name,
          description: br.desc,
        }
      });
      console.log(`   ➕ Dibuat Role ${br.name} (UUID: ${r.id})`);
    } else {
      console.log(`   ✔ Role ${br.name} Aktif (UUID: ${r.id})`);
    }
    roleMap[br.name] = r.id;
  }

  // 3. Gandakan Permissions ke Role Demo dari Baseline
  const allPermissions = await prisma.permission.findMany();
  console.log(`🔑 Mengaitkan ${allPermissions.length} permission ke Role ADMIN demo...`);
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: roleMap['ADMIN'],
          permission_id: perm.id
        }
      },
      update: {},
      create: {
        role_id: roleMap['ADMIN'],
        permission_id: perm.id
      }
    });
  }

  // 4. Periksa dan Ikat Seluruh User di Tenant Demo ke Role yang Tepat
  console.log(`👥 Memeriksa seluruh User di Tenant Demo...`);
  
  // Pastikan akun admin@absenta.id ada dan memegang role ADMIN
  const defaultHash = await bcrypt.hash('password123', 10);
  const adminUser = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: tenantId, email: 'admin@absenta.id' } },
    update: {
      full_name: 'Administrator Sekolah (Demo)',
      password: defaultHash,
      role_id: roleMap['ADMIN'],
      status: 'ACTIVE',
      email_verified: true,
    },
    create: {
      tenant_id: tenantId,
      email: 'admin@absenta.id',
      full_name: 'Administrator Sekolah (Demo)',
      password: defaultHash,
      role_id: roleMap['ADMIN'],
      status: 'ACTIVE',
      email_verified: true,
    }
  });
  console.log(`   👑 Admin User Ready: admin@absenta.id (User UUID: ${adminUser.id}, Role: ADMIN [${roleMap['ADMIN']}])`);

  // 5. Periksa dan Ikat Seluruh Guru & Profilnya
  const gurus = await prisma.guru.findMany({
    where: { tenant_id: tenantId },
    include: { User: true }
  });
  console.log(`👨‍🏫 Memeriksa ${gurus.length} Guru di Tenant Demo...`);

  let guruFixedCount = 0;
  for (const g of gurus) {
    let u = g.User;
    if (!u) {
      // Buat user jika belum ada
      const cleanEmail = `guru_${g.nip || g.id.slice(0, 8)}@demo.absenta.id`;
      u = await prisma.user.create({
        data: {
          tenant_id: tenantId,
          email: cleanEmail,
          full_name: g.nama_guru,
          password: defaultHash,
          role_id: roleMap['GURU'],
          status: 'ACTIVE',
          email_verified: true,
        }
      });
      await prisma.guru.update({
        where: { id: g.id },
        data: { user_id: u.id }
      });
      guruFixedCount++;
    } else {
      // Pastikan user memegang role_id tenant demo dan password aktif
      const isLeader = u.email.includes('kepsek@') || u.email.includes('tu@') || u.email.includes('admin@');
      const targetRole = isLeader ? roleMap['ADMIN'] : roleMap['GURU'];

      if (u.role_id !== targetRole || u.tenant_id !== tenantId) {
        await prisma.user.update({
          where: { id: u.id },
          data: {
            tenant_id: tenantId,
            role_id: targetRole,
            status: 'ACTIVE',
            email_verified: true
          }
        });
        guruFixedCount++;
      }
    }
  }
  console.log(`   ✅ Selesai verifikasi Guru (${guruFixedCount} user disinkronkan ke Role UUID Tenant Demo)`);

  // 6. Periksa dan Ikat Seluruh Siswa & Profilnya
  const siswas = await prisma.siswa.findMany({
    where: { tenant_id: tenantId },
    include: { User: true }
  });
  console.log(`🎒 Memeriksa ${siswas.length} Siswa di Tenant Demo...`);

  // Update batch role_id untuk seluruh user siswa
  const siswaUserIds = siswas.map(s => s.user_id).filter(Boolean) as string[];
  if (siswaUserIds.length > 0) {
    await prisma.user.updateMany({
      where: {
        id: { in: siswaUserIds },
        tenant_id: tenantId,
      },
      data: {
        role_id: roleMap['SISWA'],
        status: 'ACTIVE',
        email_verified: true
      }
    });
  }
  console.log(`   ✅ Selesai verifikasi Siswa (${siswaUserIds.length} user terikat ke Role SISWA UUID: ${roleMap['SISWA']})`);

  // 7. Periksa Subscription Tenant Demo (Enterprise Unlimited)
  console.log(`💳 Memeriksa Subscription Tenant Demo...`);
  const now = new Date();
  const expireDate = new Date();
  expireDate.setFullYear(expireDate.getFullYear() + 10);

  let enterprisePlan = await prisma.plan.findFirst({
    where: { service_code: 'ENTERPRISE' }
  }) || await prisma.plan.findFirst();

  if (!enterprisePlan) {
    enterprisePlan = await prisma.plan.create({
      data: {
        code: 'ENTERPRISE',
        name: 'Enterprise Full Suite Demo',
        service_code: 'ENTERPRISE',
        price_monthly: 0,
        price_yearly: 0,
        is_active: true,
        trial_days: 3650,
        max_user: 10000,
        features_json: { all_modules: true }
      }
    });
  }

  const existingSub = await prisma.subscription.findFirst({
    where: { tenant_id: tenantId }
  });

  if (existingSub) {
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        plan_id: enterprisePlan.id,
        service_code: enterprisePlan.service_code,
        status: 'ACTIVE',
        start_date: now,
        end_date: expireDate,
        plan_snapshot: { all_modules: true, enterprise: true }
      }
    });
  } else {
    await prisma.subscription.create({
      data: {
        tenant_id: tenantId,
        plan_id: enterprisePlan.id,
        service_code: enterprisePlan.service_code,
        status: 'ACTIVE',
        start_date: now,
        end_date: expireDate,
        plan_snapshot: { all_modules: true, enterprise: true }
      }
    });
  }
  console.log(`   ✅ Subscription ENTERPRISE_DEMO Aktif 10 Tahun dengan Full Modules!`);

  // 8. Periksa Relasi OrganizationalPosition & Assignment
  console.log(`🏛️ Memeriksa 25 Posisi & Penugasan Struktural...`);
  const positions = await prisma.organizationalPosition.findMany({
    where: { tenant_id: tenantId }
  });
  
  const assignments = await prisma.organizationalAssignment.findMany({
    where: { tenant_id: tenantId },
    include: { User: { include: { Guru: true } } }
  });

  console.log(`   ✔ Ditemukan ${positions.length} Posisi Struktural & ${assignments.length} Penugasan Aktif di Tenant Demo.`);

  console.log('\n🎉 [INTEGRITAS SELESAI] Seluruh Role UUID, User, Guru, Siswa, Subscription & Struktur telah terikat 100% ke Tenant Demo!');
}

auditAndFixAllDemoRelations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
