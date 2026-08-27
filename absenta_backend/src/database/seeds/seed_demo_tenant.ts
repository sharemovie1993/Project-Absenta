import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { STRUKTUR_CODES } from '../../config/organization-structure';
import { ensureTenantBaseRoles } from './seed_policies';
import { seedDefaultJenisKegiatanForTenant } from '../../modules/academic/jenis-kegiatan-master/services/jenis-kegiatan-master.service';

const prisma = new PrismaClient();

export async function seedDemoTenant() {
  console.log('🚀 [DEMO SEEDER] Memulai inisialisasi Tenant Demo Absenta...');

  const DEMO_TENANT_ID = '2acb7e12-d264-4784-8262-8f7369061542';
  const DEMO_SUBDOMAIN = 'demo';
  const DEMO_CUSTOM_DOMAIN = 'demo.absenta.id';
  const DEFAULT_PASSWORD = await bcrypt.hash('password123', 10);

  // 1. Dapatkan atau Buat Tenant Demo
  let demoTenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { id: DEMO_TENANT_ID },
        { subdomain: DEMO_SUBDOMAIN },
        { custom_domain: DEMO_CUSTOM_DOMAIN }
      ]
    }
  });

  if (demoTenant) {
    demoTenant = await prisma.tenant.update({
      where: { id: demoTenant.id },
      data: {
        name: 'SMK Negeri 1 Absenta (Demo Portal)',
        subdomain: DEMO_SUBDOMAIN,
        custom_domain: DEMO_CUSTOM_DOMAIN,
        status: 'ACTIVE',
      }
    });
  } else {
    demoTenant = await prisma.tenant.create({
      data: {
        id: DEMO_TENANT_ID,
        name: 'SMK Negeri 1 Absenta (Demo Portal)',
        subdomain: DEMO_SUBDOMAIN,
        custom_domain: DEMO_CUSTOM_DOMAIN,
        status: 'ACTIVE',
      }
    });
  }

  const effectiveTenantId = demoTenant.id;
  console.log(`✅ Tenant Demo Siap: ${demoTenant.name} (ID: ${effectiveTenantId}, Subdomain: ${demoTenant.subdomain})`);

  // 1.1 Pastikan Plan Enterprise Full Suite Ada
  const allFeatures = [
    'CORE',
    'ABSENSI',
    'KOPERASI',
    'REPORTING',
    'RAPOR',
    'PPDB',
    'PERPUSTAKAAN',
    'HUBIN',
    'SARPRAS',
    'WHATSAPP',
    'ACADEMIC',
    'KESISWAAN',
    'KURIKULUM',
    'BPBK',
    'BKK',
    'EXAM',
  ];

  const demoPlan = await prisma.plan.upsert({
    where: { code: 'ENTERPRISE_DEMO' },
    update: {
      name: 'Absenta Enterprise Full Suite (Demo Showcase)',
      service_code: 'ALL',
      max_user: 99999,
      features_json: allFeatures,
      absensi_mode: 'MULTI_SESI',
    },
    create: {
      code: 'ENTERPRISE_DEMO',
      name: 'Absenta Enterprise Full Suite (Demo Showcase)',
      service_code: 'ALL',
      price_monthly: 0,
      max_user: 99999,
      features_json: allFeatures,
      absensi_mode: 'MULTI_SESI',
    }
  });

  // 1.2 Pastikan Subscription Tenant Demo Aktif & Terhubung ke Plan Full Suite
  const existingSub = await prisma.subscription.findFirst({
    where: { tenant_id: effectiveTenantId }
  });
  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        tenant_id: effectiveTenantId,
        plan_id: demoPlan.id,
        service_code: 'ALL',
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
      }
    });
  } else {
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        plan_id: demoPlan.id,
        service_code: 'ALL',
        status: 'ACTIVE',
        end_date: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
      }
    });
  }

  // 2. Pastikan Role Baseline Tenant Demo Siap
  const roleMap = await ensureTenantBaseRoles(effectiveTenantId);

  let roleOrtu = await prisma.role.findFirst({ 
    where: { 
      OR: [
        { tenant_id: effectiveTenantId, name: 'ORANG_TUA' },
        { tenant_id: null, name: 'ORANG_TUA' }
      ]
    } 
  });
  if (!roleOrtu) {
    roleOrtu = await prisma.role.create({
      data: {
        tenant_id: effectiveTenantId,
        name: 'ORANG_TUA',
        description: 'Orang Tua / Wali Murid',
        is_system: true
      }
    });
  }

  const roleAdminId = roleMap['ADMIN'];
  const roleGuruId = roleMap['GURU'];
  const roleSiswaId = roleMap['SISWA'];
  const roleOrtuId = roleOrtu.id;

  // 3. Inisialisasi Master Data Akademik Demo (Tahun Ajaran, Jurusan, Kelas)
  await prisma.tahunPelajaran.upsert({
    where: { tenant_id_tahun: { tenant_id: effectiveTenantId, tahun: '2025/2026' } },
    update: { is_active: true },
    create: {
      tenant_id: effectiveTenantId,
      tahun: '2025/2026',
      is_active: true
    }
  });

  // Master Jurusan
  const jurusanList = [
    { kode: 'TJKT', nama: 'Teknik Jaringan Komputer dan Telekomunikasi' },
    { kode: 'TKRO', nama: 'Teknik Kendaraan Ringan Otomotif' },
    { kode: 'AKL', nama: 'Akuntansi dan Keuangan Lembaga' },
    { kode: 'KUL', nama: 'Kuliner' }
  ];

  const jurusans: Record<string, any> = {};
  for (const j of jurusanList) {
    const jur = await prisma.jurusan.upsert({
      where: { tenant_id_kode: { tenant_id: effectiveTenantId, kode: j.kode } },
      update: { nama: j.nama },
      create: {
        tenant_id: effectiveTenantId,
        kode: j.kode,
        nama: j.nama
      }
    });
    jurusans[j.kode] = jur;
  }

  // Master Kelas Unggulan Demo: X TJKT 1
  const kelases: Record<string, any> = {};
  const kelasDefs = [
    { nama: 'X TJKT 1', tingkat: 10, jur: 'TJKT' },
    { nama: 'X TJKT 2', tingkat: 10, jur: 'TJKT' },
    { nama: 'XI TJKT 1', tingkat: 11, jur: 'TJKT' },
    { nama: 'XII TJKT 1', tingkat: 12, jur: 'TJKT' },
    { nama: 'X TKRO 1', tingkat: 10, jur: 'TKRO' },
    { nama: 'X AKL 1', tingkat: 10, jur: 'AKL' },
  ];

  for (const k of kelasDefs) {
    let kl = await prisma.kelas.findFirst({
      where: { tenant_id: effectiveTenantId, nama_kelas: k.nama }
    });
    if (!kl) {
      kl = await prisma.kelas.create({
        data: {
          tenant_id: effectiveTenantId,
          nama_kelas: k.nama,
          tingkat: k.tingkat,
          jurusan_id: jurusans[k.jur]?.id
        }
      });
    }
    kelases[k.nama] = kl;
  }

  // Seed default jenis kegiatan
  try {
    await seedDefaultJenisKegiatanForTenant(effectiveTenantId);
  } catch {}

  const targetDemoClass = kelases['X TJKT 1'];

  // 4. Daftar Akun Demo & Pemetaan Jabatan Fungsional
  const DEMO_ACCOUNTS = [
    // ── 👑 PIMPINAN ──
    { email: 'kepsek@absenta.id', name: 'Dr. H. Ahmad Fauzi, M.Pd', role: roleAdminId, roleCode: STRUKTUR_CODES.KEPALA_SEKOLAH, nip: '197001011995011001' },
    { email: 'kurikulum@absenta.id', name: 'Dra. Hj. Siti Rahma, M.Pd', role: roleGuruId, roleCode: STRUKTUR_CODES.KURIKULUM, nip: '197502022000012002' },
    { email: 'kesiswaan@absenta.id', name: 'Budi Santoso, S.Pd', role: roleGuruId, roleCode: STRUKTUR_CODES.KESISWAAN, nip: '198003032005011003' },
    { email: 'hubin@absenta.id', name: 'Agus Setiawan, S.T', role: roleGuruId, roleCode: STRUKTUR_CODES.HUBIN, nip: '198204042008011004' },
    { email: 'sarpras@absenta.id', name: 'Ir. Hendra Gunawan', role: roleGuruId, roleCode: STRUKTUR_CODES.SARPRAS, nip: '197805052003011005' },
    { email: 'tu@absenta.id', name: 'Ahmad Hidayat, S.AP', role: roleAdminId, roleCode: STRUKTUR_CODES.TU_KEPALA, nip: '198506062010011006' },

    // ── 💼 MANAJEMEN & UNIT ──
    { email: 'bpbk@absenta.id', name: 'Nurul Aini, S.Psi', role: roleGuruId, roleCode: STRUKTUR_CODES.BPBK, nip: '198807072012012007' },
    { email: 'bkk@absenta.id', name: 'Denny Ramdani, S.Pd', role: roleGuruId, roleCode: STRUKTUR_CODES.BKK, nip: '198708082011011008' },
    { email: 'kaprog@absenta.id', name: 'Indra Lesmana, M.Kom', role: roleGuruId, roleCode: STRUKTUR_CODES.KAPROG, nip: '198409092009011009', unit_id: jurusans['TJKT']?.id },
    { email: 'kabeng@absenta.id', name: 'Mulyadi, S.T', role: roleGuruId, roleCode: STRUKTUR_CODES.KABENG, nip: '198610102010011010', unit_id: jurusans['TJKT']?.id },
    { email: 'toolman@absenta.id', name: 'Asep Supriatna', role: roleGuruId, roleCode: STRUKTUR_CODES.TOOLMAN, nip: '199011112015011011', unit_id: jurusans['TJKT']?.id },
    { email: 'gerbang@absenta.id', name: 'Rudi Hermawan', role: roleAdminId, roleCode: STRUKTUR_CODES.GERBANG, nip: '199212122018011012' },

    // ── 🏛️ TATA USAHA ──
    { email: 'tu.persuratan@absenta.id', name: 'Fitri Handayani, S.Sos', role: roleAdminId, roleCode: STRUKTUR_CODES.TU_PERSURATAN, nip: '199101132014012013' },
    { email: 'tu.keuangan@absenta.id', name: 'Dewi Lestari, S.E', role: roleAdminId, roleCode: STRUKTUR_CODES.TU_KEUANGAN, nip: '199302142016012014' },
    { email: 'tu.kepegawaian@absenta.id', name: 'Ginanzhar Sudiarto, S.Kom', role: roleAdminId, roleCode: STRUKTUR_CODES.TU_KEPEGAWAIAN, nip: '198903152013011015' },
    { email: 'tu.sarpras@absenta.id', name: 'Depi Kurniawan', role: roleAdminId, roleCode: STRUKTUR_CODES.TU_SARPRAS, nip: '199404162017011016' },
    { email: 'tu.buku-induk@absenta.id', name: 'Rina Marlina, A.Md', role: roleAdminId, roleCode: STRUKTUR_CODES.TU_PERSURATAN, nip: '199505172018012017' },
    { email: 'tu.inventaris@absenta.id', name: 'Hadi Prasetyo', role: roleAdminId, roleCode: STRUKTUR_CODES.TU_SARPRAS, nip: '199606182019011018' },
    { email: 'tu.arsip@absenta.id', name: 'Novi Anggraeni, S.AP', role: roleAdminId, roleCode: STRUKTUR_CODES.TU_PERSURATAN, nip: '199707192020012019' },

    // ── 🛒 KOPERASI ERP ──
    { email: 'koperasi.ketua@absenta.id', name: 'Indra Mohamad Gozali, S.Pd', role: roleGuruId, roleCode: STRUKTUR_CODES.KETUA_KOPERASI, nip: '198504202022211000' },
    { email: 'koperasi.bendahara@absenta.id', name: 'Dani Setiawan, S.E', role: roleGuruId, roleCode: STRUKTUR_CODES.BENDAHARA_KOPERASI, nip: '198003072023211000' },
    { email: 'koperasi.sekretaris@absenta.id', name: 'Sarip Hidayat, S.Pd.I', role: roleGuruId, roleCode: STRUKTUR_CODES.SEKRETARIS_KOPERASI, nip: '198210262025211000' },
    { email: 'koperasi.kasir@absenta.id', name: 'Tati Karyati, S.Pd', role: roleAdminId, roleCode: STRUKTUR_CODES.MANAJER_TOKO_KOPERASI, nip: '198509102022212000' },
    { email: 'koperasi.gudang@absenta.id', name: 'Yayan Sopian', role: roleAdminId, roleCode: STRUKTUR_CODES.MANAJER_TOKO_KOPERASI, nip: '198808112022211000' },
    { email: 'koperasi.pengawas@absenta.id', name: 'Siswoko, S.T', role: roleGuruId, roleCode: STRUKTUR_CODES.PENGAWAS_KOPERASI, nip: '197509092022211000' },

    // ── 👨‍🏫 GURU & WALI KELAS (1 KELAS: X TJKT 1) ──
    { email: 'walikelas@absenta.id', name: 'Ai Kustiani, S.Pd.', role: roleGuruId, roleCode: STRUKTUR_CODES.WALIKELAS, nip: '198710222011012022', kelas_id: targetDemoClass?.id },
    { email: 'guru@absenta.id', name: 'Erwin, S.Pd.', role: roleGuruId, roleCode: 'GURU_MAPEL', nip: '198911232014011023' },
    { email: 'guru.piket@absenta.id', name: 'Rian Hidayat, S.Pd', role: roleGuruId, roleCode: STRUKTUR_CODES.GERBANG, nip: '199010152015011025' },
    { email: 'pembina.osis@absenta.id', name: 'Dedi Kurniawan, S.Pd', role: roleGuruId, roleCode: STRUKTUR_CODES.PEMBINA_ESKUL, nip: '199201202016011026' },
    { email: 'pembina.ekskul@absenta.id', name: 'Eko Prasetyo, S.Pd', role: roleGuruId, roleCode: STRUKTUR_CODES.PEMBINA_ESKUL, nip: '199112242017011024' },
    { email: 'eskul@absenta.id', name: 'Eko Prasetyo, S.Pd', role: roleGuruId, roleCode: STRUKTUR_CODES.PEMBINA_ESKUL, nip: '199112242017011024' },
  ];

  console.log(`👥 Menyemai ${DEMO_ACCOUNTS.length} Akun Guru & Staf Demo...`);

  for (const acc of DEMO_ACCOUNTS) {
    // 1. Upsert User
    const user = await prisma.user.upsert({
      where: { tenant_id_email: { tenant_id: effectiveTenantId, email: acc.email } },
      update: {
        full_name: acc.name,
        password: DEFAULT_PASSWORD,
        role_id: acc.role,
        status: 'ACTIVE',
        email_verified: true,
      },
      create: {
        tenant_id: effectiveTenantId,
        email: acc.email,
        full_name: acc.name,
        password: DEFAULT_PASSWORD,
        role_id: acc.role,
        status: 'ACTIVE',
        email_verified: true,
      }
    });

    // 2. Upsert Profil Guru
    await prisma.guru.upsert({
      where: { user_id: user.id },
      update: {
        nama_guru: acc.name,
        nip: acc.nip,
        tenant_id: effectiveTenantId,
        status_kepegawaian: 'PNS',
        jenis_ptk: 'PENDIDIK',
      },
      create: {
        user_id: user.id,
        nama_guru: acc.name,
        nip: acc.nip,
        tenant_id: effectiveTenantId,
        status_kepegawaian: 'PNS',
        jenis_ptk: 'PENDIDIK',
      }
    });

    // 3. Upsert OrganizationalPosition jika memiliki roleCode khusus
    if (acc.roleCode && acc.roleCode !== 'GURU_MAPEL') {
      const position = await prisma.organizationalPosition.upsert({
        where: {
          tenant_id_code: {
            tenant_id: effectiveTenantId,
            code: acc.roleCode,
          }
        },
        update: {
          name: acc.roleCode.replace(/_/g, ' '),
        },
        create: {
          tenant_id: effectiveTenantId,
          code: acc.roleCode,
          name: acc.roleCode.replace(/_/g, ' '),
          scope_type: acc.kelas_id ? 'CLASS' : acc.unit_id ? 'UNIT' : 'TENANT',
        }
      });

      // Assign user ke posisi struktur
      const existingAssign = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: effectiveTenantId,
          position_id: position.id,
          user_id: user.id,
        }
      });

      if (!existingAssign) {
        await prisma.organizationalAssignment.create({
          data: {
            tenant_id: effectiveTenantId,
            position_id: position.id,
            user_id: user.id,
            kelas_id: acc.kelas_id || null,
            unit_id: acc.unit_id || null,
          }
        });
      }
    }
  }

  // ── 🎒 SISWA, PETUGAS KELAS & ORANG TUA (1 KELAS: X TJKT 1) ──
  console.log('🎒 Menyemai Akun Siswa, Petugas Kelas & Orang Tua Demo di Kelas X TJKT 1...');

  // 1. Siswa Demo (Amelia Reygina Putri di X TJKT 1)
  const userSiswa = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: effectiveTenantId, email: 'siswa@absenta.id' } },
    update: {
      full_name: 'Amelia Reygina Putri',
      password: DEFAULT_PASSWORD,
      role_id: roleSiswaId,
      status: 'ACTIVE',
      email_verified: true,
    },
    create: {
      tenant_id: effectiveTenantId,
      email: 'siswa@absenta.id',
      full_name: 'Amelia Reygina Putri',
      password: DEFAULT_PASSWORD,
      role_id: roleSiswaId,
      status: 'ACTIVE',
      email_verified: true,
    }
  });

  let siswaEntity = await prisma.siswa.findFirst({
    where: {
      OR: [
        { user_id: userSiswa.id },
        { tenant_id: effectiveTenantId, nis: '20251906' }
      ]
    }
  });

  if (siswaEntity) {
    siswaEntity = await prisma.siswa.update({
      where: { id: siswaEntity.id },
      data: {
        user_id: userSiswa.id,
        nama_siswa: 'Amelia Reygina Putri',
        tenant_id: effectiveTenantId,
        kelas_id: targetDemoClass?.id,
        jenis_kelamin: 'P',
        nama_ayah: 'Bapak Hartono',
        no_hp_ayah: '081234567890',
        no_hp_ortu: '081234567890',
      }
    });
  } else {
    siswaEntity = await prisma.siswa.create({
      data: {
        user_id: userSiswa.id,
        nama_siswa: 'Amelia Reygina Putri',
        nis: '20251906',
        nisn: '0071906001',
        tenant_id: effectiveTenantId,
        kelas_id: targetDemoClass?.id,
        jenis_kelamin: 'P',
        nama_ayah: 'Bapak Hartono',
        no_hp_ayah: '081234567890',
        no_hp_ortu: '081234567890',
      }
    });
  }

  // 2. Petugas Absensi Kelas (Putri Amelia di X TJKT 1)
  const userPetugas = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: effectiveTenantId, email: 'petugas.kelas@absenta.id' } },
    update: {
      full_name: 'Putri Amelia (Sekretaris Kelas)',
      password: DEFAULT_PASSWORD,
      role_id: roleSiswaId,
      status: 'ACTIVE',
      email_verified: true,
    },
    create: {
      tenant_id: effectiveTenantId,
      email: 'petugas.kelas@absenta.id',
      full_name: 'Putri Amelia (Sekretaris Kelas)',
      password: DEFAULT_PASSWORD,
      role_id: roleSiswaId,
      status: 'ACTIVE',
      email_verified: true,
    }
  });

  const existingPetugas = await prisma.siswa.findFirst({
    where: { user_id: userPetugas.id }
  });

  if (existingPetugas) {
    await prisma.siswa.update({
      where: { id: existingPetugas.id },
      data: {
        nama_siswa: 'Putri Amelia',
        tenant_id: effectiveTenantId,
        kelas_id: targetDemoClass?.id,
        jenis_kelamin: 'P',
      }
    });
  } else {
    await prisma.siswa.create({
      data: {
        user_id: userPetugas.id,
        nama_siswa: 'Putri Amelia',
        nis: '20251907',
        nisn: '0071907002',
        tenant_id: effectiveTenantId,
        kelas_id: targetDemoClass?.id,
        jenis_kelamin: 'P',
      }
    });
  }

  const positionPetugas = await prisma.organizationalPosition.upsert({
    where: {
      tenant_id_code: {
        tenant_id: effectiveTenantId,
        code: STRUKTUR_CODES.PETUGAS_KELAS,
      }
    },
    update: {
      name: 'Petugas Absensi Kelas',
    },
    create: {
      tenant_id: effectiveTenantId,
      code: STRUKTUR_CODES.PETUGAS_KELAS,
      name: 'Petugas Absensi Kelas',
      scope_type: 'CLASS',
    }
  });

  const existingAssignPetugas = await prisma.organizationalAssignment.findFirst({
    where: {
      tenant_id: effectiveTenantId,
      position_id: positionPetugas.id,
      user_id: userPetugas.id,
    }
  });
  if (!existingAssignPetugas) {
    await prisma.organizationalAssignment.create({
      data: {
        tenant_id: effectiveTenantId,
        position_id: positionPetugas.id,
        user_id: userPetugas.id,
        kelas_id: targetDemoClass?.id
      }
    });
  }

  // 3. User Orang Tua Demo (Bapak Hartono - Ayah Amelia di X TJKT 1)
  await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: effectiveTenantId, email: 'ortu@absenta.id' } },
    update: {
      full_name: 'Bapak Hartono (Orang Tua Amelia)',
      password: DEFAULT_PASSWORD,
      role_id: roleOrtuId,
      status: 'ACTIVE',
      email_verified: true,
    },
    create: {
      tenant_id: effectiveTenantId,
      email: 'ortu@absenta.id',
      full_name: 'Bapak Hartono (Orang Tua Amelia)',
      password: DEFAULT_PASSWORD,
      role_id: roleOrtuId,
      status: 'ACTIVE',
      email_verified: true,
    }
  });

  // Relasi OrangTua & OrangTuaSiswa
  let parentEntity = await prisma.orangTua.findFirst({
    where: { tenant_id: effectiveTenantId, email: 'ortu@absenta.id' }
  });
  if (!parentEntity) {
    parentEntity = await prisma.orangTua.create({
      data: {
        tenant_id: effectiveTenantId,
        nama: 'Bapak Hartono',
        email: 'ortu@absenta.id',
        no_hp: '081234567890',
        hubungan: 'AYAH'
      }
    });
  }

  const existingOrtuSiswa = await prisma.orangTuaSiswa.findFirst({
    where: {
      orang_tua_id: parentEntity.id,
      siswa_id: siswaEntity.id
    }
  });
  if (!existingOrtuSiswa) {
    await prisma.orangTuaSiswa.create({
      data: {
        orang_tua_id: parentEntity.id,
        siswa_id: siswaEntity.id
      }
    });
  }

  console.log('🎉 [DEMO SEEDER] Seluruh akun peran demo berhasil disemai & disinkronkan 100% pada Kelas X TJKT 1!');
}

// Support direct execution via `npx ts-node src/database/seeds/seed_demo_tenant.ts`
if (require.main === module) {
  seedDemoTenant()
    .catch((e) => {
      console.error('❌ Error executing Demo Seeder:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
