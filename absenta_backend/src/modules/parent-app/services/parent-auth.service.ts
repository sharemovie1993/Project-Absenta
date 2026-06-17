import { prisma } from '@/utils/prisma';
import crypto from 'crypto';
import { parentNotificationService } from './parent-notification.service';
import { ParentEventType } from '../constants/parent-event-matrix';

export class ParentAuthService {
  /**
   * Ensure a parent has a valid token
   * If exists and valid, return it. If not, generate new.
   */
  async ensureToken(orangTuaId: string) {
    const existing = await prisma.parentAccessToken.findFirst({
      where: {
        orang_tua_id: orangTuaId,
        is_active: true,
        expired_at: { gt: new Date() }
      }
    });

    if (existing) return existing;
    return this.generateToken(orangTuaId);
  }

  /**
   * Rotate/Regenerate token for a parent
   * Invalidates old tokens and creates a new one
   */
  async rotateToken(orangTuaId: string) {
    // Invalidate all existing active tokens
    await prisma.parentAccessToken.updateMany({
      where: { orang_tua_id: orangTuaId, is_active: true },
      data: { is_active: false }
    });

    // Trigger TOKEN_REVOKED event
    // Error handling: log only, don't fail rotation
    try {
      await parentNotificationService.handleEvent(ParentEventType.TOKEN_REVOKED, {
        orangTuaId,
        timestamp: new Date().toISOString(),
        source: 'PARENT_AUTH'
      });
    } catch (error) {
      console.error('[ParentAuth] Failed to trigger TOKEN_REVOKED:', error);
    }

    return this.generateToken(orangTuaId);
  }

  /**
   * Generate a new access token for a parent
   * @param orangTuaId ID of the parent
   * @param expiryMonths Validity in months (default: 36 months / 3 years)
   */
  async generateToken(orangTuaId: string, expiryMonths: number = 36) {
    // Ensure 1 token per parent rule (invalidate others first)
    await prisma.parentAccessToken.updateMany({
      where: { orang_tua_id: orangTuaId, is_active: true },
      data: { is_active: false }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiredAt = new Date();
    expiredAt.setMonth(expiredAt.getMonth() + expiryMonths);

    return prisma.parentAccessToken.create({
      data: {
        orang_tua_id: orangTuaId,
        token: token,
        expired_at: expiredAt,
        is_active: true
      }
    });
  }

  /**
   * Validate token and return the parent info
   * Guard Logic: Parent must have at least 1 ACTIVE student
   * @param token The access token string
   */
  async validateToken(token: string) {
    const accessToken = await prisma.parentAccessToken.findUnique({
      where: { token },
      include: {
        OrangTua: {
          include: {
            OrangTuaSiswa: {
              include: {
                Siswa: {
                  select: {
                    id: true,
                    status: true, // Needed for guard logic
                    nama_siswa: true,
                    Kelas: true,
                    TahunPelajaran: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!accessToken) {
      throw new Error('Invalid token');
    }

    if (!accessToken.is_active) {
      throw new Error('Token is inactive');
    }

    if (new Date() > accessToken.expired_at) {
      throw new Error('Token expired');
    }

    // GUARD LOGIC: Check if parent has any active children
    const activeChildren = accessToken.OrangTua.OrangTuaSiswa.filter(
      link => link.Siswa && link.Siswa.status === 'AKTIF'
    );
    
    console.log(`[ParentAuth] Validating token for ${accessToken.OrangTua.nama}. Found ${activeChildren.length} active children.`);

    if (activeChildren.length === 0) {
      // Debug: Log all children status
      const allChildren = accessToken.OrangTua.OrangTuaSiswa.map(l => ({
        id: l.Siswa?.id,
        nama: l.Siswa?.nama_siswa,
        status: l.Siswa?.status
      }));
      console.log('[ParentAuth] No active children details:', JSON.stringify(allChildren));
      
      throw new Error('Access denied: No active students found');
    }

    // Update last used
    await prisma.parentAccessToken.update({
      where: { id: accessToken.id },
      data: { last_used_at: new Date() }
    });

    return accessToken.OrangTua;
  }

  /**
   * Get formatted profile for Parent App
   * Only returns ACTIVE students
   */
  async getParentProfile(orangTuaId: string) {
    const parent = await prisma.orangTua.findUnique({
      where: { id: orangTuaId },
      include: {
        OrangTuaSiswa: {
          include: {
            Siswa: {
              select: {
                id: true,
                nama_siswa: true,
                nis: true,
                jenis_kelamin: true,
                status: true,
                Kelas: {
                  select: {
                    id: true,
                    nama_kelas: true,
                    tingkat: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!parent) throw new Error('Parent not found');

    // Filter only active students
    const activeChildren = parent.OrangTuaSiswa
      .map(link => link.Siswa)
      .filter(siswa => siswa.status === 'AKTIF')
      .map(siswa => ({
        id: siswa.id,
        nama: siswa.nama_siswa,
        nis: siswa.nis,
        jk: siswa.jenis_kelamin,
        kelas: siswa.Kelas?.nama_kelas
      }));

    return {
      id: parent.id,
      nama: parent.nama,
      no_hp: parent.no_hp,
      email: parent.email,
      children: activeChildren
    };
  }

  /**
   * Trigger NO_ACTIVE_STUDENT event
   * Should be called when student status changes to non-active and parent has no other active students
   */
  async notifyNoActiveStudent(orangTuaId: string) {
    try {
      await parentNotificationService.handleEvent(ParentEventType.NO_ACTIVE_STUDENT, {
        orangTuaId,
        timestamp: new Date().toISOString(),
        source: 'PARENT_AUTH'
      });
    } catch (error) {
      console.error('[ParentAuth] Failed to trigger NO_ACTIVE_STUDENT:', error);
    }
  }
}

export const parentAuthService = new ParentAuthService();
