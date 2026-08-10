import { prisma } from '@/utils/prisma';
import bcrypt from 'bcryptjs';

export interface BulkResetSiswaPasswordPayload {
  mode: 'NISN' | 'NIS' | 'CUSTOM';
  customPassword?: string;
  targetScope: 'ALL' | 'KELAS' | 'SELECTED';
  kelas_id?: string;
  siswa_ids?: string[];
}

export async function bulkResetSiswaPasswordCommand(
  ctx: { tenantId: string; org: any },
  payload: BulkResetSiswaPasswordPayload
) {
  const { tenantId } = ctx;
  const { mode, customPassword, targetScope, kelas_id, siswa_ids } = payload;

  if (mode === 'CUSTOM' && (!customPassword || customPassword.trim().length < 6)) {
    throw new Error('Kata sandi kustom minimal 6 karakter.');
  }

  // 1. Determine student filter
  const where: any = { tenant_id: tenantId };
  if (targetScope === 'KELAS' && kelas_id) {
    where.kelas_id = kelas_id;
  } else if (targetScope === 'SELECTED' && Array.isArray(siswa_ids) && siswa_ids.length > 0) {
    where.id = { in: siswa_ids };
  }

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
  const siswaRole = await prisma.role.findFirst({
    where: { name: 'SISWA' }
  });

  if (!siswaRole) {
    throw new Error('Role SISWA tidak ditemukan dalam database.');
  }

  let updated = 0;
  let created = 0;
  let failed = 0;
  const errors: { siswaId: string; nama: string; reason: string }[] = [];

  for (const student of students) {
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

      const hashedPassword = await bcrypt.hash(rawPassword, 10);

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
