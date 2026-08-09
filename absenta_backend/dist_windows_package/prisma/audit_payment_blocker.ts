
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function audit() {
  const email = 'ypkg@gmail.com';
  console.log(`🔍 Auditing user: ${email}...`);

  try {
    // 1. Find User
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        Role: true,
        Tenant: {
          include: {
            subscriptions: {
              include: {
                Plan: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found.`);
      return;
    }

    console.log(`✅ User Found: ${user.full_name} (ID: ${user.id})`);
    console.log(`🎭 Role: ${user.Role?.name || 'NO ROLE'}`);
    console.log(`🏢 Tenant: ${user.Tenant?.name} (ID: ${user.tenant_id})`);

    // 2. Audit Subscriptions
    const subscriptions = user.Tenant?.subscriptions || [];
    console.log(`📦 Found ${subscriptions.length} subscriptions for this tenant:`);

    let hasPending = false;
    subscriptions.forEach((sub, index) => {
      console.log(`   [${index + 1}] Plan: ${sub.Plan?.name || 'Unknown'}`);
      console.log(`       Status: ${sub.status}`);
      console.log(`       Service: ${sub.service_code}`);
      
      if (['UPGRADE_PENDING', 'PENDING_PAYMENT'].includes(sub.status.toUpperCase())) {
        hasPending = true;
      }
    });

    // 3. Conclusion
    console.log('\n--- AUDIT CONCLUSION ---');
    const userRole = user.Role?.name?.toUpperCase();
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
    
    if (!isAdmin) {
      console.log('❌ Blocker will NOT show: User is not an ADMIN.');
    } else if (!hasPending) {
      console.log('❌ Blocker will NOT show: No subscription with UPGRADE_PENDING or PENDING_PAYMENT found.');
    } else {
      console.log('🚀 Blocker SHOULD show: User is ADMIN and has pending subscription.');
    }

  } catch (error) {
    console.error('❌ Audit failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

audit();
