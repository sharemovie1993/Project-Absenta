import { defineCronJob } from '../infra/jobEngine';
import { prisma } from '../utils/prisma';
import dns from 'dns/promises';

const PLATFORM_DOMAIN = process.env.EASY_TUNNEL_BASE_DOMAIN || 'absenta.id';
// Target CNAME yang valid: domain tenant harus pointing ke salah satu ini
const VALID_CNAME_TARGETS = [
  `app.${PLATFORM_DOMAIN}`,
  PLATFORM_DOMAIN,
  `www.${PLATFORM_DOMAIN}`
];

/**
 * Verifikasi apakah CNAME domain tenant sudah pointing ke platform.
 */
async function verifyCname(customDomain: string): Promise<boolean> {
  try {
    const addresses = await dns.resolveCname(customDomain);
    const resolved = addresses.map((a: string) => a.toLowerCase().replace(/\.$/, ''));
    return resolved.some((addr: string) =>
      VALID_CNAME_TARGETS.some(target => addr === target || addr.endsWith(`.${PLATFORM_DOMAIN}`))
    );
  } catch {
    // Fallback: cek via A record jika tidak pakai CNAME
    try {
      const aRecords = await dns.resolve4(customDomain);
      const platformIps = await dns.resolve4(`app.${PLATFORM_DOMAIN}`).catch(() => [] as string[]);
      return aRecords.some((ip: string) => platformIps.includes(ip));
    } catch {
      return false;
    }
  }
}

export default defineCronJob({
  name: 'customDomainVerify',
  schedule: '*/5 * * * *', // setiap 5 menit
  async run() {
    const pendingTenants = await prisma.tenant.findMany({
      where: {
        custom_domain_status: 'PENDING',
        custom_domain: { not: null }
      },
      select: {
        id: true,
        custom_domain: true,
        custom_domain_status: true,
        created_at: true
      }
    });

    if (pendingTenants.length === 0) return;

    console.log(`[customDomainVerify] Checking ${pendingTenants.length} pending domain(s)...`);

    for (const tenant of pendingTenants) {
      if (!tenant.custom_domain) continue;

      const isVerified = await verifyCname(tenant.custom_domain);

      if (isVerified) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            custom_domain_status: 'ACTIVE',
            custom_domain_verified_at: new Date()
          }
        });
        console.log(`[customDomainVerify] ✅ ACTIVE: ${tenant.custom_domain}`);
        continue;
      }

      // Jika sudah > 7 hari belum resolved → FAILED
      const daysSincePending = tenant.created_at
        ? (Date.now() - new Date(tenant.created_at).getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      if (daysSincePending > 7) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { custom_domain_status: 'FAILED' }
        });
        console.log(`[customDomainVerify] ❌ FAILED (7d timeout): ${tenant.custom_domain}`);
      } else {
        console.log(`[customDomainVerify] ⏳ PENDING: ${tenant.custom_domain}`);
      }
    }
  }
});
