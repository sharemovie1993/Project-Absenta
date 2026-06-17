import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Starting Integration Verification...');

    // 1. Verify Tenant & Subscription
    const tenant = await prisma.tenant.findUnique({
        where: { domain: 'smkn1cimahi' },
        include: { subscriptions: { include: { Plan: true } } }
    });

    if (!tenant) throw new Error('❌ Tenant smkn1cimahi not found');
    console.log(`✅ Tenant Found: ${tenant.name}`);

    const activeSub = tenant.subscriptions.find(s => s.status === 'ACTIVE');
    if (!activeSub) throw new Error('❌ No active subscription found');
    
    // Check Features in Plan
    // Note: features_json is stored as Json, we need to cast or parse it if string
    let features: string[] = [];
    if (activeSub.Plan.features_json) {
        if (typeof activeSub.Plan.features_json === 'string') {
            features = JSON.parse(activeSub.Plan.features_json);
        } else {
            features = activeSub.Plan.features_json as string[];
        }
    }

    if (!features.includes('KOPERASI')) {
        throw new Error(`❌ Subscription Plan ${activeSub.Plan.name} does NOT include KOPERASI feature. Features: ${features}`);
    }
    console.log(`✅ Feature Guard Check: Tenant has 'KOPERASI' feature.`);

    // 2. Verify User & Role
    const adminEmail = `admin@smkn1cimahi.com`;
    const user = await prisma.user.findUnique({
        where: { tenant_id_email: { tenant_id: tenant.id, email: adminEmail } },
        include: { Role: { include: { rolePermissions: { include: { Permission: true } } } } }
    });

    if (!user) throw new Error(`❌ User ${adminEmail} not found`);
    console.log(`✅ User Found: ${user.full_name} (${user.Role.name})`);

    if (user.Role.name !== 'ADMIN') {
        throw new Error(`❌ User Role is ${user.Role.name}, expected ADMIN`);
    }

    // 3. Verify Permissions
    const permissions = user.Role.rolePermissions.map(rp => rp.Permission.id);
    const requiredPermission = 'cooperative.members.view.list';
    
    if (!permissions.includes(requiredPermission)) {
        console.error('❌ Missing Permission:', requiredPermission);
        console.log('Available Permissions:', permissions.filter(p => p.startsWith('cooperative')));
        throw new Error(`❌ Role ADMIN does not have ${requiredPermission}`);
    }
    console.log(`✅ Policy Check: User has '${requiredPermission}'`);

    // 4. Verify Data Access (Simulate API Call)
    const memberCount = await prisma.member.count({
        where: { tenantId: tenant.id }
    });
    
    if (memberCount === 0) {
        console.warn('⚠️ Warning: No members found in database (Seeding might have failed silently?)');
    } else {
        console.log(`✅ Data Access: Found ${memberCount} Cooperative Members.`);
    }

    console.log('\n🎉 INTEGRATION VERIFIED: SUCCESS');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
