import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d482';

  // Check if tenant exists, if not create it
  let testTenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!testTenant) {
    // Create roles first if they don't exist
    await prisma.role.upsert({
      where: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
      update: {},
      create: {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        name: 'ADMIN',
      },
    });

    await prisma.role.upsert({
      where: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480' },
      update: {},
      create: {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
        name: 'GURU',
      },
    });

    await prisma.role.upsert({
      where: { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481' },
      update: {},
      create: {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481',
        name: 'SISWA',
      },
    });

    // Create tenant
    testTenant = await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Test School',
        domain: 'testschool.edu',
        status: 'ACTIVE',
      },
    });
  }

  // Create academic data
  // Create Jurusan
  const jurusanTI = await prisma.jurusan.upsert({
    where: {
      tenant_id_kode: {
        tenant_id: testTenant.id,
        kode: 'TI',
      },
    },
    update: {},
    create: {
      tenant_id: testTenant.id,
      nama: 'Teknik Informatika',
      kode: 'TI',
    },
  });

  const jurusanSI = await prisma.jurusan.upsert({
    where: {
      tenant_id_kode: {
        tenant_id: testTenant.id,
        kode: 'SI',
      },
    },
    update: {},
    create: {
      tenant_id: testTenant.id,
      nama: 'Sistem Informasi',
      kode: 'SI',
    },
  });

  // Get or create Tahun Pelajaran
  let tahunPelajaran = await prisma.tahunPelajaran.findFirst({
    where: {
      tenant_id: testTenant.id,
      tahun: '2024/2025',
    },
  });

  if (!tahunPelajaran) {
    tahunPelajaran = await prisma.tahunPelajaran.create({
      data: {
        tenant_id: testTenant.id,
        tahun: '2024/2025',
        is_active: true,
      },
    });
  }

  // Create Semester
  let semester1 = await prisma.semester.findFirst({
    where: {
      tenant_id: testTenant.id,
      tahun_pelajaran_id: tahunPelajaran.id,
      nama_semester: 'Semester 1',
    },
  });

  if (!semester1) {
    semester1 = await prisma.semester.create({
      data: {
        tenant_id: testTenant.id,
        tahun_pelajaran_id: tahunPelajaran.id,
        nama_semester: 'Semester 1',
        is_active: true,
      },
    });
  }

  // Create Mapel
  const mapelPemrograman = await prisma.mapel.upsert({
    where: {
      tenant_id_kode_mapel: {
        tenant_id: testTenant.id,
        kode_mapel: 'PWB',
      },
    },
    update: {},
    create: {
      tenant_id: testTenant.id,
      nama_mapel: 'Pemrograman Web',
      kode_mapel: 'PWB',
      tingkat: 1,
    },
  });

  const mapelDatabase = await prisma.mapel.upsert({
    where: {
      tenant_id_kode_mapel: {
        tenant_id: testTenant.id,
        kode_mapel: 'BD',
      },
    },
    update: {},
    create: {
      tenant_id: testTenant.id,
      nama_mapel: 'Basis Data',
      kode_mapel: 'BD',
      tingkat: 2,
    },
  });

  // Create Kelas
  let kelas1TI = await prisma.kelas.findFirst({
    where: {
      tenant_id: testTenant.id,
      nama_kelas: '1TI-A',
    },
  });

  if (!kelas1TI) {
    kelas1TI = await prisma.kelas.create({
      data: {
        tenant_id: testTenant.id,
        nama_kelas: '1TI-A',
        tingkat: 1,
        jurusan_id: jurusanTI.id,
      },
    });
  }

  let kelas2TI = await prisma.kelas.findFirst({
    where: {
      tenant_id: testTenant.id,
      nama_kelas: '2TI-A',
    },
  });

  if (!kelas2TI) {
    kelas2TI = await prisma.kelas.create({
      data: {
        tenant_id: testTenant.id,
        nama_kelas: '2TI-A',
        tingkat: 2,
        jurusan_id: jurusanTI.id,
      },
    });
  }

  // Create test user
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const testUser = await prisma.user.upsert({
    where: {
      tenant_id_email: {
        tenant_id: testTenant.id,
        email: 'admin@testschool.edu'
      }
    },
    update: {},
    create: {
      tenant_id: testTenant.id,
      email: 'admin@testschool.edu',
      password: hashedPassword,
      full_name: 'Test Admin',
      role_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // ADMIN role
    },
  });

  // Create Guru users and data
  const guruUsers = [];
  const guruData = [];

  for (let i = 1; i <= 15; i++) {
    const guruUser = await prisma.user.upsert({
      where: {
        tenant_id_email: {
          tenant_id: testTenant.id,
          email: `guru${i}@testschool.edu`
        }
      },
      update: {},
      create: {
        tenant_id: testTenant.id,
        email: `guru${i}@testschool.edu`,
        password: hashedPassword,
        full_name: `Guru Test ${i}`,
        role_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480', // GURU role
      },
    });
    guruUsers.push(guruUser);

    const guru = await prisma.guru.upsert({
      where: {
        tenant_id_nip: {
          tenant_id: testTenant.id,
          nip: `19800${i.toString().padStart(2, '0')}01001`
        }
      },
      update: {},
      create: {
        tenant_id: testTenant.id,
        user_id: guruUser.id,
        nama_guru: `Guru Test ${i}`,
        nip: `19800${i.toString().padStart(2, '0')}01001`,
      },
    });
    guruData.push(guru);
  }

  // Create Siswa users and data
  const siswaUsers = [];
  const siswaData = [];

  for (let i = 1; i <= 25; i++) {
    const siswaUser = await prisma.user.upsert({
      where: {
        tenant_id_email: {
          tenant_id: testTenant.id,
          email: `siswa${i}@testschool.edu`
        }
      },
      update: {},
      create: {
        tenant_id: testTenant.id,
        email: `siswa${i}@testschool.edu`,
        password: hashedPassword,
        full_name: `Siswa Test ${i}`,
        role_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d481', // SISWA role
      },
    });
    siswaUsers.push(siswaUser);

    const siswa = await prisma.siswa.upsert({
      where: {
        tenant_id_nis: {
          tenant_id: testTenant.id,
          nis: `2024${i.toString().padStart(3, '0')}`
        }
      },
      update: {},
      create: {
        tenant_id: testTenant.id,
        user_id: siswaUser.id,
        nama_siswa: `Siswa Test ${i}`,
        nis: `2024${i.toString().padStart(3, '0')}`,
        nisn: `1234567890${i.toString().padStart(2, '0')}`,
        tempat_lahir: 'Jakarta',
        tanggal_lahir: new Date('2005-01-01'),
        jenis_kelamin: i % 2 === 0 ? 'P' : 'L',
        alamat: `Jalan Siswa ${i}`,
        no_hp: `08987654321${i}`,
        kelas_id: i <= 12 ? kelas1TI.id : kelas2TI.id,
        tahun_pelajaran_id: tahunPelajaran.id,
        semester_id: semester1.id,
        status: 'AKTIF',
      },
    });
    siswaData.push(siswa);
  }

  // Assign wali kelas
  await prisma.waliKelas.upsert({
    where: {
      kelas_id: kelas1TI.id
    },
    update: {},
    create: {
      tenant_id: testTenant.id,
      guru_id: guruData[0].id,
      kelas_id: kelas1TI.id,
    },
  });

  await prisma.waliKelas.upsert({
    where: {
      kelas_id: kelas2TI.id
    },
    update: {},
    create: {
      tenant_id: testTenant.id,
      guru_id: guruData[1].id,
      kelas_id: kelas2TI.id,
    },
  });

  console.log('Seed data created successfully:');
  console.log('Tenant:', testTenant);
  console.log('Test User:', { email: testUser.email, full_name: testUser.full_name });
  console.log('Academic Data:', {
    jurusan: [jurusanTI, jurusanSI],
    tahunPelajaran,
    semester: semester1,
    mapel: [mapelPemrograman, mapelDatabase],
    kelas: [kelas1TI, kelas2TI],
    guru: `${guruData.length} guru created`,
    siswa: `${siswaData.length} siswa created`,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });