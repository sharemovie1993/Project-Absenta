import { prisma } from '@/utils/prisma';
import bcrypt from 'bcryptjs';
import { activityLogService } from '@/modules/activity/services/activity-log.service';

export interface BulkResetSiswaPasswordPayload {
  mode: 'NISN' | 'NIS' | 'CUSTOM';
  customPassword?: string;
  targetScope: 'ALL' | 'TINGKAT' | 'JURUSAN' | 'KELAS' | 'SELECTED';
  status?: string; // 'AKTIF' (default) | 'ALL' | 'LULUS' | 'PINDAH' | 'KELUAR'
  tingkat?: string | number;
  jurusan_id?: string;
  kelas_id?: string;
  siswa_ids?: string[];
}

export function buildBulkResetWhereClause(tenantId: string, payload: BulkResetSiswaPasswordPayload): any {
  const { targetScope, kelas_id, siswa_ids, tingkat, jurusan_id, status } = payload;
  const where: any = { tenant_id: tenantId };

  // Status Filter: Defaults strictly to 'AKTIF' for safety
  const filterStatus = (status || 'AKTIF').toUpperCase();
  if (filterStatus !== 'ALL') {
    where.status = filterStatus;
  }

  // Parse tingkat helper (e.g. 'X' or '10' -> 10)
  const parseTingkat = (val?: string | number): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined;
    const str = String(val).trim().toUpperCase();
    if (str === 'X' || str === '10') return 10;
    if (str === 'XI' || str === '11') return 11;
    if (str === 'XII' || str === '12') return 12;
    if (str === 'XIII' || str === '13') return 13;
    const n = parseInt(str, 10);
    return isNaN(n) ? undefined : n;
  };

  const parsedTingkat = parseTingkat(tingkat);

  if (targetScope === 'KELAS' && kelas_id) {
    where.kelas_id = kelas_id;
  } else if (targetScope === 'TINGKAT' && parsedTingkat !== undefined) {
    where.Kelas = { tingkat: parsedTingkat };
  } else if (targetScope === 'JURUSAN' && jurusan_id) {
    where.OR = [
      { jurusan_id },
      { Kelas: { jurusan_id } }
    ];
  } else if (targetScope === 'SELECTED' && Array.isArray(siswa_ids) && siswa_ids.length > 0) {
    where.id = { in: siswa_ids };
  }

  return where;
}

export async function countBulkResetSiswaTargetCommand(
  ctx: { tenantId: string },
  payload: BulkResetSiswaPasswordPayload
) {
  const where = buildBulkResetWhereClause(ctx.tenantId, payload);
  const count = await prisma.siswa.count({ where });
  return { success: true, count };
}

export async function bulkResetSiswaPasswordCommand(
  ctx: { tenantId: string; org: any; userId?: string },
  payload: BulkResetSiswaPasswordPayload
) {
  const { tenantId } = ctx;
  const { mode, customPassword } = payload;

  if (mode === 'CUSTOM' && (!customPassword || customPassword.trim().length < 6)) {
    throw new Error('Kata sandi kustom minimal 6 karakter.');
  }

  // 1. Determine student filter
  const where = buildBulkResetWhereClause(tenantId, payload);

  const students = await prisma.siswa.findMany({
    where,
    select: {
      id: true,
      nama_siswa: true,
      nisn: true,
      nis: true,
      user_id: true,
      User: {
        select: {
          id: true,
          email: true,
        }
      }
    }
  });

  if (students.length === 0) {
    return {
      success: true,
      message: 'Tidak ada data siswa yang ditemukan untuk di-reset.',
      total: 0,
      updated: 0,
      created: 0,
      failed: 0,
      errors: []
    };
  }

  // 2. Find or fallback SISWA role
  let siswaRole = await prisma.role.findFirst({
    where: { tenant_id: tenantId, name: 'SISWA' }
  });

  if (!siswaRole) {
    siswaRole = await prisma.role.findFirst({
      where: { name: 'SISWA' }
    });
  }

  if (!siswaRole) {
    throw new Error('Role SISWA tidak ditemukan dalam database.');
  }

  let updated = 0;
  let created = 0;
  let failed = 0;
  const errors: { siswaId: string; nama: string; reason: string }[] = [];

  // Hash cache to prevent hashing the same password 1000x
  const hashCache = new Map<string, string>();
  const getHashedPassword = async (raw: string): Promise<string> => {
    if (hashCache.has(raw)) return hashCache.get(raw)!;
    const hashed = await bcrypt.hash(raw, 10);
    hashCache.set(raw, hashed);
    return hashed;
  };

  // Process in parallel chunks of 25 students for maximum throughput without DB pool starvation
  const CHUNK_SIZE = 25;
  for (let i = 0; i < students.length; i += CHUNK_SIZE) {
    const chunk = students.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (student) => {
        try {
          // Determine raw password value
          let rawPassword = '';
          const cleanNisn = student.nisn ? String(student.nisn).trim() : '';
          const cleanNis = student.nis ? String(student.nis).trim() : '';

          if (mode === 'NISN') {
            rawPassword = cleanNisn || cleanNis || customPassword || 'Siswa123!';
          } else if (mode === 'NIS') {
            rawPassword = cleanNis || cleanNisn || customPassword || 'Siswa123!';
          } else {
            rawPassword = customPassword || 'Siswa123!';
          }

          if (!rawPassword || rawPassword.trim().length < 4) {
            rawPassword = 'Siswa123!';
          }

          const hashedPassword = await getHashedPassword(rawPassword);

          if (student.user_id && student.User) {
            // Update existing user password
            await prisma.user.update({
              where: { id: student.user_id },
              data: {
                password: hashedPassword,
                updated_at: new Date()
              }
            });
            updated++;
          } else {
            // Create new User account for student
            const emailPrefix = cleanNisn || cleanNis || student.id.slice(0, 8);
            const email = `${emailPrefix}@absenta.id`;

            // Check email uniqueness
            const existingEmail = await prisma.user.findFirst({
              where: { email }
            });

            const finalEmail = existingEmail ? `siswa.${student.id.slice(0, 8)}@absenta.id` : email;

            const newUser = await prisma.user.create({
              data: {
                email: finalEmail,
                full_name: student.nama_siswa,
                password: hashedPassword,
                role_id: siswaRole.id,
                tenant_id: tenantId,
              }
            });

            // Link student to new user
            await prisma.siswa.update({
              where: { id: student.id },
              data: { user_id: newUser.id }
            });

            created++;
          }
        } catch (err: any) {
          failed++;
          errors.push({
            siswaId: student.id,
            nama: student.nama_siswa,
            reason: err?.message || 'Gagal mereset password'
          });
        }
      })
    );
  }

  try {
    activityLogService.logEvent({
      event_type: 'ACADEMIC_SISWA_PASSWORD_RESET',
      tenant_id: tenantId,
      user_id: ctx.userId ?? null,
      entity: 'Siswa',
      entity_id: tenantId,
      metadata: {
        mode,
        target_scope: targetScope,
        kelas_id: kelas_id || null,
        count: students.length,
        updated,
        created,
        failed,
      },
    });
  } catch (logErr) {
    console.error('[bulkResetSiswaPasswordCommand] Failed to record activity log:', logErr);
  }

  return {
    success: true,
    message: `Berhasil memproses ${students.length} akun siswa (${created} akun baru dibuat, ${updated} password ter-update).`,
    total: students.length,
    updated,
    created,
    failed,
    errors
  };
}
