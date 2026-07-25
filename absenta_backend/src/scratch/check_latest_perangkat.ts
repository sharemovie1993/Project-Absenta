import { prisma } from '../utils/prisma';

async function main() {
  console.log('🔍 Memeriksa data PerangkatAjar terbaru di database...');
  const latestItems = await prisma.perangkatAjar.findMany({
    take: 5,
    orderBy: { created_at: 'desc' },
    include: {
      Guru: { select: { nama_guru: true } },
      Mapel: { select: { nama_mapel: true, kode_mapel: true } },
      TahunPelajaran: { select: { tahun: true } },
      Semester: { select: { nama_semester: true } },
    }
  });

  console.log(`📌 Ditemukan ${latestItems.length} dokumen terbaru di database:`);
  latestItems.forEach((item, i) => {
    console.log(`\n--- [Dokumen ${i + 1}] ---`);
    console.log(`ID          : ${item.id}`);
    console.log(`Judul       : ${item.judul}`);
    console.log(`Jenis       : ${item.jenis}`);
    console.log(`Status      : ${item.status}`);
    console.log(`Mapel       : ${item.Mapel?.nama_mapel || '-'} (${item.Mapel?.kode_mapel || '-'})`);
    console.log(`Guru        : ${item.Guru?.nama_guru || 'System/Admin'}`);
    console.log(`Tahun/Sem   : ${item.TahunPelajaran?.tahun || '-'} / ${item.Semester?.nama_semester || '-'}`);
    console.log(`File URL    : ${item.file_url}`);
    console.log(`Dibuat Pada : ${item.created_at.toLocaleString('id-ID')}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Error checking database:', e);
    process.exit(1);
  });
