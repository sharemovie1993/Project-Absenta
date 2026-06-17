const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sidebarRenderingService } = require('./src/modules/menu/services/sidebar-rendering.service');

async function check() {
    try {
        console.log('=== Checking Menu for acih@gmail.com ===');
        const user = await prisma.user.findFirst({
            where: { email: 'acih@gmail.com' },
            include: {
                Role: {
                    include: {
                        permissions: true
                    }
                },
                tenant: {
                    include: {
                        subscriptions: {
                            where: { status: 'ACTIVE' },
                            include: { Plan: true }
                        }
                    }
                }
            }
        });
        
        if (!user) {
            console.error('User acih@gmail.com not found');
            return;
        }
        
        // Get user permissions
        const rolePerms = await prisma.rolePermission.findMany({
            where: { role_id: user.role_id }
        });
        const capabilities = rolePerms.map(p => p.permission_id);
        
        // Get active subscription features
        const activeSub = user.tenant?.subscriptions?.[0];
        const features = activeSub?.Plan?.features_json || ['CORE', 'KOPERASI'];
        
        const context = {
            userId: user.id,
            tenantId: user.tenant_id,
            role: user.Role.name,
            capabilities,
            tenantFeatures: features
        };
        
        console.log('Context:', {
            userId: context.userId,
            tenantId: context.tenantId,
            role: context.role,
            capabilitiesCount: context.capabilities.length,
            tenantFeatures: context.tenantFeatures
        });
        
        const menu = await sidebarRenderingService.getSidebarForUser(context);
        
        console.log('=== Menu Result ===');
        console.log(JSON.stringify(menu, null, 2));
        
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
