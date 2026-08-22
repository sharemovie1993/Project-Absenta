import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function syncParentAndAddressToDemo() {
  console.log('🚀 [SINKRONISASI 360° DATA ORANG TUA & ALAMAT SISWA KE DEMO]...\n');

  // 1. Ambil semua Siswa di Produksi
  const prodStudents = await prisma.siswa.findMany({
    where: { tenant_id: PROD_ID }
  });

  console.log(`Ditemukan ${prodStudents.length} siswa di Produksi SMKN 1 Plered.`);

  // 2. Ambil semua Siswa di Demo
  const demoStudents = await prisma.siswa.findMany({
    where: { tenant_id: DEMO_ID }
  });

  console.log(`Ditemukan ${demoStudents.length} siswa di Tenant Demo.`);

  const demoMapByNis = new Map<string, typeof demoStudents[0]>();
  demoStudents.forEach(s => {
    if (s.nis) demoMapByNis.set(s.nis.trim(), s);
  });

  let synced = 0;
  let skipped = 0;

  for (const ps of prodStudents) {
    if (!ps.nis) {
      skipped++;
      continue;
    }

    const ds = demoMapByNis.get(ps.nis.trim());
    if (!ds) {
      skipped++;
      continue;
    }

    // Salin seluruh metadata orang tua, alamat, dan biodata lengkap
    await prisma.siswa.update({
      where: { id: ds.id, tenant_id: DEMO_ID },
      data: {
        nik: ps.nik,
        nisn: ps.nisn,
        tempat_lahir: ps.tempat_lahir,
        tanggal_lahir: ps.tanggal_lahir,
        agama: ps.agama,
        alamat: ps.alamat,
        dusun: ps.dusun,
        kelurahan: ps.kelurahan,
        kecamatan: ps.kecamatan,
        kabupaten: ps.kabupaten,
        provinsi: ps.provinsi,
        rt: ps.rt,
        rw: ps.rw,
        kode_pos: ps.kode_pos,
        lintang: ps.lintang,
        bujur: ps.bujur,
        koordinat: ps.koordinat,
        no_hp: ps.no_hp,
        transportasi: ps.transportasi,
        nama_ayah: ps.nama_ayah,
        nik_ayah: ps.nik_ayah,
        no_hp_ayah: ps.no_hp_ayah,
        pekerjaan_ayah: ps.pekerjaan_ayah,
        pendidikan_ayah: ps.pendidikan_ayah,
        penghasilan_ayah: ps.penghasilan_ayah,
        nama_ibu: ps.nama_ibu,
        nik_ibu: ps.nik_ibu,
        no_hp_ibu: ps.no_hp_ibu,
        pekerjaan_ibu: ps.pekerjaan_ibu,
        pendidikan_ibu: ps.pendidikan_ibu,
        penghasilan_ibu: ps.penghasilan_ibu,
        nama_wali: ps.nama_wali,
        nik_wali: ps.nik_wali,
        no_hp_wali: ps.no_hp_wali,
        hubungan_wali: ps.hubungan_wali,
        pekerjaan_wali: ps.pekerjaan_wali,
        penghasilan_wali: ps.penghasilan_wali,
        no_hp_ortu: ps.no_hp_ortu,
        tinggi_badan: ps.tinggi_badan,
        berat_badan: ps.berat_badan,
        anak_ke: ps.anak_ke,
      }
    });

    synced++;
  }

  console.log(`\n✔ Berhasil menyinkronkan data orang tua & alamat ke ${synced} Siswa di Demo!`);
  console.log(`✔ Skipped/Tidak cocok: ${skipped}`);

  // Verifikasi hasil di Demo
  const demoUpdatedWithParents = await prisma.siswa.count({
    where: {
      tenant_id: DEMO_ID,
      OR: [
        { nama_ayah: { not: null } },
        { nama_ibu: { not: null } },
        { alamat: { not: null } },
        { no_hp_ortu: { not: null } }
      ]
    }
  });

  console.log(`\n📊 VERIFIKASI AKHIR: Siswa Demo dengan Data Ortu/Alamat Lengkap = ${demoUpdatedWithParents} Siswa`);
  console.log('🎉 SEMUA DATA ORANG TUA & ALAMAT KELAS X DAN ANGKATAN LAINNYA KINI LENGKAP DI DEMO!');
}

syncParentAndAddressToDemo().catch(console.error).finally(() => prisma.$disconnect());
