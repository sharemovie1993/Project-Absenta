import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const isExecute = process.argv.includes('--execute');
  console.log(`\n======================================================`);
  console.log(`NORMALIZE CBT SOAL NOMOR URUT`);
  console.log(`MODE: ${isExecute ? 'EXECUTE (DATABASE UPDATE)' : 'DRY RUN (INSPECTION ONLY)'}`);
  console.log(`======================================================\n`);

  const banks = await prisma.cbtBankSoal.findMany({
    where: {
      Soal: { some: {} },
    },
    select: {
      id: true,
      kode_bank: true,
      judul: true,
      jumlah_soal: true,
      Soal: {
        select: {
          id: true,
          nomor_urut: true,
          created_at: true,
        },
        orderBy: [{ nomor_urut: 'asc' }, { created_at: 'asc' }],
      },
    },
  });

  console.log(`Ditemukan ${banks.length} Bank Soal yang memiliki butir soal.\n`);

  let banksWithGaps = 0;
  let totalQuestionsReindexed = 0;

  for (const bank of banks) {
    const questions = bank.Soal;
    const currentNumbers = questions.map((q: any) => q.nomor_urut);
    const hasGapOrMismatch = questions.some((q: any, idx: number) => q.nomor_urut !== idx + 1);
    const countMismatch = bank.jumlah_soal !== questions.length;

    if (hasGapOrMismatch || countMismatch) {
      banksWithGaps++;
      console.log(`[PERLU NORMALISASI] ${bank.kode_bank} - "${bank.judul}"`);
      console.log(`  - Total Butir: ${questions.length} (jumlah_soal di DB: ${bank.jumlah_soal})`);
      console.log(`  - Nomor saat ini: ${currentNumbers.slice(0, 15).join(', ')}${currentNumbers.length > 15 ? '...' : ''} (Max: ${Math.max(...currentNumbers)})`);

      if (isExecute) {
        await prisma.$transaction(async (tx: any) => {
          for (let i = 0; i < questions.length; i++) {
            const targetNomor = i + 1;
            if (questions[i].nomor_urut !== targetNomor) {
              await tx.cbtSoal.update({
                where: { id: questions[i].id },
                data: { nomor_urut: targetNomor },
              });
              totalQuestionsReindexed++;
            }
          }

          if (countMismatch) {
            await tx.cbtBankSoal.update({
              where: { id: bank.id },
              data: { jumlah_soal: questions.length },
            });
          }
        });
        console.log(`  -> Berhasil dinormalisasi ke: 1 s.d. ${questions.length}\n`);
      } else {
        console.log(`  -> Rencana normalisasi ke: 1 s.d. ${questions.length}\n`);
      }
    }
  }

  console.log(`======================================================`);
  console.log(`RINGKASAN:`);
  console.log(`Total Bank Soal dianalisis : ${banks.length}`);
  console.log(`Bank Soal yang lompat/gap : ${banksWithGaps}`);
  if (isExecute) {
    console.log(`Total Soal yang di-reindex : ${totalQuestionsReindexed}`);
    console.log(`STATUS: Selesai di-update ke database.`);
  } else {
    console.log(`STATUS: Dry-run selesai. Jalankan dengan flag --execute untuk menerapkan.`);
  }
  console.log(`======================================================\n`);
}

main()
  .catch((e) => {
    console.error('Fatal error during normalization:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
