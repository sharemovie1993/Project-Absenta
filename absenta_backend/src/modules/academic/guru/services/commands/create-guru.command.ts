import { prisma } from '@/utils/prisma';
import { normalizePhone } from '@/utils/normalization';
import { userService } from '@/modules/user/services/user.service';
import { DataScope } from '@/types/fastify';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { removeLidMappingByPhone } from '@/modules/whatsapp/services/wa-chatbot-resolver.service';
import { CreateGuruInput, GuruResponse } from '../guru.service';
import { PRISMA_GURU_USER_SELECT, enrichGuruWithUser, formatDateForStorage } from '../helpers/guru-mapper.helper';
import { validateUniqueNip } from '../helpers/guru-validation.helper';

export async function createGuruCommand(
  input: CreateGuruInput,
  scope: DataScope
): Promise<GuruResponse> {
  const tenantId = scope.tenantId;

  if (!tenantId) {
    throw new Error('Tenant context is required to create a Guru');
  }

  // Generate unique NIP if missing
  let nipToUse = input.nip ? input.nip.trim() : null;
  if (!nipToUse) {
    nipToUse = `GURU-${Date.now()}`;
  }

  // Validate NIP uniqueness within tenant
  await validateUniqueNip(tenantId, nipToUse);

  let associatedUserId: string | undefined = input.user_id || undefined;

  // Cleanup LID mapping if phone provided
  if (input.no_hp) {
    const cleanPhone = normalizePhone(input.no_hp);
    if (cleanPhone) {
      removeLidMappingByPhone(cleanPhone);
    }
  }

  // Auto-create associated User if not provided
  if (!associatedUserId) {
    let emailToUse = input.email ? input.email.trim().toLowerCase() : null;
    if (!emailToUse) {
      const cleanNip = nipToUse.replace(/[^a-zA-Z0-9]/g, '');
      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      emailToUse = `${cleanNip}.${uniqueSuffix}@guru.local`;
    }

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: emailToUse,
        tenant_id: tenantId,
      },
    });

    if (existingUser) {
      throw new Error(`Email ${emailToUse} sudah terdaftar untuk pengguna lain`);
    }

    const defaultPassword = 'Password123!';
    const fullName = input.nama_guru.trim();

    const createdUser = await userService.createUser({
      email: emailToUse,
      password: defaultPassword,
      full_name: fullName,
      role: 'GURU',
      tenant_id: tenantId,
    });

    associatedUserId = createdUser.id;
  }

  const guru = await prisma.guru.create({
    data: {
      tenant_id: tenantId,
      user_id: associatedUserId!,
      nip: nipToUse,
      nuptk: input.nuptk || null,
      nik: input.nik || null,
      no_kk: input.no_kk || null,
      npwp: input.npwp || null,
      nama_ibu_kandung: input.nama_ibu_kandung || null,
      nama_guru: input.nama_guru,
      no_rfid: input.no_rfid || null,
      no_hp: input.no_hp ? normalizePhone(input.no_hp) : null,
      alamat: input.alamat ?? null,
      dusun: input.dusun ?? null,
      kelurahan: input.kelurahan ?? null,
      kecamatan: input.kecamatan ?? null,
      kabupaten: input.kabupaten ?? null,
      provinsi: input.provinsi ?? null,
      rt: input.rt ?? null,
      rw: input.rw ?? null,
      kode_pos: input.kode_pos ?? null,
      tempat_lahir: input.tempat_lahir ?? null,
      tanggal_lahir: formatDateForStorage(input.tanggal_lahir),
      jenis_kelamin: input.jenis_kelamin ?? null,
      agama: input.agama ?? null,
      status_kepegawaian: input.status_kepegawaian ?? null,
      pendidikan_terakhir: input.pendidikan_terakhir ?? null,
      pangkat_golongan: input.pangkat_golongan ?? null,
      tmt_guru: input.tmt_guru ?? null,
      jenis_ptk: input.jenis_ptk ?? 'PENDIDIK',
      foto: input.foto ?? null,
      max_jp: input.max_jp ?? 24,
    },
    include: {
      User: PRISMA_GURU_USER_SELECT,
    },
  });

  await cacheInvalidationService.invalidateAcademicCache(tenantId);

  return enrichGuruWithUser(guru) as GuruResponse;
}
