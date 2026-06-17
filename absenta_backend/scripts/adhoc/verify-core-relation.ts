import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🧪 VERIFICATION: Core <-> Cooperative Relation');
    
    // 1. Setup Tenant Dummy
    const tenant = await prisma.tenant.create({
        data: {
            name: 'TEST SCHOOL',
            domain: 'test-school-' + Date.now(), // Corrected field
            // address: 'Test Address', // Not in CreateInput? Check schema or use simple create
            // phone: '00000',
            status: 'ACTIVE'
        }
    });
    console.log(`✅ Tenant created: ${tenant.id}`);

    // 2. Create Core Data (Jurusan & Kelas first due to FK)
    const jurusan = await prisma.jurusan.create({
        data: {
            tenant_id: tenant.id,
            nama: 'TEST JURUSAN',
            kode: 'TEST'
        }
    });

    const kelas = await prisma.kelas.create({
        data: {
            tenant_id: tenant.id,
            nama_kelas: 'TEST KELAS',
            tingkat: 10,
            jurusan_id: jurusan.id
        }
    });

    const siswa = await prisma.siswa.create({
        data: {
            tenant_id: tenant.id,
            nis: 'TEST-001',
            nama_siswa: 'Budi Test Case',
            jenis_kelamin: 'L',
            status: 'AKTIF',
            kelas_id: kelas.id
        }
    });
    console.log(`✅ Siswa created: ${siswa.nama_siswa} (${siswa.id})`);

    // 3. Create Cooperative Member linked to Siswa
    const member = await prisma.member.create({
        data: {
            tenantId: tenant.id,
            memberNo: 'KOP-TEST-001',
            type: 'STUDENT',
            status: 'ACTIVE',
            siswaId: siswa.id // Linking here
        }
    });
    console.log(`✅ Member created linked to Siswa: ${member.id}`);

    // 4. Verify Fetch (Join Query)
    const fetchedMember = await prisma.member.findUnique({
        where: { id: member.id },
        include: { Siswa: true }
    });

    if (fetchedMember?.Siswa?.nama_siswa === 'Budi Test Case') {
        console.log('✅ SUCCESS: Member successfully linked to Siswa Core Data');
    } else {
        console.error('❌ FAILED: Member link broken');
        process.exit(1);
    }

    // 5. Test Cascade Delete
    console.log('🧪 Testing Cascade Delete...');
    await prisma.siswa.delete({
        where: { id: siswa.id }
    });

    const deletedMember = await prisma.member.findUnique({
        where: { id: member.id }
    });

    if (!deletedMember) {
        console.log('✅ SUCCESS: Member automatically deleted when Siswa deleted');
    } else {
        console.error('❌ FAILED: Cascade delete failed, Member still exists');
        // Cleanup manually
        await prisma.member.delete({ where: { id: member.id } });
    }

    // Cleanup Tenant
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log('🧹 Cleanup done.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
