const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const rolesToCheck = ['SISWA', 'GURU'];
        for (const roleName of rolesToCheck) {
            console.log(`=== Checking Role: ${roleName} ===`);
            const roles = await prisma.role.findMany({
                where: { name: roleName }
            });
            for (const role of roles) {
                const rolePerms = await prisma.rolePermission.findMany({
                    where: { role_id: role.id }
                });
                const permIds = rolePerms.map(p => p.permission_id);
                console.log(`- Role ID: ${role.id}, Tenant: ${role.tenant_id}`);
                console.log(`  Permissions count: ${permIds.length}`);
                console.log(`  Has cooperative.savings.view.list: ${permIds.includes('cooperative.savings.view.list')}`);
                console.log(`  Has cooperative.savings.view.history: ${permIds.includes('cooperative.savings.view.history')}`);
            }
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
