import { siswaDb } from '../repositories/siswa.db';

function randomRfidCandidate(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let i = 0; i < 8; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `RF${body}`;
}

export async function generateRfidForSiswaCommand(tenantId: string, siswaId: string) {
  const siswa = await siswaDb.siswa.findFirst({
    where: { id: siswaId, tenant_id: tenantId } as any,
    select: { id: true, no_rfid: true } as any,
  });

  if (!siswa) {
    throw new Error('Siswa not found');
  }

  const existing = String((siswa as any).no_rfid || '').trim();
  if (existing) {
    return { id: (siswa as any).id, no_rfid: existing, already_set: true };
  }

  let candidate = randomRfidCandidate();
  for (let attempts = 0; attempts < 5; attempts++) {
    const exists = await siswaDb.siswa.count({ where: { tenant_id: tenantId, no_rfid: candidate } as any });
    if (exists === 0) break;
    candidate = randomRfidCandidate();
  }

  const updated = await siswaDb.siswa.update({
    where: { id: siswaId } as any,
    data: { no_rfid: candidate } as any,
    select: { id: true, no_rfid: true } as any,
  });

  return { id: (updated as any).id, no_rfid: (updated as any).no_rfid, already_set: false };
}
