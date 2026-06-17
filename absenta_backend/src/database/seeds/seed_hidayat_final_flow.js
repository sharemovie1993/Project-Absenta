
const { PrismaClient } = require('@prisma/client');
const { startOfMonth, endOfMonth, eachDayOfInterval, isSaturday, isSunday, startOfDay, addMinutes } = require('date-fns');

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Memulai Seeding Hidayat (Flow Bisnis Real)...');

    const tenantDomain = 'smkn1cimahi';
    const tenant = await prisma.tenant.findUnique({ where: { domain: tenantDomain } });
    if (!tenant) throw new Error('Tenant tidak ditemukan');
    const tenantId = tenant.id;

    // 1. Dapatkan User & Siswa
    const user = await prisma.user.findFirst({ where: { email: 'hidayat@gmail.com' } });
    if (!user) throw new Error('User hidayat@gmail.com tidak ditemukan');

    const siswa = await prisma.siswa.findFirst({ where: { user_id: user.id } });
    if (!siswa) throw new Error('Siswa tidak ditemukan');

    // 2. Pastikan Tahun Pelajaran & Semester Aktif
    const tapel = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });
    const semester = await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } });

    if (!tapel || !semester) throw new Error('Tapel/Semester aktif tidak ditemukan');

    // 3. Pastikan Pendaftaran Akademik (Enrollment)
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
    const kelasSiswa = await prisma.kelas.findUnique({ where: { id: kelasId } });

    // 4. CLEANUP (Hapus data lama agar bersih)
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    
    console.log('🧹 Membersihkan data lama Hidayat...');
    await prisma.absenSiswa.deleteMany({ where: { siswa_akademik_id: sa.id, waktu_tap: { gte: start, lte: end } } });
    await prisma.absenGerbangSiswa.deleteMany({ where: { siswa_id: siswa.id, waktu_tap: { gte: start, lte: end } } });
    await prisma.pelanggaranSiswa.deleteMany({ where: { siswa_id: siswa.id } });

    // 5. SEEDING (Gate -> Sesi -> Statistik)
    const workingDays = eachDayOfInterval({ start, end }).filter(d => !isSaturday(d) && !isSunday(d));
    
    console.log(`📅 Menghasilkan data untuk ${workingDays.length} hari...`);

    for (const day of workingDays) {
        const dateStr = startOfDay(day);

        // A. Presensi Gerbang (Gate Entrance)
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

        // B. Sesi KBM (Classroom Session)
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
                    waktu_mulai: addMinutes(dateStr, 440), // 07:20
                    waktu_selesai: addMinutes(dateStr, 540), // 09:00
                    status: 'SELESAI',
                    jenis_kegiatan: 'KBM',
                    sumber_sesi: 'MANUAL'
                }
            });
        }

        // C. Absensi Sesi (Classroom Attendance)
        await prisma.absenSiswa.create({
            data: {
                tenant_id: tenantId,
                sesi_id: session.id,
                siswa_id: siswa.id,
                siswa_akademik_id: sa.id,
                status: 'HADIR',
                waktu_tap: addMinutes(dateStr, 445),
                is_terlambat: false,
                kelas_id_snapshot: kelasId,
                kelas_nama_snapshot: kelasSiswa.nama_kelas,
                tahun_pelajaran_id_snapshot: tapel.id
            }
        });
    }

    // 6. Poin Kedisplinan
    await prisma.pelanggaranSiswa.create({
        data: {
            tenant_id: tenantId,
            siswa_id: siswa.id,
            siswa_akademik_id: sa.id,
            tanggal: new Date(),
            jenis_pelanggaran: 'Terlambat Datang',
            poin: 70,
            status: 'SELESAI',
            keterangan: 'Final Flow Fix'
        }
    });

    console.log('✅ Seeding Hidayat Berhasil!');
}

main()
    .catch((e) => {
        console.error('❌ Gagal:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
