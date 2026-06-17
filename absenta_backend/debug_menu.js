const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  const email = 'nepur@gmail.com';
  console.log(`--- Debugging Menu/Subscription for ${email} ---`);

  const user = await prisma.user.findFirst({
    where: { email },
    include: { Tenant: true }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  const tenantId = user.tenant_id;
  const tenantName = user.Tenant?.name || 'Unknown';
  console.log(`Tenant: ${tenantName} (ID: ${tenantId})`);

  // 1. Check Subscriptions
  const subs = await prisma.subscription.findMany({
    where: { tenant_id: tenantId },
    include: { Plan: true }
  });
  
  console.log('--- Active Subscriptions ---');
  subs.forEach(s => {
    console.log(`Plan: ${s.Plan?.name}`);
    console.log(`  Features: ${JSON.stringify(s.Plan?.features_json)}`);
    console.log(`  Status: ${s.status}`);
    console.log(`  End Date: ${s.end_date}`);
  });

  // 2. Check Absensi Menus
  const menus = await prisma.menu.findMany({
    where: { name: 'Absensi', scope: 'TENANT' }
  });
  
  console.log('--- Absensi Menus in DB ---');
  menus.forEach(m => {
    console.log(`ID: ${m.id}`);
    console.log(`  Parent ID: ${m.parent_id}`);
    console.log(`  Required Features: ${JSON.stringify(m.required_features)}`);
    console.log(`  Is Active: ${m.is_active}`);
  });

  // 3. Resolve Feature State manually (bypass cache if possible, but let's see what it returns)
  // Since I can't easily import the service, I'll just look at the code logic.
  const featureToTest = 'ABSENSI';
  const now = new Date();
  const relevantSub = subs.find(sub => {
    const plan = sub.Plan;
    const features = plan?.features_json;
    return Array.isArray(features) && features.includes(featureToTest);
  });

  console.log(`--- Manual Feature Resolution for ${featureToTest} ---`);
  if (!relevantSub) {
    console.log(`Result: No relevant subscription found for ${featureToTest}. State should be LOCKED.`);
  } else {
    const isExpired = relevantSub.end_date <= now;
    console.log(`Found Sub: ${relevantSub.Plan?.name}, Status: ${relevantSub.status}, Expired: ${isExpired}`);
  }
}

debug().catch(console.error).finally(() => prisma.$disconnect());
