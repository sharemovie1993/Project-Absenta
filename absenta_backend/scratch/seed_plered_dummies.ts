import { PrismaClient } from '@prisma/client';
import { subDays, startOfDay, addMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting dummy attendance seeding for SMK Negeri 1 Plered...');

    // 1. Locate Plered Tenant
    const tenant = await prisma.tenant.findFirst({
        where: {
            name: {
                contains: 'Plered',
                mode: 'insensitive'
            }
        }
    });

    if (!tenant) {
        console.error('❌ Tenant SMK Negeri 1 Plered not found');
        return;
    }

    console.log(`🏫 Found Tenant: "${tenant.name}" (${tenant.id})`);

    // 2. Locate Active School Year and Semester
    const tapel = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenant.id, is_active: true }
    });
    if (!tapel) {
        console.error('❌ Active TahunPelajaran not found');
        return;
    }

    const semester = await prisma.semester.findFirst({
        where: { tenant_id: tenant.id, is_active: true }
    });
    if (!semester) {
        console.error('❌ Active Semester not found');
        return;
    }

    console.log(`📅 Active Tapel: ${tapel.tahun} | Active Semester: ${semester.nama_semester}`);

    // 3. Retrieve all classes, teachers, and subjects
    const classes = await prisma.kelas.findMany({
        where: { tenant_id: tenant.id }
    });
    const teachers = await prisma.guru.findMany({
        where: { tenant_id: tenant.id }
    });
    const mapels = await prisma.mapel.findMany({
        where: { tenant_id: tenant.id }
    });
    const students = await prisma.siswa.findMany({
        where: { tenant_id: tenant.id }
    });

    console.log(`📊 Statistics:
  - Classes: ${classes.length}
  - Students: ${students.length}
  - Teachers: ${teachers.length}
  - Subjects: ${mapels.length}`);

    if (students.length === 0) {
        console.warn('⚠️ No students found for this tenant. Seeding aborted.');
        return;
    }

    // 4. Seeding dates: Last 5 days (excluding weekends)
    const datesToSeed: Date[] = [];
    let dayCount = 0;
    let offset = 0;

    // Find last 5 weekdays (Mon-Fri)
    while (dayCount < 5) {
        const d = subDays(new Date(), offset);
        const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            datesToSeed.push(d);
            dayCount++;
        }
        offset++;
    }

    console.log(`📅 Seeding attendance history for dates: ${datesToSeed.map(d => d.toISOString().split('T')[0]).join(', ')}`);

    let totalSessionsCreated = 0;
    let totalLogsCreated = 0;

    for (const date of datesToSeed) {
        const dateStr = startOfDay(date);
        console.log(`\n⏳ Seeding date: ${dateStr.toISOString().split('T')[0]}...`);

        for (const kelas of classes) {
            // Find students in this class
            const classStudents = students.filter(s => s.kelas_id === kelas.id);
            if (classStudents.length === 0) {
                // Skip empty classes
                continue;
            }

            // Clean up any existing session for this class on this date to avoid duplicates
            const oldSessions = await prisma.sesiAbsensi.findMany({
                where: {
                    tenant_id: tenant.id,
                    kelas_id: kelas.id,
                    tanggal: dateStr
                }
            });

            for (const sess of oldSessions) {
                await prisma.absenSiswa.deleteMany({ where: { sesi_id: sess.id } });
                await prisma.absenGuru.deleteMany({ where: { sesi_id: sess.id } });
                await prisma.sesiAbsensi.delete({ where: { id: sess.id } });
            }

            // Pick a random teacher and subject
            const guru = teachers.length > 0 ? teachers[Math.floor(Math.random() * teachers.length)] : null;
            const mapel = mapels.length > 0 ? mapels[Math.floor(Math.random() * mapels.length)] : null;

            const waktu_mulai = addMinutes(dateStr, 420); // 07:00
            const waktu_selesai = addMinutes(dateStr, 720); // 12:00

            // Create new SesiAbsensi
            const session = await prisma.sesiAbsensi.create({
                data: {
                    tenant_id: tenant.id,
                    kelas_id: kelas.id,
                    guru_id: guru ? guru.id : null,
                    mapel_id: mapel ? mapel.id : null,
                    tahun_pelajaran_id: tapel.id,
                    semester_id: semester.id,
                    tanggal: dateStr,
                    waktu_mulai,
                    waktu_selesai,
                    status: 'SELESAI',
                    jenis_kegiatan: 'KBM',
                    sumber_sesi: 'MANUAL'
                }
            });

            totalSessionsCreated++;

            // Create Guru Attendance log
            if (guru) {
                await prisma.absenGuru.create({
                    data: {
                        tenant_id: tenant.id,
                        sesi_id: session.id,
                        guru_id: guru.id,
                        status: 'Hadir',
                        waktu_tap: addMinutes(dateStr, 400 + Math.floor(Math.random() * 20)),
                        tahun_pelajaran_id: tapel.id,
                        semester_id: semester.id
                    }
                }).catch(() => {});
            }

            // Create AbsenSiswa log for each student
            for (const student of classStudents) {
                // Ensure SiswaAkademik exists
                let sa = await prisma.siswaAkademik.findFirst({
                    where: {
                        siswa_id: student.id,
                        tahun_pelajaran_id: tapel.id,
                        semester_id: semester.id
                    }
                });

                if (!sa) {
                    sa = await prisma.siswaAkademik.create({
                        data: {
                            siswa_id: student.id,
                            kelas_id: kelas.id,
                            tahun_pelajaran_id: tapel.id,
                            semester_id: semester.id,
                            status: 'AKTIF'
                        }
                    });
                }

                // Randomize attendance status
                const rand = Math.random();
                let status = 'HADIR';
                let is_terlambat = false;
                let waktu_tap: Date | null = null;
                let menit_keterlambatan: number | null = null;

                if (rand < 0.85) {
                    // Hadir tepat waktu (85% probability)
                    status = 'HADIR';
                    is_terlambat = false;
                    waktu_tap = addMinutes(dateStr, 400 + Math.floor(Math.random() * 20)); // 06:40 to 07:00
                } else if (rand < 0.92) {
                    // Terlambat (7% probability)
                    status = 'HADIR';
                    is_terlambat = true;
                    const delay = Math.floor(Math.random() * 45) + 1; // 1 to 45 mins late
                    waktu_tap = addMinutes(dateStr, 420 + delay); // 07:01 to 07:45
                    menit_keterlambatan = delay;
                } else if (rand < 0.95) {
                    // Sakit (3% probability)
                    status = 'SAKIT';
                } else if (rand < 0.98) {
                    // Izin (3% probability)
                    status = 'IZIN';
                } else {
                    // Alpa (2% probability)
                    status = 'ALPA';
                }

                await prisma.absenSiswa.create({
                    data: {
                        tenant_id: tenant.id,
                        sesi_id: session.id,
                        siswa_id: student.id,
                        siswa_akademik_id: sa.id,
                        status: status,
                        waktu_tap: waktu_tap,
                        is_terlambat: is_terlambat,
                        menit_keterlambatan: menit_keterlambatan,
                        kelas_id_snapshot: kelas.id,
                        kelas_nama_snapshot: kelas.nama_kelas,
                        tahun_pelajaran_id_snapshot: tapel.id
                    }
                });

                totalLogsCreated++;
            }
        }
        console.log(`✅ Finished seeding date: ${dateStr.toISOString().split('T')[0]}`);
    }

    console.log(`\n🎉 Successfully completed dummy seeding for SMK Negeri 1 Plered!
  - Created Sessions: ${totalSessionsCreated}
  - Created Attendance Logs: ${totalLogsCreated}`);
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
