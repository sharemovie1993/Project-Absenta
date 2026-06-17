const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const gurus = await prisma.guru.findMany({include: {User: true, Tenant: true}, take: 2});
        const guru = gurus.find(g => g.Tenant.is_system !== true) || gurus[1];
        const kelas = await prisma.kelas.findFirst({where: {tenant_id: guru.tenant_id}});
        
        console.log("Tenant:", guru.Tenant.name);
        console.log("Guru Name:", guru.nama_guru);
        console.log("Guru Email:", guru.User.email);
        console.log("Kelas:", kelas.nama);
        
        const bcrypt = require('bcrypt');
        const hash = await bcrypt.hash('guru1234', 10);
        await prisma.user.update({
            where: { id: guru.User.id },
            data: { password: hash }
        });
        console.log("Password reset to: guru1234");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
