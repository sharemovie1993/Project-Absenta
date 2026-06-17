import { PrismaClient } from '@prisma/client';
import { fakerID_ID as faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedCore(tenantId: string) {
    console.log('🌱 Seeding Core Data (Siswa & Guru)...');

    // 0. Seed MasterSekolah (For fast lookup without scraping)
    await prisma.masterSekolah.upsert({
        where: { npsn: '20229659' },
        update: {},
        create: {
            npsn: '20229659',
            nama: 'SMK Negeri 1 Cimahi',
            status_sekolah: 'NEGERI',
            bentuk_pendidikan: 'SMK',
            jenjang: 'SMK',
            akreditasi: 'A',
            alamat: 'Jl. Mahar Martanegara No. 48',
            kelurahan: 'Utama',
            kecamatan: 'Cimahi Selatan',
            kota: 'Kota Cimahi',
            provinsi: 'Jawa Barat',
            kode_pos: '40533',
            telepon: '022-6629683',
            website: 'https://smkn1cimahi.sch.id',
            kepala_sekolah: 'AGUS KUSMANA, S.Pd., M.T.',
            fetched_at: new Date()
        }
    });

    // 1. Create Academic Master Data (Tahun Ajaran, Kelas, Jurusan)

    // --- Tahun Pelajaran ---
    await prisma.tahunPelajaran.upsert({
        where: { tenant_id_tahun: { tenant_id: tenantId, tahun: '2025/2026' } },
        update: {},
        create: {
            tenant_id: tenantId,
            tahun: '2025/2026',
            is_active: true
        }
    });

    // --- Jurusan ---
    const jurusanList = ['RPL', 'TKJ'];
    const createdJurusan = [];
    for (const j of jurusanList) {
        const jurusan = await prisma.jurusan.upsert({
            where: { tenant_id_kode: { tenant_id: tenantId, kode: j } },
            update: {},
            create: {
                tenant_id: tenantId,
                kode: j,
                nama: `Jurusan ${j}`
            }
        });
        createdJurusan.push(jurusan);
    }

    // --- Kelas ---
    // Note: Schema does not have unique constraint on [tenant_id, nama_kelas], so we check manually
    const tingkatMap: Record<string, number> = { 'X': 10, 'XI': 11, 'XII': 12 };
    const kelasLabels = ['X', 'XI', 'XII'];
    const createdKelas = [];

    for (const label of kelasLabels) {
        for (const jur of createdJurusan) {
            const namaKelas = `${label}-${jur.kode}-1`;
            const tingkat = tingkatMap[label];
            
            let kelas = await prisma.kelas.findFirst({
                where: { tenant_id: tenantId, nama_kelas: namaKelas }
            });

            if (!kelas) {
                kelas = await prisma.kelas.create({
                    data: {
                        tenant_id: tenantId,
                        nama_kelas: namaKelas,
                        jurusan_id: jur.id,
                        tingkat: tingkat
                    }
                });
            }
            createdKelas.push(kelas);
        }
    }

    // 1.5 Create Tenant Admin
    const roleAdmin = await prisma.role.findFirst({ where: { name: 'ADMIN', tenant_id: null } });
    if (!roleAdmin) throw new Error('Role ADMIN not found');

    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminEmail = `admin@smkn1cimahi.com`;

    await prisma.user.upsert({
        where: { tenant_id_email: { tenant_id: tenantId, email: adminEmail } },
        update: {},
        create: {
            tenant_id: tenantId,
            email: adminEmail,
            password: adminPassword,
            full_name: 'Admin Sekolah',
            role_id: roleAdmin.id,
            status: 'ACTIVE',
            email_verified: true
        }
    });
    console.log(`✅ Admin Created: ${adminEmail}`);

    // 2. Create Guru (5 Data)
    // Need Role GURU
    const roleGuru = await prisma.role.findFirst({ where: { name: 'GURU', tenant_id: null } });
    if (!roleGuru) throw new Error('Role GURU not found');

    const hashedPassword = await bcrypt.hash('guru123', 10);

    for (let i = 0; i < 5; i++) {
        const nip = `1980${faker.string.numeric(10)}`;
        const email = `guru${i}@${tenantId}.com`;
        const nama = faker.person.fullName();

        // Create User first
        const user = await prisma.user.upsert({
            where: { tenant_id_email: { tenant_id: tenantId, email } },
            update: {},
            create: {
                tenant_id: tenantId,
                email,
                password: hashedPassword,
                full_name: nama,
                role_id: roleGuru.id,
                status: 'ACTIVE',
                email_verified: true
            }
        });

        // Create Guru Profile
        await prisma.guru.upsert({
            where: { user_id: user.id },
            update: {},
            create: {
                tenant_id: tenantId,
                user_id: user.id,
                nip,
                nama_guru: nama,
                jenis_kelamin: faker.helpers.arrayElement(['L', 'P']),
                status_kepegawaian: 'PNS',
                no_hp: faker.phone.number(),
                alamat: faker.location.streetAddress()
            }
        });
    }

    // 3. Create Siswa (20 Data)
    // Need Role SISWA (Optional, usually Siswa don't need User account immediately, but for Login they do)
    // We will create User for Siswa too for completeness of "Unified Login"
    const roleSiswa = await prisma.role.findFirst({ where: { name: 'SISWA', tenant_id: null } });
    if (!roleSiswa) throw new Error('Role SISWA not found');
    
    const siswaPassword = await bcrypt.hash('raka1234', 10);

    // 2.5 Explicitly Create "Raka" for testing
    const rakaEmail = 'raka@gmail.com';
    const rakaUser = await prisma.user.upsert({
        where: { tenant_id_email: { tenant_id: tenantId, email: rakaEmail } },
        update: {},
        create: {
            tenant_id: tenantId,
            email: rakaEmail,
            password: siswaPassword,
            full_name: 'Raka Student',
            role_id: roleSiswa.id,
            status: 'ACTIVE',
            email_verified: true,
            has_completed_onboarding: true
        }
    });

    const targetKelas = createdKelas[0];
    await prisma.siswa.upsert({
        where: { user_id: rakaUser.id },
        update: {},
        create: {
            tenant_id: tenantId,
            user_id: rakaUser.id,
            nis: '20250001',
            nama_siswa: 'Raka Student',
            jenis_kelamin: 'L',
            tempat_lahir: 'Cimahi',
            tanggal_lahir: new Date('2007-05-15'),
            alamat: 'Jl. Setiabudi No. 123',
            no_hp: '081234567890',
            nama_ayah: 'Ayah Raka',
            nama_ibu: 'Ibu Raka',
            kelas_id: targetKelas.id,
            status: 'AKTIF',
            no_rfid: 'ABC123XYZ'
        }
    });

    // 2.6 Create "Hidayat Catur Pamungkas" for testing
    const hidayatEmail = 'hidayat.catur.pamungkas@gmail.com';
    const hidayatUser = await prisma.user.upsert({
        where: { tenant_id_email: { tenant_id: tenantId, email: hidayatEmail } },
        update: {},
        create: {
            tenant_id: tenantId,
            email: hidayatEmail,
            password: siswaPassword,
            full_name: 'Hidayat Catur Pamungkas',
            role_id: roleSiswa.id,
            status: 'ACTIVE',
            email_verified: true,
            has_completed_onboarding: true
        }
    });

    await prisma.siswa.upsert({
        where: { user_id: hidayatUser.id },
        update: {},
        create: {
            tenant_id: tenantId,
            user_id: hidayatUser.id,
            nis: '20250002',
            nama_siswa: 'Hidayat Catur Pamungkas',
            jenis_kelamin: 'L',
            tempat_lahir: 'Bandung',
            tanggal_lahir: new Date('2007-08-20'),
            alamat: 'Jl. Ahmad Yani No. 45',
            no_hp: '081987654321',
            nama_ayah: 'Yono Catur',
            nama_ibu: 'Paris Safitri',
            kelas_id: targetKelas.id,
            status: 'AKTIF',
            no_rfid: '0X2D5DCABDEB'
        }
    });

    // 2.7 Create "Nabila Nur Azizah" for testing
    const nabilaEmail = 'nabila.nur.azizah@gmail.com';
    const nabilaUser = await prisma.user.upsert({
        where: { tenant_id_email: { tenant_id: tenantId, email: nabilaEmail } },
        update: {},
        create: {
            tenant_id: tenantId,
            email: nabilaEmail,
            password: siswaPassword,
            full_name: 'Nabila Nur Azizah',
            role_id: roleSiswa.id,
            status: 'ACTIVE',
            email_verified: true,
            has_completed_onboarding: true
        }
    });

    await prisma.siswa.upsert({
        where: { user_id: nabilaUser.id },
        update: {},
        create: {
            tenant_id: tenantId,
            user_id: nabilaUser.id,
            nis: '20250003',
            nama_siswa: 'Nabila Nur Azizah',
            jenis_kelamin: 'P',
            tempat_lahir: 'Bandung',
            tanggal_lahir: new Date('2007-03-10'),
            alamat: 'Jl. Gatot Subroto No. 8',
            no_hp: '081122334455',
            nama_ayah: 'Maheswara',
            nama_ibu: 'Yolanda Puti',
            kelas_id: targetKelas.id,
            status: 'AKTIF',
            no_rfid: '0X75AFA9C34F'
        }
    });

    const defaultSiswaPassword = await bcrypt.hash('siswa123', 10);

    for (let i = 0; i < 20; i++) {
        const nis = `2025${faker.string.numeric(4)}`;
        const email = `siswa${nis}@${tenantId}.com`;
        const nama = faker.person.fullName();
        const kelas = faker.helpers.arrayElement(createdKelas);

        // Create User
        let userSiswa = null;
        try {
             userSiswa = await prisma.user.upsert({
                where: { tenant_id_email: { tenant_id: tenantId, email } },
                update: {},
                create: {
                    tenant_id: tenantId,
                    email,
                    password: defaultSiswaPassword,
                    full_name: nama,
                    role_id: roleSiswa.id,
                    status: 'ACTIVE',
                    email_verified: true
                }
            });
        } catch (e) {
            console.log(`Skipping user creation for ${email} (might exist)`);
            userSiswa = await prisma.user.findUnique({ where: { tenant_id_email: { tenant_id: tenantId, email } } });
        }

        if (!userSiswa) continue;

        await prisma.siswa.upsert({
            where: { tenant_id_nis: { tenant_id: tenantId, nis } },
            update: {},
            create: {
                tenant_id: tenantId,
                user_id: userSiswa.id,
                nis,
                nama_siswa: nama,
                jenis_kelamin: faker.helpers.arrayElement(['L', 'P']),
                tempat_lahir: faker.location.city(),
                tanggal_lahir: faker.date.birthdate({ min: 15, max: 18, mode: 'age' }),
                alamat: faker.location.streetAddress(),
                no_hp: faker.phone.number(),
                nama_ayah: faker.person.fullName({ sex: 'male' }),
                nama_ibu: faker.person.fullName({ sex: 'female' }),
                // no_hp_ortu removed as it is not in schema
                kelas_id: kelas.id,
                status: 'AKTIF',
                no_rfid: faker.string.hexadecimal({ length: 10 }).toUpperCase()
            }
        });
    }
}
