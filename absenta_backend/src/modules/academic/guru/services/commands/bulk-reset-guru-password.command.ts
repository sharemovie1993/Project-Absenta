import { prisma } from '@/utils/prisma';
import bcrypt from 'bcryptjs';

export interface BulkResetGuruPasswordPayload {
  mode: 'NIP' | 'CUSTOM';
  customPassword?: string;
  targetScope: 'ALL' | 'SELECTED';
  guru_ids?: string[];
}

export async function bulkResetGuruPasswordCommand(
  ctx: { tenantId: string; org: any },
  payload: BulkResetGuruPasswordPayload
) {
  const { tenantId } = ctx;
  const { mode, customPassword, targetScope, guru_ids } = payload;

  if (mode === 'CUSTOM' && (!customPassword || customPassword.trim().length < 6)) {
    throw new Error('Kata sandi kustom minimal 6 karakter.');
  }

  // 1. Determine guru filter
  const where: any = { tenant_id: tenantId };
  if (targetScope === 'SELECTED' && Array.isArray(guru_ids) && guru_ids.length > 0) {
    where.id = { in: guru_ids };
  }

  const teachers = await prisma.guru.findMany({
    where,
    select: {
      id: true,
      nama_guru: true,
      nip: true,
      user_id: true,
      User: {
        select: {
          id: true,
          email: true,
        }
      }
    }
  });

  if (teachers.length === 0) {
    return {
      success: true,
      message: 'Tidak ada data guru yang ditemukan untuk di-reset.',
      total: 0,
      updated: 0,
      created: 0,
      failed: 0,
      errors: []
    };
  }

  // 2. Find GURU role
  let guruRole = await prisma.role.findFirst({
    where: { tenant_id: tenantId, name: 'GURU' }
  });

  if (!guruRole) {
    guruRole = await prisma.role.findFirst({
      where: { name: 'GURU' }
    });
  }

  if (!guruRole) {
    throw new Error('Role GURU tidak ditemukan dalam database.');
  }

  let updated = 0;
  let created = 0;
  let failed = 0;
  const errors: { guruId: string; nama: string; reason: string }[] = [];

  // Hash cache to prevent hashing the same password 1000x
  const hashCache = new Map<string, string>();
  const getHashedPassword = async (raw: string): Promise<string> => {
    if (hashCache.has(raw)) return hashCache.get(raw)!;
    const hashed = await bcrypt.hash(raw, 10);
    hashCache.set(raw, hashed);
    return hashed;
  };

  // Process in parallel chunks of 25 teachers
  const CHUNK_SIZE = 25;
  for (let i = 0; i < teachers.length; i += CHUNK_SIZE) {
    const chunk = teachers.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (guru) => {
        try {
          // Determine raw password value
          let rawPassword = '';
          const cleanNip = guru.nip ? String(guru.nip).trim() : '';

          if (mode === 'NIP') {
            rawPassword = cleanNip || customPassword || 'Guru123!';
          } else {
            rawPassword = customPassword || 'Guru123!';
          }

          if (!rawPassword || rawPassword.trim().length < 4) {
            rawPassword = 'Guru123!';
          }

          const hashedPassword = await getHashedPassword(rawPassword);

          if (guru.user_id && guru.User) {
            // Update existing user password
            await prisma.user.update({
              where: { id: guru.user_id },
              data: {
                password: hashedPassword,
                updated_at: new Date()
              }
            });
            updated++;
          } else {
            // Create new User account for guru
            const emailPrefix = cleanNip || guru.id.slice(0, 8);
            const email = `${emailPrefix}@absenta.id`;

            // Check email uniqueness
            const existingEmail = await prisma.user.findFirst({
              where: { email }
            });

            const finalEmail = existingEmail ? `guru.${guru.id.slice(0, 8)}@absenta.id` : email;

            const newUser = await prisma.user.create({
              data: {
                email: finalEmail,
                full_name: guru.nama_guru,
                password: hashedPassword,
                role_id: guruRole.id,
                tenant_id: tenantId,
              }
            });

            // Link guru to new user
            await prisma.guru.update({
              where: { id: guru.id },
              data: { user_id: newUser.id }
            });

            created++;
          }
        } catch (err: any) {
          failed++;
          errors.push({
            guruId: guru.id,
            nama: guru.nama_guru,
            reason: err?.message || 'Gagal mereset password'
          });
        }
      })
    );
  }

  // Invalidate cache after bulk reset
  const { cacheInvalidationService } = await import('@/utils/cache-invalidation.service');
  await cacheInvalidationService.invalidateUserCache(tenantId);

  return {
    success: true,
    message: `Berhasil memproses ${teachers.length} akun guru (${created} akun baru dibuat, ${updated} password ter-update).`,
    total: teachers.length,
    updated,
    created,
    failed,
    errors
  };
}
