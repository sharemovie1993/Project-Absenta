/**
 * briefing-token.service.ts
 * Token generator & verification untuk Public Read-Only Report Link.
 *
 * Menggunakan signed JWT dengan HMAC-SHA256:
 * - Masa berlaku (TTL) default: 48 jam (dapat disesuaikan)
 * - Scope terisolasi: 'DAILY_BRIEFING'
 * - Membawa tenantId, role, tanggal, dan target identifier secara aman.
 */

import jwt from 'jsonwebtoken';
import { BriefingTokenPayload, BriefingRole } from '../types/briefing.types';

export class BriefingTokenService {
  private secret: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'absenta_daily_briefing_secret_fallback_key';
  }

  /**
   * Menghasilkan signed token untuk laporan harian
   * @param payload Informasi briefing
   * @param ttlHours Masa aktif token dalam jam (default 48 jam)
   */
  generateToken(
    payload: {
      tenantId: string;
      role: BriefingRole;
      tanggal: string; // YYYY-MM-DD
      targetUserId?: string;
      targetEntityId?: string;
    },
    ttlHours = 48
  ): string {
    const tokenPayload: BriefingTokenPayload = {
      tenantId: payload.tenantId,
      role: payload.role,
      targetUserId: payload.targetUserId,
      targetEntityId: payload.targetEntityId,
      tanggal: payload.tanggal,
      scope: 'DAILY_BRIEFING',
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: `${ttlHours}h`,
    });
  }

  /**
   * Verifikasi token laporan dan mengembalikan payload
   * @throws Error jika token invalid, kedaluwarsa, atau salah scope
   */
  verifyToken(token: string): BriefingTokenPayload {
    if (!token || typeof token !== 'string') {
      throw new Error('Token laporan tidak ditemukan');
    }

    try {
      const decoded = jwt.verify(token, this.secret) as BriefingTokenPayload;

      if (decoded.scope !== 'DAILY_BRIEFING') {
        throw new Error('Cakupan (scope) token laporan tidak valid');
      }

      if (!decoded.tenantId || !decoded.role || !decoded.tanggal) {
        throw new Error('Payload token laporan tidak lengkap');
      }

      return decoded;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new Error('Tautan laporan telah kedaluwarsa. Silakan minta tautan baru.');
      }
      throw new Error('Tautan laporan tidak sah atau telah diubah.');
    }
  }
}

export const briefingTokenService = new BriefingTokenService();
