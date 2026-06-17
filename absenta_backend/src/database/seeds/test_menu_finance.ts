import { PrismaClient } from '@prisma/client';
import { sidebarRenderingService } from '../../modules/menu/services/sidebar-rendering.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 [DIAGNOSIS] Memulai diagnosis untuk user finance@system.com...\n');

  // 1. Ambil data User dari database
  const user = await prisma.user.findFirst({
    where: { email: 'finance@system.com' },
    include: {
      Role: true,
      Tenant: true
    }
  });

  if (!user) {
    console.error('❌ User dengan email finance@system.com TIDAK DITEMUKAN di database!');
    return;
  }

  console.log('✅ User Ditemukan:');
  console.log(`   - ID: ${user.id}`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Role ID: ${user.role_id}`);
  console.log(`   - Role Name: ${user.Role?.name || 'TIDAK ADA ROLE'}`);
  console.log(`   - Role Tenant ID: ${user.Role?.tenant_id}`);
  console.log(`   - Tenant ID: ${user.tenant_id}`);
  console.log(`   - Tenant Name: ${user.Tenant?.name || 'TIDAK ADA TENANT'}\n`);

  // 2. Ambil kapabilitas user via Prisma manual
  console.log('🔐 Mengambil kapabilitas user via Prisma manual...');
  let capabilities: string[] = [];
  try {
    if (user.role_id) {
      const rolePerms = await prisma.rolePermission.findMany({
        where: { role_id: user.role_id },
        include: { Permission: true }
      });
      capabilities = rolePerms.map(rp => rp.Permission?.id).filter(Boolean) as string[];
      console.log(`✅ Berhasil mengambil ${capabilities.length} kapabilitas dari database:`);
      console.log(capabilities.slice(0, 15));
      if (capabilities.length > 15) console.log(`   ...dan ${capabilities.length - 15} lainnya.`);
    } else {
      console.warn('⚠️ User tidak memiliki role_id!');
    }
  } catch (err: any) {
    console.error('❌ Gagal mengambil kapabilitas user:', err.message);
  }
  console.log('');

  // 3. Uji Rendering Sidebar Menu
  console.log('🧭 Mencoba merender sidebar menu via sidebarRenderingService...');
  try {
    const menuResult = await sidebarRenderingService.getSidebarForUser({
      userId: user.id,
      tenantId: String(user.tenant_id || 'system'),
      role: String(user.Role?.name || ''),
      capabilities,
      tenantFeatures: ['CORE', 'ABSENSI', 'KOPERASI', 'SARPRAS', 'HUBIN'] // Mock active features
    });

    console.log(`\n✅ Hasil Rendering Menu (${menuResult.length} root items):`);
    console.log(JSON.stringify(menuResult, null, 2));
  } catch (err: any) {
    console.error('❌ ERROR SAAT RENDERING SIDEBAR:', err);
    console.error(err.stack);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
