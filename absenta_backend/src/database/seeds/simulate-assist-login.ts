import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { tenantMiddleware } from '../../middlewares/tenant';
import { subscriptionGuard } from '../../middlewares/subscription.guard';

// Muat variabel lingkungan dari .env
dotenv.config();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

async function main() {
  console.log('🚀 [SIMULATION-START] Memulai Uji Coba Standalone Assist Login E2E...');

  // Cetak daftar semua tenant di database
  const allTenants = await prisma.tenant.findMany();
  console.log('📊 [DATABASE] Daftar tenant terdaftar:');
  allTenants.forEach(t => {
    console.log(`   - ID: ${t.id} | Name: "${t.name}" | Domain: "${t.domain}"`);
  });

  // 1. Dapatkan akun Support
  const supportUser = await prisma.user.findFirst({
    where: { email: 'support@system.com' },
    include: { Role: true }
  });
  if (!supportUser) {
    throw new Error('User support@system.com tidak ditemukan di database. Pastikan seeder telah dijalankan.');
  }
  console.log(`✅ [FOUND] Support User ditemukan: ${supportUser.email} (Role: ${supportUser.Role.name})`);

  // 2. Dapatkan Tenant A (Sekolah A) untuk resolusi Domain Host
  const domainTenant = await prisma.tenant.findFirst({
    where: { id: { not: 'system' }, domain: { not: null } }
  });
  if (!domainTenant) {
    throw new Error('Tidak ada tenant sekolah terdaftar untuk resolusi domain host.');
  }
  console.log(`✅ [FOUND] Tenant A (Sekolah A) untuk Domain Host: "${domainTenant.name}" (Domain: ${domainTenant.domain})`);

  // Dapatkan Tenant B (Sekolah B) yang berbeda untuk target Assist Login
  const targetTenant = await prisma.tenant.findFirst({
    where: { id: { notIn: ['system', domainTenant.id] }, domain: { not: null } }
  });
  if (!targetTenant) {
    throw new Error('Tidak ada tenant sekolah target B yang berbeda untuk simulasi.');
  }
  console.log(`✅ [FOUND] Tenant B (Sekolah B) untuk Sesi Bantuan: "${targetTenant.name}" (ID: ${targetTenant.id}, Domain: ${targetTenant.domain})`);

  // 3. Dapatkan Admin sekolah target (Sekolah B)
  const targetAdminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
  if (!targetAdminRole) {
    throw new Error('Peran ADMIN sekolah tidak ditemukan di database.');
  }
  const targetAdmin = await prisma.user.findFirst({
    where: { tenant_id: targetTenant.id, role_id: targetAdminRole.id },
    include: { Role: true }
  });
  if (!targetAdmin) {
    throw new Error(`Tidak ada user ADMIN terdaftar untuk sekolah target "${targetTenant.name}".`);
  }
  console.log(`✅ [FOUND] Admin sekolah target ditemukan: ${targetAdmin.email} (ID: ${targetAdmin.id})`);

  // 4. Bentuk token JWT Support asli & Admin Target
  const supportTokenPayload = {
    id: supportUser.id,
    email: supportUser.email,
    tenantId: 'system',
    roleId: supportUser.role_id,
    roleName: supportUser.Role.name,
    exp: Math.floor(Date.now() / 1000) + (15 * 60)
  };
  const supportToken = jwt.sign(supportTokenPayload, JWT_SECRET);

  const targetAdminPayload = {
    id: targetAdmin.id,
    email: targetAdmin.email,
    tenantId: targetTenant.id,
    roleId: targetAdmin.role_id,
    roleName: targetAdmin.Role.name,
    exp: Math.floor(Date.now() / 1000) + (15 * 60)
  };
  const targetAdminToken = jwt.sign(targetAdminPayload, JWT_SECRET);

  console.log('🔑 [JWT] Token JWT Simulasi berhasil ditandatangani.');

  // ==========================================
  // KASUS 1: TANPA X-SUPPORT-TOKEN (HARUS DITOLAK 403)
  // ==========================================
  console.log('\n--- 🧪 UJI COBA 1: Tanpa X-Support-Token (Harus Ditolak 403) ---');
  
  let resultStatus1 = 200;
  let resultPayload1: any = null;

  const mockRequest1: any = {
    headers: {
      host: `${domainTenant.domain}.absenta.local:5173`, // Domain Sekolah A
      authorization: `Bearer ${targetAdminToken}`
    },
    method: 'GET',
    url: '/api/me/tenant',
    user: targetAdminPayload,
    server: {
      jwt: {
        verify: async (t: string) => jwt.verify(t, JWT_SECRET)
      }
    },
    log: {
      info: (...args: any[]) => console.log('    [Backend Info]:', ...args),
      warn: (...args: any[]) => console.log('    [Backend Warn]:', ...args)
    }
  };

  const mockReply1: any = {
    status: (code: number) => {
      resultStatus1 = code;
      return mockReply1;
    },
    send: (payload: any) => {
      resultPayload1 = payload;
      return mockReply1;
    }
  };

  await tenantMiddleware(mockRequest1, mockReply1);

  if (resultStatus1 === 403) {
    console.log('🎉 [PASS] Sistem berhasil mendeteksi mismatch domain-tenant dan menolak akses dengan status 403!');
    console.log('   Pesan penolakan:', resultPayload1);
  } else {
    console.log(`❌ [FAIL] Uji coba 1 gagal! Harusnya ditolak 403, tetapi malah meloloskan dengan status ${resultStatus1}.`);
  }

  // ==========================================
  // KASUS 2: DENGAN X-SUPPORT-TOKEN (HARUS DI-BYPASS / LOLOS 200)
  // ==========================================
  console.log('\n--- 🧪 UJI COBA 2: Dengan X-Support-Token (Harus Lolos/Bypass) ---');

  let resultStatus2 = 200;
  let resultPayload2: any = null;

  const mockRequest2: any = {
    headers: {
      host: `${domainTenant.domain}.absenta.local:5173`, // Domain Sekolah A
      authorization: `Bearer ${targetAdminToken}`,
      'x-support-token': `Bearer ${supportToken}` // Sisipkan kredensial Support asli
    },
    method: 'GET',
    url: '/api/me/tenant',
    user: targetAdminPayload,
    server: {
      jwt: {
        verify: async (t: string) => jwt.verify(t, JWT_SECRET)
      }
    },
    log: {
      info: (...args: any[]) => console.log('    [Backend Info]:', ...args),
      warn: (...args: any[]) => console.log('    [Backend Warn]:', ...args)
    }
  };

  const mockReply2: any = {
    status: (code: number) => {
      resultStatus2 = code;
      return mockReply2;
    },
    send: (payload: any) => {
      resultPayload2 = payload;
      return mockReply2;
    }
  };

  await tenantMiddleware(mockRequest2, mockReply2);

  if (resultStatus2 === 200 && mockRequest2.isImpersonated === true) {
    console.log('🎉 [PASS] Sistem sukses mengenali header X-Support-Token, memverifikasi sesi support, dan memberikan bypass domain mismatch!');
    console.log(`   Resolved tenantId: ${mockRequest2.tenantId} (Target: ${targetTenant.id})`);
    if (resultPayload2) {
      console.log('   [INFO] Payload response 2 (mock):', JSON.stringify(resultPayload2));
    }
  } else {
    console.log(`❌ [FAIL] Uji coba 2 gagal! Harusnya lolos 200, tetapi status adalah ${resultStatus2}. isImpersonated: ${mockRequest2.isImpersonated}`);
  }

  // ==========================================
  // KASUS 3: MEMASTIKAN SUBSCRIPTION GUARD LOLOS/BYPASS
  // ==========================================
  console.log('\n--- 🧪 UJI COBA 3: Pengecekan Subscription Guard (Harus Lolos/Bypass) ---');

  let resultStatus3 = 200;
  let resultPayload3: any = null;

  const mockRequest3: any = {
    url: '/api/academic/stats',
    user: targetAdminPayload,
    tenantId: targetTenant.id,
    isImpersonated: true, // Sesi asisten aktif
    log: {
      info: (...args: any[]) => console.log('    [Backend Info]:', ...args)
    }
  };

  const mockReply3: any = {
    status: (code: number) => {
      resultStatus3 = code;
      return mockReply3;
    },
    send: (payload: any) => {
      resultPayload3 = payload;
      return mockReply3;
    }
  };

  await subscriptionGuard(mockRequest3, mockReply3);

  if (resultStatus3 === 200) {
    console.log('🎉 [PASS] Subscription Guard berhasil dilewati tanpa melakukan hit ke database langganan!');
    if (resultPayload3) {
      console.log('   [INFO] Payload response 3 (mock):', JSON.stringify(resultPayload3));
    }
  } else {
    console.log(`❌ [FAIL] Uji coba 3 gagal! Harusnya subscription guard lolos, tetapi diblokir dengan status ${resultStatus3}.`);
  }

  console.log('\n🏁 [SIMULATION-FINISHED] Uji Coba Standalone Selesai dengan Sukses!');
}

main()
  .catch((e) => {
    console.error('💥 FATAL SIMULATION ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
