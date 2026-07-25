import { prisma } from '../utils/prisma';

async function main() {
  console.log('🔄 Memperbarui seluruh data Tingkat & Fase di GlobalPerangkatAjarLibrary...');

  const items = await prisma.globalPerangkatAjarLibrary.findMany();
  console.log(`📋 Total data library: ${items.length}`);

  let updatedCount = 0;
  for (const item of items) {
    const str = `${item.judul} ${item.topik || ''}`.toUpperCase();
    let targetTingkat = 10;
    let targetFase = 'E';

    if (str.includes('XI') || str.includes('11')) { targetTingkat = 11; targetFase = 'F'; }
    else if (str.includes('XII') || str.includes('12')) { targetTingkat = 12; targetFase = 'F'; }
    else if (str.includes('VII') || str.includes('7')) { targetTingkat = 7; targetFase = 'D'; }
    else if (str.includes('VIII') || str.includes('8')) { targetTingkat = 8; targetFase = 'D'; }
    else if (str.includes('IX') || str.includes('9')) { targetTingkat = 9; targetFase = 'D'; }

    await prisma.globalPerangkatAjarLibrary.update({
      where: { id: item.id },
      data: {
        tingkat: targetTingkat,
        fase: targetFase
      }
    });
    updatedCount++;
  }

  console.log(`✅ BERHASIL MEMPERBARUI ${updatedCount} DATA TINGKAT & FASE DI LIBRARY!`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
