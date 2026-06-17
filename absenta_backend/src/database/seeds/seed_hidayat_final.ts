
import { PrismaClient, SumberSesi } from '@prisma/client';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSaturday, isSunday, format } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Memulai Seeding Hidayat dengan Alur Bisnis Real...');

    const tenantDomain = 'smkn1cimahi';
    const tenant = await prisma.tenant.findUnique({ where: { domain: tenantDomain } });
    if (!tenant) throw new Error('Tenant smkn1cimahi tidak ditemukan');
    const tenantId = tenant.id;

    // 1. Dapatkan User & Siswa
    const user = await prisma.user.findFirst({ where: { email: 'hidayat@gmail.com' } });
    if (!user) throw new Error('User hidayat@gmail.com tidak ditemukan');

    const siswa = await prisma.siswa.findFirst({ where: { user_id: user.id } });
    if (!siswa) throw new Error('Profil Siswa hidayat tidak ditemukan');

    // 2. Pastikan Tahun Pelajaran & Semester Aktif
    const tapel = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });
    const semester = await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } });

    if (!tapel || !semester) throw new Error('Tahun Pelajaran atau Semester aktif tidak ditemukan');

    // 3. Pastikan Pendaftaran Akademik (SiswaAkademik)
    // Gunakan findFirst karena data demo mungkin punya banyak record
    let sa = await prisma.siswaAkademik.findFirst({
        where: {
            siswa_id: siswa.id,
            tahun_pelajaran_id: tapel.id,
            semester_id: semester.id
        }
    });

    if (!sa) {
        console.log('⚠️ Hidayat belum terdaftar di semester aktif, mendaftarkan...');
        const kelas = await prisma.kelas.findFirst({ where: { tenant_id: tenantId } });
        if (!kelas) throw new Error('Tidak ada kelas tersedia untuk pendaftaran');
        
        sa = await prisma.siswaAkademik.create({
            data: {
                siswa_id: siswa.id,
                kelas_id: kelas.id,
                tahun_pelajaran_id: tapel.id,
                semester_id: semester.id
            }
        });
    }

    const kelasId = sa.kelas_id;

    // 4. CLEANUP (Hapus data lama Hidayat di bulan ini agar bersih)
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    
    console.log(`🧹 Membersihkan data lama Hidayat untuk periode ${format(start, 'yyyy-MM')}...`);
    await prisma.absenSiswa.deleteMany({
        where: { siswa_akademik_id: sa.id, waktu_tap: { gte: start, lte: end } }
    });
    await prisma.absenGerbangSiswa.deleteMany({
        where: { siswa_id: siswa.id, waktu_tap: { gte: start, lte: end } }
    });

    // 5. SEEDING SESUAI FLOW BISNIS: Gerbang -> Sesi -> Statistik
    const workingDays = eachDayOfInterval({ start, end }).filter(d => !isSaturday(d) && !isSunday(d));
    
    console.log(`📅 Menghasilkan data untuk ${workingDays.length} hari kerja...`);

    for (const day of workingDays) {
        // A. FLOW 1: Presensi Gerbang (Absensi Utama)
        const isHadirGerbang = true; // Hidayat teladan
            // Cari atau buat SesiGerbang untuk hari tersebut
            let sesiGerbang = await prisma.sesiGerbang.findFirst({
                where: { tenant_id: tenantId, tanggal: startOfDay(day) }
            });

            if (!sesiGerbang) {
                const sekolah = await prisma.sekolah.findFirst({ where: { tenant_id: tenantId } });
                if (!sekolah) throw new Error('Sekolah tidak ditemukan untuk SesiGerbang');
                
                sesiGerbang = await prisma.sesiGerbang.create({
                    data: {
                        tenant_id: tenantId,
                        sekolah_id: sekolah.id,
                        tanggal: startOfDay(day),
                        waktu_mulai: new Date(new Date(day).setHours(7,0,0,0)),
                        status: 'SELESAI',
                        tahun_pelajaran_id: tapel.id
                    }
                });
            }

            const waktuDatang = new Date(day);
            waktuDatang.setHours(7, 0, 0, 0); // Datang jam 7 pagi

            await prisma.absenGerbangSiswa.create({
                data: {
                    tenant_id: tenantId,
                    sesi_gerbang_id: sesiGerbang.id,
                    siswa_id: siswa.id,
                    status: 'HADIR',
                    arah: 'GERBANG_DATANG',
                    waktu_tap: waktuDatang,
                    is_terlambat: false,
                    tahun_pelajaran_id_snapshot: tapel.id
                }
            });

        // B. FLOW 2: Presensi Sesi (Kegiatan Belajar Mengajar)
        // Kita buat 2 sesi per hari (Pagi & Siang)
        const jamSesi = [8, 10]; // Jam 8:00 dan 10:00
        for (const jam of jamSesi) {
            const waktuSesi = new Date(day);
            waktuSesi.setHours(jam, 0, 0, 0);

            // Cari atau buat SesiAbsensi untuk kelas hidayat
            let session = await prisma.sesiAbsensi.findFirst({
                where: { kelas_id: kelasId, tanggal: startOfDay(day), waktu_mulai: waktuSesi }
            });

            if (!session) {
                session = await prisma.sesiAbsensi.create({
                    data: {
                        tenant_id: tenantId,
                        kelas_id: kelasId,
                        tahun_pelajaran_id: tapel.id,
                        semester_id: semester.id,
                        tanggal: startOfDay(day),
                        waktu_mulai: waktuSesi,
                        waktu_selesai: new Date(waktuSesi.getTime() + 60 * 60 * 1000), // 1 jam
                        status: 'SELESAI',
                        jenis_kegiatan: 'KBM',
                        sumber_sesi: SumberSesi.MANUAL
                    }
                });
            }

            // Catat kehadiran Hidayat di sesi tersebut
            await prisma.absenSiswa.create({
                data: {
                    tenant_id: tenantId,
                    sesi_id: session.id,
                    siswa_id: siswa.id,
                    siswa_akademik_id: sa.id,
                    status: isHadirGerbang ? 'HADIR' : 'ALPA',
                    waktu_tap: isHadirGerbang ? waktuSesi : null,
                    is_terlambat: false,
                    kelas_id_snapshot: kelasId,
                    tahun_pelajaran_id_snapshot: tapel.id
                }
            });
        }
    }

    // 6. SEEDING PELANGGARAN (Poin)
    console.log('⚖️ Menambahkan data poin kedisplinan...');
    await prisma.pelanggaranSiswa.create({
        data: {
            tenant_id: tenantId,
            siswa_id: siswa.id,
            siswa_akademik_id: sa.id,
            tanggal: new Date(),
            jenis_pelanggaran: 'Terlambat Datang',
            poin: 70,
            status: 'SELESAI',
            keterangan: 'Input otomatis oleh sistem demo'
        }
    });

    console.log('✨ SEEDING SELESAI! Dashbord Hidayat sekarang harus memiliki data real sesuai flow bisnis.');
}

main()
    .catch((e) => {
        console.error('❌ Gagal Seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

// Helper function
function startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
