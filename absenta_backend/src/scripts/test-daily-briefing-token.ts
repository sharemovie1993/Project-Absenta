import { briefingTokenService } from '../modules/daily-briefing/services/briefing-token.service';
import { prisma } from '../utils/prisma';
import axios from 'axios';

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  if (!tenant) {
    console.error('No active tenant found');
    process.exit(1);
  }

  const token = briefingTokenService.generateToken({
    tenantId: tenant.id,
    role: 'KEPALA_SEKOLAH',
    tanggal: new Date().toISOString().slice(0, 10),
  });

  console.log(`[BRIEFING TEST] Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`[BRIEFING TEST] Token: ${token}`);

  const res = await axios.get(`http://127.0.0.1:3003/api/reports/daily-briefing?token=${token}`);
  console.log('[BRIEFING TEST] Response status:', res.status);
  console.log('[BRIEFING TEST] Header Title:', res.data?.data?.header?.title);
  console.log('[BRIEFING TEST] Highlight count:', res.data?.data?.highlights?.length);
  console.log('[BRIEFING TEST] Sections count:', res.data?.data?.sections?.length);
  console.log('[BRIEFING TEST] SUCCESS!');
}

main().catch(err => {
  console.error('[BRIEFING TEST] FAILED:', err.response?.data || err.message);
  process.exit(1);
});
