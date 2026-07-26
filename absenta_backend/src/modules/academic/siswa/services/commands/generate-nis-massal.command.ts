import { prisma } from '@/utils/prisma';

interface GenerateNisMassalInput {
  orderedKelasIds?: string[]; // Ordered list from wizard; if empty, auto-sort
}

interface GenerateNisMassalResult {
  generated: number;
  skipped: number;
  errors: { siswaId: string; nama: string; reason: string }[];
}

function parseYearCode(tahunStr: string): string {
  const digits = tahunStr.replace(/\D/g, '');
  if (digits.length === 8) {
    return digits.substring(2, 4) + digits.substring(6, 8);
  }
  const yearParts = tahunStr.split('/');
  if (yearParts.length === 2) {
    const y1 = yearParts[0].trim().slice(-2);
    const y2 = yearParts[1].trim().slice(-2);
    return y1 + y2;
  }
  return new Date().getFullYear().toString().slice(-2) + (new Date().getFullYear() + 1).toString().slice(-2);
}

export async function generateNisMassalCommand(
  input: GenerateNisMassalInput,
  scope: { tenantId: string; org: any }
): Promise<GenerateNisMassalResult> {
  const { tenantId } = scope;
  const { orderedKelasIds } = input;

  // 1. Fetch active tahun pelajaran
  const activeYear = await prisma.tahunPelajaran.findFirst({
    where: { tenant_id: tenantId, is_active: true }
  });

  if (!activeYear) {
    throw new Error('Tahun pelajaran aktif tidak ditemukan.');
  }

  const yearCode = parseYearCode(activeYear.tahun);
  const prefix = `${yearCode}1`; // e.g. "24251"

  // 2. Fetch all AKTIF students with temporary NIS, including kelas & jurusan for sorting
  const targetStudents = await prisma.siswa.findMany({
    where: {
      tenant_id: tenantId,
      status: 'AKTIF',
      nis: { startsWith: '1111' }
    },
    select: {
      id: true,
      nama_siswa: true,
      nis: true,
      nisn: true,
      user_id: true,
      kelas_id: true,
      Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
      Jurusan: { select: { id: true, nama: true } }
    }
  });

  if (targetStudents.length === 0) {
    return { generated: 0, skipped: 0, errors: [] };
  }

  // 3. Sort students based on wizard order (orderedKelasIds) or auto-sort
  let sortedStudents: typeof targetStudents;

  if (orderedKelasIds && orderedKelasIds.length > 0) {
    // Wizard mode: sort by the explicit kelas order provided by operator
    const kelasOrderMap = new Map(orderedKelasIds.map((id, idx) => [id, idx]));
    sortedStudents = [...targetStudents].sort((a, b) => {
      const orderA = a.kelas_id ? (kelasOrderMap.get(a.kelas_id) ?? 9999) : 9999;
      const orderB = b.kelas_id ? (kelasOrderMap.get(b.kelas_id) ?? 9999) : 9999;
      if (orderA !== orderB) return orderA - orderB;
      // Within same class: sort by name
      return a.nama_siswa.localeCompare(b.nama_siswa, 'id');
    });
  } else {
    // Auto mode: sort by jurusan name → tingkat (Int, numeric) → nama_kelas → nama_siswa
    sortedStudents = [...targetStudents].sort((a, b) => {
      const jurusanA = a.Jurusan?.nama ?? 'zzz';
      const jurusanB = b.Jurusan?.nama ?? 'zzz';
      if (jurusanA !== jurusanB) return jurusanA.localeCompare(jurusanB, 'id');

      const tingkatA = a.Kelas?.tingkat ?? 99;
      const tingkatB = b.Kelas?.tingkat ?? 99;
      if (tingkatA !== tingkatB) return tingkatA - tingkatB;

      const kelasA = a.Kelas?.nama_kelas ?? '';
      const kelasB = b.Kelas?.nama_kelas ?? '';
      if (kelasA !== kelasB) return kelasA.localeCompare(kelasB, 'id', { numeric: true });

      return a.nama_siswa.localeCompare(b.nama_siswa, 'id');
    });
  }

  // 4. Find the current highest NIS with this year prefix to avoid duplicates
  const lastStudent = await prisma.siswa.findFirst({
    where: { tenant_id: tenantId, nis: { startsWith: prefix } },
    orderBy: { nis: 'desc' },
    select: { nis: true }
  });

  let nextSequence = 1;
  if (lastStudent?.nis) {
    const lastSeqStr = lastStudent.nis.substring(prefix.length);
    const lastSeqNum = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeqNum)) {
      nextSequence = lastSeqNum + 1;
    }
  }

  // 5. Generate and assign NIS sequentially in the sorted order
  let generated = 0;
  let skipped = 0;
  const errors: { siswaId: string; nama: string; reason: string }[] = [];

  for (const student of sortedStudents) {
    try {
      const newNis = `${yearCode}1${String(nextSequence).padStart(5, '0')}`;

      // Check NIS uniqueness before assigning
      const existing = await prisma.siswa.findFirst({
        where: { tenant_id: tenantId, nis: newNis },
        select: { id: true }
      });

      if (existing) {
        nextSequence++;
        skipped++;
        errors.push({ siswaId: student.id, nama: student.nama_siswa, reason: `NIS ${newNis} sudah terpakai` });
        continue;
      }

      await prisma.siswa.update({
        where: { id: student.id },
        data: { nis: newNis }
      });

      // Synchronize User.email if student has linked User and email is using temporary NIS/NISN (1111/9999)
      if (student.user_id) {
        const linkedUser = await prisma.user.findUnique({
          where: { id: student.user_id },
          select: { id: true, email: true }
        });

        if (linkedUser) {
          const isTempEmail = linkedUser.email.startsWith('1111') || linkedUser.email.startsWith('9999');
          if (isTempEmail) {
            // Prioritize NISN@absenta.id if valid NISN exists, otherwise newNis@absenta.id
            const cleanNisn = student.nisn ? String(student.nisn).trim() : '';
            const hasValidNisn = cleanNisn && !cleanNisn.startsWith('9999') && cleanNisn !== '-' && cleanNisn !== 'KOSONG';
            const emailPrefix = hasValidNisn ? cleanNisn : newNis;
            const newEmail = `${emailPrefix}@absenta.id`;

            const emailExists = await prisma.user.findFirst({
              where: { email: newEmail, id: { not: linkedUser.id } }
            });
            if (!emailExists) {
              await prisma.user.update({
                where: { id: linkedUser.id },
                data: { email: newEmail }
              });
            }
          }
        }
      }

      nextSequence++;
      generated++;
    } catch (err: any) {
      errors.push({ siswaId: student.id, nama: student.nama_siswa, reason: err.message || 'Unknown error' });
    }
  }

  return { generated, skipped, errors };
}
