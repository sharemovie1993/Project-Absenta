import { prisma } from '@/utils/prisma';
import { PRISMA_GURU_USER_SELECT, enrichGuruWithUser } from '../helpers/guru-mapper.helper';

export async function getGuruMeQuery(userId: string, tenantId: string): Promise<any | null> {
  // 1. Temukan record guru berdasarkan user_id
  const rawGuru = await prisma.guru.findFirst({
    where: { user_id: userId, tenant_id: tenantId },
    include: {
      User: PRISMA_GURU_USER_SELECT,
    },
  });

  if (!rawGuru) return null;

  const guru: any = enrichGuruWithUser(rawGuru);

  // 2. Ambil semua OrganizationalAssignment aktif untuk user ini
  const assignments = await prisma.organizationalAssignment.findMany({
    where: {
      user_id: userId,
      tenant_id: tenantId,
      is_active: true,
      OR: [
        { end_date: null },
        { end_date: { gte: new Date() } },
      ],
    },
    include: {
      Position: {
        select: {
          id: true,
          code: true,
          name: true,
          scope_type: true,
        },
      },
      Kelas: {
        select: {
          id: true,
          nama_kelas: true,
          tingkat: true,
        },
      },
      Unit: {
        select: {
          id: true,
          nama: true,
        },
      },
    },
    orderBy: { created_at: 'asc' },
  });

  // 3. Ekstrak data jabatan
  const jabatanList: string[] = assignments
    .map(a => a.Position?.code)
    .filter((code): code is string => Boolean(code));

  const jabatanFormatted = assignments
    .map(a => a.Position?.name)
    .filter(Boolean)
    .join(', ');

  const waliKelasAssignment = assignments.find(a => a.Position?.code === 'WALI_KELAS' && a.Kelas);
  const waliKelasDi = waliKelasAssignment?.Kelas
    ? { id: waliKelasAssignment.Kelas.id, nama_kelas: waliKelasAssignment.Kelas.nama_kelas }
    : undefined;

  const unitAssignment = assignments.find(a => a.Unit);
  const unitObj = unitAssignment?.Unit
    ? { id: unitAssignment.Unit.id, nama: unitAssignment.Unit.nama }
    : undefined;

  return {
    ...guru,
    jabatan_list: jabatanList,
    jabatan: jabatanFormatted || guru.jabatan || null,
    wali_kelas_di: waliKelasDi,
    unit: unitObj,
    organizational_assignments: assignments.map(a => ({
      id: a.id,
      position_id: a.position_id,
      position_code: a.Position?.code,
      position_name: a.Position?.name,
      scope_type: a.Position?.scope_type,
      kelas: a.Kelas ? { id: a.Kelas.id, nama_kelas: a.Kelas.nama_kelas } : null,
      unit: a.Unit ? { id: a.Unit.id, nama: a.Unit.nama } : null,
      start_date: a.start_date,
      end_date: a.end_date,
    })),
  };
}
