
const { PrismaClient, SumberSesi } = require('@prisma/client');
const { subDays, startOfDay, addMinutes, startOfMonth, endOfMonth, eachDayOfInterval, isSaturday, isSunday } = require('date-fns');

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Memulai Seeding Hidayat (Flow Bisnis Real)...');

    const tenantDomain = 'smkn1cimahi';
    const tenant = await prisma.tenant.findUnique({ where: { domain: tenantDomain } });
    if (!tenant) throw new Error('Tenant tidak ditemukan');
    const tenantId = tenant.id;

    const user = await prisma.user.findFirst({ where: { email: 'hidayat@gmail.com' } });
    if (!user) throw new Error('User hidayat@gmail.com tidak ditemukan');

    const siswa = await prisma.siswa.findFirst({ where: { user_id: user.id } });
    if (!siswa) throw new Error('Siswa tidak ditemukan');

    const tapel = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });
    const semester = await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } });

    if (!tapel || !semester) throw new Error('Tapel/Semester aktif tidak ditemukan');

    // 1. Enrollment
    let sa = await prisma.siswaAkademik.findFirst({
        where: {
            siswa_id: siswa.id,
            tahun_pelajaran_id: tapel.id,
            semester_id: semester.id
        }
    });

    if (!sa) {
        const kelas = await prisma.kelas.findFirst({ where: { tenant_id: tenantId } });
        sa = await prisma.siswaAkademik.create({
            data: {
                tenant_id: tenantId,
                siswa_id: siswa.id,
                kelas_id: kelas.id,
                tahun_pelajaran_id: tapel.id,
                semester_id: semester.id
            }
        });
    }

    const kelasId = sa.kelas_id;
    const kelas = await prisma.kelas.findUnique({ where: { id: kelasId } });

    // 2. Cleanup
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    await prisma.absenSiswa.deleteMany({ where: { siswa_akademik_id: sa.id, waktu_tap: { gte: start, lte: end } } });
    await prisma.absenGerbangSiswa.deleteMany({ where: { siswa_id: siswa.id, waktu_tap: { gte: start, lte: end } } });
    await prisma.pelanggaranSiswa.deleteMany({ where: { siswa_id: siswa.id } });

    // 3. Flow Bisnis: Gerbang -> Sesi
    const days = eachDayOfInterval({ start, end }).filter(d => !isSaturday(d) && !isSunday(d));

    for (const day of days) {
        const dateStr = startOfDay(day);
        
        // A. Gerbang
        await prisma.absenGerbangSiswa.create({
            data: {
                tenant_id: tenantId,
                siswa_id: siswa.id,
                status: 'HADIR',
                arah: 'GERBANG_DATANG',
                waktu_tap: addMinutes(dateStr, 420), // 07:00
                is_terlambat: false,
                tahun_pelajaran_id_snapshot: tapel.id
            }
        });

        // B. Sesi (KBM)
        let session = await prisma.sesiAbsensi.findFirst({
            where: { kelas_id: kelasId, tanggal: dateStr }
        });

        if (!session) {
            session = await prisma.sesiAbsensi.create({
                data: {
                    tenant_id: tenantId,
                    kelas_id: kelasId,
                    tahun_pelajaran_id: tapel.id,
                    semester_id: semester.id,
                    tanggal: dateStr,
                    waktu_mulai: addMinutes(dateStr, 450), // 07:30
                    waktu_selesai: addMinutes(dateStr, 540), // 09:00
                    status: 'SELESAI',
                    jenis_kegiatan: 'KBM',
                    sumber_sesi: 'MANUAL'
                }
            });
        }

        // C. Absen Sesi
        await prisma.absenSiswa.create({
            data: {
                tenant_id: tenantId,
                sesi_id: session.id,
                siswa_id: siswa.id,
                siswa_akademik_id: sa.id,
                status: 'HADIR',
                waktu_tap: addMinutes(dateStr, 455),
                is_terlambat: false,
                kelas_id_snapshot: kelasId,
                kelas_nama_snapshot: kelas.nama_kelas,
                tahun_pelajaran_id_snapshot: tapel.id
            }
        });
    }

    // 4. Poin
    await prisma.pelanggaranSiswa.create({
        data: {
            tenant_id: tenantId,
            siswa_id: siswa.id,
            siswa_akademik_id: sa.id,
            tanggal: new Date(),
            jenis_pelanggaran: 'Terlambat Datang',
            poin: 70,
            status: 'SELESAI',
            keterangan: 'Demo Business Flow'
        }
    });

    console.log('✅ Hidayat seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
