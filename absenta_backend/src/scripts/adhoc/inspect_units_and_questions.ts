import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Cek bank soal KODING
  const kodingBank = await prisma.cbtBankSoal.findFirst({
    where: {
      kode_bank: { contains: 'KODING', mode: 'insensitive' },
    },
    include: {
      Mapel: true,
      Soal: {
        orderBy: { nomor_urut: 'asc' },
        select: {
          id: true,
          nomor_urut: true,
          unit_pengajaran_id: true,
          konten_pertanyaan: true,
        },
      },
    },
  });

  if (kodingBank) {
    console.log(`=== BANK SOAL: ${kodingBank.kode_bank} ===`);
    console.log(`Judul: ${kodingBank.judul}`);
    console.log(`Mapel ID: ${kodingBank.mapel_id} (${kodingBank.Mapel?.nama_mapel})`);
    console.log(`Total Soal: ${kodingBank.Soal.length}`);
    const nomorUrutList = kodingBank.Soal.map((s) => s.nomor_urut);
    console.log(`Nomor Urut Soal:`, nomorUrutList.join(', '));

    // Cek UnitPengajaran untuk mapel ini
    const units = await prisma.unitPengajaran.findMany({
      where: {
        mapel_id: kodingBank.mapel_id,
      },
      select: {
        id: true,
        nama_unit: true,
        is_active: true,
      },
    });

    console.log(`\n=== UNIT PENGAJARAN MAPEL (${units.length} Unit) ===`);
    units.forEach((u, i) => {
      const qCount = kodingBank.Soal.filter((s) => s.unit_pengajaran_id === u.id).length;
      console.log(
        `${i + 1}. ID: ${u.id.slice(0, 8)} | nama_unit: "${u.nama_unit}" | active: ${u.is_active} | Soal: ${qCount}`
      );
    });
  }

  // 2. Cek semua bank soal untuk melihat apakah ada nomor_urut yang melompat / berlubang
  console.log(`\n=== AUDIT NOMOR URUT SELURUH BANK SOAL ===`);
  const allBanksWithQuestions = await prisma.cbtBankSoal.findMany({
    where: {
      Soal: { some: {} },
    },
    include: {
      Soal: {
        orderBy: { nomor_urut: 'asc' },
        select: { id: true, nomor_urut: true },
      },
    },
  });

  let banksWithGaps = 0;
  for (const b of allBanksWithQuestions) {
    const numbers = b.Soal.map((s) => s.nomor_urut);
    let hasGap = false;
    for (let i = 0; i < numbers.length; i++) {
      if (numbers[i] !== i + 1) {
        hasGap = true;
        break;
      }
    }
    if (hasGap) {
      banksWithGaps++;
      console.log(
        `⚠️  [GAP DETECTED] [${b.kode_bank}] "${b.judul}" | Total Soal: ${b.Soal.length} | Urutan Nomor: ${numbers.slice(0, 10).join(', ')}${numbers.length > 10 ? '...' : ''}`
      );
    }
  }
  console.log(`Total bank soal dengan nomor melompat: ${banksWithGaps} dari ${allBanksWithQuestions.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
