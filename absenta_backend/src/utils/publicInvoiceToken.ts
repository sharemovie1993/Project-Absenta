import { prisma } from './prisma';
import { createHash } from 'crypto';

export async function persistPublicInvoiceToken(invoiceId: string, tenantId: string | null, token: string, ttlSeconds?: number) {
  const tokenHash = createHash('sha256').update(String(token || '')).digest('hex');
  const expiresAt = typeof ttlSeconds === 'number' && ttlSeconds > 0
    ? new Date(Date.now() + ttlSeconds * 1000)
    : null;
  try {
    // Upsert by token_hash to be idempotent
    await prisma.invoicePublicToken.upsert({
      where: { token_hash: tokenHash },
      update: {
        invoice_id: invoiceId,
        tenant_id: tenantId || undefined,
        expires_at: expiresAt || undefined,
        revoked_at: null,
      },
      create: {
        invoice_id: invoiceId,
        tenant_id: tenantId || undefined,
        token_hash: tokenHash,
        expires_at: expiresAt || undefined,
      },
    });
  } catch {}
}

export async function getMappingByToken(token: string): Promise<{ invoice_id: string, tenant_id?: string, expiry?: number } | null> {
  try {
    const t = String(token || '').trim();
    if (!t) return null;

    // 1. Try direct lookup (assuming token is already the hash)
    let rec = await prisma.invoicePublicToken.findFirst({
      where: {
        token_hash: t,
        revoked_at: null,
        OR: [
          { expires_at: null },
          { expires_at: { gt: new Date() } }
        ]
      }
    });

    // 2. If not found, try hashing it (assuming token is raw)
    if (!rec) {
      const tokenHash = createHash('sha256').update(t).digest('hex');
      rec = await prisma.invoicePublicToken.findFirst({
        where: {
          token_hash: tokenHash,
          revoked_at: null,
          OR: [
            { expires_at: null },
            { expires_at: { gt: new Date() } }
          ]
        }
      });
    }

    if (!rec) return null;
    return {
      invoice_id: rec.invoice_id,
      tenant_id: rec.tenant_id || undefined,
      expiry: rec.expires_at ? rec.expires_at.getTime() : undefined
    };
  } catch {
    return null;
  }
}

export async function getOrCreateTokenByInvoice(invoiceId: string): Promise<string | null> {
  try {
    const existing = await prisma.invoicePublicToken.findFirst({
      where: {
        invoice_id: invoiceId,
        revoked_at: null,
        OR: [
          { expires_at: null },
          { expires_at: { gt: new Date() } }
        ]
      },
      orderBy: { created_at: 'desc' }
    });
    return existing ? existing.token_hash : null;
  } catch {
    return null;
  }
}

export async function revokeTokenByInvoice(invoiceId: string): Promise<void> {
  try {
    await prisma.invoicePublicToken.updateMany({
      where: { invoice_id: invoiceId, revoked_at: null },
      data: { revoked_at: new Date() }
    });
  } catch {}
}
