import { PrismaClient, Hari, SumberSesi } from '@prisma/client';
import { fakerID_ID as faker } from '@faker-js/faker';
import { subDays, startOfDay, addMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Memulai seeding data visual dummy (Fase 2)...');

    const tenantDomain = 'smkn1cimahi';
    const tenant = await prisma.tenant.findUnique({ where: { domain: tenantDomain } });

    if (!tenant) {
        console.error(`❌ Tenant ${tenantDomain} tidak ditemukan.`);
        return;
    }

    const tenantId = tenant.id;

    // --- 0. ENSURE ACTIVE TAPEL & SEMESTER ---
    console.log('📅 Ensuring Active Tahun Pelajaran & Semester...');
    let tapel = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true }
    });
    if (!tapel) {
        tapel = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId } });
        if (tapel) {
            await prisma.tahunPelajaran.update({ where: { id: tapel.id }, data: { is_active: true } });
        }
    }

    let semester = await prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true }
    });
    if (!semester && tapel) {
        semester = await prisma.semester.findFirst({ where: { tenant_id: tenantId, tahun_pelajaran_id: tapel.id } });
        if (semester) {
            await prisma.semester.update({ where: { id: semester.id }, data: { is_active: true } });
        } else if (tapel) {
            semester = await prisma.semester.create({
                data: {
                    tenant_id: tenantId,
                    tahun_pelajaran_id: tapel.id,
                    nama_semester: 'Ganjil',
                    is_active: true
                }
            });
        }
    }

    if (!tapel || !semester) {
        console.error('❌ Tidak bisa melanjutkan tanpa Tahun Pelajaran/Semester.');
        return;
    }

    // --- 1. ACADEMIC DATA CORE ---
    console.log('📚 Seeding Academic Data...');
    const createdKelas = await prisma.kelas.findMany({ where: { tenant_id: tenantId } });
    const allMapel = await prisma.mapel.findMany({ where: { tenant_id: tenantId } });
    const allGuru = await prisma.guru.findMany({ where: { tenant_id: tenantId } });

    // --- 2. KESISWAAN (AFFAIRS) ---
    console.log('⚖️ Seeding Kesiswaan Data...');
    const allStudents = await prisma.siswa.findMany({ where: { tenant_id: tenantId } });
    const allJP = await prisma.jenisPelanggaran.findMany({ where: { tenant_id: tenantId } });

    if (allStudents.length > 0 && allJP.length > 0) {
        for (let i = 0; i < 10; i++) {
            const student = faker.helpers.arrayElement(allStudents);
            const jp = faker.helpers.arrayElement(allJP);
            await prisma.pelanggaranSiswa.create({
                data: {
                    tenant_id: tenantId,
                    siswa_id: student.id,
                    tanggal: faker.date.recent({ days: 30 }),
                    jenis_pelanggaran: jp.nama_pelanggaran,
                    poin: jp.poin,
                    status: faker.helpers.arrayElement(['BARU', 'PROSES', 'SELESAI']),
                    keterangan: faker.lorem.sentence()
                }
            });
        }
    }

    // --- 3. KURIKULUM (CURRICULUM) ---
    console.log('📅 Seeding Kurikulum Data...');
    if (tapel && semester && allMapel.length > 0 && createdKelas.length > 0) {
        const days: Hari[] = [Hari.SENIN, Hari.SELASA, Hari.RABU, Hari.KAMIS, Hari.JUMAT];
        const targetKelas = createdKelas[0];
        
        for (const day of days) {
            for (let jam = 1; jam <= 4; jam++) {
                const mapel = faker.helpers.arrayElement(allMapel);
                const guru = faker.helpers.arrayElement(allGuru);
                
                await prisma.jadwalTemplate.create({
                    data: {
                        tenant_id: tenantId,
                        kelas_id: targetKelas.id,
                        mapel_id: mapel.id,
                        guru_id: guru.id,
                        hari: day,
                        jam_mulai: `${7 + jam}:00`,
                        jam_selesai: `${8 + jam}:10`,
                        tahun_pelajaran_id: tapel.id,
                        semester_id: semester.id
                    }
                }).catch(() => {});
            }
        }
    }

    // --- 5. ABSENSI (ATTENDANCE) ---
    console.log('📉 Seeding Attendance History...');

    if (allStudents.length > 0) {
        for (let d = 0; d < 10; d++) {
            const date = subDays(new Date(), d);
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const dateStr = startOfDay(date);
            const classesToSeed = createdKelas.slice(0, 3);

            for (const kelas of classesToSeed) {
                let session = await prisma.sesiAbsensi.findFirst({
                    where: { tenant_id: tenantId, kelas_id: kelas.id, tanggal: dateStr }
                });

                if (!session) {
                    session = await prisma.sesiAbsensi.create({
                        data: {
                            tenant_id: tenantId,
                            kelas_id: kelas.id,
                            tahun_pelajaran_id: tapel.id,
                            semester_id: semester.id,
                            tanggal: dateStr,
                            waktu_mulai: addMinutes(dateStr, 420),
                            waktu_selesai: addMinutes(dateStr, 480),
                            status: 'SELESAI',
                            jenis_kegiatan: 'KBM',
                            sumber_sesi: SumberSesi.MANUAL
                        }
                    });
                }

                const classStudents = allStudents.filter(s => s.kelas_id === kelas.id);
                for (const student of classStudents) {
                    let sa = await prisma.siswaAkademik.findUnique({
                        where: {
                            siswa_id_tahun_pelajaran_id_semester_id: {
                                siswa_id: student.id,
                                tahun_pelajaran_id: tapel.id,
                                semester_id: semester.id
                            }
                        }
                    });

                    if (!sa) {
                        sa = await prisma.siswaAkademik.create({
                            data: {
                                siswa_id: student.id,
                                kelas_id: kelas.id,
                                tahun_pelajaran_id: tapel.id,
                                semester_id: semester.id
                            }
                        });
                    }

                    const existingAbsen = await prisma.absenSiswa.findFirst({
                        where: { sesi_id: session.id, siswa_id: student.id }
                    });

                    if (!existingAbsen) {
                        const status = faker.helpers.weightedArrayElement([
                            { value: 'H', weight: 85 },
                            { value: 'S', weight: 5 },
                            { value: 'I', weight: 5 },
                            { value: 'A', weight: 5 }
                        ]);

                        await prisma.absenSiswa.create({
                            data: {
                                tenant_id: tenantId,
                                sesi_id: session.id,
                                siswa_id: student.id,
                                siswa_akademik_id: sa.id,
                                status: status,
                                waktu_tap: status === 'H' ? addMinutes(dateStr, 420 + faker.number.int({ min: -10, max: 20 })) : null,
                                is_terlambat: false,
                                kelas_id_snapshot: kelas.id,
                                kelas_nama_snapshot: kelas.nama_kelas,
                                tahun_pelajaran_id_snapshot: tapel.id
                            }
                        });
                    }
                }
            }
        }
    }

    console.log('✅ Seeding data visual dummy (Fase 2) selesai!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
