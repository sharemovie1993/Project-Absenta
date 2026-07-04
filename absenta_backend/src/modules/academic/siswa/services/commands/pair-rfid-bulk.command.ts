import { siswaDb } from '../repositories/siswa.db';

export async function pairRfidBulkCommand(tenantId: string, kelasId: string, rfids: string[]) {
  if (!rfids || rfids.length === 0) {
    throw new Error('Daftar RFID tidak boleh kosong');
  }

  // 1. Get students in the class without RFID, sorted by name
  const students = await siswaDb.siswa.findMany({
    where: {
      tenant_id: tenantId,
      kelas_id: kelasId,
      status: 'AKTIF',
      OR: [
        { no_rfid: null },
        { no_rfid: '' }
      ]
    },
    orderBy: {
      nama_siswa: 'asc'
    },
    select: {
      id: true,
      nama_siswa: true
    }
  });

  if (students.length === 0) {
    throw new Error('Semua siswa di kelas ini sudah memiliki RFID');
  }

  const results: any[] = [];
  let pairedCount = 0;

  // 2. Pair them one by one
  for (let i = 0; i < Math.min(students.length, rfids.length); i++) {
    const student = students[i];
    const rfid = rfids[i].trim();

    // Check if RFID already used by someone else in the same tenant
    const exists = await siswaDb.siswa.findFirst({
      where: {
        tenant_id: tenantId,
        no_rfid: rfid,
        id: { not: student.id }
      }
    });

    if (exists) {
      results.push({
        siswa_id: student.id,
        nama_siswa: student.nama_siswa,
        rfid,
        status: 'FAILED',
        error: 'RFID sudah digunakan oleh siswa lain'
      });
      continue;
    }

    await siswaDb.siswa.update({
      where: { id: student.id },
      data: { no_rfid: rfid }
    });

    results.push({
      siswa_id: student.id,
      nama_siswa: student.nama_siswa,
      rfid,
      status: 'SUCCESS'
    });
    pairedCount++;
  }

  return {
    total_requested: rfids.length,
    total_students_eligible: students.length,
    total_paired: pairedCount,
    details: results
  };
}
