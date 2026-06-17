const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const menus = await prisma.menu.findMany({
            where: { path: { startsWith: '/cooperative' } }
        });
        console.log('Cooperative Menus:');
        menus.forEach(m => console.log(`- ID: ${m.id}, Name: ${m.name}, Path: ${m.path}, RequiredCap: ${m.required_capability}`));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
