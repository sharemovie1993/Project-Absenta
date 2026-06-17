import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { domain: 'smkn1cimahi' } });
  if (!tenant) {
    console.error('Tenant smkn1cimahi not found. Please run seed.ts first.');
    return;
  }

  console.log('🌱 Seeding Integration Data (Hubin, Sarpras, TU)...');

  // --- HUBIN ---
  console.log('🔗 Seeding Hubin...');
  await (prisma as any).mitraIndustri.createMany({
    data: [
      {
        tenant_id: tenant.id,
        nama: 'PT Solusi Teknologi Indonesia',
        bidang: 'Information Technology',
        alamat: 'Bandung',
        kontak: '08123456789'
      },
      {
        tenant_id: tenant.id,
        nama: 'Astra International',
        bidang: 'Automotive',
        alamat: 'Jakarta',
        kontak: '08123456780'
      }
    ],
    skipDuplicates: true
  });

  const mitraList = await (prisma as any).mitraIndustri.findMany({ where: { tenant_id: tenant.id } });
  const siswaList = await prisma.siswa.findMany({ where: { tenant_id: tenant.id }, take: 5 });
  const guru = await prisma.guru.findFirst({ where: { tenant_id: tenant.id } });

  if (mitraList.length > 0 && siswaList.length > 0) {
    await (prisma as any).siswaPkl.createMany({
      data: siswaList.map((siswa, index) => ({
        tenant_id: tenant.id,
        siswa_id: siswa.id,
        mitra_id: mitraList[index % mitraList.length].id,
        tanggal_mulai: new Date(),
        status: 'AKTIF',
        pembimbing_id: guru?.id
      })),
      skipDuplicates: true
    });
  }

  // --- SARPRAS ---
  console.log('📦 Seeding Sarpras...');
  
  // 1. Categories
  await (prisma as any).sarprasCategory.upsert({
    where: { tenant_id_nama: { tenant_id: tenant.id, nama: 'Elektronik' } },
    update: {},
    create: { tenant_id: tenant.id, nama: 'Elektronik', deskripsi: 'Aset elektronik dan gadget' }
  });
  const catElektronik = await (prisma as any).sarprasCategory.findFirst({ where: { tenant_id: tenant.id, nama: 'Elektronik' } });

  // 2. Locations
  await (prisma as any).sarprasLocation.upsert({
    where: { tenant_id_nama: { tenant_id: tenant.id, nama: 'Laboratorium RPL' } },
    update: {},
    create: { tenant_id: tenant.id, nama: 'Laboratorium RPL', deskripsi: 'Lab Rekayasa Perangkat Lunak' }
  });
  const locLab = await (prisma as any).sarprasLocation.findFirst({ where: { tenant_id: tenant.id, nama: 'Laboratorium RPL' } });

  await (prisma as any).sarprasLocation.upsert({
    where: { tenant_id_nama: { tenant_id: tenant.id, nama: 'Ruang Guru' } },
    update: {},
    create: { tenant_id: tenant.id, nama: 'Ruang Guru', deskripsi: 'Ruang kerja guru' }
  });
  const locGuru = await (prisma as any).sarprasLocation.findFirst({ where: { tenant_id: tenant.id, nama: 'Ruang Guru' } });

  // 3. Assets
  await (prisma as any).sarprasAsset.upsert({
    where: { kode: 'LAP-001' },
    update: {},
    create: {
      tenant_id: tenant.id,
      nama: 'Laptop ASUS ROG',
      kode: 'LAP-001',
      category_id: catElektronik?.id,
      location_id: locLab?.id,
      kondisi: 'BAIK',
      jumlah: 10,
      is_loanable: true
    }
  });

  await (prisma as any).sarprasAsset.upsert({
    where: { kode: 'PROJ-001' },
    update: {},
    create: {
      tenant_id: tenant.id,
      nama: 'Proyektor Epson',
      kode: 'PROJ-001',
      category_id: catElektronik?.id,
      location_id: locGuru?.id,
      kondisi: 'BAIK',
      jumlah: 5,
      is_loanable: true
    }
  });

  const asset = await (prisma as any).sarprasAsset.findFirst({ where: { tenant_id: tenant.id } });
  const user = await prisma.user.findFirst({ where: { tenant_id: tenant.id } });
  
  if (asset && user) {
    const existingLoan = await (prisma as any).sarprasLoan.findFirst({
        where: { asset_id: asset.id, peminjam_id: user.id, status: 'DIPINJAM' }
    });
    if (!existingLoan) {
        await (prisma as any).sarprasLoan.create({
          data: {
            tenant_id: tenant.id,
            asset_id: asset.id,
            peminjam_id: user.id,
            status: 'DIPINJAM',
            catatan: 'Pinjam untuk presentasi'
          }
        });
    }
  }

  // --- TU ---
  console.log('📑 Seeding TU...');
  await (prisma as any).suratMasuk.createMany({
    data: [
      {
        tenant_id: tenant.id,
        nomor_surat: '001/DISDIK/IV/2026',
        judul: 'Undangan Rapat Koordinasi Kurikulum',
        asal_surat: 'Dinas Pendidikan',
        tanggal_surat: new Date()
      }
    ],
    skipDuplicates: true
  });

  await (prisma as any).suratKeluar.createMany({
    data: [
      {
        tenant_id: tenant.id,
        nomor_surat: '045/SMKN1/IV/2026',
        judul: 'Permohonan Magang Siswa',
        tujuan_surat: 'PT Solusi Teknologi Indonesia',
        tanggal_surat: new Date()
      }
    ],
    skipDuplicates: true
  });

  console.log('✅ Integration Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
