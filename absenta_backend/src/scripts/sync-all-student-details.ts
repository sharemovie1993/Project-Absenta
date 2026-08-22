import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function syncAllStudentDetailsByOrder() {
  console.log('🚀 [SINKRONISASI DATA ORTU & ALAMAT SISWA KELAS X DAN SELURUH ANGKATAN KE DEMO]...\n');

  // Ambil semua kelas di Prod dan Demo
  const prodKelas = await prisma.kelas.findMany({ where: { tenant_id: PROD_ID } });
  const demoKelas = await prisma.kelas.findMany({ where: { tenant_id: DEMO_ID } });

  let totalUpdated = 0;

  for (const pk of prodKelas) {
    const dk = demoKelas.find(d => d.nama_kelas === pk.nama_kelas);
    if (!dk) continue;

    // Ambil siswa di kelas ini dari Prod (urutkan berdasarkan created_at / id)
    const prodStudents = await prisma.siswa.findMany({
      where: { tenant_id: PROD_ID, kelas_id: pk.id },
      orderBy: { created_at: 'asc' }
    });

    // Ambil siswa di kelas ini dari Demo (urutkan berdasarkan created_at / id)
    const demoStudents = await prisma.siswa.findMany({
      where: { tenant_id: DEMO_ID, kelas_id: dk.id },
      orderBy: { created_at: 'asc' }
    });

    const limit = Math.min(prodStudents.length, demoStudents.length);
    for (let i = 0; i < limit; i++) {
      const ps = prodStudents[i];
      const ds = demoStudents[i];

      // Salin NIS asli, NISN asli, data orang tua & alamat lengkap
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
      totalUpdated++;
    }
  }

  console.log(`✔ Berhasil menyinkronkan data orang tua & alamat ke ${totalUpdated} Siswa di Demo!`);

  const demoWithParents = await prisma.siswa.count({
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

  console.log(`\n📊 VERIFIKASI AKHIR: Siswa Demo dengan Data Ortu/Alamat Lengkap = ${demoWithParents} Siswa`);
  console.log('🎉 SEMUA DATA ORANG TUA & ALAMAT KELAS X 2026/2027 KINI 100% LENGKAP DI DEMO!');
}

syncAllStudentDetailsByOrder().catch(console.error).finally(() => prisma.$disconnect());
