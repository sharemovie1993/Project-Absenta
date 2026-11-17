import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const isExecute = process.argv.includes('--execute');
  console.log('====================================================');
  console.log('   AUDIT & CLEANUP BANK SOAL KOSONG (0 SOAL)        ');
  console.log(`   MODE: ${isExecute ? '🔴 EKSEKUSI PENGHAPUSAN' : '🟢 DRY-RUN (SIMULASI / AMAN)'} `);
  console.log('====================================================\n');

  // Ambil semua bank soal beserta relasinya
  const allBanks = await prisma.cbtBankSoal.findMany({
    include: {
      _count: {
        select: {
          Soal: true,
          JadwalUjian: true,
          Kontributor: true,
        },
      },
      Guru: {
        select: {
          id: true,
          nama_guru: true,
        },
      },
      Mapel: {
        select: {
          id: true,
          nama_mapel: true,
          kode_mapel: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  console.log(`Total Bank Soal Terdaftar di Database: ${allBanks.length}`);

  // Pisahkan bank soal
  const protectedWithQuestions: typeof allBanks = [];
  const protectedWithSchedules: typeof allBanks = [];
  const emptyCandidates: typeof allBanks = [];
  const emptyTingkat: typeof allBanks = [];

  for (const b of allBanks) {
    const totalSoal = Math.max(b.jumlah_soal || 0, b._count.Soal || 0);
    const hasSchedules = (b._count.JadwalUjian || 0) > 0;

    if (!b.tingkat || b.tingkat.trim() === '') {
      emptyTingkat.push(b);
    }

    if (totalSoal > 0) {
      protectedWithQuestions.push(b);
    } else if (hasSchedules) {
      protectedWithSchedules.push(b);
    } else {
      emptyCandidates.push(b);
    }
  }

  console.log(`\n--- RINGKASAN DATA ---`);
  console.log(`🛡️  Bank Soal DILINDUNGI (Ada Soal > 0)        : ${protectedWithQuestions.length}`);
  console.log(`🛡️  Bank Soal DILINDUNGI (Ada Jadwal Ujian)    : ${protectedWithSchedules.length}`);
  console.log(`🗑️  Kandidat Bank Soal KOSONG (0 Soal & 0 Sesi): ${emptyCandidates.length}`);
  console.log(`⚠️  Bank Soal Tanpa Tingkat/Tingkat Kosong    : ${emptyTingkat.length}`);

  console.log(`\n====================================================`);
  console.log(`🛡️  1. DAFTAR BANK SOAL YANG DILINDUNGI (TIDAK AKAN DISENTUH)`);
  console.log(`====================================================`);
  if (protectedWithQuestions.length === 0) {
    console.log('(Belum ada bank soal yang berisi butir soal)');
  } else {
    console.log(`-- Bagian A: Memiliki Butir Soal (${protectedWithQuestions.length} Bank Soal) --`);
    protectedWithQuestions.forEach((b, i) => {
      const qCount = Math.max(b.jumlah_soal || 0, b._count.Soal || 0);
      console.log(
        `${i + 1}. [ID: ${b.id.slice(0, 8)}] [${b.kode_bank}] "${b.judul}" | Tingkat: ${b.tingkat} | ${qCount} Butir Soal | Guru: ${b.Guru?.nama_guru || '-'} | Mapel: ${b.Mapel?.nama_mapel || '-'}`
      );
    });
  }

  if (protectedWithSchedules.length > 0) {
    console.log(`\n-- Bagian B: Masih 0 Soal TETAPI Sudah Memiliki Jadwal Ujian Panitia (${protectedWithSchedules.length} Bank Soal) --`);
    protectedWithSchedules.forEach((b, i) => {
      console.log(
        `${i + 1}. [ID: ${b.id.slice(0, 8)}] [${b.kode_bank}] "${b.judul}" | Tingkat: ${b.tingkat} | 0 Soal | ${b._count.JadwalUjian} Sesi Jadwal | Guru: ${b.Guru?.nama_guru || '-'} | Mapel: ${b.Mapel?.nama_mapel || '-'}`
      );
    });
  }

  console.log(`\n====================================================`);
  console.log(`🗑️  2. DAFTAR BANK SOAL KOSONG (0 SOAL) YANG AKAN DIBERSIHKAN`);
  console.log(`====================================================`);
  if (emptyCandidates.length === 0) {
    console.log('Tidak ada bank soal kosong yang perlu dibersihkan.');
  } else {
    emptyCandidates.forEach((b, i) => {
      console.log(
        `${i + 1}. [ID: ${b.id.slice(0, 8)}] [${b.kode_bank}] "${b.judul}" | Tingkat: ${b.tingkat || 'KOSONG'} | Guru: ${b.Guru?.nama_guru || '-'} | Mapel: ${b.Mapel?.nama_mapel || '-'} | Kontributor: ${b._count.Kontributor} | Tgl: ${b.created_at.toLocaleString('id-ID')}`
      );
    });
  }

  // Jika mode eksekusi aktif, lakukan pembersihan
  if (isExecute) {
    if (emptyCandidates.length === 0) {
      console.log('\nTidak ada data yang dihapus.');
      return;
    }

    console.log(`\nMemulai penghapusan ${emptyCandidates.length} bank soal kosong...`);
    const candidateIds = emptyCandidates.map((b) => b.id);

    // Safeguard mutlak: pastikan tidak ada ID kandidat yang memiliki soal
    const verifyGuard = await prisma.cbtSoal.count({
      where: {
        bank_soal_id: { in: candidateIds },
      },
    });

    if (verifyGuard > 0) {
      throw new Error(
        `[ABORT SAFETY] Ditemukan ${verifyGuard} butir soal pada kandidat! Eksekusi dibatalkan untuk mencegah kehilangan data.`
      );
    }

    const deleteResult = await prisma.$transaction(async (tx) => {
      // Hapus relasi kontributor jika ada
      await tx.cbtBankSoalKontributor.deleteMany({
        where: {
          bank_soal_id: { in: candidateIds },
        },
      });

      // Hapus bank soal
      return tx.cbtBankSoal.deleteMany({
        where: {
          id: { in: candidateIds },
        },
      });
    });

    console.log(`\n✅ SUKSES! Berhasil membersihkan ${deleteResult.count} bank soal kosong.`);
  } else {
    console.log('\n----------------------------------------------------');
    console.log('ℹ️  CATATAN: Ini adalah mode SIMULASI (Dry-Run).');
    console.log('Tidak ada data yang diubah atau dihapus dari database.');
    console.log('Untuk menjalankan penghapusan sebenarnya, jalankan script dengan flag:');
    console.log('  npx ts-node src/scripts/adhoc/audit_and_cleanup_empty_bank_soal.ts --execute');
    console.log('----------------------------------------------------');
  }
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
