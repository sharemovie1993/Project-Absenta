import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROD_ID = '8535b49c-d3fc-4598-922a-7774b49ee7c5';
const DEMO_ID = '2acb7e12-d264-4784-8262-8f7369061542';

async function main() {
  console.log('=== INSPEKSI USER ===');
  const uProd = await prisma.user.findMany({ where: { tenant_id: PROD_ID }, take: 5 });
  const uDemo = await prisma.user.findMany({ where: { tenant_id: DEMO_ID }, take: 5 });
  console.log('Prod Users:', uProd.map(u => ({ email: u.email, name: u.full_name })));
  console.log('Demo Users:', uDemo.map(u => ({ email: u.email, name: u.full_name })));

  console.log('\n=== INSPEKSI GURU ===');
  const gProd = await prisma.guru.findMany({ where: { tenant_id: PROD_ID }, take: 5 });
  const gDemo = await prisma.guru.findMany({ where: { tenant_id: DEMO_ID }, take: 5 });
  console.log('Prod Gurus:', gProd.map(g => ({ nip: g.nip, name: g.nama_guru })));
  console.log('Demo Gurus:', gDemo.map(g => ({ nip: g.nip, name: g.nama_guru })));

  console.log('\n=== INSPEKSI SISWA ===');
  const sProd = await prisma.siswa.findMany({ where: { tenant_id: PROD_ID }, take: 5 });
  const sDemo = await prisma.siswa.findMany({ where: { tenant_id: DEMO_ID }, take: 5 });
  console.log('Prod Siswas:', sProd.map(s => ({ nis: s.nis, name: s.nama_siswa })));
  console.log('Demo Siswas:', sDemo.map(s => ({ nis: s.nis, name: s.nama_siswa })));

  console.log('\n=== INSPEKSI ERROR INSERT JenisKegiatanMaster & JadwalKBM ===');
  // Coba insert 1 baris JenisKegiatanMaster dengan print error detail
  const jkmProd = await prisma.jenisKegiatanMaster.findFirst({ where: { tenant_id: PROD_ID } });
  console.log('Sample JKM Prod:', jkmProd);
  if (jkmProd) {
    try {
      await prisma.jenisKegiatanMaster.create({
        data: {
          tenant_id: DEMO_ID,
          nama: jkmProd.nama,
          tipe: jkmProd.tipe,
          urutan: jkmProd.urutan,
          aktif: jkmProd.aktif,
        }
      });
      console.log('Insert JKM Success!');
    } catch (e: any) {
      console.log('Insert JKM Failed:', e.message);
    }
  }

  // Cek schema JadwalKBM
  const jKbmProd = await prisma.jadwalKBM.findFirst({ where: { tenant_id: PROD_ID } });
  console.log('Sample JadwalKBM Prod:', jKbmProd);
}

main().catch(console.error).finally(() => prisma.$disconnect());
