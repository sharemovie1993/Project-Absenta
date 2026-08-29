import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/utils/prisma';

const REFRESH_TOKEN_EXPIRES_DAYS = 7;

/**
 * 🔐 C1 Fix: Refresh Token Service
 * Menyimpan, memverifikasi, dan merevokasi refresh token secara aman di database.
 * Token disimpan dalam bentuk SHA-256 hash — raw token tidak pernah tersimpan di DB.
 */
export class RefreshTokenService {

  /** Generate raw token + simpan hash-nya ke DB. Kembalikan raw token untuk dikirim ke client. */
  async createRefreshToken(userId: string, tenantId: string, deviceHint?: string): Promise<string> {
    const raw = randomBytes(48).toString('hex');
    const hash = this.hashToken(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { user_id: userId, tenant_id: tenantId, token_hash: hash, expires_at: expiresAt, device_hint: deviceHint ?? null },
    });
    return raw;
  }

  /** Verifikasi refresh token: cek hash, belum expired, belum direvoke. */
  async verifyRefreshToken(rawToken: string): Promise<{ userId: string; tenantId: string; tokenId: string } | null> {
    const hash = this.hashToken(rawToken);
    const record = await prisma.refreshToken.findUnique({ where: { token_hash: hash } });
    if (!record) return null;
    if (record.revoked_at !== null) return null;
    if (record.expires_at < new Date()) return null;
    return { userId: record.user_id, tenantId: record.tenant_id, tokenId: record.id };
  }

  /** Revoke satu token berdasarkan raw token string. */
  async revokeByRawToken(rawToken: string): Promise<void> {
    const hash = this.hashToken(rawToken);
    try {
      await prisma.refreshToken.updateMany({ where: { token_hash: hash, revoked_at: null }, data: { revoked_at: new Date() } });
    } catch { /* token mungkin sudah tidak ada */ }
  }

  /** Revoke SEMUA refresh token aktif milik satu user (logout all / ganti password). */
  async revokeAllByUserId(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({ where: { user_id: userId, revoked_at: null }, data: { revoked_at: new Date() } });
  }

  /** Hapus token lama yang sudah expired (cleanup). */
  async pruneExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({ where: { expires_at: { lt: new Date() } } });
    return result.count;
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}

export const refreshTokenService = new RefreshTokenService();
