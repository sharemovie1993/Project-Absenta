const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
    console.log('--- AUDIT DATA HIDAYAT ---');
    const user = await prisma.user.findFirst({
        where: { email: { contains: 'hidayat' } }
    });
    
    if (!user) {
        console.log('User Hidayat tidak ditemukan');
        return;
    }

    const assignments = await prisma.organizationalAssignment.findMany({
        where: { user_id: user.id, is_active: true },
        include: { Position: true, Kelas: true }
    });

    console.log(`User ID: ${user.id}`);
    console.log(`Assignments:`, assignments.map(a => ({
        pos: a.Position.code,
        kelas: a.Kelas?.nama_kelas || 'N/A',
        kelas_id: a.kelas_id
    })));

    if (assignments.length > 0) {
        const kelasId = assignments[0].kelas_id;
        const totalSiswa = await prisma.siswa.count({ where: { kelas_id: kelasId, status: 'AKTIF' } });
        console.log(`Total Siswa di Kelas ${kelasId}: ${totalSiswa}`);
        
        // Cek Siswa yang BELUM HADIR hari ini (Sesi Gerbang)
        const now = new Date();
        const startOfDay = new Date(now.setHours(0,0,0,0));
        const endOfDay = new Date(now.setHours(23,59,59,999));
        
        const sudahHadir = await prisma.absenGerbangSiswa.findMany({
            where: {
                tenant_id: user.tenant_id,
                arah: 'GERBANG_DATANG',
                waktu_tap: { gte: startOfDay, lte: endOfDay }
            },
            select: { siswa_id: true }
        });
        
        const sudahHadirIds = sudahHadir.map(s => s.siswa_id);
        const belumHadir = await prisma.siswa.findMany({
            where: {
                kelas_id: kelasId,
                status: 'AKTIF',
                id: { notIn: sudahHadirIds }
            },
            select: { nama_siswa: true }
        });
        
        console.log(`Siswa Belum Hadir hari ini:`, belumHadir.map(s => s.nama_siswa));
    }
}

audit().finally(() => prisma.$disconnect());
