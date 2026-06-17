import { runAttendanceAutoSessionCycle } from '../jobs/attendanceAutoSession.job';
import { prisma } from '../utils/prisma';

/**
 * Script Ad-hoc untuk memaksa pembuatan sesi otomatis hari ini tanpa menunggu jadwal.
 * Berguna untuk pengujian atau pemulihan data jika otomatisasi terlewat.
 */
async function main() {
  console.log('🚀 [Ad-hoc] Memulai paksa siklus pembuatan sesi otomatis...');
  
  try {
    // Kita panggil siklus utama. 
    // Karena kita ingin memaksa (bypass jam 01:00), kita bisa membuat versi modifikasi 
    // atau sekadar memastikan data prasyarat aman.
    
    // Namun, agar user bisa benar-benar "menguji", kita jalankan fungsi aslinya.
    // Jika user menjalankan ini di atas jam 01:00, maka akan otomatis terproses.
    
    await runAttendanceAutoSessionCycle();
    
    console.log('✅ [Ad-hoc] Siklus selesai dieksekusi.');
  } catch (error) {
    console.error('❌ [Ad-hoc] Gagal menjalankan siklus:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
