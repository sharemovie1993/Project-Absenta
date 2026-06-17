import { sidebarRenderingService } from '../src/modules/menu/services/sidebar-rendering.service';

async function main() {
  console.log('🔍 Testing Sidebar Menu for System Superadmin (superadmin@system.com)...');

  const menu = await sidebarRenderingService.getSidebarForUser({
    userId: 'superadmin-id',
    tenantId: '', // Empty system scope
    role: 'SUPERADMIN',
    capabilities: [], // Superadmin bypasses capability checks
    tenantFeatures: ['CORE'],
    organizationalScope: {
      petugasActive: true
    }
  });

  console.log(`\n✅ Rendered ${menu.length} Root Menu Items:`);
  for (const item of menu) {
    console.log(`- ${item.name} (Path: ${item.path})`);
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        console.log(`  └─ ${child.name} (Path: ${child.path})`);
      }
    }
  }

  // Double check if Koperasi appears anywhere
  const hasKoperasi = JSON.stringify(menu).toLowerCase().includes('koperasi');
  if (hasKoperasi) {
    console.error('\n❌ ERROR: Koperasi menu found in Superadmin sidebar! Scope resolution failed.');
  } else {
    console.log('\n🎉 SUCCESS: No Koperasi or tenant-level menus found in Superadmin sidebar.');
  }
}

main().catch(console.error);
