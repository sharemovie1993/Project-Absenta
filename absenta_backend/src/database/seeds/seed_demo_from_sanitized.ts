import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { ensureTenantBaseRoles } from './seed_policies';

const prisma = new PrismaClient();

export async function seedDemoFromSanitized() {
  console.log('🚀 [DEMO RESTORER] Memulai penyemaian Tenant Demo dari Dataset Produksi Riil (Tersanitasi)...');

  const datasetPath = path.join(__dirname, 'demo_sanitized_dataset.json');
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`File dataset "${datasetPath}" tidak ditemukan.`);
  }

  const raw = fs.readFileSync(datasetPath, 'utf-8');
  const data = JSON.parse(raw);

  const DEMO_TENANT_ID = '2acb7e12-d264-4784-8262-8f7369061542';
  const DEMO_SUBDOMAIN = 'demo';
  const DEMO_CUSTOM_DOMAIN = 'demo.absenta.id';

  // 1. Inisialisasi Tenant Demo
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
        name: 'SMKN 1 Plered (Portal Demo Absenta)',
        subdomain: DEMO_SUBDOMAIN,
        custom_domain: DEMO_CUSTOM_DOMAIN,
        status: 'ACTIVE',
      }
    });
  } else {
    demoTenant = await prisma.tenant.create({
      data: {
        id: DEMO_TENANT_ID,
        name: 'SMKN 1 Plered (Portal Demo Absenta)',
        subdomain: DEMO_SUBDOMAIN,
        custom_domain: DEMO_CUSTOM_DOMAIN,
        status: 'ACTIVE',
      }
    });
  }

  const effectiveTenantId = demoTenant.id;
  console.log(`✅ Tenant Demo Aktif: ${demoTenant.name} (ID: ${effectiveTenantId})`);

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

  // 1.2 Pastikan Subscription Tenant Demo Aktif
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

  // 2. Roles & Permissions Baseline
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

  // 3. Tahun Pelajaran & Semester
  console.log(`📅 Menyemai ${data.tahunPelajarans.length} Tahun Pelajaran...`);
  const tahunMap: Record<string, string> = {};
  for (const tp of data.tahunPelajarans) {
    const res = await prisma.tahunPelajaran.upsert({
      where: { tenant_id_tahun: { tenant_id: effectiveTenantId, tahun: tp.tahun } },
      update: { is_active: tp.is_active },
      create: {
        tenant_id: effectiveTenantId,
        tahun: tp.tahun,
        is_active: tp.is_active
      }
    });
    tahunMap[tp.id] = res.id;
  }

  // 4. Jurusan & Kelas
  console.log(`🏫 Menyemai ${data.jurusans.length} Jurusan & ${data.kelases.length} Kelas...`);
  const jurusanMap: Record<string, string> = {};
  for (const jur of data.jurusans) {
    const res = await prisma.jurusan.upsert({
      where: { tenant_id_kode: { tenant_id: effectiveTenantId, kode: jur.kode } },
      update: { nama: jur.nama, singkatan: jur.singkatan },
      create: {
        tenant_id: effectiveTenantId,
        kode: jur.kode,
        nama: jur.nama,
        singkatan: jur.singkatan
      }
    });
    jurusanMap[jur.id] = res.id;
  }

  const kelasMap: Record<string, string> = {};
  for (const kl of data.kelases) {
    let existing = await prisma.kelas.findFirst({
      where: { tenant_id: effectiveTenantId, nama_kelas: kl.nama_kelas }
    });
    if (!existing) {
      existing = await prisma.kelas.create({
        data: {
          tenant_id: effectiveTenantId,
          nama_kelas: kl.nama_kelas,
          tingkat: kl.tingkat,
          jurusan_id: kl.jurusan_id ? jurusanMap[kl.jurusan_id] || null : null,
          is_active: kl.is_active ?? true,
        }
      });
    }
    kelasMap[kl.id] = existing.id;
  }

  // 5. Jenis Kegiatan Master
  console.log(`🎯 Menyemai ${data.jenisKegiatans.length} Master Ekstrakurikuler/Kegiatan...`);
  for (const jk of data.jenisKegiatans) {
    let existing = await prisma.jenisKegiatanMaster.findFirst({
      where: { tenant_id: effectiveTenantId, nama: jk.nama }
    });
    if (!existing) {
      await prisma.jenisKegiatanMaster.create({
        data: {
          tenant_id: effectiveTenantId,
          nama: jk.nama,
          tipe: jk.tipe || 'ESKUL',
          aktif: jk.aktif ?? true,
        }
      });
    }
  }

  // 6. Mata Pelajaran
  console.log(`📚 Menyemai ${data.matapelajarans.length} Mata Pelajaran...`);
  for (const mp of data.matapelajarans) {
    let existing = await prisma.mapel.findFirst({
      where: { tenant_id: effectiveTenantId, nama_mapel: mp.nama_mapel }
    });
    if (!existing) {
      await prisma.mapel.create({
        data: {
          tenant_id: effectiveTenantId,
          nama_mapel: mp.nama_mapel,
          kode_mapel: mp.kode_mapel || mp.nama_mapel.slice(0, 5).toUpperCase(),
          kelompok_mapel: mp.kelompok_mapel || mp.kelompok || 'UMUM',
          tingkat: mp.tingkat || null,
        }
      });
    }
  }

  // 7. Akun Administrator Tenant & Guru/Tendik
  console.log(`👨‍🏫 Menyemai Akun Admin & ${data.gurus.length} Guru & Tendik Riil (Tersanitasi)...`);
  const guruUserMap: Record<string, { userId: string; guruId: string }> = {};

  // Dedicated Admin Sekolah
  await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: effectiveTenantId, email: 'admin@absenta.id' } },
    update: {
      full_name: 'Administrator Sekolah (Demo)',
      password: data.gurus[0]?.user.password_hash,
      role_id: roleAdminId,
      status: 'ACTIVE',
      email_verified: true,
    },
    create: {
      tenant_id: effectiveTenantId,
      email: 'admin@absenta.id',
      full_name: 'Administrator Sekolah (Demo)',
      password: data.gurus[0]?.user.password_hash,
      role_id: roleAdminId,
      status: 'ACTIVE',
      email_verified: true,
    }
  });

  for (const g of data.gurus) {
    const isPimpinan = g.user.email.includes('kepsek@') || g.user.email.includes('tu@') || g.user.email.includes('gerbang@');
    const assignedRole = isPimpinan ? roleAdminId : roleGuruId;

    // Upsert User
    const user = await prisma.user.upsert({
      where: { tenant_id_email: { tenant_id: effectiveTenantId, email: g.user.email } },
      update: {
        full_name: g.user.full_name,
        password: g.user.password_hash,
        role_id: assignedRole,
        status: 'ACTIVE',
        email_verified: true,
      },
      create: {
        tenant_id: effectiveTenantId,
        email: g.user.email,
        full_name: g.user.full_name,
        password: g.user.password_hash,
        role_id: assignedRole,
        status: 'ACTIVE',
        email_verified: true,
      }
    });

    // Upsert Profil Guru
    const guru = await prisma.guru.upsert({
      where: { user_id: user.id },
      update: {
        nama_guru: g.nama_guru,
        nip: g.nip,
        no_hp: g.no_hp,
        tenant_id: effectiveTenantId,
        status_kepegawaian: g.status_kepegawaian,
        jenis_ptk: g.jenis_ptk,
      },
      create: {
        user_id: user.id,
        nama_guru: g.nama_guru,
        nip: g.nip,
        no_hp: g.no_hp,
        tenant_id: effectiveTenantId,
        status_kepegawaian: g.status_kepegawaian,
        jenis_ptk: g.jenis_ptk,
      }
    });

    guruUserMap[g.id] = { userId: user.id, guruId: guru.id };
    if (g.user_id) {
      guruUserMap[g.user_id] = { userId: user.id, guruId: guru.id };
    }
  }

  // 8. Organizational Positions & Assignments
  console.log(`🏛️ Menyemai ${data.positions.length} Posisi & ${data.assignments.length} Penugasan Riil...`);
  const posMap: Record<string, string> = {};

  for (const pos of data.positions) {
    const position = await prisma.organizationalPosition.upsert({
      where: {
        tenant_id_code: {
          tenant_id: effectiveTenantId,
          code: pos.code,
        }
      },
      update: {
        name: pos.name,
        scope_type: pos.scope_type || 'TENANT',
      },
      create: {
        tenant_id: effectiveTenantId,
        code: pos.code,
        name: pos.name,
        scope_type: pos.scope_type || 'TENANT',
      }
    });
    posMap[pos.id] = position.id;
  }

  for (const assign of data.assignments) {
    const targetPosId = posMap[assign.position_id];
    const targetUserInfo = guruUserMap[assign.user_id];

    if (targetPosId && targetUserInfo?.userId) {
      const mappedKelasId = assign.kelas_id ? kelasMap[assign.kelas_id] || null : null;
      const mappedUnitId = assign.unit_id ? jurusanMap[assign.unit_id] || null : null;

      const existing = await prisma.organizationalAssignment.findFirst({
        where: {
          tenant_id: effectiveTenantId,
          position_id: targetPosId,
          user_id: targetUserInfo.userId,
          kelas_id: mappedKelasId,
        }
      });

      if (!existing) {
        await prisma.organizationalAssignment.create({
          data: {
            tenant_id: effectiveTenantId,
            position_id: targetPosId,
            user_id: targetUserInfo.userId,
            kelas_id: mappedKelasId,
            unit_id: mappedUnitId,
          }
        });
      }
    }
  }

  // 9. Siswa & Users
  console.log(`🎒 Menyemai ${data.siswas.length} Siswa Riil (Tersanitasi)...`);
  let batchCount = 0;
  for (const s of data.siswas) {
    const targetKelasId = s.kelas_id ? kelasMap[s.kelas_id] || null : null;

    let targetUserId = null;
    if (s.user) {
      const user = await prisma.user.upsert({
        where: { tenant_id_email: { tenant_id: effectiveTenantId, email: s.user.email } },
        update: {
          full_name: s.user.full_name,
          password: s.user.password_hash,
          role_id: roleSiswaId,
          status: 'ACTIVE',
          email_verified: true,
        },
        create: {
          tenant_id: effectiveTenantId,
          email: s.user.email,
          full_name: s.user.full_name,
          password: s.user.password_hash,
          role_id: roleSiswaId,
          status: 'ACTIVE',
          email_verified: true,
        }
      });
      targetUserId = user.id;
    }

    let existingSiswa = await prisma.siswa.findFirst({
      where: {
        OR: [
          { tenant_id: effectiveTenantId, nis: s.nis },
          ...(targetUserId ? [{ user_id: targetUserId }] : [])
        ]
      }
    });

    if (existingSiswa) {
      await prisma.siswa.update({
        where: { id: existingSiswa.id },
        data: {
          tenant_id: effectiveTenantId,
          nama_siswa: s.nama_siswa,
          nis: s.nis,
          nisn: s.nisn,
          kelas_id: targetKelasId,
          user_id: targetUserId,
          no_hp: s.no_hp,
          jenis_kelamin: s.jenis_kelamin,
        }
      });
    } else {
      await prisma.siswa.create({
        data: {
          tenant_id: effectiveTenantId,
          nama_siswa: s.nama_siswa,
          nis: s.nis,
          nisn: s.nisn,
          kelas_id: targetKelasId,
          user_id: targetUserId,
          no_hp: s.no_hp,
          jenis_kelamin: s.jenis_kelamin,
        }
      });
    }

    batchCount++;
    if (batchCount % 500 === 0) {
      console.log(`   ⏳ Tersinkronisasi ${batchCount} / ${data.siswas.length} siswa...`);
    }
  }

  // 10. Tambah Akun Ortu Demo
  await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: effectiveTenantId, email: 'ortu@absenta.id' } },
    update: {
      full_name: 'Bapak Hartono (Orang Tua Murid Demo)',
      password: data.gurus[0]?.user.password_hash,
      role_id: roleOrtuId,
      status: 'ACTIVE',
      email_verified: true,
    },
    create: {
      tenant_id: effectiveTenantId,
      email: 'ortu@absenta.id',
      full_name: 'Bapak Hartono (Orang Tua Murid Demo)',
      password: data.gurus[0]?.user.password_hash,
      role_id: roleOrtuId,
      status: 'ACTIVE',
      email_verified: true,
    }
  });

  console.log(`🎉 [DEMO RESTORE SUKSES] 100% Data riil SMKN 1 Plered berhasil disemai & disanitasi ke Portal Demo!`);
}

// Support direct execution via `npx ts-node src/database/seeds/seed_demo_from_sanitized.ts`
if (require.main === module) {
  seedDemoFromSanitized()
    .catch((e) => {
      console.error('❌ Error executing Demo Restorer:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
