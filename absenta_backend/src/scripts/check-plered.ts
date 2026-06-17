import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find SMKN 1 Plered tenant
    const tenant = await prisma.tenant.findFirst({
        where: {
            name: {
                contains: 'Plered',
                mode: 'insensitive'
            }
        }
    });

    if (!tenant) {
        console.log('❌ Tenant SMKN 1 Plered tidak ditemukan di database.');
        return;
    }

    console.log(`🏢 Tenant Ditemukan: "${tenant.name}" (ID: ${tenant.id})`);

    // Get members for this tenant
    const members = await prisma.member.findMany({
        where: { tenantId: tenant.id },
        include: {
            savings: true,
            Siswa: { select: { nama_siswa: true } },
            Guru: { select: { nama_guru: true } }
        }
    });

    console.log(`📊 Jumlah Anggota Koperasi Terdaftar: ${members.length} Member`);
    members.forEach(m => {
        const name = m.Siswa?.nama_siswa || m.Guru?.nama_guru || 'Unknown';
        console.log(`  - No. Anggota: ${m.memberNo} | Nama: ${name} | Jumlah Rekening Aktif: ${m.savings.length}`);
    });
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
