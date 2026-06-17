import { siswaDb } from '../repositories/siswa.db';

function randomRfidCandidate(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let i = 0; i < 8; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `RF${body}`;
}

export async function generateRfidBulkCommand(tenantId: string, kelasId?: string) {
  const where: any = { tenant_id: tenantId, status: 'AKTIF', OR: [{ no_rfid: null }, { no_rfid: '' }] };
  if (kelasId) where.kelas_id = String(kelasId);

  const students = await siswaDb.siswa.findMany({ where, select: { id: true } as any } as any);
  if (!students || students.length === 0) {
    return { updated: 0 };
  }

  let updatedCount = 0;
  for (const s of students as any[]) {
    let candidate = randomRfidCandidate();
    for (let attempts = 0; attempts < 5; attempts++) {
      const exists = await siswaDb.siswa.count({ where: { tenant_id: tenantId, no_rfid: candidate } as any });
      if (exists === 0) break;
      candidate = randomRfidCandidate();
    }
    await siswaDb.siswa.update({ where: { id: String(s.id) } as any, data: { no_rfid: candidate } as any });
    updatedCount += 1;
  }

  return { updated: updatedCount };
}
