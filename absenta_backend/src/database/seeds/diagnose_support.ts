import { PrismaClient } from '@prisma/client';
import { authorizationService } from '../../modules/auth/services/authorization.service';
import { menuService } from '../../modules/menu/services/menu.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 MEMULAI DIAGNOSA USER & ROLE SUPPORT...');

  // 1. Cari user dengan email support@system.com atau username/name support
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'support' } },
        { full_name: { contains: 'support' } }
      ]
    },
    include: {
      Role: true
    }
  });

  if (users.length === 0) {
    console.log('❌ Tidak ditemukan user dengan kata kunci "support"!');
    return;
  }

  for (const user of users) {
    console.log(`\n👤 User ID: ${user.id}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`📝 Full Name: ${user.full_name}`);
    console.log(`🏢 Tenant ID: ${user.tenant_id}`);
    console.log(`🛡️ Role Name: ${user.Role?.name || 'TANPA ROLE'}`);
    console.log(`📦 Role ID: ${user.role_id}`);

    // Resolve Capabilities
    const capabilities = await authorizationService.resolveUserCapabilities(user.id, { user });
    console.log(`🔑 Total Capabilities: ${capabilities.length}`);
    console.log('📋 List Capabilities:', capabilities);

    // Test specific capability
    const hasTicketView = capabilities.includes('support.tickets.view');
    const hasAdminTicketView = capabilities.includes('admin.tickets.view.list');
    console.log(`❓ Memiliki 'support.tickets.view'? ${hasTicketView ? 'YA' : 'TIDAK'}`);
    console.log(`❓ Memiliki 'admin.tickets.view.list'? ${hasAdminTicketView ? 'YA' : 'TIDAK'}`);

    // Cek Menu Sidebar untuk user ini
    try {
      const menus = await menuService.treeForUser({ user, tenantId: user.tenant_id });
      console.log(`🧭 Total Root Menus untuk User: ${menus.length}`);
      console.log('📌 Root Menus:', menus.map(m => `${m.name} (${m.path || 'Folder'}) -> ${m.required_capability || 'Tanpa Cap'}`));
      
      // Cari menu Tiket Bantuan
      const supportMenu = menus.find(m => m.name.toLowerCase().includes('tiket') || m.name.toLowerCase().includes('support'));
      if (supportMenu) {
        console.log(`🎯 Menemukan menu support: ${supportMenu.name} -> ${supportMenu.path}`);
      }
    } catch (e: any) {
      console.log('❌ Gagal merender menu sidebar:', e.message);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });
