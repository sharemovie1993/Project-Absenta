import { PrismaClient, Hari } from '@prisma/client';
import { fakerID_ID as faker } from '@faker-js/faker';

import bcrypt from 'bcrypt';
import { seedDefaultJenisKegiatanForTenant } from '../../modules/academic/jenis-kegiatan-master/services/jenis-kegiatan-master.service';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Memulai seeding data demo Dashboard Siswa (Gamified)...');

    const tenantDomain = 'smkn1cimahi';
    const tenant = await prisma.tenant.findUnique({ where: { subdomain: tenantDomain } });
    if (!tenant) throw new Error('Tenant smkn1cimahi not found');
    const tenantId = tenant.id;

    console.log('🧹 Cleaning up old demo data for smkn1cimahi...');
    // Delete old attendance records to ensure clean state
    // We must delete dependent records first
    await prisma.absenSiswa.deleteMany({ where: { tenant_id: tenantId } });
    await prisma.absenGuru.deleteMany({ where: { tenant_id: tenantId } });
    await prisma.progresMateri.deleteMany({ where: { tenant_id: tenantId } });
    await prisma.sesiAbsensi.deleteMany({ where: { tenant_id: tenantId } });
    await prisma.pelanggaranSiswa.deleteMany({ where: { tenant_id: tenantId } });
    await prisma.guruMapel.deleteMany({ where: { tenant_id: tenantId } });

    // --- 0. ENSURE ACTIVE TAPEL & SEMESTER ---
    let tapel = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true }
    });
    if (!tapel) {
        tapel = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId } });
        if (tapel) await prisma.tahunPelajaran.update({ where: { id: tapel.id }, data: { is_active: true } });
    }

    let semester = await prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true }
    });
    if (!semester && tapel) {
        semester = await prisma.semester.findFirst({ where: { tenant_id: tenantId, tahun_pelajaran_id: tapel.id } });
        if (semester) {
            await prisma.semester.update({ where: { id: semester.id }, data: { is_active: true } });
        } else {
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

    // --- 1. ENSURE JENIS PELANGGARAN ---
    console.log('⚖️ Ensuring Jenis Pelanggaran...');
    const jpData = [
        { nama: 'Terlambat Datang', poin: 5 },
        { nama: 'Atribut Tidak Lengkap', poin: 10 },
        { nama: 'Rambut Tidak Sesuai Aturan', poin: 15 },
        { nama: 'Merusak Fasilitas', poin: 50 },
        { nama: 'Membawa Senjata Tajam', poin: 100 },
    ];

    for (const data of jpData) {
        const existing = await prisma.jenisPelanggaran.findFirst({
            where: { tenant_id: tenantId, nama_pelanggaran: data.nama }
        });

        if (!existing) {
            await prisma.jenisPelanggaran.create({
                data: {
                    tenant_id: tenantId,
                    nama_pelanggaran: data.nama,
                    poin: data.poin,
                    kategori: 'RINGAN'
                }
            });
        } else {
            await prisma.jenisPelanggaran.update({
                where: { id: existing.id },
                data: { poin: data.poin }
            });
        }
    }

    const allJP = await prisma.jenisPelanggaran.findMany({ where: { tenant_id: tenantId } });

    // --- 2. PREFETCH STUDENTS & CLASSES ---
    const allStudents = await prisma.siswa.findMany({ where: { tenant_id: tenantId } });
    const allKelas = await prisma.kelas.findMany({ where: { tenant_id: tenantId } });

    if (allStudents.length === 0) {
        console.error('❌ Tidak ada siswa ditemukan di tenant ini.');
        return;
    }

    console.log(`👥 Memproses ${allStudents.length} siswa...`);

    // --- 3. SYNC STUDENT ACADEMIC DATA (No Attendance Sessions) ---
    console.log('📚 Synchronizing student academic records (Blank Attendance Slate)...');
    for (const student of allStudents) {
        await prisma.siswaAkademik.upsert({
            where: {
                siswa_id_tahun_pelajaran_id_semester_id: {
                    siswa_id: student.id,
                    tahun_pelajaran_id: tapel.id,
                    semester_id: semester.id
                }
            },
            update: {
                // No accumulation columns in schema, just sync status or class if needed
                kelas_id: student.kelas_id!
            },
            create: {
                siswa_id: student.id,
                tahun_pelajaran_id: tapel.id,
                semester_id: semester.id,
                kelas_id: student.kelas_id!,
                status: 'AKTIF'
            }
        });
    }

    // Ensure no attendance sessions exist as requested
    console.log('🧹 Cleaning up any accidental attendance sessions...');
    await prisma.absenSiswa.deleteMany({ where: { tenant_id: tenantId } });
    await prisma.absenGuru.deleteMany({ where: { tenant_id: tenantId } });
    await prisma.sesiAbsensi.deleteMany({ where: { tenant_id: tenantId } });


    // --- 4. SEED VIOLATIONS (Enriched with Status Variation) ---
    console.log('⚠️ Seeding data pelanggaran (Status: BARU, PROSES, SELESAI)...');
    
    // Find X-RPL-1 to give it more data
    const xRpl1 = allKelas.find(k => k.nama_kelas === 'X-RPL-1');

    for (const student of allStudents) {
        // Higher probability for X-RPL-1 (70%) vs others (20%)
        const probability = (xRpl1 && student.kelas_id === xRpl1.id) ? 0.7 : 0.2;
        
        if (Math.random() < probability) {
            const numViolations = faker.number.int({ min: 1, max: 4 });
            for (let i = 0; i < numViolations; i++) {
                const jp = faker.helpers.arrayElement(allJP);
                
                // Randomize status: BARU (40%), PROSES (30%), SELESAI (30%)
                const statusRand = Math.random();
                let status = 'BARU';
                if (statusRand > 0.4 && statusRand <= 0.7) status = 'PROSES';
                else if (statusRand > 0.7) status = 'SELESAI';

                await prisma.pelanggaranSiswa.create({
                    data: {
                        tenant_id: tenantId,
                        siswa_id: student.id,
                        kelas_id: student.kelas_id,
                        tanggal: faker.date.recent({ days: 30 }),
                        jenis_pelanggaran: jp.nama_pelanggaran,
                        poin: jp.poin,
                        status: status,
                        keterangan: `Pelanggaran ${jp.nama_pelanggaran} terdeteksi oleh sistem demo.`
                    }
                });
            }
        }
    }

    // --- 5. SEED SPECIFIC DEMO USERS (Requested by User) ---
    // Moved up so they can be included in allGurus for schedule seeding
    console.log('👤 Seeding Specific Demo Users (Admin, Guru, Siswa, Petugas)...');
    
    const roleSiswa = await prisma.role.findFirst({ where: { name: 'SISWA', tenant_id: null } });
    const roleGuru = await prisma.role.findFirst({ where: { name: 'GURU', tenant_id: null } });
    
    const defaultGuruPass = await bcrypt.hash('guru1234', 10);
    const defaultSiswaPass = await bcrypt.hash('siswa1234', 10);
    const petugasPass = await bcrypt.hash('petugas1234', 10);
    const gerbangPass = await bcrypt.hash('gerbang1234', 10);

    const firstKelas = allKelas[0];

    // 5a. Specific Guru (guru@gmail.com)
    const uGuru = await prisma.user.upsert({
        where: { tenant_id_email: { tenant_id: tenantId, email: 'guru@gmail.com' } },
        update: { password: defaultGuruPass },
        create: {
            tenant_id: tenantId,
            email: 'guru@gmail.com',
            password: defaultGuruPass,
            full_name: 'Guru Demo Reguler',
            role_id: roleGuru?.id || '',
            status: 'ACTIVE',
            email_verified: true,
            has_completed_onboarding: true
        }
    });
    await prisma.guru.upsert({
        where: { user_id: uGuru.id },
        update: {},
        create: { tenant_id: tenantId, user_id: uGuru.id, nip: 'GURU-DEMO-001', nama_guru: 'Guru Demo Reguler' }
    });

    // 5b. Specific Siswa (siswa@gmail.com)
    const uSiswa = await prisma.user.upsert({
        where: { tenant_id_email: { tenant_id: tenantId, email: 'siswa@gmail.com' } },
        update: { password: defaultSiswaPass },
        create: {
            tenant_id: tenantId,
            email: 'siswa@gmail.com',
            password: defaultSiswaPass,
            full_name: 'Siswa Demo Reguler',
            role_id: roleSiswa?.id || '',
            status: 'ACTIVE',
            email_verified: true,
            has_completed_onboarding: true
        }
    });
    await prisma.siswa.upsert({
        where: { user_id: uSiswa.id },
        update: { kelas_id: firstKelas.id },
        create: { 
            tenant_id: tenantId, 
            user_id: uSiswa.id, 
            nis: 'SISWA-001', 
            nama_siswa: 'Siswa Demo Reguler', 
            kelas_id: firstKelas.id,
            jenis_kelamin: 'L'
        }
    });

    // 5c. Siswa Petugas (petugas@gmail.com)
    const uPetugas = await prisma.user.upsert({
        where: { tenant_id_email: { tenant_id: tenantId, email: 'petugas@gmail.com' } },
        update: { password: petugasPass },
        create: {
            tenant_id: tenantId,
            email: 'petugas@gmail.com',
            password: petugasPass,
            full_name: 'Siswa Petugas',
            role_id: roleSiswa?.id || '',
            status: 'ACTIVE',
            email_verified: true,
            has_completed_onboarding: true
        }
    });
    await prisma.siswa.upsert({
        where: { user_id: uPetugas.id },
        update: { kelas_id: firstKelas.id },
        create: { 
            tenant_id: tenantId, 
            user_id: uPetugas.id, 
            nis: 'PETUGAS-001', 
            nama_siswa: 'Siswa Petugas', 
            kelas_id: firstKelas.id,
            jenis_kelamin: 'L'
        }
    });

    // Assign as PETUGAS_KELAS in StrukturOrganisasi
    const posPetugas = await prisma.organizationalPosition.findFirst({
        where: { tenant_id: tenantId, code: 'PETUGAS_KELAS' }
    });
    if (posPetugas) {
        await prisma.organizationalAssignment.upsert({
            where: { user_id_position_id_kelas_id: { user_id: uPetugas.id, position_id: posPetugas.id, kelas_id: firstKelas.id } },
            update: { is_active: true },
            create: {
                tenant_id: tenantId,
                user_id: uPetugas.id,
                position_id: posPetugas.id,
                kelas_id: firstKelas.id,
                is_active: true
            }
        });
        console.log('✅ Siswa Petugas assigned to PETUGAS_KELAS');
    }

    // 5d. Guru Gerbang (gerbang@gmail.com)
    const uGerbang = await prisma.user.upsert({
        where: { tenant_id_email: { tenant_id: tenantId, email: 'gerbang@gmail.com' } },
        update: { password: gerbangPass },
        create: {
            tenant_id: tenantId,
            email: 'gerbang@gmail.com',
            password: gerbangPass,
            full_name: 'Guru Gerbang',
            role_id: roleGuru?.id || '',
            status: 'ACTIVE',
            email_verified: true,
            has_completed_onboarding: true
        }
    });
    await prisma.guru.upsert({
        where: { user_id: uGerbang.id },
        update: {},
        create: { tenant_id: tenantId, user_id: uGerbang.id, nip: 'GURU-GERBANG-001', nama_guru: 'Guru Gerbang' }
    });

    // 5e. Guru Walas (walas@gmail.com)
    const walasPass = await bcrypt.hash('walas1234', 10);
    const uWalas = await prisma.user.upsert({
        where: { tenant_id_email: { tenant_id: tenantId, email: 'walas@gmail.com' } },
        update: { password: walasPass },
        create: {
            tenant_id: tenantId,
            email: 'walas@gmail.com',
            password: walasPass,
            full_name: 'Guru Walas X-RPL-1',
            role_id: roleGuru?.id || '',
            status: 'ACTIVE',
            email_verified: true,
            has_completed_onboarding: true
        }
    });
    await prisma.guru.upsert({
        where: { user_id: uWalas.id },
        update: {},
        create: { tenant_id: tenantId, user_id: uWalas.id, nip: 'GURU-WALAS-001', nama_guru: 'Guru Walas X-RPL-1' }
    });
    const posWalas = await prisma.organizationalPosition.findFirst({
        where: { tenant_id: tenantId, code: 'WALIKELAS' }
    });
    const targetKelas = await prisma.kelas.findFirst({ where: { tenant_id: tenantId, nama_kelas: 'X-RPL-1' } });
    if (posWalas && targetKelas) {
        await prisma.organizationalAssignment.upsert({
            where: { user_id_position_id_kelas_id: { user_id: uWalas.id, position_id: posWalas.id, kelas_id: targetKelas.id } },
            update: { is_active: true },
            create: {
                tenant_id: tenantId,
                user_id: uWalas.id,
                position_id: posWalas.id,
                kelas_id: targetKelas.id,
                is_active: true
            }
        });
        console.log('✅ Guru Walas assigned to WALIKELAS (X-RPL-1)');
    }

    // 5f. Other Structure Roles (Kesiswaan, Kurikulum, Kepsek)
    const otherRoles = [
        { email: 'kesiswaan@gmail.com', pass: 'kesiswaan1234', name: 'Waka Kesiswaan', code: 'KESISWAAN' },
        { email: 'kurikulum@gmail.com', pass: 'kurikulum1234', name: 'Waka Kurikulum', code: 'KURIKULUM' },
        { email: 'kepsek@gmail.com', pass: 'kepsek1234', name: 'Kepala Sekolah', code: 'KEPALA_SEKOLAH' }
    ];

    for (const data of otherRoles) {
        const hashedPass = await bcrypt.hash(data.pass, 10);
        const u = await prisma.user.upsert({
            where: { tenant_id_email: { tenant_id: tenantId, email: data.email } },
            update: { password: hashedPass },
            create: {
                tenant_id: tenantId,
                email: data.email,
                password: hashedPass,
                full_name: data.name,
                role_id: roleGuru?.id || '',
                status: 'ACTIVE',
                email_verified: true,
                has_completed_onboarding: true
            }
        });
        await prisma.guru.upsert({
            where: { user_id: u.id },
            update: {},
            create: { tenant_id: tenantId, user_id: u.id, nip: `GURU-${data.code}-001`, nama_guru: data.name }
        });
        const pos = await prisma.organizationalPosition.findFirst({
            where: { tenant_id: tenantId, code: data.code }
        });
        if (pos) {
            const existingAssign = await prisma.organizationalAssignment.findFirst({
                where: { user_id: u.id, position_id: pos.id }
            });
            if (!existingAssign) {
                await prisma.organizationalAssignment.create({
                    data: {
                        tenant_id: tenantId,
                        user_id: u.id,
                        position_id: pos.id,
                        is_active: true
                    }
                });
            } else {
                await prisma.organizationalAssignment.update({
                    where: { id: existingAssign.id },
                    data: { is_active: true }
                });
            }
            console.log(`✅ ${data.name} assigned to ${data.code}`);
        }
    }

    // --- 6. SEED SUBJECTS & SCHEDULES (Expanded Mon-Sat) ---
    console.log('📅 Seeding Mapel & JadwalTemplate (Senin - Sabtu) with Special Activities...');
    
    // Ensure JenisKegiatanMaster follows Platform Registration Defaults
    await seedDefaultJenisKegiatanForTenant(tenantId);

    const subjectsTitles = ['Matematika', 'Bahasa Inggris', 'Bahasa Indonesia', 'Produktif RPL', 'PAI', 'Olahraga'];
    const createdMapels = [];

    for (const title of subjectsTitles) {
        let mapel = await prisma.mapel.findFirst({
            where: { tenant_id: tenantId, nama_mapel: title }
        });

        if (!mapel) {
            mapel = await prisma.mapel.create({
                data: {
                    tenant_id: tenantId,
                    nama_mapel: title,
                    kode_mapel: title.slice(0, 3).toUpperCase() + faker.string.numeric(2)
                }
            });
        }
        createdMapels.push(mapel);
    }

    // --- 6.1 ASSIGN GURU MAPEL TO DEMO ACCOUNTS ---
    console.log('🔗 Assigning Guru Mapel to demo accounts...');
    const demoTeacherAssignments = [
        { email: 'guru@gmail.com', mapels: ['Olahraga', 'PAI'] },
        { email: 'walas@gmail.com', mapels: ['Produktif RPL', 'Bahasa Inggris'] },
        { email: 'kesiswaan@gmail.com', mapels: ['Bahasa Indonesia'] },
        { email: 'kurikulum@gmail.com', mapels: ['Matematika'] }
    ];

    for (const assign of demoTeacherAssignments) {
        const user = await prisma.user.findFirst({ where: { tenant_id: tenantId, email: assign.email } });
        if (!user) continue;

        const guru = await prisma.guru.findFirst({ where: { user_id: user.id } });
        if (!guru) continue;

        for (const title of assign.mapels) {
            const mapel = createdMapels.find(m => m.nama_mapel === title);
            if (mapel) {
                await prisma.guruMapel.create({
                    data: {
                        tenant_id: tenantId,
                        guru_id: guru.id,
                        mapel_id: mapel.id
                    }
                });
            }
        }
    }

    let allGurus = await prisma.guru.findMany({ where: { tenant_id: tenantId } });
    
    // Ensure enough teachers
    if (allGurus.length < allKelas.length) {
        console.log(`👨‍🏫 Creating additional teachers to avoid collisions...`);
        const guruPassword = await prisma.user.findFirst({ where: { email: { contains: 'guru' } } }).then(u => u?.password) 
            || '$2b$10$EixZAYVK1VzKNzM9fS.S.O23hX.Gf0jDkYxYkYxYkYxYkYxYkYxY';

        for (let i = allGurus.length; i < allKelas.length + 5; i++) {
            const email = `guru_extra_${i}@${tenantDomain}.com`;
            const name = faker.person.fullName();
            const user = await prisma.user.create({
                data: {
                    tenant_id: tenantId,
                    email,
                    password: guruPassword,
                    full_name: name,
                    role_id: roleGuru?.id || '',
                    status: 'ACTIVE',
                    email_verified: true
                }
            });
            await prisma.guru.create({
                data: {
                    tenant_id: tenantId,
                    user_id: user.id,
                    nip: `199${faker.string.numeric(10)}`,
                    nama_guru: name
                }
            });
        }
        allGurus = await prisma.guru.findMany({ where: { tenant_id: tenantId } });
    }

    // Clean all existing templates
    console.log('🧹 Clearing all schedule templates for tenant...');
    await prisma.jadwalTemplate.deleteMany({ where: { tenant_id: tenantId } });

    const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const kbmSlots = [
        { start: '08:00', end: '09:30' },
        { start: '09:30', end: '11:00' },
        { start: '11:15', end: '12:45' },
        { start: '13:30', end: '15:00' }
    ];

    for (let dIdx = 0; dIdx < days.length; dIdx++) {
        const day = days[dIdx];
        const todayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(new Date()).toUpperCase();
        console.log(`📝 Seeding schedules for ${day}... (Today is ${todayName})`);

        for (let kIndex = 0; kIndex < allKelas.length; kIndex++) {
            const kelas = allKelas[kIndex];

            // 1. Start Activities
            if (day === 'SENIN') {
                await prisma.jadwalTemplate.create({
                    data: {
                        tenant_id: tenantId, kelas_id: kelas.id, hari: day as Hari,
                        jam_mulai: '07:00', jam_selesai: '07:45',
                        jenis_kegiatan: 'Upacara', tahun_pelajaran_id: tapel.id, semester_id: semester.id
                    }
                });
            } else if (day === 'JUMAT') {
                await prisma.jadwalTemplate.create({
                    data: {
                        tenant_id: tenantId, kelas_id: kelas.id, hari: day as Hari,
                        jam_mulai: '07:00', jam_selesai: '07:45',
                        jenis_kegiatan: 'Duha', tahun_pelajaran_id: tapel.id, semester_id: semester.id
                    }
                });
            } else {
                // Selasa - Sabtu: Apel Datang
                await prisma.jadwalTemplate.create({
                    data: {
                        tenant_id: tenantId, kelas_id: kelas.id, hari: day as Hari,
                        jam_mulai: '07:00', jam_selesai: '07:15',
                        jenis_kegiatan: 'Apel Datang', tahun_pelajaran_id: tapel.id, semester_id: semester.id
                    }
                });
            }

            // 2. KBM Slots
            for (let i = 0; i < kbmSlots.length; i++) {
                const slot = kbmSlots[i];
                // Variance using day index + class index + slot index
                const mapelIdx = (dIdx + kIndex + i) % createdMapels.length;
                const mapel = createdMapels[mapelIdx];
                
                // Guru allocation: deterministic per slot to avoid collisions
                const guruIdx = (kIndex + i + (dIdx * 2)) % allGurus.length;
                const guru = allGurus[guruIdx];

                const template = await prisma.jadwalTemplate.create({
                    data: {
                        tenant_id: tenantId, kelas_id: kelas.id, hari: day as Hari,
                        jam_mulai: slot.start, jam_selesai: slot.end,
                        mapel_id: mapel.id, guru_id: guru.id, jenis_kegiatan: 'KBM',
                        tahun_pelajaran_id: tapel.id, semester_id: semester.id
                    }
                });

                // --- 2.1 CREATE LIVE SESSIONS FOR TODAY ---
                if (day === todayName) {
                    console.log(`   🚀 Creating live session for ${mapel.nama_mapel} in ${kelas.nama_kelas}...`);
                    
                    const todayDate = new Date();
                    const [hM, mM] = slot.start.split(':').map(Number);
                    const [hS, mS] = slot.end.split(':').map(Number);
                    
                    const startTime = new Date(todayDate);
                    startTime.setHours(hM, mM, 0, 0);
                    
                    const endTime = new Date(todayDate);
                    endTime.setHours(hS, mS, 0, 0);

                    const session = await prisma.sesiAbsensi.create({
                        data: {
                            tenant_id: tenantId,
                            kelas_id: kelas.id,
                            guru_id: guru.id,
                            mapel_id: mapel.id,
                            jenis_kegiatan: 'KBM',
                            tanggal: todayDate,
                            waktu_mulai: startTime,
                            waktu_selesai: endTime,
                            tahun_pelajaran_id: tapel.id,
                            semester_id: semester.id,
                            status: 'BERLANGSUNG',
                            sumber_sesi: 'TEMPLATE',
                            jadwal_template_id: template.id
                        }
                    });

                    // Create Guru Attendance (Already present in dashboard, simulate 'Hadir' for half)
                    await prisma.absenGuru.create({
                        data: {
                            tenant_id: tenantId,
                            sesi_id: session.id,
                            guru_id: guru.id,
                            status: Math.random() > 0.3 ? 'Hadir' : 'Belum Hadir',
                            waktu_tap: new Date(),
                            tahun_pelajaran_id: tapel.id,
                            semester_id: semester.id
                        }
                    });

                    // Create Student Attendance for all students in class
                    const students = await prisma.siswa.findMany({
                        where: { tenant_id: tenantId, kelas_id: kelas.id }
                    });

                    for (const s of students) {
                        const statuses = ['HADIR', 'HADIR', 'HADIR', 'SAKIT', 'IZIN', 'ALPA'];
                        const status = statuses[Math.floor(Math.random() * statuses.length)];
                        
                        // Need to find the SiswaAkademik record
                        const academic = await prisma.siswaAkademik.findFirst({
                            where: { siswa_id: s.id, tahun_pelajaran_id: tapel.id, semester_id: semester.id }
                        });

                        if (!academic) continue;

                        await prisma.absenSiswa.create({
                            data: {
                                tenant_id: tenantId,
                                sesi_id: session.id,
                                siswa_id: s.id,
                                siswa_akademik_id: academic.id,
                                status: status,
                                waktu_tap: status === 'HADIR' ? new Date() : null
                            }
                        });
                    }
                }
            }

            // 3. End Activities (Selasa - Sabtu)
            if (day !== 'SENIN' && day !== 'JUMAT') {
                await prisma.jadwalTemplate.create({
                    data: {
                        tenant_id: tenantId, kelas_id: kelas.id, hari: day as Hari,
                        jam_mulai: '15:00', jam_selesai: '15:15',
                        jenis_kegiatan: 'Apel Pulang', tahun_pelajaran_id: tapel.id, semester_id: semester.id
                    }
                });
            }
        }
    }

    console.log('✨ Seeding Data Demo Selesai! Selamat mencoba dashboard baru.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
