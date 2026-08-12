import { prisma } from '@/utils/prisma';
import { DataScope } from '@/types/fastify';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { createGuruCommand } from './create-guru.command';
import { updateGuruCommand } from './update-guru.command';
import { CreateGuruInput, UpdateGuruInput } from '../guru.service';

export async function importGuruExcelCommand(
  data: any[],
  scope: DataScope,
  onProgress?: (current: number, total: number) => void
) {
  const tenantId = scope.tenantId;
  if (!tenantId) {
    throw new Error('Tenant ID is required for import');
  }

  const total = data.length;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ row: number; nama: string; reason: string }> = [];
  const matchedGuruIds = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    try {
      const nama = String(row['Nama Lengkap'] || row['nama_guru'] || row['nama'] || '').trim();
      let nip = String(row['NIP'] || row['nip'] || '').trim();

      if (!nama) {
        skipped++;
        errors.push({ row: rowNum, nama: '-', reason: 'Nama lengkap wajib diisi' });
        continue;
      }

      let isNipGenerated = false;
      if (!nip || nip === '-') {
        const cleanName = nama.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase();
        nip = `GURU-${cleanName}-${Date.now().toString().slice(-6)}-${i}`;
        isNipGenerated = true;
      }

      const rawEmail = String(row['Email'] || row['email'] || '').trim().toLowerCase();
      const email = (rawEmail && rawEmail !== '-') ? rawEmail : undefined;

      const rawPhone = String(row['No. HP'] || row['no_hp'] || row['No HP'] || row['Telepon'] || '').trim();
      const no_hp = (rawPhone && rawPhone !== '-') ? rawPhone : undefined;

      const rawJk = String(row['JK (L/P)'] || row['Jenis Kelamin'] || row['jenis_kelamin'] || '').trim().toUpperCase();
      const jenis_kelamin = (rawJk === 'L' || rawJk === 'P') ? rawJk : undefined;

      const rawStatus = String(row['Status Kepegawaian'] || row['status_kepegawaian'] || '').trim().toUpperCase();
      const status_kepegawaian = ['PNS', 'HONORER', 'KONTRAK', 'GTT', 'GTY', 'PPPK'].includes(rawStatus) ? rawStatus : undefined;

      const rawAlamat = String(row['Alamat'] || row['alamat'] || '').trim();
      const alamat = (rawAlamat && rawAlamat !== '-') ? rawAlamat : undefined;

      const rawPendidikan = String(row['Pendidikan'] || row['pendidikan_terakhir'] || '').trim();
      const pendidikan_terakhir = (rawPendidikan && rawPendidikan !== '-') ? rawPendidikan : undefined;

      const rawPtk = String(row['Jenis PTK'] || row['jenis_ptk'] || '').trim().toUpperCase();
      const jenis_ptk = ['PENDIDIK', 'TENAGA_KEPENDIDIKAN'].includes(rawPtk) ? rawPtk : undefined;

      let existingGuru: any = null;

      if (!isNipGenerated && nip) {
        existingGuru = await prisma.guru.findFirst({
          where: {
            tenant_id: tenantId,
            nip: nip,
            id: { notIn: Array.from(matchedGuruIds) }
          }
        });
      }

      if (!existingGuru && email) {
        const user = await prisma.user.findFirst({
          where: {
            email: email,
            tenant_id: tenantId
          }
        });

        if (user) {
          existingGuru = await prisma.guru.findFirst({
            where: {
              tenant_id: tenantId,
              user_id: user.id,
              id: { notIn: Array.from(matchedGuruIds) }
            }
          });
        }
      }

      if (!existingGuru) {
        existingGuru = await prisma.guru.findFirst({
          where: {
            tenant_id: tenantId,
            nama_guru: nama,
            id: { notIn: Array.from(matchedGuruIds) }
          }
        });
      }

      const inputData: any = {
        nama_guru: nama,
        nip: nip,
        email: email,
        no_hp: no_hp,
        jenis_kelamin: jenis_kelamin,
        status_kepegawaian: status_kepegawaian,
        alamat: alamat,
        pendidikan_terakhir: pendidikan_terakhir,
        jenis_ptk: jenis_ptk
      };

      if (existingGuru) {
        if (isNipGenerated && existingGuru.nip) {
          inputData.nip = existingGuru.nip;
        }
        const updatedGuru = await updateGuruCommand(existingGuru.id, inputData as UpdateGuruInput, scope);
        matchedGuruIds.add(updatedGuru.id);
        updated++;
      } else {
        const createdGuru = await createGuruCommand(inputData as CreateGuruInput, scope);
        matchedGuruIds.add(createdGuru.id);
        created++;
      }

    } catch (err: any) {
      skipped++;
      errors.push({
        row: rowNum,
        nama: String(row['Nama Lengkap'] || row['nama_guru'] || '-'),
        reason: err.message || 'Gagal memproses baris'
      });
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  await cacheInvalidationService.invalidateAcademicCache(tenantId);

  return {
    total,
    created,
    updated,
    skipped,
    errors
  };
}
