import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findFirst({
        where: {
            name: {
                contains: 'Plered',
                mode: 'insensitive'
            }
        }
    });

    if (!tenant) {
        console.log('❌ Tenant Plered not found');
        return;
    }

    console.log(`🏫 Tenant: ${tenant.name} (${tenant.id}), Domain: ${tenant.domain}`);

    const activeTapel = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenant.id, is_active: true }
    });
    console.log(`📅 Active Tapel: ${activeTapel ? activeTapel.tahun : 'None'}`);

    const activeSemester = await prisma.semester.findFirst({
        where: { tenant_id: tenant.id, is_active: true }
    });
    console.log(`📅 Active Semester: ${activeSemester ? activeSemester.nama_semester : 'None'}`);

    const classes = await prisma.kelas.findMany({
        where: { tenant_id: tenant.id }
    });
    console.log(`🏫 Total Classes: ${classes.length}`);

    const students = await prisma.siswa.findMany({
        where: { tenant_id: tenant.id }
    });
    console.log(`👥 Total Students: ${students.length}`);

    const teachers = await prisma.guru.findMany({
        where: { tenant_id: tenant.id }
    });
    console.log(`👨‍🏫 Total Teachers: ${teachers.length}`);

    const mapels = await prisma.mapel.findMany({
        where: { tenant_id: tenant.id }
    });
    console.log(`📚 Total Mapel: ${mapels.length}`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
