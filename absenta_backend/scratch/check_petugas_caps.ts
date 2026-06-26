import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findFirst({
        where: { name: { contains: 'Plered', mode: 'insensitive' } }
    });

    if (!tenant) {
        console.log('❌ Tenant Plered not found');
        return;
    }

    const position = await prisma.organizationalPosition.findFirst({
        where: { tenant_id: tenant.id, code: 'PETUGAS_KELAS' }
    });

    if (!position) {
        console.log('❌ Position PETUGAS_KELAS not found');
        return;
    }

    console.log(`🏫 Position: ${position.name} (${position.id})`);

    const capabilities = await prisma.organizationalCapability.findMany({
        where: { position_id: position.id },
        select: { permission_id: true }
    });

    console.log(`📋 Total Capabilities in DB: ${capabilities.length}`);
    capabilities.forEach(cap => console.log(`  - ${cap.permission_id}`));
}

main().finally(() => prisma.$disconnect());
