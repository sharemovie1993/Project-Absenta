import { prisma } from '@/utils/prisma';
import { applyDataScope } from '@/utils/applyDataScope';
import { normalizePhone } from '@/utils/normalization';
import { DataScope } from '@/types/fastify';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { removeLidMappingByPhone } from '@/modules/whatsapp/services/wa-chatbot-resolver.service';
import { UpdateGuruInput, GuruResponse } from '../guru.service';
import { PRISMA_GURU_USER_SELECT, enrichGuruWithUser, formatDateForStorage } from '../helpers/guru-mapper.helper';
import { validateUniqueNip, validateUniqueUserEmail } from '../helpers/guru-validation.helper';

export async function updateGuruCommand(
  guruId: string,
  input: UpdateGuruInput,
  scope: DataScope
): Promise<GuruResponse> {
  // Check if guru exists
  let whereClause: any = { id: guruId };
  whereClause = applyDataScope(whereClause, { tenantId: scope.tenantId });

  const existingGuru = await prisma.guru.findFirst({
    where: whereClause,
  });

  if (!existingGuru) {
    throw new Error('Guru not found or insufficient permissions');
  }

  // Check if NIP is unique within tenant (if provided and different from current)
  if (input.nip && input.nip !== existingGuru.nip) {
    await validateUniqueNip(existingGuru.tenant_id, input.nip, guruId);
  }

  // Synchronize Email to User table if provided and changed
  if (input.email !== undefined && input.email !== null && existingGuru.user_id) {
    const emailToUse = input.email.trim().toLowerCase();

    const currentUser = await prisma.user.findUnique({
      where: { id: existingGuru.user_id },
      select: { email: true },
    });

    if (currentUser && currentUser.email.toLowerCase() !== emailToUse) {
      await validateUniqueUserEmail(existingGuru.tenant_id, emailToUse, existingGuru.user_id);

      await prisma.user.update({
        where: { id: existingGuru.user_id },
        data: { email: emailToUse },
      });
    }
  }

  // Build update data object, only including defined fields
  const updateData: any = {};
  if (input.nip !== undefined) updateData.nip = input.nip;
  if (input.nuptk !== undefined) updateData.nuptk = input.nuptk;
  if (input.nik !== undefined) updateData.nik = input.nik;
  if (input.no_kk !== undefined) updateData.no_kk = input.no_kk;
  if (input.npwp !== undefined) updateData.npwp = input.npwp;
  if (input.nama_ibu_kandung !== undefined) updateData.nama_ibu_kandung = input.nama_ibu_kandung;
  if (input.nama_guru !== undefined) updateData.nama_guru = input.nama_guru;
  if (input.no_rfid !== undefined) updateData.no_rfid = input.no_rfid;
  if (input.alamat !== undefined) updateData.alamat = input.alamat;
  if (input.dusun !== undefined) updateData.dusun = input.dusun;
  if (input.kelurahan !== undefined) updateData.kelurahan = input.kelurahan;
  if (input.kecamatan !== undefined) updateData.kecamatan = input.kecamatan;
  if (input.kabupaten !== undefined) updateData.kabupaten = input.kabupaten;
  if (input.provinsi !== undefined) updateData.provinsi = input.provinsi;
  if (input.rt !== undefined) updateData.rt = input.rt;
  if (input.rw !== undefined) updateData.rw = input.rw;
  if (input.kode_pos !== undefined) updateData.kode_pos = input.kode_pos;
  if (input.no_hp !== undefined) {
    const cleanPhone = input.no_hp ? normalizePhone(input.no_hp) : null;
    if (existingGuru.no_hp) {
      removeLidMappingByPhone(existingGuru.no_hp);
    }
    if (cleanPhone) {
      removeLidMappingByPhone(cleanPhone);
    }
    updateData.no_hp = cleanPhone;
    if (existingGuru.user_id) {
      await prisma.user.update({
        where: { id: existingGuru.user_id },
        data: { no_hp: cleanPhone },
      });
    }
  }
  if (input.tempat_lahir !== undefined) updateData.tempat_lahir = input.tempat_lahir;
  if (input.tanggal_lahir !== undefined) updateData.tanggal_lahir = formatDateForStorage(input.tanggal_lahir);
  if (input.jenis_kelamin !== undefined) updateData.jenis_kelamin = input.jenis_kelamin;
  if (input.agama !== undefined) updateData.agama = input.agama;
  if (input.status_kepegawaian !== undefined) updateData.status_kepegawaian = input.status_kepegawaian;
  if (input.pendidikan_terakhir !== undefined) updateData.pendidikan_terakhir = input.pendidikan_terakhir;
  if (input.pangkat_golongan !== undefined) updateData.pangkat_golongan = input.pangkat_golongan;
  if (input.tmt_guru !== undefined) updateData.tmt_guru = input.tmt_guru;
  if (input.jenis_ptk !== undefined) updateData.jenis_ptk = input.jenis_ptk;
  if (input.foto !== undefined) updateData.foto = input.foto;
  if (input.max_jp !== undefined) updateData.max_jp = input.max_jp;

  const guru = await prisma.guru.update({
    where: { id: guruId },
    data: updateData,
    include: {
      User: PRISMA_GURU_USER_SELECT,
    },
  });

  // Sync status back to user if provided
  if (input.status && guru.user_id) {
    await prisma.user.update({
      where: { id: guru.user_id },
      data: { status: input.status },
    });

    const updatedGuru = await prisma.guru.findUnique({
      where: { id: guruId },
      include: {
        User: PRISMA_GURU_USER_SELECT,
      },
    });

    await cacheInvalidationService.invalidateAcademicCache(existingGuru.tenant_id);
    return enrichGuruWithUser(updatedGuru) as GuruResponse;
  }

  await cacheInvalidationService.invalidateAcademicCache(existingGuru.tenant_id);
  return enrichGuruWithUser(guru) as GuruResponse;
}
