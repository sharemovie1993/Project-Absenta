/**
 * BILLING TEST DATA SETUP SCRIPT
 * 
 * Script untuk membuat test data lengkap untuk modul billing
 * Termasuk: Plans, Subscriptions, Billings, dan Users
 * 
 * Usage:
 * npx ts-node setup-billing-test-data.ts
 */

import { PrismaClient, BillingStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Test data configuration
const TEST_DATA = {
  // Plans data
  plans: [
    {
      id: randomUUID(),
      name: 'Basic Plan',
      price_monthly: 100000,
      max_user: 50,
      features: JSON.stringify(['Basic Attendance', 'Simple Reports', 'Email Support']),
      currency: 'IDR',
      is_active: true,
    },
    {
      id: randomUUID(),
      name: 'Premium Plan',
      price_monthly: 250000,
      max_user: 200,
      features: JSON.stringify(['Advanced Attendance', 'Detailed Reports', 'Multi-Session', 'Phone Support']),
      currency: 'IDR',
      is_active: true,
    },
    {
      id: randomUUID(),
      name: 'Enterprise Plan',
      price_monthly: 500000,
      max_user: 1000,
      features: JSON.stringify(['Full Features', 'Custom Reports', 'API Access', 'Dedicated Support']),
      currency: 'IDR',
      is_active: true,
    },
  ],

  // Test tenants
  tenants: [
    {
      id: randomUUID(),
      name: 'SMA Negeri 1 Jakarta',
      domain: 'sman1jkt.sch.id',
      absensi_mode: 'MULTI_SESI' as const,
      status: 'ACTIVE',
    },
    {
      id: randomUUID(),
      name: 'SMK Teknologi Bandung',
      domain: 'smktek-bdg.sch.id',
      absensi_mode: 'SIMPLE' as const,
      status: 'ACTIVE',
    },
  ],

  // Test users
  users: [
    {
      id: randomUUID(),
      email: 'superadmin@system.com',
      password: 'superadmin123',
      full_name: 'Super Administrator',
      roleName: 'SUPERADMIN' as const,
      tenant_id: null, // SUPERADMIN tidak terikat tenant
    },
    {
      id: randomUUID(),
      email: 'admin1@sman1jkt.sch.id',
      password: 'Admin123!',
      full_name: 'Admin SMA 1 Jakarta',
      roleName: 'ADMIN' as const,
      tenant_id: '', // Will be set to first tenant
    },
    {
      id: randomUUID(),
      email: 'admin2@smktek-bdg.sch.id',
      password: 'Admin123!',
      full_name: 'Admin SMK Teknologi',
      roleName: 'ADMIN' as const,
      tenant_id: '', // Will be set to second tenant
    },
  ],
};

async function setupRoles() {
  console.log('🔧 Setting up roles...');
  
  const roles = [
    { id: uuidv4(), name: 'SUPERADMIN', description: 'Super Administrator with full access' },
    { id: uuidv4(), name: 'ADMIN', description: 'Administrator with tenant access' },
    { id: uuidv4(), name: 'GURU', description: 'Teacher with teaching access' },
    { id: uuidv4(), name: 'SISWA', description: 'Student with read-only access' },
    { id: uuidv4(), name: 'PETUGAS_ABSEN', description: 'Attendance officer' },
  ];

  const createdRoles = [];
  for (const role of roles) {
    const created = await prisma.role.create({
      data: role,
    });
    createdRoles.push(created);
  }

  console.log('✅ Roles setup completed');
  return createdRoles;
}

async function setupTenants() {
  console.log('🏫 Setting up test tenants...');
  
  const createdTenants = [];
  
  for (const tenant of TEST_DATA.tenants) {
    const created = await prisma.tenant.upsert({
      where: { domain: tenant.domain },
      update: {},
      create: tenant,
    });
    createdTenants.push(created);
  }

  console.log('✅ Tenants setup completed');
  return createdTenants;
}

async function setupUsers(tenants: any[], roles: any[]) {
  console.log('👥 Setting up test users...');
  
  // Update tenant_id for admin users
  TEST_DATA.users[1].tenant_id = tenants[0].id; // Admin 1 -> Tenant 1
  TEST_DATA.users[2].tenant_id = tenants[1].id; // Admin 2 -> Tenant 2

  const createdUsers = [];
  
  for (const user of TEST_DATA.users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    // Find role by name
    const role = roles.find(r => r.name === user.roleName);
    if (!role) {
      throw new Error(`Role ${user.roleName} not found`);
    }
    
    const userData: any = {
      id: user.id,
      email: user.email,
      password: hashedPassword,
      full_name: user.full_name,
      role_id: role.id,
      status: 'ACTIVE',
    };

    // Only add tenant_id if it's not null (for SUPERADMIN)
    if (user.tenant_id) {
      userData.tenant_id = user.tenant_id;
    } else {
      // For SUPERADMIN, we need to assign to first tenant as schema requires it
      userData.tenant_id = tenants[0].id;
    }
    
    const created = await prisma.user.create({
      data: userData,
    });
    createdUsers.push(created);
  }

  console.log('✅ Users setup completed');
  return createdUsers;
}

async function setupPlans() {
  console.log('💰 Setting up billing plans...');
  
  const createdPlans = [];
  
  for (const plan of TEST_DATA.plans) {
    const created = await prisma.plan.create({
      data: plan,
    });
    createdPlans.push(created);
  }

  console.log('✅ Plans setup completed');
  return createdPlans;
}

async function setupSubscriptions(plans: any[], tenants: any[]) {
  console.log('📋 Setting up subscriptions...');
  
  const subscriptions = [
    {
      id: uuidv4(),
      plan_id: plans[0].id, // Basic Plan
      tenant_id: tenants[0].id, // SMA Negeri 1
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      status: 'ACTIVE' as const,
    },
    {
      id: uuidv4(),
      plan_id: plans[1].id, // Premium Plan
      tenant_id: tenants[1].id, // SMK Teknologi
      start_date: new Date('2024-06-01'),
      end_date: new Date('2025-05-31'),
      status: 'ACTIVE' as const,
    },
  ];

  const createdSubscriptions = [];
  
  for (const subscription of subscriptions) {
    const created = await prisma.subscription.create({
      data: subscription,
    });
    createdSubscriptions.push(created);
  }

  console.log('✅ Subscriptions setup completed');
  return createdSubscriptions;
}

async function setupBillings(subscriptions: any[], plans: any[]) {
  console.log('🧾 Setting up billing records...');
  
  const billings = [];
  
  // Generate billings for each subscription
  for (let i = 0; i < subscriptions.length; i++) {
    const subscription = subscriptions[i];
    const plan = plans.find(p => p.id === subscription.plan_id);
    
    // Generate 6 months of billing history
    for (let month = 0; month < 6; month++) {
      const billingDate = new Date(2024, month, 1);
      const dueDate = new Date(2024, month, 15);
      const invoiceNumber = `INV-${subscription.tenant_id.slice(-4)}-${2024}${(month + 1).toString().padStart(2, '0')}-${(i + 1).toString().padStart(3, '0')}`;
      
      billings.push({
        id: uuidv4(),
        subscription_id: subscription.id,
        tenant_id: subscription.tenant_id,
        invoice_number: invoiceNumber,
        amount: plan.price_monthly,
        billing_date: billingDate,
        due_date: dueDate,
        status: month < 4 ? BillingStatus.PAID : (month === 4 ? BillingStatus.UNPAID : BillingStatus.OVERDUE),
        paid_at: month < 4 ? new Date(2024, month, 10) : null,
      });
    }
  }

  const createdBillings = [];
  
  for (const billing of billings) {
    const created = await prisma.billing.create({
      data: {
        id: billing.id,
        invoice_number: billing.invoice_number,
        amount: billing.amount,
        billing_date: billing.billing_date,
        due_date: billing.due_date,
        status: billing.status,
        paid_at: billing.paid_at,
        Subscription: {
          connect: { id: billing.subscription_id }
        },
        Tenant: {
          connect: { id: billing.tenant_id }
        }
      },
    });
    createdBillings.push(created);
  }

  console.log('✅ Billings setup completed');
  return createdBillings;
}

async function setupActivityLogs(users: any[], tenants: any[]) {
  console.log('📝 Setting up activity logs...');
  
  const activities = [
    {
      id: uuidv4(),
      user_id: users[0].id, // SUPERADMIN
      tenant_id: tenants[0].id, // Use first tenant for SUPERADMIN activities
      action: 'SYSTEM_SETUP',
      entity: 'BILLING',
      metadata: JSON.stringify({ description: 'Initial billing system setup completed' }),
    },
    {
      id: uuidv4(),
      user_id: users[1].id, // Admin 1
      tenant_id: tenants[0].id,
      action: 'SUBSCRIPTION_CREATED',
      entity: 'SUBSCRIPTION',
      metadata: JSON.stringify({ description: 'Basic plan subscription activated' }),
    },
    {
      id: uuidv4(),
      user_id: users[2].id, // Admin 2
      tenant_id: tenants[1].id,
      action: 'SUBSCRIPTION_CREATED',
      entity: 'SUBSCRIPTION',
      metadata: JSON.stringify({ description: 'Premium plan subscription activated' }),
    },
  ];

  for (const activity of activities) {
    await prisma.activityLog.create({
      data: activity,
    });
  }

  console.log('✅ Activity logs setup completed');
}

async function printTestCredentials() {
  console.log('\n🔑 TEST CREDENTIALS:');
  console.log('==========================================');
  
  for (const user of TEST_DATA.users) {
    console.log(`\n${user.roleName}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log(`  Tenant: ${user.tenant_id ? 'Assigned' : 'Global'}`);
  }
  
  console.log('\n📊 TEST DATA SUMMARY:');
  console.log('==========================================');
  console.log(`✅ Plans: ${TEST_DATA.plans.length} created`);
  console.log(`✅ Tenants: ${TEST_DATA.tenants.length} created`);
  console.log(`✅ Users: ${TEST_DATA.users.length} created`);
  console.log(`✅ Subscriptions: 2 created`);
  console.log(`✅ Billings: 12 records created`);
  
  console.log('\n🧪 TESTING ENDPOINTS:');
  console.log('==========================================');
  console.log('1. Login as SUPERADMIN:');
  console.log('   POST /auth/login');
  console.log('   { "email": "superadmin@system.com", "password": "superadmin123" }');
  console.log('');
  console.log('2. Test Plans (SUPERADMIN only):');
  console.log('   GET /billing/plans');
  console.log('');
  console.log('3. Login as ADMIN:');
  console.log('   POST /auth/login');
  console.log('   { "email": "admin1@sman1jkt.sch.id", "password": "Admin123!" }');
  console.log('');
  console.log('4. Test Subscriptions (ADMIN):');
  console.log('   GET /billing/subscriptions');
  console.log('');
  console.log('5. Test Billings (ADMIN):');
  console.log('   GET /billing/billings');
  console.log('   GET /billing/billings/stats');
}

async function main() {
  try {
    console.log('🚀 Starting billing test data setup...\n');

    // Setup in order
    const roles = await setupRoles();
    const tenants = await setupTenants();
    const users = await setupUsers(tenants, roles);
    const plans = await setupPlans();
    const subscriptions = await setupSubscriptions(plans, tenants);
    await setupBillings(subscriptions, plans);
    await setupActivityLogs(users, tenants);

    await printTestCredentials();

    console.log('\n🎉 Billing test data setup completed successfully!');
    console.log('\nYou can now run comprehensive tests on all billing endpoints.');
    
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
if (require.main === module) {
  main();
}

export default main;
