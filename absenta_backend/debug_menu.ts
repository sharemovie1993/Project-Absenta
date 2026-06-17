import { PrismaClient } from '@prisma/client';
import { sidebarRenderingService } from './src/modules/menu/services/sidebar-rendering.service';
import { featureStateResolver } from './src/services/feature-state-resolver.service';

const prisma = new PrismaClient();

async function debug() {
  const tenantEmail = 'nepur@gmail.com'; // From browser subagent info
  const user = await prisma.user.findFirst({
    where: { email: tenantEmail },
    include: { tenant: true }
  });

  if (!user || !user.tenant_id) {
    console.log('User or Tenant not found');
    return;
  }

  const tenantId = user.tenant_id;
  console.log(`Debug for Tenant: ${user.tenant?.name} (${tenantId})`);

  // Check subscriptions
  const subs = await prisma.subscription.findMany({
    where: { tenant_id: tenantId },
    include: { Plan: true }
  });
  console.log('Subscriptions:', subs.map(s => ({
    plan: s.Plan?.name,
    features: (s as any).Plan?.features_json,
    status: s.status,
    endDate: s.end_date
  })));

  // Check Absensi Menu
  const absensiMenu = await prisma.menu.findFirst({
    where: { name: 'Absensi', scope: 'TENANT' }
  });

  if (absensiMenu) {
    console.log('Absensi Menu:', {
      id: absensiMenu.id,
      name: absensiMenu.name,
      required_features: absensiMenu.required_features
    });

    const state = await featureStateResolver.resolveFeatureState(tenantId, 'ABSENSI');
    console.log('Feature State for ABSENSI:', state);
  } else {
    console.log('Absensi Menu not found in DB');
  }

  // Check full sidebar logic
  const sidebar = await sidebarRenderingService.getSidebarForUser({
    userId: user.id,
    tenantId: tenantId,
    role: 'ADMIN', // Assuming ADMIN
    capabilities: [], // Minimal
    tenantFeatures: ['CORE'] // Baseline
  });

  const absensiInSidebar = sidebar.find((m: any) => m.name === 'Absensi');
  console.log('Absensi in Sidebar:', absensiInSidebar ? {
    name: absensiInSidebar.name,
    locked: absensiInSidebar.locked,
    feature_state: absensiInSidebar.feature_state
  } : 'NOT IN SIDEBAR');
}

debug().catch(console.error).finally(() => prisma.$disconnect());
